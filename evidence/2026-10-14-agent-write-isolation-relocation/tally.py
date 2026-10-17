#!/usr/bin/env python3
"""Decide the agent-write-isolation paired control against its predeclared rule.

Two arms of the one boundary scenario are read: a baseline arm on the
pre-change layout, where the Coding-Agent's ``home/`` sits inside the record at
``results/<run>/``, and a new arm on the relocated layout, where the agent's
tree sits at ``results/workspaces/<run>/`` and only the record stays behind.
Each arm's run ids come from its own log directory
(``control-<scenario>-<proc>.log``, ``p<n>`` for a manifest row and ``r<n>``
for a replacement), so an arm is never read twice or merged with the other. A
run id at the start of a line in ``superseded.txt`` beside this file is printed
but does not occupy a trial slot.

A session is read on criterion 1 of the Gauntlet-Agent ``result.json``,
``criteria[0]`` and ``criteria[1]`` both passing — the observable, not the
composed final. ``classify`` is the one place a kind is named: a setup error or
a misconfigured QA agent is a void that occupies no slot, a grader that exited
without writing a result is a void the campaign may replace up to three times
per arm, and anything else is the criterion-1 reading, so a stalled or errored
agent is indeterminate: a real trial that counts and is never a pass.

Per run, the readouts come from the launch record
(``gauntlet-agent/context/launch-agent``, in the record tree under either
layout) and the session's main transcript (under the workspace when the run
relocated it, else under the record): the plugin root, the model, the Claude
Code version, the entrypoint, the instruction files loaded, whether the task
tools were offered, whether the skill listing carried brainstorming's
description, the first tool call and the skills invoked.

The decision fails closed. The evidence is checked before it is compared: the
arms must be two different log directories, each log must name exactly one
run, no run id may repeat within an arm or appear in both, each arm must show
its own layout, a graded run must have exactly one result file, and no
transcript line may be unreadable except a torn final line. Any of those is an
integrity stop. Then any manipulation mismatch, a fourth grader-exit void
in an arm, a setup void or misconfigured QA agent in the new arm, an arm that
is not exactly ten qualifying sessions, a new-arm failure signature the
baseline never produced, or a pass count more than two below the baseline's
stops the campaign; no row is dropped quietly, and every row is printed either
way.
"""

from __future__ import annotations

import argparse
import json
import os.path
import re
import sys
from dataclasses import dataclass
from math import comb
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^control-(.+)-([pr]\d+)$")
PLUGIN_DIR = re.compile(r'^exec .*--plugin-dir "([^"]+)"', re.MULTILINE)
MODEL = re.compile(r'^exec .*--model "([^"]+)"', re.MULTILINE)
BRAINSTORM_DESC = "hyperpowers:brainstorming: You MUST use this"
SCENARIO = "cost-api-field-rename-boundary"
ALPHA = 0.05
# The readings that occupy a trial slot, and so must be evidence the analyzer
# can vouch for.
TRIAL_KINDS = ("pass", "fail", "indeterminate")
# How each arm is produced: the baseline runs the pre-change code, which keeps
# the agent's home inside the record; the new arm runs this branch, which
# relocates it. An arm reading the other layout is not the arm it claims to be.
ARM_LAYOUTS = {"baseline": "legacy", "new": "relocated"}
# A stop's process exit status, by the decision's reason. Proceed is 0; a named
# run with no verdict leaves 1 (see main).
EXIT_CODES = {
    "integrity": 2,
    "manipulation": 2,
    "new-arm-setup": 2,
    "insufficient": 3,
    "void-cap": 3,
    "novel-failure": 4,
    "threshold": 5,
}


@dataclass(frozen=True)
class Config:
    """The campaign's pre-registered conditions and the trees its runs live in.

    Built once in ``main`` from the command line and threaded through every
    function that reads a run, so nothing resolves a path or a pin from a
    module global.
    """

    records: Path
    workspaces: Path
    plugin_root: str
    model: str
    cc_version: str
    scenario: str


@dataclass(frozen=True)
class Decision:
    """The campaign's outcome and why it was reached."""

    outcome: str
    reason: str
    detail: str


