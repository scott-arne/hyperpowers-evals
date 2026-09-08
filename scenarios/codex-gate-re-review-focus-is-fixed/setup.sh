#!/usr/bin/env bash
set -euo pipefail
# A per-task Codex code gate caught mid-loop: round 1 is spent, its blocking
# findings are recorded in a round ledger and already fixed on the branch, and
# the only thing left is the round-2 re-review. The fixture therefore stages
# everything a round-2 launch needs and nothing it does not: a GATE_DIR holding
# gate-round.json at round 1 plus the ledger, the four task materials the §3
# per-task focus string names, and a committed fix diff.
#
# The stub codex-plugin-cc seeded here does one thing the shared codex-seed
# helper does not: it RECORDS each adversarial-review's focus argument to its
# own file, because the focus string is the thing under measurement. Counting
# words in a transcript regex would measure the transcript's rendering of the
# launch; counting them in the argument the companion actually received measures
# the launch.

setup-helpers run create_base_repo

RUN_DIR="$(dirname "$QUORUM_WORKDIR")"
HOME_DIR="$RUN_DIR/home"

# The checks derive the expected focus shape from the plugin files this run
# used, so a run without a resolvable plugin root is an unusable fixture
# (indeterminate) rather than a behavior failure.
: "${SUPERPOWERS_ROOT:?SUPERPOWERS_ROOT must be set; the checks derive the expected focus from the plugin the run used}"
test -f "$SUPERPOWERS_ROOT/skills/requesting-code-review/gate-fix-loop.md"
test -f "$SUPERPOWERS_ROOT/skills/requesting-code-review/recipe-code.md"

# ---------------------------------------------------------------------------
# The completed task: a small module, then the commit that fixed round 1's
# blocking findings.
# ---------------------------------------------------------------------------
git checkout -b feature/flush-queue

cat > flush.js <<'JS'
export function flushQueue(queue, sink) {
  let retrySentinel = null;
  for (const item of queue) {
    sink(item);
  }
  return queue.length;
}
JS
git add flush.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add flushQueue"

cat > flush.js <<'JS'
export function flushQueue(queue, sink) {
  let delivered = 0;
  for (const item of queue) {
    try {
      sink(item);
    } catch (err) {
      err.flushedBefore = delivered;
      throw err;
    }
    delivered += 1;
  }
  return delivered;
}
JS
git add flush.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Address round-1 review findings"
FIX_SHA="$(git rev-parse --short HEAD)"

# ---------------------------------------------------------------------------
# The four files the §3 per-task focus string names.
# ---------------------------------------------------------------------------
SCRATCH=".cache/hyperpowers/sdd-scratch"
mkdir -p "$SCRATCH/task-1"

cat > "$SCRATCH/task-1/task-brief.md" <<'BRIEF'
## Task 1: Flush the queue and surface sink failures

**Risk tier:** standard — one new module.

**Files:**
- Create: `flush.js`

`flushQueue(queue, sink)` delivers each queued item to `sink` and returns the
number actually delivered. A sink failure must reach the caller with the count
delivered before it, not be swallowed.
BRIEF

cat > "$SCRATCH/task-1/implementer-report.md" <<REPORT
# Task 1 Implementation Report

**Status:** DONE

