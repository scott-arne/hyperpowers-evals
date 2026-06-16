import type { SchedulerEvent } from '../scheduler/index.ts';

// run-all's liveness heartbeat. Output is append-only (no cursor), so liveness
// is a periodic status line interleaved with the done/skip lines. Because it is
// timer-driven it keeps printing even when dispatch stalls — successive
// heartbeats showing the same in-flight cells are the stall signature.

export interface HeartbeatState {
  // "agent:scenario" labels of the cells in flight right now.
  readonly running: readonly string[];
  // The global slot pool size (--jobs), for the running N/jobs ratio.
  readonly jobs: number;
  // Terminal cells so far (finished + runtime-skipped).
  readonly done: number;
  // Cells not yet started and not terminal.
  readonly queued: number;
  readonly now: Date;
}

// One status line, e.g.
//   ⋯ 03:53:10Z · running 2/4 · done 12 · queued 18 · [claude:alpha, codex:beta]
// The timestamp is UTC (HH:MM:SS), matching the run-id timestamps.
export function heartbeatLine(state: HeartbeatState): string {
  const ts = state.now.toISOString().slice(11, 19);
  return (
    `⋯ ${ts}Z · running ${state.running.length}/${state.jobs} · ` +
    `done ${state.done} · queued ${state.queued} · [${state.running.join(', ')}]`
  );
}

// Derives the heartbeat counts from the scheduler event stream. Pure: the same
// events the run-all consumer already receives drive it, with no I/O. `total` is
// the runnable cell count (queued = total - done - running).
export class HeartbeatTracker {
  // idx -> "agent:scenario"; an entry exists exactly while a cell is in flight.
  private readonly running = new Map<number, string>();
  private terminal = 0;
  private readonly total: number;

  constructor(total: number) {
    this.total = total;
  }

  onEvent(event: SchedulerEvent): void {
    if (event.kind === 'cell_started') {
      this.running.set(
        event.idx,
        `${event.entry.codingAgent}:${event.entry.scenario}`,
      );
    } else if (
      event.kind === 'cell_finished' ||
      event.kind === 'cell_skipped'
    ) {
      this.running.delete(event.idx);
      this.terminal += 1;
    }
  }

  snapshot(now: Date, jobs: number): HeartbeatState {
    const running = [...this.running.values()];
    return {
      running,
      jobs,
      done: this.terminal,
      queued: this.total - this.terminal - running.length,
      now,
    };
  }
}
