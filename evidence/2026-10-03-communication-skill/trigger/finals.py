"""Dump each turn's final assistant text to final-turnN.md and print per-run skill hits."""
import json
import sys
from pathlib import Path

arm = Path(sys.argv[1])
rows = []
for run in sorted(p for p in arm.iterdir() if p.is_dir()):
    hit = False
    for turn in sorted(run.glob("turn*.jsonl")):
        final = ""
        for line in turn.read_text().splitlines():
            try:
                d = json.loads(line)
            except Exception:
                continue
            if d.get("type") == "assistant":
                for b in d.get("message", {}).get("content", []):
                    if b.get("type") == "tool_use" and b.get("name") == "Skill" and b.get("input", {}).get("skill") == "hyperpowers:communication":
                        hit = True
            if d.get("type") == "result":
                final = d.get("result", "") or ""
        (run / f"final-{turn.stem}.md").write_text(final)
    rows.append((run.name, hit))
for name, hit in rows:
    print(f"{name:16} communication={'yes' if hit else 'no'}")
