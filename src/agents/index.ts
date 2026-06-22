import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import type { AgentConfig } from '../contracts/agent-config.ts';
import { getEnv } from '../env.ts';
import { AntigravityAgent } from './antigravity.ts';
import { CodexAgent } from './codex.ts';
import type { CommandRunner } from './command-runner.ts';
import { CopilotAgent } from './copilot.ts';
import { GeminiAgent } from './gemini.ts';
import { KimiAgent } from './kimi.ts';
import { OpenCodeAgent } from './opencode.ts';
import { PiAgent } from './pi.ts';
import { writePrivateFileNoFollow } from './private-file.ts';

/** The isolated home a run hands an agent to provision. Absence is undefined
 *  (§5.5): a missing skeleton root is undefined, never null. */
export interface RunHome {
  /** The agent's isolated config dir (<runHome>/<home_config_subdir>). */
  readonly configDir: string;
  /** The dir the coding agent runs in (resolves project-trust paths). */
  readonly workdir: string;
  /** Root holding `<runtime>-home-skeleton/`, or undefined when none is seeded. */
  readonly skeletonRoot: string | undefined;
}

/** Behavior contract for a coding agent (§5.4): config plus a single
 *  provisioning motion that seeds the isolated config dir and returns the extra
 *  environment gauntlet must pass into the agent CLI. */
export interface CodingAgent {
  readonly config: AgentConfig;
  // Seed the isolated agent-config dir; return extra env to pass to gauntlet.
  // `runner` is the subprocess seam for agents whose provisioning shells out
  // (codex/gemini/opencode/kimi/antigravity). Declarative adapters
  // (DefaultAgent, ClaudeAgent) ignore it — a 1-arg method satisfies this
  // 2-arg signature via TS method bivariance, so they need no change.
  provision(home: RunHome, runner: CommandRunner): Record<string, string>;
}

// Thrown by an agent's provision() when setup fails (missing required input, a
// non-zero provisioning subprocess, a missing staged plugin file). The runner
// maps it to a 'setup'-stage indeterminate verdict. Defined here, not in
// runner/index.ts, so adapters import it without a runner<->agents cycle.
export class ProvisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProvisionError';
  }
}

/**
 * Make the operator's real AWS token caches resolvable under a run's throwaway
 * $HOME. The AWS SDK locates the SSO token cache via `getHomeDir()` (the HOME
 * env var), NOT via AWS_CONFIG_FILE / AWS_SHARED_CREDENTIALS_FILE — and the
 * launcher pins HOME to `runHome` (which has no `.aws`). So a profile that
 * resolves credentials from an `aws sso login` token would fail with "SSO
 * session invalid" even though the config files are anchored. Symlink the real
 * `sso/cache` (read by the AWS JS SDK for the SSO token) into `<runHome>/.aws/...`
 * so the token resolves. `cli/cache` (the AWS CLI's assume-role/STS cache, not
 * read by the JS SDK) is anchored too as a harmless best-effort include for any
 * tool that does consult it.
 *
 * Best-effort and narrow by design: each link is created only when its real
 * source dir exists (static-key auth and not-yet-logged-in cases are untouched),
 * and only the token-cache subdirs are exposed — not the whole `~/.aws` — because
 * the agent runs with --dangerously-skip-permissions.
 *
 * @param runHome - the per-run throwaway home root (HOME the launcher pins).
 * @param realAwsDir - the operator's real `.aws` directory.
 */
export function anchorAwsTokenCaches(
  runHome: string,
  realAwsDir: string,
): void {
  for (const rel of [join('sso', 'cache'), join('cli', 'cache')]) {
    const realCache = join(realAwsDir, rel);
    if (!existsSync(realCache)) continue; // best-effort: nothing to anchor
    const linkPath = join(runHome, '.aws', rel);
    // Create the parent (e.g. <runHome>/.aws/sso) but NOT the leaf — the leaf is
    // the symlink itself.
    mkdirSync(join(linkPath, '..'), { recursive: true });
    // Fresh run home: linkPath normally does not exist. If a symlink we own is
    // already there (e.g. a re-provision), replace it; never follow into a
    // non-symlink we didn't create.
    if (isSymlink(linkPath)) {
      rmSync(linkPath);
    } else if (existsSync(linkPath)) {
      continue; // unexpected real dir/file at the destination — leave it alone
    }
    symlinkSync(realCache, linkPath);
  }
}

/** True iff `p` exists and is a symlink (lstat does not follow). */
function isSymlink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Basename of the per-run Claude auth env file ClaudeAgent.provision writes
 *  under configDir. The runner derives the $CLAUDE_ENV_FILE substitution from
 *  this deterministic path, so the constant is the single source of truth for
 *  both sides. */
export const CLAUDE_ENV_FILE_NAME = '.claude-env';

