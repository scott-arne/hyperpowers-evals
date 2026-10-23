"""Answer the SDD-path rehearsal checks for one run directory.

Usage: analyze.py RUN_DIR

Prints one `check N: ...` line per check plus the intervals. Main-thread
events carry no parent_tool_use_id; subagent events do, so ordering is read
from main-thread tool_use blocks only, by jsonl line number.
"""

import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

run = Path(sys.argv[1])


def load(name):
    out = []
    for i, line in enumerate((run / name).read_text().splitlines()):
        try:
            out.append((i, json.loads(line)))
        except json.JSONDecodeError:
            pass
    return out


def ts(s):
    return datetime.fromisoformat(s)


def last_text(name):
    out, at = "", ""
    for _i, d in load(name):
        if d.get("type") == "assistant" and not d.get("parent_tool_use_id"):
            t = "".join(b.get("text", "") for b in d["message"]["content"] if b.get("type") == "text")
            if t:
                out, at = t, d.get("timestamp", "")
    return out, at


def section(state, name, nxt):
    return state.split(name)[1].split(nxt)[0].strip()


t1 = load("turn1.jsonl")
raw1 = (run / "turn1.jsonl").read_text()
st1 = (run / "fixture-state-1.txt").read_text()
turns = [n for n in (1, 2, 3) if (run / f"turn{n}.jsonl").exists() and (run / f"turn{n}.jsonl").stat().st_size]
committed_n = None
for _n in (2, 3):
    _p = run / f"fixture-state-{_n}.txt"
    if _p.exists() and "docs: record decisions for" in _p.read_text().split("== log")[1].split("\n")[1]:
        committed_n = _n
        break
final_n = committed_n or max(turns)
st2 = (run / f"fixture-state-{final_n}.txt").read_text()

calls = []
for i, d in t1:
    if d.get("type") == "assistant" and not d.get("parent_tool_use_id"):
        for b in d["message"]["content"]:
            if b.get("type") == "tool_use":
                calls.append((i, b["name"], b["input"], b["id"], d.get("timestamp", "")))


def bash(pred):
    return [c for c in calls if c[1] == "Bash" and pred(c[2].get("command", ""))]


agents = [c for c in calls if c[1] == "Agent"]
ext = [c for c in agents if "Decision notes for" in json.dumps(c[2])]
impl = [c for c in agents if c not in ext]
dry = bash(lambda s: "decisions-compile" in s and "--dry-run" in s)
fin_skill = [c for c in calls if c[1] == "Skill" and "finishing-a-development-branch" in json.dumps(c[2])]
fin_i = fin_skill[0][0] if fin_skill else 10**9
first_impl = impl[0][0] if impl else None
c1 = bool(dry) and first_impl is not None and dry[0][0] < first_impl
print(f"check 1: {'yes' if c1 else 'NO'} (dry-run Bash at jsonl line {dry[0][0] if dry else None}, first non-extractor Agent dispatch at line {first_impl}; dry-run calls: {len(dry)})")

# The final reviewer is the last non-extractor Agent dispatch before the extractor.
ext_i = ext[0][0] if ext else None
prior = [c for c in impl if ext_i is not None and c[0] < ext_i]
ledger = [
    c for c in calls if c[1] in ("Bash", "Write", "Edit") and "Decision extractor:" in json.dumps(c[2]) and c[0] > (ext_i or 0) - 1
]
codex_gate = [c for c in bash(lambda s: "codex" in s.lower()) if ext_i is not None and c[0] > ext_i]
bg = bool(ext) and ext[0][2].get("run_in_background") is True
c2 = bool(ext) and bg and bool(ledger) and ext_i is not None and ext_i < fin_i and bool(prior)
print(
    f"check 2: {'yes' if c2 else 'NO'} (extractor dispatches: {len(ext)}; run_in_background true: {bg}; 'decision-notes.md' in input: {'decision-notes.md' in json.dumps(ext[0][2]) if ext else False}; "
    f"last earlier Agent dispatch at line {prior[-1][0] if prior else None}; extractor at line {ext_i}; ledger write at line {ledger[0][0] if ledger else None}; "
    f"finishing Skill at line {fin_i if fin_skill else None}; codex-related Bash after dispatch: {[c[0] for c in codex_gate]})"
)
print(f"check 2 timestamps: extractor dispatch {ext[0][4] if ext else None}")

