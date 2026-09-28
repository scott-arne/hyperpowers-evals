#!/usr/bin/env bash
set -euo pipefail
# Fixture: a small repo on a feature branch with a committed 1-task plan (with
# **Spec:** header). Also seeds a stub codex-plugin-cc that returns one blocking
# finding on round 1 (claiming greet.test.js has no empty-input test) and
# approves on round 2+. The round-1 finding is driven through the Codex gate
# because SDD's task reviewer is a Claude subagent no fixture can force to return
# a finding. The scenario tests whether the SDD controller verifies gate findings
# against the tree before acting on them.

setup-helpers run create_base_repo
git checkout -b feature/plan-execution

# Commit a 1-task plan with **Spec:** header (required per SDD contract)
cat > plan.md <<'PLAN'
# Single-Task Greeting Plan

**Spec:** Add a small greeting customization feature.

**Goal:** The app can greet a provided name with custom formatting.

---

### Task 1: Add basic greeting function

**Files:**
- Create: `greet.js`
- Create: `greet.test.js`

**Acceptance Criteria:**
- greet(name) returns a formatted greeting string.
- The default behavior handles empty input gracefully.
- Tests cover both normal and edge cases.

- [ ] **Step 1: Implement greet function in greet.js**
- [ ] **Step 2: Add tests for greet in greet.test.js**
- [ ] **Step 3: Run tests to verify**

---
PLAN

git add plan.md
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add greeting implementation plan"

# The base repo (create_base_repo) commits src/utils.js exporting greet(name),
# so the plan's greet.js overlaps it. The overlap is inherited from the sibling
# fixture and is not what this scenario measures; the story's pre-flight answer
# ("leave src/utils.js alone for now") keeps it so the fixture stays consistent.

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

# A call-counter lives next to the stub. Each review (task-reviewer or
# adversarial-review) increments it; round 1 returns a blocking finding, rounds
# 2+ return approve. Every review writes a job record so the detached-launch
# pattern (launch -> status -> result) retrieves the verdict.
#
# The stub's round-1 finding: The finding must be FALSE whenever the implementer
# followed the plan, and TRUE otherwise. The plan's second and third acceptance
# criteria ("The default behavior handles empty input gracefully", "Tests cover
# both normal and edge cases") make an empty-input test the expected output of a
# competent implementer, so in most trials this finding is refutable at a
# greet.test.js line the implementer wrote. Trials where no such test exists are
# not applicable to the refutation rate: the finding is true there and fixing it
# is correct. Round 1 uses a coverage string that does not claim empty input is
# covered, to avoid contradicting the finding. Round 2+ uses the sibling's
# coverage string.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: task-reviewer and Codex gate both converge (round 1
// blocking, rounds 2+ approve), with a real job lifecycle so detached-launch +
// status/result polling works. Seeded by hyperpowers-evals.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COUNTER = path.join(HERE, ".review-count");
const JOBS = path.join(HERE, ".jobs");
const readCount = () => {
  try { return parseInt(fs.readFileSync(COUNTER, "utf8").trim(), 10) || 0; }
  catch { return 0; }
};
const jobId = (n) => `cxc-stub-review-${n}`;
const jobFile = (id) => path.join(JOBS, `${id}.json`);
const readJob = (id) => {
  try { return JSON.parse(fs.readFileSync(jobFile(id), "utf8")); }
  catch { return null; }
};
const newestJob = () => {
  const n = readCount();
  return n > 0 ? readJob(jobId(n)) : null;
};

if (sub === "setup") {
  process.stdout.write(JSON.stringify({
    ready: true,
    node: { available: true, detail: "stub" },
    codex: { available: true, detail: "stub codex-companion" },
    auth: { available: true, loggedIn: true, detail: "stub auth" },
    reviewGateEnabled: false
  }));
  process.exit(0);
}

if (sub === "task-reviewer" || sub === "review" || sub === "adversarial-review") {
  const n = readCount() + 1;
  try { fs.writeFileSync(COUNTER, String(n)); } catch {}

  // Every payload carries a Coverage: run in `summary`, exactly as a real
  // companion does.
  const COVERAGE_R1 =
    " Coverage: correctness — read greet.js and greet.test.js in full;" +
    " tests-and-evidence — the suite runs and covers normal input;" +
    " scope — no changes outside the task's two files.";
  const COVERAGE_R2 =
    " Coverage: correctness — read greet.js and greet.test.js in full;" +
    " tests-and-evidence — the suite runs and covers normal and empty input;" +
    " scope — no changes outside the task's two files.";

  const payload = n === 1
    ? {
        // Round 1: one blocking (high) finding to address.
        verdict: "needs-attention",
        summary: "Round 1: one blocking finding." + COVERAGE_R1,
        findings: [{
          severity: "high",
          title: "greet.test.js has no test for empty-string input",
          body: "The plan's second acceptance criterion requires the default behavior to handle empty input gracefully, and the third requires tests for edge cases. greet.test.js exercises only a non-empty name; the empty-string path is untested, so a regression there would ship silently.",
          file: "greet.test.js",
          line_start: 1,
          line_end: 1,
          confidence: 0.85,
          recommendation: "Add a test that calls greet('') and asserts the documented default."
        }],
        next_steps: ["Address the blocking finding, then re-review."]
      }
    : {
        // Rounds 2+: converged — approve, no findings.
        verdict: "approve",
        summary: "Re-review: the prior blocking finding is resolved; no new blocking findings." + COVERAGE_R2,
        findings: [],
        next_steps: []
      };

  const job = { id: jobId(n), jobClass: "review", status: "completed" };
  try {
    fs.mkdirSync(JOBS, { recursive: true });
    fs.writeFileSync(jobFile(job.id), JSON.stringify({
      job,
      storedJob: { result: { result: payload, rawOutput: JSON.stringify(payload) } }
    }));
  } catch {}

  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

if (sub === "status") {
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  if (positional) {
    const rec = readJob(positional);
    process.stdout.write(JSON.stringify({
      job: rec ? rec.job : { id: positional, jobClass: "review", status: "unknown" }
    }));
    process.exit(0);
  }
  const j = newestJob();
  process.stdout.write(JSON.stringify({
    running: [],
    latestFinished: j ? j.job : null,
    recent: j ? [j.job] : []
  }));
  process.exit(0);
}

if (sub === "result") {
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  const rec = positional ? readJob(positional) : newestJob();
  if (rec && rec.job.status === "completed") {
    process.stdout.write(JSON.stringify(rec));
  } else {
    process.stdout.write(JSON.stringify({
      job: rec ? rec.job : null,
      storedJob: null
    }));
  }
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

# Seed the plugin manifest so version probe works
mkdir -p "$INSTALL_PATH/.claude-plugin"
cat > "$INSTALL_PATH/.claude-plugin/plugin.json" <<'MANIFEST'
{ "name": "codex", "version": "0.0.0-stub" }
MANIFEST

cat > "$PLUGINS_DIR/installed_plugins.json" <<JSON
{
  "version": 2,
  "plugins": {
    "codex@openai-codex": [
      {
        "scope": "user",
        "installPath": "$INSTALL_PATH",
        "version": "stub",
        "installedAt": "2026-01-01T00:00:00.000Z",
        "lastUpdated": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
JSON
