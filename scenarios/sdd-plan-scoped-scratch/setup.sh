#!/usr/bin/env bash
set -euo pipefail
# Fixture: a repo where plan A ran to completion earlier (pre-seeded COMPLETED
# ledger and workspace under plan A's slug dir, built via the candidate SDD's
# real `scripts/sdd-dir` from the worktree). The agent is asked to execute plan
# B. Exercises the plan-scoped scratch contract: plan B never reads plan A's
# ledger, plan B's workspace slug is distinct from plan A's, and on clean finish
# plan B's workspace is deleted while plan A's workspace remains.

setup-helpers run create_base_repo
git checkout -b feature/multi-plan

# Commit plan A: a small 1-task plan already completed (the fixture backstory).
mkdir -p docs/superpowers/plans
cat > docs/superpowers/plans/planA.md <<'PLANA'
# Plan A — Hello Module

**Spec:** Add a basic greeting module (already completed in a prior SDD run).

**Goal:** Implement a simple hello function.

---

## Task 1: Hello function

**Files:**
- Create: `src/hello.js`

**Acceptance Criteria:**
- hello(name) returns "Hello, <name>!"

- [ ] **Step 1: Implement hello in src/hello.js**
PLANA
git add docs
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add planA (completed earlier)"

# Commit plan B: a trivial 1-task plan the agent will execute (simple enough to
# ensure clean final review; this scenario tests plan scoping, not fix loops).
cat > docs/superpowers/plans/planB.md <<'PLANB'
# Plan B — Greeting Constant

**Spec:** Add a simple greeting constant.

**Goal:** Implement a trivial constant with a test.

---

## Task 1: Add greeting constant

**Files:**
- Create: `src/constants.js`
- Create: `tests/constants.test.js`

**Acceptance Criteria:**
- constants.js exports `GREETING_PREFIX = "Hello"`.
- Test verifies the constant value.

- [ ] **Step 1: Create src/constants.js with exactly: `export const GREETING_PREFIX = "Hello";`**
- [ ] **Step 2: Create tests/constants.test.js with exactly:**
```javascript
import { GREETING_PREFIX } from '../src/constants.js';
if (GREETING_PREFIX !== "Hello") throw new Error("Test failed");
console.log("Test passed");
```
- [ ] **Step 3: Run the test with: `node tests/constants.test.js`**
PLANB
git add docs
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add planB for execution"

# Pre-seed plan A's COMPLETED workspace using the candidate SDD's sdd-dir.
# The candidate skill root is at $QUORUM_SUPERPOWERS_ROOT (the worktree under
# test). We call its scripts/sdd-dir with planA.md to get plan A's workspace
# path, then populate it with a completed ledger and fake artifacts. This seeds
# the forensics trap: if plan B's SDD controller opens plan A's ledger, that is
# a cross-plan contamination failure.

CANDIDATE_SKILLS="${QUORUM_SUPERPOWERS_ROOT:-${SUPERPOWERS_ROOT:?SUPERPOWERS_ROOT not set}}/skills/subagent-driven-development"
SDD_DIR_SCRIPT="$CANDIDATE_SKILLS/scripts/sdd-dir"

if [ ! -x "$SDD_DIR_SCRIPT" ]; then
  echo "sdd-dir script not found at $SDD_DIR_SCRIPT" >&2
  exit 1
fi

# Get plan A's workspace dir (the candidate's scoped path for planA.md).
# Pin the run's throwaway HOME so the workspace lands under the harness home,
# not the operator's real home (same derivation sdd-unified-fix-loop uses).
HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
cd "$QUORUM_WORKDIR"
PLANA_WORKSPACE=$(HOME="$HOME_DIR" XDG_CACHE_HOME="$HOME_DIR/.cache" "$SDD_DIR_SCRIPT" docs/superpowers/plans/planA.md)

# Create plan A's ledger with COMPLETED status.
mkdir -p "$PLANA_WORKSPACE"
cat > "$PLANA_WORKSPACE/progress.md" <<'LEDGER'
# SDD ledger — plan: docs/superpowers/plans/planA.md

## Task 1: Hello function

**Status:** DONE

**Implementation:** Task completed successfully.

**Review:** Approved by task-reviewer; no blocking findings.

**Codex gate:** PASSED

**Committed:** yes

---

## Final Review

**Status:** APPROVED

**Codex gate:** PASSED

All tasks complete. Plan A finished successfully.
LEDGER

# Seed a fake task-1 brief and review package so the workspace looks realistic.
cat > "$PLANA_WORKSPACE/task-1-brief.md" <<'BRIEF'
# Task 1: Hello function

Implement hello(name) in src/hello.js.
BRIEF

cat > "$PLANA_WORKSPACE/review-task-1.md" <<'REVIEW'
# Task 1 Review

Verdict: APPROVE

No blocking findings.
REVIEW

# Seed stub codex-plugin-cc (same stub as sdd-unified-fix-loop: converges after
# round 1). This stub is simpler: always approves immediately (no seeded
# findings for plan B, just to test workspace isolation, not fix convergence).

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: task-reviewer and Codex gate always APPROVE (no findings).
// This is a simpler stub than sdd-unified-fix-loop's converging one; it
// exercises workspace isolation, not fix-loop behavior.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const JOBS = path.join(HERE, ".jobs");
let callCounter = 0;
const jobId = (n) => `cxc-stub-${n}`;
const jobFile = (id) => path.join(JOBS, `${id}.json`);

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
  callCounter += 1;
  const payload = {
    verdict: "approve",
    summary: "Stub: always approve, no findings.",
    findings: [],
    next_steps: []
  };

  const job = { id: jobId(callCounter), jobClass: "review", status: "completed" };
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
    const recPath = jobFile(positional);
    let rec = null;
    try { rec = JSON.parse(fs.readFileSync(recPath, "utf8")); } catch {}
    process.stdout.write(JSON.stringify({
      job: rec ? rec.job : { id: positional, jobClass: "review", status: "unknown" }
    }));
    process.exit(0);
  }
  process.stdout.write(JSON.stringify({
    running: [],
    latestFinished: null,
    recent: []
  }));
  process.exit(0);
}

if (sub === "result") {
  const positional = argv.slice(1).find((a) => !a.startsWith("-"));
  if (positional) {
    const recPath = jobFile(positional);
    let rec = null;
    try { rec = JSON.parse(fs.readFileSync(recPath, "utf8")); } catch {}
    if (rec && rec.job.status === "completed") {
      process.stdout.write(JSON.stringify(rec));
      process.exit(0);
    }
  }
  process.stdout.write(JSON.stringify({ job: null, storedJob: null }));
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

# Seed the plugin manifest so version probe works.
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