rm = bash(lambda s: "rm -rf" in s and "hyperpowers/sdd/" in s)
suite = [c for c in bash(lambda s: "npm test" in s) if c[0] > fin_i]
suite_c = suite[0] if suite else None
c3 = bool(rm) and suite_c is not None and rm[0][0] < suite_c[0] and ext_i is not None and ext_i < rm[0][0]
sdd_ls = section(st1, "== ls $SCRATCH/cache/hyperpowers/sdd\n", "== commit body")
print(
    f"check 3: {'yes' if c3 else 'NO'} (rm -rf of the workspace at line {rm[0][0] if rm else None} ts {rm[0][4] if rm else None}; finishing suite call at line {suite_c[0] if suite_c else None}; "
    f"fixture-state-1 workspace root listing: {sdd_ls!r})"
)

compile_calls = [c for c in bash(lambda s: "decisions-compile" in s and "--dry-run" not in s) if c[0] > fin_i]
log1 = st1.split("== log")[1].split("\n")[1]
rec_count = len(re.findall(r"^A\tdocs/hyperpowers/decisions/2026-10-20-.*\.md$", st1, re.MULTILINE))
others = [
    r"^A\tdocs/hyperpowers/decisions/README\.md$",
    r"^M\tdocs/hyperpowers/specs/2026-10-20-count-design\.md$",
    r"^D\tdocs/hyperpowers/plans/2026-10-20-count\.md$",
]
task_commit = "feat: list --count" in log1
c4 = bool(compile_calls) and suite_c is not None and compile_calls[0][0] > suite_c[0] and rec_count == 2 and all(re.search(p, st1, re.MULTILINE) for p in others) and task_commit
print(
    f"check 4: {'yes' if c4 else 'NO'} (compile at line {compile_calls[0][0] if compile_calls else None} after suite at line {suite_c[0] if suite_c else None}; dated records staged: {rec_count}; "
    f"README A, spec M, plan D present; top commit after turn 1: {log1})"
)

# check 5
text1, text1_at = last_text("turn1.jsonl")
stops = [c for c in calls if c[1] == "TaskStop"]
has = {k: (k in text1) for k in ["## Decision", "Merge back to main locally"]}
notif = [(i, d.get("task_id"), d.get("status")) for i, d in t1 if d.get("subtype") == "task_notification"]
started = {d.get("tool_use_id"): d.get("task_id") for _i, d in t1 if d.get("subtype") == "task_started"}
ext_task = started.get(ext[0][3]) if ext else None
print(f"check 5 markers: {has}")
print(f"check 5 order: extractor line {ext_i}, suite call line {suite_c[0] if suite_c else None}, compile line {compile_calls[0][0] if compile_calls else None}, TaskStop calls {[(c[0], c[4], json.dumps(c[2])[:80]) for c in stops]}")
print(f"check 5 notifications (line, task, status): {notif}; extractor task id: {ext_task}")
notif_ext = [n for n in notif if n[1] == ext_task]
print(f"check 5 extractor completion notification lines: {[n[0] for n in notif_ext]}")
print(f"check 5 notes: 'Nothing recorded.' in turn1.jsonl: {'Nothing recorded.' in raw1}; unfinished/stopped wording in menu text: {bool(re.search(r'stopp|unfinished|did not finish|had not finished', text1, re.IGNORECASE))}")

# suite result timestamp
suite_result = None
for i, d in t1:
    if d.get("type") == "user" and isinstance(d["message"]["content"], list):
        for b in d["message"]["content"]:
            if b.get("type") == "tool_result" and suite_c and b.get("tool_use_id") == suite_c[3]:
                suite_result = (d.get("timestamp"), str(b.get("content"))[:70])
