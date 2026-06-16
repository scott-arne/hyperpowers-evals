import type { ChildResult } from '../contracts/batch.ts';
import type { ScheduleHandle } from '../scheduler/index.ts';
import type { InvokeChildArgs, InvokeFn } from './index.ts';

// Graceful-stop machinery shared by run-all's signal handler and the dashboard
// orchestrator's /stop. Both need the same two things: a live registry of
// in-flight child OS pids, and a routine that cancels the queue and SIGINTs each
// live child. Keeping them here means one tested implementation instead of two.

// A live set of in-flight child OS pids plus an InvokeFn wrapper that keeps it
// honest. A pid is added the instant its child spawns (onPid) and removed the
// instant that child's invoke settles, so the set only ever holds genuinely-live
// children — stopBatch can SIGINT every member without racing exited ones.
export interface ChildPidRegistry {
  readonly pids: ReadonlySet<number>;
  // Wrap an InvokeFn so every child it launches registers its pid for the
  // lifetime of the run. A caller-supplied onPid is preserved (called after the
  // registry's own bookkeeping).
  track(invoke: InvokeFn): InvokeFn;
}

export function createChildPidRegistry(): ChildPidRegistry {
  const pids = new Set<number>();
  const track =
    (invoke: InvokeFn): InvokeFn =>
    async (args: InvokeChildArgs): Promise<ChildResult> => {
      // Per-call list so the finally only forgets pids this run registered.
      const spawned: number[] = [];
      const wrapped: InvokeChildArgs = {
        ...args,
        onPid: (pid) => {
          spawned.push(pid);
          pids.add(pid);
          args.onPid?.(pid);
        },
      };
      try {
        return await invoke(wrapped);
      } finally {
        for (const pid of spawned) {
          pids.delete(pid);
        }
      }
    };
  return { pids, track };
}

export type KillFn = (pid: number, signal: NodeJS.Signals) => void;

const defaultKill: KillFn = (pid, signal) => {
  process.kill(pid, signal);
};

// Drive the graceful-stop path: cancel everything still queued (requestStop, so
// the scheduler eager-skips undispatched cells 'stopped') and SIGINT every
// tracked in-flight child. SIGINT — not SIGTERM — so the runner's handler writes
// a stopped verdict instead of dying verdict-less. ESRCH (the child already
// exited, a benign race with the registry's removal) is swallowed; any other
// kill error propagates.
export function stopBatch(
  handle: ScheduleHandle | null,
  pids: Iterable<number>,
  kill: KillFn = defaultKill,
): void {
  handle?.requestStop();
  for (const pid of pids) {
    try {
      kill(pid, 'SIGINT');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ESRCH') {
        throw err;
      }
    }
  }
}