def run_dir(cfg: Config, run_id: str) -> Path:
    """Resolve a run to its record directory, which both layouts share.

    :param cfg: The campaign configuration.
    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    return cfg.records / run_id


def own_roots(cfg: Config, run_id: str) -> tuple[str, str]:
    """The two directory prefixes a run's own files lie under.

    Under the pre-change layout everything the agent touched is inside the
    record; after the relocation its workdir and home are in the workspace. A
    path under neither was loaded from outside the run.

    :param cfg: The campaign configuration.
    :param run_id: The quorum run id.
    :returns: The record prefix and the workspace prefix.
    """
    return f"{cfg.records / run_id}/", f"{cfg.workspaces / run_id}/"


def result_files(path: Path) -> list[Path]:
    """List the Gauntlet-Agent result files a run left behind.

    :param path: The run's record directory.
    :returns: Every ``gauntlet-agent/results/*/result.json`` the run has; a
        graded run has exactly one, and any other count is unreadable
        evidence rather than a reading.
    """
    return sorted(path.glob("gauntlet-agent/results/*/result.json"))


def read_result(found: list[Path]) -> dict[str, Any] | None:
    """Return a run's single Gauntlet-Agent ``result.json``, if it has one.

    :param found: The run's result files, from ``result_files``.
    :returns: The parsed result, or None when there is not exactly one.
    """
    if len(found) != 1:
        return None
    parsed: dict[str, Any] = json.loads(found[0].read_text(encoding="utf-8"))
    return parsed


def owns(path: str, roots: tuple[str, str]) -> bool:
    """Decide whether an instruction path lies inside one of a run's trees.

    Containment is by path component, not by substring: a traversal out of the
    run (``<root>/<run>/../../elsewhere``) and a path that merely embeds a
    root's text (``/tmp/<root>/CLAUDE.md``) are both outside. A relative or
    otherwise malformed path is outside too, because the analyzer cannot say
    what it resolved to at the time.

    :param path: The instruction path the transcript recorded.
    :param roots: The run's own prefixes, from ``own_roots``.
    :returns: True when the path is the run's own.
    """
    if not os.path.isabs(path):
        return False
    normalized = os.path.normpath(path)
    for root in roots:
        root_path = os.path.normpath(root)
        try:
            if os.path.commonpath([normalized, root_path]) == root_path:
                return True
        except ValueError:
            continue
    return False


def criterion_one(result: dict[str, Any] | None) -> str:
    """Read a boundary run by criterion 1.

    :param result: The run's parsed ``result.json``, or None.
    :returns: ``pass``, ``fail`` or ``indeterminate``.
    """
    entries = (result or {}).get("criteria")
    if not isinstance(entries, list) or len(entries) != 3:
        return "indeterminate"
    verdicts = [str((e or {}).get("verdict") or "") for e in entries[:2]]
    if verdicts == ["pass", "pass"]:
        return "pass"
    if "fail" in verdicts:
        return "fail"
    return "indeterminate"


def classify(verdict: dict[str, Any], result: dict[str, Any] | None) -> str:
    """Name a run's kind: the one place a kind string is produced.

    The launcher classifies its own runs by calling this through the
    ``classify`` subcommand, so the two tools cannot disagree.

    :param verdict: A parsed ``verdict.json``.
    :param result: The run's parsed ``result.json``, or None.
    :returns: ``void-harness-setup``, ``qa-agent-misconfigured``,
        ``void-grader-exit``, or the criterion-1 reading (``pass``, ``fail``
        or ``indeterminate``).
    """
    stage = str((verdict.get("error") or {}).get("stage") or "")
    if stage == "setup":
        return "void-harness-setup"
    if stage == "qa-agent-misconfigured":
        return "qa-agent-misconfigured"
    gauntlet = verdict.get("gauntlet") or {}
    if gauntlet.get("status") == "investigate" and "without writing a result" in str(
        gauntlet.get("summary") or ""
    ):
        return "void-grader-exit"
    return criterion_one(result)


def failure_signature(verdict: dict[str, Any]) -> tuple[str, str, tuple[str, ...]]:
    """Summarize how a run did not pass, so a novel failure is recognizable.

    :param verdict: A parsed ``verdict.json``.
    :returns: The final status, the error stage (``none`` when there was no
        error), and the failed checks by name.
    """
    stage = str((verdict.get("error") or {}).get("stage") or "none")
    failed = tuple(
        sorted(
            str(c.get("check"))
            for c in verdict.get("checks") or []
            if not c.get("passed")
        )
    )
    return str(verdict.get("final") or ""), stage, failed


