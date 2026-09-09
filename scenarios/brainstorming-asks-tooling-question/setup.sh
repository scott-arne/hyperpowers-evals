#!/usr/bin/env bash
set -euo pipefail
# Fixture: a brand-new project. The workdir is a git repository on `main` with
# no commits and no files at all - no linter config, no formatter config, no
# test runner, no package.json, no pyproject.toml. Nothing about tooling has
# been decided, which is the condition the design presentation is supposed to
# notice: linting, formatting and test infrastructure are cheapest to stand up
# before any code exists.
#
# No setup-helper builds this state. `create_base_repo` seeds package.json,
# README.md and two source modules, which would hand the agent a configured
# JavaScript project and answer the question under test.

git init -b main -q .
# A local identity so any git command the agent runs has one; the fixture stays
# empty either way, because the brainstorming architectural path does not commit
# the spec it writes.
git config user.email 'drill@test.local'
git config user.name 'Drill Test'

# Seed stub codex-plugin-cc (always approves, no findings) so the approach and
# spec gates can fire if the agent reaches them. Grown from the stub the
# brainstorming-router scenarios seed, which answers `task-reviewer`, `review`
# and `adversarial-review` but not `task` - the one subcommand both gates on
# this path actually call. Without it the gates got `{}`, which
# verdict-normalize reduces to "incomplete", and every session ran degraded.

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: task-reviewer and Codex gate always APPROVE (no findings).
// Seeded by hyperpowers-evals brainstorming-router scenarios.
//
// `task` is implemented here because the brainstorming architectural path calls
// it twice: the approach gate and the spec gate both run
// `codex-companion.mjs task --fresh --prompt-file <path>`. A stub without it
// fell through to `{}`, which sent every session down the degraded-gate path
// instead of the normal architectural path the scenario means to measure.
// Every invocation is appended to calls.log next to this file, so a check can
// prove which gates actually fired.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const JOBS = path.join(HERE, ".jobs");
const CALL_LOG = path.join(HERE, "calls.log");
let callCounter = 0;
const jobId = (n) => `cxc-stub-${n}`;
const jobFile = (id) => path.join(JOBS, `${id}.json`);

// The prompt arrives as `--prompt-file <path>`, `--prompt-file=<path>`, or as a
// positional argument.
const promptFile = (() => {
  const i = argv.indexOf("--prompt-file");
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith("--prompt-file="));
  return eq ? eq.slice("--prompt-file=".length) : null;
})();
let promptText = "";
if (promptFile) {
  try { promptText = fs.readFileSync(promptFile, "utf8"); } catch {}
}
if (!promptText) {
  promptText = argv.slice(1).filter((a) => !a.startsWith("-") && a !== promptFile).join(" ");
}

// Which canned answer this prompt is asking for. Matched against the prompts
// the skills actually compose, not against the templates in the reference
// files: the approach gate names approach-context.md and pastes the Approaches
// shape, and the spec gate names the design document it wants reviewed.
const classify = (p) => {
  if (sub !== "task") return "n/a";
  if (/approach-context\.md/i.test(p) || /Approaches\s*\(\s*2\s*-\s*3/i.test(p)) return "approaches";
  if (/implementation plan|plan document/i.test(p)) return "plan-review";
  if (/\bspecs?\b|-design\.md|design spec/i.test(p)) return "spec-review";
  return "document-review";
};
const kind = classify(promptText);

const firstLine = String(promptText).split("\n").map((s) => s.trim()).find((s) => s.length > 0) || "";
try {
  fs.appendFileSync(CALL_LOG, `${sub || "(none)"} kind=${kind} first=${firstLine.slice(0, 160)}\n`);
} catch {}

// The approach gate's output shape, from skills/brainstorming/codex-approach-gate.md.
// Deliberately domain-neutral and free of any tooling, linting, formatting or
// test-infrastructure words: this scenario measures whether the agent asks the
// user which tooling to stand up, so the stub must not answer that question.
const APPROACHES = `Approaches (2-3, each genuinely different):
- name: Single-process synchronous pipeline
  how-it-works: One process discovers the work, transforms each record, and commits it on the same call stack, with no queue or worker pool between the stages.
  tradeoffs: Simplest control flow and the easiest failure story to reason about; throughput is bounded by the slowest stage, and a long commit blocks discovery.
  when-it-wins: Volumes are modest and operational simplicity matters more than throughput.
  rough-complexity: trivial
- name: Staged pipeline behind a bounded work queue
  how-it-works: Discovery, transformation and persistence are separate stages joined by a bounded in-process queue, so each stage advances independently and back-pressure is explicit rather than implied.
  tradeoffs: Absorbs bursts and isolates a slow stage from the others; adds concurrency, queue sizing and shutdown ordering that all have to be got right.
  when-it-wins: Arrivals are bursty, or one stage is markedly slower than the rest.
  rough-complexity: moderate
- name: Durable state machine over a persisted work ledger
  how-it-works: Every unit of work is recorded with an explicit state before it is processed, and the processor is a loop that advances records between states, so an interrupted run resumes from the ledger rather than from the beginning.
  tradeoffs: Restart-safe and auditable, and it makes at-most-once handling a property of the ledger rather than of the code path; costs an extra store, a migration path, and more moving parts than the volume may justify.
  when-it-wins: Interrupted runs must resume correctly and reprocessing the same unit twice is unacceptable.
  rough-complexity: high
`;

// The Required document-review output from
// skills/requesting-code-review/gate-output-schema.md, with the Coverage
// section the round-1 lens skeleton adds before Summary. Shaped so
// scripts/verdict-normalize reduces it to "approved" both with and without
// --require-coverage: a terminal `Verdict: approve` line, a `Blocking
// Findings:` header on its own line with no critical/high entries under it,
// a Coverage section with content, and a non-empty Summary.
const DOC_REVIEW = `Verdict: approve

Blocking Findings:
None

Non-blocking Findings:
None

Cannot verify:
None

Coverage:
- documents read: the document named in the prompt, in full
- adjudicated decisions considered: the settled decisions the prompt marked as not for relitigation
- changed surfaces reviewed: not applicable: this is a document review, no code changed
- test evidence inspected: not applicable: this is a document review, no suite was run

Summary: Stub reviewer. The document is internally consistent and complete enough to proceed; no blocking findings.
`;

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

if (sub === "task") {
  const body = kind === "approaches" ? APPROACHES : DOC_REVIEW;
  if (argv.includes("--json")) {
    // Some callers ask for the structured envelope; verdict-normalize reads
    // either that or the raw text below it.
    process.stdout.write(JSON.stringify({
      storedJob: {
        result: {
          result: {
            verdict: "approve",
            summary: "Stub reviewer: no blocking findings. Coverage: documents read - the document named in the prompt; adjudicated decisions considered - as marked in the prompt; changed surfaces reviewed - not applicable; test evidence inspected - not applicable.",
            findings: [],
            next_steps: []
          },
          rawOutput: body
        }
      }
    }));
    process.exit(0);
  }
  process.stdout.write(body);
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
