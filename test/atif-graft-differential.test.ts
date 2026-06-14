// test/atif-graft-differential.test.ts — TRANSITIONAL parity fence.
//
// Proves the OLD flat pipeline (src/normalizers/claude.ts → bin/<verb> over a
// flat coding-agent-tool-calls.jsonl) and the NEW ATIF pipeline
// (src/normalize/claude.ts → trajectory.json → bin/check-transcript <verb>)
// emit the same pass/fail verdict for the same claude session log.
//
// This file is throwaway: it is deleted once src/normalizers/ is removed in the
// rollout. While both pipelines coexist, it is the regression fence for the
// cutover. If a verb's `passed` diverges, that is a real wiring bug — fix the
// wiring, never weaken the assertion.

import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { flattenToolCalls } from '../src/atif/project.ts';
import { normalizeClaudeLegacy } from '../src/normalize/claude.ts';
import { normalizeClaudeLogs } from '../src/normalizers/claude.ts';

const REPO = process.cwd();
const BIN = join(REPO, 'bin');
// Real recorded claude session — the shared input both normalizers consume.
const SESSION = readFileSync(
  resolve(import.meta.dir, 'fixtures', 'claude', 'session.jsonl'),
  'utf8',
);

interface SinkRecord {
  check: string;
  args: string[];
  negated: boolean;
  passed: boolean;
  detail: string | null;
}

/** Read the single record a check tool appended to its sink file. */
function readSink(sinkPath: string): SinkRecord {
  const lines = readFileSync(sinkPath, 'utf8')
    .trim()
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length !== 1) {
    throw new Error(`expected exactly one sink record, got ${lines.length}`);
  }
  return JSON.parse(lines[0] as string) as SinkRecord;
}

/**
 * OLD path: normalize claude logs to the flat ToolCall[] JSONL, then run the
 * legacy bin/<verb> tool against it via $QUORUM_TOOL_CALLS_PATH.
 */
