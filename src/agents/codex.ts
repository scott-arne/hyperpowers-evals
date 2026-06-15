import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import type { AgentConfig } from '../contracts/agent-config.ts';
import { getEnv } from '../env.ts';
import { stageSuperpowersPlugin } from '../setup-helpers/plugin-stage.ts';
import {
  APP_SERVER_TIMEOUT_MS,
  type AppServerClient,
  SpawnAppServerClient,
} from './codex-app-server.ts';
import type { CommandRunner } from './command-runner.ts';
import { type CodingAgent, ProvisionError, type RunHome } from './index.ts';
import { writePrivateFileNoFollow } from './private-file.ts';

// Codex-family provisioning. provision() is SETUP ONLY: it seeds the per-run
// CODEX_HOME so the agent boots past the sign-in picker with Superpowers staged
// as a trusted SessionStart plugin hook.
//
// The per-run CODEX_HOME is `home.configDir`, which the runner roots at
// <runHome>/.codex (codex.yaml: home_config_subdir ".codex"). Codex defaults
// CODEX_HOME to $HOME/.codex, so the launcher sets only the isolated $HOME and
// codex discovers this seeded config via that default — no CODEX_HOME var.
//
// Auth is a validated file write, not a login subprocess: it copies the host's
// ChatGPT subscription auth.json from ~/.codex/auth.json into the per-run
// CODEX_HOME (mode 0600, O_NOFOLLOW so a pre-placed symlink can't redirect the
// secret), after asserting it is subscription auth (not API-key auth) and
// carries a refresh token. The launch-agent scrubs OpenAI env so Codex uses the
// copied subscription auth rather than an OPENAI_API_KEY.
//
// That leaves exactly ONE subprocess interaction:
//   - `codex app-server --listen stdio://` JSON-RPC (initialize + hooks/list)
//     to read the staged Superpowers hook's key + currentHash, which we then
//     record as a trusted_hash in config.toml.
// It is driven through the injected AppServerClient — a BOUNDED spawn seam
// (per-handshake deadline) so a hung/non-flushing app-server can't block
// provisioning forever, and so the hermetic gate stubs it. Everything else
// (skeleton copy, auth copy, plugin copytree, config.toml) is deterministic file
// generation the gate asserts directly.

// Narrowing schema for the host ~/.codex/auth.json (standard §4.1). Permissive:
// auth.json carries many other fields, and a non-object `tokens` must surface as
// a missing-refresh-token error, not a schema crash. So `tokens` is coerced to
// undefined when absent or non-object, and unknown top-level keys pass through.
const CodexTokensSchema = z
  .object({ refresh_token: z.string().nullish() })
  .nullish()
  .catch(undefined);

const CodexAuthSchema = z
  .object({
    auth_mode: z.string().nullish(),
    OPENAI_API_KEY: z.string().nullish(),
    tokens: CodexTokensSchema,
  })
  .passthrough();

export class CodexAgent implements CodingAgent {
  readonly config: AgentConfig;
  private readonly appServer: AppServerClient;

  // `appServer` is the bounded app-server read seam; live runs use the
  // spawnSync-backed default, tests inject a fake. The shared CommandRunner is
  // unused by codex (auth is a file copy; the only subprocess is the app-server,
  // which has its own timed seam), but provision() keeps it for the CodingAgent
  // contract that other agents fulfill.
  constructor(config: AgentConfig, appServer?: AppServerClient) {
    this.config = config;
    this.appServer = appServer ?? new SpawnAppServerClient();
  }

  provision(home: RunHome, _runner: CommandRunner): Record<string, string> {
    const { configDir, workdir, skeletonRoot } = home;
    const family = this.config.runtime_family ?? 'codex';

    const superpowersRoot = getEnv('SUPERPOWERS_ROOT');
    if (superpowersRoot === undefined || superpowersRoot === '') {
      throw new ProvisionError(
        'SUPERPOWERS_ROOT not set; cannot install codex plugin hooks',
      );
    }

    // Seed the config dir from the skeleton when one is staged, else an empty
    // dir.
    const skel =
      skeletonRoot !== undefined
        ? join(skeletonRoot, `${family}-home-skeleton`)
        : undefined;
    if (skel !== undefined && existsSync(skel)) {
      cpSync(skel, configDir, { recursive: true });
    } else {
      mkdirSync(configDir, { recursive: true });
    }

    // 1. Copy the host's ChatGPT subscription auth into the fresh CODEX_HOME so
    //    the agent boots past the sign-in picker. Validates and writes a file
    //    (O_NOFOLLOW) — no login subprocess.
    this.seedCodexAuth(configDir);

    // 2. Stage Superpowers as a trusted Codex plugin hook.
    this.installPluginHooks(configDir, workdir, superpowersRoot);

    // No extra env: Codex finds CODEX_HOME via its $HOME/.codex default.
    return {};
  }

