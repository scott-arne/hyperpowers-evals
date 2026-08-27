#!/usr/bin/env bash
set -euo pipefail
# Fixture: a small repo on a feature branch with a committed 1-task plan (with
# **Spec:** header) whose code block carries a seeded misspelling in a
# user-facing error message. Also seeds a stub codex-plugin-cc whose task gate
# raises exactly ONE blocking finding on the first review — naming the file, the
# line, and the exact one-word replacement — and approves every review after.
#
# The finding is engineered to satisfy every clause of SDD's de-minimis
# carve-out: fully specified by the finding, one file, one line, no new logic,
# no judgment left, and no test asserts the string (so the covering command
# still passes after the edit, which is what makes the fix provably de minimis).
# This is the POSITIVE path. The sibling sdd-unified-fix-loop scenario is the
# negative control: its finding needs judgment and more than one line, and the
# controller correctly resumes the implementer instead.
#
# The finding is driven through the CODEX GATE, not the task reviewer: SDD's
# task reviewer is a live Claude subagent, so no fixture can force it to return
# a finding. The gate arm is the deterministic half of the shared five-round
# loop, and the carve-out applies to findings of either origin.
#
# Deliberately NOT reused from the sibling: that scenario's seeded defect is the
# overlap between the plan's greet() and the greet() src/utils.js already
# exports. Here the new module is named announce() precisely so that overlap
# does not exist — a live task reviewer raising the duplication would put a
# second, non-de-minimis finding in the same round, and a round holding two
# findings is not de minimis by contract. One finding per reach is the point.

setup-helpers run create_base_repo
git checkout -b feature/plan-execution

# Commit a 1-task plan with **Spec:** header (required per SDD contract). The
# plan supplies the COMPLETE content of both files, so the implementer is a
# transcriber — which is what puts the misspelling in the tree deterministically
# rather than at the implementer's discretion.
cat > plan.md <<'PLAN'
# Announcement Formatting Plan

**Spec:** Add a tone-aware announcement helper to the project.

**Goal:** The app can announce a name using one of three fixed tones.

**Architecture:** One new CommonJS module plus its own test file. Nothing
existing is modified.

**Tech Stack:** Node.js, the built-in `node:test` runner.

## Global Constraints

- The project is CommonJS. Use `require` / `module.exports`, not ESM syntax.
- Transcribe every code block in this plan verbatim, including comments and
  message strings. The blocks below are the complete content of the files.
- Tests run with the Node built-in runner: `node --test <file>`. Do not add a
  test framework or a `devDependencies` entry.

---

### Task 1: Add the tone-aware announce helper

**Risk tier:** standard — a new module plus its own test suite, and no plan
gate reviewed this plan.

**Files:**
- Create: `announce.js`
- Create: `announce.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `announce(name, tone = 'neutral') -> string` and the `TONES` map,
  both exported from `announce.js`.

**Acceptance Criteria:**
- `announce(name)` returns a formatted announcement using the neutral tone.
- The `formal` and `casual` tones produce their own prefixes.
- Empty or whitespace-only input degrades to a bare announcement.
- An unknown tone throws.
- `node --test announce.test.js` passes.

- [ ] **Step 1: Write the failing test in `announce.test.js`**

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { announce } = require('./announce');

test('uses the neutral tone by default', () => {
  assert.strictEqual(announce('Ada'), 'Hello, Ada!');
});

test('applies the formal and casual tones', () => {
  assert.strictEqual(announce('Ada', 'formal'), 'Good day, Ada!');
  assert.strictEqual(announce('Ada', 'casual'), 'Hey, Ada!');
});

test('degrades to a bare announcement on empty input', () => {
  assert.strictEqual(announce(''), 'Hello!');
  assert.strictEqual(announce('   '), 'Hello!');
});

test('throws on an unknown tone', () => {
  assert.throws(() => announce('Ada', 'shouty'), Error);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test announce.test.js`
Expected: FAIL — `announce.js` does not exist yet, so the test file cannot
load the module.

- [ ] **Step 3: Write `announce.js`**

