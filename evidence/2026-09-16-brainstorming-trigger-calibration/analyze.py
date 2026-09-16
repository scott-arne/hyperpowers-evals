#!/usr/bin/env python3
"""Fail-closed analysis for the brainstorming trigger calibration.

Reads ``manifest.tsv`` (the declared design: harness commit, the two roots'
commits, the model, and one trial row per launch), the per-process logs under
``logs/``, and ``reruns.tsv`` (original run -> replacement run). Every log
must be a manifest row or a declared rerun, carry the pins the launcher wrote,
and hold exactly its runs; every trial collapses to one outcome. Any deviation
from the declared design is an error, not a skipped row. Writes ``runs.json``
and prints the per-arm table. ``--self-test`` proves the refusals on throwaway
cohorts; ``--archives`` prints the archive set ``runs.json`` implies.
"""

from __future__ import annotations

import glob
import hashlib
import json
import math
import os
import re
import sys
from dataclasses import asdict, dataclass

EV = "/Users/johnss51/Development/agents/hyperpowers/evals"
E = os.path.join(EV, "evidence/2026-09-16-brainstorming-trigger-calibration")
ROOTS = {
    "control": "/Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption",
    "treatment": "/Users/johnss51/Development/agents/hyperpowers/.worktrees/brainstorming-trigger",
}
RUN_DIR_RE = re.compile(r"run-dir\s+(\S+)")
LOG_RE = re.compile(r"(control|treatment)-(.+)-([pr]\d+)\.log")
HEADER_RE = re.compile(
    r"^arm=(\S+) scenario=(\S+) repeat=(\d+) proc=(\S+)$", re.MULTILINE
)
ROOT_RE = re.compile(r"^root=([0-9a-f]{40}) root_clean=0$", re.MULTILINE)
HARNESS_RE = re.compile(
    r"^harness_pin=([0-9a-f]{40}) evals_head=[0-9a-f]{40} harness_paths_identical=yes$",
    re.MULTILINE,
)
SHA_RE = re.compile(r"[0-9a-f]{40}")
BRAINSTORMING_LINE = "- hyperpowers:brainstorming"


@dataclass
class Run:
    """One coding-agent trial and what the analysis extracted from it."""

    arm: str
    scenario: str
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


def read_manifest() -> dict:
    """Parse manifest.tsv into commits, the model, the launch rows, and expected counts."""

    manifest: dict = {"trials": {}, "commits": {}, "model": "", "rows": {}}
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
            elif cells[0] in ("control", "treatment") and len(cells) == 4:
                arm, scenario, repeat, proc = (
                    cells[0],
                    cells[1],
                    int(cells[2]),
                    cells[3],
                )
                if (arm, scenario, proc) in manifest["rows"]:
                    raise DesignError(
                        f"manifest.tsv: duplicate row {arm} {scenario} {proc}"
                    )
                manifest["rows"][(arm, scenario, proc)] = repeat
                manifest["trials"].setdefault(scenario, {}).setdefault(arm, 0)
                manifest["trials"][scenario][arm] += repeat
            else:
                raise DesignError(f"manifest.tsv: unreadable line {line!r}")
    for key in ("harness", "control", "treatment"):
        if not SHA_RE.fullmatch(manifest["commits"].get(key, "")):
            raise DesignError(f"manifest.tsv: {key} commit missing or not a full sha")
    if not manifest["model"]:
        raise DesignError("manifest.tsv: no model")
    if not manifest["rows"]:
        raise DesignError("manifest.tsv: no launch rows")
    return manifest


def expected_brainstorming_line(arm: str) -> str:
    """The listing line Claude Code renders for the brainstorming skill at this arm's root."""

    path = os.path.join(ROOTS[arm], "skills/brainstorming/SKILL.md")
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if line.startswith("description:"):
                value = line[len("description:") :].strip()
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                return f"{BRAINSTORMING_LINE}: {value}"
    raise DesignError(f"{path}: no description line")


def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        loaded = json.load(handle)
    if not isinstance(loaded, dict):
        raise DesignError(f"{path}: expected a JSON object")
    return loaded


def iter_records(path: str):
    with open(path, encoding="utf-8", errors="replace") as handle:
        for line in handle:
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


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