function runOld(verb: string, args: string[]): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'atif-old-'));
  try {
    const flat = join(dir, 'coding-agent-tool-calls.jsonl');
    const rows = normalizeClaudeLogs(SESSION);
    writeFileSync(flat, `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`);
    const sink = join(dir, 'sink.jsonl');
    const res = spawnSync(join(BIN, verb), args, {
      encoding: 'utf8',
      env: {
        ...process.env,
        QUORUM_TOOL_CALLS_PATH: flat,
        QUORUM_RECORD_SINK: sink,
        PATH: `${BIN}:${process.env['PATH'] ?? ''}`,
      },
    });
    if (res.error) {
      throw new Error(`bin/${verb} spawn failed: ${res.error.message}`);
    }
    return readSink(sink).passed;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * NEW path: normalize claude logs to an ATIF trajectory.json, then run
 * bin/check-transcript <verb> against it via $QUORUM_TRANSCRIPT_PATH.
 */
function runNew(verb: string, args: string[]): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'atif-new-'));
  try {
    const traj = join(dir, 'trajectory.json');
    writeFileSync(traj, JSON.stringify(normalizeClaudeLegacy(SESSION, 'test')));
    const sink = join(dir, 'sink.jsonl');
    const res = spawnSync(join(BIN, 'check-transcript'), [verb, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        QUORUM_TRANSCRIPT_PATH: traj,
        QUORUM_RECORD_SINK: sink,
        PATH: `${BIN}:${process.env['PATH'] ?? ''}`,
      },
    });
    if (res.error) {
      throw new Error(
        `check-transcript ${verb} spawn failed: ${res.error.message}`,
      );
    }
    return readSink(sink).passed;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Each case feeds BOTH paths their OWN native arg surface (tool-arg-match's
// caller syntax differs: the legacy bin tool takes a raw jq filter, the new
// CLI takes --eq/--matches), but asserts the SAME semantic outcome. Args are
// grounded in the actual claude fixture (tools: Bash×13, TaskUpdate×12,
// Read×11, TaskCreate×6, Skill×4, Write×3, Edit×2; skills: brainstorming,
// writing-plans, executing-plans, finishing-a-development-branch). The mix is
// chosen so neither path is all-pass.
interface Case {
  label: string;
  verb: string;
  oldArgs: string[];
  newArgs: string[];
  expected: boolean; // sanity anchor; the real assertion is old === new
}

const cases: Case[] = [
  // tool-called
  {
    label: 'tool-called Bash (present)',
    verb: 'tool-called',
    oldArgs: ['Bash'],
    newArgs: ['Bash'],
    expected: true,
  },
  {
    label: 'tool-called Grep (absent)',
    verb: 'tool-called',
    oldArgs: ['Grep'],
    newArgs: ['Grep'],
    expected: false,
  },
  // tool-not-called  [NEGATIVE]
  {
    label: 'tool-not-called Grep (absent → pass)',
    verb: 'tool-not-called',
    oldArgs: ['Grep'],
    newArgs: ['Grep'],
    expected: true,
  },
  {
    label: 'tool-not-called Read (present → fail)',
    verb: 'tool-not-called',
    oldArgs: ['Read'],
    newArgs: ['Read'],
    expected: false,
  },
  // tool-count
  {
    label: 'tool-count Skill eq 4 (true)',
    verb: 'tool-count',
    oldArgs: ['Skill', 'eq', '4'],
    newArgs: ['Skill', 'eq', '4'],
    expected: true,
  },
  {
    label: 'tool-count Bash eq 99 (false)',
    verb: 'tool-count',
    oldArgs: ['Bash', 'eq', '99'],
    newArgs: ['Bash', 'eq', '99'],
    expected: false,
  },
  // tool-before
  {
    label: 'tool-before Skill Write (in order)',
    verb: 'tool-before',
    oldArgs: ['Skill', 'Write'],
    newArgs: ['Skill', 'Write'],
    expected: true,
  },
  {
    label: 'tool-before Write Skill (out of order)',
    verb: 'tool-before',
    oldArgs: ['Write', 'Skill'],
    newArgs: ['Write', 'Skill'],
    expected: false,
  },
  // skill-called
  {
    label: 'skill-called brainstorming (present)',
    verb: 'skill-called',
    oldArgs: ['superpowers:brainstorming'],
    newArgs: ['superpowers:brainstorming'],
    expected: true,
  },
  {
    label: 'skill-called nonexistent (absent)',
    verb: 'skill-called',
    oldArgs: ['superpowers:does-not-exist'],
    newArgs: ['superpowers:does-not-exist'],
    expected: false,
  },
  // skill-not-called  [NEGATIVE]
  {
    label: 'skill-not-called nonexistent (absent → pass)',
    verb: 'skill-not-called',
    oldArgs: ['superpowers:does-not-exist'],
    newArgs: ['superpowers:does-not-exist'],
    expected: true,
  },
  {
    label: 'skill-not-called writing-plans (present → fail)',
    verb: 'skill-not-called',
    oldArgs: ['superpowers:writing-plans'],
    newArgs: ['superpowers:writing-plans'],
    expected: false,
  },
  // tool-arg-match  (divergent caller syntax, same semantics)
  {
    label: 'tool-arg-match Skill skill==brainstorming (match)',
    verb: 'tool-arg-match',
    oldArgs: ['Skill', '.skill == "superpowers:brainstorming"'],
    newArgs: ['Skill', '--eq', 'skill=superpowers:brainstorming'],
    expected: true,
  },
  {
    label: 'tool-arg-match Skill skill==missing (no match)',
    verb: 'tool-arg-match',
    oldArgs: ['Skill', '.skill == "superpowers:does-not-exist"'],
    newArgs: ['Skill', '--eq', 'skill=superpowers:does-not-exist'],
    expected: false,
  },
];

describe('ATIF graft differential (claude): OLD bin/ vs NEW check-transcript', () => {
  // Guard: both normalizers must flatten the fixture to the same tool sequence,
  // otherwise the parity comparison is meaningless.
  test('both normalizers flatten the fixture to identical tool sequences', () => {
    const oldTools = normalizeClaudeLogs(SESSION).map((r) => r.tool);
    const newTools = flattenToolCalls(
      normalizeClaudeLegacy(SESSION, 'test'),
    ).map((c) => c.tool);
    expect(newTools).toEqual(oldTools);
    expect(oldTools.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    test(`${c.label} — OLD.passed === NEW.passed`, () => {
      const oldPassed = runOld(c.verb, c.oldArgs);
      const newPassed = runNew(c.verb, c.newArgs);
      expect(newPassed).toBe(oldPassed);
      // Sanity anchor: confirm we computed the outcome we designed the case for
      // (catches a fixture drift that flips BOTH paths the same way).
      expect(oldPassed).toBe(c.expected);
    });
  }

  test('the case set exercises both pass and fail outcomes', () => {
    const passes = cases.filter((c) => c.expected).length;
    const fails = cases.length - passes;
    expect(passes).toBeGreaterThan(0);
    expect(fails).toBeGreaterThan(0);
  });
});
