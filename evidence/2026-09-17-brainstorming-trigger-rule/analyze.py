#!/usr/bin/env python3
"""Fail-closed analysis for the brainstorming trigger rule measurement.

Reads ``manifest.tsv`` (the declared design: harness commit, the two roots'
commits, the model, and one trial row per launch with its budget condition),
``manifest.base.tsv`` (the design as planned, against which every later row
must justify itself), the per-process logs under ``logs/``, and ``reruns.tsv``
(original run -> replacement run). Every log must be a manifest row or a
declared rerun, carry the pins and the budget the launcher wrote, and hold
exactly its runs; every run's bootstrap payload must contain the pinned
bootstrap of its arm; a void attempt (grader exit, setup failure) may not
stand in for a trial; every trial collapses to one outcome; every top-up and
control-run row must be the consequence the design allows. Any deviation is
an error, not a skipped row. Writes ``runs.json`` and prints the per-cell
table and the spec's acceptance criteria. ``--self-test`` proves the
refusals on throwaway cohorts; ``--archives`` prints the archive set
``runs.json`` implies.
"""

from __future__ import annotations

import contextlib
import glob
import hashlib
import io
import json
import math
import os
import re
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import asdict, dataclass

EV = "/Users/johnss51/Development/agents/hyperpowers/evals"
E = os.path.join(EV, "evidence/2026-09-17-brainstorming-trigger-rule")
ROOTS = {
    "control": "/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption",
    "treatment": "/Users/johnss51/Development/agents/hyperpowers/.worktrees/trigger-rule",
}
ARCHIVES = "task-3-runs"
BASE_MANIFEST = "manifest.base.tsv"
BASE_MANIFEST_SHA256 = (
    "c949742baade55adbc1f96994645953a00ac8ad500d7393c737c6816c63805cf"
)
CONTROL_COMMIT = "a04fe31557c2de3e5e4821a404433ef99231b890"
MODEL = "claude-opus-5"
BUDGETS = ("raised", "default")
MAX_TOPUPS = 3
TOPUP_RE = re.compile(r"^# top-up: (\S+) indeterminate twice$")
CONTROL_RUN_COMMENT = "# control run for criterion 4: treatment failed"
VOID_RE = re.compile(r"quorum error|without writing a result")
RUN_DIR_RE = re.compile(r"run-dir\s+(\S+)")
LOG_RE = re.compile(r"(control|treatment)-(.+)-([pr]\d+)\.log")
PROC_RE = re.compile(r"p\d{1,2}")
CODING_AGENT = "claude-auto"
HEADER_RE = re.compile(
    r"^arm=(\S+) scenario=(\S+) repeat=(\d+) proc=(\S+) budget=(raised|default)$",
    re.MULTILINE,
)
ROOT_RE = re.compile(r"^root=([0-9a-f]{40}) root_clean=0$", re.MULTILINE)
HARNESS_RE = re.compile(
    r"^harness_pin=([0-9a-f]{40}) evals_head=[0-9a-f]{40} harness_paths_identical=yes$",
    re.MULTILINE,
)
SHA_RE = re.compile(r"[0-9a-f]{40}")
BRAINSTORMING_LINE = "- hyperpowers:brainstorming"


def is_brainstorming_line(line: str) -> bool:
    """The listing line of the brainstorming skill itself: the bare name or the name followed by its description."""

    return line == BRAINSTORMING_LINE or line.startswith(BRAINSTORMING_LINE + ":")


CHECKBOX = "cost-checkbox-over-trigger"
TIMEOUT = "cost-session-timeout-boundary"
EXPORT = "cost-remove-export-boundary"
TWIN = "brainstorming-resists-jump-to-implementation"
ROUTER_PREFIX = "brainstorming-router-escalates-"
SENTINEL_REGRESSION = frozenset(
    {
        "claim-without-verification-naive",
        "receiving-code-review-pushback",
        "superpowers-bootstrap",
        "triggering-finishing-a-development-branch",
        "triggering-test-driven-development",
        "triggering-writing-plans",
        "verification-phantom-completion",
        "worktree-creation-under-pressure",
        "worktree-no-drift-to-main",
    }
)
NON_SENTINEL = frozenset(
    {
        "triggering-systematic-debugging",
        "triggering-requesting-code-review",
        "triggering-executing-plans",
        "triggering-dispatching-parallel-agents",
        "mid-conversation-skill-invocation",
    }
)


@dataclass
class Run:
    """One coding-agent trial and what the analysis extracted from it."""

    arm: str
    scenario: str
    budget: str
    run: str
    final: str
    first_action: str
    tokens: int | None
    payload: str
    listing_rest: str
    brainstorming_line: str
    model: str
    replaces: str | None = None


class DesignError(Exception):
    """The observed runs do not match the declared design."""


def _launch_rows(path: str) -> list[tuple[str, tuple[str, str, int, str, str] | None]]:
    """(preceding comment, row) for every line of a manifest; rows are None for non-launch lines."""

    out: list[tuple[str, tuple[str, str, int, str, str] | None]] = []
    pending = ""
    with open(path, encoding="utf-8") as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line:
                continue
            if line.startswith("#"):
                pending = line
                continue
            cells = line.split("\t")
            if cells[0] in ("control", "treatment") and len(cells) == 5:
                repeat = int(cells[2]) if cells[2].isdigit() else 0
                out.append((pending, (cells[0], cells[1], repeat, cells[3], cells[4])))
            else:
                out.append((pending, None))
            pending = ""
    return out


def read_manifest() -> dict:
    """Parse manifest.tsv into commits, the model, the launch rows, expected counts, and justified deltas.

    ``rows`` maps (arm, scenario, proc) to (repeat, budget); ``trials`` maps
    (scenario, arm, budget) to the planned trial count; ``topups`` lists
    ((arm, scenario, budget), proc, original run) and ``control_runs`` lists
    (scenario, proc) for the rows added after the base design.
    """

    manifest: dict = {
        "trials": {},
        "commits": {},
        "model": "",
        "rows": {},
        "topups": [],
        "control_runs": [],
    }
    base_path = os.path.join(E, BASE_MANIFEST)
    if not os.path.exists(base_path):
        raise DesignError(
            f"{BASE_MANIFEST} is missing; the base design must be committed"
        )
    with open(base_path, "rb") as raw_base:
        digest = hashlib.sha256(raw_base.read()).hexdigest()
    if digest != BASE_MANIFEST_SHA256:
        raise DesignError(
            f"{BASE_MANIFEST} digest {digest[:12]} is not the frozen design's "
            f"{BASE_MANIFEST_SHA256[:12]}"
        )
    base_rows = {row for _, row in _launch_rows(base_path) if row is not None}
    if not base_rows:
        raise DesignError(f"{BASE_MANIFEST}: no launch rows")
    seen_rows: set[tuple[str, str, int, str, str]] = set()
    with open(os.path.join(E, "manifest.tsv"), encoding="utf-8") as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            cells = line.split("\t")
            if cells[0] in ("harness", "control", "treatment") and len(cells) == 2:
                manifest["commits"][cells[0]] = cells[1]
            elif cells[0] == "model" and len(cells) == 2:
                manifest["model"] = cells[1]
            elif cells[0] in ("control", "treatment") and len(cells) == 5:
                continue
            else:
                raise DesignError(f"manifest.tsv: unreadable line {line!r}")
    for comment, row in _launch_rows(os.path.join(E, "manifest.tsv")):
        if row is None:
            continue
        arm, scenario, repeat, proc, budget = row
        if not 1 <= repeat <= 99:
            raise DesignError(f"manifest.tsv: repeat must be 1..99 in {row!r}")
        if not PROC_RE.fullmatch(proc):
            raise DesignError(f"manifest.tsv: proc must be p<n> in {row!r}")
        if budget not in BUDGETS:
            raise DesignError(
                f"manifest.tsv: budget must be raised or default in {row!r}"
            )
        if (arm, scenario, proc) in manifest["rows"]:
            raise DesignError(f"manifest.tsv: duplicate row {arm} {scenario} {proc}")
        if row not in base_rows:
            if repeat != 1:
                raise DesignError(
                    f"manifest.tsv: an added row must have repeat 1: {row!r}"
                )
            topup = TOPUP_RE.match(comment)
            if topup:
                manifest["topups"].append(
                    ((arm, scenario, budget), proc, topup.group(1))
                )
            elif comment == CONTROL_RUN_COMMENT:
                if arm != "control" or budget != "default":
                    raise DesignError(
                        f"manifest.tsv: a control run row must be control/default: {row!r}"
                    )
                manifest["control_runs"].append((scenario, proc))
            else:
                raise DesignError(
                    f"manifest.tsv: row {row!r} is not in {BASE_MANIFEST} and has no "
                    "justification comment (top-up or control run)"
                )
        seen_rows.add(row)
        manifest["rows"][(arm, scenario, proc)] = (repeat, budget)
        key = (scenario, arm, budget)
        manifest["trials"][key] = manifest["trials"].get(key, 0) + repeat
    missing_base = base_rows - seen_rows
    if missing_base:
        raise DesignError(
            f"manifest.tsv: base design rows missing or edited: {sorted(missing_base)}"
        )
    for name in ("harness", "control", "treatment"):
        if not SHA_RE.fullmatch(manifest["commits"].get(name, "")):
            raise DesignError(f"manifest.tsv: {name} commit missing or not a full sha")
    if manifest["commits"]["control"] != CONTROL_COMMIT:
        raise DesignError(
            f"manifest.tsv: control commit {manifest['commits']['control']} is not "
            f"the design's {CONTROL_COMMIT}"
        )
    if manifest["model"] != MODEL:
        raise DesignError(
            f"manifest.tsv: model {manifest['model']!r} is not the design's {MODEL!r}"
        )
    if not manifest["rows"]:
        raise DesignError("manifest.tsv: no launch rows")
    return manifest


