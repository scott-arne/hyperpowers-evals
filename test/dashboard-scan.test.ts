import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { cellKey } from '../src/dashboard/contracts.ts';
import {
  type PhaseRead,
  parseRunDirName,
  pidAlive,
  readDashboardVerdict,
  scanResults,
} from '../src/dashboard/scan.ts';

const AGENTS = ['claude', 'claude-haiku', 'codex'];

// --- parseRunDirName ---------------------------------------------------------

test('parseRunDirName uses longest-suffix agent match', () => {
  const p = parseRunDirName(
    'my-scn-claude-haiku-20260612T000000Z-1a2b',
    AGENTS,
  );
  expect(p?.scenario).toBe('my-scn');
  expect(p?.agent).toBe('claude-haiku');
  expect(p?.started_at).toBe('20260612T000000Z');
  expect(p?.nonce).toBe('1a2b');
});

test('parseRunDirName picks the shorter agent when the longer is not a suffix', () => {
  const p = parseRunDirName('my-scn-claude-20260612T000000Z-1a2b', AGENTS);
  expect(p?.scenario).toBe('my-scn');
  expect(p?.agent).toBe('claude');
});

test('parseRunDirName returns null for unparseable dirs', () => {
  expect(parseRunDirName('batches', AGENTS)).toBeNull();
  expect(parseRunDirName('weird-name', AGENTS)).toBeNull();
});

test('parseRunDirName returns null when the head is not a known agent', () => {
  // Right timestamp/nonce tail, but agent segment is unknown.
  expect(
    parseRunDirName('my-scn-gemini-20260612T000000Z-1a2b', AGENTS),
  ).toBeNull();
});

test('parseRunDirName returns null when the scenario half is empty', () => {
  // head is exactly "-claude" so scenario would be "" — rejected.
  expect(parseRunDirName('claude-20260612T000000Z-1a2b', AGENTS)).toBeNull();
});

test('parseRunDirName rejects a malformed (non-hex) nonce', () => {
  expect(
    parseRunDirName('my-scn-claude-20260612T000000Z-zzzz', AGENTS),
  ).toBeNull();
});

// --- pidAlive ----------------------------------------------------------------

test('pidAlive returns true for the current process', () => {
  expect(pidAlive(process.pid)).toBe(true);
});

test('pidAlive returns false for a certainly-dead pid', () => {
  // 2^31-ish pid never exists; process.kill throws ESRCH.
  expect(pidAlive(2147483646)).toBe(false);
});

// --- readDashboardVerdict ----------------------------------------------------

test('readDashboardVerdict returns null when verdict.json is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  expect(readDashboardVerdict(dir)).toBeNull();
});

test('readDashboardVerdict parses a present verdict', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  writeFileSync(
    join(dir, 'verdict.json'),
    JSON.stringify({ final: 'pass', economics: { total_est_cost_usd: 2.5 } }),
  );
  const v = readDashboardVerdict(dir);
  expect(v?.final).toBe('pass');
  expect(v?.economics?.total_est_cost_usd).toBe(2.5);
});

test('readDashboardVerdict returns null for unparseable JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  writeFileSync(join(dir, 'verdict.json'), '{ not json');
  expect(readDashboardVerdict(dir)).toBeNull();
});

test('readDashboardVerdict: a verdict beside a live pid reads null and is not cached; the one on disk after the writer exits is what reads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  writeFileSync(
    join(dir, 'phase.json'),
    JSON.stringify({ phase: 'agent', updated_at: 'x', pid: process.pid }),
  );
  writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ final: 'pass' }));
  expect(readDashboardVerdict(dir)).toBeNull();
  writeFileSync(
    join(dir, 'phase.json'),
    JSON.stringify({ phase: 'checks', updated_at: 'x', pid: 2147483646 }),
  );
  writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ final: 'fail' }));
  expect(readDashboardVerdict(dir)?.final).toBe('fail');
});

