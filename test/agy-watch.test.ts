import { describe, expect, test } from 'bun:test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AgyRateLimitWatcher,
  agyLogShowsRateLimit,
} from '../src/agents/agy-watch.ts';
import { makeTempHome } from './provision-helpers.ts';

// makeTempHome does not pre-create workdir; the watcher needs a real dir to host
// agy.log. Returns the home plus the (now-created) workdir.
function watchHome(): ReturnType<typeof makeTempHome> {
  const h = makeTempHome();
  mkdirSync(h.home.workdir, { recursive: true });
  return h;
}

async function runUntil(pred: () => boolean, timeout = 2000): Promise<boolean> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (pred()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

describe('agyLogShowsRateLimit', () => {
  test('matches RESOURCE_EXHAUSTED case-insensitively', () => {
    expect(agyLogShowsRateLimit('Error: resource_exhausted')).toBe(true);
    expect(agyLogShowsRateLimit('RESOURCE_EXHAUSTED')).toBe(true);
  });
  test('matches ratelimitexceeded', () => {
    expect(agyLogShowsRateLimit('rateLimitExceeded reported')).toBe(true);
  });
  test('matches a word-boundaried 429', () => {
    expect(agyLogShowsRateLimit('HTTP 429 Too Many Requests')).toBe(true);
  });
  test('does not match a 429 embedded in a larger token', () => {
    expect(agyLogShowsRateLimit('listening on port 14290; build 4291')).toBe(
      false,
    );
  });
  test('clean text does not match', () => {
    expect(agyLogShowsRateLimit('all good, response OK')).toBe(false);
  });
});

describe('AgyRateLimitWatcher', () => {
  test('detects RESOURCE_EXHAUSTED mid-flight and fires teardown', async () => {
    const { home, cleanup } = watchHome();
    try {
      const log = join(home.workdir, 'agy.log');
      writeFileSync(log, 'starting\n', 'utf8');
      const killed: string[] = [];
      const w = new AgyRateLimitWatcher(log, home.workdir, {
        teardown: (target) => {
          killed.push(target);
          return true;
        },
        pollIntervalMs: 20,
      });
      w.start();
      appendFileSync(log, 'googleapi: Error 429: RESOURCE_EXHAUSTED\n', 'utf8');
      expect(await runUntil(() => w.tripped)).toBe(true);
      expect(killed).toEqual([home.workdir]);
      expect(w.matchedText).toContain('RESOURCE_EXHAUSTED');
      await w.stop();
    } finally {
      cleanup();
    }
  });

  test('clean log never trips', async () => {
    const { home, cleanup } = watchHome();
    try {
      const log = join(home.workdir, 'agy.log');
      writeFileSync(log, 'all good\nmore output\n', 'utf8');
      const w = new AgyRateLimitWatcher(log, home.workdir, {
        teardown: () => true,
        pollIntervalMs: 20,
      });
      w.start();
      await sleep(200);
      expect(w.tripped).toBe(false);
      await w.stop();
    } finally {
      cleanup();
    }
  });

  test('stop before start does not raise', async () => {
    const { home, cleanup } = makeTempHome();
    try {
      const w = new AgyRateLimitWatcher(
        join(home.workdir, 'agy.log'),
        home.workdir,
        { teardown: () => true },
      );
      await w.stop();
      expect(w.tripped).toBe(false);
    } finally {
      cleanup();
    }
  });

  test('tolerates an initially-absent log created later', async () => {
    const { home, cleanup } = watchHome();
    try {
      const log = join(home.workdir, 'agy.log'); // does not exist yet
      const w = new AgyRateLimitWatcher(log, home.workdir, {
        teardown: () => true,
        pollIntervalMs: 20,
      });
      w.start();
      await sleep(80);
      writeFileSync(log, '429 RESOURCE_EXHAUSTED\n', 'utf8');
      expect(await runUntil(() => w.tripped)).toBe(true);
      await w.stop();
    } finally {
      cleanup();
    }
  });

  test('fires teardown exactly once', async () => {
    const { home, cleanup } = watchHome();
    try {
      const log = join(home.workdir, 'agy.log');
      writeFileSync(log, 'starting\n', 'utf8');
      let calls = 0;
      const w = new AgyRateLimitWatcher(log, home.workdir, {
        teardown: () => {
          calls += 1;
          return true;
        },
        pollIntervalMs: 20,
      });
      w.start();
      appendFileSync(log, 'RESOURCE_EXHAUSTED\n', 'utf8');
      expect(await runUntil(() => w.tripped)).toBe(true);
      appendFileSync(log, 'RESOURCE_EXHAUSTED again\n', 'utf8');
      await sleep(120);
      expect(calls).toBe(1);
      await w.stop();
    } finally {
      cleanup();
    }
  });

  test('stop is clean and idempotent (no leaked loop)', async () => {
    const { home, cleanup } = watchHome();
    try {
      const log = join(home.workdir, 'agy.log');
      writeFileSync(log, 'all good\n', 'utf8');
      const w = new AgyRateLimitWatcher(log, home.workdir, {
        teardown: () => true,
        pollIntervalMs: 20,
      });
      w.start();
      await sleep(50);
      await w.stop();
      expect(w.running).toBe(false);
      await w.stop();
      expect(w.running).toBe(false);
    } finally {
      cleanup();
    }
  });
});
