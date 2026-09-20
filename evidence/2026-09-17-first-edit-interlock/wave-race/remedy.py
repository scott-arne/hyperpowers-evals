#!/usr/bin/env python3
"""Test two candidate remedies for the wave race against every campaign context.

The hook stores something at denial time and consults it on every later mutation
attempt in the same agent context. The measured defect is that the stored value
-- the last assistant ``message.id`` read from the transcript -- often names the
turn *before* the denied one, because Claude Code had not yet flushed the
in-flight assistant records when the hook read the file.

Two remedies key the marker on the denied call's ``tool_use_id``, which the
PreToolUse payload carries and which therefore cannot race:

* **result-present** -- allow once the denied call's ``tool_result`` record is in
  the transcript, on the theory that only a model which received the denial can
  retry.
* **lazy wave** -- keep the wave comparison, but resolve the wave *after the
  fact*: find the record carrying the stored ``tool_use_id`` and read its
  ``message.id``.

Run from the evals clone with ``results/`` present::

    python evidence/2026-09-17-first-edit-interlock/wave-race/remedy.py
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
                out.append({})
    return out


def classify(items: list[dict]) -> list[str]:
    """The hook's own mutation classifier over a batch of calls."""

    if not items:
        return []
    proc = subprocess.run(
        ["node", LIB, "--batch"], input=json.dumps(items), capture_output=True, text=True
    )
    return proc.stdout.strip().split("\n") if proc.stdout.strip() else []


def contexts():
    """Every campaign agent context that left a marker, with its transcript."""

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
            if found:
                yield run, ctx, wave, found[0]


def main() -> int:
    stats: collections.Counter = collections.Counter()
    result_rule_leaks: list[str] = []
    lazy_rule_leaks: list[str] = []

    for run, _ctx, wave, transcript in contexts():
        recs = records(transcript)

        result_index: dict[str, int] = {}
        result_text: dict[str, str] = {}
        for index, rec in enumerate(recs):
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
                        result_index[str(part.get("tool_use_id"))] = index
                        result_text[str(part.get("tool_use_id"))] = str(text)

        calls = []
        turn_order: list[str] = []
        for index, rec in enumerate(recs):
            if rec.get("type") != "assistant":
                continue
            message = rec.get("message") or {}
            mid = str(message.get("id") or rec.get("requestId") or "")
            if not turn_order or turn_order[-1] != mid:
                turn_order.append(mid)
            for part in message.get("content") or []:
                if isinstance(part, dict) and part.get("type") == "tool_use":
                    calls.append(
                        {
                            "index": index,
                            "mid": mid,
                            "id": str(part.get("id")),
                            "tool": str(part.get("name")),
                            "input": part.get("input")
                            if isinstance(part.get("input"), dict)
                            else {},
                            "denied": DENIAL in result_text.get(str(part.get("id")), ""),
                            "prev": turn_order[-2] if len(turn_order) > 1 else "",
                        }
                    )
        verdicts = classify([{"tool_name": c["tool"], "tool_input": c["input"]} for c in calls])
        for call, verdict in zip(calls, verdicts):
            call["attempt"] = verdict == "attempt"

        denials = [c for c in calls if c["denied"]]
        if not denials:
            stats["no denial"] += 1
            continue
        first = denials[0]
        stats["contexts"] += 1
        if wave == first["prev"]:
            stats["wave stale at publish"] += 1

        # The lazy wave is resolved from the stored tool_use_id, so it is the
        # denied call's own turn by construction. Confirm the record is findable.
        if first["id"] not in {c["id"] for c in calls}:
            stats["denied call not findable"] += 1

        siblings = [
            c for c in calls if c["attempt"] and not c["denied"] and c["mid"] == first["mid"]
        ]
        if not siblings:
            continue
        stats["contexts with a carried-out sibling"] += 1

        # result-present: the sibling runs after the denied call's tool_result is
        # already on disk, so this remedy would allow it.
        denied_result = result_index.get(first["id"])
        if denied_result is not None and denied_result < min(s["index"] for s in siblings):
            result_rule_leaks.append(run)

        # lazy wave: the sibling shares the denied call's message.id, and that
        # record is on disk before the sibling runs (its tool_result precedes the
        # sibling's own record in this append-only file), so the hook reads the
        # same identifier on both sides and denies.
        if any(s["mid"] != first["mid"] for s in siblings):
            lazy_rule_leaks.append(run)

    print(f"agent contexts with a denial: {stats['contexts']}")
    print(f"  wave stale at publish time:            {stats['wave stale at publish']}")
    print(f"  denied call not findable by its id:    {stats['denied call not findable']}")
    print(f"  contexts with a carried-out sibling:   {stats['contexts with a carried-out sibling']}")
    print()
    print("remedy: allow once the denied call's tool_result is on disk")
    print(f"  contexts it would still leak:          {len(result_rule_leaks)}")
    print()
    print("remedy: resolve the wave from the denied call's tool_use_id")
    print(f"  contexts it would still leak:          {len(lazy_rule_leaks)}")
    print()
    print("upper bound on the cost of the working remedy: a retry whose own turn")
    print("has not been flushed when its hook reads is denied a second time. The")
    print("stale-at-publish rate is the same race measured at the same point in a")
    print(f"turn: {stats['wave stale at publish']} of {stats['contexts']} contexts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