/** The minimal `.claude.json` surface quorum reads/writes: an object whose
 *  `projects` map (when present) is itself an object. Everything else passes
 *  through untouched so claude can evolve the file without breaking us. */
const ClaudeJsonSchema = z
  .object({ projects: z.record(z.unknown()).optional() })
  .passthrough();

/** Declarative agents whose provisioning is fully driven by YAML. Just creates
 *  the isolated config dir; the agent finds it via its $HOME default. */
class DefaultAgent implements CodingAgent {
  readonly config: AgentConfig;
  constructor(config: AgentConfig) {
    this.config = config;
  }
  provision(home: RunHome): Record<string, string> {
    mkdirSync(home.configDir, { recursive: true });
    return {};
  }
}

/** Claude-family provisioning: create the config dir, trust the run's project so
 *  the CLI never prompts, and write a mode-0600 .claude-env carrying the API key
 *  for the launcher. No onboarding skeleton is seeded — recent claude boots on
 *  API-key auth + the trust block (it runs/auto-completes onboarding each run). */
class ClaudeAgent implements CodingAgent {
  readonly config: AgentConfig;
  constructor(config: AgentConfig) {
    this.config = config;
  }
  provision(home: RunHome): Record<string, string> {
    const { configDir, workdir } = home;
    mkdirSync(configDir, { recursive: true });

    const claudeJsonPath = join(configDir, '.claude.json');

    // Trust the run's project so claude doesn't prompt. No onboarding skeleton
    // is needed — recent claude boots on API-key auth + this trust block and
    // auto-completes onboarding each run. (IS_DEMO=1 is deliberately NOT set: it
    // skips the first-run flow that activates auth on a fresh config, producing
    // "Not logged in".) Parse any existing file (boundary §4.1) rather than
    // asserting its shape.
    const claudeJson = existsSync(claudeJsonPath)
      ? ClaudeJsonSchema.parse(JSON.parse(readFileSync(claudeJsonPath, 'utf8')))
      : ClaudeJsonSchema.parse({});
    const projects: Record<string, unknown> = { ...claudeJson.projects };
    projects[resolve(workdir)] = {
      hasTrustDialogAccepted: true,
      projectOnboardingSeenCount: 1,
      hasClaudeMdExternalIncludesApproved: true,
      hasClaudeMdExternalIncludesWarningShown: true,
    };
    writeFileSync(
      claudeJsonPath,
      `${JSON.stringify({ ...claudeJson, projects }, null, 2)}\n`,
    );

    // Seed the per-run auth env-file the launcher sources. Two mutually
    // exclusive modes, selected by required_env:
    //   - Bedrock (CLAUDE_CODE_USE_BEDROCK present): write the Bedrock + AWS
    //     forwarding vars; no API key, no API-key approval.
    //   - API key (ANTHROPIC_API_KEY present): write the key + record the
    //     approval fingerprint so claude doesn't prompt headless.
    const envFile = join(configDir, CLAUDE_ENV_FILE_NAME);
    if (this.config.required_env.includes('CLAUDE_CODE_USE_BEDROCK')) {
      writePrivateFileNoFollow(envFile, this.bedrockEnvFileContents());
      // The SDK finds the SSO/assume-role token cache via HOME (which the
      // launcher pins to the run home), not via the anchored AWS_*_FILE vars.
      // For profile auth, symlink the operator's real token caches in so the
      // `aws sso login` session resolves. Best-effort; static-key auth needs none.
      if ((getEnv('AWS_PROFILE') ?? '') !== '') {
        anchorAwsTokenCaches(dirname(configDir), join(homedir(), '.aws'));
      }
    } else if (this.config.required_env.includes('ANTHROPIC_API_KEY')) {
      // Read the key through the one sanctioned env module (§6.5), never
      // process.env. Empty means unset; fail at the setup stage rather than
      // silently writing a blank key.
      const apiKey = getEnv('ANTHROPIC_API_KEY') ?? '';
      if (apiKey === '') {
        throw new ProvisionError(
          'ANTHROPIC_API_KEY not set; cannot seed Claude auth',
        );
      }
      // The mode-0600 secret env file goes through the shared O_NOFOLLOW writer
      // so a pre-placed symlink at the destination cannot redirect the API key.
      // `export` so the sourced value reaches the launcher's `exec env … claude`
      // child (the Bedrock branch exports its vars the same way).
      writePrivateFileNoFollow(
        envFile,
        `export ANTHROPIC_API_KEY=${shellSingleQuote(apiKey)}\n`,
      );
      approveClaudeApiKey(claudeJsonPath, apiKey);
    }
    return {};
  }

