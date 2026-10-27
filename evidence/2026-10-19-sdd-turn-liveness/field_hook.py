"""The stop guard's record over the field cohort.

For every session ``field.cohort`` qualifies, the hook's record is
``<mirror_dir>/<session id>.jsonl`` (Claude Code names a transcript after its
session id, so the transcript's stem is the key). Inside the window it counts
blocks, allows by reason, ``cap``, ``log-failed`` and ``hook-error`` events and
``mirror_failed`` marks, blocks per 100 boundaries against the transcript
measure's count, and the hook's misses: hand-back allows that follow, within a
minute, a turn end the transcript measure scores as premature (spec Design §5).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import field
from liveness import parse_ts

HANDBACK = ("handback-text", "handback-line")
MINUTE = timedelta(minutes=1)
SKEW = timedelta(seconds=2)
DEFAULT_PROJECTS = Path.home() / ".claude" / "projects"
DEFAULT_MIRRORS = Path.home() / ".cache" / "hyperpowers" / "stop-guard"


def _read(path: Path, since: datetime, until: datetime) -> tuple[list[dict[str, Any]], int]:
    """The in-window decision lines of one mirror, in file order, and the malformed count.

    A mirror is appended to by two writers (the module and, on its error
    paths, the bash wrapper), so a glued or half-written line is expected
    rather than corruption: it is skipped and counted, never fatal. The read
    replaces undecodable bytes for the same reason — a torn multi-byte
    sequence must cost one line, not the whole record.
    """
    out: list[dict[str, Any]] = []
    malformed = 0
    if not path.is_file():
        return out, malformed
    for raw in path.read_text(errors="replace").splitlines():
        if not raw.strip():
            continue
        try:
            d = json.loads(raw)
        except ValueError:
            malformed += 1
            continue
        if not isinstance(d, dict) or "ts" not in d:
            malformed += 1
            continue
        try:
            when = parse_ts(str(d["ts"]))
        except ValueError:
            malformed += 1
            continue
        if since <= when < until:
            out.append(d)
    return out, malformed


def mirror_lines(path: Path, since: datetime, until: datetime) -> list[dict[str, Any]]:
    """Well-formed decision lines of one mirror inside the window, in file order.

    File order, and no deduplication: the wrapper's ``hook-error`` lines carry
    whole-second timestamps and no sequence field, so two of them in one
    second are two distinct Stops.

    :param path: the mirror ``<session id>.jsonl``.
    :param since: window start, inclusive.
    :param until: window end, exclusive.
    :returns: the lines, in the order the file holds them.
    """
    return _read(path, since, until)[0]


def misses(lines: Sequence[dict[str, Any]], premature_times: Sequence[datetime]) -> list[dict[str, Any]]:
    """Hand-back allows the transcript measure contradicts.

    The Stop hook runs after the message a turn ends on, so an allow belongs to
    a premature stop only inside ``[stop - 2 s, stop + 1 min]``; an allow before
    that window was an earlier stop's.

    :param lines: decision lines of one session, as ``mirror_lines`` returns them.
    :param premature_times: the turn ends the transcript measure scored premature.
    :returns: the contradicted lines, in file order.
    """
    out: list[dict[str, Any]] = []
    for d in lines:
        if d.get("decision") != "allow" or d.get("reason") not in HANDBACK:
            continue
        when = parse_ts(str(d["ts"]))
        if any(-SKEW <= when - t <= MINUTE for t in premature_times):
            out.append(d)
    return out


def collect(projects: Path, mirror_dir: Path, since: datetime, until: datetime) -> dict[str, Any]:
    """The hook's record over every session the transcript measure counts.

    :param projects: the Claude Code projects directory the cohort is read from.
    :param mirror_dir: ``<cache>/hyperpowers/stop-guard``, one mirror per session.
    :param since: window start, inclusive.
    :param until: window end, exclusive, and the observation cutoff.
    :returns: the counts, with ``boundaries`` taken from the transcript measure
        so blocks per 100 are on its denominator.
    """
    base = field.collect(projects, since, until)
    totals: Counter[str] = Counter()
    allows: Counter[str] = Counter()
    sessions = with_log = 0
    missed: list[dict[str, Any]] = []
    for path, records, first in field.cohort(projects, since, until):
        sessions += 1
        lines, malformed = _read(mirror_dir / f"{path.stem}.jsonl", since, until)
        totals["malformed"] += malformed
        if not lines:
            continue
        with_log += 1
        for d in lines:
            if d.get("decision") == "block":
                totals["blocks"] += 1
            else:
                allows[str(d.get("reason"))] += 1
            if d.get("mirror_failed"):
                totals["mirror_failed"] += 1
        # Correction 8: a session is measured from its first in-window SDD
        # invocation, so the stops the hook is judged against start there too.
        premature = [end.at for end in field.premature_ends(records, first, until)]
        missed.extend({"session": path.stem, **d} for d in misses(lines, premature))
    boundaries = base["boundaries"]
    return {
        "window": base["window"],
        "sessions": sessions,
        "sessions_with_log": with_log,
        "boundaries": boundaries,
        "blocks": totals["blocks"],
        "blocks_per_100": round(100 * totals["blocks"] / boundaries, 2) if boundaries else None,
        "allows": dict(sorted(allows.items())),
        "cap": allows["cap"],
        "log_failed": allows["log-failed"],
        "hook_error": allows["hook-error"],
        "mirror_failed": totals["mirror_failed"],
        "malformed": totals["malformed"],
        "misses": missed,
    }


def main(argv: Sequence[str] | None = None) -> int:
    """Print the hook's record over the window as JSON."""
    parser = argparse.ArgumentParser(description="The SDD stop guard's record over the field cohort.")
    parser.add_argument("--since", required=True, help="ISO-8601 UTC, inclusive")
    parser.add_argument("--until", required=True, help="ISO-8601 UTC, exclusive")
    parser.add_argument("--projects", type=Path, default=DEFAULT_PROJECTS)
    parser.add_argument("--mirror-dir", type=Path, default=DEFAULT_MIRRORS)
    args = parser.parse_args(argv)
    since = datetime.fromisoformat(args.since).astimezone(UTC)
    until = datetime.fromisoformat(args.until).astimezone(UTC)
    print(json.dumps(collect(args.projects, args.mirror_dir, since, until), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