def context_hashes(transcript: str) -> tuple[str, str, str, str]:
    payload = listing_rest = brainstorming = model = ""
    for rec in iter_records(transcript):
        att = rec.get("attachment") or {}
        if att.get("type") == "hook_additional_context" and not payload:
            payload = hashlib.sha256(
                json.dumps(att.get("content"), sort_keys=True).encode()
            ).hexdigest()[:12]
        if att.get("type") == "skill_listing" and not listing_rest:
            lines = (att.get("content") or "").split("\n")
            own = [line for line in lines if line.startswith(BRAINSTORMING_LINE)]
            rest = [line for line in lines if not line.startswith(BRAINSTORMING_LINE)]
            brainstorming = own[0] if own else ""
            listing_rest = hashlib.sha256("\n".join(rest).encode()).hexdigest()[:12]
        if rec.get("type") == "assistant" and not model:
            model = (rec.get("message") or {}).get("model") or ""
    return payload, listing_rest, brainstorming, model


def token_total(run_dir: str) -> int | None:
    path = os.path.join(run_dir, "coding-agent-token-usage.json")
    if not os.path.exists(path):
        return None
    usage = load_json(path)
    total = usage.get("total_tokens") or usage.get("total")
    if isinstance(total, (int, float)):
        return int(total)
    return int(sum(v for v in usage.values() if isinstance(v, (int, float))))


