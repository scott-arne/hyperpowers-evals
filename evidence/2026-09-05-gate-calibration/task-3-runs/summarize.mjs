import fs from "node:fs";
import path from "node:path";
const out = process.argv[2];
const dir = path.join(out, "launches");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d+\.txt$/.test(f)).sort() : [];
if (files.length === 0) console.log("launches: none recorded");
for (const f of files) {
  const t = fs.readFileSync(path.join(dir, f), "utf8").replace(/[`*"'‘’“”]/g, "").replace(/\s+/g, " ").trim();
  console.log(`${f}: ${t.split(" ").filter(Boolean).length} words`);
}
const vp = path.join(out, "verdict.json");
if (!fs.existsSync(vp)) { console.log("verdict: (missing)"); process.exit(0); }
const v = JSON.parse(fs.readFileSync(vp, "utf8"));
console.log(`verdict: ${v.final}${v.final_reason ? ` (${v.final_reason})` : ""}`);
for (const c of (v.checks ?? []).filter((c) => c.phase === "post")) {
  console.log(`  ${c.passed ? "PASS" : "FAIL"} ${c.check} ${(c.detail ?? "").slice(0, 200).replace(/\n/g, " ")}`);
}