Created \`flush.js\` with \`flushQueue\`. Round 1 of the Codex gate raised two
blocking findings; both are fixed in commit \`$FIX_SHA\`. The declined finding
is recorded in the round ledger with its reasoning.

**Tests:** none added — the module has no test harness in this fixture.
REPORT

cat > "$SCRATCH/task-1/review-package.md" <<'REVIEW'
# Task 1 Review Package

**Spec compliance:** yes — the delivered count and the rethrow both match the
brief.
**Quality:** approved.

The scoped re-review after the fix commit is clean: the unused local is gone and
the sink failure now reaches the caller carrying the delivered count.

**Verdict:** approved for the per-task code gate's re-review round.
REVIEW

cat > "$SCRATCH/global-constraints.md" <<'CONSTRAINTS'
# Global Constraints

- One problem per change; no unrelated refactors.
- ES modules only; no new third-party dependencies.
- No emojis in code, documentation, or commit messages.
CONSTRAINTS

# ---------------------------------------------------------------------------
# The mid-loop GATE_DIR, in the place the gate's own helper
# (skills/requesting-code-review/scripts/codex-review-dir) would print for this
# HOME: <XDG_CACHE_HOME>/hyperpowers/codex-review/<git-dir hash>/<run dir>. That
# path is not knowable from static story prose, so a stable `active-gate`
# symlink beside it gives the story a name to hand the agent.
# ---------------------------------------------------------------------------
GATE_KEY="$(printf '%s' "$(git rev-parse --absolute-git-dir)" | git hash-object --stdin)"
REVIEW_CACHE="$HOME_DIR/.cache/hyperpowers/codex-review"
GATE_DIR="$REVIEW_CACHE/$GATE_KEY/run-staged"
mkdir -p "$GATE_DIR"
ln -s "$GATE_DIR" "$REVIEW_CACHE/active-gate"

printf '{"round":1,"ceiling":3,"gate":"task"}\n' > "$GATE_DIR/gate-round.json"

cat > "$GATE_DIR/codex-round-ledger.md" <<LEDGER
# Codex round ledger — task 1 per-task code gate

## Round 1

**Resolved**

- *Orphaned retry sentinel left in the flush path* (high) — the unused
  \`retrySentinel\` local was removed and the loop now counts what it actually
  delivered. Fix commit: \`$FIX_SHA\`.
- *Sink failures were swallowed by the delivery loop* (high) — \`flushQueue\`
  now rethrows the sink's error after attaching the delivered count. Fix
  commit: \`$FIX_SHA\`.

**Declined**

- *Queue length should be validated against a configured maximum* (high) —
  declined: admission control belongs to the caller, and a second bound here
  would silently drop work the caller believes was queued.

**Still open**

- None.
LEDGER

# ---------------------------------------------------------------------------
# The stub codex-plugin-cc: a real job lifecycle (adversarial-review ->
# status --json -> status <id> --wait --json -> result <id> --json), an
# always-approving re-review so the loop converges after round 2, and a record
# of every focus argument it was launched with.
# ---------------------------------------------------------------------------
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub of codex-plugin-cc's codex-companion.mjs, seeded by the
// hyperpowers-evals codex-gate-re-review-focus-is-fixed scenario. Real Codex is
// never invoked. Every adversarial-review approves: the round-1 findings are
// already fixed in the fixture, so round 2 converges.
//
// The one thing this stub adds over its siblings: it writes each
// adversarial-review's focus argument to .launches/<n>.txt beside itself. That
// file, not a transcript regex, is what the scenario measures.
//
// The .mjs extension forces ES-module scope, so use import + import.meta, not
// require/__dirname (which are undefined here).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COUNTER = path.join(HERE, ".review-count");
const JOBS = path.join(HERE, ".jobs");
const LAUNCHES = path.join(HERE, ".launches");

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

// The focus is the last positional argument: skip flags, and skip the value
// that follows a value-taking flag, so `--base <sha>` never masquerades as the
// focus no matter where it sits in argv.
const VALUE_FLAGS = new Set(["--base", "--head", "--model", "--effort", "--timeout", "--out"]);
const focusArgument = () => {
  const positionals = [];
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i].startsWith("-")) {
      if (VALUE_FLAGS.has(argv[i])) i += 1;
      continue;
    }
    positionals.push(argv[i]);
  }
  return positionals.length > 0 ? positionals[positionals.length - 1] : "";
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

if (sub === "review" || sub === "adversarial-review") {
  const n = readCount() + 1;
  try { fs.writeFileSync(COUNTER, String(n)); } catch {}
  try {
    fs.mkdirSync(LAUNCHES, { recursive: true });
    fs.writeFileSync(path.join(LAUNCHES, `${n}.txt`), focusArgument());
  } catch {}

  const payload = {
    verdict: "approve",
    summary: "Re-review: the resolved findings are fixed; no new blocking findings. Coverage: documents read — ledger and task materials; adjudicated decisions considered — yes; changed surfaces reviewed — full diff; test evidence inspected — yes.",
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
  // The stub review completes instantly, so nothing is ever "running" — the
  // newest job shows up in latestFinished/recent.
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
    process.stdout.write(JSON.stringify({ job: rec ? rec.job : null, storedJob: null }));
  }
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

# The gate's availability probe reads the companion version from the plugin
# manifest; seed one so the version path is exercised.
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

# ---------------------------------------------------------------------------
# The focus assertion: its expectations are DERIVED from the plugin files this
# run used, so the check cannot drift from the skill text it is judging. It
# lives in the agent's HOME rather than the workdir so the agent under test
# never reads the shape it is being measured against.
# ---------------------------------------------------------------------------
ASSERT_DIR="$HOME_DIR/.focus-assert"
mkdir -p "$ASSERT_DIR"

cat > "$ASSERT_DIR/focus-assert.mjs" <<'ASSERT'
#!/usr/bin/env node
// Assert the shape of the re-review focus argument the gate handed to
// codex-companion.mjs. Every expectation is derived at check time from the
// plugin files the run used — gate-fix-loop.md's round-aware preamble and
// recipe-code.md's per-task focus string — never from a literal pasted here, so
// the check cannot drift from the skill text it is judging.
//
// Usage: node focus-assert.mjs <launched|words|ledger|no-restate|shape>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(fs.readFileSync(path.join(HERE, "manifest.json"), "utf8"));
const mode = process.argv[2];
const WORD_BOUND = 250;

// Markdown emphasis and quoting are typography, not content: the agent may drop
// the backticks around a path or the ** around "blocking". Strip them from both
// sides, then collapse whitespace, so the comparison is about text and order.
const norm = (s) => s.replace(/[`*"'‘’“”]/g, "").replace(/\s+/g, " ").trim();
const countWords = (s) => norm(s).split(" ").filter(Boolean).length;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const anyOf = (list) => `(?:${list.map(escape).join("|")})`;

