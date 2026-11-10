"""Redact host-private text from probe transcript copies.

The probe ran `claude -p` from a directory under the home directory, so Claude
Code's upward instruction-file search attached the host's private
~/.claude/CLAUDE.md to every transcript. This script touches only strings that
hold 80-character slices of that file or a scanned network/project value; keys
and all other values stay as they are. Usage: python3 -I redact-transcripts.py
<file.jsonl>...  (rewrites each file in place; prints counts only).
"""
import json
import os
import sys
from pathlib import Path

FILE_MARK = "[redacted: held the host's private ~/.claude/CLAUDE.md]"
NEEDLE_MARK = "[redacted: held a host network or project value]"
SLICE, STEP = 80, 40

env = json.loads(Path("~/.claude/settings.json").expanduser().read_text())["env"]
proxy = env.get("HTTPS_PROXY", "")
needles = set()
if proxy:
    host = proxy.split("://", 1)[-1]
    needles |= {host, host.split(":", 1)[0]}
if env.get("NO_PROXY"):
    needles.add(env["NO_PROXY"])
needles |= {
    v
    for v in (env.get("ANTHROPIC_VERTEX_PROJECT_ID", ""), os.environ.get("ANTHROPIC_VERTEX_PROJECT_ID", ""))
    if v
}

host_file = Path("~/.claude/CLAUDE.md").expanduser().read_text()
slices = {
    host_file[i : i + SLICE]
    for i in range(0, max(len(host_file) - SLICE, 0) + 1, STEP)
    if len(host_file[i : i + SLICE]) == SLICE and host_file[i : i + SLICE].strip()
}


def redact(value, counts):
    if isinstance(value, str):
        if any(s in value for s in slices):
            counts["file"] += 1
            return FILE_MARK
        if any(n in value for n in needles):
            counts["needle"] += 1
            return NEEDLE_MARK
        return value
    if isinstance(value, list):
        return [redact(v, counts) for v in value]
    if isinstance(value, dict):
        return {k: redact(v, counts) for k, v in value.items()}
    return value


for name in sys.argv[1:]:
    path = Path(name)
    counts = {"file": 0, "needle": 0}
    read = unparsed = 0
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        read += 1
        try:
            record = json.loads(line)
        except ValueError:
            unparsed += 1
            out.append(line)
            continue
        out.append(json.dumps(redact(record, counts), ensure_ascii=False, separators=(",", ":")))
    path.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"{name}: lines={read} redacted-file-text={counts['file']} redacted-needle={counts['needle']} unparsed={unparsed}")
