import { join } from 'node:path';

// The standard throwaway-$HOME isolation env every coding agent under test runs
// with: HOME plus the XDG base dirs and TMPDIR, all rooted at `homeDir`. This is
// the SINGLE source of truth for "what the isolated home env is" — the launcher
// token (`homeEnvSubstitutions` -> `$QUORUM_HOME_ENV`) and the opencode capture
// subprocess (`opencodeEnv`) both derive from it, so the agent and its capture
// always agree on the same isolated home.
//
// A leaf module (only node:path) so both src/runner and src/agents can import it
// without a cycle.
export function xdgHomeEnv(homeDir: string): Record<string, string> {
  return {
    HOME: homeDir,
    XDG_CONFIG_HOME: join(homeDir, '.config'),
    XDG_CACHE_HOME: join(homeDir, '.cache'),
    XDG_DATA_HOME: join(homeDir, '.local', 'share'),
    XDG_STATE_HOME: join(homeDir, '.local', 'state'),
    TMPDIR: join(homeDir, '.tmp'),
  };
}

// The directories `xdgHomeEnv` points at (every value except HOME). Created up
// front by the runner so every agent — and its capture subprocess — finds them
// present (codex/opencode previously each `mkdir -p`'d these inline).
export function xdgHomeSubdirs(homeDir: string): string[] {
  const { HOME: _home, ...subdirs } = xdgHomeEnv(homeDir);
  return Object.values(subdirs);
}
