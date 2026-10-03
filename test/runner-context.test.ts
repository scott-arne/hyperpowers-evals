import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { shellSingleQuote } from '../src/agents/index.ts';
import { populateContextDir } from '../src/runner/context.ts';
import { RunnerError } from '../src/runner/errors.ts';
import { homeEnvSubstitutions } from '../src/runner/index.ts';

// The REAL coding-agents/ dir (sibling of test/). It carries claude-context/
// {HOWTO.md, launch-agent}, the templates populateContextDir substitutes.
const REAL_CODING_AGENTS = resolve(import.meta.dir, '..', 'coding-agents');

// Build the claude context substitutions exactly as the runner does for the
// runtime_family == claude path (src/runner/index.ts). configDir is the per-run
// agent-config dir; launchCwd the prepared workdir.
function claudeSubstitutions(opts: {
  readonly launchCwd: string;
  readonly configDir: string;
  readonly runDir: string;
  readonly superpowersRoot: string;
  readonly model: string;
}): Record<string, string> {
  const { launchCwd, configDir, runDir, superpowersRoot, model } = opts;
  const launchAgentPath = join(
    runDir,
    'gauntlet-agent',
    'context',
    'launch-agent',
  );
  const claudeEnvFile = join(configDir, '.claude-env');
  return {
    $QUORUM_AGENT_CWD: launchCwd,
    $QUORUM_AGENT_CWD_SH: shellSingleQuote(launchCwd),
    $SUPERPOWERS_ROOT: superpowersRoot,
    $QUORUM_LAUNCH_AGENT: launchAgentPath,
    $QUORUM_LAUNCH_AGENT_SH: shellSingleQuote(launchAgentPath),
    $CLAUDE_ENV_FILE: claudeEnvFile,
    $CLAUDE_ENV_FILE_SH: shellSingleQuote(claudeEnvFile),
    $CLAUDE_MODEL: model,
    // The runner always adds throwaway-$HOME isolation for the coding agent.
    ...homeEnvSubstitutions(join(runDir, 'home')),
  };
}

// Sub-set placeholder keys that MUST NOT survive substitution. ($ANTHROPIC_API_KEY
// and $@ in the launcher are runtime shell expansions, NOT in the sub set, so we
// only assert that OUR substitution keys are fully consumed.)
function assertNoLeftoverSubPlaceholders(
  text: string,
  subs: Readonly<Record<string, string>>,
): void {
  for (const key of Object.keys(subs)) {
    expect(text.includes(key)).toBe(false);
  }
}

test('populateContextDir substitutes every placeholder in the claude context', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const configDir = join(runDir, 'coding-agent-config');
  const launchCwd = join(runDir, 'coding-agent-workdir');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(launchCwd, { recursive: true });
  const subs = claudeSubstitutions({
    launchCwd,
    configDir,
    runDir,
    superpowersRoot: '/tmp/sproot',
    model: 'opus',
  });

  populateContextDir({
    codingAgentsDir: REAL_CODING_AGENTS,
    codingAgent: 'claude',
    runDir,
    substitutions: subs,
    required: true,
    forbiddenPlaceholders: ['$CLAUDE_MODEL'],
  });

  const ctxDir = join(runDir, 'gauntlet-agent', 'context');
  const howto = readFileSync(join(ctxDir, 'HOWTO.md'), 'utf8');
  const launcher = readFileSync(join(ctxDir, 'launch-agent'), 'utf8');

  // Every $… key from the sub set is gone from both files.
  assertNoLeftoverSubPlaceholders(howto, subs);
  assertNoLeftoverSubPlaceholders(launcher, subs);

  // Concrete resolved paths landed in the launcher.
  expect(launcher).toContain(launchCwd);
  expect(launcher).toContain(join(configDir, '.claude-env'));
  expect(launcher).toContain('opus');
  // The HOWTO points at the generated launcher's absolute path.
  expect(howto).toContain(join(ctxDir, 'launch-agent'));

  // Nested-session capture defense survives substitution (oracle ea6a231):
  // losing the forced persistence empties capture -> indeterminate(capture).
  // The env strip it pairs with is exercised by running the launcher below.
  expect(launcher).toContain('CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1');

  // Throwaway-$HOME isolation: HOME + the XDG dirs are pinned under <runDir>/home
  // in the launcher's exec env line, so the coding agent never touches the
  // operator's real ~/.claude, ~/.config, ~/.cache, etc.
  const runHomeDir = join(runDir, 'home');
  expect(launcher).toContain(`HOME='${runHomeDir}'`);
  expect(launcher).toContain(
    `XDG_CONFIG_HOME='${join(runHomeDir, '.config')}'`,
  );
  expect(launcher).toContain(`XDG_CACHE_HOME='${join(runHomeDir, '.cache')}'`);

  // The shebang'd launcher is executable after substitution (mode & 0o111).
  const mode = statSync(join(ctxDir, 'launch-agent')).mode;
  expect(mode & 0o111).not.toBe(0);
});

