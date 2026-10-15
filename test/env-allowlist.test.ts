import { expect, test } from 'bun:test';
import { xdgHomeEnv } from '../src/agents/home-env.ts';
import {
  INNER_REMOVED,
  innerEnv,
  innerMode,
  legacyInnerEnv,
  OUTER_PASSTHROUGH,
  outerEnv,
} from '../src/checks/env-allowlist.ts';

const BASE = {
  PATH: '/usr/bin:/bin',
  HOME: '/Users/operator',
  TMPDIR: '/tmp/op',
  LANG: 'en_US.UTF-8',
  LC_ALL: 'C',
  HTTPS_PROXY: 'http://proxy.example:8080',
  ANTHROPIC_API_KEY: 'sk-planted',
  OPENAI_API_KEY: 'planted',
  AWS_SECRET_ACCESS_KEY: 'planted',
  QUORUM_RECORD_SINK: '/tmp/sink/records.jsonl',
  UNRELATED: 'x',
};
const ARGS = {
  repoRoot: '/repo',
  agentHome: '/out/workspaces/run-1/home',
  transcriptPath: '/out/run-1/trajectory.json',
  runDir: '/out/run-1',
  configDir: '/out/workspaces/run-1/home/.claude',
  codingAgent: 'claude-auto',
};

test('outerEnv passes exactly the passthrough names, LC_*, and the QUORUM contract; nothing else', () => {
  const env = outerEnv(BASE, ARGS);
  for (const k of OUTER_PASSTHROUGH) {
    if (k in BASE) expect(env[k]).toBe(BASE[k as keyof typeof BASE]);
  }
  expect(env['LC_ALL']).toBe('C');
  expect(env['QUORUM_REPO_ROOT']).toBe('/repo');
  expect(env['QUORUM_AGENT_HOME']).toBe(ARGS.agentHome);
  expect(env['QUORUM_TRANSCRIPT_PATH']).toBe(ARGS.transcriptPath);
  expect(env['QUORUM_RUN_DIR']).toBe(ARGS.runDir);
  expect(env['QUORUM_AGENT_CONFIG_DIR']).toBe(ARGS.configDir);
  expect(env['QUORUM_CODING_AGENT']).toBe('claude-auto');
  expect(env['QUORUM_INNER_ENV']).toBe('projected');
  expect(env['ANTHROPIC_API_KEY']).toBeUndefined();
  expect(env['OPENAI_API_KEY']).toBeUndefined();
  expect(env['AWS_SECRET_ACCESS_KEY']).toBeUndefined();
  expect(env['UNRELATED']).toBeUndefined();
  // The sink is the executor's to add, never the allowlist's.
  expect(env['QUORUM_RECORD_SINK']).toBeUndefined();
  // Exactness over the constructed object: nothing else is present.
  expect(Object.keys(env).sort()).toEqual(
    [
      'HOME',
      'HTTPS_PROXY',
      'LANG',
      'LC_ALL',
      'PATH',
      'QUORUM_AGENT_CONFIG_DIR',
      'QUORUM_AGENT_HOME',
      'QUORUM_CODING_AGENT',
      'QUORUM_INNER_ENV',
      'QUORUM_REPO_ROOT',
      'QUORUM_RUN_DIR',
      'QUORUM_TRANSCRIPT_PATH',
      'TMPDIR',
    ].sort(),
  );
});

test('outerEnv falls back to the system PATH when the parent has none', () => {
  const { PATH: _p, ...noPath } = BASE;
  expect(outerEnv(noPath, ARGS)['PATH']).toBe('/usr/bin:/bin');
});

test('innerEnv removes the record and tooling names and overlays the agent home, from an ambient base too', () => {
  // Handed the AMBIENT environment (planted key included), not the outer
  // projection: the inner layer must still come out clean.
  const inner = innerEnv(
    {
      ...BASE,
      ...outerEnv(BASE, ARGS),
      QUORUM_RECORD_SINK: '/tmp/sink/records.jsonl',
    },
    ARGS.agentHome,
  );
  for (const k of INNER_REMOVED) expect(inner[k]).toBeUndefined();
  expect(inner).toMatchObject(xdgHomeEnv(ARGS.agentHome));
  expect(inner['HOME']).toBe(ARGS.agentHome);
  expect(inner['QUORUM_AGENT_HOME']).toBe(ARGS.agentHome);
  expect(inner['QUORUM_AGENT_CONFIG_DIR']).toBe(ARGS.configDir);
  expect(inner['QUORUM_CODING_AGENT']).toBe('claude-auto');
  expect(inner['ANTHROPIC_API_KEY']).toBeUndefined();
  expect(Object.keys(inner).sort()).toEqual(
    [
      'HOME',
      'HTTPS_PROXY',
      'LANG',
      'LC_ALL',
      'PATH',
      'QUORUM_AGENT_CONFIG_DIR',
      'QUORUM_AGENT_HOME',
      'QUORUM_CODING_AGENT',
      'TMPDIR',
      'XDG_CACHE_HOME',
      'XDG_CONFIG_HOME',
      'XDG_DATA_HOME',
      'XDG_STATE_HOME',
    ].sort(),
  );
});

test('legacyInnerEnv inherits everything except the selector', () => {
  const legacy = legacyInnerEnv({ ...BASE, QUORUM_INNER_ENV: 'legacy' });
  expect(legacy['QUORUM_INNER_ENV']).toBeUndefined();
  expect(legacy['HOME']).toBe('/Users/operator');
  expect(legacy['QUORUM_RECORD_SINK']).toBe('/tmp/sink/records.jsonl');
  expect(legacy['ANTHROPIC_API_KEY']).toBe('sk-planted');
});

test('innerMode reads the selector and treats absence as legacy', () => {
  const lookup = (env: Record<string, string>) => (k: string) => env[k]; // typed: a bare literal cannot be indexed by an arbitrary string under strict TS
  expect(innerMode(lookup({ QUORUM_INNER_ENV: 'projected' }))).toBe(
    'projected',
  );
  expect(innerMode(lookup({ QUORUM_INNER_ENV: 'legacy' }))).toBe('legacy');
  expect(innerMode(() => undefined)).toBe('legacy');
});
