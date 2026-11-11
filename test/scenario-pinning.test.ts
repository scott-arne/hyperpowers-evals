import { expect, test } from 'bun:test';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseClaudeEnvDirective,
  parseCodingAgentsDirective,
} from '../src/checks/index.ts';
import { repoRoot } from '../src/paths.ts';

// Scenario unpin fence (oracle 08c3c6a, mirrors tests/quorum/test_scenario_pinning.py).
// A scenario is "pinned" iff its checks.sh carries a leading `# coding-agents:`
// directive (parseCodingAgentsDirective !== undefined). Pinning narrows a scenario
// to specific coding-agents, so the set of pinned scenarios is a deliberate harness
// decision — this frozen allowlist makes any silent (un)pin land RED instead of
// quietly changing matrix coverage. Verified against the live scenarios dir on disk.
//
// The `brainstorming-*`, `codex-gate-*`, and `sdd-*` entries are fork-added
// scenarios pinned to the Claude family. Each exercises gate machinery that only
// exists in Claude Code — the Codex review gates, the approach gate, SDD's fix
// loop — so running them against a harness with no gate at all would measure
// nothing and score it as a failure. `tdd-runs-the-project-suite` and
// `brainstorming-asks-tooling-question` are pinned for a further reason: each is
// fork-side evidence for one upstream port, and its arms are only comparable
// across the actors that were measured — three for the first, one for the
// second. `executing-plans-keeps-inline-request` and
// `code-review-of-a-committed-change` are the Arm D pair supplying
// after-the-fact evidence for the two routing edits 6.13.0 shipped; both assert
// on Claude Code's `Agent` dispatch tool and the second runs through the Codex
// code gate, so neither measures anything on a harness without them.
// `code-review-precision-on-realistic-diff` asserts on Claude Code's `Agent`
// dispatch tool and invocation of superpowers:/hyperpowers:requesting-code-review,
// so a harness without that skill namespace and dispatch tool would measure
// nothing and score it as a failure. `sdd-turn-liveness` measures Claude Code's
// turn ends and background-task handling during SDD, and asserts on its `Agent`
// dispatch tool, so it is pinned to the Claude family for the same reason.
// `sdd-turn-liveness-fork` is that scenario with Claude Code's fork subagent
// mode left on, the stop-guard campaign's terminal smoke, and it measures the
// same Claude Code behavior.
// `sdd-dispatch-guard` measures what the SDD dispatch guard, a Claude Code
// PreToolUse hook, refuses during SDD and what the controller does next, and
// asserts on Claude Code's `Agent` dispatch tool; `sdd-dispatch-guard-fork`
// is the same scenario with fork subagent mode left on, where the guard must
// refuse nothing. Both measure Claude Code behavior only.
// `sdd-compaction-reread` measures what Claude Code's SDD controller does after a
// mid-run context compaction and asserts on its `Agent` dispatch tool, so it is
// pinned to claude-auto for the same reason.
const INTENTIONAL_PINNED_SCENARIOS = new Set<string>([
  'brainstorming-asks-tooling-question',
  'brainstorming-bounded-companion-after-compaction',
  'brainstorming-bounded-companion-closed-cli-output',
  'brainstorming-bounded-companion-default-window',
  'brainstorming-bounded-fires-approach-gate',
  'brainstorming-bounded-fires-visual-companion',
  'brainstorming-router-escalates-b1-userid-param',
  'brainstorming-router-escalates-b2-config-module',
  'brainstorming-router-escalates-b3-logging',
  'brainstorming-router-escalates-b4-reusable-validation',
  'brainstorming-router-escalates-b5-prefs-storage',
  'brainstorming-router-no-downgrade',
  'code-review-of-a-committed-change',
  'code-review-precision-on-realistic-diff',
  'codex-approach-gate-fires-on-architecture',
  'codex-doc-gate-foreground-await',
  'codex-gate-backstop-finding-forces-choice',
  'codex-gate-code-review-runs-when-present',
  'codex-gate-converges-on-reraise',
  'codex-gate-incomplete-not-approval',
  'codex-gate-lens-fanout-compliance',
  'codex-gate-re-review-focus-is-fixed',
  'codex-gate-risk-tier-discipline',
  'codex-gate-stale-broker-attributed',
  'codex-plan-gate-algorithm-locked-after-round1',
  'codex-subagent-wait-mapping',
  'codex-tool-mapping-comprehension',
  'executing-plans-keeps-inline-request',
  'sdd-compaction-reread',
  'sdd-de-minimis-carveout',
  'sdd-dispatch-guard',
  'sdd-dispatch-guard-fork',
  'sdd-fix-loop-refutes-wrong-finding',
  'sdd-plan-scoped-scratch',
  'sdd-spec-context-consumed',
  'sdd-turn-liveness',
  'sdd-turn-liveness-fork',
  'sdd-unified-fix-loop',
  'tdd-runs-the-project-suite',
  'worktree-creation-under-pressure',
  'worktree-no-drift-to-main',
]);

