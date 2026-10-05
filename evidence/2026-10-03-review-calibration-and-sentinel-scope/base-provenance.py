"""Recompute each control capture's base commit from the committed fixture files.

The runner builds the reviewed repository's base as one commit of the fixture's
files with lib.js replaced by lib.base.js, author and committer ``t <t@t>``,
message ``base``. Only the commit time and zone vary, so a search over the window
between two evals commits either reproduces a capture's ``target.baseRef`` or
shows that the base it reviewed was not built from those files. The head side
(lib.js, the diff, the rendered prompt) is not in the captures and is not checked.

Exits 1 if any base ref is not reproduced, or if there was none to check.

Usage: base-provenance.py <evals-root> <evidence-dir> <fixture-commit> <window-end-commit>
"""
import hashlib
import json
import pathlib
import subprocess
import sys
from datetime import datetime, timezone

evals, evidence = sys.argv[1], pathlib.Path(sys.argv[2])
fixture_commit, end_commit = sys.argv[3], sys.argv[4]


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", evals, *args], capture_output=True, text=True, check=True).stdout


def base_tree(fixture: str) -> str:
    entries = {}
    for line in git("ls-tree", fixture_commit, f"fixtures/codex-focus-arm/{fixture}/").splitlines():
        meta, path = line.split("\t", 1)
        mode, _kind, sha = meta.split()
        entries[path.rsplit("/", 1)[1]] = (mode, sha)
    entries["lib.js"] = (entries["lib.js"][0], entries["lib.base.js"][1])
    body = b"".join(
        f"{int(mode, 8):o} {name}".encode() + b"\0" + bytes.fromhex(sha)
        for name, (mode, sha) in sorted(entries.items())
    )
    return hashlib.sha1(b"tree %d\0" % len(body) + body).hexdigest()


def base_commit(tree: str, ts: int, tz: str) -> str:
    body = f"tree {tree}\nauthor t <t@t> {ts} {tz}\ncommitter t <t@t> {ts} {tz}\n\nbase\n".encode()
    return hashlib.sha1(b"commit %d\0" % len(body) + body).hexdigest()


start = int(git("show", "-s", "--format=%ct", fixture_commit))
end = int(git("show", "-s", "--format=%ct", end_commit))
zones = [f"{sign}{h:02d}{m:02d}" for sign in "+-" for h in range(15) for m in (0, 30)]
checked = unmatched = 0
for run in sorted(evidence.glob("task-*-runs/control-*")):
    fixture = run.name.split("-", 1)[1]
    captures = sorted(run.glob(f"{fixture}-control-*.json"))
    refs = {json.loads(c.read_text(encoding="utf-8"))["target"]["baseRef"] for c in captures}
    tree = base_tree(fixture)
    for ref in sorted(refs):
        checked += 1
        hit = next(
            ((ts, tz) for ts in range(start, end + 1) for tz in zones if base_commit(tree, ts, tz) == ref),
            None,
        )
        if hit is None:
            unmatched += 1
            when = "not reproduced"
        else:
            when = datetime.fromtimestamp(hit[0], timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") + f" {hit[1]}"
        print(f"{run.parent.name}\t{run.name}\tbase {ref}\ttree {tree}\t{len(captures)} captures\t{when}")
sys.exit(1 if unmatched or not checked else 0)