  /** Build the .claude-env contents for Bedrock auth. Exports CLAUDE_CODE_USE_BEDROCK
   *  and AWS_REGION (both required), forwards whichever AWS auth vars are present
   *  (profile or static keys), and — because the launcher repoints $HOME to the
   *  throwaway dir — anchors AWS_CONFIG_FILE / AWS_SHARED_CREDENTIALS_FILE at the
   *  operator's real home so the SDK still resolves a named profile. Every value
   *  is shell-quoted; the file is sourced by the launcher under `set -u`. */
  private bedrockEnvFileContents(): string {
    const lines: string[] = [];
    const useBedrock = getEnv('CLAUDE_CODE_USE_BEDROCK') ?? '';
    const region = getEnv('AWS_REGION') ?? '';
    if (useBedrock === '') {
      throw new ProvisionError(
        'CLAUDE_CODE_USE_BEDROCK not set; cannot seed Bedrock Claude auth',
      );
    }
    if (region === '') {
      throw new ProvisionError(
        'AWS_REGION not set; cannot seed Bedrock Claude auth',
      );
    }
    lines.push(
      `export CLAUDE_CODE_USE_BEDROCK=${shellSingleQuote(useBedrock)}`,
    );
    lines.push(`export AWS_REGION=${shellSingleQuote(region)}`);

    // Forward AWS auth that is actually set. Profile auth needs the config files
    // anchored at the REAL home (the launcher pins $HOME away from it); static
    // keys/session tokens are self-contained and need no files.
    const profile = getEnv('AWS_PROFILE') ?? '';
    if (profile !== '') {
      const realAwsDir = join(homedir(), '.aws');
      lines.push(`export AWS_PROFILE=${shellSingleQuote(profile)}`);
      lines.push(
        `export AWS_CONFIG_FILE=${shellSingleQuote(join(realAwsDir, 'config'))}`,
      );
      lines.push(
        `export AWS_SHARED_CREDENTIALS_FILE=${shellSingleQuote(join(realAwsDir, 'credentials'))}`,
      );
    }
    for (const key of [
      'AWS_DEFAULT_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SESSION_TOKEN',
    ]) {
      const value = getEnv(key) ?? '';
      if (value !== '') {
        lines.push(`export ${key}=${shellSingleQuote(value)}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }
}

/** Record a per-config approval for the run's API key so Claude Code does not
 *  prompt "Detected a custom API key… use this key?" when launched headless
 *  with ANTHROPIC_API_KEY. The fingerprint is the key's last 20 chars; it is
 *  added to customApiKeyResponses.approved (idempotently) and scrubbed from
 *  rejected. */
function approveClaudeApiKey(configPath: string, apiKey: string): void {
  const config: Record<string, unknown> = existsSync(configPath)
    ? (JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>)
    : {};
  const existing = config['customApiKeyResponses'];
  const responses: Record<string, unknown> =
    typeof existing === 'object' && existing !== null
      ? (existing as Record<string, unknown>)
      : {};
  config['customApiKeyResponses'] = responses;
  const fingerprint = apiKey.slice(-20);

  const approvedRaw = responses['approved'];
  const approved: string[] = Array.isArray(approvedRaw)
    ? (approvedRaw as string[])
    : [];
  responses['approved'] = approved;
  if (!approved.includes(fingerprint)) {
    approved.push(fingerprint);
  }

  const rejectedRaw = responses['rejected'];
  responses['rejected'] = Array.isArray(rejectedRaw)
    ? (rejectedRaw as string[]).filter((item) => item !== fingerprint)
    : [];

  writeFileSync(configPath, JSON.stringify(config));
}

/** Single-quote a value for a POSIX shell, escaping embedded single quotes.
 *  Exported for reuse by the runner's context-dir _SH substitutions. */
export function shellSingleQuote(s: string): string {
  return `'${s.replaceAll("'", `'\\''`)}'`;
}

// name -> custom adapter factory. Each dialect with provisioning beyond the
// declarative default registers here; everything else falls through to
// DefaultAgent.
const CUSTOM_AGENTS: Readonly<
  Record<string, (config: AgentConfig) => CodingAgent>
> = {
  codex: (config) => new CodexAgent(config),
  gemini: (config) => new GeminiAgent(config),
  pi: (config) => new PiAgent(config),
  copilot: (config) => new CopilotAgent(config),
  opencode: (config) => new OpenCodeAgent(config),
  kimi: (config) => new KimiAgent(config),
  antigravity: (config) => new AntigravityAgent(config),
};

/** Resolve the agent implementation for a config: the Claude provisioner when
 *  the runtime family (or, absent that, the name) is `claude`; a registered
 *  custom adapter when the name matches; else the declarative default. */
export function resolveAgent(config: AgentConfig): CodingAgent {
  const name = config.runtime_family ?? config.name;
  if (name === 'claude') {
    return new ClaudeAgent(config);
  }
  const factory = CUSTOM_AGENTS[name];
  if (factory !== undefined) {
    return factory(config);
  }
  return new DefaultAgent(config);
}