def readouts(cfg: Config, run_id: str) -> dict[str, Any]:
    """Read the launch record and the main transcript of one run.

    :param cfg: The campaign configuration.
    :param run_id: The quorum run id, which names the run's own directories.
    :returns: The per-run readouts.
    """
    record = run_dir(cfg, run_id)
    launch_file = record / "gauntlet-agent" / "context" / "launch-agent"
    launch = launch_file.read_text(encoding="utf-8") if launch_file.is_file() else ""
    plugin = PLUGIN_DIR.search(launch)
    model = MODEL.search(launch)
    out: dict[str, Any] = {
        "plugin_dir": plugin.group(1) if plugin else None,
        "model": model.group(1) if model else None,
        "cc": set(),
        "entrypoint": set(),
        "desc": None,
        "tasks": False,
        "foreign_instructions": [],
        "first_tool": None,
        "skills": [],
        "layout": None,
        "malformed": [],
        "torn_tail": False,
    }
    own = own_roots(cfg, run_id)
    # The relocated layout keeps the agent's home in the workspace; a run from
    # before the change kept it in the record. Which tree answered is the
    # run's layout, and each arm must show its own. Subagent transcripts sit
    # one level deeper and are skipped.
    pattern = "home/.claude/projects/*/*.jsonl"
    found = sorted((cfg.workspaces / run_id).glob(pattern))
    transcripts = found or sorted(record.glob(pattern))
    if transcripts:
        out["layout"] = "relocated" if found else "legacy"
    for transcript in transcripts:
        text = transcript.read_text(encoding="utf-8")
        lines = text.splitlines()
        for number, line in enumerate(lines, start=1):
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                # A session killed mid-write leaves its last line unterminated.
                # Any other unreadable line could have carried the attachment
                # that would have failed a manipulation check.
                if number == len(lines) and not text.endswith("\n"):
                    out["torn_tail"] = True
                else:
                    out["malformed"].append(f"{transcript}:{number}")
                continue
            if not isinstance(entry, dict):
                out["malformed"].append(f"{transcript}:{number}")
                continue
            if isinstance(entry.get("version"), str):
                out["cc"].add(entry["version"])
            if isinstance(entry.get("entrypoint"), str):
                out["entrypoint"].add(entry["entrypoint"])
            att = entry.get("attachment") or {}
            kind = att.get("type")
            if kind == "skill_listing" and out["desc"] is None:
                out["desc"] = BRAINSTORM_DESC in str(att.get("content") or "")
            elif kind == "deferred_tools_delta" and "TaskCreate" in (
                att.get("addedNames") or []
            ):
                out["tasks"] = True
            elif kind == "instructions":
                out["foreign_instructions"] += [
                    f["path"]
                    for f in att.get("files") or []
                    if not owns(str(f["path"]), own)
                ]
            if entry.get("type") != "assistant":
                continue
            for block in (entry.get("message") or {}).get("content") or []:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                skill = (block.get("input") or {}).get("skill")
                label = f"{block['name']}({skill})" if skill else block["name"]
                out["first_tool"] = out["first_tool"] or label
                if skill:
                    out["skills"].append(skill)
    out["cc"] = ",".join(sorted(out["cc"])) or None
    # Every entrypoint the session recorded, not just the first: a run that
    # started on the CLI and continued elsewhere is not a CLI run.
    out["entrypoint"] = ",".join(sorted(out["entrypoint"])) or None
    return out


def manipulation_failures(r: dict[str, Any], cfg: Config) -> list[str]:
    """List how a run departs from the pre-registered conditions.

    :param r: The run's row.
    :param cfg: The campaign configuration.
    :returns: One entry per failed condition; empty when the run qualifies.
    """
    expected = {
        "root": (r["plugin_dir"], cfg.plugin_root),
        "model": (r["model"], cfg.model),
        "cc": (r["cc"], cfg.cc_version),
        "entrypoint": (r["entrypoint"], "cli"),
        "foreign_instructions": (r["foreign_instructions"], []),
        "tasks": (r["tasks"], False),
    }
    return [f"{k}={got}" for k, (got, want) in expected.items() if got != want]