def read_logs(manifest: dict) -> list[tuple[str, str, str, bool]]:
    """Return (arm, scenario, run dir, is_rerun) for every run of every valid log."""

    rows: list[tuple[str, str, str, bool]] = []
    seen_rows: set[tuple[str, str, str]] = set()
    for log in sorted(glob.glob(os.path.join(E, "logs", "*.log"))):
        match = LOG_RE.match(os.path.basename(log))
        if not match:
            continue
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
        root = ROOT_RE.search(text)
        if not root or root.group(1) != manifest["commits"][arm]:
            raise DesignError(
                f"{log}: root pin missing or not the manifest's {arm} commit"
            )
        harness = HARNESS_RE.search(text)
        if not harness or harness.group(1) != manifest["commits"]["harness"]:
            raise DesignError(f"{log}: harness pin missing or not the manifest's")
        if "\nDONE " not in text:
            raise DesignError(
                f"{log}: the launch did not finish cleanly (no DONE line)"
            )
        is_rerun = proc.startswith("r")
        if is_rerun:
            if repeat != 1:
                raise DesignError(f"{log}: a rerun log must have repeat=1")
        else:
            expected_repeat = manifest["rows"].get((arm, scenario, proc))
            if expected_repeat is None:
                raise DesignError(f"{log}: not a manifest row")
            if expected_repeat != repeat:
                raise DesignError(
                    f"{log}: repeat {repeat}, manifest says {expected_repeat}"
                )
            seen_rows.add((arm, scenario, proc))
        found = [m.group(1).rstrip("/") for m in RUN_DIR_RE.finditer(text)]
        if len(found) != repeat:
            raise DesignError(f"{log}: {len(found)} runs recorded, repeat was {repeat}")
        for run_dir in found:
            rows.append((arm, scenario, run_dir, is_rerun))
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
    runs: list[Run] = []
    seen: set[str] = set()
    for arm, scenario, run_dir, is_rerun in read_logs(manifest):
        if not os.path.isabs(run_dir):
            run_dir = os.path.join(EV, run_dir)
        name = os.path.basename(run_dir)
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
        final = str(load_json(verdict_path).get("final"))
        if final not in ("pass", "fail", "indeterminate"):
            raise DesignError(f"{name}: unexpected final verdict {final!r}")
        transcripts = glob.glob(
            os.path.join(run_dir, "home/.claude/projects/*/*.jsonl")
        )
        if not transcripts:
            raise DesignError(f"{name}: no transcript")
        payload, listing_rest, brainstorming, model = context_hashes(transcripts[0])
        if not payload or not listing_rest or not brainstorming:
            raise DesignError(f"{name}: payload, listing or brainstorming line missing")
        runs.append(
            Run(
                arm,
                scenario,
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
        if original.final != "indeterminate":
            raise DesignError(f"{run.replaces} was replaced but was not indeterminate")
        if (original.arm, original.scenario) != (run.arm, run.scenario):
            raise DesignError(f"{run.run} replaces a trial of another arm or scenario")
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


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    den = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / den
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (max(0.0, centre - half), min(1.0, centre + half))


def check_design(manifest: dict, trials: list[Run]) -> None:
    expected = manifest["trials"]
    for scenario, arms in expected.items():
        for arm, count in arms.items():
            have = [t for t in trials if t.scenario == scenario and t.arm == arm]
            if len(have) != count:
                raise DesignError(
                    f"{scenario}/{arm}: {len(have)} trials, design says {count}"
                )
    for scenario in {t.scenario for t in trials}:
        if scenario not in expected:
            raise DesignError(f"{scenario}: not in the declared design")
    payloads = {t.payload for t in trials}
    if len(payloads) != 1:
        raise DesignError(f"payload hashes differ: {sorted(payloads)}")
    rests = {t.listing_rest for t in trials}
    if len(rests) != 1:
        raise DesignError(
            f"listings differ outside the brainstorming line: {sorted(rests)}"
        )
    for arm in ("control", "treatment"):
        if not any(t.arm == arm for t in trials):
            raise DesignError(f"{arm}: no trials")
        lines = {t.brainstorming_line for t in trials if t.arm == arm}
        if lines != {expected_brainstorming_line(arm)}:
            raise DesignError(f"{arm}: brainstorming line {sorted(lines)}")
    models = {t.model for t in trials}
    if models != {manifest["model"]}:
        raise DesignError(f"models differ from the design: {sorted(models)}")


def _write_fixture(root: str, final_by_run: dict[str, str], reruns: str | None) -> None:
    """A minimal evidence tree: both arms, one log per proc, one run per verdict.

    ``final_by_run`` describes the control arm; names starting with ``rerun-``
    go into a rerun log. The treatment arm always has one passing trial.
    """

    os.makedirs(os.path.join(root, "logs"), exist_ok=True)
    os.makedirs(os.path.join(root, "skills/brainstorming"), exist_ok=True)
    with open(
        os.path.join(root, "skills/brainstorming/SKILL.md"), "w", encoding="utf-8"
    ) as handle:
        handle.write("---\nname: brainstorming\ndescription: DESC\n---\n")
    control, treatment, harness = "1" * 40, "2" * 40, "3" * 40
    commits = {"control": control, "treatment": treatment}
    originals = [name for name in final_by_run if not name.startswith("rerun-")]
    with open(os.path.join(root, "manifest.tsv"), "w", encoding="utf-8") as handle:
        handle.write(
            f"harness\t{harness}\ncontrol\t{control}\ntreatment\t{treatment}\n"
        )
        handle.write(f"model\tmodel-x\ncontrol\tscenario-x\t{len(originals)}\tp1\n")
        handle.write("treatment\tscenario-x\t1\tp1\n")
    listing = "- other:skill: text\n- hyperpowers:brainstorming: DESC"
    transcript = "\n".join(
        [
            json.dumps(
                {
                    "type": "attachment",
                    "attachment": {
                        "type": "hook_additional_context",
                        "content": ["boot"],
                    },
                }
            ),
            json.dumps(
                {
                    "type": "attachment",
                    "attachment": {"type": "skill_listing", "content": listing},
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
    runs = [("control", name, final) for name, final in final_by_run.items()]
    runs.append(("treatment", "run-t", "pass"))
    logs: dict[tuple[str, str], list[str]] = {}
    for arm, name, final in runs:
        run_dir = os.path.join(root, "results", name)
        os.makedirs(os.path.join(run_dir, "home/.claude/projects/p"), exist_ok=True)
        with open(
            os.path.join(run_dir, "verdict.json"), "w", encoding="utf-8"
        ) as handle:
            json.dump({"final": final}, handle)
        with open(
            os.path.join(run_dir, "home/.claude/projects/p/t.jsonl"),
            "w",
            encoding="utf-8",
        ) as handle:
            handle.write(transcript + "\n")
        proc = "r1" if name.startswith("rerun-") else "p1"
        logs.setdefault((arm, proc), []).append(f"run-dir   {run_dir}")
    for (arm, proc), lines in logs.items():
        with open(
            os.path.join(root, "logs", f"{arm}-scenario-x-{proc}.log"),
            "w",
            encoding="utf-8",
        ) as handle:
            handle.write(
                f"arm={arm} scenario=scenario-x repeat={len(lines)} proc={proc}\n"
            )
            handle.write(f"root={commits[arm]} root_clean=0\n")
            handle.write(
                f"harness_pin={harness} evals_head={harness} harness_paths_identical=yes\n"
            )
            handle.write("\n".join(lines) + f"\nEXIT=0\nDONE {arm} scenario-x {proc}\n")
    if reruns is not None:
        with open(os.path.join(root, "reruns.tsv"), "w", encoding="utf-8") as handle:
            handle.write(reruns)


def self_test() -> int:
    """The analysis must accept the clean cohort and refuse each broken one."""

    import tempfile

    global E, ROOTS
    saved = (E, ROOTS)
    cases: list[tuple[str, dict[str, str], str | None, bool]] = [
        (
            "a clean cohort with one replaced indeterminate",
            {"run-a": "pass", "run-b": "indeterminate", "rerun-b": "fail"},
            "run-b\trerun-b\n",
            True,
        ),
        (
            "an indeterminate trial never re-run",
            {"run-a": "pass", "run-b": "indeterminate"},
            None,
            False,
        ),
        (
            "a replacement whose original was not indeterminate",
            {"run-a": "pass", "rerun-a": "pass"},
            "run-a\trerun-a\n",
            False,
        ),
        (
            "a rerun not listed in reruns.tsv",
            {"run-a": "indeterminate", "rerun-a": "pass"},
            None,
            False,
        ),
    ]
    failures = 0
    for title, verdicts, reruns, should_pass in cases:
        with tempfile.TemporaryDirectory() as tmp:
            E = tmp
            ROOTS = {"control": tmp, "treatment": tmp}
            _write_fixture(tmp, verdicts, reruns)
            detail = ""
            try:
                manifest = read_manifest()
                check_design(manifest, collapse(build_runs(manifest)))
                accepted = True
            except DesignError as error:
                accepted = False
                detail = f": {error}"
        if accepted == should_pass:
            verb = "accepted as expected" if accepted else "refused as expected"
            print(f"{verb} ({title}){detail}")
        else:
            print(f"SELF-TEST FAILURE ({title}): accepted={accepted}{detail}")
            failures += 1
    E, ROOTS = saved
    return 1 if failures else 0


def print_archives() -> int:
    """Print scenario/arm/run for every run in runs.json: the archive set Task 3 must stage."""

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
    check_design(manifest, trials)
    with open(os.path.join(E, "runs.json"), "w", encoding="utf-8") as handle:
        json.dump([asdict(run) for run in runs], handle, indent=1)
    header = "{:<50} {:<10} {:>3} {:>4} {:>4} {:>3}  {:<14} {}"
    print(
        header.format(
            "scenario",
            "arm",
            "n",
            "fail",
            "pass",
            "ind",
            "fail 95% CI",
            "first actions",
        )
    )
    for scenario in sorted(manifest["trials"]):
        for arm in ("control", "treatment"):
            rows = [t for t in trials if t.arm == arm and t.scenario == scenario]
            determinate = [t for t in rows if t.final in ("pass", "fail")]
            fails = sum(1 for t in determinate if t.final == "fail")
            n = len(determinate)
            low, high = wilson(fails, n)
            actions: dict[str, int] = {}
            for t in rows:
                actions[t.first_action] = actions.get(t.first_action, 0) + 1
            rate = 100 * fails / n if n else 0.0
            interval = f"{rate:3.0f}% [{100 * low:.0f}-{100 * high:.0f}]"
            ranked = dict(sorted(actions.items(), key=lambda item: -item[1]))
            print(
                header.format(
                    scenario,
                    arm,
                    len(rows),
                    fails,
                    n - fails,
                    len(rows) - n,
                    interval,
                    ranked,
                )
            )
    print(
        "\ndesign checks passed: every manifest row logged once with its pins, "
        "one payload hash, one listing outside the brainstorming line, "
        "expected brainstorming line per arm, expected counts"
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DesignError as error:
        print(f"DESIGN ERROR: {error}", file=sys.stderr)
        sys.exit(1)