  // Seed ChatGPT subscription auth into the isolated per-run CODEX_HOME. Reads
  // the host's ~/.codex/auth.json, asserts it is subscription auth (auth_mode
  // === 'chatgpt' and no API key) carrying a refresh token, then writes it to
  // configDir/auth.json at 0600 through an O_NOFOLLOW-protected open. The parsed
  // JSON is unknown until narrowed by CodexAuthSchema (standard §4.1).
  private seedCodexAuth(configDir: string): void {
    // Host subscription auth lives at ~/.codex/auth.json. CODEX_AUTH_HOME
    // overrides the parent dir so the hermetic gate can point it at a temp dir —
    // the same seam the gemini adapter uses for GEMINI_OAUTH_HOME, since
    // homedir() ignores a mid-process $HOME change.
    const authHome = getEnv('CODEX_AUTH_HOME') ?? join(homedir(), '.codex');
    const source = join(authHome, 'auth.json');
    if (!existsSync(source)) {
      throw new ProvisionError(
        'Codex ChatGPT subscription auth not found at ~/.codex/auth.json; run `codex login` before Codex evals',
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(source, 'utf8'));
    } catch {
      throw new ProvisionError(
        'Codex ChatGPT subscription auth at ~/.codex/auth.json is not valid JSON',
      );
    }
    const auth = CodexAuthSchema.parse(raw);

    // Subscription auth only: auth_mode 'chatgpt' AND no embedded API key.
    if (
      auth.auth_mode !== 'chatgpt' ||
      (auth.OPENAI_API_KEY !== null && auth.OPENAI_API_KEY !== undefined)
    ) {
      throw new ProvisionError(
        'Codex evals require ChatGPT subscription auth in ~/.codex/auth.json, not API-key auth',
      );
    }
    const tokens = auth.tokens;
    if (
      tokens === undefined ||
      tokens === null ||
      tokens.refresh_token === undefined ||
      tokens.refresh_token === null ||
      tokens.refresh_token === ''
    ) {
      throw new ProvisionError(
        'Codex ChatGPT subscription auth is missing a refresh token; run `codex login` again',
      );
    }

    // Write the credential through an O_NOFOLLOW-protected open so a pre-placed
    // symlink at <CODEX_HOME>/auth.json cannot redirect the host's subscription
    // auth to an attacker-controlled path. Re-read the source bytes (the earlier
    // read was text for JSON validation) and write them verbatim at mode 0600.
    mkdirSync(configDir, { recursive: true });
    const dest = join(configDir, 'auth.json');
    writePrivateFileNoFollow(dest, readFileSync(source));
  }

  // Install Superpowers into the quorum-owned CODEX_HOME (already created +
  // logged in): copy Superpowers into the plugin cache, write the plugin-hooks
  // config, read the staged hook via app-server, and append its trusted_hash. No
  // isolated-home build / login / DRILL export (that is the drill-owned path,
  // which quorum never takes).
  private installPluginHooks(
    configDir: string,
    workdir: string,
    superpowersRoot: string,
  ): void {
    if (!existsSync(superpowersRoot)) {
      throw new ProvisionError(
        `SUPERPOWERS_ROOT does not exist: ${superpowersRoot}`,
      );
    }

    const pluginRoot = join(
      configDir,
      'plugins',
      'cache',
      'debug',
      'superpowers',
      'local',
    );

    stageSuperpowersPlugin(superpowersRoot, pluginRoot);

    const configPath = join(configDir, 'config.toml');
    writePluginHooksConfig(configPath);

    // Read the staged Superpowers SessionStart hook through the BOUNDED
    // app-server seam (per-handshake deadline), so a hung app-server cannot
    // block provisioning forever.
    const hook = this.appServer.readHook({
      configDir,
      workdir,
      timeoutMs: APP_SERVER_TIMEOUT_MS,
    });
    appendTrustedHook(configPath, hook.key, hook.currentHash);
  }
}

// Enable plugins/hooks and the superpowers@debug plugin. The trailing
// trusted-hash block is appended later by appendTrustedHook.
function writePluginHooksConfig(configPath: string): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    [
      '[features]',
      'plugins = true',
      'hooks = true',
      'plugin_hooks = true',
      '',
      '[plugins."superpowers@debug"]',
      'enabled = true',
      '',
    ].join('\n'),
  );
}

// Append `[hooks.state."<key>"]\ntrusted_hash = "<hash>"` to config.toml,
// TOML-escaping both values.
function appendTrustedHook(
  configPath: string,
  key: string,
  currentHash: string,
): void {
  const existing = readFileSync(configPath, 'utf8');
  const block = [
    '',
    `[hooks.state."${tomlBasicString(key)}"]`,
    `trusted_hash = "${tomlBasicString(currentHash)}"`,
    '',
  ].join('\n');
  writeFileSync(configPath, existing + block);
}

function tomlBasicString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

// The O_NOFOLLOW private-file writer lives in ./private-file.ts so every per-run
// env/credential writer (gemini, claude, copilot) shares one implementation.
// Re-exported here to preserve codex.ts's public surface: its importers,
// including the codex agent tests, resolve it through this module.
export { writePrivateFileNoFollow };
