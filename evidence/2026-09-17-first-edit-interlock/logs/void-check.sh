#!/usr/bin/env bash
# void-check.sh <run-dir>
# Prints one `harness void: <why> in <run-dir>` line for every reason the run
# cannot count as a trial: no readable verdict.json; no grader block; a grader
# block without a summary or run id; a grader that exited without a result
# (its reason or summary says so); a verdict without a final outcome; no usable
# coding-agent-token-usage.json (one with an integer total_tokens). Prints nothing for a run the analysis can
# grade. logs/measure-launch.sh runs it for every run directory quorum names,
# so a void attempt is on the face of its log and the analysis accepts that log
# in the logs/failed ledger; the plan's offline proof runs it on synthetic run
# directories. Exit 0 when the run can be graded, 3 when it cannot, 2 on a
# usage error.
set -uo pipefail
if [ $# -ne 1 ] || [ ! -d "$1" ]; then echo "usage: void-check.sh <run-dir>" >&2; exit 2; fi
node -e '
const fs = require("fs");
const dir = process.argv[1];
const reasons = [];
const read = (name) => {
  try { return JSON.parse(fs.readFileSync(dir + "/" + name, "utf8")); } catch (e) { return undefined; }
};
const verdict = read("verdict.json");
if (verdict === undefined || verdict === null || typeof verdict !== "object") {
  reasons.push("no readable verdict.json");
} else {
  if (!["pass", "fail", "indeterminate"].includes(verdict.final)) reasons.push("verdict without a final outcome");
  const grader = verdict.gauntlet;
  if (!grader || typeof grader !== "object") {
    reasons.push("no grader block");
  } else if (!(typeof grader.summary === "string" && grader.summary.trim()) && !grader.run_id) {
    reasons.push("grader block without a summary or run id");
  }
  const text = String(verdict.final_reason || "") + " " + String((grader && grader.summary) || "");
  if (/quorum error|without writing a result|no Gauntlet-Agent verdict/.test(text)) {
    reasons.push("grader exited without a result");
  }
}
const usage = read("coding-agent-token-usage.json");
if (usage === undefined || usage === null || typeof usage !== "object" || !Number.isInteger(usage.total_tokens) || usage.total_tokens < 0) {
  reasons.push("no usable coding-agent-token-usage.json");
}
for (const why of reasons) console.log("harness void: " + why + " in " + dir);
process.exit(reasons.length ? 3 : 0);
' "$1"
