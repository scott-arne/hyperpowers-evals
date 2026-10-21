import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { constants, tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type CheckPhase,
  type CheckRecord,
  CheckRecordSchema,
} from '../contracts/verdict.ts';
import { envSnapshot } from '../env.ts';
import { outerEnv } from './env-allowlist.ts';

// A check verb emits one of these per line into QUORUM_RECORD_SINK. The verbs
// are bash functions (defined by the sourced prelude, src/checks/prelude.sh)
// over the typed dispatcher (src/cli/check-tool.ts), whose sole record emitter
// is src/check/record.ts: {check, args, negated, passed, detail}. The phase is
// injected by quorum, not the verb, so the sink-line schema is the full
// CheckRecord minus its phase field.
const SinkRecordSchema = CheckRecordSchema.omit({ phase: true });

export interface RunPhaseArgs {
  readonly checksSh: string;
  readonly phase: CheckPhase;
  readonly workdir: string;
  /**
   * The quorum repo root. Exposed to the child as QUORUM_REPO_ROOT and used to
   * locate the sourced check prelude (src/checks/prelude.sh), which defines the
   * bare-verb DSL (file-exists, git-count, not, check-transcript, …) as
   * functions delegating to the TS check CLIs.
   */
  readonly repoRoot: string;
  /** The agent's throwaway home; exported as QUORUM_AGENT_HOME and the root the inner projection overlays HOME/XDG/TMPDIR from. */
  readonly agentHome: string;
  /** Optional: path to the ATIF trajectory.json, exposed to transcript checks. */
  readonly transcriptPath?: string;
  /** Optional: the run dir, exposed to post-checks that read sibling artifacts. */
  readonly runDir?: string;
  /**
   * Optional: the coding-agent's isolated config dir, exposed to the bootstrap
   * verbs as QUORUM_AGENT_CONFIG_DIR (= <runHome>/<home_config_subdir>).
   */
  readonly configDir?: string;
  /**
   * Optional: the coding-agent config name (e.g. `codex`, `claude-sonnet`),
   * exposed to checks as QUORUM_CODING_AGENT so a verb can dispatch per-agent.
   */
  readonly codingAgent?: string;
}

export interface RunPhaseResult {
  readonly records: readonly CheckRecord[];
  /**
   * Crash-aware exit code: a tool that fails its assertion (rc 1) is an ok phase
   * if it emitted a record, but a bash crash (command-not-found / signal / no
   * records) propagates as nonzero.
   */
  readonly exitCode: number;
}

/**
 * Run one phase under an explicit environment. The sink is created here and
 * overlaid as QUORUM_RECORD_SINK, so a caller cannot forget it. Production
 * calls runPhase; the corpus replay calls this twice with two environments.
 *
 * Source the check prelude + a scenario's checks.sh and invoke one phase
 * (`pre`/`post`), collecting the CheckRecords its verb functions emit. Pure
 * given the filesystem; throws only on an unrecoverable spawn failure.
 */
export async function runPhaseWithEnv(
  args: RunPhaseArgs,
  env: Record<string, string>,
): Promise<RunPhaseResult> {
  const sinkDir = mkdtempSync(join(tmpdir(), 'sink-'));
  const sink = join(sinkDir, 'records.jsonl');
  const prelude = join(args.repoRoot, 'src', 'checks', 'prelude.sh');
  const childEnv: Record<string, string> = {
    ...env,
    QUORUM_RECORD_SINK: sink,
  };

  try {
    const proc = spawnSync(
      'bash',
      ['-c', `source '${prelude}'; source '${args.checksSh}'; ${args.phase}`],
      {
        cwd: args.workdir,
        env: childEnv,
        encoding: 'utf8',
        // spawnSync defaults maxBuffer to 1 MB of stdout+stderr; a verbose
        // pre()/post() body would otherwise return {status:null,
        // error:{code:'ENOBUFS'}}, tripping the spawn-error guard below and
        // discarding records the check tools already wrote to the sink. Uncap so
        // those records survive a chatty phase.
        maxBuffer: Number.POSITIVE_INFINITY,
      },
    );
    // Node's spawnSync does NOT throw when bash cannot be spawned — it returns
    // {status:null, error:<Error>}. Surface that as a thrown error rather than
    // swallowing it into a clean, empty phase.
    if (proc.error) {
      throw proc.error;
    }
    const records = readRecords(sink, args.phase);

    // A signal-killed bash child (OOM-killer, timeout SIGKILL) returns
    // status:null with proc.signal set. Such a phase DIED MID-RUN, so its result
    // is untrustworthy and incomplete — it is a CRASH regardless of any partial
    // records. A killed phase is never "clean", even if it emitted records before
    // dying. Map the kill into the >=128 crash band (128 + signo) so the composer
    // reports a checks crash; the records above are still surfaced for the
    // verdict's check list.
    if (proc.signal) {
      return { records, exitCode: 128 + signalNumber(proc.signal) };
    }
    const rc = proc.status ?? 0;

    // Crash heuristic:
    //   rc 0                  -> ok
    //   rc 126/127 or >= 128  -> crash (not-executable / not-found)
    //   else (1..125)         -> ok iff at least one record was emitted, else crash
    let exitCode: number;
    if (rc === 0) {
      exitCode = 0;
    } else if (rc === 126 || rc === 127 || rc >= 128) {
      exitCode = rc;
    } else {
      exitCode = records.length > 0 ? 0 : rc;
    }
    return { records, exitCode };
  } finally {
    rmSync(sinkDir, { recursive: true, force: true });
  }
}

