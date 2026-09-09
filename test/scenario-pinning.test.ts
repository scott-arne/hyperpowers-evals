import { expect, test } from 'bun:test';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseCodingAgentsDirective } from '../src/checks/index.ts';
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
// nothing and score it as a failure. `tdd-runs-the-project-suite` is pinned for
// a different reason: it is fork-side evidence for one upstream port, and its
// arms are only comparable across the three actors that were measured.
const INTENTIONAL_PINNED_SCENARIOS = new Set<string>([
  'brainstorming-bounded-fires-approach-gate',
  'brainstorming-bounded-fires-visual-companion',
  'brainstorming-router-escalates-b1-userid-param',
  'brainstorming-router-escalates-b2-config-module',
  'brainstorming-router-escalates-b3-logging',
  'brainstorming-router-escalates-b4-reusable-validation',
  'brainstorming-router-escalates-b5-prefs-storage',
  'brainstorming-router-no-downgrade',
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
  'sdd-de-minimis-carveout',
  'sdd-plan-scoped-scratch',
  'sdd-spec-context-consumed',
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