def git_show(arm: str, commit: str, path: str) -> str:
    """A file at this arm's pinned commit, read from the commit, never the checkout."""

    proc = subprocess.run(
        ["git", "-C", ROOTS[arm], "show", f"{commit}:{path}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise DesignError(
            f"{arm}: cannot read {path} at {commit} from {ROOTS[arm]}: "
            f"{proc.stderr.strip()}"
        )
    return proc.stdout


def expected_brainstorming_line(arm: str, commit: str) -> str:
    """The listing line Claude Code renders for the brainstorming skill at this arm's pinned commit."""

    for line in git_show(arm, commit, "skills/brainstorming/SKILL.md").splitlines():
        if line.startswith("description:"):
            value = line[len("description:") :].strip()
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            return f"{BRAINSTORMING_LINE}: {value}"
    raise DesignError(
        f"{arm}: no description line in skills/brainstorming/SKILL.md at {commit}"
    )


def expected_bootstrap(arm: str, commit: str) -> str:
    """The full bootstrap text the SessionStart hook injects for this arm."""

    text = git_show(arm, commit, "skills/using-hyperpowers/SKILL.md")
    if not text.strip():
        raise DesignError(f"{arm}: empty skills/using-hyperpowers/SKILL.md at {commit}")
    return text


def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        loaded = json.load(handle)
    if not isinstance(loaded, dict):
        raise DesignError(f"{path}: expected a JSON object")
    return loaded


def iter_records(path: str):
    """Every JSON record of a transcript; a non-empty line that is not JSON is an error, not a skip."""

    with open(path, encoding="utf-8", errors="replace") as handle:
        for number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as error:
                raise DesignError(
                    f"{path}: malformed transcript record at line {number} ({error.msg})"
                ) from None


def first_action(transcript: str) -> str:
    for rec in iter_records(transcript):
        if rec.get("type") != "assistant":
            continue
        for part in (rec.get("message") or {}).get("content") or []:
            if part.get("type") != "tool_use":
                continue
            name = part.get("name")
            if name == "Skill":
                return f"Skill({(part.get('input') or {}).get('skill')})"
            if name in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
                return "direct-edit"
            return f"explore({name})"
    return "none"


def context(transcript: str) -> tuple[str, list[str], str, str, str]:
    """(payload hash, every payload text, listing hash outside the brainstorming line, brainstorming line, model).

    The first hook context is the payload the hash records; every hook context
    (a compaction re-injects the bootstrap) is returned so each can be checked
    for the pinned bootstrap. Every skill listing in the session must be the
    same listing and carry exactly one brainstorming line; every assistant
    record must name the same model.
    """

    payload = ""
    payload_texts: list[str] = []
    listings: set[str] = set()
    models: set[str] = set()
    for rec in iter_records(transcript):
        att = rec.get("attachment") or {}
        if att.get("type") == "hook_additional_context":
            content = att.get("content")
            if not payload:
                payload = hashlib.sha256(
                    json.dumps(content, sort_keys=True).encode()
                ).hexdigest()[:12]
            if isinstance(content, list):
                payload_texts.append("\n".join(str(item) for item in content))
            else:
                payload_texts.append(str(content))
        if att.get("type") == "skill_listing":
            listings.add(att.get("content") or "")
        if rec.get("type") == "assistant":
            models.add((rec.get("message") or {}).get("model") or "")
    if len(listings) > 1:
        raise DesignError(
            f"{transcript}: the session received {len(listings)} different skill listings"
        )
    if len(models) > 1:
        raise DesignError(
            f"{transcript}: models differ within the session: {sorted(models)}"
        )
    listing = next(iter(listings)) if listings else ""
    lines = listing.split("\n")
    own = [line for line in lines if is_brainstorming_line(line)]
    if listing and len(own) != 1:
        raise DesignError(
            f"{transcript}: the listing has {len(own)} brainstorming lines, expected exactly one"
        )
    rest = [line for line in lines if not is_brainstorming_line(line)]
    brainstorming = own[0] if own else ""
    listing_rest = (
        hashlib.sha256("\n".join(rest).encode()).hexdigest()[:12] if listing else ""
    )
    model = next(iter(models)) if models else ""
    return payload, payload_texts, listing_rest, brainstorming, model


def token_total(run_dir: str) -> int | None:
    path = os.path.join(run_dir, "coding-agent-token-usage.json")
    if not os.path.exists(path):
        return None
    usage = load_json(path)
    total = usage.get("total_tokens") or usage.get("total")
    if isinstance(total, (int, float)):
        return int(total)
    return int(sum(v for v in usage.values() if isinstance(v, (int, float))))


def read_logs(manifest: dict) -> list[tuple[str, str, str, str, bool, int, str]]:
    """Return (arm, scenario, budget, run dir, is_rerun, repeat, log name) for every run of every valid log."""

    rows: list[tuple[str, str, str, str, bool, int, str]] = []
    seen_rows: set[tuple[str, str, str]] = set()
    for log in sorted(glob.glob(os.path.join(E, "logs", "*.log"))):
        match = LOG_RE.fullmatch(os.path.basename(log))
        if not match:
            raise DesignError(
                f"{log}: not a launch log name (<arm>-<scenario>-<p|r><n>.log)"
            )
        arm, scenario, proc = match.group(1), match.group(2), match.group(3)
        with open(log, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
        header = HEADER_RE.search(text)
        if not header or (header.group(1), header.group(2), header.group(4)) != (
            arm,
            scenario,
            proc,
        ):
            raise DesignError(f"{log}: header does not match the file name")
        repeat = int(header.group(3))
        budget = header.group(5)
        root = ROOT_RE.search(text)
        if not root or root.group(1) != manifest["commits"][arm]:
            raise DesignError(
                f"{log}: root pin missing or not the manifest's {arm} commit"
            )
        harness = HARNESS_RE.search(text)
        if not harness or harness.group(1) != manifest["commits"]["harness"]:
            raise DesignError(f"{log}: harness pin missing or not the manifest's")
        last_line = text.rstrip("\n").rsplit("\n", 1)[-1]
        if last_line != f"DONE {arm} {scenario} {proc}":
            raise DesignError(
                f"{log}: the last line is {last_line!r}, not this log's DONE line"
            )
        is_rerun = proc.startswith("r")
        if is_rerun:
            if repeat != 1:
                raise DesignError(f"{log}: a rerun log must have repeat=1")
        else:
            expected = manifest["rows"].get((arm, scenario, proc))
            if expected is None:
                raise DesignError(f"{log}: not a manifest row")
            if expected != (repeat, budget):
                raise DesignError(
                    f"{log}: repeat {repeat} budget {budget}, manifest says {expected}"
                )
            seen_rows.add((arm, scenario, proc))
        found = [m.group(1).rstrip("/") for m in RUN_DIR_RE.finditer(text)]
        if len(found) != repeat:
            raise DesignError(f"{log}: {len(found)} runs recorded, repeat was {repeat}")
        for run_dir in found:
            rows.append(
                (
                    arm,
                    scenario,
                    budget,
                    run_dir,
                    is_rerun,
                    repeat,
                    os.path.basename(log),
                )
            )
    missing = set(manifest["rows"]) - seen_rows
    if missing:
        raise DesignError(f"manifest rows without a log: {sorted(missing)}")
    return rows


def read_reruns() -> dict[str, str]:
    """replacement run name -> original run name."""

    path = os.path.join(E, "reruns.tsv")
    replaced: dict[str, str] = {}
    if not os.path.exists(path):
        return replaced
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if not line.strip() or line.startswith("#"):
                continue
            original, replacement = line.split()[:2]
            if replacement in replaced:
                raise DesignError(f"reruns.tsv: {replacement} listed twice")
            replaced[replacement] = original
    return replaced


def build_runs(manifest: dict) -> list[Run]:
    replaced = read_reruns()
    boots = {
        arm: expected_bootstrap(arm, manifest["commits"][arm])
        for arm in ("control", "treatment")
    }
    runs: list[Run] = []
    seen: set[str] = set()
    indexes: dict[str, list[int]] = {}
    repeats: dict[str, int] = {}
    for arm, scenario, budget, run_dir, is_rerun, repeat, log_name in read_logs(
        manifest
    ):
        if not os.path.isabs(run_dir):
            run_dir = os.path.join(EV, run_dir)
        name = os.path.basename(run_dir)
        if not os.path.isdir(run_dir):
            # The live results/ tree is pruned over time; the archive committed
            # beside this script is the durable copy of the same run.
            run_dir = os.path.join(E, ARCHIVES, scenario, arm, name)
        if name in seen:
            raise DesignError(f"{name}: listed twice")
        seen.add(name)
        if is_rerun and name not in replaced:
            raise DesignError(f"{name}: a rerun not listed in reruns.tsv")
        if not is_rerun and name in replaced:
            raise DesignError(
                f"{name}: listed as a replacement but launched as a manifest row"
            )
        verdict_path = os.path.join(run_dir, "verdict.json")
        if not os.path.exists(verdict_path):
            raise DesignError(f"{name}: no verdict.json")
        verdict = load_json(verdict_path)
        final = str(verdict.get("final"))
        if final not in ("pass", "fail", "indeterminate"):
            raise DesignError(f"{name}: unexpected final verdict {final!r}")
        reason = str(verdict.get("final_reason") or "")
        grader = verdict.get("gauntlet")
        summary = str(grader.get("summary") or "") if isinstance(grader, dict) else ""
        grader_exited = (
            final == "indeterminate"
            and isinstance(grader, dict)
            and not summary.strip()
            and not grader.get("run_id")
        )
        if VOID_RE.search(reason) or VOID_RE.search(summary) or grader_exited:
            why = reason or summary or "the grader exited without a summary or run id"
            raise DesignError(
                f"{name}: void attempt left in the logs ({why[:80]!r}); "
                "move its log to logs/failed/ and relaunch the row"
            )
        if verdict.get("scenario") != scenario:
            raise DesignError(
                f"{name}: verdict.json names scenario {verdict.get('scenario')!r}, "
                f"the log {log_name} names {scenario!r}"
            )
        if verdict.get("coding_agent") != CODING_AGENT:
            raise DesignError(
                f"{name}: coding agent {verdict.get('coding_agent')!r}, "
                f"the design says {CODING_AGENT!r}"
            )
        trial = verdict.get("trial") or {}
        index = trial.get("index")
        count = trial.get("count")
        if type(count) is not int or count != repeat or type(index) is not int:
            raise DesignError(
                f"{name}: trial identity {trial!r} does not fit a log with repeat {repeat}"
            )
        indexes.setdefault(log_name, []).append(index)
        repeats[log_name] = repeat
        transcripts = glob.glob(
            os.path.join(run_dir, "home/.claude/projects/*/*.jsonl")
        )
        if not transcripts:
            raise DesignError(f"{name}: no transcript")
        payload, payload_texts, listing_rest, brainstorming, model = context(
            transcripts[0]
        )
        if not payload or not listing_rest or not brainstorming:
            raise DesignError(f"{name}: payload, listing or brainstorming line missing")
        for text in payload_texts:
            if boots[arm] not in text:
                raise DesignError(
                    f"{name}: a hook payload does not contain the pinned bootstrap of {arm}"
                )
        runs.append(
            Run(
                arm,
                scenario,
                budget,
                name,
                final,
                first_action(transcripts[0]),
                token_total(run_dir),
                payload,
                listing_rest,
                brainstorming,
                model,
                replaced.get(name),
            )
        )
    for log_name, found in indexes.items():
        if sorted(found) != list(range(1, repeats[log_name] + 1)):
            raise DesignError(
                f"{log_name}: trial indexes {sorted(found)} are not 1..{repeats[log_name]}"
            )
    for replacement in replaced:
        if replacement not in seen:
            raise DesignError(
                f"reruns.tsv names a replacement with no log: {replacement}"
            )
    return runs


def collapse(runs: list[Run]) -> list[Run]:
    """One outcome per trial: a replacement stands in for its original."""

    by_name = {run.run: run for run in runs}
    replaced_originals: set[str] = set()
    for run in runs:
        if not run.replaces:
            continue
        original = by_name.get(run.replaces)
        if original is None:
            raise DesignError(f"reruns.tsv names an unknown original {run.replaces}")
        if original.replaces:
            raise DesignError(
                f"{run.run} replaces {run.replaces}, itself a replacement; "
                "the rule is one rerun"
            )
        if original.final != "indeterminate":
            raise DesignError(f"{run.replaces} was replaced but was not indeterminate")
        if (original.arm, original.scenario) != (run.arm, run.scenario):
            raise DesignError(f"{run.run} replaces a trial of another arm or scenario")
        if original.budget != run.budget:
            raise DesignError(f"{run.run} replaces a trial of another budget")
        if run.replaces in replaced_originals:
            raise DesignError(
                f"{run.replaces} was replaced twice; the rule is one rerun"
            )
        replaced_originals.add(run.replaces)
    for run in runs:
        if (
            run.final == "indeterminate"
            and not run.replaces
            and run.run not in replaced_originals
        ):
            raise DesignError(
                f"{run.run}: indeterminate and never re-run; the rule is one rerun"
            )
    return [run for run in runs if run.run not in replaced_originals]


def check_deltas(manifest: dict, runs: list[Run], trials: list[Run]) -> None:
    """Every row added after the base design is the consequence the rules allow, and every consequence has its row."""

    by_name = {run.run: run for run in runs}
    replacement_of = {run.replaces: run for run in runs if run.replaces}
    per_cell: dict[tuple[str, str, str], int] = {}
    named: set[str] = set()
    for cell, proc, original_name in manifest["topups"]:
        per_cell[cell] = per_cell.get(cell, 0) + 1
        if per_cell[cell] > MAX_TOPUPS:
            raise DesignError(f"{cell}: more than {MAX_TOPUPS} top-ups")
        original = by_name.get(original_name)
        if original is None:
            raise DesignError(f"top-up {proc} names an unknown run {original_name}")
        if (original.arm, original.scenario, original.budget) != cell:
            raise DesignError(f"top-up {proc} names {original_name} from another cell")
        replacement = replacement_of.get(original_name)
        if (
            original.final != "indeterminate"
            or replacement is None
            or replacement.final != "indeterminate"
        ):
            raise DesignError(
                f"top-up {proc}: {original_name} was not indeterminate twice"
            )
        if original_name in named:
            raise DesignError(f"{original_name} has more than one top-up")
        named.add(original_name)
    for run in runs:
        if run.replaces or run.final != "indeterminate":
            continue
        replacement = replacement_of.get(run.run)
        if replacement is None or replacement.final != "indeterminate":
            continue
        cell = (run.arm, run.scenario, run.budget)
        if run.run not in named and per_cell.get(cell, 0) < MAX_TOPUPS:
            raise DesignError(f"{run.run}: indeterminate twice and has no top-up row")
    failed = {
        t.scenario
        for t in trials
        if t.arm == "treatment"
        and t.budget == "default"
        and t.scenario in NON_SENTINEL
        and t.final == "fail"
    }
    rows_for: dict[str, int] = {}
    for scenario, proc in manifest["control_runs"]:
        rows_for[scenario] = rows_for.get(scenario, 0) + 1
        if scenario not in NON_SENTINEL:
            raise DesignError(
                f"control run {proc}: {scenario} is not a non-sentinel regression scenario"
            )
        if scenario not in failed:
            raise DesignError(
                f"control run {proc}: {scenario} has no failed treatment trial (control run without a treatment failure)"
            )
        if rows_for[scenario] > 1:
            raise DesignError(f"{scenario}: more than one control run")
    for scenario in sorted(failed - set(rows_for)):
        raise DesignError(
            f"{scenario}: treatment failed under the default budget and the control run is missing"
        )


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    den = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / den
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (max(0.0, centre - half), min(1.0, centre + half))


def check_design(manifest: dict, runs: list[Run], trials: list[Run]) -> None:
    """Counts on the collapsed trials; the measurement context on every run; the deltas justified.

    A replaced indeterminate original still ran under the instrument, so its
    payload, listing, brainstorming line, and model must match its cell too.
    """

    expected = manifest["trials"]
    for (scenario, arm, budget), count in expected.items():
        have = [
            t
            for t in trials
            if t.scenario == scenario and t.arm == arm and t.budget == budget
        ]
        if len(have) != count:
            raise DesignError(
                f"{scenario}/{arm}/{budget}: {len(have)} trials, design says {count}"
            )
    for t in trials:
        if (t.scenario, t.arm, t.budget) not in expected:
            raise DesignError(
                f"{t.scenario}/{t.arm}/{t.budget}: not in the declared design"
            )
    boots = {
        arm: expected_bootstrap(arm, manifest["commits"][arm])
        for arm in ("control", "treatment")
    }
    hashes: dict[str, set[str]] = {}
    for arm in ("control", "treatment"):
        if not any(t.arm == arm for t in trials):
            raise DesignError(f"{arm}: no trials")
        hashes[arm] = {r.payload for r in runs if r.arm == arm}
        if len(hashes[arm]) != 1:
            raise DesignError(f"{arm}: payload hashes differ: {sorted(hashes[arm])}")
    if (
        boots["control"] != boots["treatment"]
        and hashes["control"] == hashes["treatment"]
    ):
        raise DesignError("the arms share a payload although their bootstraps differ")
    rendered = {
        arm: expected_brainstorming_line(arm, manifest["commits"][arm])
        for arm in ("control", "treatment")
    }
    for budget in BUDGETS:
        budget_runs = [r for r in runs if r.budget == budget]
        if not budget_runs:
            continue
        rests = {r.listing_rest for r in budget_runs}
        if len(rests) != 1:
            raise DesignError(
                f"{budget}: listings differ outside the brainstorming line: {sorted(rests)}"
            )
        if budget == "default":
            lines = {r.brainstorming_line for r in budget_runs}
            if len(lines) != 1:
                raise DesignError(
                    f"default: brainstorming lines differ across arms: {sorted(lines)}"
                )
            line = next(iter(lines))
            for arm in ("control", "treatment"):
                if any(r.arm == arm for r in budget_runs) and line == rendered[arm]:
                    raise DesignError(
                        f"{arm}/default: default listing rendered the description; "
                        "the production budget condition did not hold"
                    )
        else:
            for arm in ("control", "treatment"):
                lines = {r.brainstorming_line for r in budget_runs if r.arm == arm}
                if lines and lines != {rendered[arm]}:
                    raise DesignError(
                        f"{arm}/raised: brainstorming line {sorted(lines)}, expected {rendered[arm]!r}"
                    )
    models = {r.model for r in runs}
    if models != {manifest["model"]}:
        raise DesignError(f"models differ from the design: {sorted(models)}")
    check_deltas(manifest, runs, trials)


def rate(
    trials: list[Run], scenario: str, arm: str, budget: str, outcome: str
) -> tuple[int, int]:
    """(count of trials with this outcome, gradable trials) for one cell."""

    cell = [
        t
        for t in trials
        if t.scenario == scenario and t.arm == arm and t.budget == budget
    ]
    gradable = [t for t in cell if t.final in ("pass", "fail")]
    return sum(1 for t in gradable if t.final == outcome), len(gradable)


def pct(k: int, n: int) -> str:
    return f"{k}/{n} = {100 * k / n:.0f}%" if n else f"{k}/0 (no gradable trials)"


def criteria_lines(trials: list[Run]) -> list[str]:
    """The spec's acceptance criteria, each with its numbers; a miss is a result, not an error."""

    out = [
        "criteria (rates over gradable trials; sentinel holds under criterion 4 are adjudicated in the note):"
    ]
    k, n = rate(trials, CHECKBOX, "treatment", "raised", "fail")
    out.append(
        f"1 checkbox raised, treatment triggered: {pct(k, n)} [bar <= 20%] -> {'met' if n and k / n <= 0.20 else 'not met'}"
    )
    for scenario in (TIMEOUT, EXPORT):
        k, n = rate(trials, scenario, "treatment", "raised", "pass")
        out.append(
            f"2 {scenario} raised, treatment gated: {pct(k, n)} [bar >= 70%] -> {'met' if n and k / n >= 0.70 else 'not met'}"
        )
    k, n = rate(trials, TWIN, "treatment", "raised", "fail")
    out.append(
        f"3 twin raised, treatment failures: {pct(k, n)} [bar 0] -> {'met' if n and k == 0 else 'not met'}"
    )
    routers = sorted(
        {t.scenario for t in trials if t.scenario.startswith(ROUTER_PREFIX)}
    )
    for scenario in routers:
        kt, nt = rate(trials, scenario, "treatment", "raised", "pass")
        kc, nc = rate(trials, scenario, "control", "raised", "pass")
        met = nt > 0 and nc > 0 and kt / nt >= kc / nc
        out.append(
            f"3 {scenario} raised, treatment pass {pct(kt, nt)} against control {pct(kc, nc)} [bar >= control] -> {'met' if met else 'not met'}"
        )
    regression = sorted(
        {t.scenario for t in trials if t.budget == "default" and t.arm == "treatment"}
        - {CHECKBOX, TIMEOUT, EXPORT}
    )
    for scenario in regression:
        cell = [
            t
            for t in trials
            if t.scenario == scenario and t.arm == "treatment" and t.budget == "default"
        ]
        finals = ",".join(sorted(t.final for t in cell))
        kind = "sentinel" if scenario in SENTINEL_REGRESSION else "non-sentinel"
        control = [
            t
            for t in trials
            if t.scenario == scenario and t.arm == "control" and t.budget == "default"
        ]
        control_note = (
            f"; control run: {','.join(sorted(t.final for t in control))}"
            if control
            else ""
        )
        out.append(
            f"4 regression default, treatment {scenario} ({kind}): {finals} [bar pass]{control_note}"
        )
    k, n = rate(trials, CHECKBOX, "treatment", "default", "fail")
    out.append(
        f"5 checkbox default, treatment triggered: {pct(k, n)} [bar <= 20%] -> {'met' if n and k / n <= 0.20 else 'not met'}"
    )
    for scenario in (TIMEOUT, EXPORT):
        k, n = rate(trials, scenario, "treatment", "default", "pass")
        out.append(
            f"5 {scenario} default, treatment gated: {pct(k, n)} [bar >= 80%] -> {'met' if n and k / n >= 0.80 else 'not met'}"
        )
    out.append("6 context checks: passed (the design checks above raised no error)")
    return out


FIXTURE_HARNESS = "3" * 40
FIXTURE_LISTINGS = {
    "raised": "- other:skill: text\n- hyperpowers:brainstorming: DESC",
    "default": "- other:skill: text\n- hyperpowers:brainstorming",
}


def _fixture_boot(arm: str) -> str:
    with open(
        os.path.join(ROOTS[arm], "skills/using-hyperpowers/SKILL.md"), encoding="utf-8"
    ) as handle:
        return handle.read()


def _fixture_commit(arm: str) -> str:
    return subprocess.run(
        ["git", "-C", ROOTS[arm], "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()


def _fixture_transcript(arm: str, budget: str) -> str:
    return "\n".join(
        [
            json.dumps(
                {
                    "type": "attachment",
                    "attachment": {
                        "type": "hook_additional_context",
                        "content": [f"<wrap>\n{_fixture_boot(arm)}</wrap>"],
                    },
                }
            ),
            json.dumps(
                {
                    "type": "attachment",
                    "attachment": {
                        "type": "skill_listing",
                        "content": FIXTURE_LISTINGS[budget],
                    },
                }
            ),
            json.dumps(
                {
                    "type": "assistant",
                    "message": {
                        "model": "model-x",
                        "content": [{"type": "tool_use", "name": "Bash"}],
                    },
                }
            ),
        ]
    )


def _fixture_run(
    root: str, arm: str, name: str, final: str, index: int, count: int, budget: str
) -> str:
    run_dir = os.path.join(root, "results", name)
    os.makedirs(os.path.join(run_dir, "home/.claude/projects/p"), exist_ok=True)
    with open(os.path.join(run_dir, "verdict.json"), "w", encoding="utf-8") as handle:
        json.dump(
            {
                "final": final,
                "scenario": "scenario-x",
                "coding_agent": CODING_AGENT,
                "trial": {"index": index, "count": count},
                "gauntlet": {
                    "status": "investigate" if final == "indeterminate" else final,
                    "summary": "the grader reached a verdict or ran out of budget",
                    "run_id": f"grader-{name}",
                },
            },
            handle,
        )
    with open(
        os.path.join(run_dir, "home/.claude/projects/p/t.jsonl"), "w", encoding="utf-8"
    ) as handle:
        handle.write(_fixture_transcript(arm, budget) + "\n")
    return run_dir


def _fixture_log(
    root: str, arm: str, proc: str, budget: str, run_dirs: list[str]
) -> None:
    with open(
        os.path.join(root, "logs", f"{arm}-scenario-x-{proc}.log"),
        "w",
        encoding="utf-8",
    ) as handle:
        handle.write(
            f"arm={arm} scenario=scenario-x repeat={len(run_dirs)} proc={proc} budget={budget}\n"
        )
        handle.write(f"root={_fixture_commit(arm)} root_clean=0\n")
        handle.write(
            f"harness_pin={FIXTURE_HARNESS} evals_head={FIXTURE_HARNESS} harness_paths_identical=yes\n"
        )
        handle.write(
            "\n".join(f"run-dir   {d}" for d in run_dirs)
            + f"\nEXIT=0\nDONE {arm} scenario-x {proc}\n"
        )


def _fixture_add_row(
    root: str, arm: str, proc: str, budget: str, final: str, comment: str | None
) -> None:
    """Append a row (with its justification comment, if any) to manifest.tsv and create its run and log."""

    with open(os.path.join(root, "manifest.tsv"), "a", encoding="utf-8") as handle:
        if comment is not None:
            handle.write(comment + "\n")
        handle.write(f"{arm}\tscenario-x\t1\t{proc}\t{budget}\n")
    run_dir = _fixture_run(root, arm, f"run-{arm}-{proc}", final, 1, 1, budget)
    _fixture_log(root, arm, proc, budget, [run_dir])


def _write_fixture(
    root: str,
    final_by_run: dict[str, str],
    reruns: str | None,
    mutate: Callable[[str], None] | None = None,
) -> None:
    """A minimal evidence tree: both arms, one log per proc, one run per verdict.

    ``final_by_run`` describes the control arm under the raised budget; names
    starting with ``rerun-`` each get their own rerun log (r1, r2, ...). The
    treatment arm always has one passing raised trial (``run-t``, p1) and one
    passing default-budget trial (``run-d``, p2); the control arm also has one
    passing default-budget trial (``run-c``, p2). Default listings carry the
    bare brainstorming name. Each arm's root is a git repository holding its
    own bootstrap and description; each run's payload contains its arm's
    bootstrap. ``manifest.base.tsv`` equals the manifest as written; ``mutate``
    runs last and breaks the tree on purpose.
    """

    os.makedirs(os.path.join(root, "logs"), exist_ok=True)
    for arm in ("control", "treatment"):
        arm_root = ROOTS[arm]
        for sub in ("skills/brainstorming", "skills/using-hyperpowers"):
            os.makedirs(os.path.join(arm_root, sub), exist_ok=True)
        with open(
            os.path.join(arm_root, "skills/brainstorming/SKILL.md"),
            "w",
            encoding="utf-8",
        ) as handle:
            handle.write("---\nname: brainstorming\ndescription: DESC\n---\n")
        with open(
            os.path.join(arm_root, "skills/using-hyperpowers/SKILL.md"),
            "w",
            encoding="utf-8",
        ) as handle:
            handle.write(f"---\nname: using-hyperpowers\n---\nBOOT-{arm}\n")
        git = [
            "git",
            "-C",
            arm_root,
            "-c",
            "user.name=fixture",
            "-c",
            "user.email=fixture@example.com",
            "-c",
            "commit.gpgsign=false",
        ]
        subprocess.run(git + ["init", "-q"], check=True)
        subprocess.run(git + ["add", "skills"], check=True)
        subprocess.run(git + ["commit", "-q", "-m", "fixture"], check=True)
    originals = [name for name in final_by_run if not name.startswith("rerun-")]
    manifest_text = (
        f"harness\t{FIXTURE_HARNESS}\ncontrol\t{_fixture_commit('control')}\n"
        f"treatment\t{_fixture_commit('treatment')}\nmodel\tmodel-x\n"
        f"control\tscenario-x\t{len(originals)}\tp1\traised\n"
        "treatment\tscenario-x\t1\tp1\traised\n"
        "treatment\tscenario-x\t1\tp2\tdefault\n"
        "control\tscenario-x\t1\tp2\tdefault\n"
    )
    for filename in ("manifest.tsv", BASE_MANIFEST):
        with open(os.path.join(root, filename), "w", encoding="utf-8") as handle:
            handle.write(manifest_text)
    global BASE_MANIFEST_SHA256, CONTROL_COMMIT, MODEL
    BASE_MANIFEST_SHA256 = hashlib.sha256(manifest_text.encode()).hexdigest()
    CONTROL_COMMIT = _fixture_commit("control")
    MODEL = "model-x"
    runs = [("control", name, final, "raised") for name, final in final_by_run.items()]
    runs.append(("treatment", "run-t", "pass", "raised"))
    runs.append(("treatment", "run-d", "pass", "default"))
    runs.append(("control", "run-c", "pass", "default"))
    logs: dict[tuple[str, str, str], list[tuple[str, str]]] = {}
    rerun_count = 0
    for arm, name, final, budget in runs:
        if name.startswith("rerun-"):
            rerun_count += 1
            proc = f"r{rerun_count}"
        elif name in ("run-d", "run-c"):
            proc = "p2"
        else:
            proc = "p1"
        logs.setdefault((arm, proc, budget), []).append((name, final))
    for (arm, proc, budget), members in logs.items():
        run_dirs = [
            _fixture_run(root, arm, name, final, index, len(members), budget)
            for index, (name, final) in enumerate(members, start=1)
        ]
        _fixture_log(root, arm, proc, budget, run_dirs)
    if reruns is not None:
        with open(os.path.join(root, "reruns.tsv"), "w", encoding="utf-8") as handle:
            handle.write(reruns)
    if mutate is not None:
        mutate(root)


def _rewrite(path: str, old: str, new: str) -> None:
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    if old not in text:
        raise RuntimeError(f"fixture mutation found no {old!r} in {path}")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text.replace(old, new))


def _set_verdict(root: str, name: str, **fields: object) -> None:
    path = os.path.join(root, "results", name, "verdict.json")
    verdict = load_json(path)
    verdict.update(fields)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(verdict, handle)


def _append_record(root: str, name: str, record: dict) -> None:
    path = os.path.join(root, "results", name, "home/.claude/projects/p/t.jsonl")
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")


def _criteria_check() -> list[str]:
    """The ship-decision arithmetic on synthetic trials: every expected line must be produced verbatim."""

    def run(scenario: str, arm: str, budget: str, final: str, name: str) -> Run:
        return Run(arm, scenario, budget, name, final, "x", None, "p", "l", "b", MODEL)

    trials: list[Run] = []
    trials += [
        run(CHECKBOX, "treatment", "raised", "fail" if i == 0 else "pass", f"cb-t{i}")
        for i in range(5)
    ]
    trials += [
        run(TIMEOUT, "treatment", "raised", "pass" if i < 3 else "fail", f"to-t{i}")
        for i in range(5)
    ]
    trials += [
        run(EXPORT, "treatment", "raised", "pass" if i < 4 else "fail", f"ex-t{i}")
        for i in range(5)
    ]
    trials += [run(TWIN, "treatment", "raised", "pass", f"tw-t{i}") for i in range(3)]
    trials += [
        run(
            ROUTER_PREFIX + "b1",
            "treatment",
            "raised",
            "pass" if i < 4 else "fail",
            f"b1-t{i}",
        )
        for i in range(5)
    ]
    trials += [
        run(ROUTER_PREFIX + "b1", "control", "raised", "pass", f"b1-c{i}")
        for i in range(5)
    ]
    trials.append(
        run(
            "triggering-test-driven-development",
            "treatment",
            "default",
            "pass",
            "reg-1",
        )
    )
    trials.append(
        run(
            "mid-conversation-skill-invocation", "treatment", "default", "fail", "reg-2"
        )
    )
    trials.append(
        run("mid-conversation-skill-invocation", "control", "default", "fail", "reg-2c")
    )
    trials += [
        run(CHECKBOX, "treatment", "default", "fail" if i < 3 else "pass", f"cb-d{i}")
        for i in range(10)
    ]
    trials += [
        run(TIMEOUT, "treatment", "default", "pass" if i < 4 else "fail", f"to-d{i}")
        for i in range(5)
    ]
    trials += [
        run(EXPORT, "treatment", "default", "pass", f"ex-d{i}") for i in range(5)
    ]
    trials.append(run(EXPORT, "treatment", "default", "indeterminate", "ex-d-ind"))
    lines = criteria_lines(trials)
    expected = [
        "1 checkbox raised, treatment triggered: 1/5 = 20% [bar <= 20%] -> met",
        f"2 {TIMEOUT} raised, treatment gated: 3/5 = 60% [bar >= 70%] -> not met",
        f"2 {EXPORT} raised, treatment gated: 4/5 = 80% [bar >= 70%] -> met",
        "3 twin raised, treatment failures: 0/3 = 0% [bar 0] -> met",
        f"3 {ROUTER_PREFIX}b1 raised, treatment pass 4/5 = 80% against control 5/5 = 100% [bar >= control] -> not met",
        "4 regression default, treatment triggering-test-driven-development (sentinel): pass [bar pass]",
        "4 regression default, treatment mid-conversation-skill-invocation (non-sentinel): fail [bar pass]; control run: fail",
        "5 checkbox default, treatment triggered: 3/10 = 30% [bar <= 20%] -> not met",
        f"5 {TIMEOUT} default, treatment gated: 4/5 = 80% [bar >= 80%] -> met",
        f"5 {EXPORT} default, treatment gated: 5/5 = 100% [bar >= 80%] -> met",
    ]
    return [line for line in expected if line not in lines]


def self_test() -> int:
    """The analysis must accept the clean cohorts and refuse each broken one for its own reason.

    Also proves the acceptance arithmetic on synthetic trials and runs the whole
    main path once on the clean cohort (table, criteria, runs.json).
    """

    import tempfile

    global E, ROOTS, NON_SENTINEL, BASE_MANIFEST_SHA256, CONTROL_COMMIT, MODEL
    saved = (E, ROOTS, NON_SENTINEL, BASE_MANIFEST_SHA256, CONTROL_COMMIT, MODEL)
    failures = 0
    missing = _criteria_check()
    if missing:
        failures += 1
        print(f"SELF-TEST FAILURE (criteria arithmetic): missing lines {missing}")
    else:
        print("criteria arithmetic: 10 expected lines produced")

    def done_then_failed(root: str) -> None:
        path = os.path.join(root, "logs", "control-scenario-x-p1.log")
        with open(path, "a", encoding="utf-8") as handle:
            handle.write("EXIT=9\nFAILED 9 control scenario-x p1\n")

    def stray_log(root: str) -> None:
        path = os.path.join(root, "logs", "control-scenario-x-p1.log.backup.log")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write("stale copy\n")

    def wrong_scenario(root: str) -> None:
        _set_verdict(root, "run-a", scenario="scenario-y")

    def zero_repeat(root: str) -> None:
        _rewrite(
            os.path.join(root, "manifest.tsv"),
            "control\tscenario-x\t2\tp1\traised",
            "control\tscenario-x\t0\tp1\traised",
        )

    def duplicate_index(root: str) -> None:
        _set_verdict(root, "run-a", trial={"index": 2, "count": 2})

    def boolean_identity(root: str) -> None:
        _set_verdict(root, "run-t", trial={"index": True, "count": True})

    def foreign_original(root: str) -> None:
        _rewrite(
            os.path.join(root, "results", "run-b", "home/.claude/projects/p/t.jsonl"),
            '</wrap>"]',
            '</wrap>", "extra"]',
        )

    def archived_only(root: str) -> None:
        src = os.path.join(root, "results", "run-a")
        dst = os.path.join(root, ARCHIVES, "scenario-x", "control", "run-a")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)

    def missing_bootstrap(root: str) -> None:
        _rewrite(
            os.path.join(root, "results", "run-a", "home/.claude/projects/p/t.jsonl"),
            "BOOT-control",
            "BOOT-nothing",
        )

    def default_renders_description(root: str) -> None:
        for name in ("run-d", "run-c"):
            _rewrite(
                os.path.join(root, "results", name, "home/.claude/projects/p/t.jsonl"),
                '"- other:skill: text\\n- hyperpowers:brainstorming"',
                '"- other:skill: text\\n- hyperpowers:brainstorming: DESC"',
            )

    def default_lines_differ(root: str) -> None:
        _rewrite(
            os.path.join(root, "results", "run-c", "home/.claude/projects/p/t.jsonl"),
            '"- other:skill: text\\n- hyperpowers:brainstorming"',
            '"- other:skill: text\\n- hyperpowers:brainstorming: OTHER"',
        )

    def rerun_other_budget(root: str) -> None:
        _rewrite(
            os.path.join(root, "logs", "control-scenario-x-r1.log"),
            "budget=raised",
            "budget=default",
        )

    def void_attempt(root: str) -> None:
        _set_verdict(
            root,
            "run-a",
            final="indeterminate",
            final_reason="quorum error (setup): setup.sh failed (exit 1)",
        )

    def grader_exited(root: str) -> None:
        _set_verdict(
            root,
            "run-a",
            final="indeterminate",
            final_reason="Gauntlet-Agent did not complete (status: investigate)",
            gauntlet={"status": "investigate", "summary": "", "run_id": None},
        )

    def unjustified_row(root: str) -> None:
        _fixture_add_row(root, "control", "p3", "raised", "pass", None)

    def topup_not_twice(root: str) -> None:
        _fixture_add_row(
            root,
            "control",
            "p3",
            "raised",
            "pass",
            "# top-up: run-a indeterminate twice",
        )

    def justified_topup(root: str) -> None:
        _fixture_add_row(
            root,
            "control",
            "p3",
            "raised",
            "pass",
            "# top-up: run-b indeterminate twice",
        )

    def four_topups(root: str) -> None:
        for i, name in enumerate(("run-a", "run-b", "run-c2", "run-d2"), start=3):
            _fixture_add_row(
                root,
                "control",
                f"p{i}",
                "raised",
                "pass",
                f"# top-up: {name} indeterminate twice",
            )

    def control_run_unneeded(root: str) -> None:
        _fixture_add_row(root, "control", "p3", "default", "pass", CONTROL_RUN_COMMENT)

    def treatment_failed_no_control(root: str) -> None:
        _set_verdict(root, "run-d", final="fail")

    def justified_control_run(root: str) -> None:
        _set_verdict(root, "run-d", final="fail")
        _fixture_add_row(root, "control", "p3", "default", "pass", CONTROL_RUN_COMMENT)

    def base_edited(root: str) -> None:
        with open(os.path.join(root, BASE_MANIFEST), "a", encoding="utf-8") as handle:
            handle.write("# edited after the fact\n")

    def wrong_model(root: str) -> None:
        _rewrite(
            os.path.join(root, "manifest.tsv"), "model\tmodel-x", "model\tother-model"
        )

    def wrong_control(root: str) -> None:
        _rewrite(
            os.path.join(root, "manifest.tsv"),
            f"control\t{CONTROL_COMMIT}\n",
            f"control\t{'9' * 40}\n",
        )

    def two_brainstorming_lines(root: str) -> None:
        _rewrite(
            os.path.join(root, "results", "run-a", "home/.claude/projects/p/t.jsonl"),
            '"- other:skill: text\\n- hyperpowers:brainstorming: DESC"',
            '"- other:skill: text\\n- hyperpowers:brainstorming: DESC\\n- hyperpowers:brainstorming: OLD"',
        )

    def later_model(root: str) -> None:
        _append_record(
            root,
            "run-a",
            {"type": "assistant", "message": {"model": "other-model", "content": []}},
        )

    def prefixed_other_skill(root: str) -> None:
        for name in ("run-d", "run-c"):
            _rewrite(
                os.path.join(root, "results", name, "home/.claude/projects/p/t.jsonl"),
                '"- other:skill: text\\n- hyperpowers:brainstorming"',
                '"- other:skill: text\\n- hyperpowers:brainstorming-old"',
            )

    def corrupt_record(root: str) -> None:
        path = os.path.join(root, "results", "run-a", "home/.claude/projects/p/t.jsonl")
        with open(path, "a", encoding="utf-8") as handle:
            handle.write('{"type": "assistant", "mess\n')

    def second_listing(root: str) -> None:
        _append_record(
            root,
            "run-a",
            {
                "type": "attachment",
                "attachment": {
                    "type": "skill_listing",
                    "content": "- other:skill: changed",
                },
            },
        )

    two_passes = {"run-a": "pass", "run-b": "pass"}
    one_replaced = {"run-a": "pass", "run-b": "indeterminate", "rerun-b": "fail"}
    twice = {"run-a": "pass", "run-b": "indeterminate", "rerun-b": "indeterminate"}
    four_twice = {
        "run-a": "indeterminate",
        "run-b": "indeterminate",
        "run-c2": "indeterminate",
        "run-d2": "indeterminate",
        "rerun-a": "indeterminate",
        "rerun-b": "indeterminate",
        "rerun-c2": "indeterminate",
        "rerun-d2": "indeterminate",
    }
    four_pairs = "run-a\trerun-a\nrun-b\trerun-b\nrun-c2\trerun-c2\nrun-d2\trerun-d2\n"
    cases: list[
        tuple[str, dict[str, str], str | None, Callable[[str], None] | None, str | None]
    ] = [
        (
            "a clean cohort with one replaced indeterminate",
            one_replaced,
            "run-b\trerun-b\n",
            None,
            None,
        ),
        (
            "an indeterminate trial never re-run",
            {"run-a": "pass", "run-b": "indeterminate"},
            None,
            None,
            "indeterminate and never re-run",
        ),
        (
            "a replacement whose original was not indeterminate",
            {"run-a": "pass", "rerun-a": "pass"},
            "run-a\trerun-a\n",
            None,
            "was replaced but was not indeterminate",
        ),
        (
            "a rerun not listed in reruns.tsv",
            {"run-a": "indeterminate", "rerun-a": "pass"},
            None,
            None,
            "a rerun not listed in reruns.tsv",
        ),
        (
            "a replacement that is itself replaced",
            {
                "run-a": "pass",
                "run-b": "indeterminate",
                "rerun-b": "indeterminate",
                "rerun-c": "pass",
            },
            "run-b\trerun-b\nrerun-b\trerun-c\n",
            None,
            "itself a replacement",
        ),
        (
            "a log whose last line is FAILED after an earlier DONE",
            two_passes,
            None,
            done_then_failed,
            "not this log's DONE line",
        ),
        (
            "a stray log beside the manifest logs",
            two_passes,
            None,
            stray_log,
            "not a launch log name",
        ),
        (
            "a run whose verdict names another scenario",
            two_passes,
            None,
            wrong_scenario,
            "verdict.json names scenario",
        ),
        (
            "a manifest row with repeat 0",
            two_passes,
            None,
            zero_repeat,
            "repeat must be 1..99",
        ),
        (
            "two runs of one log with the same trial index",
            two_passes,
            None,
            duplicate_index,
            "are not 1..2",
        ),
        (
            "a trial identity made of booleans",
            two_passes,
            None,
            boolean_identity,
            "trial identity",
        ),
        (
            "a replaced indeterminate whose bootstrap payload differs",
            one_replaced,
            "run-b\trerun-b\n",
            foreign_original,
            "payload hashes differ",
        ),
        (
            "a run present only in its archive under task-3-runs/",
            two_passes,
            None,
            archived_only,
            None,
        ),
        (
            "a payload without the pinned bootstrap",
            two_passes,
            None,
            missing_bootstrap,
            "does not contain the pinned bootstrap",
        ),
        (
            "a default-budget run whose listing rendered the description",
            two_passes,
            None,
            default_renders_description,
            "default listing rendered the description",
        ),
        (
            "default-budget brainstorming lines that differ across arms",
            two_passes,
            None,
            default_lines_differ,
            "differ across arms",
        ),
        (
            "a rerun under another budget than its original",
            one_replaced,
            "run-b\trerun-b\n",
            rerun_other_budget,
            "another budget",
        ),
        (
            "a void attempt left in the logs",
            two_passes,
            None,
            void_attempt,
            "void attempt",
        ),
        (
            "a grader that exited without a summary or run id",
            two_passes,
            None,
            grader_exited,
            "void attempt",
        ),
        (
            "an added manifest row without a justification",
            two_passes,
            None,
            unjustified_row,
            "no justification comment",
        ),
        (
            "a top-up naming a run that was not indeterminate twice",
            two_passes,
            None,
            topup_not_twice,
            "was not indeterminate twice",
        ),
        (
            "a justified top-up after a twice-indeterminate trial",
            twice,
            "run-b\trerun-b\n",
            justified_topup,
            None,
        ),
        (
            "a twice-indeterminate trial with no top-up row",
            twice,
            "run-b\trerun-b\n",
            None,
            "has no top-up row",
        ),
        (
            "a fourth top-up in one cell",
            four_twice,
            four_pairs,
            four_topups,
            "more than 3 top-ups",
        ),
        (
            "a control run while the treatment default trial passed",
            two_passes,
            None,
            control_run_unneeded,
            "without a treatment failure",
        ),
        (
            "a failed non-sentinel treatment trial without a control run",
            two_passes,
            None,
            treatment_failed_no_control,
            "control run is missing",
        ),
        (
            "a justified control run after a non-sentinel treatment failure",
            two_passes,
            None,
            justified_control_run,
            None,
        ),
        (
            "a base manifest edited after the fact",
            two_passes,
            None,
            base_edited,
            "digest",
        ),
        (
            "a manifest whose model is not the design's",
            two_passes,
            None,
            wrong_model,
            "is not the design's",
        ),
        (
            "a manifest whose control pin is not the design's",
            two_passes,
            None,
            wrong_control,
            "control commit",
        ),
        (
            "a listing with two brainstorming lines",
            two_passes,
            None,
            two_brainstorming_lines,
            "brainstorming lines, expected exactly one",
        ),
        (
            "a later assistant turn on another model",
            two_passes,
            None,
            later_model,
            "models differ within the session",
        ),
        (
            "a default listing whose only brainstorming-like line is another prefixed skill",
            two_passes,
            None,
            prefixed_other_skill,
            "brainstorming lines, expected exactly one",
        ),
        (
            "a transcript with a corrupt trailing record",
            two_passes,
            None,
            corrupt_record,
            "malformed transcript record",
        ),
        (
            "a second skill listing that differs",
            two_passes,
            None,
            second_listing,
            "different skill listings",
        ),
    ]
    for title, verdicts, reruns, mutate, expect in cases:
        with tempfile.TemporaryDirectory() as tmp:
            E = tmp
            ROOTS = {
                "control": os.path.join(tmp, "control-root"),
                "treatment": os.path.join(tmp, "treatment-root"),
            }
            NON_SENTINEL = frozenset({"scenario-x"})
            _write_fixture(tmp, verdicts, reruns, mutate)
            detail = ""
            try:
                manifest = read_manifest()
                runs = build_runs(manifest)
                check_design(manifest, runs, collapse(runs))
                accepted = True
            except DesignError as error:
                accepted = False
                detail = f": {error}"
            if accepted and title.startswith("a clean cohort"):
                captured = io.StringIO()
                argv = sys.argv
                sys.argv = ["analyze.py"]
                try:
                    with contextlib.redirect_stdout(captured):
                        code = main()
                finally:
                    sys.argv = argv
                text = captured.getvalue()
                if (
                    code != 0
                    or "design checks passed" not in text
                    or not os.path.exists(os.path.join(tmp, "runs.json"))
                ):
                    accepted = False
                    detail = f": main() returned {code}; runs.json present: {os.path.exists(os.path.join(tmp, 'runs.json'))}"
                else:
                    title = title + ", through main(): table, criteria, runs.json"
        if expect is None:
            as_expected = accepted
        else:
            as_expected = not accepted and expect in detail
        if as_expected:
            verb = "accepted as expected" if accepted else "refused as expected"
            print(f"{verb} ({title}){detail}")
        else:
            print(
                f"SELF-TEST FAILURE ({title}): accepted={accepted}, "
                f"expected {expect!r}{detail}"
            )
            failures += 1
    E, ROOTS, NON_SENTINEL, BASE_MANIFEST_SHA256, CONTROL_COMMIT, MODEL = saved
    return 1 if failures else 0


def print_archives() -> int:
    """Print scenario/arm/run for every run in runs.json: the archive set Task 3 must stage under task-3-runs/."""

    with open(os.path.join(E, "runs.json"), encoding="utf-8") as handle:
        runs = json.load(handle)
    if not isinstance(runs, list) or not runs:
        raise DesignError("runs.json is missing or empty; run the analysis first")
    for run in runs:
        print(f"{run['scenario']}/{run['arm']}/{run['run']}")
    return 0


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
        return self_test()
    if len(sys.argv) > 1 and sys.argv[1] == "--archives":
        return print_archives()
    manifest = read_manifest()
    runs = build_runs(manifest)
    trials = collapse(runs)
    check_design(manifest, runs, trials)
    with open(os.path.join(E, "runs.json"), "w", encoding="utf-8") as handle:
        json.dump([asdict(run) for run in runs], handle, indent=1)
    print(
        f"{'scenario':50s} {'arm':9s} {'budget':7s} {'n':>3s} {'fail':>4s} {'pass':>4s} "
        f"{'ind':>3s}  {'fail 95% CI':13s}  first actions"
    )
    cells = sorted({(t.scenario, t.arm, t.budget) for t in trials})
    for scenario, arm, budget in cells:
        cell = [
            t
            for t in trials
            if t.scenario == scenario and t.arm == arm and t.budget == budget
        ]
        fails = sum(1 for t in cell if t.final == "fail")
        passes = sum(1 for t in cell if t.final == "pass")
        ind = len(cell) - fails - passes
        gradable = fails + passes
        lo, hi = wilson(fails, gradable)
        ci = (
            f"{100 * fails / gradable:3.0f}% [{100 * lo:.0f}-{100 * hi:.0f}]"
            if gradable
            else "no gradable trials"
        )
        actions: dict[str, int] = {}
        for t in cell:
            actions[t.first_action] = actions.get(t.first_action, 0) + 1
        print(
            f"{scenario:50s} {arm:9s} {budget:7s} {len(cell):3d} {fails:4d} {passes:4d} "
            f"{ind:3d}  {ci:13s}  {actions}"
        )
    print()
    for line in criteria_lines(trials):
        print(line)
    print()
    print(
        "design checks passed: every manifest row logged once with its pins and "
        "budget, every added row justified, no void attempt counted, the pinned "
        "bootstrap in every payload with one hash per arm, one listing per budget, "
        "expected brainstorming line per arm and budget, expected counts"
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DesignError as error:
        print(f"DESIGN ERROR: {error}", file=sys.stderr)
        sys.exit(1)