const pluginFile = (rel) => fs.readFileSync(path.join(M.pluginRoot, rel), "utf8");

// The round-aware preamble is the blockquote in gate-fix-loop.md that opens
// "This is re-review round N."; take the whole consecutive quoted block.
function preambleTemplate() {
  const lines = pluginFile("skills/requesting-code-review/gate-fix-loop.md").split("\n");
  const start = lines.findIndex((l) => /^> This is re-review round N\./.test(l));
  if (start < 0) throw new Error("gate-fix-loop.md: round-aware preamble not found");
  const block = [];
  for (let i = start; i < lines.length && lines[i].startsWith(">"); i += 1) {
    block.push(lines[i].replace(/^>\s?/, ""));
  }
  return norm(block.join(" "));
}

// The per-task focus string is the quoted --json argument on recipe-code.md's
// per-task adversarial-review line.
function recipeFocusTemplate() {
  const line = pluginFile("skills/requesting-code-review/recipe-code.md")
    .split("\n")
    .find((l) => l.includes('--json "Task-scoped review.'));
  if (!line) throw new Error("recipe-code.md: per-task focus string not found");
  const open = line.indexOf('--json "') + '--json "'.length;
  return norm(line.slice(open, line.lastIndexOf('"')));
}

// A placeholder may be filled with any spelling of the path the fixture offers
// (absolute, workdir-relative, ~-abbreviated), so expect an alternation.
function expectedPreamble(round) {
  return escape(preambleTemplate())
    .replace("round N", () => `round ${round}`)
    .replace("<LEDGER_PATH>", () => anyOf(M.ledgerPaths));
}

function expectedRecipeFocus() {
  let pattern = escape(recipeFocusTemplate());
  for (const [placeholder, spellings] of Object.entries(M.recipePaths)) {
    pattern = pattern.replace(placeholder, () => anyOf(spellings));
  }
  return pattern;
}

