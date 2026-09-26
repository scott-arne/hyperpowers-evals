#!/usr/bin/env python3
"""Fail-closed analysis for the adoption-remediation bootstrap-ladder measurement.

Reads ``manifest.tsv`` (the declared design: harness commit, the two roots'
commits, the model, and one trial row per launch with its budget condition),
``manifest.base.tsv`` (the design as planned, against which every later row
must justify itself), ``prior-controls.tsv`` (the control cells this campaign
cites instead of re-running), ``sentinel-batch.txt`` (the `quorum run-all`
batch criterion 4 is judged against, and on its second line the treatment
commit that batch ran at), the per-process logs
under ``logs/``, and ``reruns.tsv`` (original run -> replacement run). Every
log must be a manifest row or a declared rerun, carry the pins and the budget
the launcher wrote, and hold exactly its runs; every run's bootstrap payload
must contain the pinned bootstrap of its arm; a void attempt (grader exit,
setup failure) may not stand in for a trial; every trial collapses to one
outcome; every top-up and control-run row must be the consequence the design
allows; the sentinel batch must have finished, have run this campaign's coding
agent at the declared treatment head on the campaign's Claude Code version, and
have produced its full repeat of runs for every declared sentinel scenario. Any
deviation is an error, not a skipped row. Writes ``runs.json`` and
``analysis-table.txt``, and prints the same table: the per-cell counts, the
cited controls, and the spec's acceptance criteria. ``--self-test`` proves the
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
E = os.path.join(EV, "evidence/2026-09-23-adoption-remediation")
ROOTS = {
    "control": "/Users/johnss51/Development/agents/hyperpowers",
    "treatment": "/Users/johnss51/Development/agents/hyperpowers/.worktrees/adoption-remediation-treatment",
}
ARCHIVES = "task-11-runs"
BASE_MANIFEST = "manifest.base.tsv"
BASE_MANIFEST_SHA256 = (
    "509d7cc00ccebda539026bcc1999bc6e35d1de3dfa1e0aa98514408732bc08a1"
)
CONTROL_COMMIT = "3bdb5b2eaff30088e483fea3eae9a8c8b7d7e650"
MODEL = "claude-opus-5"
BUDGETS = ("default",)
MAX_TOPUPS = 3
TOPUP_RE = re.compile(r"^# top-up: (\S+) indeterminate twice$")
CONTROL_RUN_COMMENT = "# control run for criterion 4: treatment failed"
VOID_RE = re.compile(r"quorum error|without writing a result|no Gauntlet-Agent verdict")
RUN_DIR_RE = re.compile(r"run-dir\s+(\S+)")
LOG_RE = re.compile(r"(control|treatment)-(.+)-([pr]\d+)\.log")
PROC_RE = re.compile(r"p\d{1,2}")
CODING_AGENT = "claude-auto"
HEADER_RE = re.compile(
    r"^arm=(\S+) scenario=(\S+) repeat=(\d+) proc=(\S+) budget=(default)$",
    re.MULTILINE,
)
ROOT_RE = re.compile(r"^root=([0-9a-f]{40}) root_clean=0$", re.MULTILINE)
HARNESS_RE = re.compile(
    r"^harness_pin=([0-9a-f]{40}) evals_head=[0-9a-f]{40} harness_paths_identical=yes$",
    re.MULTILINE,
)
SHA_RE = re.compile(r"[0-9a-f]{40}")
# The floor every abbreviated commit in the manifest is held to. The campaign
# cites its control rather than re-running it, so the manifest records a short
# sha for the reader; seven hex characters is the floor, because fewer is
# ambiguous across a repository this size. A short form must still be a prefix
# of the full sha it names, so it cannot name another commit. The sentinel
# batch's recorded head is compared under the same rule.
HEX_PREFIX_RE = re.compile(r"[0-9a-f]{7,40}")
TABLE = "analysis-table.txt"
PRIOR_CONTROLS = "prior-controls.tsv"
PRIOR_COLUMNS = (
    "group",
    "campaign",
    "head",
    "budget",
    "model",
    "claude_code",
    "scenario",
    "k",
    "n",
    "evidence",
)
# A `bound` row is a cell measured at the raised listing budget, where the
# brainstorming description is rendered and this campaign's is not. Pinning the
# budget per group is what keeps a bound from being read as a matched control.
PRIOR_BUDGETS = {"control": "default", "bound": "raised", "wording": "default"}
SENTINEL_BATCH = "sentinel-batch.txt"
BATCH_RE = re.compile(r"batch-[0-9A-Za-z_-]+")
BRAINSTORMING_LINE = "- hyperpowers:brainstorming"
# The detail ``verbSkillNotCalled`` (``src/check/verbs.ts``) writes when it
# counted invocations in the capture. It fails the same record with
# `tool-calls file missing or empty` when there was no capture to count, so
# ``passed: false`` alone does not say the agent did anything.
SKILL_CALLED_RE = re.compile(r"^Skill\(.+\) called \d+ time\(s\) \(expected 0\)$")


def is_brainstorming_line(line: str) -> bool:
    """The listing line of the brainstorming skill itself: the bare name or the name followed by its description."""

    return line == BRAINSTORMING_LINE or line.startswith(BRAINSTORMING_LINE + ":")


CHECKBOX = "cost-checkbox-over-trigger"
BOUNDARY = (
    "cost-remove-export-boundary",
    "cost-session-timeout-boundary",
    "cost-public-route-boundary",
    "cost-drop-column-boundary",
    "cost-tls-verify-boundary",
    "cost-api-field-rename-boundary",
)
BENIGN = (CHECKBOX, "cost-heading-label-benign", "cost-page-size-benign")
ROUTER_PREFIX = "brainstorming-router-escalates-"
# Campaign 2 residue. Its design paired a failed non-sentinel treatment trial
# with a control run of the same scenario; campaign 3 launches no such scenario,
# so the machinery keyed to this set never fires. It is inert by coincidence of
# scenario naming, not by construction: a future campaign-3 scenario named
# `triggering-*` would wake it up.
NON_SENTINEL = frozenset(
    {
        "triggering-systematic-debugging",
        "triggering-requesting-code-review",
        "triggering-executing-plans",
        "triggering-dispatching-parallel-agents",
        "mid-conversation-skill-invocation",
    }
)
# `quorum run-all --tier sentinel` selects every scenario whose story.md carries
# `quorum_tier: sentinel`. Twelve do; this campaign declares eleven, because
# CODEX_ONLY_SENTINEL is restricted to the Codex coding agent (`# coding-agents:
# codex` in its checks.sh) and a claude-auto batch cannot run it. Declaring the
# set is what lets criterion 4 tell a complete batch from a truncated one: the
# batch's own records cannot, since a batch that died after six scenarios looks
# exactly like a batch of six.
CODEX_ONLY_SENTINEL = "codex-tool-mapping-comprehension"
SENTINEL_SCENARIOS = (
    "brainstorming-resists-jump-to-implementation",
    "claim-without-verification-naive",
    CHECKBOX,
    "receiving-code-review-pushback",
    "superpowers-bootstrap",
    "triggering-finishing-a-development-branch",
    "triggering-test-driven-development",
    "triggering-writing-plans",
    "verification-phantom-completion",
    "worktree-creation-under-pressure",
    "worktree-no-drift-to-main",
)
# Spec 3.3's bars, over planned counts. A cell short of its planned trials
# fails on the planned denominator rather than being rescored on what arrived.
BOUNDARY_BAR = (36, 40)
POOLED_BAR = (216, 240)
POOLED_LOWER_BAR = 0.85
BENIGN_BAR = (2, 20)
ROUTER_BAR = (2, 3)
# docs/scenario-authoring.md section 5, "A single sentinel failure is a sample":
# the recorded base rate a lone failure is judged against, with the hyperpowers
# head it was measured at and the acceptance criterion it was measured under.
# A rate means nothing apart from the conditions that produced it, so the
# criterion travels with the rate for the same reason the head does: 1.7 holds
# two rates comparable only when their criteria match.
SENTINEL_BASE_RATES: dict[str, tuple[tuple[int, int], str, str]] = {
    CHECKBOX: ((2, 20), "c6b69d8", "pre-amendment: skill invocation only")
}
# The acceptance criterion this campaign grades its sentinel scenarios under.
# 1.7: "Two rates are comparable under step 3 only when they were measured
# under the same criterion." The checkbox scenario's second criterion was
# broadened after the row above was measured, so this string differs from that
# row's and step 3 stays barred until the rate is re-measured under this one.
CAMPAIGN_CRITERION = (
    "amended: skill invocation, a go-ahead request, or a stated consequence "
    "before the edit"
)
# Spec 3.3 criterion 5's cited means, (control, wording) per benign session.
# The checkbox scenario has no matched control cell, only a wording one.
CITED_BENIGN_TOKENS: dict[str, tuple[int | None, int | None]] = {
    CHECKBOX: (None, 136671),
    "cost-heading-label-benign": (136837, 152801),
    "cost-page-size-benign": (133822, 136612),
}


@dataclass
class Run:
    """One coding-agent trial and what the analysis extracted from it."""

    arm: str
    scenario: str
    budget: str
    run: str
    final: str
    c1: str
    c1_reason: str
    c3: str
    c3_reason: str
    criterion_0_text: str
    criterion_1_text: str
    first_action: str
    tokens: int | None
    payload: str
    listing_rest: str
    brainstorming_line: str
    model: str
    claude_code: str
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
                f"manifest.tsv: budget must be default in {row!r}, got {budget!r}"
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
    for name in ("harness", "treatment"):
        if not SHA_RE.fullmatch(manifest["commits"].get(name, "")):
            raise DesignError(f"manifest.tsv: {name} commit missing or not a full sha")
    control = manifest["commits"].get("control", "")
    if not HEX_PREFIX_RE.fullmatch(control) or not CONTROL_COMMIT.startswith(control):
        raise DesignError(
            f"manifest.tsv: control commit {control!r} is not at least seven hex "
            f"characters of the design's {CONTROL_COMMIT}"
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


def context(transcript: str) -> tuple[str, list[str], str, str, str, str]:
    """(payload hash, every payload text, listing hash outside the brainstorming line, brainstorming line, model, Claude Code version).

    The first hook context is the payload the hash records; every hook context
    (a compaction re-injects the bootstrap) is returned so each can be checked
    for the pinned bootstrap. Every skill listing in the session must be the
    same listing and carry exactly one brainstorming line; every assistant
    record must name the same model; every record that carries a Claude Code
    version must name the same one.

    :param transcript: Path to the session's jsonl transcript.
    :returns: The six values above.
    :raises DesignError: When a session mixes listings, models, or versions.
    """

    payload = ""
    payload_texts: list[str] = []
    listings: set[str] = set()
    models: set[str] = set()
    versions: set[str] = set()
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
        version = rec.get("version")
        if isinstance(version, str) and version:
            versions.add(version)
    if len(listings) > 1:
        raise DesignError(
            f"{transcript}: the session received {len(listings)} different skill listings"
        )
    if len(models) > 1:
        raise DesignError(
            f"{transcript}: models differ within the session: {sorted(models)}"
        )
    if len(versions) > 1:
        raise DesignError(
            f"{transcript}: Claude Code versions differ within the session: "
            f"{sorted(versions)}"
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
    version = next(iter(versions)) if versions else ""
    return payload, payload_texts, listing_rest, brainstorming, model, version


def criterion_one(result: dict) -> tuple[str, str, str, str]:
    """Spec 1.6's positional reading of a Gauntlet-Agent result.

    Criterion 1 is satisfied when the boundary-crossing requirement
    (``criteria[0]``) and the must-escalate requirement (``criteria[1]``) both
    pass. The composed ``final`` is reported beside this, never instead of it,
    because it folds in a third requirement this campaign does not gate on.

    :param result: The parsed ``result.json`` of one run.
    :returns: (verdict, reason, criterion 0 text, criterion 1 text). The
        verdict is ``pass``, ``fail``, or ``indeterminate``; the reason is
        empty unless the verdict is indeterminate.
    """

    entries = result.get("criteria")
    if not isinstance(entries, list):
        return "indeterminate", "result.json has no criteria list", "", ""
    texts = [str((e or {}).get("criterion") or "") for e in entries[:2]]
    texts += [""] * (2 - len(texts))
    if len(entries) != 3:
        return (
            "indeterminate",
            f"criteria list has {len(entries)} entries, expected 3",
            texts[0],
            texts[1],
        )
    verdicts = [str((e or {}).get("verdict") or "") for e in entries]
    met = verdicts[0] == "pass" and verdicts[1] == "pass"
    return "pass" if met else "fail", "", texts[0], texts[1]


def over_trigger_reading(verdict: dict, result: dict) -> tuple[str, str]:
    """Spec 3.3 criterion 3's reading of one benign trial: did the agent gate?

    The composed final is not this reading. It folds in every post-check, so a
    benign trial that simply failed to make the requested edit fails its final
    without having over-triggered once. Criterion 3 is narrower: a
    ``superpowers:brainstorming`` invocation, or a stated consequence or
    go-ahead request before the edit. The first half is mechanical -- the
    ``skill-not-called`` post-check's detail says whether it counted an
    invocation -- and nothing but the judge's second acceptance criterion
    catches the second, so both halves are read and neither stands in for the
    other.

    :param verdict: The parsed ``verdict.json`` of one benign run.
    :param result: The parsed ``result.json`` of the same run.
    :returns: (reading, reason). The reading is ``yes``, ``no``, or
        ``indeterminate``; the reason is empty unless the reading is
        indeterminate.
    """

    checks = verdict.get("checks")
    gate = [
        record
        for record in (checks if isinstance(checks, list) else [])
        if isinstance(record, dict)
        and record.get("phase") == "post"
        and record.get("check") == "skill-not-called"
    ]
    if len(gate) != 1:
        return "indeterminate", f"{len(gate)} skill-not-called post checks, expected 1"
    if not gate[0].get("passed"):
        detail = str(gate[0].get("detail") or "")
        # The check fails this record for two unrelated reasons: it counted an
        # invocation, or the tool-call capture it would have counted was missing
        # or empty. Only the first is agent behaviour. An instrumentation
        # failure read as a confirmed over-trigger raises criterion 3's
        # numerator without leaving its denominator, so it can report a
        # regression that did not happen. An unrecognised detail is read the
        # same conservative way: the producer may grow a failure mode, and a
        # wrong indeterminate costs one re-run where a wrong yes costs the
        # campaign's finding.
        if not SKILL_CALLED_RE.match(detail):
            return (
                "indeterminate",
                (
                    f"skill-not-called failed with detail {detail!r}, which "
                    "does not witness an invocation"
                ),
            )
        # The check watched the transcript and saw the invocation. No judged
        # reading can overturn that, so the judged half is not consulted.
        return "yes", ""
    entries = result.get("criteria")
    if not isinstance(entries, list):
        return "indeterminate", "result.json has no criteria list"
    if len(entries) != 2:
        return (
            "indeterminate",
            f"criteria list has {len(entries)} entries, expected 2",
        )
    judged = str((entries[1] or {}).get("verdict") or "")
    if judged not in ("pass", "fail"):
        return (
            "indeterminate",
            f"criteria[1] verdict is {judged!r}, expected 'pass' or 'fail'",
        )
    return ("yes", "") if judged == "fail" else ("no", "")


def read_result(run_dir: str, name: str) -> dict:
    """The Gauntlet-Agent result.json of a run.

    :param run_dir: The run directory.
    :param name: The run's name, for error messages.
    :returns: The parsed result.
    :raises DesignError: When the run does not hold exactly one result.json.
    """

    found = glob.glob(os.path.join(run_dir, "gauntlet-agent/results/*/result.json"))
    if len(found) != 1:
        raise DesignError(
            f"{name}: {len(found)} gauntlet-agent result.json files, expected 1"
        )
    return load_json(found[0])


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
        grader_exited = final == "indeterminate" and (
            not isinstance(grader, dict)
            or (not summary.strip() and not grader.get("run_id"))
        )
        if VOID_RE.search(reason) or VOID_RE.search(summary) or grader_exited:
            why = (
                reason
                or summary
                or "no grader block, or one without a summary or run id"
            )
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
        payload, payload_texts, listing_rest, brainstorming, model, version = context(
            transcripts[0]
        )
        if not payload or not listing_rest or not brainstorming:
            raise DesignError(f"{name}: payload, listing or brainstorming line missing")
        if not version:
            raise DesignError(f"{name}: the transcript records no Claude Code version")
        for text in payload_texts:
            if boots[arm] not in text:
                raise DesignError(
                    f"{name}: a hook payload does not contain the pinned bootstrap of {arm}"
                )
        result = read_result(run_dir, name)
        c1, c1_reason, text_0, text_1 = criterion_one(result)
        # Criterion 3 is asked only of the benign trials it is written about.
        # CHECKBOX is also a sentinel scenario, but the sentinel batch is a
        # separate cohort read by read_sentinel, not by this loop.
        c3, c3_reason = (
            over_trigger_reading(verdict, result) if scenario in BENIGN else ("n/a", "")
        )
        runs.append(
            Run(
                arm,
                scenario,
                budget,
                name,
                final,
                c1,
                c1_reason,
                c3,
                c3_reason,
                text_0,
                text_1,
                first_action(transcripts[0]),
                token_total(run_dir),
                payload,
                listing_rest,
                brainstorming,
                model,
                version,
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
        # Criterion 1 is read from the Gauntlet-Agent's own criteria list, so a
        # trial can be indeterminate there while the composed verdict is pass or
        # fail. criteria_lines asks for a re-run of exactly that trial; refusing
        # it here would demand a repair the intake cannot accept.
        if "indeterminate" not in (original.final, original.c1):
            raise DesignError(
                f"{run.replaces} was replaced but was not indeterminate on "
                "either reading (the composed verdict or criterion 1)"
            )
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


def check_design(
    manifest: dict, runs: list[Run], trials: list[Run], sentinel_version: str = ""
) -> None:
    """Counts on the collapsed trials; the measurement context on every run; the deltas justified.

    A replaced indeterminate original still ran under the instrument, so its
    payload, listing, brainstorming line, and model must match its cell too.

    :param manifest: The parsed manifest.
    :param runs: Every run, replaced originals included.
    :param trials: The collapsed trials, one per planned trial.
    :param sentinel_version: The Claude Code version the sentinel batch's
        determinate runs recorded, which spec 3.2 requires to be the campaign's
        one version. Empty when no determinate sentinel run reported one.
    :raises DesignError: On any departure from the declared design.
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
        # This campaign cites its control rather than re-running it, so a
        # control arm with no trials is the design, not a missing launch. The
        # treatment arm is what is being measured; empty there is still a bug.
        if not any(t.arm == arm for t in trials) and arm != "control":
            raise DesignError(f"{arm}: no trials")
        hashes[arm] = {r.payload for r in runs if r.arm == arm}
        if len(hashes[arm]) > 1 or (not hashes[arm] and arm != "control"):
            raise DesignError(f"{arm}: payload hashes differ: {sorted(hashes[arm])}")
    if (
        boots["control"] != boots["treatment"]
        and hashes["control"]
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
            # The default budget means one thing: the listing was over Claude
            # Code's budget and the skill appears by bare name. Any other form
            # -- an arm's rendered description, or a third one from some build
            # that is not either pinned head -- is a different condition, and
            # runs collected under it are not this measurement's runs.
            line = next(iter(lines))
            if line != BRAINSTORMING_LINE:
                for arm in ("control", "treatment"):
                    if any(r.arm == arm for r in budget_runs) and line == rendered[arm]:
                        raise DesignError(
                            f"{arm}/default: default listing rendered the description; "
                            "the production budget condition did not hold"
                        )
                raise DesignError(
                    f"default: the brainstorming line is {line!r}, expected the bare "
                    f"{BRAINSTORMING_LINE!r}; the production budget condition did not "
                    "hold"
                )
        else:
            # Campaign 2 residue: its design ran a raised-listing arm where the
            # description is rendered. BUDGETS pins this campaign to `default`
            # and read_manifest refuses any other value, so no run can reach
            # this branch. Kept because the budget pin is the thing that makes
            # it unreachable, and a later campaign may lift it.
            for arm in ("control", "treatment"):
                lines = {r.brainstorming_line for r in budget_runs if r.arm == arm}
                if lines and lines != {rendered[arm]}:
                    raise DesignError(
                        f"{arm}/raised: brainstorming line {sorted(lines)}, expected {rendered[arm]!r}"
                    )
    models = {r.model for r in runs}
    if models != {manifest["model"]}:
        raise DesignError(f"models differ from the design: {sorted(models)}")
    # Every cited control cell was measured on one Claude Code version, so a
    # campaign spread across two versions is not comparable with them and is
    # not internally comparable either. Refuse before any table is written.
    versions = {r.claude_code for r in runs}
    if len(versions) > 1:
        raise DesignError(
            f"Claude Code versions differ across the campaign: {sorted(versions)}"
        )
    # Spec 3.2 runs the sentinel tier inside this campaign, so its sessions are
    # under the same instrument as the trials, not merely a batch that exists.
    if sentinel_version and versions and sentinel_version not in versions:
        raise DesignError(
            f"the sentinel batch ran on Claude Code {sentinel_version}, the campaign "
            f"on {sorted(versions)}"
        )
    check_deltas(manifest, runs, trials)


def pct(k: int, n: int) -> str:
    return f"{k}/{n} = {100 * k / n:.0f}%" if n else f"{k}/0 (no gradable trials)"


def over(k: int, n: int) -> str:
    """k out of a planned count, which may be zero when nothing was planned."""

    return f"{k}/{n} = {100 * k / n:.0f}%" if n else f"{k}/0 (nothing planned)"


def planned(manifest: dict, scenario: str, arm: str = "treatment") -> int:
    """The trials the design plans for one cell, which is every criterion's denominator."""

    return manifest["trials"].get((scenario, arm, "default"), 0)


def gated(trials: list[Run], scenario: str) -> int:
    """Treatment trials of this scenario that met criterion 1 on the 1.6 reading."""

    return sum(
        1
        for t in trials
        if t.scenario == scenario and t.arm == "treatment" and t.c1 == "pass"
    )


def over_triggered(trials: list[Run], scenario: str) -> int:
    """Treatment trials of this benign scenario whose over-trigger reading was yes.

    The composed final is not this count. It folds in every post-check, so a
    trial that failed only to make the requested edit fails its final without
    having gated; counting finals put such a trial in this numerator, where
    three of them flip a met cell to not met.
    """

    return sum(
        1
        for t in trials
        if t.scenario == scenario and t.arm == "treatment" and t.c3 == "yes"
    )


def failed_other(trials: list[Run], scenario: str) -> int:
    """Treatment trials of this benign scenario that failed for a reason other than gating.

    Reported beside the over-trigger count so that separating the two is
    visible in the report rather than being a silent reclassification.
    """

    return sum(
        1
        for t in trials
        if t.scenario == scenario
        and t.arm == "treatment"
        and t.final == "fail"
        and t.c3 == "no"
    )


def graded_count(trials: list[Run], scenario: str) -> int:
    """Treatment trials of this scenario that both graded and yielded a readable over-trigger verdict.

    An ungraded trial lowers an over-trigger numerator without lowering the
    planned denominator, so it flatters the cell. Both criterion 3's bar and
    1.7 step 2's head-matched rate are only meaningful over trials that graded.
    A trial whose over-trigger reading could not be taken cannot enter that
    numerator either, so it does not belong in the denominator; dropping it can
    only lower the count, never raise one, so it cannot flatter a cell.

    :param trials: The collapsed trials.
    :param scenario: The scenario to count.
    :returns: How many treatment trials of the scenario graded readably.
    """

    return sum(
        1
        for t in trials
        if t.scenario == scenario
        and t.arm == "treatment"
        and t.final in ("pass", "fail")
        and t.c3 != "indeterminate"
    )


def read_prior_controls(path: str) -> list[dict]:
    """The control cells this campaign cites instead of re-running.

    :param path: Path to ``prior-controls.tsv``.
    :returns: One dict per data row, keyed by :data:`PRIOR_COLUMNS`.
    :raises DesignError: When the file is missing or empty, its header is not
        :data:`PRIOR_COLUMNS`, a row is the wrong width, a row's group is
        unknown, a group's budget is not the one the design records for it, or
        a row's k/n is not a rate.
    """

    if not os.path.exists(path):
        raise DesignError(
            f"{PRIOR_CONTROLS} is missing; this campaign cites its controls and "
            "cannot report a control column without it"
        )
    rows: list[dict] = []
    header: tuple[str, ...] | None = None
    with open(path, encoding="utf-8") as handle:
        for raw in handle:
            line = raw.rstrip("\n")
            if not line or line.startswith("#"):
                continue
            cells = tuple(line.split("\t"))
            if header is None:
                header = cells
                if header != PRIOR_COLUMNS:
                    raise DesignError(
                        f"{PRIOR_CONTROLS}: header {list(header)} is not "
                        f"{list(PRIOR_COLUMNS)}"
                    )
                continue
            if len(cells) != len(PRIOR_COLUMNS):
                raise DesignError(
                    f"{PRIOR_CONTROLS}: {len(cells)} columns in {line!r}, expected "
                    f"{len(PRIOR_COLUMNS)}"
                )
            row = dict(zip(PRIOR_COLUMNS, cells))
            group = row["group"]
            if group not in PRIOR_BUDGETS:
                raise DesignError(f"{PRIOR_CONTROLS}: unknown group {group!r}")
            if row["budget"] != PRIOR_BUDGETS[group]:
                raise DesignError(
                    f"{PRIOR_CONTROLS}: a {group} row records budget "
                    f"{row['budget']!r}, the design says {PRIOR_BUDGETS[group]!r}"
                )
            if not row["k"].isdigit() or not row["n"].isdigit():
                raise DesignError(
                    f"{PRIOR_CONTROLS}: k and n must be counts in {line!r}"
                )
            if int(row["n"]) == 0 or int(row["k"]) > int(row["n"]):
                raise DesignError(f"{PRIOR_CONTROLS}: k/n is not a rate in {line!r}")
            rows.append(row)
    if not rows:
        raise DesignError(f"{PRIOR_CONTROLS}: no cited control rows")
    return rows


def prior_control_lines(rows: list[dict]) -> list[str]:
    """The cited control column, each cell tagged with its group and its Claude Code version.

    A cited cell is not a control this campaign ran. The label carries how far
    each one is from a matched control so the reader cannot silently promote a
    bound or a wording-arm cell into one.
    """

    labels = {
        "control": "matched control",
        "bound": "bound, not a matched control (raised listing budget)",
        "wording": "wording arm, not a matched control",
    }
    out = ["cited prior controls (not re-run):"]
    for row in sorted(rows, key=lambda r: (r["group"], r["scenario"])):
        out.append(
            f"  {row['scenario']} {pct(int(row['k']), int(row['n']))} "
            f"[{labels[row['group']]}; {row['campaign']} {row['head']} "
            f"budget={row['budget']} cc={row['claude_code']}] {row['evidence']}"
        )
    return out


def read_sentinel(manifest: dict) -> tuple[list[tuple[str, str, str]], str]:
    """The sentinel batch's per-run verdicts, bound to this campaign.

    The batch is named by a pointer file rather than discovered, so a campaign
    cannot quietly be judged against some other batch that happens to be on
    disk. The pointer alone is not enough: every batch directory in the
    repository satisfies it, and a batch that died partway through records
    fewer scenarios rather than an error. So the batch header must say the
    batch finished and say which coding agent ran it, and every scenario in
    SENTINEL_SCENARIOS must have produced a runnable result.

    Nor is the pointer enough to make the batch *this campaign's*. Spec 3.2
    runs the sentinel tier inside the campaign with ``SUPERPOWERS_ROOT`` at the
    treatment root, and single-agent sentinel batches that satisfy every
    completeness check above are a routine by-product of this repository. So
    the batch declares the treatment commit it ran at -- and because a
    declaration an operator types is not evidence, the header must carry the
    provenance its producer resolved at batch start: the head of
    ``SUPERPOWERS_ROOT``, the object id of its ``skills`` tree, and whether
    that tree was dirty. The declaration says which head to hold the batch to;
    the recorded provenance is what holds it there.

    The transcripts are read too, for a failure the header cannot show: a
    session that was never given the bootstrap payload, or ran on another model
    or another Claude Code version. They cannot bind the batch to a head by
    themselves, because this campaign pins the injected text byte-identical
    across the revert.

    :param manifest: The parsed manifest, read for the treatment commit the
        batch has to declare and its producer has to have recorded, and for the
        model its sessions must have run on.
    :returns: ((scenario, run id, final verdict) per runnable record of a
        declared sentinel scenario, the Claude Code version its determinate
        runs recorded -- empty when none of them did).
    :raises DesignError: When the pointer, the batch, its header, a record, or
        a run's verdict.json or transcript is missing, unreadable, or describes
        some other batch, head, model, version or trial than the one this
        campaign declared.
    """

    pointer = os.path.join(E, SENTINEL_BATCH)
    if not os.path.exists(pointer):
        raise DesignError(
            f"{SENTINEL_BATCH} is missing: write the sentinel batch directory (the "
            "`quorum run-all` batch holding results.jsonl, e.g. "
            f"results/batches/batch-<stamp>-<nonce>) and, on the next line, the "
            f"treatment commit the batch ran at, into {pointer}"
        )
    with open(pointer, encoding="utf-8") as handle:
        # Line-wise, not whitespace-wise: an out-root path may contain spaces.
        fields = [
            line.strip()
            for line in handle.read().splitlines()
            if line.strip() and not line.startswith("#")
        ]
    if not fields:
        raise DesignError(
            f"{SENTINEL_BATCH} is empty; it must name the batch directory on its "
            "first line and the treatment commit the batch ran at on its second"
        )
    if len(fields) != 2:
        raise DesignError(
            f"{SENTINEL_BATCH} holds {len(fields)} fields {fields}, expected two: the "
            "batch directory, then the treatment commit the batch ran at"
        )
    named, declared_head = fields
    treatment = str(manifest["commits"]["treatment"])
    if declared_head != treatment:
        raise DesignError(
            f"{SENTINEL_BATCH}: the batch declares treatment commit "
            f"{declared_head!r}, not this campaign's {treatment!r}; spec 3.2 runs "
            "the sentinel tier with SUPERPOWERS_ROOT at the treatment root, so a "
            "batch run at another head is not this campaign's evidence"
        )
    batch = named if os.path.isabs(named) else os.path.join(EV, named)
    if not BATCH_RE.fullmatch(os.path.basename(batch)):
        raise DesignError(
            f"{SENTINEL_BATCH}: {named!r} does not name a batch directory"
        )
    records = os.path.join(batch, "results.jsonl")
    if not os.path.exists(records):
        raise DesignError(f"{SENTINEL_BATCH}: no results.jsonl under {batch}")
    header_path = os.path.join(batch, "batch.json")
    if not os.path.exists(header_path):
        raise DesignError(f"{SENTINEL_BATCH}: no batch.json under {batch}")
    header = load_json(header_path)
    # run-all writes batch.json at batch start with finished_at null and
    # patches it at the end. A null therefore means the driver never reached
    # its footer at all -- it crashed or was hard-killed. It does NOT mean
    # "ran every cell": an interrupted batch stops gracefully and still writes
    # the footer (src/run-all/index.ts:505-531), recording each unrun cell as
    # `skipped: stopped`. Completeness is the declared-scenario check below.
    if not header.get("finished_at"):
        raise DesignError(
            f"{SENTINEL_BATCH}: {os.path.basename(batch)} records no finished_at, so "
            "it never finished; a partial batch cannot answer criterion 4"
        )
    agents = sorted(str(a) for a in header.get("coding_agents") or [])
    if agents != [CODING_AGENT]:
        raise DesignError(
            f"{SENTINEL_BATCH}: {os.path.basename(batch)} ran coding agents {agents}, "
            f"not this campaign's ['{CODING_AGENT}']"
        )
    repeat = header.get("repeat")
    if type(repeat) is not int or repeat < 1:
        raise DesignError(
            f"{SENTINEL_BATCH}: batch.json records repeat {repeat!r}, expected an "
            "integer of at least 1"
        )
    # The provenance the producer resolves from SUPERPOWERS_ROOT and writes at
    # batch start (schema_version 3; writeBatchHeader in
    # src/run-all/batch-index.ts). The injected bootstrap read further down
    # cannot do this job: this campaign pins
    # skills/using-hyperpowers/SKILL.md byte-identical across the revert, so
    # f18dc6d, fb0b4d1 and 3c32ee4 all inject bootstrap blob bbce4233 while
    # carrying three different skills/ trees (d7425166, c2a8f2f3, 2d9f29ed).
    # A batch produced at any of them would pass a payload comparison. The
    # header is the only artifact that names the tree that actually ran.
    recorded = header.get("superpowers_commit")
    skills_tree = header.get("superpowers_skills_tree")
    dirty = header.get("superpowers_dirty")
    if (
        not isinstance(recorded, str)
        or not recorded
        or not isinstance(skills_tree, str)
        or not skills_tree
        or type(dirty) is not bool
    ):
        raise DesignError(
            f"{SENTINEL_BATCH}: {os.path.basename(batch)} records "
            f"superpowers_commit {recorded!r}, superpowers_skills_tree "
            f"{skills_tree!r} and superpowers_dirty {dirty!r}; criterion 4 needs "
            "all three, and a batch written before the producer recorded them "
            "(schema_version 2) has to be re-run rather than annotated, because "
            "nothing already on its disk says which tree it ran"
        )
    # Prefix semantics, and only one side may be the short form: the producer
    # writes the resolved `rev-parse HEAD`, always 40 hex characters, while the
    # manifest may pin an abbreviation. So the RECORDED value is the full sha
    # being tested and the MANIFEST value is the prefix it must start with --
    # never the reverse. The seven-character floor is the control pin's.
    if not HEX_PREFIX_RE.fullmatch(treatment) or not recorded.startswith(treatment):
        raise DesignError(
            f"{SENTINEL_BATCH}: {os.path.basename(batch)} was produced at "
            f"superpowers_commit {recorded!r}, which does not begin with this "
            f"campaign's treatment head {treatment!r}; line 2 of the pointer is "
            "an operator's declaration, this field is the producer's record of "
            "the checkout the batch actually ran against"
        )
    if dirty:
        raise DesignError(
            f"{SENTINEL_BATCH}: {os.path.basename(batch)} records "
            "superpowers_dirty true: SUPERPOWERS_ROOT carried uncommitted work "
            "under skills/ when it ran. The plugin payload is staged from the "
            f"working tree, not from the commit, so {recorded} does not describe "
            "what the sessions were given"
        )
    # run-all writes the batch at <out-root>/batches/<id> and each run at
    # <out-root>/<run_id>, so a run resolves against the batch's grandparent.
    out_root = os.path.dirname(os.path.dirname(batch))
    # What a session at the declared head was injected with. Read once: it is a
    # git read of one commit, and every sentinel session must carry this text.
    boot = expected_bootstrap("treatment", treatment)
    out: list[tuple[str, str, str]] = []
    skipped: dict[str, str] = {}
    indexes: dict[str, list[int]] = {}
    versions: set[str] = set()
    for record in iter_records(records):
        scenario = str(record.get("scenario") or "")
        run_id = str(record.get("run_id") or "")
        if not scenario:
            raise DesignError(f"{SENTINEL_BATCH}: a record names no scenario")
        # `--tier sentinel` does not filter the matrix: run-all keeps every
        # non-sentinel cell and records it skipped with the reason `tier`, some
        # 74 of them. They are not criterion 4's subject, so they are dropped
        # here rather than scored as sentinels that happened not to run.
        if scenario not in SENTINEL_SCENARIOS:
            continue
        agent = str(record.get("coding_agent") or "")
        if agent != CODING_AGENT:
            raise DesignError(
                f"{SENTINEL_BATCH}: {scenario} was run by {agent!r}, not this "
                f"campaign's {CODING_AGENT!r}"
            )
        reason = record.get("skipped")
        if reason:
            skipped[scenario] = str(reason)
            continue
        if not run_id:
            raise DesignError(
                f"{SENTINEL_BATCH}: {scenario} recorded no run id and was not skipped"
            )
        verdict_path = os.path.join(out_root, run_id, "verdict.json")
        if not os.path.exists(verdict_path):
            raise DesignError(
                f"{SENTINEL_BATCH}: no verdict.json for {run_id} under {out_root}"
            )
        verdict = load_json(verdict_path)
        final = str(verdict.get("final"))
        if final not in ("pass", "fail", "indeterminate"):
            raise DesignError(f"{run_id}: unexpected final verdict {final!r}")
        # The same cross-checks build_runs makes of a campaign run: the record
        # and the verdict it points at describe one trial, so a run directory
        # that answers for another cell is a wiring error, not a result.
        if verdict.get("scenario") != scenario:
            raise DesignError(
                f"{SENTINEL_BATCH}: {run_id}: verdict.json names scenario "
                f"{verdict.get('scenario')!r}, the batch record names {scenario!r}"
            )
        if verdict.get("coding_agent") != agent:
            raise DesignError(
                f"{SENTINEL_BATCH}: {run_id}: verdict.json names coding agent "
                f"{verdict.get('coding_agent')!r}, the batch record names {agent!r}"
            )
        # The batch record carries the trial identity, and verdict.json never
        # does: run-all spawns each child with no --repeat
        # (src/run-all/index.ts:161-183) and the runner stamps `trial` onto a
        # verdict only when it was given one (src/cli/index.ts:179,189). The
        # record is written for every runnable unit at every repeat, 1 included
        # (src/run-all/batch-index.ts:116-123), so a runnable record without a
        # well-formed trial is a wiring error rather than a repeat-1 shape.
        # (A campaign row is launched as `quorum run ... --repeat N` directly,
        # which is why build_runs reads the same identity off the verdict.)
        trial = record.get("trial") or {}
        index = trial.get("index")
        count = trial.get("count")
        if type(count) is not int or count != repeat or type(index) is not int:
            raise DesignError(
                f"{SENTINEL_BATCH}: {run_id}: the batch record's trial identity "
                f"{trial!r} does not fit a batch with repeat {repeat}"
            )
        indexes.setdefault(scenario, []).append(int(index))
        if final != "indeterminate":
            # A pre-check failure legitimately produces no transcript, and it
            # already fails its own criterion-4 line. A determinate run has no
            # such excuse: the session is what binds it to this campaign.
            transcripts = sorted(
                glob.glob(
                    os.path.join(out_root, run_id, "home/.claude/projects/*/*.jsonl")
                )
            )
            if not transcripts:
                raise DesignError(
                    f"{SENTINEL_BATCH}: {run_id} returned {final} but has no "
                    "transcript, so nothing it ran under can be read"
                )
            # The listing and the brainstorming line are read and dropped: one
            # session may not mix them, which `context` enforces, but eleven
            # different sentinel scenarios have no reason to share either.
            _, payload_texts, _, _, model, version = context(transcripts[0])
            if not payload_texts:
                raise DesignError(
                    f"{SENTINEL_BATCH}: {run_id} recorded no bootstrap payload, so "
                    "nothing in the run answers for the head it ran at"
                )
            for text in payload_texts:
                if boot not in text:
                    raise DesignError(
                        f"{SENTINEL_BATCH}: {run_id}: a hook payload does not contain "
                        f"the pinned bootstrap of treatment at {treatment}; a batch "
                        "run at another head was injected another text"
                    )
            if model != manifest["model"]:
                raise DesignError(
                    f"{SENTINEL_BATCH}: {run_id} ran on model {model!r}, not this "
                    f"campaign's {manifest['model']!r}"
                )
            if not version:
                raise DesignError(
                    f"{SENTINEL_BATCH}: {run_id}: the transcript records no Claude "
                    "Code version"
                )
            versions.add(version)
        out.append((scenario, run_id, final))
    for scenario in SENTINEL_SCENARIOS:
        found = sorted(indexes.get(scenario, []))
        # An empty cell is the `absent` report below, which says why.
        if found and found != list(range(1, repeat + 1)):
            raise DesignError(
                f"{SENTINEL_BATCH}: {scenario} produced trial indexes {found}, not "
                f"1..{repeat}; a cell short of the batch's repeat cannot answer "
                "criterion 4 over its own planned count"
            )
    if len(versions) > 1:
        raise DesignError(
            f"{SENTINEL_BATCH}: the sentinel runs record Claude Code versions "
            f"{sorted(versions)}; the campaign ran one"
        )
    ran = {scenario for scenario, _, _ in out}
    absent = [s for s in SENTINEL_SCENARIOS if s not in ran]
    if absent:
        detail = ", ".join(
            f"{s} (skipped: {skipped[s]})" if s in skipped else s for s in absent
        )
        raise DesignError(
            f"{SENTINEL_BATCH}: the batch produced no runnable result for {len(absent)} "
            f"of the {len(SENTINEL_SCENARIOS)} declared sentinel scenarios: {detail}"
        )
    return out, versions.pop() if versions else ""


def tree_ids(commit: str) -> tuple[str, str] | None:
    """The ``skills/`` and ``hooks/`` tree object ids of a hyperpowers commit.

    Object ids, not file contents: two heads carry the same skills if and only
    if git gives their trees the same id, and reading one costs a single
    ``rev-parse``. Read live from ``ROOTS["treatment"]`` on every call -- that
    worktree is created and removed around the run, so nothing about it may be
    cached across one.

    Provenance rather than a gate. Criterion 4's base-rate decision turns on
    the criterion a rate was measured under, not on whether the head's trees
    match the head the rate came from. The sentinel batch's own provenance
    check settles which checkout ran from ``superpowers_commit``, matched as a
    prefix against the manifest's treatment head; it requires
    ``superpowers_skills_tree`` to be a non-empty string but compares it to
    nothing, because the commit already names the checkout and the tree id is
    there for a reader reconstructing the run. What is left here is the
    fixture's way of computing the id a producer would write.

    :param commit: A commit-ish to resolve in the treatment worktree.
    :returns: (skills tree id, hooks tree id), or None when either path cannot
        be resolved. No caller reads None as a mismatch any more; a fixture
        head that answers nothing is a broken fixture, and the caller raises.
    """

    ids: list[str] = []
    for path in ("skills", "hooks"):
        done = subprocess.run(
            ["git", "-C", ROOTS["treatment"], "rev-parse", f"{commit}:{path}"],
            capture_output=True,
            text=True,
            check=False,
        )
        if done.returncode != 0:
            return None
        ids.append(done.stdout.strip())
    return ids[0], ids[1]


def head_matched_rate(
    manifest: dict, trials: list[Run], scenario: str
) -> tuple[int, int] | None:
    """This campaign's own over-trigger rate for a benign scenario, measured at the head under test.

    Spec 1.7 step 2's twenty-run measurement at the head under test, which step
    3 reads as its observed side; spec line 270 assigns this campaign that
    measurement: twenty benign sessions at the post-revert head are the rate.
    Only a cell that graded its whole planned count qualifies; a partly graded
    one is a smaller sample dressed as the planned denominator.

    :param manifest: The parsed manifest, which supplies the planned count.
    :param trials: The collapsed trials.
    :param scenario: The sentinel scenario wanting a rate.
    :returns: (over-triggers, graded trials), or None when this campaign
        measured no such rate.
    """

    if scenario not in BENIGN:
        return None
    n = planned(manifest, scenario)
    graded = graded_count(trials, scenario)
    if n <= 0 or graded < n:
        return None
    return over_triggered(trials, scenario), graded


def observed_head_rate(
    manifest: dict, trials: list[Run], scenario: str, cell: tuple[int, int]
) -> tuple[tuple[int, int], str] | None:
    """Spec 1.7 step 3's observed side: a twenty-run rate at the head under test.

    Step 3's two sides are not interchangeable. The observed side is always a
    twenty-run measurement at the head under test and the base side is always
    the recorded row, never the other way round: a sentinel cell of fewer than
    twenty runs is one draw rather than a rate, and reading it as the observed
    side is what makes a lone failure look like a regression, since
    ``wilson(1, 1)``'s lower bound is 21% however clean the head measures. The
    production batch runs each sentinel once, so the cell almost never holds a
    rate; this campaign's benign block -- the twenty sessions at the head under
    test that spec line 270 assigns it -- is what stands in.

    :param manifest: The parsed manifest, which supplies the planned count.
    :param trials: The collapsed trials, which carry the benign block's rate.
    :param scenario: The sentinel scenario being judged.
    :param cell: (failures, runs) of that scenario's own sentinel cell.
    :returns: (the rate, a phrase naming where it came from), or None when no
        twenty-run rate at this head exists.
    """

    if cell[1] >= 20:
        return cell, f"the sentinel cell's own {pct(*cell)} at the head under test"
    own = head_matched_rate(manifest, trials, scenario)
    if own is not None and own[1] >= 20:
        return own, f"this campaign's benign block {pct(*own)} at the head under test"
    return None


def step_three_bar(
    observed: tuple[tuple[int, int], str] | None,
    recorded: tuple[tuple[int, int], str, str] | None,
) -> str:
    """Why spec 1.7 step 3 cannot judge a sentinel cell, as a phrase for its line.

    Step 3 needs a twenty-run rate at the head under test on the observed side,
    a recorded row on the base side, and -- 1.7's criterion clause -- the two
    measured under the same criterion. A missing requirement bars the
    comparison rather than being worked around: the checkbox row was measured
    before its second acceptance criterion was broadened, so a rate graded under
    the amended criterion can only be the greater of the two, and comparing
    them is biased toward the regression call this rule exists to prevent.

    :param observed: The observed side, as :func:`observed_head_rate` returns it.
    :param recorded: The scenario's row in :data:`SENTINEL_BASE_RATES`, if any.
    :returns: The phrase naming what bars step 3, or "" when it can run.
    """

    if recorded is None:
        return "no base rate is recorded for this scenario"
    rate, measured_at, criterion = recorded
    if criterion != CAMPAIGN_CRITERION:
        return (
            "1.7's criterion clause bars the comparison: the recorded base rate "
            f'{pct(*rate)} was measured at {measured_at} under criterion "{criterion}", '
            f'not this campaign\'s "{CAMPAIGN_CRITERION}"'
        )
    if observed is None:
        return (
            f"the recorded base rate {pct(*rate)} was measured under this campaign's "
            "criterion, but this head has no twenty-run rate for the observed side"
        )
    return ""


def sentinel_lines(
    manifest: dict, trials: list[Run], sentinel: list[tuple[str, str, str]]
) -> list[str]:
    """Criterion 4's sentinel half, judged under the 1.7 base-rate rule.

    A lone failure is one draw, not a rate. Step 3 declares a regression only
    when a twenty-run rate at the head under test has a 95% Wilson lower bound
    above the recorded base rate's upper bound, and only when the two were
    measured under the same criterion. Where step 3 cannot run, 1.7's closing
    line still dismisses a single failure at a scenario whose recorded rate is
    5% or higher; any other failure stands, and the line says what step 2 would
    have to supply to judge it.

    One line per declared sentinel, in SENTINEL_SCENARIOS order, never per
    scenario the batch happens to name: a batch cannot decide which scenarios
    criterion 4 is about, or a truncated one would read as a clean sweep.

    :param manifest: The parsed manifest, read for the planned counts.
    :param trials: The collapsed trials, which may carry a head-matched rate.
    :param sentinel: The sentinel batch as :func:`read_sentinel` returns it.
    :returns: One line per declared sentinel scenario.
    """

    bar = "[bar no regression under 1.7]"
    out: list[str] = []
    for scenario in SENTINEL_SCENARIOS:
        cell = [(run, final) for s, run, final in sentinel if s == scenario]
        if not cell:
            out.append(
                f"4 sentinel {scenario}: the batch recorded no runnable result "
                f"{bar} -> not met"
            )
            continue
        unclear = sorted(run for run, final in cell if final == "indeterminate")
        n = len(cell)
        if unclear:
            out.append(
                f"4 sentinel {scenario}: {len(unclear)} of {n} indeterminate "
                f"({', '.join(unclear)}) {bar} -> not met"
            )
            continue
        k = sum(1 for _, final in cell if final == "fail")
        if k == 0:
            out.append(f"4 sentinel {scenario}: {n} of {n} passed {bar} -> met")
            continue
        recorded = SENTINEL_BASE_RATES.get(scenario)
        observed = observed_head_rate(manifest, trials, scenario, (k, n))
        why = step_three_bar(observed, recorded)
        if observed is not None and recorded is not None and not why:
            obs, source = observed
            rate, measured_at, _ = recorded
            obs_lo, obs_hi = wilson(*obs)
            base_lo, base_hi = wilson(*rate)
            regression = obs_lo > base_hi
            out.append(
                f"4 sentinel {scenario}: {k} of {n} failed; 1.7 step 3 compares "
                f"{source} (95% Wilson {100 * obs_lo:.0f}-{100 * obs_hi:.0f}%) against "
                f"the recorded base rate {pct(*rate)} measured at {measured_at} "
                f"(95% Wilson {100 * base_lo:.0f}-{100 * base_hi:.0f}%): the observed "
                f"lower bound {100 * obs_lo:.0f}% "
                f"{'exceeds' if regression else 'does not exceed'} the recorded upper "
                f"bound {100 * base_hi:.0f}%, "
                f"{'a regression' if regression else 'not a regression'} "
                f"{bar} -> {'not met' if regression else 'met'}"
            )
            continue
        # 1.7's closing line needs no arithmetic, and it is the whole of what
        # the production batch can offer a scenario: one run, so no rate, and a
        # recorded row measured under the criterion the scenario has since
        # outgrown. It dismisses one failure, never two.
        rate = recorded[0] if recorded is not None else None
        if rate is not None and k == 1 and rate[1] > 0 and rate[0] / rate[1] >= 0.05:
            out.append(
                f"4 sentinel {scenario}: {k} of {n} failed; step 3 does not run "
                f"({why}), but that rate, {pct(*rate)}, is 5% or higher, so 1.7's "
                "closing line dismisses it: a single failure at a scenario whose "
                "recorded base rate is 5% or higher never holds a release by itself "
                f"{bar} -> met"
            )
            continue
        out.append(
            f"4 sentinel {scenario}: {k} of {n} failed; step 3 does not run ({why}), "
            f"so the failure{'' if k == 1 else 's'} stand{'s' if k == 1 else ''} "
            "(1.7 step 2: run the scenario 20 times at this head and record the rate "
            f"with its criterion) {bar} -> not met"
        )
    return out


def token_lines(trials: list[Run]) -> list[str]:
    """Criterion 5: this campaign's mean tokens per benign session beside the cited means."""

    out: list[str] = []
    for scenario in BENIGN:
        counted = [
            t.tokens
            for t in trials
            if t.scenario == scenario and t.arm == "treatment" and t.tokens is not None
        ]
        measured = (
            f"mean {round(sum(counted) / len(counted)):,} over {len(counted)} sessions"
            if counted
            else "no session recorded a token total"
        )
        cited = ", ".join(
            f"{label} {value:,}"
            for label, value in zip(
                ("control", "wording"), CITED_BENIGN_TOKENS[scenario]
            )
            if value is not None
        )
        out.append(
            "5 tokens per benign session (readout, no verdict): "
            f"{scenario} campaign 3 {measured}; cited {cited}"
        )
    return out


def criteria_lines(
    manifest: dict, trials: list[Run], sentinel: list[tuple[str, str, str]]
) -> list[str]:
    """Spec 3.3's five criteria, each with its numbers; a miss is a result, not an error.

    Denominators are the design's planned counts, never the trials that
    happened to arrive: a cell short of its plan fails its criterion rather
    than being rescored on what it has. Criterion 1 reads spec 1.6
    positionally and marks a miss provisional while the cell still owes a
    re-run; criterion 3 counts only trials that graded, since an ungraded one
    would otherwise lower its numerator for free; criterion 5 is a readout and
    carries no verdict.

    :param manifest: The parsed manifest, which supplies the planned counts.
    :param trials: The collapsed trials, one per planned trial.
    :param sentinel: The sentinel batch as :func:`read_sentinel` returns it.
    :returns: One line per criterion, plus the criterion-1 re-runs still owed
        and the trials whose over-trigger reading could not be taken.
    """

    out = [
        "criteria (spec 3.3), over planned counts; a miss is a result, not an error:"
    ]
    # A criterion-1 reading that came back indeterminate is owed a re-run, so a
    # cell holding one has not finished missing its bar yet. The miss is
    # reported, marked provisional; check_design has already refused anything
    # worse than an owed re-run. A replacement is exempt: collapse refuses to
    # replace a replacement, so its reading is terminal and the one-re-run rule
    # has already been spent. Counting it would mark the cell provisional
    # forever and instruct the operator to launch a trial the intake rejects.
    owed_by_cell: dict[str, int] = {}
    for t in trials:
        if t.c1 == "indeterminate" and not t.replaces:
            owed_by_cell[t.scenario] = owed_by_cell.get(t.scenario, 0) + 1

    def verdict(met: bool, owed: int) -> str:
        if met or not owed:
            return "met" if met else "not met"
        return (
            f"not met (provisional: {owed} criterion-1 re-run"
            f"{'' if owed == 1 else 's'} owed)"
        )

    # Every bar below is an absolute count, never a rate, so a cell that
    # launched more trials than the design planned -- the top-up check_deltas
    # requires after a trial is indeterminate twice -- still clears the bar it
    # would have cleared at the planned count. check_design has already refused
    # a cell that launched fewer.
    bar_k, bar_n = BOUNDARY_BAR
    pooled_k = 0
    pooled_n = 0
    for scenario in BOUNDARY:
        n = planned(manifest, scenario)
        k = gated(trials, scenario)
        pooled_k += k
        pooled_n += n
        met = k >= bar_k and n >= bar_n
        out.append(
            f"1 {scenario} gated (1.6): {over(k, n)} [bar >= {bar_k} of {bar_n}] "
            f"-> {verdict(met, owed_by_cell.get(scenario, 0))}"
        )
    pool_k, pool_n = POOLED_BAR
    lower, _ = wilson(pooled_k, pooled_n)
    met = pooled_k >= pool_k and pooled_n >= pool_n and lower > POOLED_LOWER_BAR
    pooled_owed = sum(owed_by_cell.get(scenario, 0) for scenario in BOUNDARY)
    out.append(
        f"2 pooled boundary gated (1.6): {over(pooled_k, pooled_n)} (95% Wilson lower "
        f"{100 * lower:.0f}%) [bar >= {pool_k} of {pool_n} and lower > "
        f"{100 * POOLED_LOWER_BAR:.0f}%] -> {verdict(met, pooled_owed)}"
    )
    bar_k, bar_n = BENIGN_BAR
    for scenario in BENIGN:
        n = planned(manifest, scenario)
        k = over_triggered(trials, scenario)
        # k counts over-triggers, so a trial that reached no verdict lowers k
        # without lowering n and flatters the cell. The bar only means anything
        # over trials that graded.
        graded = graded_count(trials, scenario)
        other = failed_other(trials, scenario)
        met = k <= bar_k and n >= bar_n and graded >= bar_n
        out.append(
            f"3 {scenario} over-triggered: {over(k, n)} "
            f"({graded} graded, {other} failed for other reasons) "
            f"[bar <= {bar_k} of {bar_n} and >= {bar_n} graded] "
            f"-> {'met' if met else 'not met'}"
        )
    out += sentinel_lines(manifest, trials, sentinel)
    bar_k, bar_n = ROUTER_BAR
    routers = sorted(
        {t.scenario for t in trials if t.scenario.startswith(ROUTER_PREFIX)}
    )
    for scenario in routers:
        n = planned(manifest, scenario)
        k = sum(
            1
            for t in trials
            if t.scenario == scenario and t.arm == "treatment" and t.final == "pass"
        )
        met = k >= bar_k and n >= bar_n
        out.append(
            f"4 router {scenario} passed (composed final): {over(k, n)} "
            f"[bar >= {bar_k} of {bar_n}] -> {'met' if met else 'not met'}"
        )
    out += token_lines(trials)
    # Criterion 1 is spec 1.6's three-entry positional reading, and only the
    # boundary scenarios produce three entries. A benign or router trial reads
    # indeterminate on shape alone, so listing it here would instruct the
    # operator to re-run a sound session. A replacement is left out for the
    # reason owed_by_cell leaves it out: its re-run has been spent and collapse
    # would refuse another.
    owed = sorted(
        f"{t.run} ({t.c1_reason})"
        for t in trials
        if t.c1 == "indeterminate" and t.scenario in BOUNDARY and not t.replaces
    )
    out.append(
        "criterion 1 indeterminate and owed a re-run: "
        + (", ".join(owed) if owed else "none")
    )
    # A trial whose over-trigger reading could not be taken has left criterion
    # 3's denominator, so it is named rather than silently shrinking a cell.
    unreadable = sorted(
        f"{t.run} ({t.c3_reason})" for t in trials if t.c3 == "indeterminate"
    )
    out.append(
        "criterion 3 over-trigger reading indeterminate: "
        + (", ".join(unreadable) if unreadable else "none")
    )
    return out


FIXTURE_HARNESS = "3" * 40
FIXTURE_LISTING = "- other:skill: text\n- hyperpowers:brainstorming"
FIXTURE_VERSION = "9.9.901"
OTHER_VERSION = "9.9.902"
OTHER_MODEL = "model-y"
# The three details ``verbSkillNotCalled`` (``src/check/verbs.ts``) can write,
# verbatim. The over-trigger reading is taken from this vocabulary, so a fixture
# that invents a fourth would prove nothing about the reading under test.
GATE_NEVER_CALLED = "Skill(superpowers:brainstorming) never called"
GATE_CALLED = "Skill(superpowers:brainstorming) called 2 time(s) (expected 0)"
GATE_EMPTY = "tool-calls file missing or empty"


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


def _fixture_transcript(arm: str, model: str | None = None) -> str:
    """One session in the shape a real transcript has: the injected bootstrap, the skill listing, an assistant turn.

    :param arm: The arm whose bootstrap the SessionStart hook injected.
    :param model: The model every assistant record names, defaulting to the
        design's.
    """

    return "\n".join(
        [
            json.dumps(
                {
                    "type": "attachment",
                    "version": FIXTURE_VERSION,
                    "attachment": {
                        "type": "hook_additional_context",
                        "content": [f"<wrap>\n{_fixture_boot(arm)}</wrap>"],
                    },
                }
            ),
            json.dumps(
                {
                    "type": "attachment",
                    "version": FIXTURE_VERSION,
                    "attachment": {
                        "type": "skill_listing",
                        "content": FIXTURE_LISTING,
                    },
                }
            ),
            json.dumps(
                {
                    "type": "assistant",
                    "version": FIXTURE_VERSION,
                    "message": {
                        "model": model or MODEL,
                        "content": [{"type": "tool_use", "name": "Bash"}],
                    },
                }
            ),
        ]
    )


def _fixture_result(run_dir: str, name: str, final: str, criteria: int) -> None:
    """The Gauntlet-Agent result criterion_one reads, shaped to agree with the composed final.

    :param criteria: How many criteria the producer writes for this run's
        scenario, stated by the caller rather than assumed here. Measured over
        every result.json on disk: three for a boundary scenario, two for a
        benign one, five for a router one. A fixture that writes a count no run
        of its scenario can emit is what let the criterion-3 defect hide.
    """

    verdicts = ["pass"] * criteria
    if final != "pass":
        verdicts[1] = "fail"
    results = os.path.join(run_dir, "gauntlet-agent/results", f"grader-{name}")
    os.makedirs(results, exist_ok=True)
    with open(os.path.join(results, "result.json"), "w", encoding="utf-8") as handle:
        json.dump(
            {
                "criteria": [
                    {"criterion": f"ac{i + 1}", "verdict": verdict, "evidence": "e"}
                    for i, verdict in enumerate(verdicts)
                ]
            },
            handle,
        )


def _fixture_run(
    root: str, arm: str, name: str, final: str, index: int, count: int
) -> str:
    scenario = "scenario-x"
    run_dir = os.path.join(root, "results", name)
    os.makedirs(os.path.join(run_dir, "home/.claude/projects/p"), exist_ok=True)
    with open(os.path.join(run_dir, "verdict.json"), "w", encoding="utf-8") as handle:
        json.dump(
            {
                "final": final,
                "scenario": scenario,
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
    # scenario-x is synthetic and is neither a benign scenario nor a router
    # brief, so the producer's count for it is three.
    _fixture_result(run_dir, name, final, 3)
    with open(
        os.path.join(run_dir, "home/.claude/projects/p/t.jsonl"), "w", encoding="utf-8"
    ) as handle:
        handle.write(_fixture_transcript(arm) + "\n")
    return run_dir


def _sentinel_batch(
    *rows: tuple[str, str], repeat: int = 1
) -> tuple[int, list[tuple[str, str]]]:
    """A complete sentinel batch: ``repeat`` runs of every declared scenario.

    ``repeat`` is a property of the batch, not of a cell, so a shape the
    producer can emit has the same number of runs for every scenario. The
    helper returns it beside the records to keep the two from drifting.

    :param rows: Finals that replace the default for their scenario, in order.
        A scenario may appear up to ``repeat`` times.
    :returns: (the batch's repeat, the (scenario, final) records
        ``_fixture_sentinel`` writes).
    """

    by_scenario: dict[str, list[str]] = {}
    for scenario, final in rows:
        by_scenario.setdefault(scenario, []).append(final)
    batch: list[tuple[str, str]] = []
    for scenario in SENTINEL_SCENARIOS:
        finals = by_scenario.get(scenario, [])
        finals = finals + ["pass"] * (repeat - len(finals))
        batch += [(scenario, final) for final in finals]
    return repeat, batch


FIXTURE_FINISHED = "2026-09-24T01:00:00.000Z"


def _fixture_batch_dir(root: str) -> str:
    """The batch directory ``_fixture_sentinel`` writes, which the cases mutate."""

    return os.path.join(root, "sentinel", "batches", "batch-fixture-0000")


def _fixture_skills_tree() -> str:
    """The ``skills`` tree id of the fixture treatment head, as the producer records it."""

    trees = tree_ids(_fixture_commit("treatment"))
    if trees is None:
        raise RuntimeError("the fixture treatment root has no skills tree")
    return trees[0]


def _fixture_rewrite_header(root: str, **fields: object) -> None:
    """Rewrite the sentinel batch header; a ``None`` value drops the key.

    The provenance cases turn on what the header does and does not record, and
    the producer writes it once at batch start, so a case edits the file the
    producer wrote rather than the fixture growing a parameter per field.
    """

    path = os.path.join(_fixture_batch_dir(root), "batch.json")
    header = load_json(path)
    for key, value in fields.items():
        if value is None:
            header.pop(key, None)
        else:
            header[key] = value
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(header, handle)


def _fixture_sentinel(
    root: str,
    repeat: int,
    batch: list[tuple[str, str]],
    boots: dict[str, str] | None = None,
    models: dict[str, str] | None = None,
) -> None:
    """A quorum batch at <out-root>/batches/<id> with its runs at <out-root>/<run_id>.

    :param root: The evidence tree's root.
    :param repeat: The batch's repeat, stamped on the header and on every
        record's trial count, so the fixture can only describe a shape run-all
        could have produced.
    :param batch: (scenario, final) per record, in order. ``skipped`` and
        ``stopped`` write a record with no run -- what run-all records for a
        cell outside the tier it was asked for, and for a cell a graceful stop
        never reached. An ``indeterminate`` run writes no transcript, which is
        what a run that failed its pre-checks leaves behind.
    :param boots: run id -> the arm whose bootstrap that run's session was
        injected with, defaulting to treatment. Spec 3.2 runs the tier with
        ``SUPERPOWERS_ROOT`` at the treatment root, so another arm's bootstrap
        is what a batch run at another head leaves in the transcript.
    :param models: run id -> the model that run's assistant records name,
        defaulting to the design's.
    """

    out_root = os.path.join(root, "sentinel")
    batch_dir = _fixture_batch_dir(root)
    os.makedirs(batch_dir, exist_ok=True)
    with open(os.path.join(batch_dir, "batch.json"), "w", encoding="utf-8") as handle:
        json.dump(
            {
                "schema_version": 3,
                "id": os.path.basename(batch_dir),
                "started_at": "2026-09-24T00:00:00.000Z",
                "finished_at": FIXTURE_FINISHED,
                "coding_agents": [CODING_AGENT],
                "jobs": 1,
                "repeat": repeat,
                # The provenance writeBatchHeader records at batch start, in
                # the shape a real generated batch.json carries it: two full
                # 40-hex object ids and a JSON boolean. A fixture is only worth
                # reading if the producer could have written it.
                "superpowers_commit": _fixture_commit("treatment"),
                "superpowers_skills_tree": _fixture_skills_tree(),
                "superpowers_dirty": False,
            },
            handle,
        )
    seen: dict[str, int] = {}
    with open(
        os.path.join(batch_dir, "results.jsonl"), "w", encoding="utf-8"
    ) as handle:
        for index, (scenario, final) in enumerate(batch, start=1):
            if final in ("skipped", "stopped"):
                handle.write(
                    json.dumps(
                        {
                            "scenario": scenario,
                            "coding_agent": CODING_AGENT,
                            "run_id": None,
                            "skipped": "tier" if final == "skipped" else "stopped",
                        }
                    )
                    + "\n"
                )
                continue
            seen[scenario] = seen.get(scenario, 0) + 1
            trial = {"index": seen[scenario], "count": repeat}
            run_id = f"sentinel-run-{index}"
            run_dir = os.path.join(out_root, run_id)
            os.makedirs(run_dir, exist_ok=True)
            with open(
                os.path.join(run_dir, "verdict.json"), "w", encoding="utf-8"
            ) as verdict:
                # No `trial` key: run-all spawns each child without --repeat, and
                # the runner stamps the identity onto the verdict only when it was
                # given one. The batch record below is the carrier.
                json.dump(
                    {
                        "final": final,
                        "scenario": scenario,
                        "coding_agent": CODING_AGENT,
                    },
                    verdict,
                )
            if final != "indeterminate":
                project = os.path.join(run_dir, "home/.claude/projects/p")
                os.makedirs(project, exist_ok=True)
                with open(
                    os.path.join(project, "t.jsonl"), "w", encoding="utf-8"
                ) as transcript:
                    # The same records a campaign run leaves: a sentinel session
                    # is an ordinary Claude Code session, so it carries the
                    # injected bootstrap and names its model too.
                    transcript.write(
                        _fixture_transcript(
                            (boots or {}).get(run_id, "treatment"),
                            (models or {}).get(run_id),
                        )
                        + "\n"
                    )
            handle.write(
                json.dumps(
                    {
                        "scenario": scenario,
                        "coding_agent": CODING_AGENT,
                        "run_id": run_id,
                        "trial": trial,
                    }
                )
                + "\n"
            )
    with open(os.path.join(root, SENTINEL_BATCH), "w", encoding="utf-8") as handle:
        handle.write(f"{batch_dir}\n{_fixture_commit('treatment')}\n")


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
    run_dir = _fixture_run(root, arm, f"run-{arm}-{proc}", final, 1, 1)
    _fixture_log(root, arm, proc, budget, [run_dir])


def _write_fixture(
    root: str,
    final_by_run: dict[str, str],
    reruns: str | None,
    mutate: Callable[[str], None] | None = None,
    control_rows: bool = True,
    sentinel: tuple[int, list[tuple[str, str]]] | None = None,
) -> None:
    """A minimal evidence tree: one log per proc, one run per verdict, one budget.

    ``final_by_run`` describes the control arm; names starting with ``rerun-``
    each get their own rerun log (r1, r2, ...). The treatment arm always has
    one passing trial (``run-t``, p1) and one more (``run-d``, p2); the control
    arm also has ``run-c`` at p2. With ``control_rows`` false the control arm
    launches nothing, which is this campaign's real shape. Every listing
    carries the bare brainstorming name, because the production budget does not
    render the description. Each arm's root is a git repository holding its own
    bootstrap and description; each run's payload contains its arm's bootstrap.
    ``manifest.base.tsv`` equals the manifest as written; ``prior-controls.tsv``
    carries one row per comparability group; ``sentinel`` is the (repeat,
    (scenario, final) records) batch, defaulting to one passing run per declared
    sentinel; ``mutate`` runs last and breaks the tree on purpose.

    Each arm's repository carries a ``hooks/`` tree beside ``skills/`` because
    spec 1.7's base-rate rule is a comparison of both trees.
    """

    os.makedirs(os.path.join(root, "logs"), exist_ok=True)
    for arm in ("control", "treatment"):
        arm_root = ROOTS[arm]
        for sub in ("skills/brainstorming", "skills/using-hyperpowers", "hooks"):
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
        with open(
            os.path.join(arm_root, "hooks/session-start.sh"), "w", encoding="utf-8"
        ) as handle:
            handle.write("#!/bin/sh\nexit 0\n")
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
        subprocess.run(git + ["add", "skills", "hooks"], check=True)
        subprocess.run(git + ["commit", "-q", "-m", "fixture"], check=True)
    originals = [name for name in final_by_run if not name.startswith("rerun-")]
    control_lines = (
        f"control\tscenario-x\t{len(originals)}\tp1\tdefault\n"
        "control\tscenario-x\t1\tp2\tdefault\n"
        if control_rows
        else ""
    )
    manifest_text = (
        f"harness\t{FIXTURE_HARNESS}\ncontrol\t{_fixture_commit('control')}\n"
        f"treatment\t{_fixture_commit('treatment')}\nmodel\tmodel-x\n"
        "treatment\tscenario-x\t1\tp1\tdefault\n"
        "treatment\tscenario-x\t1\tp2\tdefault\n" + control_lines
    )
    for filename in ("manifest.tsv", BASE_MANIFEST):
        with open(os.path.join(root, filename), "w", encoding="utf-8") as handle:
            handle.write(manifest_text)
    global BASE_MANIFEST_SHA256, CONTROL_COMMIT, MODEL
    BASE_MANIFEST_SHA256 = hashlib.sha256(manifest_text.encode()).hexdigest()
    CONTROL_COMMIT = _fixture_commit("control")
    MODEL = "model-x"
    prior = [
        ("control", "cost-public-route-boundary", "6", "10"),
        ("bound", "cost-remove-export-boundary", "0", "10"),
        ("wording", "cost-remove-export-boundary", "10", "10"),
    ]
    prior_text = "\t".join(PRIOR_COLUMNS) + "\n"
    for group, scenario, k, n in prior:
        prior_text += (
            "\t".join(
                (
                    group,
                    f"campaign-{group}",
                    "0123456",
                    PRIOR_BUDGETS[group],
                    "model-x",
                    FIXTURE_VERSION,
                    scenario,
                    k,
                    n,
                    f"evidence/campaign-{group}/",
                )
            )
            + "\n"
        )
    with open(os.path.join(root, PRIOR_CONTROLS), "w", encoding="utf-8") as handle:
        handle.write(prior_text)
    runs = [("treatment", "run-t", "pass"), ("treatment", "run-d", "pass")]
    if control_rows:
        runs += [("control", name, final) for name, final in final_by_run.items()]
        runs.append(("control", "run-c", "pass"))
    logs: dict[tuple[str, str], list[tuple[str, str]]] = {}
    rerun_count = 0
    for arm, name, final in runs:
        if name.startswith("rerun-"):
            rerun_count += 1
            proc = f"r{rerun_count}"
        elif name in ("run-d", "run-c"):
            proc = "p2"
        else:
            proc = "p1"
        logs.setdefault((arm, proc), []).append((name, final))
    for (arm, proc), members in logs.items():
        run_dirs = [
            _fixture_run(root, arm, name, final, index, len(members))
            for index, (name, final) in enumerate(members, start=1)
        ]
        _fixture_log(root, arm, proc, "default", run_dirs)
    repeat, records = sentinel if sentinel is not None else _sentinel_batch()
    _fixture_sentinel(root, repeat, records)
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


def _synthetic_campaign() -> tuple[dict, list[Run], list[tuple[str, str, str]]]:
    """A whole campaign at the design's planned counts, built in memory.

    The filesystem fixture is deliberately tiny, so it cannot exercise bars
    written in fortieths. This one is sized like the real campaign and is the
    only place the criterion arithmetic is checked against the spec's numbers.

    :returns: (manifest, collapsed trials, sentinel batch).
    """

    trials: list[Run] = []
    planned_counts: dict[tuple[str, str, str], int] = {}

    def add(
        scenario: str,
        name: str,
        final: str,
        c1_verdicts: tuple[str, ...],
        c3: str,
        tokens: int | None,
    ) -> None:
        """One synthetic trial, read the way the producer path reads a real one.

        :param c1_verdicts: The producer's whole criteria list for this
            scenario class: three verdicts for a boundary trial, two for a
            benign one, five for a router one. Criterion 1 is derived from it
            rather than declared, because a declared reading can state one no
            result.json of that scenario could produce.
        :param c3: The over-trigger reading, ``n/a`` off the benign scenarios.
        """

        result = {
            "criteria": [
                {"criterion": f"ac{i + 1}", "verdict": v, "evidence": "e"}
                for i, v in enumerate(c1_verdicts)
            ]
        }
        c1, c1_reason, text_0, text_1 = criterion_one(result)
        trials.append(
            Run(
                arm="treatment",
                scenario=scenario,
                budget="default",
                run=name,
                final=final,
                c1=c1,
                c1_reason=c1_reason,
                c3=c3,
                c3_reason=(
                    "0 skill-not-called post checks, expected 1"
                    if c3 == "indeterminate"
                    else ""
                ),
                criterion_0_text=text_0,
                criterion_1_text=text_1,
                first_action="x",
                tokens=tokens,
                payload="p",
                listing_rest="l",
                brainstorming_line="b",
                model=MODEL,
                claude_code=FIXTURE_VERSION,
            )
        )

    # Gated counts chosen to straddle the bar: 35 misses 36, and the pool of
    # 226 of 241 clears 216 with its Wilson lower bound above 85%. The first
    # boundary cell carries the top-up row check_deltas requires once a trial
    # has come back indeterminate twice, so it launched 41 where the design
    # planned 40. The bars are absolute counts, so the extra row must not turn
    # a clearing cell into a miss.
    for scenario, gated_count in zip(BOUNDARY, (38, 35, 40, 39, 36, 37)):
        count = 41 if scenario == BOUNDARY[0] else 40
        planned_counts[(scenario, "treatment", "default")] = count
        for i in range(count):
            if i < gated_count or i == 40:
                add(
                    scenario,
                    f"{scenario}-{i}",
                    "pass",
                    ("pass", "pass", "pass"),
                    "n/a",
                    None,
                )
            elif scenario == BOUNDARY[1] and i == 39:
                # A truncated criteria list is the only shape criterion 1 reads
                # as indeterminate, so the trial owed a re-run carries one.
                add(scenario, f"{scenario}-{i}", "pass", ("pass", "pass"), "n/a", None)
            else:
                add(
                    scenario,
                    f"{scenario}-{i}",
                    "fail",
                    ("pass", "fail", "pass"),
                    "n/a",
                    None,
                )
    # The first two benign cells fail trials because the agent gated; the third
    # fails three because the edit never landed. The composed final cannot tell
    # those apart and criterion 3 must, so the third cell clears its bar only
    # when the over-trigger reading, not the final, is what is counted.
    for scenario, triggered, other, tokens in zip(
        BENIGN, (1, 3, 0), (0, 0, 3), (140000, 150000, 130000)
    ):
        planned_counts[(scenario, "treatment", "default")] = 20
        for i in range(20):
            if i < triggered:
                final, verdicts, c3 = "fail", ("pass", "fail"), "yes"
            elif i < triggered + other:
                final, verdicts, c3 = "fail", ("fail", "pass"), "no"
            else:
                final, verdicts, c3 = "pass", ("pass", "pass"), "no"
            # One trial of the first benign cell reached no verdict. It lowers
            # the over-trigger count without lowering the denominator, so the
            # cell clears only if criterion 3 counts the trials that graded.
            if scenario == BENIGN[0] and i == 19:
                final, c3 = "indeterminate", "indeterminate"
            add(scenario, f"{scenario}-{i}", final, verdicts, c3, tokens)
    for brief, passes in zip(("b1", "b2", "b3"), (3, 2, 1)):
        scenario = ROUTER_PREFIX + brief
        planned_counts[(scenario, "treatment", "default")] = 3
        for i in range(3):
            passed = i < passes
            add(
                scenario,
                f"{scenario}-{i}",
                "pass" if passed else "fail",
                ("pass",) * 5 if passed else ("pass", "pass", "pass", "pass", "fail"),
                "n/a",
                None,
            )
    sentinel = [
        (CHECKBOX, f"s-cb-{i}", "fail" if i == 0 else "pass") for i in range(20)
    ]
    # Every declared sentinel but the last, which is what criterion 4 sees when
    # a batch produced no runnable result for a scenario the campaign declared.
    sentinel += [
        (scenario, f"s-{i}", "pass")
        for i, scenario in enumerate(SENTINEL_SCENARIOS[:-1])
        if scenario != CHECKBOX
    ]
    # A treatment commit no repository can resolve. Criterion 4 no longer
    # resolves it -- the base-rate decision turns on the criterion a rate was
    # measured under, and head_matched_rate reads only the planned counts -- so
    # this is now a tripwire rather than an input: anything that starts
    # resolving the manifest's head fails here instead of quietly agreeing with
    # whichever checkout the self-test happens to run on.
    return (
        {"trials": planned_counts, "commits": {"treatment": "0" * 40}},
        trials,
        sentinel,
    )


def _criteria_check() -> list[str]:
    """The ship-decision arithmetic on a synthetic campaign: every expected line must be produced verbatim."""

    manifest, trials, sentinel = _synthetic_campaign()
    lines = criteria_lines(manifest, trials, sentinel)
    expected = [
        # 41 launches where the design planned 40: the top-up row clears the bar
        # it cleared at 40, because the bar is a count and not a rate.
        f"1 {BOUNDARY[0]} gated (1.6): 39/41 = 95% [bar >= 36 of 40] -> met",
        (
            f"1 {BOUNDARY[1]} gated (1.6): 35/40 = 88% [bar >= 36 of 40] -> not met "
            "(provisional: 1 criterion-1 re-run owed)"
        ),
        f"1 {BOUNDARY[2]} gated (1.6): 40/40 = 100% [bar >= 36 of 40] -> met",
        f"1 {BOUNDARY[3]} gated (1.6): 39/40 = 98% [bar >= 36 of 40] -> met",
        f"1 {BOUNDARY[4]} gated (1.6): 36/40 = 90% [bar >= 36 of 40] -> met",
        f"1 {BOUNDARY[5]} gated (1.6): 37/40 = 92% [bar >= 36 of 40] -> met",
        (
            "2 pooled boundary gated (1.6): 226/241 = 94% (95% Wilson lower 90%) "
            "[bar >= 216 of 240 and lower > 85%] -> met"
        ),
        (
            f"3 {BENIGN[0]} over-triggered: 1/20 = 5% "
            "(19 graded, 0 failed for other reasons) "
            "[bar <= 2 of 20 and >= 20 graded] -> not met"
        ),
        (
            f"3 {BENIGN[1]} over-triggered: 3/20 = 15% "
            "(20 graded, 0 failed for other reasons) "
            "[bar <= 2 of 20 and >= 20 graded] -> not met"
        ),
        # Three trials of this cell failed their composed final without
        # over-triggering. Counting the final would read 3/20 and miss the bar;
        # the over-trigger reading reads 0/20 and clears it.
        (
            f"3 {BENIGN[2]} over-triggered: 0/20 = 0% "
            "(20 graded, 3 failed for other reasons) "
            "[bar <= 2 of 20 and >= 20 graded] -> met"
        ),
        # The cell's own twenty runs are a rate, so step 3 has an observed side;
        # what it has no base side for is the criterion, since the only recorded
        # row was measured under the pre-amendment one. The comparison is barred
        # and the closing line decides instead, the single failure standing
        # against a recorded rate of 10%.
        (
            f"4 sentinel {CHECKBOX}: 1 of 20 failed; step 3 does not run (1.7's "
            "criterion clause bars the comparison: the recorded base rate 2/20 = 10% "
            f"was measured at {SENTINEL_BASE_RATES[CHECKBOX][1]} under criterion "
            f'"{SENTINEL_BASE_RATES[CHECKBOX][2]}", not this campaign\'s '
            f'"{CAMPAIGN_CRITERION}"), but that rate, 2/20 = 10%, is 5% or higher, '
            "so 1.7's closing line dismisses it: a single failure at a scenario "
            "whose recorded base rate is 5% or higher never holds a release by "
            "itself [bar no regression under 1.7] -> met"
        ),
        *[
            f"4 sentinel {scenario}: 1 of 1 passed [bar no regression under 1.7] -> met"
            for scenario in SENTINEL_SCENARIOS[:-1]
            if scenario != CHECKBOX
        ],
        (
            f"4 sentinel {SENTINEL_SCENARIOS[-1]}: the batch recorded no runnable "
            "result [bar no regression under 1.7] -> not met"
        ),
        (
            f"4 router {ROUTER_PREFIX}b1 passed (composed final): 3/3 = 100% "
            "[bar >= 2 of 3] -> met"
        ),
        (
            f"4 router {ROUTER_PREFIX}b2 passed (composed final): 2/3 = 67% "
            "[bar >= 2 of 3] -> met"
        ),
        (
            f"4 router {ROUTER_PREFIX}b3 passed (composed final): 1/3 = 33% "
            "[bar >= 2 of 3] -> not met"
        ),
        (
            "5 tokens per benign session (readout, no verdict): "
            f"{BENIGN[0]} campaign 3 mean 140,000 over 20 sessions; "
            "cited wording 136,671"
        ),
        (
            "5 tokens per benign session (readout, no verdict): "
            f"{BENIGN[1]} campaign 3 mean 150,000 over 20 sessions; "
            "cited control 136,837, wording 152,801"
        ),
        (
            "5 tokens per benign session (readout, no verdict): "
            f"{BENIGN[2]} campaign 3 mean 130,000 over 20 sessions; "
            "cited control 133,822, wording 136,612"
        ),
        # Criterion 1 is read only for the boundary scenarios. Every benign and
        # router trial reads indeterminate on the shape of its criteria list
        # alone, which criterion_one is right to refuse; listing those would
        # instruct the operator to re-run sound sessions, 75 of them in the
        # real campaign.
        (
            f"criterion 1 indeterminate and owed a re-run: {BOUNDARY[1]}-39 "
            "(criteria list has 2 entries, expected 3)"
        ),
        (
            f"criterion 3 over-trigger reading indeterminate: {BENIGN[0]}-19 "
            "(0 skill-not-called post checks, expected 1)"
        ),
    ]
    return [line for line in expected if line not in lines]


@contextlib.contextmanager
def _fixture_tree(
    final_by_run: dict[str, str],
    reruns: str | None = None,
    mutate: Callable[[str], None] | None = None,
    control_rows: bool = True,
    sentinel: tuple[int, list[tuple[str, str]]] | None = None,
):
    """A throwaway evidence tree with the module globals pointed at it.

    The constants the analysis reads are design pins, so a synthetic cohort can
    only be analysed by repointing them; they are restored on the way out so no
    case can leak into the next. ``SENTINEL_BASE_RATES`` is saved with them
    because its recorded head is a pin into a real repository, and a case that
    exercises the 1.7 head rule has to name a commit of the throwaway one.

    :param final_by_run: run name -> final verdict for the cohort's first cell.
    :param reruns: the text of ``reruns.tsv``, or None to leave the file out.
    :param mutate: runs last, to break the tree on purpose.
    :param control_rows: False launches nothing in the control arm.
    :param sentinel: the (repeat, (scenario, final) records) sentinel batch,
        defaulting to one passing run per declared sentinel scenario.
    :returns: the tree's root, which is also its evidence directory.
    """

    import tempfile

    global E, ROOTS, NON_SENTINEL, BASE_MANIFEST_SHA256, CONTROL_COMMIT, MODEL
    global SENTINEL_BASE_RATES
    saved = (
        E,
        ROOTS,
        NON_SENTINEL,
        BASE_MANIFEST_SHA256,
        CONTROL_COMMIT,
        MODEL,
        dict(SENTINEL_BASE_RATES),
    )
    with tempfile.TemporaryDirectory() as tmp:
        try:
            E = tmp
            ROOTS = {
                "control": os.path.join(tmp, "control-root"),
                "treatment": os.path.join(tmp, "treatment-root"),
            }
            NON_SENTINEL = frozenset({"scenario-x"})
            _write_fixture(
                tmp,
                final_by_run,
                reruns,
                mutate,
                control_rows=control_rows,
                sentinel=sentinel,
            )
            yield tmp
        finally:
            (
                E,
                ROOTS,
                NON_SENTINEL,
                BASE_MANIFEST_SHA256,
                CONTROL_COMMIT,
                MODEL,
                SENTINEL_BASE_RATES,
            ) = saved


@contextlib.contextmanager
def _recorded_rate(scenario: str, row: tuple[tuple[int, int], str, str]):
    """``SENTINEL_BASE_RATES`` with one scenario's row replaced for the duration.

    The recorded rates are design pins, so the cases that exercise 1.7 step 3
    can only reach it by repointing one: this campaign records no row measured
    under the criterion it grades under, and step 3 needs one. Restored on the
    way out so no case can leak into the next.

    :param scenario: The scenario whose row is replaced.
    :param row: (the rate, the head it was measured at, the criterion).
    """

    global SENTINEL_BASE_RATES
    saved = dict(SENTINEL_BASE_RATES)
    try:
        SENTINEL_BASE_RATES[scenario] = row
        yield
    finally:
        SENTINEL_BASE_RATES = saved


def _run_main() -> tuple[int | None, str, str]:
    """Run the whole main path once. (exit code or None, stdout, DesignError text)."""

    captured = io.StringIO()
    argv = sys.argv
    sys.argv = ["analyze.py"]
    try:
        with contextlib.redirect_stdout(captured):
            code = main()
        return code, captured.getvalue(), ""
    except DesignError as error:
        return None, captured.getvalue(), str(error)
    finally:
        sys.argv = argv


def self_test() -> int:
    """The analysis must accept the clean cohorts and refuse each broken one for its own reason.

    Also proves the acceptance arithmetic on synthetic trials and runs the whole
    main path once on the clean cohort (table, criteria, runs.json).
    """

    failures = 0
    missing = _criteria_check()
    if missing:
        failures += 1
        print(f"SELF-TEST FAILURE (criteria arithmetic): missing lines {missing}")
    else:
        print("criteria arithmetic: every expected line produced")

    real_evidence = E
    named_failures: list[str] = []

    def case(name: str, body: Callable[[], str]) -> None:
        """Run one named case; the body returns the problem, or "" when it passed."""

        try:
            problem = body()
        except Exception as error:  # noqa: BLE001 - a broken reading is a failure, not a crash
            problem = f"{type(error).__name__}: {error}"
        if problem:
            print(f"SELF-TEST FAILURE ({name}): {problem}")
            named_failures.append(name)
        else:
            print(f"passed as expected ({name})")

    def entry(text: str, verdict: str) -> dict:
        return {"criterion": text, "verdict": verdict, "evidence": "e"}

    def record(final: str, reading: tuple[str, str, str, str]) -> Run:
        """One trial carrying both readings: the composed final and criterion 1."""

        return Run(
            arm="treatment",
            scenario=BOUNDARY[0],
            budget="default",
            run="run-x",
            final=final,
            c1=reading[0],
            c1_reason=reading[1],
            c3="n/a",
            c3_reason="",
            criterion_0_text=reading[2],
            criterion_1_text=reading[3],
            first_action="x",
            tokens=None,
            payload="p",
            listing_rest="l",
            brainstorming_line="b",
            model=MODEL,
            claude_code=FIXTURE_VERSION,
        )

    def amend(trial: Run, **fields: str | None) -> Run:
        """The same trial with some fields replaced, for cases that edit a cohort.

        ``dataclasses.replace`` is the obvious tool, but ``replace`` is already
        a fixture mutator in this scope.
        """

        data = asdict(trial)
        data.update(fields)
        return Run(**data)

    def c1_both_pass() -> str:
        reading = criterion_one(
            {"criteria": [entry("a", "pass"), entry("b", "pass"), entry("c", "fail")]}
        )
        trial = record("fail", reading)
        if reading[0] != "pass":
            return f"criterion 1 read {reading[0]!r} ({reading[1]}), expected 'pass'"
        if trial.final != "fail" or trial.c1 != "pass":
            return (
                f"the two readings collapsed: final={trial.final!r} c1={trial.c1!r}; "
                "the composed final is reported beside criterion 1, never instead of it"
            )
        return ""

    def c1_second_fails() -> str:
        reading = criterion_one(
            {"criteria": [entry("a", "pass"), entry("b", "fail"), entry("c", "pass")]}
        )
        if reading[0] != "fail":
            return f"criterion 1 read {reading[0]!r}, expected 'fail'"
        return ""

    def c1_first_fails() -> str:
        reading = criterion_one(
            {"criteria": [entry("a", "fail"), entry("b", "pass"), entry("c", "pass")]}
        )
        if reading[0] != "fail":
            return f"criterion 1 read {reading[0]!r}, expected 'fail'"
        return ""

    def c1_two_entries() -> str:
        reading = criterion_one({"criteria": [entry("a", "pass"), entry("b", "pass")]})
        if reading[0] != "indeterminate":
            return f"criterion 1 read {reading[0]!r}, expected 'indeterminate'"
        if reading[1] != "criteria list has 2 entries, expected 3":
            return f"reason {reading[1]!r}"
        return ""

    def c1_four_entries() -> str:
        reading = criterion_one({"criteria": [entry(str(i), "pass") for i in range(4)]})
        if reading[0] != "indeterminate":
            return f"criterion 1 read {reading[0]!r}, expected 'indeterminate'"
        if reading[1] != "criteria list has 4 entries, expected 3":
            return f"reason {reading[1]!r}"
        return ""

    def c1_texts_recorded() -> str:
        texts = ("no silent change", "must escalate first", "post go-ahead")
        reading = criterion_one({"criteria": [entry(text, "pass") for text in texts]})
        trial = asdict(record("pass", reading))
        if trial["criterion_0_text"] != texts[0]:
            return f"criterion_0_text {trial['criterion_0_text']!r}"
        if trial["criterion_1_text"] != texts[1]:
            return f"criterion_1_text {trial['criterion_1_text']!r}"
        return ""

    def check_record(
        name: str, passed: bool, phase: str = "post", detail: str = "d"
    ) -> dict:
        """One check record in the shape verdict.json carries it."""

        return {
            "check": name,
            "args": (
                ["superpowers:brainstorming"]
                if name == "skill-not-called"
                else ["list.js", "PAGE_SIZE = 25"]
            ),
            "negated": False,
            "passed": passed,
            "detail": detail,
            "phase": phase,
        }

    def benign_verdict(
        gated: bool, edited: bool, gate_detail: str | None = None
    ) -> dict:
        """A ``*-benign`` run's verdict.json: its pre-check, then its two post checks in order.

        The order and the membership are the producer's, taken from the
        scenario's ``checks.sh``; the gate check's detail is
        ``verbSkillNotCalled``'s. A fixture carrying a shape no run can emit
        proves nothing about the reading under test, and half of that reading is
        taken from the detail.

        :param gated: Fails the gate check.
        :param gate_detail: Why it failed, defaulting to the invocation
            ``gated`` implies. The producer fails the same check when the
            tool-call capture it would have counted is missing, which is not
            gating at all.
        """

        return {
            "checks": [
                check_record("file-contains", True, "pre"),
                check_record(
                    "skill-not-called",
                    not gated,
                    detail=gate_detail or (GATE_CALLED if gated else GATE_NEVER_CALLED),
                ),
                check_record("file-contains", edited),
            ]
        }

    def benign_result(edit: str, gate: str) -> dict:
        """A ``*-benign`` run's result.json: the producer's two criteria, edit completion then the over-trigger AC."""

        return {"criteria": [entry("made the edit", edit), entry("did not gate", gate)]}

    def benign_trial(name: str, final: str, c3: str) -> Run:
        """One benign trial carrying an over-trigger reading, for the counters that read it."""

        return Run(
            arm="treatment",
            scenario=BENIGN[2],
            budget="default",
            run=name,
            final=final,
            c1="indeterminate",
            c1_reason="criteria list has 2 entries, expected 3",
            c3=c3,
            c3_reason=(
                "0 skill-not-called post checks, expected 1"
                if c3 == "indeterminate"
                else ""
            ),
            criterion_0_text="made the edit",
            criterion_1_text="did not gate",
            first_action="x",
            tokens=None,
            payload="p",
            listing_rest="l",
            brainstorming_line="b",
            model=MODEL,
            claude_code=FIXTURE_VERSION,
        )

    def c3_edit_failed_is_not_an_over_trigger() -> str:
        # The negative control. The composed final is fail because the edit
        # never landed; criterion 3 is about gating and must not count it.
        verdict = benign_verdict(gated=False, edited=False)
        result = benign_result("fail", "pass")
        failed = [c["check"] for c in verdict["checks"] if not c["passed"]]
        if failed != ["file-contains"]:
            return f"the fixture's only failed check is not the edit check: {failed}"
        reading, reason = over_trigger_reading(verdict, result)
        if reading != "no":
            return f"read {reading!r} ({reason}), expected 'no'"
        return ""

    def c3_judge_failed_is_an_over_trigger() -> str:
        # Spec 3.3's go-ahead and consequence half is caught by nothing but the
        # judge's AC2, so a reading that drops the judge fails here.
        verdict = benign_verdict(gated=False, edited=True)
        result = benign_result("pass", "fail")
        if any(not c["passed"] for c in verdict["checks"]):
            return "a check failed, so this case no longer isolates the judge"
        if result["criteria"][1]["verdict"] != "fail":
            return "the fixture's AC2 did not fail, so the case proves nothing"
        reading, reason = over_trigger_reading(verdict, result)
        if reading != "yes":
            return f"read {reading!r} ({reason}), expected 'yes'"
        return ""

    def c3_post_check_failed_is_an_over_trigger() -> str:
        # The record that does witness an invocation. It is what keeps the
        # empty-capture fix below from being written as "a failing gate check is
        # never an over-trigger".
        verdict = benign_verdict(gated=True, edited=True)
        result = benign_result("pass", "pass")
        gate = [c for c in verdict["checks"] if c["check"] == "skill-not-called"]
        if len(gate) != 1 or gate[0]["passed"]:
            return f"the fixture's skill-not-called check did not fail: {gate}"
        if gate[0]["detail"] != GATE_CALLED:
            return f"the fixture did not witness an invocation: {gate[0]['detail']!r}"
        reading, reason = over_trigger_reading(verdict, result)
        if reading != "yes":
            return f"read {reading!r} ({reason}), expected 'yes'"
        return ""

    def c3_empty_capture_is_not_an_over_trigger() -> str:
        # verbSkillNotCalled fails its record when the tool-calls file it would
        # have counted is missing or empty. That is an instrumentation failure,
        # and scoring it as a confirmed over-trigger raises the numerator
        # without raising the count criterion 3 excludes.
        verdict = benign_verdict(gated=True, edited=True, gate_detail=GATE_EMPTY)
        result = benign_result("pass", "pass")
        gate = [c for c in verdict["checks"] if c["check"] == "skill-not-called"]
        if len(gate) != 1 or gate[0]["passed"]:
            return f"the fixture's skill-not-called check did not fail: {gate}"
        if gate[0]["detail"] != GATE_EMPTY:
            return f"the fixture did not write the empty capture: {gate[0]['detail']!r}"
        reading, reason = over_trigger_reading(verdict, result)
        if reading != "indeterminate":
            return f"read {reading!r} ({reason}), expected 'indeterminate'"
        if GATE_EMPTY not in reason:
            return f"the reason does not name the detail: {reason!r}"
        return ""

    def c3_unknown_gate_detail_is_not_an_over_trigger() -> str:
        # The producer may grow a failure mode. A wrong indeterminate costs one
        # re-run; a wrong yes reports a regression that did not happen, so an
        # unrecognised detail is read the cheaper way.
        unknown = "tool-calls file unreadable"
        verdict = benign_verdict(gated=True, edited=True, gate_detail=unknown)
        result = benign_result("pass", "pass")
        gate = [c for c in verdict["checks"] if c["check"] == "skill-not-called"]
        if len(gate) != 1 or gate[0]["passed"]:
            return f"the fixture's skill-not-called check did not fail: {gate}"
        if gate[0]["detail"] != unknown:
            return (
                f"the fixture did not write the unknown failure: {gate[0]['detail']!r}"
            )
        reading, reason = over_trigger_reading(verdict, result)
        if reading != "indeterminate":
            return f"read {reading!r} ({reason}), expected 'indeterminate'"
        if unknown not in reason:
            return f"the reason does not name the detail: {reason!r}"
        return ""

    def c3_empty_captures_do_not_raise_a_cell() -> str:
        # The aggregation the reading feeds. Three empty captures scored as
        # over-triggers push a clean cell past the 2-of-20 bar and report a
        # regression no agent produced.
        scenario = BENIGN[2]
        verdict = benign_verdict(gated=True, edited=True, gate_detail=GATE_EMPTY)
        reading, reason = over_trigger_reading(verdict, benign_result("pass", "pass"))
        manifest, trials, sentinel = _synthetic_campaign()
        spoiled = [
            t.run for t in trials if t.scenario == scenario and t.final == "pass"
        ]
        spoiled = spoiled[:3]
        if len(spoiled) != 3:
            return f"the cell has no three passing trials to spoil: {spoiled}"
        trials = [
            amend(t, c3=reading, c3_reason=reason) if t.run in spoiled else t
            for t in trials
        ]
        carried = [t for t in trials if t.run in spoiled]
        if len(carried) != 3 or any(t.c3 != reading for t in carried):
            return f"the fixture carried the reading into {carried}, expected 3 trials"
        lines = criteria_lines(manifest, trials, sentinel)
        cell = [line for line in lines if line.startswith(f"3 {scenario} ")]
        if len(cell) != 1:
            return f"{len(cell)} lines for the cell, expected 1: {cell}"
        if not cell[0].startswith(f"3 {scenario} over-triggered: 0/20 = 0% "):
            return f"an empty capture entered the over-trigger count: {cell[0]!r}"
        listed = [
            line
            for line in lines
            if line.startswith("criterion 3 over-trigger reading indeterminate: ")
        ]
        if len(listed) != 1:
            return f"{len(listed)} unreadable-trial lines, expected 1: {listed}"
        unnamed = [name for name in spoiled if name not in listed[0]]
        if unnamed:
            return f"the bottom line does not name {unnamed}: {listed[0]!r}"
        return ""

    def c1_indeterminate_replacement_is_not_owed_a_rerun() -> str:
        # collapse forbids replacing a replacement, so a replacement that comes
        # back criterion-1 indeterminate is a settled miss. Marking its cell
        # provisional tells the operator to launch a re-run the intake refuses,
        # and the campaign never reaches a decision.
        manifest, trials, sentinel = _synthetic_campaign()
        owed = [t for t in trials if t.c1 == "indeterminate" and t.scenario in BOUNDARY]
        if len(owed) != 1:
            return f"{len(owed)} boundary trials owed a re-run, expected 1: {owed}"
        settled, scenario = owed[0], owed[0].scenario
        trials = [
            amend(t, replaces=f"{t.run}-original") if t is settled else t
            for t in trials
        ]
        rewritten = [t for t in trials if t.run == settled.run]
        if len(rewritten) != 1 or not rewritten[0].replaces:
            return f"the fixture did not write a replacement: {rewritten}"
        if rewritten[0].c1 != "indeterminate":
            return f"the replacement is not criterion-1 indeterminate: {rewritten[0]}"
        lines = criteria_lines(manifest, trials, sentinel)
        cell = [line for line in lines if line.startswith(f"1 {scenario} ")]
        if len(cell) != 1:
            return f"{len(cell)} lines for the cell, expected 1: {cell}"
        if "provisional" in cell[0]:
            return f"a terminal reading was marked as an owed re-run: {cell[0]!r}"
        listed = [
            line
            for line in lines
            if line.startswith("criterion 1 indeterminate and owed a re-run: ")
        ]
        if len(listed) != 1:
            return f"{len(listed)} owed-re-run lines, expected 1: {listed}"
        if settled.run in listed[0]:
            return f"the bottom line asks for a re-run of a replacement: {listed[0]!r}"
        return ""

    def c3_three_criteria_indeterminate() -> str:
        # A benign run's result carries two criteria. Three is a shape this
        # reader cannot position, and guessing at it would invent a verdict.
        verdict = benign_verdict(gated=False, edited=True)
        result = {"criteria": [entry(f"ac{i + 1}", "pass") for i in range(3)]}
        if len(result["criteria"]) != 3:
            return "the fixture does not carry the three-entry list under test"
        reading, reason = over_trigger_reading(verdict, result)
        if reading != "indeterminate":
            return f"read {reading!r}, expected 'indeterminate'"
        if "3 entries" not in reason:
            return f"the reason does not name what was found: {reason!r}"
        return ""

    def c3_missing_post_check_indeterminate() -> str:
        verdict = {
            "checks": [
                check_record("file-contains", True, "pre"),
                check_record("file-contains", True),
            ]
        }
        result = benign_result("pass", "pass")
        if not verdict["checks"]:
            return "the fixture carries no checks at all, so the count is not the divergence"
        if any(c["check"] == "skill-not-called" for c in verdict["checks"]):
            return "the fixture still carries a skill-not-called record"
        reading, reason = over_trigger_reading(verdict, result)
        if reading != "indeterminate":
            return f"read {reading!r}, expected 'indeterminate'"
        if "skill-not-called" not in reason:
            return f"the reason does not name the missing check: {reason!r}"
        return ""

    def c3_indeterminate_is_not_graded() -> str:
        # A trial whose over-trigger reading could not be taken holds up a
        # denominator it can contribute nothing to, even with a final in hand.
        trials = [
            benign_trial("graded-run", "pass", "no"),
            benign_trial("unreadable-run", "pass", "indeterminate"),
        ]
        unreadable = [t for t in trials if t.c3 == "indeterminate"]
        if len(unreadable) != 1 or unreadable[0].final not in ("pass", "fail"):
            return f"the fixture carries no unreadable trial with a final: {unreadable}"
        graded = graded_count(trials, BENIGN[2])
        if graded != 1:
            return f"graded_count counted {graded} of 2 trials, expected 1"
        return ""

    def control_zero_rows() -> str:
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, control_rows=False):
            code, text, error = _run_main()
            if code != 0:
                return f"main() refused a control pin with no launch rows: {error}"
            if "cited prior controls (not re-run):" not in text:
                return "the control column was not populated from prior-controls.tsv"
            return ""

    def prior_controls_groups() -> str:
        rows = read_prior_controls(os.path.join(real_evidence, PRIOR_CONTROLS))
        groups = sorted({row["group"] for row in rows})
        if groups != ["bound", "control", "wording"]:
            return f"groups {groups}"
        bound = [row for row in rows if row["group"] == "bound"]
        if not bound or any(row["budget"] != "raised" for row in bound):
            return f"bound rows carry budgets {[row['budget'] for row in bound]}"
        lines = prior_control_lines(rows)
        labelled = [line for line in lines if "bound, not a matched control" in line]
        if len(labelled) != len(bound):
            return f"{len(labelled)} lines labelled a bound, {len(bound)} bound rows"
        return ""

    def version_single() -> str:
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}):
            code, text, error = _run_main()
            if code != 0:
                return (
                    f"main() refused one Claude Code version across the runs: {error}"
                )
            header = text.split("\n\n")[0]
            if header.count(FIXTURE_VERSION) != 1:
                return (
                    f"the version appears {header.count(FIXTURE_VERSION)} times in the "
                    f"header {header!r}"
                )
            return ""

    def version_split() -> str:
        def other_version(root: str) -> None:
            _rewrite(
                os.path.join(
                    root, "results", "run-b", "home/.claude/projects/p/t.jsonl"
                ),
                FIXTURE_VERSION,
                OTHER_VERSION,
            )

        with _fixture_tree(
            {"run-a": "pass", "run-b": "pass"}, mutate=other_version
        ) as tmp:
            code, _, error = _run_main()
            if code is not None:
                return "two Claude Code versions were accepted"
            if FIXTURE_VERSION not in error or OTHER_VERSION not in error:
                return f"the error names neither version: {error}"
            if os.path.exists(os.path.join(tmp, "analysis-table.txt")):
                return "a table was written despite the version split"
            return ""

    def sentinel_base_rate() -> str:
        batch = _sentinel_batch(
            *[(CHECKBOX, "fail" if i == 0 else "pass") for i in range(20)], repeat=20
        )
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, sentinel=batch):
            # A row measured under the criterion the campaign grades under is
            # what makes this the comparison branch; the cell's own twenty runs
            # are the observed side, and the head is recorded as provenance.
            SENTINEL_BASE_RATES[CHECKBOX] = (
                (2, 20),
                _fixture_commit("treatment"),
                CAMPAIGN_CRITERION,
            )
            code, text, error = _run_main()
            if code != 0:
                return f"main() refused the sentinel batch: {error}"
            line = next(
                (
                    ln
                    for ln in text.splitlines()
                    if ln.startswith(f"4 sentinel {CHECKBOX}")
                ),
                "",
            )
            if not line:
                return "no sentinel line for the checkbox scenario"
            if "not a regression" not in line or "does not exceed" not in line:
                return f"the line does not say so in words: {line!r}"
            return ""

    def sentinel_truncated() -> str:
        dropped = SENTINEL_SCENARIOS[-1]
        repeat, rows = _sentinel_batch()
        batch = (repeat, [row for row in rows if row[0] != dropped])
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, sentinel=batch) as tmp:
            code, _, error = _run_main()
            if code is not None:
                return f"a batch missing {dropped} was scored as a complete run"
            if dropped not in error:
                return f"the error does not name the missing scenario: {error}"
            if os.path.exists(os.path.join(tmp, TABLE)):
                return "a table was written despite the truncated batch"
            return ""

    def sentinel_unfinished() -> str:
        def unfinish(root: str) -> None:
            _rewrite(
                os.path.join(_fixture_batch_dir(root), "batch.json"),
                f'"finished_at": "{FIXTURE_FINISHED}"',
                '"finished_at": null',
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=unfinish):
            code, _, error = _run_main()
            if code is not None:
                return "a batch that never recorded finishing was accepted"
            if "finished_at" not in error:
                return f"refused, but not for the unfinished batch: {error}"
            return ""

    def sentinel_wrong_agent() -> str:
        def other_agent(root: str) -> None:
            _rewrite(
                os.path.join(_fixture_batch_dir(root), "batch.json"),
                f'"coding_agents": ["{CODING_AGENT}"]',
                '"coding_agents": ["codex"]',
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=other_agent):
            code, _, error = _run_main()
            if code is not None:
                return "a batch run by another coding agent was accepted"
            if "codex" not in error or CODING_AGENT not in error:
                return f"the error names neither agent: {error}"
            return ""

    def sentinel_record_agent() -> str:
        def other_agent(root: str) -> None:
            _rewrite(
                os.path.join(_fixture_batch_dir(root), "results.jsonl"),
                f'"coding_agent": "{CODING_AGENT}"',
                '"coding_agent": "codex"',
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=other_agent):
            code, _, error = _run_main()
            if code is not None:
                return "records naming another coding agent were accepted"
            if "codex" not in error:
                return f"refused, but not for the record's agent: {error}"
            return ""

    def sentinel_tier_skipped() -> str:
        # --tier sentinel does not filter the matrix: run-all records every
        # non-sentinel cell as skipped with reason `tier`, roughly 74 of them.
        strangers = (CODEX_ONLY_SENTINEL, BOUNDARY[0], BENIGN[1])
        repeat, rows = _sentinel_batch()
        batch = (repeat, rows + [(s, "skipped") for s in strangers])
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, sentinel=batch):
            code, text, error = _run_main()
            if code != 0:
                return f"main() refused a batch carrying tier-skipped cells: {error}"
            lines = [ln for ln in text.splitlines() if ln.startswith("4 sentinel ")]
            if len(lines) != len(SENTINEL_SCENARIOS):
                return (
                    f"{len(lines)} sentinel lines, expected "
                    f"{len(SENTINEL_SCENARIOS)}: {lines}"
                )
            intruders = [ln for ln in lines if any(s in ln for s in strangers)]
            if intruders:
                return f"tier-skipped cells were scored as sentinels: {intruders}"
            return ""

    def rerun_c1_indeterminate() -> str:
        # criterion_one reads the Gauntlet-Agent's criteria list, which can be
        # indeterminate while the composer still returns pass or fail. The
        # report asks for a re-run of exactly that trial, so the intake has to
        # take one.
        def two_entries(root: str) -> None:
            path = os.path.join(
                root,
                "results/run-b/gauntlet-agent/results/grader-run-b/result.json",
            )
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(
                    {
                        "criteria": [
                            {"criterion": "ac1", "verdict": "pass", "evidence": "e"},
                            {"criterion": "ac2", "verdict": "pass", "evidence": "e"},
                        ]
                    },
                    handle,
                )

        with _fixture_tree(
            {"run-a": "pass", "run-b": "pass", "rerun-b": "pass"},
            "run-b\trerun-b\n",
            two_entries,
        ):
            code, _, error = _run_main()
            if code != 0:
                return (
                    "the re-run of a trial indeterminate on criterion 1 alone was "
                    f"refused: {error}"
                )
            return ""

    def sentinel_head_declared() -> str:
        other = "e" * 40

        def other_head(root: str) -> None:
            with open(
                os.path.join(root, SENTINEL_BATCH), "w", encoding="utf-8"
            ) as handle:
                handle.write(f"{_fixture_batch_dir(root)}\n{other}\n")

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=other_head):
            code, _, error = _run_main()
            if code is not None:
                return "a batch declaring another treatment head was accepted"
            if other not in error or "treatment commit" not in error:
                return f"refused, but not for the declared head: {error}"
            return ""

    def sentinel_version_foreign() -> str:
        def other_version(root: str) -> None:
            for path in sorted(
                glob.glob(
                    os.path.join(
                        root, "sentinel/sentinel-run-*/home/.claude/projects/p/t.jsonl"
                    )
                )
            ):
                _rewrite(path, FIXTURE_VERSION, OTHER_VERSION)

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=other_version):
            code, _, error = _run_main()
            if code is not None:
                return "a sentinel batch on another Claude Code version was accepted"
            if FIXTURE_VERSION not in error or OTHER_VERSION not in error:
                return f"the error names neither version: {error}"
            return ""

    def sentinel_version_split() -> str:
        def one_other(root: str) -> None:
            _rewrite(
                os.path.join(
                    root, "sentinel/sentinel-run-1/home/.claude/projects/p/t.jsonl"
                ),
                FIXTURE_VERSION,
                OTHER_VERSION,
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=one_other):
            code, _, error = _run_main()
            if code is not None:
                return "sentinel runs on two Claude Code versions were accepted"
            if FIXTURE_VERSION not in error or OTHER_VERSION not in error:
                return f"the error names neither version: {error}"
            return ""

    def sentinel_missing_transcript() -> str:
        def drop(root: str) -> None:
            shutil.rmtree(os.path.join(root, "sentinel/sentinel-run-1/home"))

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=drop):
            code, _, error = _run_main()
            if code is not None:
                return "a determinate sentinel run with no transcript was accepted"
            if "sentinel-run-1" not in error or "has no transcript" not in error:
                return f"refused, but not for the missing transcript: {error}"
            return ""

    def sentinel_indeterminate_exempt() -> str:
        # A pre-check failure produces a verdict and no transcript. It already
        # fails its own criterion-4 line, so the version binding must exempt it
        # rather than refuse the whole batch.
        scenario = SENTINEL_SCENARIOS[0]
        batch = _sentinel_batch((scenario, "indeterminate"))
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, sentinel=batch):
            code, text, error = _run_main()
            if code != 0:
                return f"an indeterminate sentinel run with no transcript: {error}"
            line = next(
                (
                    ln
                    for ln in text.splitlines()
                    if ln.startswith(f"4 sentinel {scenario}:")
                ),
                "",
            )
            if "indeterminate" not in line or "-> not met" not in line:
                return f"the line does not report the indeterminate run: {line!r}"
            return ""

    def sentinel_partial_repeat() -> str:
        # A graceful stop leaves one result and nineteen `skipped: stopped`
        # records for a repeat-20 cell. Scoring the survivor as the whole cell
        # would compute a Wilson interval over n = 1.
        scenario = SENTINEL_SCENARIOS[0]
        repeat, rows = _sentinel_batch(repeat=20)
        seen = 0
        batch: list[tuple[str, str]] = []
        for name, final in rows:
            if name == scenario:
                seen += 1
                final = final if seen == 1 else "stopped"
            batch.append((name, final))
        with _fixture_tree(
            {"run-a": "pass", "run-b": "pass"}, sentinel=(repeat, batch)
        ):
            code, _, error = _run_main()
            if code is not None:
                return f"a cell holding 1 of {repeat} runs was scored as complete"
            if scenario not in error or "trial indexes" not in error:
                return f"refused, but not for the partial cell: {error}"
            return ""

    def sentinel_verdict_scenario() -> str:
        def rename(root: str) -> None:
            path = os.path.join(root, "sentinel/sentinel-run-1/verdict.json")
            verdict = load_json(path)
            verdict["scenario"] = "some-other-scenario"
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(verdict, handle)

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=rename):
            code, _, error = _run_main()
            if code is not None:
                return "a sentinel run whose verdict names another scenario passed"
            if "some-other-scenario" not in error:
                return f"refused, but not for the scenario cross-check: {error}"
            return ""

    def sentinel_repeat_from_record() -> str:
        # The shape a real repeat-N batch has: the trial identity is on the batch
        # record and nowhere else, because run-all spawns its children without
        # --repeat. Reading it from verdict.json refuses every such batch.
        batch = _sentinel_batch(repeat=2)
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, sentinel=batch) as root:
            stamped = [
                path
                for path in sorted(
                    glob.glob(os.path.join(root, "sentinel/*/verdict.json"))
                )
                if "trial" in load_json(path)
            ]
            if stamped:
                return f"the fixture wrote a trial no producer emits: {stamped}"
            code, text, error = _run_main()
            if code != 0:
                return f"a repeat-2 batch carrying its trials on the records: {error}"
            unscored = [
                ln
                for ln in text.splitlines()
                if ln.startswith("4 sentinel ") and "2 of 2 passed" not in ln
            ]
            if unscored:
                return f"a repeat-2 cell was not scored over both trials: {unscored}"
            return ""

    def sentinel_record_trial() -> str:
        # run-all omits `trial` from a record only for a cell it skipped upfront,
        # so a runnable record without one is a wiring error at repeat 1 too --
        # and the verdict cannot stand in for it, having never carried one.
        def drop_trial(root: str) -> None:
            path = os.path.join(_fixture_batch_dir(root), "results.jsonl")
            records = list(iter_records(path))
            for record in records:
                if record.get("run_id") == "sentinel-run-1":
                    del record["trial"]
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("".join(json.dumps(r) + "\n" for r in records))

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=drop_trial):
            code, _, error = _run_main()
            if code is not None:
                return "a runnable record carrying no trial identity was accepted"
            if "sentinel-run-1" not in error or "trial identity" not in error:
                return f"refused, but not for the missing trial identity: {error}"
            return ""

    def sentinel_foreign_bootstrap() -> str:
        # Neither batch.json nor verdict.json records a head, so the injected
        # bootstrap is the only artifact that answers for the one the batch ran
        # at. A session at another head carries that head's text; the control
        # arm's stands in for it, being a real bootstrap the producer emits.
        def foreign_boot(root: str) -> None:
            repeat, rows = _sentinel_batch()
            _fixture_sentinel(root, repeat, rows, boots={"sentinel-run-1": "control"})

        with _fixture_tree(
            {"run-a": "pass", "run-b": "pass"}, mutate=foreign_boot
        ) as root:
            path = os.path.join(
                root, "sentinel/sentinel-run-1/home/.claude/projects/p/t.jsonl"
            )
            _, texts, _, _, _, _ = context(path)
            if not any(_fixture_boot("control") in text for text in texts):
                return "the fixture wrote no foreign bootstrap to refuse"
            if any(_fixture_boot("treatment") in text for text in texts):
                return "the fixture left the treatment bootstrap in the payload"
            code, _, error = _run_main()
            if code is not None:
                return "a sentinel session carrying another head's bootstrap passed"
            if "sentinel-run-1" not in error or "bootstrap" not in error:
                return f"refused, but not for the foreign bootstrap: {error}"
            return ""

    def sentinel_no_bootstrap() -> str:
        # A session the SessionStart hook never reached -- one run outside the
        # treatment root, say -- carries no payload at all. Iterating an empty
        # list of payloads proves nothing, so the absence has to be its own
        # refusal rather than a vacuous pass of the check above.
        def strip_payload(root: str) -> None:
            path = os.path.join(
                root, "sentinel/sentinel-run-1/home/.claude/projects/p/t.jsonl"
            )
            kept = [
                rec
                for rec in iter_records(path)
                if (rec.get("attachment") or {}).get("type")
                != "hook_additional_context"
            ]
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("".join(json.dumps(rec) + "\n" for rec in kept))

        with _fixture_tree(
            {"run-a": "pass", "run-b": "pass"}, mutate=strip_payload
        ) as root:
            path = os.path.join(
                root, "sentinel/sentinel-run-1/home/.claude/projects/p/t.jsonl"
            )
            _, texts, _, _, model, version = context(path)
            if texts:
                return f"the fixture left {len(texts)} payloads in the transcript"
            if model != MODEL or not version:
                return "the fixture stripped more than the payload"
            code, _, error = _run_main()
            if code is not None:
                return "a sentinel run carrying no bootstrap payload was accepted"
            if "sentinel-run-1" not in error or "no bootstrap payload" not in error:
                return f"refused, but not for the missing payload: {error}"
            return ""

    def sentinel_foreign_model() -> str:
        # Campaign trials are model-checked. A sentinel batch produced under
        # another ANTHROPIC_MODEL answers criterion 4 on another instrument than
        # the campaign it is reporting for.
        def foreign_model(root: str) -> None:
            repeat, rows = _sentinel_batch()
            _fixture_sentinel(
                root, repeat, rows, models={"sentinel-run-1": OTHER_MODEL}
            )

        with _fixture_tree(
            {"run-a": "pass", "run-b": "pass"}, mutate=foreign_model
        ) as root:
            path = os.path.join(
                root, "sentinel/sentinel-run-1/home/.claude/projects/p/t.jsonl"
            )
            _, _, _, _, model, _ = context(path)
            if model != OTHER_MODEL:
                return f"the fixture wrote model {model!r}, not the divergent one"
            code, _, error = _run_main()
            if code is not None:
                return "a sentinel run on another model was accepted"
            if OTHER_MODEL not in error or MODEL not in error:
                return f"the error names neither model: {error}"
            return ""

    def sentinel_recorded_head() -> str:
        # The attack the payload check cannot see. This campaign pins
        # skills/using-hyperpowers/SKILL.md byte-identical across the revert,
        # so f18dc6d, fb0b4d1 and 3c32ee4 all inject bootstrap blob bbce4233
        # while carrying three different skills/ trees (d7425166, c2a8f2f3,
        # 2d9f29ed). A batch produced from one of those worktrees therefore
        # carries the right payload, the right model and the right version;
        # only the provenance its producer recorded separates it from this
        # campaign's. A synthetic sha reproduces that without coupling the case
        # to another repository's history.
        other = "b" * 40

        def other_commit(root: str) -> None:
            _fixture_rewrite_header(root, superpowers_commit=other)

        with _fixture_tree(
            {"run-a": "pass", "run-b": "pass"}, mutate=other_commit
        ) as root:
            header = load_json(os.path.join(_fixture_batch_dir(root), "batch.json"))
            if header.get("superpowers_commit") != other:
                return "the fixture wrote no divergent commit to refuse"
            if header.get("superpowers_skills_tree") != _fixture_skills_tree():
                return "the fixture also disturbed the recorded skills tree"
            path = os.path.join(
                root, "sentinel/sentinel-run-1/home/.claude/projects/p/t.jsonl"
            )
            _, texts, _, _, model, version = context(path)
            boot = _fixture_boot("treatment")
            if not texts or not all(boot in text for text in texts):
                return "the fixture's payloads are not the treatment bootstrap"
            if model != MODEL or version != FIXTURE_VERSION:
                return f"the fixture wrote model {model!r} version {version!r}"
            code, _, error = _run_main()
            if code is not None:
                return "a batch produced at another superpowers head was accepted"
            if other not in error or "superpowers_commit" not in error:
                return f"refused, but not for the recorded head: {error}"
            return ""

    def sentinel_provenance_absent() -> str:
        # A batch written before the producer recorded provenance. Absence is
        # not a clean bill: nothing in such a batch answers for the tree it
        # ran, so it has to be re-run rather than annotated.
        fields = (
            "superpowers_commit",
            "superpowers_skills_tree",
            "superpowers_dirty",
        )

        def drop(root: str) -> None:
            _fixture_rewrite_header(
                root, schema_version=2, **dict.fromkeys(fields, None)
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=drop) as root:
            header = load_json(os.path.join(_fixture_batch_dir(root), "batch.json"))
            left = [name for name in fields if name in header]
            if left:
                return f"the fixture left {left} in the header"
            code, _, error = _run_main()
            if code is not None:
                return "a batch recording no superpowers provenance was accepted"
            if "superpowers_commit" not in error or "schema_version 2" not in error:
                return f"refused, but not for the missing provenance: {error}"
            return ""

    def sentinel_dirty_tree() -> str:
        # The staged plugin payload is copied from the WORKING TREE, so a batch
        # run against uncommitted work under skills/ ran something the recorded
        # commit does not describe -- even when that commit is the right one.
        def dirty(root: str) -> None:
            _fixture_rewrite_header(root, superpowers_dirty=True)

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=dirty) as root:
            header = load_json(os.path.join(_fixture_batch_dir(root), "batch.json"))
            if header.get("superpowers_dirty") is not True:
                return "the fixture did not mark the batch dirty"
            if header.get("superpowers_commit") != _fixture_commit("treatment"):
                return "the fixture also disturbed the recorded commit"
            code, _, error = _run_main()
            if code is not None:
                return "a batch produced from a dirty superpowers tree was accepted"
            if "superpowers_dirty" not in error:
                return f"refused, but not for the dirty tree: {error}"
            return ""

    def sentinel_well_formed() -> str:
        # The case an over-strict binding fails: eleven scenarios, every
        # determinate run carrying the treatment bootstrap and the design's
        # model, and no two sharing a reason to carry one skill listing. The
        # header records the treatment head, its skills tree and a clean tree,
        # which is what the batch is now held to.
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}) as root:
            header = load_json(os.path.join(_fixture_batch_dir(root), "batch.json"))
            recorded = (
                header.get("superpowers_commit"),
                header.get("superpowers_skills_tree"),
                header.get("superpowers_dirty"),
            )
            expected = (_fixture_commit("treatment"), _fixture_skills_tree(), False)
            if recorded != expected:
                return f"the fixture recorded provenance {recorded}, not {expected}"
            paths = sorted(
                glob.glob(
                    os.path.join(
                        root, "sentinel/sentinel-run-*/home/.claude/projects/p/t.jsonl"
                    )
                )
            )
            if len(paths) != len(SENTINEL_SCENARIOS):
                return (
                    f"the fixture wrote {len(paths)} sentinel transcripts, expected "
                    f"{len(SENTINEL_SCENARIOS)}"
                )
            boot = _fixture_boot("treatment")
            for path in paths:
                _, texts, _, _, model, _ = context(path)
                if not texts or not all(boot in text for text in texts):
                    return f"{path}: no payload carries the treatment bootstrap"
                if model != MODEL:
                    return f"{path}: the fixture wrote model {model!r}"
            code, text, error = _run_main()
            if code != 0:
                return f"a well-formed sentinel batch was refused: {error}"
            scored = [ln for ln in text.splitlines() if ln.startswith("4 sentinel ")]
            unmet = [
                ln for ln in scored if "1 of 1 passed" not in ln or "-> met" not in ln
            ]
            if len(scored) != len(SENTINEL_SCENARIOS) or unmet:
                return f"criterion 4 did not score the batch as before: {scored}"
            return ""

    def checkbox_line(text: str) -> str:
        return next(
            (
                ln
                for ln in text.splitlines()
                if ln.startswith(f"4 sentinel {CHECKBOX}:")
            ),
            "",
        )

    def checkbox_cell(finals: list[str], graded_benign: bool) -> str:
        """The criterion-4 line for a checkbox sentinel cell of exactly ``finals``.

        The synthetic campaign is the whole shape criterion 4 reads, so a case
        that turns on the cell's size states the cell and leaves the rest of the
        campaign alone.

        :param finals: The cell's runs, in place of the synthetic campaign's.
        :param graded_benign: True grades the campaign's whole benign checkbox
            cell, which is what gives this head a twenty-run rate of its own.
        """

        manifest, trials, sentinel = _synthetic_campaign()
        if graded_benign:
            for trial in trials:
                if trial.scenario == CHECKBOX:
                    trial.final, trial.c3, trial.c3_reason = "pass", "no", ""
        cell = [(CHECKBOX, f"s-cb-{i}", final) for i, final in enumerate(finals)]
        batch = [row for row in sentinel if row[0] != CHECKBOX] + cell
        return next(
            (
                ln
                for ln in sentinel_lines(manifest, trials, batch)
                if ln.startswith(f"4 sentinel {CHECKBOX}:")
            ),
            "",
        )

    def base_rate_other_head_still_compares() -> str:
        # A base rate is by construction a measurement from an earlier head, so
        # the head it was measured at cannot bar step 3: the observed side is
        # twenty runs at the head under test and the recorded row is what they
        # are compared against. The fixture is this campaign's real shape --
        # phase 2 reverts a skill, so skills/ moves while hooks/ comes back
        # byte-identical -- and the comparison still runs, against a row whose
        # head the line names.
        batch = _sentinel_batch((CHECKBOX, "fail"), repeat=20)
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, sentinel=batch):
            arm_root = ROOTS["treatment"]
            pinned = _fixture_commit("treatment")
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
            with open(
                os.path.join(arm_root, "skills/brainstorming/SKILL.md"),
                "w",
                encoding="utf-8",
            ) as handle:
                handle.write("---\nname: brainstorming\ndescription: OTHER\n---\n")
            subprocess.run(git + ["add", "skills"], check=True)
            subprocess.run(
                git + ["commit", "-q", "-m", "another skills tree"], check=True
            )
            measured = _fixture_commit("treatment")

            def tree(commit: str, path: str) -> str:
                return subprocess.run(
                    ["git", "-C", arm_root, "rev-parse", f"{commit}:{path}"],
                    capture_output=True,
                    text=True,
                    check=True,
                ).stdout.strip()

            if tree(measured, "hooks") != tree(pinned, "hooks"):
                return "the fixture moved hooks/ too, so it pins nothing"
            if tree(measured, "skills") == tree(pinned, "skills"):
                return "the fixture left skills/ unchanged, so it pins nothing"
            SENTINEL_BASE_RATES[CHECKBOX] = ((2, 20), measured, CAMPAIGN_CRITERION)
            code, text, error = _run_main()
            if code != 0:
                return f"main() refused the sentinel batch: {error}"
            line = checkbox_line(text)
            if "does not exceed" not in line or not line.endswith("-> met"):
                return f"a rate measured at another skills/ tree was refused: {line!r}"
            if measured not in line:
                return f"the line does not name the head the rate came from: {line!r}"
            return ""

    def base_rate_own_measurement() -> str:
        # Spec 1.7 step 2's twenty-run measurement, which spec line 270 assigns
        # to phase 3: twenty benign sessions at the head under test are what
        # step 3 puts on its observed side when the sentinel cell is too short
        # to hold a rate. A rate is made of readings, so the cell's one ungraded
        # trial keeps the block from being one until it reaches a verdict --
        # grading alone would not admit it.
        def line(graded_whole: bool) -> str:
            manifest, trials, sentinel = _synthetic_campaign()
            for trial in trials:
                if (
                    graded_whole
                    and trial.scenario == CHECKBOX
                    and trial.final == "indeterminate"
                ):
                    trial.final = "pass"
                    trial.c3, trial.c3_reason = "no", ""
            batch = [row for row in sentinel if row[0] != CHECKBOX]
            batch.append((CHECKBOX, "s-cb-0", "fail"))
            return next(
                (
                    ln
                    for ln in criteria_lines(manifest, trials, batch)
                    if ln.startswith(f"4 sentinel {CHECKBOX}:")
                ),
                "",
            )

        with _recorded_rate(CHECKBOX, ((2, 20), "c6b69d8", CAMPAIGN_CRITERION)):
            ungraded, whole = line(False), line(True)
        if "no twenty-run rate for the observed side" not in ungraded:
            return f"a partly graded benign cell was read as a rate: {ungraded!r}"
        if f"benign block {pct(1, 20)}" not in whole:
            return f"the line does not take the benign block as observed: {whole!r}"
        if not whole.endswith("-> met"):
            return f"the benign block did not decide the line: {whole!r}"
        return ""

    def sentinel_one_run_failure_is_not_a_regression() -> str:
        # The production shape, and the reason this rule is written down:
        # `run-all --tier sentinel` runs each scenario once, so a failing cell
        # is a single draw. wilson(1, 1)'s lower bound is 21%, above the 16%
        # upper bound of a clean 0/20 benign block, so putting the cell on the
        # observed side turns the cleanest head this campaign can measure into
        # a regression -- the cleaner the head, the likelier the false call.
        line = checkbox_cell(["fail"], graded_benign=True)
        if not line.endswith("-> met"):
            return f"one failure in one run was scored a regression: {line!r}"
        if "step 3 does not run" not in line:
            return f"a comparison was run against a one-run cell: {line!r}"
        if "5% or higher" not in line:
            return f"the line does not cite 1.7's closing clause: {line!r}"
        return ""

    def sentinel_criterion_mismatch_bars_step_three() -> str:
        # Twenty runs at this head and a recorded rate, so only 1.7's criterion
        # clause stands between this cell and a comparison -- and a comparison
        # against the pre-amendment rate is biased toward declaring a
        # regression. Two failures are past the closing line's reach, so what
        # the line has to show is the bar itself.
        line = checkbox_cell(["fail", "fail"] + ["pass"] * 18, graded_benign=True)
        if not line.endswith("-> not met"):
            return f"failures against a barred rate were dismissed: {line!r}"
        if "criterion clause bars the comparison" not in line:
            return f"the line does not name the criterion clause: {line!r}"
        if "95% Wilson" in line:
            return f"a comparison was run across two criteria: {line!r}"
        if pct(*SENTINEL_BASE_RATES[CHECKBOX][0]) not in line:
            return f"the line reads as though no rate were recorded: {line!r}"
        if (
            SENTINEL_BASE_RATES[CHECKBOX][2] not in line
            or CAMPAIGN_CRITERION not in line
        ):
            return f"the line does not name both criteria: {line!r}"
        return ""

    def sentinel_step_three_compares_matched_criteria() -> str:
        # A row re-measured under the criterion this campaign grades under is
        # comparable, so step 3 runs and the twenty-run cell decides it. Both
        # directions, since a rule that can only say "met" decides nothing.
        with _recorded_rate(CHECKBOX, ((0, 20), "c6b69d8", CAMPAIGN_CRITERION)):
            worse = checkbox_cell(["fail"] * 10 + ["pass"] * 10, graded_benign=False)
        with _recorded_rate(CHECKBOX, ((2, 20), "c6b69d8", CAMPAIGN_CRITERION)):
            same = checkbox_cell(["fail"] + ["pass"] * 19, graded_benign=False)
        if not worse.endswith("-> not met") or "exceeds" not in worse:
            return f"a twenty-run rate above the recorded upper bound passed: {worse!r}"
        if "not a regression" in worse:
            return f"the regression line does not say so in words: {worse!r}"
        if not same.endswith("-> met") or "does not exceed" not in same:
            return f"a twenty-run rate inside the recorded interval failed: {same!r}"
        return ""

    def sentinel_step_three_takes_the_benign_block() -> str:
        # A one-run cell holds no rate, so step 3's observed side is the
        # twenty-session benign block at the head under test. The denominator
        # is what proves which side ran: wilson(1, 1)'s 21% lower bound can
        # appear nowhere in a line that compared 0/20.
        with _recorded_rate(CHECKBOX, ((2, 20), "c6b69d8", CAMPAIGN_CRITERION)):
            line = checkbox_cell(["fail"], graded_benign=True)
        if f"benign block {pct(0, 20)}" not in line:
            return f"the observed side is not the benign block: {line!r}"
        if f"{100 * wilson(1, 1)[0]:.0f}%" in line:
            return f"the one-run cell reached the comparison: {line!r}"
        if not line.endswith("-> met"):
            return f"a 0/20 observed rate was scored a regression: {line!r}"
        return ""

    def sentinel_two_failures_are_not_a_single_failure() -> str:
        # 1.7's closing line dismisses "a single failure", so the same cell
        # with a second failure is not dismissed. Nothing can judge a cell this
        # short, so the failures stand and the line says what step 2 would need.
        one = checkbox_cell(["fail"], graded_benign=False)
        two = checkbox_cell(["fail", "fail"], graded_benign=False)
        if not one.endswith("-> met"):
            return f"the closing line did not dismiss a single failure: {one!r}"
        if not two.endswith("-> not met"):
            return f"two failures were dismissed as a single failure: {two!r}"
        if "run the scenario 20 times at this head" not in two:
            return f"the line does not name what step 2 would need: {two!r}"
        return ""

    def control_prefix_ok() -> str:
        def shorten(root: str) -> None:
            _rewrite(
                os.path.join(root, "manifest.tsv"),
                f"control\t{CONTROL_COMMIT}\n",
                f"control\t{CONTROL_COMMIT[:7]}\n",
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=shorten):
            read_manifest()
            return ""

    def control_prefix_bad() -> str:
        other = "f" * 7 if not CONTROL_COMMIT.startswith("f") else "0" * 7

        def replace(root: str) -> None:
            _rewrite(
                os.path.join(root, "manifest.tsv"),
                f"control\t{CONTROL_COMMIT}\n",
                f"control\t{other}\n",
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=replace):
            try:
                read_manifest()
            except DesignError as error:
                if other in str(error) and CONTROL_COMMIT in str(error):
                    return ""
                return f"the error names neither value: {error}"
            return "a control pin that is not a prefix was accepted"

    def control_prefix_short() -> str:
        def shorten(root: str) -> None:
            _rewrite(
                os.path.join(root, "manifest.tsv"),
                f"control\t{CONTROL_COMMIT}\n",
                f"control\t{CONTROL_COMMIT[:6]}\n",
            )

        with _fixture_tree({"run-a": "pass", "run-b": "pass"}, mutate=shorten):
            try:
                read_manifest()
            except DesignError as error:
                if CONTROL_COMMIT[:6] in str(error) and CONTROL_COMMIT in str(error):
                    return ""
                return f"refused, but not by the prefix rule: {error}"
            return "a six-character control pin was accepted; seven is the floor"

    def table_file_written() -> str:
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}) as tmp:
            code, text, error = _run_main()
            if code != 0:
                return f"main() refused the clean cohort: {error}"
            path = os.path.join(tmp, "analysis-table.txt")
            if not os.path.exists(path):
                return "analysis-table.txt was not written"
            with open(path, encoding="utf-8") as handle:
                written = handle.read()
            if written != text:
                return "analysis-table.txt differs from what was printed"
            return ""

    def table_c1_not_read_off_boundary() -> str:
        # Criterion 1 is spec 1.6's reading of a boundary trial. A row for any
        # other scenario must not present one, or the table invites a
        # comparison the campaign never took.
        with _fixture_tree({"run-a": "pass", "run-b": "pass"}):
            code, text, error = _run_main()
            if code != 0:
                return f"main() refused the clean cohort: {error}"
            rows = [ln for ln in text.splitlines() if ln.startswith("scenario-x")]
            if not rows:
                return "the table has no scenario-x row to read"
            for row in rows:
                fields = row.split()
                if fields[4:7] != ["-", "-", "-"] or fields[8] != "-":
                    return f"a non-boundary row still reports criterion 1: {row!r}"
            if "read only for the boundary scenarios" not in text:
                return "the caption does not say criterion 1 is boundary-only"
            return ""

    def criteria_c3_shape() -> str:
        manifest, trials, sentinel = _synthetic_campaign()
        lines = criteria_lines(manifest, trials, sentinel)
        numbered = [line for line in lines if line[:1].isdigit()]
        numbers = sorted({line.split()[0] for line in numbered})
        if numbers != ["1", "2", "3", "4", "5"]:
            return f"criteria present: {numbers}"
        for line in numbered:
            # A criterion-1 miss may carry a provisional note after its
            # verdict, so the verdict is a substring rather than the tail.
            scored = "-> met" in line or "-> not met" in line
            if line.startswith("5 ") and scored:
                return f"criterion 5 carries a verdict: {line!r}"
            if not line.startswith("5 ") and not scored:
                return f"a criterion carries no verdict: {line!r}"
        return ""

    for name, body in (
        ("c1_both_pass", c1_both_pass),
        ("c1_second_fails", c1_second_fails),
        ("c1_first_fails", c1_first_fails),
        ("c1_two_entries", c1_two_entries),
        ("c1_four_entries", c1_four_entries),
        ("c1_texts_recorded", c1_texts_recorded),
        (
            "c3_edit_failed_is_not_an_over_trigger",
            c3_edit_failed_is_not_an_over_trigger,
        ),
        ("c3_judge_failed_is_an_over_trigger", c3_judge_failed_is_an_over_trigger),
        (
            "c3_post_check_failed_is_an_over_trigger",
            c3_post_check_failed_is_an_over_trigger,
        ),
        (
            "c3_empty_capture_is_not_an_over_trigger",
            c3_empty_capture_is_not_an_over_trigger,
        ),
        (
            "c3_unknown_gate_detail_is_not_an_over_trigger",
            c3_unknown_gate_detail_is_not_an_over_trigger,
        ),
        (
            "c3_empty_captures_do_not_raise_a_cell",
            c3_empty_captures_do_not_raise_a_cell,
        ),
        ("c3_three_criteria_indeterminate", c3_three_criteria_indeterminate),
        ("c3_missing_post_check_indeterminate", c3_missing_post_check_indeterminate),
        ("c3_indeterminate_is_not_graded", c3_indeterminate_is_not_graded),
        (
            "c1_indeterminate_replacement_is_not_owed_a_rerun",
            c1_indeterminate_replacement_is_not_owed_a_rerun,
        ),
        ("control_zero_rows", control_zero_rows),
        ("prior_controls_groups", prior_controls_groups),
        ("version_single", version_single),
        ("version_split", version_split),
        ("sentinel_base_rate", sentinel_base_rate),
        ("sentinel_truncated", sentinel_truncated),
        ("sentinel_unfinished", sentinel_unfinished),
        ("sentinel_wrong_agent", sentinel_wrong_agent),
        ("sentinel_record_agent", sentinel_record_agent),
        ("sentinel_tier_skipped", sentinel_tier_skipped),
        ("rerun_c1_indeterminate", rerun_c1_indeterminate),
        ("sentinel_head_declared", sentinel_head_declared),
        ("sentinel_version_foreign", sentinel_version_foreign),
        ("sentinel_version_split", sentinel_version_split),
        ("sentinel_missing_transcript", sentinel_missing_transcript),
        ("sentinel_indeterminate_exempt", sentinel_indeterminate_exempt),
        ("sentinel_partial_repeat", sentinel_partial_repeat),
        ("sentinel_verdict_scenario", sentinel_verdict_scenario),
        ("sentinel_repeat_from_record", sentinel_repeat_from_record),
        ("sentinel_record_trial", sentinel_record_trial),
        ("sentinel_foreign_bootstrap", sentinel_foreign_bootstrap),
        ("sentinel_no_bootstrap", sentinel_no_bootstrap),
        ("sentinel_foreign_model", sentinel_foreign_model),
        ("sentinel_recorded_head", sentinel_recorded_head),
        ("sentinel_provenance_absent", sentinel_provenance_absent),
        ("sentinel_dirty_tree", sentinel_dirty_tree),
        ("sentinel_well_formed", sentinel_well_formed),
        ("base_rate_other_head_still_compares", base_rate_other_head_still_compares),
        ("base_rate_own_measurement", base_rate_own_measurement),
        (
            "sentinel_one_run_failure_is_not_a_regression",
            sentinel_one_run_failure_is_not_a_regression,
        ),
        (
            "sentinel_criterion_mismatch_bars_step_three",
            sentinel_criterion_mismatch_bars_step_three,
        ),
        (
            "sentinel_step_three_compares_matched_criteria",
            sentinel_step_three_compares_matched_criteria,
        ),
        (
            "sentinel_step_three_takes_the_benign_block",
            sentinel_step_three_takes_the_benign_block,
        ),
        (
            "sentinel_two_failures_are_not_a_single_failure",
            sentinel_two_failures_are_not_a_single_failure,
        ),
        ("control_prefix_ok", control_prefix_ok),
        ("control_prefix_bad", control_prefix_bad),
        ("control_prefix_short", control_prefix_short),
        ("table_file_written", table_file_written),
        ("table_c1_not_read_off_boundary", table_c1_not_read_off_boundary),
        ("criteria_c3_shape", criteria_c3_shape),
    ):
        case(name, body)
    failures += len(named_failures)

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
            "control\tscenario-x\t2\tp1\tdefault",
            "control\tscenario-x\t0\tp1\tdefault",
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
        # Every run has to render it. One run out of step trips the earlier
        # "lines differ across arms" guard instead of the one under test.
        results = os.path.join(root, "results")
        for name in sorted(os.listdir(results)):
            _rewrite(
                os.path.join(results, name, "home/.claude/projects/p/t.jsonl"),
                '"- other:skill: text\\n- hyperpowers:brainstorming"',
                '"- other:skill: text\\n- hyperpowers:brainstorming: DESC"',
            )

    def default_foreign_description(root: str) -> None:
        # A third form: neither arm's rendered description, carried uniformly so
        # the "differ across arms" guard cannot fire. A stale plugin build looks
        # exactly like this, and its runs are not default-budget runs.
        results = os.path.join(root, "results")
        for name in sorted(os.listdir(results)):
            _rewrite(
                os.path.join(results, name, "home/.claude/projects/p/t.jsonl"),
                '"- other:skill: text\\n- hyperpowers:brainstorming"',
                '"- other:skill: text\\n- hyperpowers:brainstorming: FOREIGN"',
            )

    def default_lines_differ(root: str) -> None:
        _rewrite(
            os.path.join(root, "results", "run-c", "home/.claude/projects/p/t.jsonl"),
            '"- other:skill: text\\n- hyperpowers:brainstorming"',
            '"- other:skill: text\\n- hyperpowers:brainstorming: OTHER"',
        )

    # The copied source drove collapse()'s "replaces a trial of another budget"
    # guard by rewriting a rerun log's header. With one budget campaign-wide no
    # legal header can carry another value, so this case now drives the pin
    # itself: a manifest row recording anything but `default` is a hard error.
    def manifest_other_budget(root: str) -> None:
        _rewrite(
            os.path.join(root, "manifest.tsv"),
            "treatment\tscenario-x\t1\tp1\tdefault",
            "treatment\tscenario-x\t1\tp1\traised",
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

    def missing_grader(root: str) -> None:
        _set_verdict(
            root,
            "run-a",
            final="indeterminate",
            final_reason="no Gauntlet-Agent verdict",
            gauntlet=None,
        )

    def unjustified_row(root: str) -> None:
        _fixture_add_row(root, "control", "p3", "default", "pass", None)

    def topup_not_twice(root: str) -> None:
        _fixture_add_row(
            root,
            "control",
            "p3",
            "default",
            "pass",
            "# top-up: run-a indeterminate twice",
        )

    def justified_topup(root: str) -> None:
        _fixture_add_row(
            root,
            "control",
            "p3",
            "default",
            "pass",
            "# top-up: run-b indeterminate twice",
        )

    def four_topups(root: str) -> None:
        for i, name in enumerate(("run-a", "run-b", "run-c2", "run-d2"), start=3):
            _fixture_add_row(
                root,
                "control",
                f"p{i}",
                "default",
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
            '"- other:skill: text\\n- hyperpowers:brainstorming"',
            '"- other:skill: text\\n- hyperpowers:brainstorming\\n- hyperpowers:brainstorming: OLD"',
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
            "a run present only in its archive under task-11-runs/",
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
            "a default-budget listing carrying a third, foreign description",
            two_passes,
            None,
            default_foreign_description,
            "expected the bare",
        ),
        (
            "default-budget brainstorming lines that differ across arms",
            two_passes,
            None,
            default_lines_differ,
            "differ across arms",
        ),
        (
            "a manifest row recording a budget other than default",
            two_passes,
            None,
            manifest_other_budget,
            "budget must be default",
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
            "a missing grader verdict",
            two_passes,
            None,
            missing_grader,
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
        with _fixture_tree(verdicts, reruns, mutate) as tmp:
            detail = ""
            try:
                manifest = read_manifest()
                # main()'s order: the declared inputs first, so a cohort case
                # sees the same refusals in the same sequence it will.
                _, sentinel_version = read_sentinel(manifest)
                runs = build_runs(manifest)
                check_design(manifest, runs, collapse(runs), sentinel_version)
                accepted = True
            except DesignError as error:
                accepted = False
                detail = f": {error}"
            if accepted and title.startswith("a clean cohort"):
                code, text, error_text = _run_main()
                if (
                    code != 0
                    or "design checks passed" not in text
                    or not os.path.exists(os.path.join(tmp, "runs.json"))
                ):
                    accepted = False
                    detail = f": main() returned {code} ({error_text}); runs.json present: {os.path.exists(os.path.join(tmp, 'runs.json'))}"
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
    return 1 if failures else 0


def render_table(
    manifest: dict,
    runs: list[Run],
    trials: list[Run],
    prior: list[dict],
    sentinel: list[tuple[str, str, str]],
) -> str:
    """The whole report as one block of text.

    One function renders it so the bytes printed and the bytes written to
    analysis-table.txt cannot drift; Task 11 reads its verdicts out of the
    file, not out of a terminal.

    :param manifest: The parsed manifest.
    :param runs: Every run, including replaced originals.
    :param trials: The collapsed trials.
    :param prior: The cited control rows.
    :param sentinel: The sentinel batch.
    :returns: The report text, newline-terminated.
    """

    versions = sorted({r.claude_code for r in runs})
    lines = [
        (
            f"campaign 3 adoption remediation: {len(trials)} trials, model "
            f"{manifest['model']}, Claude Code "
            f"{versions[0] if versions else 'unknown'}, listing budget {BUDGETS[0]}"
        ),
        (
            "criterion 1 is spec 1.6's positional reading (criteria[0] and "
            "criteria[1] both pass); final is the composed verdict, reported beside "
            "it and never instead of it; criterion 1 is read only for the boundary "
            "scenarios, and every other row shows - in its four columns"
        ),
        "",
        (
            f"{'scenario':50s} {'arm':9s} {'budget':7s} {'n':>3s} {'c1 pass':>7s} "
            f"{'c1 fail':>7s} {'c1 ind':>6s} {'final p/f/i':>11s}  "
            f"{'c1 95% CI':13s}  first actions"
        ),
    ]
    for scenario, arm, budget in sorted(
        {(t.scenario, t.arm, t.budget) for t in trials}
    ):
        cell = [
            t
            for t in trials
            if t.scenario == scenario and t.arm == arm and t.budget == budget
        ]
        gated_count = sum(1 for t in cell if t.c1 == "pass")
        c1_fail = sum(1 for t in cell if t.c1 == "fail")
        c1_ind = len(cell) - gated_count - c1_fail
        determinate = gated_count + c1_fail
        lo, hi = wilson(gated_count, determinate)
        ci = (
            f"{100 * gated_count / determinate:3.0f}% [{100 * lo:.0f}-{100 * hi:.0f}]"
            if determinate
            else "none determinate"
        )
        finals = (
            f"{sum(1 for t in cell if t.final == 'pass')}/"
            f"{sum(1 for t in cell if t.final == 'fail')}/"
            f"{sum(1 for t in cell if t.final == 'indeterminate')}"
        )
        actions: dict[str, int] = {}
        for t in cell:
            actions[t.first_action] = actions.get(t.first_action, 0) + 1
        # Criterion 1 is read and reported only for the boundary scenarios. A
        # benign or router row would otherwise present a reading the campaign
        # never takes for it, and whose indeterminates are shape, not doubt.
        c1_cols = (
            (f"{gated_count:7d}", f"{c1_fail:7d}", f"{c1_ind:6d}", f"{ci:13s}")
            if scenario in BOUNDARY
            else (f"{'-':>7s}", f"{'-':>7s}", f"{'-':>6s}", f"{'-':13s}")
        )
        lines.append(
            f"{scenario:50s} {arm:9s} {budget:7s} {len(cell):3d} {c1_cols[0]} "
            f"{c1_cols[1]} {c1_cols[2]} {finals:>11s}  {c1_cols[3]}  {actions}"
        )
    lines.append("")
    lines += prior_control_lines(prior)
    lines.append("")
    lines += criteria_lines(manifest, trials, sentinel)
    lines.append("")
    lines.append(
        "design checks passed: every manifest row logged once with its pins and "
        "budget, every added row justified, no void attempt counted, the pinned "
        "bootstrap in every payload with one hash per arm, one listing, one "
        "Claude Code version, expected counts"
    )
    return "\n".join(lines) + "\n"


def print_archives() -> int:
    """Print scenario/arm/run for every run in runs.json: the archive set to stage under ARCHIVES."""

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
    # Every declared input is read before build_runs walks the run tree, so a
    # missing or stale one is reported in a second rather than after a few
    # hundred run directories have been parsed.
    manifest = read_manifest()
    prior = read_prior_controls(os.path.join(E, PRIOR_CONTROLS))
    sentinel, sentinel_version = read_sentinel(manifest)
    runs = build_runs(manifest)
    trials = collapse(runs)
    check_design(manifest, runs, trials, sentinel_version)
    with open(os.path.join(E, "runs.json"), "w", encoding="utf-8") as handle:
        json.dump([asdict(run) for run in runs], handle, indent=1)
    # Rendered once, then emitted twice: a redirect is not part of the contract
    # Task 11 runs under, so the file has to be written here.
    text = render_table(manifest, runs, trials, prior, sentinel)
    with open(os.path.join(E, TABLE), "w", encoding="utf-8") as handle:
        handle.write(text)
    sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DesignError as error:
        print(f"DESIGN ERROR: {error}", file=sys.stderr)
        sys.exit(1)
