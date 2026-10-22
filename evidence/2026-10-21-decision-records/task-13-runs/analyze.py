"""Answer the finishing-path rehearsal checks for one run directory.

Usage: analyze.py RUN_DIR

Prints one `check N: ...` line per check plus the two intervals. Main-thread
events carry no parent_tool_use_id; subagent events do, so the dispatch and
suite ordering is read from main-thread tool_use blocks only.
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


t1 = load("turn1.jsonl")
raw1 = (run / "turn1.jsonl").read_text()
st1 = (run / "fixture-state-1.txt").read_text()
three = (run / "turn3.jsonl").exists()
final_n = 3 if three else 2
# The turn whose end-state first shows the records commit on top is the one
# that committed; later turns (a third turn sent anyway) do not move it.
for _n in (2, 3):
    _p = run / f"fixture-state-{_n}.txt"
    if _p.exists() and "docs: record decisions for" in _p.read_text().split("== log")[1].split("\n")[1]:
        final_n = _n
        break
st2 = (run / f"fixture-state-{final_n}.txt").read_text()

# check 1
rec_count = len(re.findall(r"^A\tdocs/hyperpowers/decisions/2026-10-20-.*\.md$", st1, re.MULTILINE))
others = [
    r"^A\tdocs/hyperpowers/decisions/README\.md$",
    r"^M\tdocs/hyperpowers/specs/2026-10-20-tags-design\.md$",
    r"^D\tdocs/hyperpowers/plans/2026-10-20-tags\.md$",
]
log1 = st1.split("== log")[1].split("\n")[1]
c1 = rec_count == 2 and all(re.search(p, st1, re.MULTILINE) for p in others) and "feat: tag notes" in log1
print(f"check 1: {'yes' if c1 else 'NO'} (dated records staged: {rec_count}; README A, spec M, plan D present; top log line after turn 1: {log1})")

# check 2
calls = []
for i, d in t1:
    if d.get("type") == "assistant" and not d.get("parent_tool_use_id"):
        for b in d["message"]["content"]:
            if b.get("type") == "tool_use":
                calls.append((i, b["name"], b["input"], b["id"]))
agent_calls = [c for c in calls if c[1] == "Agent"]
n_agent = len(re.findall(r'"name":"Agent"', raw1))
disp = json.dumps(agent_calls[0][2]) if agent_calls else ""
bg = bool(agent_calls) and agent_calls[0][2].get("run_in_background") is True
c2 = n_agent >= 1 and "Decision notes for" in disp and "decision-notes.md" in disp and bg
print(f"check 2: {'yes' if c2 else 'NO'} (grep -c of the name:Agent pattern on lines: {sum(1 for l in raw1.splitlines() if '\"name\":\"Agent\"' in l)}; occurrences: {n_agent}; 'Decision notes for': {'Decision notes for' in disp}; 'decision-notes.md': {'decision-notes.md' in disp}; run_in_background true: {bg})")

# check 3
last = ""
last_ts = ""
for i, d in t1:
    if d.get("type") == "assistant" and not d.get("parent_tool_use_id"):
        t = "".join(b.get("text", "") for b in d["message"]["content"] if b.get("type") == "text")
        if t:
            last, last_ts = t, d.get("timestamp", "")
titles = ["Filtering happens in the CLI, not in a library", "Tags are a `#tag` suffix on the note line"]
has = {k: (k in last) for k in ["## Decision", "Merge back to main locally"] + titles}
npm = next((c for c in calls if c[1] == "Bash" and "npm test" in c[2].get("command", "")), None)
stops = [c for c in calls if c[1] == "TaskStop"]
agent_i = agent_calls[0][0] if agent_calls else None
print(f"check 3: last-text markers {has}")
print(f"check 3 order: Agent dispatch at jsonl line {agent_i}, suite call at line {npm[0] if npm else None}, TaskStop calls {[(c[0], json.dumps(c[2])[:80]) for c in stops]}")
started = {d.get('tool_use_id'): d.get('task_id') for i, d in t1 if d.get('subtype') == 'task_started'}
agent_task = started.get(agent_calls[0][3]) if agent_calls else None
notif = [(i, d.get('task_id'), d.get('status')) for i, d in t1 if d.get('subtype') == 'task_notification']
print(f"check 3 notifications (line, task, status): {notif}; extractor task id: {agent_task}")
print(f"check 3 notes: 'Nothing recorded.' in turn1.jsonl: {'Nothing recorded.' in raw1}")

# check 4
log2 = st2.split("== log")[1].split("\n")[1]
staged2 = st2.split("== staged (diff --cached --name-status)\n")[1].split("== log")[0].strip()
status2 = st2.split("== status --porcelain\n")[1].split("== branch")[0].strip()
branch2 = st2.split("== branch\n")[1].split("\n")[0]
plan2 = st2.split("== plan present?\n")[1].split("\n")[0].strip()
c4 = "docs: record decisions for 2026-10-20-tags" in log2 and not staged2 and not status2 and plan2 == "no" and branch2 == "feature/tags"
print(f"check 4 (state after turn {final_n}): {'yes' if c4 else 'NO'} (top commit: {log2}; staged empty: {not staged2}; status clean: {not status2}; plan absent: {plan2 == 'no'}; branch: {branch2})")

# check 5
bad = []
turns = (1, 2, 3) if three else (1, 2)
for n in turns:
    for line in (run / f"turn{n}.err").read_text().splitlines():
        if re.search(r"budget|error", line, re.IGNORECASE):
            bad.append((n, line[:120]))
sizes = [(run / f"turn{n}.err").stat().st_size for n in turns]
print(f"check 5: {'yes' if not bad else 'NO'} (err sizes in bytes: {sizes}; offending lines: {bad})")

# intervals: the suite's own tool result, and its completion event when it
# was moved to the background after the 120 s Bash timeout.
suite_result = None
for i, d in t1:
    if d.get("type") == "user" and isinstance(d["message"]["content"], list):
        for b in d["message"]["content"]:
            if b.get("type") == "tool_result" and npm and b.get("tool_use_id") == npm[3]:
                suite_result = (d.get("timestamp"), str(b.get("content"))[:70])
bash_tasks = {d["task_id"] for i, d in t1 if d.get("subtype") == "task_started" and npm and d.get("tool_use_id") == npm[3]}
bg_end = None
for i, d in t1:
    if d.get("subtype") == "task_updated" and d.get("task_id") in bash_tasks and d.get("patch", {}).get("status") == "completed":
        bg_end = datetime.fromtimestamp(d["patch"]["end_time"] / 1000, UTC)
menu = ts(last_ts)
if suite_result is None:
    sys.exit("no tool result for the suite call")
res_t = ts(suite_result[0])
print(f"interval 1a (suite tool result -> menu message): {(menu - res_t).total_seconds():.1f} s (result at {suite_result[0]}, {suite_result[1]!r}; menu at {last_ts})")
if bg_end:
    print(f"interval 1b (suite completion event -> menu message): {(menu - bg_end).total_seconds():.1f} s (suite finished {bg_end.isoformat()})")
start2 = datetime.fromisoformat((run / f"turn{final_n}-start.txt").read_text().strip())
sha, iso = log2.split(" ")[0], log2.split(" ")[1]
print(f"interval 2 (turn-{final_n} start -> records commit %cI): {(datetime.fromisoformat(iso) - start2).total_seconds():.0f} s (start {start2.isoformat()}, commit {sha} at {iso}; start is second-resolution UTC)")


# Fix-round-3 checks, for the three-turn run.
def last_text(name):
    out = ""
    for _i, d in load(name):
        if d.get("type") == "assistant" and not d.get("parent_tool_use_id"):
            t = "".join(b.get("text", "") for b in d["message"]["content"] if b.get("type") == "text")
            if t:
                out = t
    return out


def body_of(state):
    marker = "== commit body (git show -s --format=%B HEAD)\n"
    return state.split(marker)[1] if marker in state else ""


m_und = re.search(r"undocumented (\d+)", raw1)
und = int(m_und.group(1)) if m_und else 0
if und == 0:
    print(f"check 6a: not exercised (the extractor proposed no undocumented decisions; check 4 applied to turn {final_n}, the turn that committed)")
if three and und > 0:
    st_a = (run / "fixture-state-2.txt").read_text()
    log_a = st_a.split("== log")[1].split("\n")[1]
    staged_a = st_a.split("== staged (diff --cached --name-status)\n")[1].split("== log")[0].strip()
    t2 = last_text("turn2.jsonl")
    ok_a = und > 0 and "feat: tag notes" in log_a and bool(staged_a)
    asks = "dispos" in t2.lower() or "dismiss" in t2.lower()
    print(f"check 6a: {'yes' if ok_a else 'NO'} (undocumented decisions in the compile output: {und}; after turn 2 top commit: {log_a}; records still staged: {bool(staged_a)}; turn-2 text asks for dispositions: {asks})")
    print(f"check 6a turn 2 text (first 500 chars): {t2[:500]!r}")
    t3 = last_text("turn3.jsonl")
    print(f"check 6a turn 3 text (first 600 chars): {t3[:600]!r}")
files = [r"decisions/2026-10-20-filtering", r"decisions/2026-10-20-tags-are", r"decisions/README\.md", r"specs/2026-10-20-tags-design\.md", r"plans/2026-10-20-tags\.md"]
dg = {f: bool(re.search(r"^diff --git .*" + f, last, re.MULTILINE)) for f in files}
print(f"check 6b: {'yes' if all(dg.values()) else 'NO'} (diff --git lines in the turn-1 menu message: {dg})")
body = [ln for ln in body_of(st2).splitlines() if ln.strip()]
print(f"check 6c: {'yes' if len(body) == 1 and 'Co-Authored-By' not in body_of(st2) else 'NO'} (commit body non-empty lines: {body})")
scan = sum((run / f"turn{n}.jsonl").read_text().count("realval-scan") for n in turns)
coa = sum((run / f"turn{n}.jsonl").read_text().count("Co-Authored-By") for n in turns)
print(f"check 6d: realval-scan occurrences {scan}; Co-Authored-By occurrences {coa} (a commit trailer would show in 6c)")
