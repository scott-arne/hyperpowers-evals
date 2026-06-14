// test/atif-graft-differential.test.ts — TRANSITIONAL parity fence.
//
// Proves the OLD flat pipeline (src/normalizers/<agent>.ts → bin/<verb> over a
// flat coding-agent-tool-calls.jsonl) and the NEW ATIF pipeline
// (src/normalize/<agent>.ts → trajectory.json → bin/check-transcript <verb>)
// emit the same pass/fail verdict for the same session log, across EVERY
// dialect that still has both an OLD normalizer and a frozen fixture.
//
// This file is throwaway: it is deleted once src/normalizers/ is removed in the
// rollout. While both pipelines coexist, it is the regression fence for the
// cutover.
//
// Verb policy:
//   • Pure tool/skill-NAME verbs (tool-called, tool-not-called, tool-count,
//     tool-before, skill-called, skill-not-called) MUST match OLD vs NEW for
//     every dialect — both just enumerate tool/skill names, and the flatten
//     guard already proves the name sequences are identical. These cases use
//     `match(expected)`: OLD.passed === NEW.passed === expected.
//   • Implementation-path verbs (implementation-tool-not-called,
//     skill-before-implementation-tool) and tool-arg-match may INTENTIONALLY
//     diverge where an ATIF normalizer extracts richer args than the old flat
//     one. Those cases use `diverge(old, new, why)` — they assert BOTH the
//     legacy verdict and the (corrected) ATIF verdict and document the reason.
//     Any divergence NOT classified here is a real wiring bug — fix the
//     wiring, never weaken the assertion.

import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { flattenToolCalls } from '../src/atif/project.ts';
import type { AtifTrajectory } from '../src/atif/types.ts';
import type { ToolCall } from '../src/contracts/verdict.ts';
import { normalizeAntigravity } from '../src/normalize/antigravity.ts';
import { normalizeClaudeLegacy } from '../src/normalize/claude.ts';
import { normalizeCodex } from '../src/normalize/codex.ts';
import { normalizeCopilot } from '../src/normalize/copilot.ts';
import { normalizeGemini } from '../src/normalize/gemini.ts';
import { normalizeKimi } from '../src/normalize/kimi.ts';
import { normalizeOpencode } from '../src/normalize/opencode.ts';
import { normalizePi } from '../src/normalize/pi.ts';
import { normalizeAntigravityLogs } from '../src/normalizers/antigravity.ts';
import { normalizeClaudeLogs } from '../src/normalizers/claude.ts';
import { normalizeCodexLogs } from '../src/normalizers/codex.ts';
import { normalizeCopilotLogs } from '../src/normalizers/copilot.ts';
import { normalizeGeminiLogs } from '../src/normalizers/gemini.ts';
import { normalizeKimiLogs } from '../src/normalizers/kimi.ts';
import { normalizeOpencodeLogs } from '../src/normalizers/opencode.ts';
import { normalizePiLogs } from '../src/normalizers/pi.ts';

const REPO = process.cwd();
const BIN = join(REPO, 'bin');

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
 * OLD path: normalize a session log to the flat ToolCall[] JSONL, then run the
 * legacy bin/<verb> tool against it via $QUORUM_TOOL_CALLS_PATH.
 */
