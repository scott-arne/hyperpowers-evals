"""Summarize one trigger run: model, tool calls in order, Skill invocations, final text."""
import json
import sys
from pathlib import Path

run = Path(sys.argv[1])
for turn in sorted(run.glob("turn*.jsonl")):
    calls = []
    model = None
    final = ""
    cost = None
    for line in turn.read_text().splitlines():
        try:
            d = json.loads(line)
        except Exception:
            continue
        if d.get("type") == "system" and d.get("subtype") == "init":
            model = d.get("model")
        if d.get("type") == "assistant":
            for block in d.get("message", {}).get("content", []):
                if block.get("type") == "tool_use":
                    inp = block.get("input", {})
                    label = block.get("name", "?")
                    if label == "Skill":
                        label += f"({inp.get('skill')})"
                    elif label in ("Read", "Write", "Edit"):
                        label += f"({str(inp.get('file_path', ''))[-40:]})"
                    elif label == "Bash":
                        label += f"({str(inp.get('command', ''))[:40]!r})"
                    elif label == "Agent":
                        label += f"({inp.get('subagent_type')})"
                    calls.append(label)
        if d.get("type") == "result":
            final = d.get("result", "") or ""
            cost = d.get("total_cost_usd")
    skills = [c for c in calls if c.startswith("Skill(")]
    print(f"== {turn.name} model={model} cost={cost} calls={len(calls)}")
    print("  skills:", skills or "none")
    print("  calls:", " > ".join(calls)[:1500])
    print("  final words:", len(final.split()))
    print("  final head:", final[:300].replace("\n", " | "))
