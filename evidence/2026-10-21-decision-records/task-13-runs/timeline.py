"""Print one turn's events in order: tool calls (with a short input), tool results, system task events, and timestamps."""
import json
import sys
from pathlib import Path

for i, line in enumerate(Path(sys.argv[1]).read_text().splitlines()):
    try:
        d = json.loads(line)
    except json.JSONDecodeError:
        continue
    t = d.get("type")
    side = "SUB " if d.get("parent_tool_use_id") else "MAIN"
    ts = d.get("timestamp", "")
    if t == "assistant":
        for b in d["message"]["content"]:
            if b.get("type") == "tool_use":
                print(i, side, ts, "CALL", b["name"], json.dumps(b["input"])[:260])
            elif b.get("type") == "text":
                print(i, side, ts, "TEXT", b["text"][:120].replace("\n", " | "))
    elif t == "user":
        c = d["message"]["content"]
        if isinstance(c, list):
            for b in c:
                if b.get("type") == "tool_result":
                    r = b.get("content")
                    if isinstance(r, list):
                        r = " ".join(x.get("text", "") for x in r)
                    print(i, side, ts, "RESULT", str(r)[:200].replace("\n", " | "))
                elif b.get("type") == "text":
                    print(i, side, ts, "USERTEXT", b["text"][:200].replace("\n", " | "))
        else:
            print(i, side, ts, "USERTEXT", str(c)[:200].replace("\n", " | "))
    elif t == "system" and d.get("subtype") not in ("hook_started", "hook_response", "init"):
        print(i, side, ts, "SYS", d.get("subtype"), json.dumps(d)[:200])