function runOld(rows: ToolCall[], verb: string, args: string[]): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'atif-old-'));
  try {
    const flat = join(dir, 'coding-agent-tool-calls.jsonl');
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
 * NEW path: write the ATIF trajectory.json, then run bin/check-transcript
 * <verb> against it via $QUORUM_TRANSCRIPT_PATH.
 */
function runNew(traj: AtifTrajectory, verb: string, args: string[]): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'atif-new-'));
  try {
    const trajPath = join(dir, 'trajectory.json');
    writeFileSync(trajPath, JSON.stringify(traj));
    const sink = join(dir, 'sink.jsonl');
    const res = spawnSync(join(BIN, 'check-transcript'), [verb, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        QUORUM_TRANSCRIPT_PATH: trajPath,
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

// A case's expected outcome is either a strict OLD===NEW match, or a documented
// intentional divergence (ATIF normalizer extracts richer args than the legacy
// flat normalizer).
type Parity =
  | { kind: 'match'; expected: boolean }
  | { kind: 'diverge'; old: boolean; new: boolean; why: string };

const match = (expected: boolean): Parity => ({ kind: 'match', expected });
const diverge = (oldP: boolean, newP: boolean, why: string): Parity => ({
  kind: 'diverge',
  old: oldP,
  new: newP,
  why,
});

interface DialectCase {
  label: string;
  verb: string;
  // The legacy bin tool and the new CLI take different arg surfaces for
  // tool-arg-match (raw jq filter vs --eq/--matches), identical for the rest.
  oldArgs: string[];
  newArgs: string[];
  parity: Parity;
}

interface Dialect {
  name: string;
  // The shared raw session-log input both pipelines consume.
  input: string;
  oldNormalize: (raw: string) => ToolCall[];
  newNormalize: (raw: string, version: string) => AtifTrajectory;
  cases: DialectCase[];
}

// ---------------------------------------------------------------------------
// Fixture loading. Two on-disk shapes:
//   • session.jsonl  (one raw log)             → claude, codex
//   • cases.json     ([{name, input, ...}])    → the rest; we pick one rich
//                                                 case per dialect by name.
// ---------------------------------------------------------------------------
function readSession(agent: string): string {
  return readFileSync(
    resolve(import.meta.dir, 'fixtures', agent, 'session.jsonl'),
    'utf8',
  );
}

function readCaseInput(agent: string, caseName: string): string {
  const cases = JSON.parse(
    readFileSync(
      resolve(import.meta.dir, 'fixtures', agent, 'cases.json'),
      'utf8',
    ),
  ) as { name: string; input: string }[];
  const found = cases.find((c) => c.name === caseName);
  if (!found) {
    throw new Error(`${agent} fixture has no case named "${caseName}"`);
  }
  return found.input;
}

// ---------------------------------------------------------------------------
// Dialect table. Each `cases` block is grounded in the dialect's actual
// fixture tools/skills, chosen so the `match` cases carry a pass/fail mix.
// ---------------------------------------------------------------------------
const dialects: Dialect[] = [
  // claude — real recorded session.jsonl. Tools: Bash×13, TaskUpdate×12,
  // Read×11, TaskCreate×6, Skill×4, Write×3, Edit×2. Skills: brainstorming,
  // writing-plans, executing-plans, finishing-a-development-branch.
  {
    name: 'claude',
    input: readSession('claude'),
    oldNormalize: normalizeClaudeLogs,
    newNormalize: normalizeClaudeLegacy,
    cases: [
      {
        label: 'tool-called Bash (present)',
        verb: 'tool-called',
        oldArgs: ['Bash'],
        newArgs: ['Bash'],
        parity: match(true),
      },
      {
        label: 'tool-called Grep (absent)',
        verb: 'tool-called',
        oldArgs: ['Grep'],
        newArgs: ['Grep'],
        parity: match(false),
      },
      {
        label: 'tool-not-called Grep (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['Grep'],
        newArgs: ['Grep'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Read (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(false),
      },
      {
        label: 'tool-count Skill eq 4 (true)',
        verb: 'tool-count',
        oldArgs: ['Skill', 'eq', '4'],
        newArgs: ['Skill', 'eq', '4'],
        parity: match(true),
      },
      {
        label: 'tool-count Bash eq 99 (false)',
        verb: 'tool-count',
        oldArgs: ['Bash', 'eq', '99'],
        newArgs: ['Bash', 'eq', '99'],
        parity: match(false),
      },
      {
        label: 'tool-before Skill Write (in order)',
        verb: 'tool-before',
        oldArgs: ['Skill', 'Write'],
        newArgs: ['Skill', 'Write'],
        parity: match(true),
      },
      {
        label: 'tool-before Write Skill (out of order)',
        verb: 'tool-before',
        oldArgs: ['Write', 'Skill'],
        newArgs: ['Write', 'Skill'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (present)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'skill-called nonexistent (absent)',
        verb: 'skill-called',
        oldArgs: ['superpowers:does-not-exist'],
        newArgs: ['superpowers:does-not-exist'],
        parity: match(false),
      },
      {
        label: 'skill-not-called nonexistent (absent → pass)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:does-not-exist'],
        newArgs: ['superpowers:does-not-exist'],
        parity: match(true),
      },
      {
        label: 'skill-not-called writing-plans (present → fail)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:writing-plans'],
        newArgs: ['superpowers:writing-plans'],
        parity: match(false),
      },
      {
        label: 'tool-arg-match Skill skill==brainstorming (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Skill', '.skill == "superpowers:brainstorming"'],
        newArgs: ['Skill', '--eq', 'skill=superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Skill skill==missing (no match)',
        verb: 'tool-arg-match',
        oldArgs: ['Skill', '.skill == "superpowers:does-not-exist"'],
        newArgs: ['Skill', '--eq', 'skill=superpowers:does-not-exist'],
        parity: match(false),
      },
    ],
  },

  // codex — synthetic session.jsonl exercising every codex shape. Flattened
  // tools: Bash, Edit (apply_patch ×2), Agent, wait_agent, close_agent. The
  // SECOND Edit is an `apply_patch` whose ATIF normalizer extracts
  // file_path="foo.go"; the legacy flat normalizer leaves only `patch`. That
  // single extraction is the root of all three documented divergences below.
  {
    name: 'codex',
    input: readSession('codex'),
    oldNormalize: normalizeCodexLogs,
    newNormalize: normalizeCodex,
    cases: [
      {
        label: 'tool-called Edit (present)',
        verb: 'tool-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: match(true),
      },
      {
        label: 'tool-called Read (absent)',
        verb: 'tool-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(false),
      },
      {
        label: 'tool-not-called Read (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Bash (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Bash'],
        newArgs: ['Bash'],
        parity: match(false),
      },
      {
        label: 'tool-count Edit eq 2 (true)',
        verb: 'tool-count',
        oldArgs: ['Edit', 'eq', '2'],
        newArgs: ['Edit', 'eq', '2'],
        parity: match(true),
      },
      {
        label: 'tool-count Bash eq 99 (false)',
        verb: 'tool-count',
        oldArgs: ['Bash', 'eq', '99'],
        newArgs: ['Bash', 'eq', '99'],
        parity: match(false),
      },
      {
        label: 'tool-before Bash Edit (in order)',
        verb: 'tool-before',
        oldArgs: ['Bash', 'Edit'],
        newArgs: ['Bash', 'Edit'],
        parity: match(true),
      },
      {
        label: 'tool-before Bash Agent (in order)',
        verb: 'tool-before',
        oldArgs: ['Bash', 'Agent'],
        newArgs: ['Bash', 'Agent'],
        parity: match(true),
      },
      // Bash fires first (index 0), so anything-before-Bash is false.
      {
        label: 'tool-before Edit Bash (out of order)',
        verb: 'tool-before',
        oldArgs: ['Edit', 'Bash'],
        newArgs: ['Edit', 'Bash'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (absent)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(false),
      },
      {
        label: 'skill-not-called brainstorming (absent → pass)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      // --- DIVERGENT: ATIF apply_patch → file_path extraction (intentional) ---
      // The legacy normalizer drops the patch target, so the flat row has no
      // file_path → the jq implementation-path predicate sees nothing → the
      // legacy tool reports "no implementation Edit" (pass). The ATIF
      // normalizer recovers file_path="foo.go" from the *** Add File *** patch
      // header, so the NEW tool correctly reports an implementation Edit (fail).
      {
        label:
          'implementation-tool-not-called Edit (ATIF detects apply_patch target)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: diverge(
          true,
          false,
          'ATIF codex normalizer extracts file_path=foo.go from the apply_patch header; the legacy flat normalizer leaves only `patch`, so its impl-path predicate is blind to the target. NEW correctly flags the implementation Edit.',
        ),
      },
      {
        // Codex never invoked brainstorming, and now an implementation Edit IS
        // detected — so the legacy "no impl Edit → vacuous pass" becomes a real
        // (correct) fail: a skill that never fired cannot precede a real impl
        // tool call.
        label:
          'skill-before-implementation-tool brainstorming Edit (no longer vacuous)',
        verb: 'skill-before-implementation-tool',
        oldArgs: ['superpowers:brainstorming', 'Edit'],
        newArgs: ['superpowers:brainstorming', 'Edit'],
        parity: diverge(
          true,
          false,
          'Same root cause: the legacy tool found no impl Edit and passed vacuously. ATIF detects the apply_patch impl Edit, and since brainstorming never fired the ordering assertion correctly fails.',
        ),
      },
      {
        // tool-arg-match keys off file_path, which only the ATIF row carries.
        label:
          'tool-arg-match Edit file_path==foo.go (only ATIF carries file_path)',
        verb: 'tool-arg-match',
        oldArgs: ['Edit', '.file_path == "foo.go"'],
        newArgs: ['Edit', '--eq', 'file_path=foo.go'],
        parity: diverge(
          false,
          true,
          'The apply_patch target is only present on the ATIF row (file_path=foo.go); the legacy flat row has no file_path key, so the jq filter matches nothing.',
        ),
      },
    ],
  },

  // gemini — "json-doc form" case: Skill(brainstorming), Glob, Write, Edit,
  // Bash. impl tools (Write notes.md, Edit notes.md) detected identically by
  // both pipelines; Skill fires before both, so skill-before-impl passes.
  {
    name: 'gemini',
    input: readCaseInput(
      'gemini',
      'json-doc form with messages array + dedup by id',
    ),
    oldNormalize: normalizeGeminiLogs,
    newNormalize: normalizeGemini,
    cases: [
      {
        label: 'tool-called Skill (present)',
        verb: 'tool-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(true),
      },
      {
        label: 'tool-called Read (absent)',
        verb: 'tool-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(false),
      },
      {
        label: 'tool-not-called Read (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Edit (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: match(false),
      },
      {
        label: 'tool-count Skill eq 1 (true)',
        verb: 'tool-count',
        oldArgs: ['Skill', 'eq', '1'],
        newArgs: ['Skill', 'eq', '1'],
        parity: match(true),
      },
      {
        label: 'tool-count Bash eq 9 (false)',
        verb: 'tool-count',
        oldArgs: ['Bash', 'eq', '9'],
        newArgs: ['Bash', 'eq', '9'],
        parity: match(false),
      },
      {
        label: 'tool-before Skill Edit (in order)',
        verb: 'tool-before',
        oldArgs: ['Skill', 'Edit'],
        newArgs: ['Skill', 'Edit'],
        parity: match(true),
      },
      {
        label: 'tool-before Edit Skill (out of order)',
        verb: 'tool-before',
        oldArgs: ['Edit', 'Skill'],
        newArgs: ['Edit', 'Skill'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (present)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'skill-not-called brainstorming (present → fail)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(false),
      },
      {
        label: 'skill-before-implementation-tool brainstorming Edit',
        verb: 'skill-before-implementation-tool',
        oldArgs: ['superpowers:brainstorming', 'Edit'],
        newArgs: ['superpowers:brainstorming', 'Edit'],
        parity: match(true),
      },
      {
        label: 'implementation-tool-not-called Edit (present → fail)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: match(false),
      },
      {
        label: 'tool-arg-match Skill skill==brainstorming (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Skill', '.skill == "superpowers:brainstorming"'],
        newArgs: ['Skill', '--eq', 'skill=superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Edit file_path==notes.md (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Edit', '.file_path == "notes.md"'],
        newArgs: ['Edit', '--eq', 'file_path=notes.md'],
        parity: match(true),
      },
    ],
  },

  // copilot — "all 16 mappings" case: Skill(brainstorming) fires first, then
  // impl Edit/Read/Write under src/. Skill precedes the impl tools.
  {
    name: 'copilot',
    input: readCaseInput('copilot', 'assistant tool requests: all 16 mappings'),
    oldNormalize: normalizeCopilotLogs,
    newNormalize: normalizeCopilot,
    cases: [
      {
        label: 'tool-called Skill (present)',
        verb: 'tool-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(true),
      },
      {
        label: 'tool-called LocalShell (absent)',
        verb: 'tool-called',
        oldArgs: ['LocalShell'],
        newArgs: ['LocalShell'],
        parity: match(false),
      },
      {
        label: 'tool-not-called LocalShell (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['LocalShell'],
        newArgs: ['LocalShell'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Edit (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: match(false),
      },
      {
        label: 'tool-count Edit eq 2 (true)',
        verb: 'tool-count',
        oldArgs: ['Edit', 'eq', '2'],
        newArgs: ['Edit', 'eq', '2'],
        parity: match(true),
      },
      {
        label: 'tool-count Skill eq 9 (false)',
        verb: 'tool-count',
        oldArgs: ['Skill', 'eq', '9'],
        newArgs: ['Skill', 'eq', '9'],
        parity: match(false),
      },
      {
        label: 'tool-before Skill Edit (in order)',
        verb: 'tool-before',
        oldArgs: ['Skill', 'Edit'],
        newArgs: ['Skill', 'Edit'],
        parity: match(true),
      },
      {
        label: 'tool-before Edit Skill (out of order)',
        verb: 'tool-before',
        oldArgs: ['Edit', 'Skill'],
        newArgs: ['Edit', 'Skill'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (present)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'skill-not-called brainstorming (present → fail)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(false),
      },
      {
        label: 'skill-before-implementation-tool brainstorming Edit',
        verb: 'skill-before-implementation-tool',
        oldArgs: ['superpowers:brainstorming', 'Edit'],
        newArgs: ['superpowers:brainstorming', 'Edit'],
        parity: match(true),
      },
      {
        label: 'implementation-tool-not-called Read (present → fail)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(false),
      },
      {
        label: 'tool-arg-match Skill skill==brainstorming (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Skill', '.skill == "superpowers:brainstorming"'],
        newArgs: ['Skill', '--eq', 'skill=superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Skill skill==missing (no match)',
        verb: 'tool-arg-match',
        oldArgs: ['Skill', '.skill == "superpowers:does-not-exist"'],
        newArgs: ['Skill', '--eq', 'skill=superpowers:does-not-exist'],
        parity: match(false),
      },
    ],
  },

  // opencode — "file/search/todo/web" case: Read/Write/Edit under src/, no
  // Skill. Skill verbs assert ABSENT (both fail/pass in agreement).
  {
    name: 'opencode',
    input: readCaseInput(
      'opencode',
      'export json: file/search/todo/web tools + file_path inference',
    ),
    oldNormalize: normalizeOpencodeLogs,
    newNormalize: normalizeOpencode,
    cases: [
      {
        label: 'tool-called Edit (present)',
        verb: 'tool-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: match(true),
      },
      {
        label: 'tool-called Skill (absent)',
        verb: 'tool-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(false),
      },
      {
        label: 'tool-not-called Skill (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Read (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(false),
      },
      {
        label: 'tool-count Edit eq 2 (true)',
        verb: 'tool-count',
        oldArgs: ['Edit', 'eq', '2'],
        newArgs: ['Edit', 'eq', '2'],
        parity: match(true),
      },
      {
        label: 'tool-count Read eq 9 (false)',
        verb: 'tool-count',
        oldArgs: ['Read', 'eq', '9'],
        newArgs: ['Read', 'eq', '9'],
        parity: match(false),
      },
      {
        label: 'tool-before Read Edit (in order)',
        verb: 'tool-before',
        oldArgs: ['Read', 'Edit'],
        newArgs: ['Read', 'Edit'],
        parity: match(true),
      },
      {
        label: 'tool-before Edit Read (out of order)',
        verb: 'tool-before',
        oldArgs: ['Edit', 'Read'],
        newArgs: ['Edit', 'Read'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (absent → fail)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(false),
      },
      {
        label: 'skill-not-called brainstorming (absent → pass)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'implementation-tool-not-called Edit (present → fail)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: match(false),
      },
      {
        label: 'implementation-tool-not-called Glob (absent → pass)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Glob'],
        newArgs: ['Glob'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Edit file_path==src/app.py (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Edit', '.file_path == "src/app.py"'],
        newArgs: ['Edit', '--eq', 'file_path=src/app.py'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Edit file_path==missing (no match)',
        verb: 'tool-arg-match',
        oldArgs: ['Edit', '.file_path == "nope.py"'],
        newArgs: ['Edit', '--eq', 'file_path=nope.py'],
        parity: match(false),
      },
    ],
  },

  // pi — "live-style session" case: Read/Write/Edit/Bash/Glob, custom_tool, no
  // Skill. impl Read/Write/Edit detected identically by both.
  {
    name: 'pi',
    input: readCaseInput(
      'pi',
      'live-style session with model rows and tool result',
    ),
    oldNormalize: normalizePiLogs,
    newNormalize: normalizePi,
    cases: [
      {
        label: 'tool-called Write (present)',
        verb: 'tool-called',
        oldArgs: ['Write'],
        newArgs: ['Write'],
        parity: match(true),
      },
      {
        label: 'tool-called Skill (absent)',
        verb: 'tool-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(false),
      },
      {
        label: 'tool-not-called Skill (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Read (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(false),
      },
      {
        label: 'tool-count Glob eq 2 (true)',
        verb: 'tool-count',
        oldArgs: ['Glob', 'eq', '2'],
        newArgs: ['Glob', 'eq', '2'],
        parity: match(true),
      },
      {
        label: 'tool-count Read eq 9 (false)',
        verb: 'tool-count',
        oldArgs: ['Read', 'eq', '9'],
        newArgs: ['Read', 'eq', '9'],
        parity: match(false),
      },
      {
        label: 'tool-before Read Edit (in order)',
        verb: 'tool-before',
        oldArgs: ['Read', 'Edit'],
        newArgs: ['Read', 'Edit'],
        parity: match(true),
      },
      {
        label: 'tool-before Edit Read (out of order)',
        verb: 'tool-before',
        oldArgs: ['Edit', 'Read'],
        newArgs: ['Edit', 'Read'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (absent → fail)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(false),
      },
      {
        label: 'skill-not-called brainstorming (absent → pass)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'implementation-tool-not-called Write (present → fail)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Write'],
        newArgs: ['Write'],
        parity: match(false),
      },
      {
        label: 'implementation-tool-not-called Bash (absent → pass)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Bash'],
        newArgs: ['Bash'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Edit path==out.md (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Edit', '.path == "out.md"'],
        newArgs: ['Edit', '--eq', 'path=out.md'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Edit path==missing (no match)',
        verb: 'tool-arg-match',
        oldArgs: ['Edit', '.path == "nope.md"'],
        newArgs: ['Edit', '--eq', 'path=nope.md'],
        parity: match(false),
      },
    ],
  },

  // kimi — "wire tool calls" case: Read, Bash, FetchURL, no Skill. impl Read
  // (sample.txt) detected identically by both.
  {
    name: 'kimi',
    input: readCaseInput(
      'kimi',
      'wire tool calls + native source + tool.result ignored',
    ),
    oldNormalize: normalizeKimiLogs,
    newNormalize: normalizeKimi,
    cases: [
      {
        label: 'tool-called Read (present)',
        verb: 'tool-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(true),
      },
      {
        label: 'tool-called Skill (absent)',
        verb: 'tool-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(false),
      },
      {
        label: 'tool-not-called Skill (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Bash (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Bash'],
        newArgs: ['Bash'],
        parity: match(false),
      },
      {
        label: 'tool-count Read eq 1 (true)',
        verb: 'tool-count',
        oldArgs: ['Read', 'eq', '1'],
        newArgs: ['Read', 'eq', '1'],
        parity: match(true),
      },
      {
        label: 'tool-count Bash eq 9 (false)',
        verb: 'tool-count',
        oldArgs: ['Bash', 'eq', '9'],
        newArgs: ['Bash', 'eq', '9'],
        parity: match(false),
      },
      {
        label: 'tool-before Read Bash (in order)',
        verb: 'tool-before',
        oldArgs: ['Read', 'Bash'],
        newArgs: ['Read', 'Bash'],
        parity: match(true),
      },
      {
        label: 'tool-before Bash Read (out of order)',
        verb: 'tool-before',
        oldArgs: ['Bash', 'Read'],
        newArgs: ['Bash', 'Read'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (absent → fail)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(false),
      },
      {
        label: 'skill-not-called brainstorming (absent → pass)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'implementation-tool-not-called Read (present → fail)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Read'],
        newArgs: ['Read'],
        parity: match(false),
      },
      {
        label: 'implementation-tool-not-called Bash (absent → pass)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Bash'],
        newArgs: ['Bash'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Read path==sample.txt (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Read', '.path == "sample.txt"'],
        newArgs: ['Read', '--eq', 'path=sample.txt'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Read path==missing (no match)',
        verb: 'tool-arg-match',
        oldArgs: ['Read', '.path == "nope.txt"'],
        newArgs: ['Read', '--eq', 'path=nope.txt'],
        parity: match(false),
      },
    ],
  },

  // antigravity — "documented aliases" case: Write/Edit/Grep/Glob/find_symbol/
  // WebSearch/WebFetch, no Skill. impl Write(new.py)/Edit(existing.py) detected
  // identically by both.
  {
    name: 'antigravity',
    input: readCaseInput(
      'antigravity',
      'documented aliases + unknown find tool preserved',
    ),
    oldNormalize: normalizeAntigravityLogs,
    newNormalize: normalizeAntigravity,
    cases: [
      {
        label: 'tool-called Edit (present)',
        verb: 'tool-called',
        oldArgs: ['Edit'],
        newArgs: ['Edit'],
        parity: match(true),
      },
      {
        label: 'tool-called Skill (absent)',
        verb: 'tool-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(false),
      },
      {
        label: 'tool-not-called Skill (absent → pass)',
        verb: 'tool-not-called',
        oldArgs: ['Skill'],
        newArgs: ['Skill'],
        parity: match(true),
      },
      {
        label: 'tool-not-called Write (present → fail)',
        verb: 'tool-not-called',
        oldArgs: ['Write'],
        newArgs: ['Write'],
        parity: match(false),
      },
      {
        label: 'tool-count Edit eq 2 (true)',
        verb: 'tool-count',
        oldArgs: ['Edit', 'eq', '2'],
        newArgs: ['Edit', 'eq', '2'],
        parity: match(true),
      },
      {
        label: 'tool-count Write eq 9 (false)',
        verb: 'tool-count',
        oldArgs: ['Write', 'eq', '9'],
        newArgs: ['Write', 'eq', '9'],
        parity: match(false),
      },
      {
        label: 'tool-before Write Edit (in order)',
        verb: 'tool-before',
        oldArgs: ['Write', 'Edit'],
        newArgs: ['Write', 'Edit'],
        parity: match(true),
      },
      {
        label: 'tool-before Edit Write (out of order)',
        verb: 'tool-before',
        oldArgs: ['Edit', 'Write'],
        newArgs: ['Edit', 'Write'],
        parity: match(false),
      },
      {
        label: 'skill-called brainstorming (absent → fail)',
        verb: 'skill-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(false),
      },
      {
        label: 'skill-not-called brainstorming (absent → pass)',
        verb: 'skill-not-called',
        oldArgs: ['superpowers:brainstorming'],
        newArgs: ['superpowers:brainstorming'],
        parity: match(true),
      },
      {
        label: 'implementation-tool-not-called Write (present → fail)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Write'],
        newArgs: ['Write'],
        parity: match(false),
      },
      {
        label: 'implementation-tool-not-called Grep (absent → pass)',
        verb: 'implementation-tool-not-called',
        oldArgs: ['Grep'],
        newArgs: ['Grep'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Write file_path==new.py (match)',
        verb: 'tool-arg-match',
        oldArgs: ['Write', '.file_path == "new.py"'],
        newArgs: ['Write', '--eq', 'file_path=new.py'],
        parity: match(true),
      },
      {
        label: 'tool-arg-match Write file_path==missing (no match)',
        verb: 'tool-arg-match',
        oldArgs: ['Write', '.file_path == "nope.py"'],
        newArgs: ['Write', '--eq', 'file_path=nope.py'],
        parity: match(false),
      },
    ],
  },
];

for (const d of dialects) {
  describe(`ATIF graft differential (${d.name}): OLD bin/ vs NEW check-transcript`, () => {
    const oldRows = d.oldNormalize(d.input);
    const traj = d.newNormalize(d.input, 'test');

    // Guard: both normalizers must flatten the fixture to the same tool
    // sequence, otherwise the parity comparison is meaningless. (Args MAY
    // differ — that's exactly what the divergent codex cases exercise — but
    // the ordered tool NAMES must agree.)
    test('both normalizers flatten the fixture to identical tool sequences', () => {
      const oldTools = oldRows.map((r) => r.tool);
      const newTools = flattenToolCalls(traj).map((c) => c.tool);
      expect(newTools).toEqual(oldTools);
      expect(oldTools.length).toBeGreaterThan(0);
    });

    for (const c of d.cases) {
      test(`${c.label}`, () => {
        const oldPassed = runOld(oldRows, c.verb, c.oldArgs);
        const newPassed = runNew(traj, c.verb, c.newArgs);
        if (c.parity.kind === 'match') {
          // The core parity assertion: legacy and ATIF must agree.
          expect(newPassed).toBe(oldPassed);
          // Sanity anchor: confirm we computed the outcome we designed for
          // (catches a fixture drift that flips BOTH paths the same way).
          expect(oldPassed).toBe(c.parity.expected);
        } else {
          // Documented intentional divergence — pin BOTH verdicts.
          expect(oldPassed).toBe(c.parity.old);
          expect(newPassed).toBe(c.parity.new);
          expect(oldPassed).not.toBe(newPassed);
        }
      });
    }

    // Teeth: the `match` case set must exercise BOTH pass and fail outcomes,
    // so the fence can't trivially pass by being all-green or all-red.
    test('the match-case set exercises both pass and fail outcomes', () => {
      const matchCases = d.cases.filter((c) => c.parity.kind === 'match');
      const passes = matchCases.filter(
        (c) => c.parity.kind === 'match' && c.parity.expected,
      ).length;
      const fails = matchCases.length - passes;
      expect(passes).toBeGreaterThan(0);
      expect(fails).toBeGreaterThan(0);
    });
  });
}