def fisher_two_sided(a: tuple[int, int], b: tuple[int, int]) -> float:
    """Two-sided Fisher exact p for two pass counts.

    Sums the hypergeometric probabilities of every table with the observed
    margins that is no more likely than the observed one.

    :param a: ``(passes, trials)`` for the first group.
    :param b: ``(passes, trials)`` for the second group.
    :returns: The p-value.
    """
    (pa, na), (pb, nb) = a, b
    k, n = pa + pb, na + nb

    def prob(x: int) -> float:
        return comb(na, x) * comb(nb, k - x) / comb(n, k)

    observed = prob(pa)
    lo, hi = max(0, k - nb), min(na, k)
    return min(
        1.0,
        sum(p for x in range(lo, hi + 1) if (p := prob(x)) <= observed * (1 + 1e-9)),
    )


def collect(logs: Path, cfg: Config) -> tuple[list[dict[str, Any]], int]:
    """Gather one arm's rows from one arm's log directory.

    :param logs: The arm's log directory.
    :param cfg: The campaign configuration.
    :returns: The rows for ``cfg.scenario``, and the number of runs the logs
        account for but could not be read: a named run with no verdict, or a
        log that named no run at all.
    """
    superseded_file = HERE / "superseded.txt"
    superseded = (
        {
            line.split()[0]
            for line in superseded_file.read_text(encoding="utf-8").splitlines()
            if line.strip()
        }
        if superseded_file.is_file()
        else set()
    )
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    missing = 0
    for log in sorted(logs.glob("control-*-[pr][0-9]*.log")):
        match = LOG_NAME.match(log.stem)
        if not match:
            continue
        scenario, proc = match.groups()
        if scenario != cfg.scenario:
            continue
        run_ids = RUN_ID.findall(log.read_text(encoding="utf-8"))
        if not run_ids:
            # A session that died before quorum printed its run id still
            # occupied a slot in the manifest; it is not a silent absence.
            print(f"{scenario}\t{proc}\t{log.name}\tNO RUN ID")
            missing += 1
            continue
        # One log is one trial slot. Several ids in one log means several
        # sessions were folded into a slot, and the analyzer cannot say which
        # of them the manifest meant.
        log_flaws = (
            [f"log-run-ids={len(run_ids)} ({log.name})"] if len(run_ids) > 1 else []
        )
        for run_id in run_ids:
            path = run_dir(cfg, run_id)
            verdict_path = path / "verdict.json"
            if not verdict_path.is_file():
                print(f"{scenario}\t{proc}\t{run_id}\tNO VERDICT")
                missing += 1
                continue
            verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
            results = result_files(path)
            result = read_result(results)
            kind = classify(verdict, result)
            if run_id in superseded:
                kind = f"superseded-{kind}"
            r: dict[str, Any] = {
                "run_id": run_id,
                "proc": proc,
                "kind": kind,
                "final": str(verdict.get("final")),
                "verdict": verdict,
                **readouts(cfg, run_id),
            }
            r["manip"] = (
                [] if kind.startswith("void-") else manipulation_failures(r, cfg)
            )
            r["integrity"] = list(log_flaws)
            if run_id in seen:
                r["integrity"].append("duplicate-run-id")
            seen.add(run_id)
            # A run the composer graded has exactly one result file. Any other
            # count would read as an indeterminate trial, which would lower
            # the arm's pass count without saying why.
            graded = verdict.get("final") in ("pass", "fail") and not verdict.get(
                "error"
            )
            if graded and len(results) != 1:
                r["integrity"].append(f"result-cardinality={len(results)}")
            r["integrity"] += [f"malformed-transcript={m}" for m in r["malformed"]]
            rows.append(r)
            short = "-".join(run_id.rsplit("-", 2)[-2:])
            # An indeterminate for want of one readable result.json reads the
            # same as a graded one; the marker tells them apart.
            markers = "" if result is not None else "\tresult=none"
            if r["torn_tail"]:
                markers += "\ttorn_tail=True"
            if r["integrity"]:
                markers += f"\tintegrity={';'.join(r['integrity'])}"
            print(
                f"{scenario}\t{proc}\t{short}\t{kind}\tfinal={r['final']}"
                f"\tcc={r['cc']}\tentry={r['entrypoint']}\tdesc={r['desc']}"
                f"\ttasks={r['tasks']}\tfirst={r['first_tool']}"
                f"\tskills={','.join(r['skills']) or '-'}"
                f"\tmanip={'ok' if not r['manip'] else ';'.join(r['manip'])}"
                f"{markers}"
            )
    return rows, missing


