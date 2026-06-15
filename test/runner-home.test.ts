import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { populateContextDir } from '../src/runner/context.ts';
import { homeEnvSubstitutions } from '../src/runner/index.ts';

const REAL_CODING_AGENTS = resolve(import.meta.dir, '..', 'coding-agents');

// Per-run throwaway $HOME isolation for the coding agent under test (spec
// docs/superpowers/specs/2026-06-15-per-run-home-isolation.md). Every coding
// agent runs with HOME (+ XDG dirs) pinned under <runDir>/home so it never
// reads/writes the operator's real ~/.gemini, ~/.codex, ~/.claude, ~/.config,
// ~/.cache, XDG dirs. homeEnvSubstitutions builds the `env`-line fragment baked
// into each launcher (mirrors kimiLaunchSubstitutions).

describe('homeEnvSubstitutions', () => {
  const runHomeDir = '/runs/r1/home';
  const subs = homeEnvSubstitutions(runHomeDir);

  test('$QUORUM_HOME_ENV: HOME + the four XDG dirs, each single-quoted under the run home', () => {
    expect(subs['$QUORUM_HOME_ENV']).toBe(
      "HOME='/runs/r1/home' " +
        "XDG_CONFIG_HOME='/runs/r1/home/.config' " +
        "XDG_CACHE_HOME='/runs/r1/home/.cache' " +
        "XDG_DATA_HOME='/runs/r1/home/.local/share' " +
        "XDG_STATE_HOME='/runs/r1/home/.local/state'",
    );
  });

  test('$QUORUM_AGENT_HOME is the raw run-home path; _SH is shell-quoted', () => {
    expect(subs['$QUORUM_AGENT_HOME']).toBe('/runs/r1/home');
    expect(subs['$QUORUM_AGENT_HOME_SH']).toBe("'/runs/r1/home'");
  });

  test('a path with a single quote stays shell-safe', () => {
    const s = homeEnvSubstitutions("/runs/o'brien/home");
    expect(s['$QUORUM_AGENT_HOME_SH']).toBe("'/runs/o'\\''brien/home'");
    expect(s['$QUORUM_HOME_ENV']).toContain("HOME='/runs/o'\\''brien/home'");
  });
});

// Each un-pinned coding-agent launcher splices $QUORUM_HOME_ENV into its
// `exec env …` line. Substituting the REAL launcher template proves the token
// placement is valid (incl. gemini's multi-line `exec env \` continuation) and
// that nothing is left unresolved. codex/copilot/opencode/kimi already pin HOME
// in their own launchers; antigravity is wired with its C1 oauth seed.
describe('coding-agent launchers pin HOME+XDG via $QUORUM_HOME_ENV', () => {
  for (const agent of ['claude', 'gemini', 'pi']) {
    test(`${agent} launcher`, () => {
      const runDir = mkdtempSync(join(tmpdir(), 'run-home-'));
      const runHomeDir = join(runDir, 'home');
      populateContextDir({
        codingAgentsDir: REAL_CODING_AGENTS,
        codingAgent: agent,
        runDir,
        substitutions: homeEnvSubstitutions(runHomeDir),
        required: true,
      });
      const launcher = readFileSync(
        join(runDir, 'gauntlet-agent', 'context', 'launch-agent'),
        'utf8',
      );
      // The placeholder is fully consumed and the concrete home env landed
      // inside the exec env invocation.
      expect(launcher).not.toContain('$QUORUM_HOME_ENV');
      expect(launcher).toContain(`HOME='${runHomeDir}'`);
      expect(launcher).toContain(
        `XDG_CONFIG_HOME='${join(runHomeDir, '.config')}'`,
      );
      expect(launcher).toMatch(/exec env[\s\S]*HOME=/);
    });
  }
});