test('readDashboardVerdict: a phase file that exists but cannot be read is never taken as a finished run', () => {
  for (const body of ['', '{"phase":"agent"']) {
    const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
    writeFileSync(join(dir, 'phase.json'), body);
    writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ final: 'pass' }));
    expect(readDashboardVerdict(dir)).toBeNull();
    writeFileSync(
      join(dir, 'phase.json'),
      JSON.stringify({ phase: 'checks', updated_at: 'x', pid: 2147483646 }),
    );
    expect(readDashboardVerdict(dir)?.final).toBe('pass');
  }
});

test('readDashboardVerdict: a phase that goes live while the verdict is being read reads null and caches nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  let reads = 0;
  // The first read finds no phase file; before the verdict is parsed the run
  // reaches the Coding-Agent (a live phase) and a forged verdict appears.
  const interleaved = (): PhaseRead => {
    reads += 1;
    if (reads === 1) {
      writeFileSync(
        join(dir, 'verdict.json'),
        JSON.stringify({ final: 'forged' }),
      );
      return { kind: 'absent' };
    }
    return {
      kind: 'phase',
      phase: 'agent',
      pid: process.pid,
      host: hostname(),
    };
  };
  expect(readDashboardVerdict(dir, interleaved)).toBeNull();
  expect(reads).toBe(2);
  writeFileSync(
    join(dir, 'phase.json'),
    JSON.stringify({ phase: 'checks', updated_at: 'x', pid: 2147483646 }),
  );
  writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ final: 'fail' }));
  expect(readDashboardVerdict(dir)?.final).toBe('fail');
});

// A live phase.json plus a verdict beside it; `host` omitted models a phase file
// written before the runner recorded one.
function writeLivePhaseAndVerdict(host: string | undefined): string {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  const phase = { phase: 'agent', updated_at: 'x', pid: process.pid };
  writeFileSync(
    join(dir, 'phase.json'),
    JSON.stringify(host === undefined ? phase : { ...phase, host }),
  );
  writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ final: 'pass' }));
  return dir;
}

test('readDashboardVerdict: a phase written on another host skips the pid gate, so its verdict reads', () => {
  const dir = writeLivePhaseAndVerdict('other-host');
  expect(readDashboardVerdict(dir)?.final).toBe('pass');
});

test('readDashboardVerdict: a verdict beside a live pid from this host reads null', () => {
  const dir = writeLivePhaseAndVerdict(hostname());
  expect(readDashboardVerdict(dir)).toBeNull();
});

test('readDashboardVerdict: a verdict beside a live pid in a phase with no host reads null', () => {
  const dir = writeLivePhaseAndVerdict(undefined);
  expect(readDashboardVerdict(dir)).toBeNull();
});

test('readDashboardVerdict: an unreadable phase file is not trusted whatever host it might name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  writeFileSync(
    join(dir, 'phase.json'),
    JSON.stringify({ phase: 'agent', updated_at: 'x', host: 'other-host' }),
  );
  writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ final: 'pass' }));
  expect(readDashboardVerdict(dir)).toBeNull();
});

test('readDashboardVerdict: a verdict beside a done phase reads even though the process named in it is alive', () => {
  // A --repeat process stays alive across trials, so a finished trial's phase
  // names a live pid; `done` is the runner saying it is finished with the dir.
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  writeFileSync(
    join(dir, 'phase.json'),
    JSON.stringify({
      phase: 'done',
      updated_at: 'x',
      pid: process.pid,
      host: hostname(),
    }),
  );
  writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ final: 'pass' }));
  expect(readDashboardVerdict(dir)?.final).toBe('pass');
});

// --- scanResults: helpers ----------------------------------------------------

function writeRun(
  root: string,
  runId: string,
  files: { verdict?: unknown; phase?: unknown },
): void {
  const d = join(root, runId);
  mkdirSync(d, { recursive: true });
  if (files.verdict !== undefined) {
    writeFileSync(join(d, 'verdict.json'), JSON.stringify(files.verdict));
  }
  if (files.phase !== undefined) {
    writeFileSync(join(d, 'phase.json'), JSON.stringify(files.phase));
  }
}

