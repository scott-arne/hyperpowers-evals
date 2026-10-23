"""Field instrument: SDD turn liveness in this host's Claude Code transcripts.

Spec Design §3. Reads every top-level ``*.jsonl`` transcript under a
projects directory (``~/.claude/projects`` by default) and keeps the Zed
sessions (the first record carrying ``entrypoint`` says ``sdk-ts``) that
invoke the subagent-driven-development skill. Events count when their
timestamp falls in ``[since, until)``: on this host the skill text in effect
is whatever tag ``.worktrees/plugin-install`` had checked out, which only
that worktree's reflog records (plan deviation 1), so ``--reflog-file`` and
``--commit`` turn a release into a window. The output is counts only; no
transcript text leaves this script.
"""

from __future__ import annotations

import argparse
import bisect
import json
import re
import subprocess
import sys
from collections import Counter
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from liveness import (
    Record,
    asks_or_blocks,
    blocks,
    idle_marker,
    is_resume,
    is_tool_result,
    load,
    parse_ts,
    reloads,
    result_text,
    state_at,
    tasks,
    text_of,
    tool_input,
    tool_uses,
    turn_ends,
)

ENTRYPOINT = re.compile(rb'"entrypoint"\s*:\s*"([^"]+)"')
CREATED = re.compile(r"Task #(\d+) created")
REFLOG = re.compile(r"^([0-9a-f]{7,40}) HEAD@\{([^}]+)\}", re.MULTILINE)
SDD_COMMAND = "subagent-driven-development</command-name>"


def entrypoint(path: Path) -> str | None:
    """The first ``entrypoint`` value in the transcript's first 200 lines."""
    with path.open("rb") as fh:
        for n, line in enumerate(fh):
            if n >= 200:
                break
            match = ENTRYPOINT.search(line)
            if match:
                return match.group(1).decode()
    return None


def is_sdd(records: Sequence[Record]) -> bool:
    """Whether the session invokes the subagent-driven-development skill."""
    for rec in records:
        for use in tool_uses(rec):
            inp = tool_input(use)
            if use.get("name") == "Skill" and str(inp.get("skill", "")).endswith("subagent-driven-development"):
                return True
        if rec.get("type") == "user" and SDD_COMMAND in text_of(rec):
            return True
    return False


def _open_timeline(records: Sequence[Record]) -> tuple[list[datetime], list[int], list[datetime]]:
    """When the count of open task-list items changed, and to what, sorted by time; and when a task was completed.

    Only a successful result changes the list: a failed ``TaskUpdate`` (an
    unknown id, say) completes nothing and opens nothing.
    """
    names: dict[str, tuple[str, dict[str, Any]]] = {}
    open_ids: set[str] = set()
    changes: list[tuple[datetime, int]] = []
    completions: list[datetime] = []
    for rec in records:
        for use in tool_uses(rec):
            inp = tool_input(use)
            if isinstance(use.get("id"), str):
                names[use["id"]] = (str(use.get("name")), inp)
        if not is_tool_result(rec):
            continue
        for block in blocks(rec):
            if block.get("type") != "tool_result" or block.get("is_error"):
                continue
            name, inp = names.get(str(block.get("tool_use_id")), ("", {}))
            if name == "TaskCreate":
                match = CREATED.search(result_text(block))
                if match:
                    open_ids.add(match.group(1))
            elif name == "TaskUpdate":
                task_id = str(inp.get("taskId", ""))
                status = inp.get("status")
                if status in ("completed", "deleted"):
                    open_ids.discard(task_id)
                    if status == "completed":
                        completions.append(parse_ts(rec["timestamp"]))
                elif status in ("pending", "in_progress") and task_id:
                    open_ids.add(task_id)
            else:
                continue
            changes.append((parse_ts(rec["timestamp"]), len(open_ids)))
    changes.sort(key=lambda item: item[0])
    return [when for when, _ in changes], [n for _, n in changes], completions


def _open_at(times: Sequence[datetime], counts: Sequence[int], at: datetime) -> bool:
    i = bisect.bisect_right(times, at)
    return i > 0 and counts[i - 1] > 0


def _session(records: Sequence[Record], since: datetime, until: datetime) -> tuple[Counter[str], set[str], set[str]]:
    counts: Counter[str] = Counter()
    task_map = tasks(records)
    reload_times = reloads(records)
    times, open_counts, completions = _open_timeline(records)

    def inside(when: datetime) -> bool:
        return since <= when < until

    boundaries = sum(1 for when in completions if inside(when))
    if boundaries:
        counts["boundaries"] = boundaries
    for end in turn_ends(records):
        if not inside(end.at):
            continue
        if end.excluded is not None:
            counts[f"excluded:{end.excluded}"] += 1
            continue
        state = state_at(end.at, task_map, reload_times)
        if state == "live":
            counts["live_turn_ends"] += 1
        elif state == "censored":
            counts["censored_stops"] += 1
        elif _open_at(times, open_counts, end.at) and not asks_or_blocks(end.text):
            counts["premature"] += 1
            if is_resume(end.next_human):
                counts["premature_resumed"] += 1
    versions: set[str] = set()
    models: set[str] = set()
    for rec in records:
        when = parse_ts(rec["timestamp"])
        if not inside(when):
            continue
        if rec.get("version"):
            versions.add(str(rec["version"]))
        model = (rec.get("message") or {}).get("model") if rec.get("type") == "assistant" else None
        if model:
            models.add(str(model))
        if idle_marker(rec) == "human" and is_resume(text_of(rec)):
            state = state_at(when, task_map, reload_times)
            if state == "live":
                counts["live_resumes"] += 1
            elif state == "censored":
                counts["censored_resumes"] += 1
    return counts, versions, models


