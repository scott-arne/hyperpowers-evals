#!/usr/bin/env bash
# lens-cohort.sh <hyperpowers-root> <since-ISO-8601> [cache-root]
# Walks every codex-review run directory whose mtime is at or after <since>,
# normalizes each round-1 lens capture with verdict-normalize, and prints
# per-lens outcome counts plus the share of each lens's blocking findings
# that another lens in the same batch also raised (title word-Jaccard >= 0.5).
# Read-only. Any failure is fatal: an empty answer must mean an empty cohort.
set -euo pipefail
root="${1:?hyperpowers root}"; since="${2:?ISO-8601}"
base="${3:-${XDG_CACHE_HOME:-$HOME/.cache}/hyperpowers/codex-review}"
[ -d "$base" ] || { echo "lens-cohort: no cache root at $base" >&2; exit 2; }
node - "$root" "$since" "$base" <<'JS'
const fs = require("fs"), path = require("path"), cp = require("child_process");
const [root, since, base] = process.argv.slice(2);
const sinceMs = Date.parse(since);
if (!Number.isFinite(sinceMs)) { console.error("lens-cohort: bad since: " + since); process.exit(2); }
const normalize = root + "/skills/requesting-code-review/scripts/verdict-normalize";
const rows = [];
for (const key of fs.readdirSync(base)) {
  const kd = path.join(base, key);
  if (!fs.statSync(kd).isDirectory()) continue;
  for (const run of fs.readdirSync(kd)) {
    const rd = path.join(kd, run);
    const st = fs.statSync(rd);
    if (!st.isDirectory() || !run.startsWith("run-") || st.mtimeMs < sinceMs) continue;
    for (const f of fs.readdirSync(rd)) {
      const m = /^lens-(.+)-capture$/.exec(f);
      if (!m) continue;
      const cap = path.join(rd, f);
      let res = "incomplete";
      try { res = JSON.parse(cp.execFileSync("bash", [normalize, "--require-coverage", cap], { encoding: "utf8" })).result; } catch (e) { res = "incomplete"; }
      let titles = [];
      // A capture is either the companion's result envelope or the bare review payload (its rawOutput); both carry verdict and findings.
      try { const j = JSON.parse(fs.readFileSync(cap, "utf8")); const r = (j.storedJob && j.storedJob.result && j.storedJob.result.result) || j; titles = (r.findings || []).filter(x => /^(critical|high)$/i.test(String(x.severity))).map(x => String(x.title)); } catch (e) { titles = []; }
      rows.push({ run: rd, lens: m[1], res, titles });
    }
  }
}
if (!rows.length) { console.log("no round-1 lens captures at or after " + since); process.exit(0); }
const byRun = {}; for (const r of rows) (byRun[r.run] = byRun[r.run] || []).push(r);
const canonical = new Set(["correctness", "contracts-and-integration", "tests-and-evidence"]);
const allBatches = Object.entries(byRun).filter(([_, b]) => b.length >= 3);
const batches = [], excluded = [];
for (const [run, b] of allBatches) {
  const lenses = new Set(b.map(r => r.lens));
  if (lenses.size === canonical.size && [...canonical].every(x => lenses.has(x))) batches.push(b);
  else excluded.push({ run, lenses: [...lenses].sort() });
}
const words = t => new Set(String(t).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
const jac = (a, b) => { const A = words(a), B = words(b); const i = [...A].filter(x => B.has(x)).length; const u = new Set([...A, ...B]).size; return u ? i / u : 0; };
const per = {};
for (const b of batches) for (const r of b) {
  const p = per[r.lens] = per[r.lens] || { approved: 0, blocking: 0, incomplete: 0, findings: 0, dup: 0 };
  p[r.res] = (p[r.res] || 0) + 1;
  for (const t of r.titles) { p.findings++; if (b.some(o => o.lens !== r.lens && o.titles.some(u => jac(t, u) >= 0.5))) p.dup++; }
}
console.log("complete round-1 batches: " + batches.length);
if (excluded.length) console.log("excluded batches: " + excluded.length + " — " + excluded.map(e => path.basename(e.run) + ": [" + e.lenses.join(", ") + "]").join("; "));
for (const [lens, p] of Object.entries(per)) {
  const decided = p.approved + p.blocking; const rate = decided ? (100 * p.blocking / decided).toFixed(1) : null; const dup = p.findings ? (100 * p.dup / p.findings).toFixed(1) : null;
  const blockingFlag = decided && p.blocking * 100 >= 60 * decided ? "meets-60%-threshold" : "below-60%-threshold";
  const dupFlag = p.findings && p.dup * 100 >= 80 * p.findings ? "meets-80%-threshold" : "below-80%-threshold";
  console.log(lens + ": approved " + p.approved + ", blocking " + p.blocking + ", incomplete " + p.incomplete + "; blocking rate " + p.blocking + "/" + decided + " = " + (rate === null ? "-" : rate + "%") + " (" + blockingFlag + "); blocking findings " + p.findings + ", duplicated by another lens " + p.dup + "/" + p.findings + " = " + (dup === null ? "-" : dup + "%") + " (" + dupFlag + ")");
}
JS