// --- scanResults -------------------------------------------------------------

test('scanResults returns an empty grid for a missing root', () => {
  const grid = scanResults(join(tmpdir(), 'does-not-exist-xyz'), AGENTS);
  expect(grid.cells.size).toBe(0);
});

test('scanResults buckets runs into cells and windows to 5 newest', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  for (let i = 0; i < 7; i++) {
    writeRun(root, `s-claude-2026061${i}T000000Z-00${i}a`, {
      verdict: { final: 'pass', economics: { total_est_cost_usd: i } },
    });
  }
  const grid = scanResults(root, AGENTS);
  const cell = grid.cells.get(cellKey('s', 'claude'));
  expect(cell?.window.length).toBe(5);
  // Newest rightmost: the 7 stamps sort, window keeps the 5 newest (i=2..6),
  // newest is i=6 with cost 6.
  expect(cell?.window[4]?.cost_usd).toBe(6);
  expect(cell?.window[0]?.cost_usd).toBe(2);
});

test('scanResults skips batches and unparseable dirs', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  mkdirSync(join(root, 'batches'), { recursive: true });
  mkdirSync(join(root, 'totally-unparseable'), { recursive: true });
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    verdict: { final: 'pass' },
  });
  const grid = scanResults(root, AGENTS);
  expect(grid.cells.size).toBe(1);
  expect(grid.cells.has(cellKey('s', 'claude'))).toBe(true);
});

test('scanResults reads final/cost/finished_at off the verdict', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    verdict: {
      final: 'fail',
      economics: { total_est_cost_usd: 3.14 },
      finished_at: '2026-06-12T00:01:00Z',
    },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  const rec = cell?.window[0];
  expect(rec?.final).toBe('fail');
  expect(rec?.cost_usd).toBe(3.14);
  expect(rec?.finished_at).toBe('2026-06-12T00:01:00Z');
  expect(rec?.run_id).toBe('s-claude-20260612T000000Z-aaaa');
  expect(rec?.started_at).toBe('20260612T000000Z');
});

test('scanResults collapses an unknown final to "unknown"', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    verdict: { final: 'weird-value' },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  expect(cell?.window[0]?.final).toBe('unknown');
  expect(cell?.window[0]?.cost_usd).toBeNull();
  expect(cell?.window[0]?.finished_at).toBeNull();
});

test('scanResults: a live-pid phase.json with no verdict is the running run', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    phase: { phase: 'agent', updated_at: 'x', pid: process.pid },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  expect(cell?.running?.phase).toBe('agent');
  expect(cell?.window.length).toBe(0);
});

test('scanResults: running phase is taken verbatim from phase.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  // PhaseJsonSchema requires a string `phase`, so the value is used as-is (the
  // data.py `.get(..., "setup")` default can never fire after a successful parse).
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    phase: { phase: 'setup', updated_at: 'x', pid: process.pid },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  expect(cell?.running?.phase).toBe('setup');
});

test('AUTHORITY RULE: a verdict beside a live pid is not trusted; the run shows as running', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    verdict: { final: 'pass', economics: { total_est_cost_usd: 1 } },
    phase: { phase: 'agent', updated_at: 'x', pid: process.pid },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  expect(cell?.running?.phase).toBe('agent');
  expect(cell?.window.length).toBe(0);
});

test('AUTHORITY RULE: once the phase pid is dead, the verdict is the record', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    verdict: { final: 'pass', economics: { total_est_cost_usd: 1 } },
    phase: { phase: 'checks', updated_at: 'x', pid: 2147483646 },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  expect(cell?.running).toBeNull();
  expect(cell?.window.length).toBe(1);
  expect(cell?.window[0]?.final).toBe('pass');
});