def collect(projects: Path, since: datetime, until: datetime) -> dict[str, Any]:
    """Aggregate counts over every Zed SDD session with events in the window.

    A session qualifies only by an SDD invocation inside the window, which is
    the skill text the window measures; its earlier records still reconstruct
    the state its in-window events are read against. ``until`` is also the
    observation cutoff: every record at or after it is dropped before anything
    is classified, so records appended later (a completion, a resume, a
    session's first SDD call) cannot change the result.
    """
    totals: Counter[str] = Counter()
    versions: Counter[str] = Counter()
    models: Counter[str] = Counter()
    sessions = 0
    for path in sorted(projects.glob("*/*.jsonl")):
        if entrypoint(path) != "sdk-ts":
            continue
        records = [rec for rec in load(path, slim=True) if parse_ts(rec["timestamp"]) < until]
        if not is_sdd([rec for rec in records if since <= parse_ts(rec["timestamp"]) < until]):
            continue
        counts, session_versions, session_models = _session(records, since, until)
        if not counts and not session_versions:
            continue
        sessions += 1
        totals.update(counts)
        versions.update(session_versions)
        models.update(session_models)
    boundaries = totals["boundaries"]

    def per100(n: int) -> float | None:
        return round(100 * n / boundaries, 2) if boundaries else None

    return {
        "window": {"since": since.isoformat(), "until": until.isoformat()},
        "sessions": sessions,
        "boundaries": boundaries,
        "premature": totals["premature"],
        "premature_resumed": totals["premature_resumed"],
        "premature_per_100": per100(totals["premature"]),
        "live_turn_ends": totals["live_turn_ends"],
        "live_resumes": totals["live_resumes"],
        "live_resumes_per_100": per100(totals["live_resumes"]),
        "censored_stops": totals["censored_stops"],
        "censored_resumes": totals["censored_resumes"],
        "excluded": {k.split(":", 1)[1]: v for k, v in sorted(totals.items()) if k.startswith("excluded:")},
        "cc_versions": dict(sorted(versions.items())),
        "models": dict(sorted(models.items())),
    }


def _same_commit(commit: str) -> Callable[[str], bool]:
    return lambda sha: commit.startswith(sha) or sha.startswith(commit)


def same_skills(repo: Path, commit: str) -> Callable[[str], bool]:
    """A predicate: does a commit carry the same ``skills/`` tree as ``commit``?

    A git error (an unknown abbreviated id, say) counts as different, which
    closes the window early rather than late.
    """
    def same(sha: str) -> bool:
        done = subprocess.run(
            ["git", "-C", str(repo), "diff", "--quiet", commit, sha, "--", "skills"], capture_output=True, check=False
        )
        return done.returncode == 0

    return same


def reflog_window(
    text: str, commit: str, same: Callable[[str], bool] | None = None
) -> tuple[datetime, datetime | None]:
    """The interval ``commit``'s skill text was in effect, from ``git reflog --date=iso-strict`` output.

    The reflog lists newest first, so the commit's first checkout is its
    highest-index entry. The interval ends at the nearest newer entry whose
    commit ``same`` rejects; by default that is any other commit, and with
    ``same_skills`` it is the first checkout with a different ``skills/``
    tree, so moving the install from a release candidate to a tag with the
    same skills does not end the window.
    """
    entries = [(sha, datetime.fromisoformat(when)) for sha, when in REFLOG.findall(text)]
    matches = [i for i, (sha, _) in enumerate(entries) if _same_commit(commit)(sha)]
    if not matches:
        raise ValueError(f"{commit} is not in the reflog")
    first = max(matches)
    keep = same or _same_commit(commit)
    for i in range(first - 1, -1, -1):
        if not keep(entries[i][0]):
            return entries[first][1], entries[i][1]
    return entries[first][1], None


def main(argv: Sequence[str] | None = None) -> int:
    """Write the aggregate JSON and print it."""
    parser = argparse.ArgumentParser(description="SDD turn liveness in Zed transcripts on this host.")
    parser.add_argument("--projects", type=Path, default=Path.home() / ".claude" / "projects")
    parser.add_argument("--since", type=datetime.fromisoformat)
    parser.add_argument("--until", type=datetime.fromisoformat)
    parser.add_argument("--reflog-file", type=Path)
    parser.add_argument("--commit")
    parser.add_argument("--repo", type=Path, help="the hyperpowers repository, to compare skills/ trees")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)
    if args.reflog_file and args.commit:
        same = same_skills(args.repo, args.commit) if args.repo else None
        since, until = reflog_window(args.reflog_file.read_text(), args.commit, same)
        until = until or datetime.now(UTC)
    elif args.since and args.until:
        since, until = args.since, args.until
    else:
        parser.error("give --since and --until, or --reflog-file and --commit")
    out = collect(args.projects, since, until)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
    print(json.dumps(out, indent=1, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
