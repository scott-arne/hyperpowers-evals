import { expect, test } from 'bun:test';
import type { ChildResult } from '../src/contracts/batch.ts';
import {
  createChildPidRegistry,
  stopBatch,
} from '../src/run-all/child-stop.ts';
import type { InvokeFn } from '../src/run-all/index.ts';
import type { ScheduleHandle } from '../src/scheduler/index.ts';

const ARGS = {
  scenarioDir: 's',
  codingAgent: 'claude',
  codingAgentsDir: 'c',
  outRoot: 'o',
} as const;

function fakeHandle(onStop: () => void): ScheduleHandle {
  return { done: Promise.resolve(), requestStop: onStop };
}

test('track registers a child pid while in flight and removes it on settle', async () => {
  const reg = createChildPidRegistry();
  let settle!: (r: ChildResult) => void;
  const inner: InvokeFn = (args) => {
    args.onPid?.(4242);
    return new Promise<ChildResult>((res) => {
      settle = res;
    });
  };
  const tracked = reg.track(inner);
  const run = tracked({ ...ARGS });
  // onPid fires synchronously inside inner, so the pid is live mid-run.
  expect([...reg.pids]).toEqual([4242]);
  settle({ run_id: 'r', exit_code: 0, error: null });
  await run;
  expect([...reg.pids]).toEqual([]);
});

test('track preserves a caller-supplied onPid', async () => {
  const reg = createChildPidRegistry();
  const seen: number[] = [];
  const inner: InvokeFn = (args) => {
    args.onPid?.(7);
    return Promise.resolve({ run_id: 'r', exit_code: 0, error: null });
  };
  await reg.track(inner)({ ...ARGS, onPid: (p) => seen.push(p) });
  expect(seen).toEqual([7]);
});

test('track removes the pid even when invoke rejects', async () => {
  const reg = createChildPidRegistry();
  const inner: InvokeFn = (args) => {
    args.onPid?.(9);
    return Promise.reject(new Error('boom'));
  };
  await expect(reg.track(inner)({ ...ARGS })).rejects.toThrow('boom');
  expect([...reg.pids]).toEqual([]);
});

test('stopBatch requests stop and SIGINTs each pid', () => {
  let stops = 0;
  const kills: Array<[number, string]> = [];
  stopBatch(
    fakeHandle(() => {
      stops += 1;
    }),
    [11, 22],
    (pid, sig) => {
      kills.push([pid, sig]);
    },
  );
  expect(stops).toBe(1);
  expect(kills).toEqual([
    [11, 'SIGINT'],
    [22, 'SIGINT'],
  ]);
});

test('stopBatch swallows ESRCH (the child already exited)', () => {
  const kill = (): never => {
    const err = new Error('no such process') as NodeJS.ErrnoException;
    err.code = 'ESRCH';
    throw err;
  };
  expect(() =>
    stopBatch(
      fakeHandle(() => {}),
      [1],
      kill,
    ),
  ).not.toThrow();
});

test('stopBatch propagates non-ESRCH kill errors', () => {
  const kill = (): never => {
    const err = new Error('operation not permitted') as NodeJS.ErrnoException;
    err.code = 'EPERM';
    throw err;
  };
  expect(() =>
    stopBatch(
      fakeHandle(() => {}),
      [1],
      kill,
    ),
  ).toThrow('operation not permitted');
});

test('stopBatch tolerates a null handle', () => {
  const kills: number[] = [];
  expect(() =>
    stopBatch(null, [5], (pid) => {
      kills.push(pid);
    }),
  ).not.toThrow();
  expect(kills).toEqual([5]);
});
