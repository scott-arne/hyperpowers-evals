"""List genuine-refutation candidates in a fix-loop run's transcripts.

A candidate is any text unit (assistant text, tool_use input, or tool_result) that names
greet.test.js:<n> with n other than 1, next to refut/declin/already/exist/false/incorrect.
Prints timestamp, file role, and an excerpt, earliest first, up to the given bound.
"""
import glob
import json
import os
import re
import sys

LINE = re.compile(r"greet\.test\.js:(\d+)")
WORD = re.compile(r"refut|declin|already|exist|false|incorrect|not a real", re.I)


def units(entry: dict) -> list[tuple[str, str]]:
    msg = entry.get("message") or {}
    content = msg.get("content")
    out: list[tuple[str, str]] = []
    if isinstance(content, str):
        out.append(("text", content))
    elif isinstance(content, list):
        for c in content:
            t = c.get("type")
            if t == "text":
                out.append(("text", c.get("text", "")))
            elif t == "tool_use":
                out.append(("tool_use:" + c.get("name", ""), json.dumps(c.get("input", {}))))
            elif t == "tool_result":
                cc = c.get("content")
                if isinstance(cc, list):
                    cc = " ".join(x.get("text", "") for x in cc if isinstance(x, dict))
                out.append(("tool_result", str(cc)))
    return out


run, bound = sys.argv[1], sys.argv[2]
hits = []
for path in glob.glob(os.path.join(run, "home/.claude/projects/**/*.jsonl"), recursive=True):
    role = "subagent" if "/subagents/" in path else "controller"
    for raw in open(path, errors="replace"):
        try:
            e = json.loads(raw)
        except ValueError:
            continue
        ts = e.get("timestamp", "")
        if not ts or ts > bound:
            continue
        for kind, text in units(e):
            for m in LINE.finditer(text):
                if m.group(1) == "1":
                    continue
                window = text[max(0, m.start() - 250): m.end() + 250]
                if WORD.search(window):
                    ex = " ".join(text[max(0, m.start() - 120): m.end() + 160].split())
                    hits.append((ts, role, kind, ex))
                    break
for h in sorted(hits)[:6]:
    print(h[0], h[1], h[2], "|", h[3])
print("candidates:", len(hits))
