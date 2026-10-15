import { xdgHomeEnv } from '../agents/home-env.ts';

// The two environments a check phase runs under (spec, "Post-check
// environment"). The outer layer is trusted scenario text plus the check
// tooling; the inner layer is whatever `command-succeeds` executes, which may
// be code the agent wrote. One module owns both lists so the boundary is read
// in one place.

/** Names copied from the parent into the outer layer when present. */
export const OUTER_PASSTHROUGH: readonly string[] = [
  'PATH',
  'HOME',
  'TMPDIR',
  'LANG',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'http_proxy',
  'https_proxy',
  'no_proxy',
];

/** Names the inner layer never sees: the record's input and the harness
 *  checkout, plus the selector itself. */
export const INNER_REMOVED: readonly string[] = [
  'QUORUM_RECORD_SINK',
  'QUORUM_REPO_ROOT',
  'QUORUM_TRANSCRIPT_PATH',
  'QUORUM_RUN_DIR',
  'QUORUM_INNER_ENV',
];

export type InnerMode = 'projected' | 'legacy';

export interface OuterEnvArgs {
  readonly repoRoot: string;
  readonly agentHome: string;
  readonly transcriptPath?: string;
  readonly runDir?: string;
  readonly configDir?: string;
  readonly codingAgent?: string;
}

type Env = Readonly<Record<string, string | undefined>>;

function defined(env: Env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** The outer-layer environment. Never includes the record sink: the executor
 *  creates the sink and overlays it, so no caller can forget it. */
export function outerEnv(
  base: Env,
  args: OuterEnvArgs,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of OUTER_PASSTHROUGH) {
    const v = base[k];
    if (v !== undefined) out[k] = v;
  }
  for (const [k, v] of Object.entries(base)) {
    if (k.startsWith('LC_') && v !== undefined) out[k] = v;
  }
  out['PATH'] = out['PATH'] ?? '/usr/bin:/bin';
  out['QUORUM_REPO_ROOT'] = args.repoRoot;
  out['QUORUM_AGENT_HOME'] = args.agentHome;
  if (args.transcriptPath !== undefined)
    out['QUORUM_TRANSCRIPT_PATH'] = args.transcriptPath;
  if (args.runDir !== undefined) out['QUORUM_RUN_DIR'] = args.runDir;
  if (args.configDir !== undefined)
    out['QUORUM_AGENT_CONFIG_DIR'] = args.configDir;
  if (args.codingAgent !== undefined)
    out['QUORUM_CODING_AGENT'] = args.codingAgent;
  out['QUORUM_INNER_ENV'] = 'projected';
  return out;
}

/** Which inner construction the dispatcher applies. Absent means legacy:
 *  production always sets the selector through runPhase; a dispatcher run
 *  outside it (tests, by hand) keeps today's inheritance. */
export function innerMode(
  lookup: (k: string) => string | undefined,
): InnerMode {
  return lookup('QUORUM_INNER_ENV') === 'projected' ? 'projected' : 'legacy';
}

/** The inner-layer environment. The base is allowlisted here again, not
 *  trusted to be the outer layer already: a dispatcher run outside runPhase
 *  (a test, a hand invocation) hands this the ambient environment, and the
 *  inner layer must never carry a credential whichever way it was reached. */
export function innerEnv(base: Env, agentHome: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined) continue;
    if (
      OUTER_PASSTHROUGH.includes(k) ||
      k.startsWith('LC_') ||
      k.startsWith('QUORUM_')
    )
      out[k] = v;
  }
  for (const k of INNER_REMOVED) delete out[k];
  return { ...out, ...xdgHomeEnv(agentHome) };
}

/** Today's inheritance, minus the selector so no nested process can see it. */
export function legacyInnerEnv(base: Env): Record<string, string> {
  const out = defined(base);
  delete out['QUORUM_INNER_ENV'];
  return out;
}
