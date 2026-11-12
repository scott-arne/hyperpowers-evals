#!/usr/bin/env bash
set -euo pipefail
# Fixture: eight long note files and a 100000-token compaction window, built
# to measure what a session that follows no skill reads after an automatic
# compaction. The files are generated from a fixed seed so every run sees the
# same text: about 32,000 characters each in lines under 100 characters (the
# Read tool cuts lines over 2,000), roughly 7,000 tokens apiece, which with
# the session's fixed context carries it past the threshold (about 33K tokens
# below the window) before the last file is read. One file holds a unique
# passage so the answer can be graded; the per-file summaries make reading
# every file necessary, which a search for the passage alone would not.

setup-helpers run create_base_repo
mkdir -p .claude notes
cat > .claude/settings.json <<'JSON'
{
  "autoCompactWindow": 100000
}
JSON

node - <<'NODE'
const fs = require("fs");
const themes = ["harbor", "quarry", "glacier", "market", "railway", "lighthouse", "vineyard", "orchard"];
const words = ("the a an of to in on at by for with from over under after before while and but or so " +
  "keeper crew tide wind stone path road field river hill boat rope lamp ledger bell door window wall " +
  "morning evening night week season year storm rain fog frost sun shadow light water salt iron wood " +
  "walked carried counted mended watched opened closed wrote waited climbed crossed gathered noticed " +
  "slow quiet heavy narrow broad cold warm grey bright distant early late old new long short").split(" ");
let seed = 20261111;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (list) => list[Math.floor(rand() * list.length)];
const sentence = (theme) => {
  const n = 8 + Math.floor(rand() * 11);
  const out = [];
  for (let i = 0; i < n; i++) out.push(i === Math.floor(n / 2) ? theme : pick(words));
  const s = out.join(" ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
};
const wrap = (text) => {
  const lines = [];
  let line = "";
  for (const w of text.split(" ")) {
    if (line && line.length + 1 + w.length > 96) { lines.push(line); line = w; }
    else line = line ? line + " " + w : w;
  }
  if (line) lines.push(line);
  return lines.join("\n");
};
themes.forEach((theme, idx) => {
  const paragraphs = [];
  let size = 0;
  while (size < 32000) {
    const sentences = [];
    const k = 4 + Math.floor(rand() * 4);
    for (let j = 0; j < k; j++) sentences.push(sentence(theme));
    const p = wrap(sentences.join(" "));
    paragraphs.push(p);
    size += p.length + 2;
  }
  if (theme === "lighthouse") {
    paragraphs.splice(Math.floor(paragraphs.length / 2), 0,
      "On the third night the keeper wrote that a lamp was relit by someone he never saw.");
  }
  const name = `notes/${String(idx + 1).padStart(2, "0")}-${theme}.txt`;
  fs.writeFileSync(name, `Field notes: ${theme}\n\n` + paragraphs.join("\n\n") + "\n");
});
NODE

git add .claude/settings.json notes
git commit -m "Add field notes fixture"