// The launcher runs inside whatever environment launched quorum. When that is
// a Claude Code session, its identity, opt-ins (task tools, Bash timeouts,
// prompt caching) and alias pins would otherwise reach the agent under test,
// so results would depend on where quorum was started. The launcher drops
// them before sourcing the env-file, which then sets the Claude env alone.
test('the claude launcher drops the inherited Claude env and keeps the env-file', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const configDir = join(runDir, 'coding-agent-config');
  const launchCwd = join(runDir, 'coding-agent-workdir');
  const stubDir = join(runDir, 'stub-bin');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(launchCwd, { recursive: true });
  mkdirSync(stubDir, { recursive: true });
  populateContextDir({
    codingAgentsDir: REAL_CODING_AGENTS,
    codingAgent: 'claude',
    runDir,
    substitutions: claudeSubstitutions({
      launchCwd,
      configDir,
      runDir,
      superpowersRoot: '/tmp/sproot',
      model: 'opus',
    }),
    required: true,
    forbiddenPlaceholders: ['$CLAUDE_MODEL'],
  });
  writeFileSync(
    join(configDir, '.claude-env'),
    "export CLAUDE_CODE_USE_VERTEX='1'\n" +
      "export ANTHROPIC_DEFAULT_SONNET_MODEL='from-env-file'\n",
  );
  // A stand-in claude that records the environment it was started with.
  const dump = join(runDir, 'claude-env.txt');
  writeFileSync(
    join(stubDir, 'claude'),
    `#!/bin/sh\n/usr/bin/env > '${dump}'\n`,
    { mode: 0o755 },
  );

  const result = spawnSync(
    join(runDir, 'gauntlet-agent', 'context', 'launch-agent'),
    [],
    {
      env: {
        PATH: `${stubDir}:/usr/bin:/bin`,
        CLAUDECODE: '1',
        CLAUDE_CODE_SESSION_ID: 'parent-session',
        CLAUDE_CODE_CHILD_SESSION: '1',
        CLAUDE_CODE_ENTRYPOINT: 'sdk-ts',
        CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
        CLAUDE_EFFORT: 'xhigh',
        ANTHROPIC_API_KEY: 'host-key',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'host-sonnet',
        BASH_DEFAULT_TIMEOUT_MS: '600000',
        BASH_MAX_TIMEOUT_MS: '600000',
        ENABLE_PROMPT_CACHING_1H: '1',
        HTTPS_PROXY: 'http://proxy.example:8080',
      },
      encoding: 'utf8',
    },
  );
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);

  const env = new Map(
    readFileSync(dump, 'utf8')
      .trimEnd()
      .split('\n')
      .map((line) => {
        const eq = line.indexOf('=');
        return [line.slice(0, eq), line.slice(eq + 1)] as const;
      }),
  );
  for (const name of [
    'CLAUDECODE',
    'CLAUDE_CODE_SESSION_ID',
    'CLAUDE_CODE_CHILD_SESSION',
    'CLAUDE_CODE_ENTRYPOINT',
    'CLAUDE_CODE_ENABLE_TODO_TOOLS',
    'CLAUDE_EFFORT',
    'ANTHROPIC_API_KEY',
    'BASH_DEFAULT_TIMEOUT_MS',
    'BASH_MAX_TIMEOUT_MS',
    'ENABLE_PROMPT_CACHING_1H',
  ]) {
    expect(env.has(name)).toBe(false);
  }
  expect(env.get('CLAUDE_CODE_USE_VERTEX')).toBe('1');
  expect(env.get('ANTHROPIC_DEFAULT_SONNET_MODEL')).toBe('from-env-file');
  expect(env.get('CLAUDE_CODE_FORCE_SESSION_PERSISTENCE')).toBe('1');
  expect(env.get('HOME')).toBe(join(runDir, 'home'));
  // Network config is not Claude env and must still reach the agent.
  expect(env.get('HTTPS_PROXY')).toBe('http://proxy.example:8080');
});