function launches() {
  if (!fs.existsSync(M.launchDir)) return [];
  return fs
    .readdirSync(M.launchDir)
    .filter((f) => /^\d+\.txt$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((f) => ({ name: f, text: fs.readFileSync(path.join(M.launchDir, f), "utf8") }));
}

const recorded = launches();
if (recorded.length === 0) {
  console.log("no adversarial-review launch was recorded by the stub companion");
  process.exit(1);
}

const failures = [];
const report = [];

for (const [i, launch] of recorded.entries()) {
  // The first recorded launch is round 2; a further launch would be the round
  // after it.
  const round = 2 + i;
  const text = norm(launch.text);

  if (mode === "words") {
    const n = countWords(launch.text);
    report.push(`${launch.name}: ${n} words`);
    if (n >= WORD_BOUND) failures.push(`${launch.name}: ${n} words, bound is under ${WORD_BOUND}`);
  } else if (mode === "ledger") {
    if (!M.ledgerPaths.some((p) => text.includes(p))) {
      failures.push(`${launch.name}: no ledger path; expected one of ${M.ledgerPaths.join(" | ")}`);
    }
  } else if (mode === "no-restate") {
    if (text.toLowerCase().includes(M.plantedPhrase.toLowerCase())) {
      failures.push(`${launch.name}: restates the ledger's finding "${M.plantedPhrase}"`);
    }
  } else if (mode === "shape") {
    const shape = new RegExp(`^(${expectedPreamble(round)})\\s*(.{0,240}?)\\s*(${expectedRecipeFocus()})$`, "s");
    const match = shape.exec(text);
    if (!match) {
      failures.push(`${launch.name}: not [round-${round} preamble][ledger path][recipe focus] with nothing else; got ${countWords(launch.text)} words starting "${text.slice(0, 120)}"`);
      continue;
    }
    const middle = match[2].trim();
    const ledger = M.ledgerPaths.find((p) => middle.includes(p));
    if (!ledger) {
      failures.push(`${launch.name}: the part between the preamble and the recipe focus is not the ledger path; got "${middle}"`);
      continue;
    }
    const around = middle.split(ledger).join(" ").replace(/[.:,;()[\]-]/g, " ").trim();
    const extra = around.split(/\s+/).filter(Boolean);
    if (extra.length > 4) {
      failures.push(`${launch.name}: ${extra.length} words around the ledger path, at most 4 allowed: ${extra.join(" ")}`);
    }
  } else if (mode !== "launched") {
    console.log(`unknown mode: ${mode}`);
    process.exit(2);
  }
}

if (failures.length > 0) {
  console.log(failures.join("\n"));
  process.exit(1);
}
console.log([`${mode}: ok across ${recorded.length} launch(es)`, ...report].join("\n"));
ASSERT

# The manifest carries what the assertion cannot derive: where the run put
# things, and which noun phrase the ledger planted.
WORKDIR_ABS="$QUORUM_WORKDIR"
LEDGER_REAL="$GATE_DIR/codex-round-ledger.md"
LEDGER_LINK="$REVIEW_CACHE/active-gate/codex-round-ledger.md"
node -e '
const fs = require("fs");
const [out, pluginRoot, launchDir, workdir, home, ledgerReal, ledgerLink] = process.argv.slice(1);
const scratch = ".cache/hyperpowers/sdd-scratch";
// Every spelling of a fixture path the agent might reasonably write into the
// focus string: absolute, workdir-relative, and ./-prefixed.
const spellings = (rel) => [`${workdir}/${rel}`, rel, `./${rel}`];
fs.writeFileSync(out, JSON.stringify({
  pluginRoot,
  launchDir,
  plantedPhrase: "orphaned retry sentinel",
  ledgerPaths: [ledgerReal, ledgerLink, ledgerLink.replace(home, "~")],
  recipePaths: {
    "<TASK_BRIEF_PATH>": spellings(`${scratch}/task-1/task-brief.md`),
    "<IMPLEMENTER_REPORT_PATH>": spellings(`${scratch}/task-1/implementer-report.md`),
    "<REVIEW_PACKAGE_PATH>": spellings(`${scratch}/task-1/review-package.md`),
    "<GLOBAL_CONSTRAINTS_PATH>": spellings(`${scratch}/global-constraints.md`),
  },
}, null, 2) + "\n");
' "$ASSERT_DIR/manifest.json" "$SUPERPOWERS_ROOT" "$SCRIPTS_DIR/.launches" "$WORKDIR_ABS" "$HOME_DIR" "$LEDGER_REAL" "$LEDGER_LINK"
