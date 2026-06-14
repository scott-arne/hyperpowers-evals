// check-transcript CLI — drop-in replacement for quorum's shell check tools.
//
// Usage: bun run check-transcript.ts <verb> [args...]
//
// Exit codes:
//   0   — check passed
//   1   — check failed (an honest pass/fail verdict; `not` may invert it)
//   127 — usage error (no/unknown verb, bad args) OR a tool crash. This is in
//         bin/not's crash range (>=126) ON PURPOSE: a broken/typo'd check must
//         NOT be invertible. If it exited 2 or 1, `not check-transcript <typo>`
//         would treat it as an intentional failure and INVERT it to a silent
//         pass — green-lighting a check that never actually ran.

import { recordFail, recordPass } from '../check/record.ts';
import { loadCalls } from '../check/transcript.ts';
import {
  verbImplementationToolNotCalled,
  verbInvestigated,
  verbSkillBeforeImplementationTool,
  verbSkillBeforeTool,
  verbSkillCalled,
  verbSkillNotCalled,
  verbToolArgMatch,
  verbToolBefore,
  verbToolCalled,
  verbToolCount,
  verbToolMatchBeforeToolMatch,
  verbToolNotCalled,
  verbWorktreeCreated,
} from '../check/verbs.ts';

const [, , verb, ...rest] = Bun.argv;
const cliArgs = rest;

// Non-invertible exit: usage errors and crashes must land in bin/not's crash
// range (>=126) so `not check-transcript ...` can't silently invert a broken
// check into a pass. Always emit a fail record too, so the direct (non-`not`)
// path and the composer see a failed check rather than a missing one.
const NONINVERTIBLE_EXIT = 127;
function brokenCheck(message: string, check: string): never {
  console.error(message);
  recordFail(check, cliArgs, message);
  process.exit(NONINVERTIBLE_EXIT);
}

if (!verb) {
  brokenCheck('usage: check-transcript <verb> [args...]', 'check-transcript');
}

// `verb` is narrowed to string here, but the narrowing is lost inside the
// nested dispatch closures; capture it so callers don't need `verb!`.
const verbName: string = verb;

// Minimum required positional args per verb. A missing arg must NOT silently
// pass: e.g. `skill-before-tool <skill>` with no <tool> would set tool="" ,
// match nothing, and vacuously pass. Arity is validated before dispatch and
// routes through the non-invertible 127 path.
const REQUIRED_ARGS: Record<string, number> = {
  'tool-called': 1,
  'tool-not-called': 1,
  'tool-count': 3,
  'tool-before': 2,
  'skill-called': 1,
  'skill-not-called': 1,
  'skill-before-tool': 2,
  'skill-before-implementation-tool': 2,
  'implementation-tool-not-called': 1,
  investigated: 0,
  'worktree-created': 0,
  'tool-match-before-tool-match': 4,
};

const { calls, empty } = loadCalls();

function dispatch(): void {
  try {
    dispatchInner();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    brokenCheck(`tool error: ${message}`, verbName);
  }
}

function dispatchInner(): void {
  const need = REQUIRED_ARGS[verbName];
  if (need !== undefined && cliArgs.length < need) {
    brokenCheck(
      `check-transcript ${verbName}: expected ${need} argument(s), got ${cliArgs.length}`,
      verbName,
    );
  }
  if (
    verbName === 'tool-arg-match' &&
    (cliArgs.length < 1 ||
      !cliArgs.some((a) => a === '--eq' || a === '--matches'))
  ) {
    brokenCheck(
      'check-transcript tool-arg-match: needs <tool> and at least one --eq/--matches',
      verbName,
    );
  }
  // Each --eq/--matches must be followed by a well-formed `key=value` spec: a
  // missing or keyless spec parses to {keys:[], expected:''}, which matches
  // every call → silent pass. Reject it as a broken (non-invertible) check.
  // Key extraction mirrors parseToolArgMatchArgs so the gate is exact.
  if (verbName === 'tool-arg-match') {
    for (let i = 0; i < cliArgs.length; i++) {
      if (cliArgs[i] === '--eq' || cliArgs[i] === '--matches') {
        const spec = cliArgs[i + 1] ?? '';
        const eqIdx = spec.indexOf('=');
        const keyPart = eqIdx >= 0 ? spec.slice(0, eqIdx) : '';
        const keys = keyPart
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
        if (eqIdx < 0 || keys.length === 0) {
          brokenCheck(
            `check-transcript tool-arg-match: ${cliArgs[i]} needs a key=value spec with a non-empty key`,
            verbName,
          );
        }
      }
    }
  }

  switch (verbName) {
    case 'tool-called': {
      const r = verbToolCalled(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'tool-not-called': {
      const r = verbToolNotCalled(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'tool-count': {
      const r = verbToolCount(calls, empty, cliArgs);
      if (r === null) {
        brokenCheck(
          `Unknown operator: ${cliArgs[1] ?? ''} (expected: eq, gt, gte, lt, lte)`,
          verbName,
        );
      }
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'tool-before': {
      const r = verbToolBefore(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'skill-called': {
      const r = verbSkillCalled(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'skill-not-called': {
      const r = verbSkillNotCalled(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'skill-before-tool': {
      const r = verbSkillBeforeTool(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'skill-before-implementation-tool': {
      const r = verbSkillBeforeImplementationTool(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'implementation-tool-not-called': {
      const r = verbImplementationToolNotCalled(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'investigated': {
      const r = verbInvestigated(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'worktree-created': {
      const r = verbWorktreeCreated(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'tool-match-before-tool-match': {
      const r = verbToolMatchBeforeToolMatch(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    case 'tool-arg-match': {
      const r = verbToolArgMatch(calls, empty, cliArgs);
      if (r.passed) recordPass(verbName, cliArgs, r.detail);
      else recordFail(verbName, cliArgs, r.detail);
      process.exit(r.passed ? 0 : 1);
      break;
    }
    default:
      brokenCheck(`check-transcript: unknown verb '${verbName}'`, verbName);
  }
}

dispatch();
