#!/usr/bin/env python3
"""Audit the first-edit interlock's wave identifier across every campaign run.

For each agent context that left an interlock marker, compare the wave the hook
recorded at denial time against the ``message.id`` of the assistant turn that
actually carried the denied call, and count the mutations the hook then let
through inside that same turn.

Run from the evals clone with ``results/`` present::

    python evidence/2026-09-17-first-edit-interlock/wave-race/audit.py
"""

import collections
import glob
import json
import os
import subprocess
import sys

DENIAL = "Interlock, once before your first edit"
LIB = os.environ.get(
    "INTERLOCK_LIB",
    os.path.expanduser(
        "~/Development/agents/hyperpowers/.worktrees/first-edit-interlock/hooks/interlock-lib.cjs"
    ),
)


def records(path: str) -> list[dict]:
    """Every parseable JSON record of a session transcript, in file order."""

    out = []
    with open(path) as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except ValueError:
                pass
    return out


def classify(items: list[dict]) -> list[str]:
    """The hook's own mutation classifier over a batch of calls."""

    if not items:
        return []
    proc = subprocess.run(
        ["node", LIB, "--batch"], input=json.dumps(items), capture_output=True, text=True
    )
    return proc.stdout.strip().split("\n") if proc.stdout.strip() else []


def read_context(transcript: str) -> tuple[list[dict], dict[str, str]]:
    """(tool calls with their denial flag, distinct assistant turn order)."""

    recs = records(transcript)
    results: dict[str, str] = {}
    for rec in recs:
        message = rec.get("message") or {}
        content = message.get("content")
        if rec.get("type") == "user" and isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "tool_result":
                    text = part.get("content")
                    if isinstance(text, list):
                        text = " ".join(
                            str(b.get("text", "")) for b in text if isinstance(b, dict)
                        )
                    results[str(part.get("tool_use_id"))] = str(text)
    calls: list[dict] = []
    order: list[str] = []
    for index, rec in enumerate(recs):
        if rec.get("type") != "assistant":
            continue
        message = rec.get("message") or {}
        mid = str(message.get("id") or rec.get("requestId") or "")
        if not order or order[-1] != mid:
            order.append(mid)
        for part in message.get("content") or []:
            if isinstance(part, dict) and part.get("type") == "tool_use":
                calls.append(
                    {
                        "index": index,
                        "mid": mid,
                        "tool": str(part.get("name")),
                        "input": part.get("input") if isinstance(part.get("input"), dict) else {},
                        "denied": DENIAL in results.get(str(part.get("id")), ""),
                        "prev": order[-2] if len(order) > 1 else "",
                    }
                )
    verdicts = classify([{"tool_name": c["tool"], "tool_input": c["input"]} for c in calls])
    for call, verdict in zip(calls, verdicts):
        call["attempt"] = verdict == "attempt"
    return calls, {}


def main() -> int:
    buckets: collections.Counter = collections.Counter()
    leaked: list[dict] = []
    total = 0
    for marker_root in sorted(glob.glob("results/*/home/.cache/hyperpowers/interlock/*")):
        run = marker_root.split("/")[1]
        sid = os.path.basename(marker_root)
        for ctx in sorted(os.listdir(marker_root)):
            wave_file = os.path.join(marker_root, ctx, "wave")
            if not os.path.isfile(wave_file):
                continue
            with open(wave_file) as handle:
                wave = handle.read().strip()
            if ctx == sid:
                found = glob.glob(f"results/{run}/home/.claude/projects/*/{sid}.jsonl")
            else:
                found = glob.glob(
                    f"results/{run}/home/.claude/projects/*/{sid}/subagents/{ctx}.jsonl"
                )
            if not found:
                continue
            total += 1
            calls, _ = read_context(found[0])
            denials = [c for c in calls if c["denied"]]
            if not denials:
                buckets["no denial"] += 1
                continue
            first = denials[0]
            if wave == first["mid"]:
                buckets["wave names the denied turn"] += 1
                bucket = "fresh"
            elif wave == first["prev"]:
                buckets["wave names the turn before it"] += 1
                bucket = "stale"
            else:
                buckets["wave names neither"] += 1
                bucket = "other"
            siblings = [
                c
                for c in calls
                if c["attempt"] and not c["denied"] and c["mid"] == first["mid"]
            ]
            if siblings:
                verdict_path = f"results/{run}/verdict.json"
                final = "?"
                if os.path.exists(verdict_path):
                    with open(verdict_path) as handle:
                        final = json.load(handle).get("final", "?")
                leaked.append(
                    {
                        "run": run,
                        "scenario": run.rsplit("-claude-auto-", 1)[0],
                        "bucket": bucket,
                        "tools": [c["tool"] for c in siblings],
                        "asked_first": any(
                            c["tool"] == "AskUserQuestion" and c["index"] < siblings[0]["index"]
                            for c in calls
                        ),
                        "final": final,
                    }
                )

    print(f"agent contexts that left a marker: {total}")
    for key in (
        "wave names the denied turn",
        "wave names the turn before it",
        "wave names neither",
        "no denial",
    ):
        print(f"  {key:<32} {buckets[key]}")
    print()
    print(f"contexts where a mutation was carried out inside the denied turn: {len(leaked)}")
    print(f"  all of them in the stale bucket: {all(row['bucket'] == 'stale' for row in leaked)}")
    print()
    print("by scenario:")
    for scenario, count in sorted(collections.Counter(r["scenario"] for r in leaked).items()):
        print(f"  {scenario:<32} {count}")
    print()
    print("had already put the question to the human before that mutation ran:")
    for key, count in sorted(collections.Counter(r["asked_first"] for r in leaked).items()):
        print(f"  {key}: {count}")
    print()
    print("harness verdict of those runs:")
    for key, count in sorted(collections.Counter(r["final"] for r in leaked).items()):
        print(f"  {key}: {count}")
    print()
    print("the affected runs:")
    for row in sorted(leaked, key=lambda r: r["run"]):
        print(f"  {row['run']}  {row['final']:<5} {','.join(row['tools'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