bash_tasks = {d["task_id"] for _i, d in t1 if d.get("subtype") == "task_started" and suite_c and d.get("tool_use_id") == suite_c[3]}
bg_end = None
for _i, d in t1:
    if d.get("subtype") == "task_updated" and d.get("task_id") in bash_tasks and d.get("patch", {}).get("status") == "completed":
        bg_end = datetime.fromtimestamp(d["patch"]["end_time"] / 1000, UTC)
print(f"suite result timestamp: {suite_result}; backgrounded suite completion: {bg_end.isoformat() if bg_end else None}")

# check 6
log2 = st2.split("== log")[1].split("\n")[1]
staged2 = section(st2, "== staged (diff --cached --name-status)\n", "== log")
status2 = section(st2, "== status --porcelain\n", "== branch")
branch2 = st2.split("== branch\n")[1].split("\n")[0]
plan2 = st2.split("== plan present?\n")[1].split("\n")[0].strip()
c6 = "docs: record decisions for 2026-10-20-count" in log2 and not staged2 and not status2 and plan2 == "no" and branch2 == "feature/count"
print(f"check 6 (state after turn {final_n}; the records commit landed in turn {committed_n}): {'yes' if c6 else 'NO'} (top commit: {log2}; staged empty: {not staged2}; status clean: {not status2}; plan absent: {plan2 == 'no'}; branch: {branch2})")

# check 7
if suite_result:
    menu = ts(text1_at)
    print(f"interval 1 (suite tool result -> menu message): {(menu - ts(suite_result[0])).total_seconds():.1f} s (menu at {text1_at})")
    if bg_end:
        print(f"interval 1b (suite completion event -> menu message): {(menu - bg_end).total_seconds():.1f} s")
if committed_n:
    start = datetime.fromisoformat((run / f"turn{committed_n}-start.txt").read_text().strip())
    sha, iso = log2.split(" ")[0], log2.split(" ")[1]
    print(f"interval 2 (turn-{committed_n} start -> records commit %cI): {(datetime.fromisoformat(iso) - start).total_seconds():.0f} s (commit {sha} at {iso}; start is second-resolution UTC)")

# extra checks
m_und = re.search(r"undocumented (\d+)", raw1)
und = int(m_und.group(1)) if m_und else 0
if und == 0:
    print(f"check 7a: not exercised (compile reported undocumented 0; turn {committed_n} committed)")
else:
    st_a = (run / "fixture-state-2.txt").read_text()
    log_a = st_a.split("== log")[1].split("\n")[1]
    staged_a = section(st_a, "== staged (diff --cached --name-status)\n", "== log")
    t2, _ = last_text("turn2.jsonl")
    asks = "dispos" in t2.lower() or "dismiss" in t2.lower()
    ok = "records" not in log_a and "docs: record decisions" not in log_a and bool(staged_a)
    print(f"check 7a: {'yes' if ok else 'NO'} (undocumented {und}; after turn 2 top commit: {log_a}; records still staged: {bool(staged_a)}; turn-2 text asks: {asks})")
files = [r"decisions/2026-10-20-a-count-flag", r"decisions/2026-10-20-the-cli-counts", r"decisions/README\.md", r"specs/2026-10-20-count-design\.md", r"plans/2026-10-20-count\.md"]
dg = {f: bool(re.search(r"^diff --git .*" + f, text1, re.MULTILINE)) for f in files}
print(f"check 7b: {'yes' if all(dg.values()) else 'NO'} (diff --git lines in the turn-1 menu message: {dg})")
body_state = st2.split("== commit body (git show -s --format=%B HEAD)\n")[1] if "== commit body" in st2 else ""
body = [ln for ln in body_state.splitlines() if ln.strip()]
print(f"check 7c: {'yes' if len(body) == 1 and 'Co-Authored-By' not in body_state else 'NO'} (records commit body non-empty lines: {body})")
bad = []
for n in turns:
    for line in (run / f"turn{n}.err").read_text().splitlines():
        if re.search(r"budget|error", line, re.IGNORECASE):
            bad.append((n, line[:120]))
print(f"check 7d: {'yes' if not bad else 'NO'} (stderr lines naming budget or error: {bad}; scan-needle mentions: {sum((run / f'turn{n}.jsonl').read_text().count('realval-scan') for n in turns)})")