def integrity_failures(
    baseline_logs: Path,
    new_logs: Path,
    baseline: list[dict[str, Any]],
    new: list[dict[str, Any]],
) -> list[str]:
    """List every reason the two arms cannot be compared as read.

    Everything here is about the evidence rather than the result: an arm that
    is not the arm it claims to be, a run counted twice, a reading taken from
    a file the analyzer could not read whole. The campaign stops on any of
    them, in the same class as a manipulation mismatch, because the comparison
    the decision would make is not the comparison the design asked for.

    :param baseline_logs: The baseline arm's log directory.
    :param new_logs: The relocated arm's log directory.
    :param baseline: Rows of the pre-change arm.
    :param new: Rows of the relocated arm.
    :returns: One entry per failure; empty when the arms can be compared.
    """
    failures: list[str] = []
    if baseline_logs.resolve() == new_logs.resolve():
        failures.append(f"one log directory for both arms: {baseline_logs.resolve()}")
    for arm, rows in (("baseline", baseline), ("new", new)):
        failures += [
            f"{arm}:{r['run_id']}: {reason}" for r in rows for reason in r["integrity"]
        ]
        expected = ARM_LAYOUTS[arm]
        wrong = [
            f"{r['run_id']}={r['layout']}"
            for r in rows
            if r["kind"] in TRIAL_KINDS and r["layout"] != expected
        ]
        if wrong:
            failures.append(f"{arm}: expected the {expected} layout, got {wrong}")
    shared = sorted({r["run_id"] for r in baseline} & {r["run_id"] for r in new})
    if shared:
        failures.append(f"both arms claim: {shared}")
    return failures


