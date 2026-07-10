#!/usr/bin/env bash
set -euo pipefail
# Fixture: a base repo with a spec containing a defensibly wrong algorithm
# (nested O(n²) scan over millions of rows), plus a stub codex-companion that
# returns approve + one alternative-suggested in round 1, and plain approve
# on round 2+. Every `task` call copies the received --prompt-file to
# codex-stub-calls/call-<N>.md (deterministic artifact). This forces the
# accepted-alternative path so the spec's round-2 coverage is exercised
# unconditionally.
setup-helpers run create_base_repo

# Write a spec with a defensibly wrong algorithm choice for its stated scale.
cat > "$QUORUM_WORKDIR/spec.md" <<'SPEC'
# Compliance Activity Log Reporting

Build a system that processes user activity logs for compliance reporting.

## Requirements

- Input: Activity log records (millions per day), each with fields: timestamp, user_id, action, resource, metadata.
- Query pattern: "Find all activity records for a given user_id X" — frequent queries over cold historical data.
- Output: All matching records for the requested user, sorted by timestamp.
- Scale: Millions of records per day, queries run on-demand for compliance audits.

## Proposed Algorithm

Use a nested loop scan: for each query, iterate through all unsorted log files, and within each file iterate through all records to find matches for the requested user_id. Collect matches in a list, then sort by timestamp before returning.

## Tasks

1. Implement log ingestion: write incoming records to daily log files (one file per day, append-only).
2. Implement query handler: given a user_id, scan all log files and return matching records sorted by timestamp.
3. Add error handling and logging.
SPEC

HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
PLUGINS_DIR="$HOME_DIR/.claude/plugins"
INSTALL_PATH="$PLUGINS_DIR/cache/openai-codex/codex/stub"
SCRIPTS_DIR="$INSTALL_PATH/scripts"
mkdir -p "$SCRIPTS_DIR"

# The stub's artifact contract: every task call writes the received --prompt-file
# to $QUORUM_WORKDIR/codex-stub-calls/call-<N>.md before responding. Round 1
# returns approve + one alternative-suggested (hash-indexed lookup); round 2+
# returns plain approve with no findings.
cat > "$SCRIPTS_DIR/codex-companion.mjs" <<'STUB'
#!/usr/bin/env node
// Deterministic stub: returns approve + one alternative-suggested in round 1,
// plain approve on round 2+. Copies every received --prompt-file to
// codex-stub-calls/call-<N>.md (artifact contract). Seeded by hyperpowers-evals
// codex-plan-gate-algorithm-locked-after-round1 scenario. Real Codex never invoked.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const argv = process.argv.slice(2);
const sub = argv[0];
const HERE = path.dirname(fileURLToPath(import.meta.url));
const COUNTER = path.join(HERE, ".task-count");
const readCount = () => {
  try { return parseInt(fs.readFileSync(COUNTER, "utf8").trim(), 10) || 0; }
  catch { return 0; }
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

if (sub === "task") {
  const n = readCount() + 1;
  try { fs.writeFileSync(COUNTER, String(n)); } catch {}

  // Artifact contract: copy the --prompt-file to codex-stub-calls/call-<N>.md
  // before responding, so checks can assert round-2 prompt content.
  const promptIdx = argv.indexOf("--prompt-file");
  if (promptIdx >= 0 && argv[promptIdx + 1]) {
    const promptPath = argv[promptIdx + 1];
    try {
      const content = fs.readFileSync(promptPath, "utf8");
      const stubCallsDir = path.join(process.env.QUORUM_WORKDIR || ".", "codex-stub-calls");
      fs.mkdirSync(stubCallsDir, { recursive: true });
      fs.writeFileSync(path.join(stubCallsDir, `call-${n}.md`), content);
    } catch {}
  }

  let response;
  if (n === 1) {
    // Round 1: approve + one alternative-suggested (clearly correct for the scale).
    response = `Verdict: approve

Blocking Findings:
None

Non-blocking Findings:
None

Cannot verify:
None

Algorithm Assessment (round 1 only):
- choice: Nested loop scan over unsorted log files
  verdict: alternative-suggested
  alternative: Hash-indexed lookup table (user_id -> record offsets)
  justification: The planned nested scan is O(n) per query over millions of records. For frequent queries over cold data, build a hash index at ingestion time mapping user_id to record offsets (or a secondary index file). This reduces lookup to O(1) + seek time, appropriate for the stated query frequency and scale. The nested scan works but will not scale past moderate volumes.

Summary: Plan is feasible and covers the requirements. One algorithm alternative suggested for scalability.
`;
  } else {
    // Round 2+: plain approve, no findings, no Algorithm Assessment.
    response = `Verdict: approve

Blocking Findings:
None

Non-blocking Findings:
None

Cannot verify:
None

Summary: Re-review complete. The revised plan addresses the prior alternative. No new blocking findings.
`;
  }

  process.stdout.write(response);
  process.exit(0);
}

// Unknown subcommand: empty object, exit 0.
process.stdout.write("{}");
process.exit(0);
STUB
chmod +x "$SCRIPTS_DIR/codex-companion.mjs"

# Seed plugin manifest so version probe works.
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