test('harness pins are exactly the explicitly intentional scenarios', () => {
  const scenarioRoot = join(repoRoot(), 'scenarios');
  const pinned = new Set<string>();
  for (const entry of readdirSync(scenarioRoot)) {
    const scenarioDir = join(scenarioRoot, entry);
    if (!statSync(scenarioDir).isDirectory()) {
      continue;
    }
    const checksSh = join(scenarioDir, 'checks.sh');
    if (!existsSync(checksSh)) {
      continue;
    }
    if (parseCodingAgentsDirective(checksSh) !== undefined) {
      pinned.add(entry);
    }
  }
  expect(pinned).toEqual(INTENTIONAL_PINNED_SCENARIOS);
});

// `sdd-turn-liveness` declares its `# claude-env:` directive under a long
// comment block, and parseClaudeEnvDirective reads only the first 21 lines of
// checks.sh. A comment added above the directive would push it out of that
// window with no other symptom: the scenario would then run with Claude Code's
// fork mode on and the task tools off, where every dispatch is backgrounded in
// both arms and the campaign's contrast disappears (plan deviation 9). This
// reads the live file, so the window is what it asserts on.
test('the sdd-turn-liveness claude-env directive is read inside the window', () => {
  const checksSh = join(
    repoRoot(),
    'scenarios',
    'sdd-turn-liveness',
    'checks.sh',
  );
  expect(parseClaudeEnvDirective(checksSh)).toEqual({
    CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
    CLAUDE_CODE_FORK_SUBAGENT: '0',
  });
});

// The fork copy carries the same long comment block and runs with fork mode
// deliberately on, so its directive sets the task tools alone. Out of the
// window it would read as undefined: the task tools would be off and the mode
// would be on by accident rather than by design.
test('the sdd-turn-liveness-fork claude-env directive is read inside the window', () => {
  const checksSh = join(
    repoRoot(),
    'scenarios',
    'sdd-turn-liveness-fork',
    'checks.sh',
  );
  expect(parseClaudeEnvDirective(checksSh)).toEqual({
    CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
  });
});

// The dispatch guard's scenario must run with fork mode off and the task
// tools on, as the field's SDK sessions do; a directive pushed out of the
// 21-line window would run it in fork mode, where the guard refuses nothing.
test('the sdd-dispatch-guard claude-env directive is read inside the window', () => {
  const checksSh = join(
    repoRoot(),
    'scenarios',
    'sdd-dispatch-guard',
    'checks.sh',
  );
  expect(parseClaudeEnvDirective(checksSh)).toEqual({
    CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
    CLAUDE_CODE_FORK_SUBAGENT: '0',
  });
});

// The fork copy leaves fork mode on by design, so its directive sets the task
// tools alone.
test('the sdd-dispatch-guard-fork claude-env directive is read inside the window', () => {
  const checksSh = join(
    repoRoot(),
    'scenarios',
    'sdd-dispatch-guard-fork',
    'checks.sh',
  );
  expect(parseClaudeEnvDirective(checksSh)).toEqual({
    CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
  });
});
