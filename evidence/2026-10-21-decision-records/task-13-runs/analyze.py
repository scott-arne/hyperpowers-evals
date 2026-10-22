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
st2 = (run / "fixture-state-2.txt").read_text()

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
plan2 = st2.split("== plan present?\n")[1].strip()
c4 = "docs: record decisions for 2026-10-20-tags" in log2 and not staged2 and not status2 and plan2 == "no" and branch2 == "feature/tags"
print(f"check 4: {'yes' if c4 else 'NO'} (top commit: {log2}; staged empty: {not staged2}; status clean: {not status2}; plan absent: {plan2 == 'no'}; branch: {branch2})")

# check 5
bad = []
for n in (1, 2):
    for line in (run / f"turn{n}.err").read_text().splitlines():
        if re.search(r"budget|error", line, re.IGNORECASE):
            bad.append((n, line[:120]))
sizes = [(run / f"turn{n}.err").stat().st_size for n in (1, 2)]
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
start2 = datetime.fromisoformat((run / "turn2-start.txt").read_text().strip())
sha, iso = log2.split(" ")[0], log2.split(" ")[1]
print(f"interval 2 (turn-2 start -> records commit %cI): {(datetime.fromisoformat(iso) - start2).total_seconds():.0f} s (start {start2.isoformat()}, commit {sha} at {iso}; start is second-resolution UTC)")
