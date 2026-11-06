"""Condense a stream-json Claude transcript into tool calls and results.

Usage: python3 condense.py <in.jsonl> <out.txt>
Each tool call prints as `>>> <tool>: <input>` and its result as
`<<< <text>` (truncated to 1500 characters), in transcript order, with the
assistant's text turns as `### <text>`.
"""
import json
import sys

src, dst = sys.argv[1], sys.argv[2]
out = []
with open(src, encoding="utf-8") as fh:
    lines = fh.readlines()
for line in lines:
    try:
        d = json.loads(line)
    except ValueError:
        continue
    msg = d.get("message") or {}
    content = msg.get("content")
    if not isinstance(content, list):
        continue
    for c in content:
        t = c.get("type")
        if t == "tool_use":
            inp = c.get("input", {})
            if c.get("name") == "Bash":
                shown = inp.get("command", "")
            else:
                shown = json.dumps(inp)[:600]
            out.append(f">>> {c.get('name')}: {shown}")
        elif t == "tool_result":
            body = c.get("content")
            if isinstance(body, list):
                body = "\n".join(x.get("text", "") for x in body if isinstance(x, dict))
            out.append("<<< " + str(body)[:1500])
        elif t == "text" and d.get("type") == "assistant":
            out.append("### " + c.get("text", "")[:800])
with open(dst, "w", encoding="utf-8") as fh:
    fh.write("\n".join(out) + "\n")
print(f"wrote {dst}: {len(out)} entries")