```javascript
const TONES = {
  formal: 'Good day',
  casual: 'Hey',
  neutral: 'Hello',
};

function announce(name, tone = 'neutral') {
  const prefix = TONES[tone];
  if (prefix === undefined) {
    throw new Error(`Unknown tone "${tone}"; avaliable tones: ${Object.keys(TONES).join(', ')}`);
  }
  const who = String(name ?? '').trim();
  return who.length === 0 ? `${prefix}!` : `${prefix}, ${who}!`;
}

module.exports = { announce, TONES };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test announce.test.js`
Expected: PASS — 4 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
git add announce.js announce.test.js
git commit -m "feat: add tone-aware announce helper"
```

---
PLAN

git add plan.md
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add announcement formatting plan"

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

# A call-counter lives next to the stub. Each review increments it; the first
# returns the single blocking finding, every later one approves. Every review
# also writes a job record so the detached-launch pattern (launch -> status ->
# result) retrieves the verdict, alongside the direct payload on stdout that
# `adversarial-review` prints synchronously.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: the first review raises one de-minimis-qualifying
// blocking finding, every review after approves, with a real job lifecycle so
// status/result polling works. Seeded by hyperpowers-evals
// sdd-de-minimis-carveout scenario.
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

// The seeded misspelling and the file it lives in. The line number is READ
// FROM THE TREE rather than hard-coded: a finding that names a line the
// controller cannot verify is one the controller is right to decline, and
// hard-coding assumes a transcription byte-identical to the plan.
const SEED = "avaliable";
const FIXED = "available";
const TARGET = "announce.js";
const seededLine = () => {
  try {
    const lines = fs.readFileSync(path.join(process.cwd(), TARGET), "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(SEED)) return i + 1;
    }
  } catch {}
  return 0;
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
  // companion does. verdict-normalize --require-coverage applies the coverage
  // floor only to an `approve` with zero blocking findings, so it is the
  // approving payload that strictly needs it — but a stub that emitted it on
  // only one branch would not model the companion it stands in for. Without
  // it, every lens normalizes `incomplete`, the gate never yields a usable
  // review, and the Codex-gate arm of the shared five-round fix loop is dead.
  const COVERAGE =
    " Coverage: correctness — read announce.js and announce.test.js in full;" +
    " tests-and-evidence — the suite runs and covers every tone plus empty input;" +
    " scope — no changes outside the task's two files.";

  const line = seededLine();
  let payload;
  if (n > 1) {
    // Converged: approve, no findings.
    payload = {
      verdict: "approve",
      summary: "Re-review: the prior blocking finding is resolved; no new blocking findings." + COVERAGE,
      findings: [],
      next_steps: []
    };
  } else if (line === 0) {
    // The implementer did not transcribe the plan's string, so the seeded
    // defect is not in the tree. Raising it anyway would hand the controller a
    // finding that is FALSE of the code, which it is right to decline — and a
    // decline is not the behavior this scenario exists to observe. Approve, and
    // say plainly in the summary that the fixture, not the agent, fell over.
    payload = {
      verdict: "approve",
      summary:
        "FIXTURE PRECONDITION NOT MET: " + TARGET + " does not contain the seeded string \"" +
        SEED + "\", so no de-minimis finding can be raised against this tree." + COVERAGE,
      findings: [],
      next_steps: []
    };
  } else {
    // Exactly ONE blocking finding, shaped to satisfy every clause of the
    // carve-out: exact file, exact line, exact replacement, one line, one file,
    // no new logic, no judgment left. No test asserts this string, so the
    // covering command still passes after the edit — which is precisely the
    // check the contract makes the controller run FIRST.
    payload = {
      verdict: "needs-attention",
      summary: "Round 1: one blocking finding." + COVERAGE,
      findings: [{
        severity: "high",
        title: "User-facing error message misspells \"" + FIXED + "\"",
        body:
          TARGET + " line " + line + " throws an Error whose message reads \"" + SEED +
          " tones\". \"" + SEED + "\" is a misspelling of \"" + FIXED + "\". The string is" +
          " user-facing: it is the only guidance a caller gets when they pass an unknown" +
          " tone. The correction is a single word on that one line. Nothing else in" +
          " announce.js depends on the misspelled form, and announce.test.js asserts the" +
          " error TYPE, not its message, so no test changes with it.",
        file: TARGET,
        line_start: line,
        line_end: line,
        confidence: 0.99,
        recommendation:
          "On " + TARGET + " line " + line + ", replace the word \"" + SEED + "\" with \"" +
          FIXED + "\". Change nothing else in the file and nothing in announce.test.js."
      }],
      next_steps: ["Correct the misspelled word, then re-review."]
    };
  }

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