test('scanResults: a --repeat process shows its finished trials while a later trial runs', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  const writer = { updated_at: 'x', pid: process.pid, host: hostname() };
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    verdict: { final: 'pass', economics: { total_est_cost_usd: 1 } },
    phase: { phase: 'done', ...writer },
  });
  writeRun(root, 's-claude-20260612T000100Z-bbbb', {
    verdict: { final: 'fail', economics: { total_est_cost_usd: 2 } },
    phase: { phase: 'done', ...writer },
  });
  writeRun(root, 's-claude-20260612T000200Z-cccc', {
    phase: { phase: 'agent', ...writer },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  expect(cell?.window.map((r) => r.final)).toEqual(['pass', 'fail']);
  expect(cell?.running?.run_id).toBe('s-claude-20260612T000200Z-cccc');
  expect(cell?.running?.phase).toBe('agent');
});

test('ABANDONED EXCLUSION: a done phase without a readable verdict is not shown as running', () => {
  const writer = { updated_at: 'x', pid: process.pid, host: hostname() };
  const missing = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(missing, 's-claude-20260612T000000Z-aaaa', {
    phase: { phase: 'done', ...writer },
  });
  expect(scanResults(missing, AGENTS).cells.size).toBe(0);

  const unparseable = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(unparseable, 's-claude-20260612T000000Z-aaaa', {
    phase: { phase: 'done', ...writer },
  });
  writeFileSync(
    join(unparseable, 's-claude-20260612T000000Z-aaaa', 'verdict.json'),
    '{ not json',
  );
  expect(scanResults(unparseable, AGENTS).cells.size).toBe(0);
});

test('ABANDONED EXCLUSION: dead-pid phase.json with no verdict omits the cell', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    phase: { phase: 'agent', updated_at: 'x', pid: 2147483646 },
  });
  const grid = scanResults(root, AGENTS);
  expect(grid.cells.has(cellKey('s', 'claude'))).toBe(false);
  expect(grid.cells.size).toBe(0);
});

test('ABANDONED EXCLUSION: phase.json without a pid omits the cell', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  // pid missing -> schema rejects -> treated as no live phase -> abandoned.
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    phase: { phase: 'agent', updated_at: 'x' },
  });
  expect(scanResults(root, AGENTS).cells.size).toBe(0);
});

test('scanResults: only the newest in-flight dir sets the cell running state', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  // An older resolved run plus a newer live-pid running dir.
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {
    verdict: { final: 'pass', economics: { total_est_cost_usd: 1 } },
  });
  writeRun(root, 's-claude-20260613T000000Z-bbbb', {
    phase: { phase: 'checks', updated_at: 'x', pid: process.pid },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  expect(cell?.running?.phase).toBe('checks');
  expect(cell?.running?.run_id).toBe('s-claude-20260613T000000Z-bbbb');
  // The resolved run still shows in the window.
  expect(cell?.window.length).toBe(1);
  expect(cell?.window[0]?.final).toBe('pass');
});

test('scanResults: window ordering is (started_at, nonce) ascending', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  // Same timestamp, nonce tie-break.
  writeRun(root, 's-claude-20260612T000000Z-00ff', {
    verdict: { final: 'pass', economics: { total_est_cost_usd: 2 } },
  });
  writeRun(root, 's-claude-20260612T000000Z-00aa', {
    verdict: { final: 'fail', economics: { total_est_cost_usd: 1 } },
  });
  const cell = scanResults(root, AGENTS).cells.get(cellKey('s', 'claude'));
  // 00aa < 00ff lexicographically, so 00aa is older (window[0]).
  expect(cell?.window[0]?.cost_usd).toBe(1);
  expect(cell?.window[1]?.cost_usd).toBe(2);
});

test('scanResults omits a cell whose only run is non-displayable', () => {
  const root = mkdtempSync(join(tmpdir(), 'res-'));
  // A dir with neither verdict nor a live phase: no record, no running.
  writeRun(root, 's-claude-20260612T000000Z-aaaa', {});
  expect(scanResults(root, AGENTS).cells.size).toBe(0);
});
