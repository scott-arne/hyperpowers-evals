#!/usr/bin/env bash
set -euo pipefail
# Fixture: a simple utility module (format.js) on a feature branch. The agent
# receives a CLEARLY bounded brief (add truncate option with two genuine
# algorithmic alternatives). Exercises the brainstorming bounded path: presents
# alternatives in chat, gets approval, implements — WITHOUT escalating to the
# architectural path (no spec file should be created). The approach gate fires
# (alternatives presented, approval requested) but the ceremony stays lightweight.

setup-helpers run create_base_repo
git checkout -b feature/add-truncate

# Commit a minimal utility module fixture (format.js) so the bounded task brief
# has something to extend.
cat > format.js <<'JS'
// Simple string formatting utility
export function format(str, options = {}) {
  let result = str;

  if (options.uppercase) {
    result = result.toUpperCase();
  }

  if (options.lowercase) {
    result = result.toLowerCase();
  }

  if (options.prefix) {
    result = options.prefix + result;
  }

  if (options.suffix) {
    result = result + options.suffix;
  }

  return result;
}
JS

cat > format.test.js <<'JS'
import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

console.log("All tests passed");
JS

git add format.js format.test.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add simple format utility"

# Seed stub codex-plugin-cc (always approves, no findings) so the approach gate
# can fire if the agent reaches it. Same stub pattern as the other
# brainstorming-router scenarios.

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: task-reviewer and Codex gate always APPROVE (no findings).
// `task` (the approach and spec gates) answers as the
// brainstorming-asks-tooling-question stub does, and every call other than
// `setup` is appended to calls.log next to this file.
// Seeded by hyperpowers-evals brainstorming-router scenarios.
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

const CALL_LOG = path.join(HERE, "calls.log");

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
// The body matches the brainstorming-asks-tooling-question stub's, and
// test/scenario-codex-stub-task.test.ts keeps the two outputs identical. It is
// domain-neutral on purpose: this scenario needs a well-formed gate answer,
// not one about its own domain, so a session may discard these approaches.
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