test('populateContextDir raises when a required context dir is missing', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  // An empty coding-agents dir: no claude-context/ inside it.
  const emptyAgents = mkdtempSync(join(tmpdir(), 'agents-'));
  expect(() =>
    populateContextDir({
      codingAgentsDir: emptyAgents,
      codingAgent: 'claude',
      runDir,
      substitutions: {},
      required: true,
    }),
  ).toThrow(RunnerError);
});

test('populateContextDir is a no-op when a non-required context dir is missing', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const emptyAgents = mkdtempSync(join(tmpdir(), 'agents-'));
  // required defaults to false: missing dir is silently skipped.
  expect(() =>
    populateContextDir({
      codingAgentsDir: emptyAgents,
      codingAgent: 'nope',
      runDir,
      substitutions: {},
    }),
  ).not.toThrow();
});

test('populateContextDir raises when a forbidden placeholder survives', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const configDir = join(runDir, 'coding-agent-config');
  const launchCwd = join(runDir, 'coding-agent-workdir');
  mkdirSync(configDir, { recursive: true });
  mkdirSync(launchCwd, { recursive: true });
  // Build the full sub set, then DROP $CLAUDE_MODEL so it cannot be substituted
  // — the forbidden-placeholder guard must then fire.
  const subs = claudeSubstitutions({
    launchCwd,
    configDir,
    runDir,
    superpowersRoot: '/tmp/sproot',
    model: 'opus',
  });
  delete subs['$CLAUDE_MODEL'];

  expect(() =>
    populateContextDir({
      codingAgentsDir: REAL_CODING_AGENTS,
      codingAgent: 'claude',
      runDir,
      substitutions: subs,
      required: true,
      forbiddenPlaceholders: ['$CLAUDE_MODEL'],
    }),
  ).toThrow(/CLAUDE_MODEL/);
});

test('populateContextDir applies longer placeholders before their prefixes', () => {
  // $FOO_SH must be replaced before $FOO (length-desc ordering), or the longer
  // key would be corrupted by the shorter one's replacement.
  const runDir = mkdtempSync(join(tmpdir(), 'run-'));
  const srcAgents = mkdtempSync(join(tmpdir(), 'agents-'));
  const ctxSrc = join(srcAgents, 'demo-context');
  mkdirSync(ctxSrc, { recursive: true });
  writeFileSync(join(ctxSrc, 'file.txt'), 'a=$FOO b=$FOO_SH\n');

  populateContextDir({
    codingAgentsDir: srcAgents,
    codingAgent: 'demo',
    runDir,
    substitutions: { $FOO: 'X', $FOO_SH: 'Y' },
  });

  const out = readFileSync(
    join(runDir, 'gauntlet-agent', 'context', 'file.txt'),
    'utf8',
  );
  expect(out).toBe('a=X b=Y\n');
});