/**
 * Run one phase under the allowlisted outer environment built from the
 * sanctioned snapshot (never process.env directly): the check tooling and the
 * QUORUM contract, and nothing else the operator happens to have exported.
 */
export async function runPhase(args: RunPhaseArgs): Promise<RunPhaseResult> {
  return runPhaseWithEnv(
    args,
    outerEnv(envSnapshot(), {
      repoRoot: args.repoRoot,
      agentHome: args.agentHome,
      ...(args.transcriptPath !== undefined
        ? { transcriptPath: args.transcriptPath }
        : {}),
      ...(args.runDir !== undefined ? { runDir: args.runDir } : {}),
      ...(args.configDir !== undefined ? { configDir: args.configDir } : {}),
      ...(args.codingAgent !== undefined
        ? { codingAgent: args.codingAgent }
        : {}),
    }),
  );
}

/** Map a signal name (e.g. "SIGKILL") to its number; SIGKILL (9) if unknown. */
function signalNumber(signal: NodeJS.Signals): number {
  return constants.signals[signal] ?? constants.signals.SIGKILL;
}

/** Parse every sink line as a CheckRecord, injecting the phase. */
function readRecords(sink: string, phase: CheckPhase): CheckRecord[] {
  let raw: string;
  try {
    raw = readFileSync(sink, 'utf8');
  } catch {
    // No sink file means the phase emitted nothing (e.g. `pre() { :; }`).
    return [];
  }
  const records: CheckRecord[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) {
      continue;
    }
    const parsed = SinkRecordSchema.parse(JSON.parse(line) as unknown);
    records.push({ ...parsed, phase });
  }
  return records;
}

// The `# coding-agents:` directive matcher. Leading whitespace before the `#` is
// allowed; the trailing `\s*$` plus the non-greedy `(.+?)` mean a bare
// `# coding-agents:` (no value) does NOT match.
const DIRECTIVE_RE = /^\s*#\s*coding-agents:\s*(.+?)\s*$/;

/**
 * Read a leading `# coding-agents: a, b` directive from a checks.sh, returning the
 * trimmed CSV members. A line that matches the directive but lists only
 * separators (e.g. `# coding-agents: ,`) is a *matched-but-empty* directive and
 * returns `[]` — the matrix gate reads `[]` as skip-all-agents, whereas a true
 * absence (no matching line, or a missing checks.sh) returns `undefined`.
 */
export function parseCodingAgentsDirective(
  checksSh: string,
): string[] | undefined {
  // A story-only scenario dir has no checks.sh and must be treated as un-gated
  // rather than crashing the matrix build.
  if (!existsSync(checksSh)) {
    return undefined;
  }
  // Scan the first 21 lines (indices 0..20 inclusive) for the directive.
  const head = readFileSync(checksSh, 'utf8').split('\n').slice(0, 21);
  for (const line of head) {
    const match = DIRECTIVE_RE.exec(line);
    const csv = match?.[1];
    if (csv !== undefined) {
      return csv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

// The `# claude-env:` directive matcher, with the `# coding-agents:` rules: a
// bare `# claude-env:` (no value) does not match.
const CLAUDE_ENV_RE = /^\s*#\s*claude-env:\s*(.+?)\s*$/;

/**
 * The Claude Code variables a scenario may set for the agent under test. The
 * launcher drops every inherited CLAUDE* variable so the operator's shell cannot
 * leak opt-ins into a campaign; this list is the only way back in, so it stays
 * as narrow as the scenarios that need it. CLAUDE_CODE_FORK_SUBAGENT is here
 * because the field's SDK sessions run without fork mode, while an interactive
 * session (quorum's) runs with it and dispatches every subagent in the
 * background.
 */
export const CLAUDE_ENV_ALLOWLIST: ReadonlySet<string> = new Set([
  'CLAUDE_CODE_ENABLE_TODO_TOOLS',
  'CLAUDE_CODE_FORK_SUBAGENT',
]);

/**
 * Read a leading `# claude-env: KEY=VALUE, …` directive from a checks.sh (first
 * 21 lines, like `# coding-agents:`). Returns undefined when the directive or
 * the file is absent. Throws on a key outside `allowed`, a pair without `=`,
 * or an empty value, so a malformed opt-in fails the run at setup instead of
 * running the agent without it.
 */
export function parseClaudeEnvDirective(
  checksSh: string,
  allowed: ReadonlySet<string> = CLAUDE_ENV_ALLOWLIST,
): Record<string, string> | undefined {
  if (!existsSync(checksSh)) {
    return undefined;
  }
  const head = readFileSync(checksSh, 'utf8').split('\n').slice(0, 21);
  for (const line of head) {
    const pairs = CLAUDE_ENV_RE.exec(line)?.[1];
    if (pairs === undefined) {
      continue;
    }
    const env: Record<string, string> = {};
    for (const pair of pairs.split(',').map((s) => s.trim())) {
      const eq = pair.indexOf('=');
      const key = eq < 0 ? '' : pair.slice(0, eq).trim();
      const value = eq < 0 ? '' : pair.slice(eq + 1).trim();
      if (key === '' || value === '') {
        throw new Error(
          `${checksSh}: claude-env pair '${pair}' is not KEY=VALUE with a non-empty value`,
        );
      }
      if (!allowed.has(key)) {
        throw new Error(
          `${checksSh}: ${key} is not on the claude-env allowlist (${[...allowed].join(', ')})`,
        );
      }
      env[key] = value;
    }
    return env;
  }
  return undefined;
}
