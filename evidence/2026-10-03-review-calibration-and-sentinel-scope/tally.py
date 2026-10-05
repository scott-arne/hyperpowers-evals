"""Tally the normalized verdict of every focus-arm capture, per run directory and fixture.

Refuses to run unless the normalizer is the blob the reference runtime record
names, so every reading comes from the script the reviews were recorded under.

Usage: tally.py <hyperpowers-root> <evidence-dir>
"""
import collections
import json
import pathlib
import subprocess
import sys

hp, evidence = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
normalize = hp / "skills/requesting-code-review/scripts/verdict-normalize"
reference = (evidence / "task-4-runs/control-P/runtime-start.txt").read_text(encoding="utf-8").splitlines()
recorded = [line.split(" ", 1)[1] for line in reference if line.startswith("verdict-normalize ")]
blob = subprocess.run(["git", "hash-object", str(normalize)], capture_output=True, text=True, check=True).stdout.strip()
if recorded != [blob]:
    sys.exit(f"{normalize} is blob {blob}; the reference runtime record names {recorded}")
cells: dict[tuple[str, str, str], collections.Counter[str]] = collections.defaultdict(collections.Counter)
for capture in sorted(evidence.glob("task-*-runs/*/*.json")):
    fixture, _arm, _index = capture.stem.rsplit("-", 2)
    out = subprocess.run(["bash", str(normalize), str(capture)], capture_output=True, text=True, check=True).stdout
    cells[(capture.parent.parent.name, capture.parent.name, fixture)][json.loads(out)["result"]] += 1
for (task, run, fixture), counts in sorted(cells.items()):
    n = sum(counts.values())
    print(f"{task}\t{run}\t{fixture}\tblocking {counts['blocking']}/{n}\tapproved {counts['approved']}/{n}\tincomplete {counts['incomplete']}/{n}")
