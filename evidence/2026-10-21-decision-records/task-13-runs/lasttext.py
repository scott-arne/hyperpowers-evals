"""Print the last main-thread assistant text of a stream-json turn."""
import json
import sys
from pathlib import Path

last = ""
for line in Path(sys.argv[1]).read_text().splitlines():
    try:
        d = json.loads(line)
    except json.JSONDecodeError:
        continue
    if d.get("type") == "assistant" and not d.get("parent_tool_use_id"):
        t = "".join(b.get("text", "") for b in d["message"]["content"] if b.get("type") == "text")
        if t:
            last = t
print(last)