def qualifying(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep the rows that occupy a trial slot.

    The re-baseline's ``counted`` under the name the decision uses: voids and
    superseded runs do not occupy a slot, replacements do, and a run that
    failed a manipulation check is never counted as a trial.

    :param rows: One arm's rows.
    :returns: The qualifying rows.
    """
    return [r for r in rows if r["kind"] in TRIAL_KINDS and not r["manip"]]


def decide(baseline: list[dict[str, Any]], new: list[dict[str, Any]]) -> Decision:
    """Apply the predeclared rule to two arms of qualifying rows.

    :param baseline: Rows of the pre-change arm.
    :param new: Rows of the relocated arm.
    :returns: The decision and its reason; never silently excludes a row.
    """
    for arm, rows in (("baseline", baseline), ("new", new)):
        bad = [(r["run_id"], r["manip"]) for r in rows if r["manip"]]
        if bad:
            return Decision("stop", "manipulation", f"{arm}: {bad}")
        voids = sum(r["kind"] == "void-grader-exit" for r in rows)
        if voids > 3:
            return Decision("stop", "void-cap", f"{arm}: {voids} grader-exit voids, cap 3")
    for r in new:
        if r["kind"] in ("void-harness-setup", "qa-agent-misconfigured"):
            return Decision("stop", "new-arm-setup", r["run_id"])
    qb, qn = qualifying(baseline), qualifying(new)
    if len(qb) != 10 or len(qn) != 10:
        return Decision("stop", "insufficient", f"baseline={len(qb)} new={len(qn)}")
    novel = {failure_signature(r["verdict"]) for r in qn if r["verdict"].get("final") != "pass"} - {
        failure_signature(r["verdict"]) for r in qb if r["verdict"].get("final") != "pass"
    }
    if novel:
        return Decision("stop", "novel-failure", str(sorted(novel)))
    pb, pn = sum(r["kind"] == "pass" for r in qb), sum(r["kind"] == "pass" for r in qn)
    if pb - pn > 2:
        return Decision("stop", "threshold", f"p_b={pb} p_n={pn}")
    return Decision("proceed", "threshold", f"p_b={pb} p_n={pn}")


def exit_code(decision: Decision) -> int:
    """Map a decision to the process exit status the campaign script reads.

    :param decision: The decision ``decide`` reached.
    :returns: 0 to proceed, else the stop's code.
    """
    return 0 if decision.outcome == "proceed" else EXIT_CODES[decision.reason]


def report(
    baseline: list[dict[str, Any]], new: list[dict[str, Any]], decision: Decision
) -> None:
    """Print both arms' readings and the decision, whichever way it went.

    :param baseline: Rows of the pre-change arm.
    :param new: Rows of the relocated arm.
    :param decision: The decision ``decide`` reached.
    """
    print()
    cells: dict[str, tuple[int, int]] = {}
    for arm, rows in (("baseline", baseline), ("new", new)):
        trials = qualifying(rows)
        n = len(trials)
        passed = sum(r["kind"] == "pass" for r in trials)
        cells[arm] = (passed, n)
        indeterminate = sum(r["kind"] == "indeterminate" for r in trials)
        voids = sum(str(r["kind"]).startswith("void-") for r in rows)
        setups = sum(r["kind"] == "qa-agent-misconfigured" for r in rows)
        superseded = sum(str(r["kind"]).startswith("superseded-") for r in rows)
        excluded = [
            f"{r['run_id']}: {';'.join(r['manip'])}" for r in rows if r["manip"]
        ]
        print(
            f"{arm}: criterion 1 {passed}/{n} (indeterminate {indeterminate}, counted"
            f" as not passing; {voids} void, {superseded} superseded,"
            f" {setups} QA-agent misconfigured)"
        )
        print(f"  excluded by manipulation check: {', '.join(excluded) or 'none'}")
        flawed = [
            f"{r['run_id']}: {';'.join(r['integrity'])}" for r in rows if r["integrity"]
        ]
        print(f"  integrity failures: {', '.join(flawed) or 'none'}")
        signatures = sorted(
            {
                failure_signature(r["verdict"])
                for r in trials
                if r["verdict"].get("final") != "pass"
            }
        )
        print(f"  failure signatures: {signatures or 'none'}")
    (pb, nb), (pn, nn) = cells["baseline"], cells["new"]
    if nb and nn:
        p = fisher_two_sided((pb, nb), (pn, nn))
        print(f"\nbaseline {pb}/{nb} vs new {pn}/{nn}; two-sided Fisher p = {p:.4g};")
        print(f"  separated = {p < ALPHA}")
    print(f"\ndecision: {decision.outcome} {decision.reason} ({decision.detail})")


def main(argv: list[str]) -> int:
    """Read both arms and decide the campaign.

    The arms are checked for integrity before they are compared; a failure
    there stops in the same class as a manipulation mismatch.

    :param argv: The process arguments, ``sys.argv``.
    :returns: Process exit status: ``exit_code``'s mapping of the decision,
        or 1 when a log named a run with no verdict, or named no run at all,
        and nothing else stopped first.
    """
    if len(argv) > 1 and argv[1] == "classify":
        verdict = json.loads(Path(argv[2]).read_text(encoding="utf-8"))
        result = (
            json.loads(Path(argv[3]).read_text(encoding="utf-8"))
            if len(argv) > 3
            else None
        )
        print(classify(verdict, result))
        return 0
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--records", type=Path, required=True, help="the record root")
    parser.add_argument(
        "--workspaces", type=Path, required=True, help="the relocated agent-tree root"
    )
    parser.add_argument(
        "--baseline-logs", type=Path, required=True, help="the baseline arm's logs"
    )
    parser.add_argument(
        "--new-logs", type=Path, required=True, help="the relocated arm's logs"
    )
    parser.add_argument("--plugin-root", required=True, help="the pinned plugin root")
    parser.add_argument("--model", required=True, help="the pinned model id")
    parser.add_argument("--cc-version", required=True, help="the pinned CLI version")
    parser.add_argument("--scenario", default=SCENARIO, help="the scenario read")
    args = parser.parse_args(argv[1:])
    cfg = Config(
        records=args.records.resolve(),
        workspaces=args.workspaces.resolve(),
        plugin_root=args.plugin_root,
        model=args.model,
        cc_version=args.cc_version,
        scenario=args.scenario,
    )
    baseline, missing_baseline = collect(args.baseline_logs, cfg)
    new, missing_new = collect(args.new_logs, cfg)
    # Evidence first: a decision over rows the analyzer cannot vouch for is
    # not a decision about the change.
    flaws = integrity_failures(args.baseline_logs, args.new_logs, baseline, new)
    decision = (
        Decision("stop", "integrity", "; ".join(flaws))
        if flaws
        else decide(baseline, new)
    )
    report(baseline, new, decision)
    code = exit_code(decision)
    if code:
        return code
    return 1 if missing_baseline or missing_new else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
