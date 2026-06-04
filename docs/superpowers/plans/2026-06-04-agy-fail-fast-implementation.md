# agy Fail-Fast (A1–A4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When agy's Gemini Code Assist window trips mid-run, detect it from `agy.log`, tear agy down by killing gauntlet's private tmux server, and write a rate-limit verdict (not an empty-trace indeterminate) so the batch latch skips the rest of agy — without corrupting the shared OAuth credential.

**Architecture:** A daemon watcher thread tails the quorum-owned `<run_dir>/coding-agent-config/agy.log` while the (now non-blocking) gauntlet subprocess runs. On a rate-limit match it discovers gauntlet's private tmux server (named `gauntlet-<epoch>-<rand>`, matched by the run's scratch dir) and runs `tmux -L <name> kill-server` — gauntlet's own orphan-free teardown. The runner then intercepts **before** the capture cascade and writes a rate-limit verdict carrying `ANTIGRAVITY_RATE_LIMIT_MARKER`. A one-line change to `_is_rate_limited_verdict` lets the existing batch latch fire regardless of error stage. The shared `~/.gemini/oauth_creds.json` is backed up before and read-back-verified/restored after.

**Tech Stack:** Python 3.11+, uv, pytest, `subprocess`/`threading`, tmux. Spec: `docs/superpowers/specs/2026-06-04-agy-rate-limit-reliability-design.md` (§4, §6).

**Scope:** A1–A4 (Part A, fail-fast) only. Resume (B2) and cross-agent (B5) are separate plans. **Altitude:** test code is the complete runnable contract; implementation is anchored to exact `file:line` and the tricky primitives are shown; the bulk is written red-green-refactor.

---

## File structure

- **Create `quorum/agy_teardown.py`** — tmux discovery + kill. `kill_run_tmux_server(scratch_dir, *, runner=subprocess.run) -> bool`. One responsibility: given a run's scratch dir, find gauntlet's private `gauntlet-*` server whose pane cwd is under that dir and `kill-server` it. Pure-ish (subprocess injected for tests).
- **Create `quorum/agy_watch.py`** — `AgyRateLimitWatcher(log_path, scratch_dir)`: a daemon thread that tails `log_path`, fires `kill_run_tmux_server` on a `_agy_log_shows_rate_limit` hit, and exposes `tripped: bool` + `matched_text: str`. One responsibility: detect-and-trigger.
- **Create `quorum/agy_creds.py`** — `backup_credential() -> CredBackup | None` and `CredBackup.verify_or_restore()`. One responsibility: protect `~/.gemini/oauth_creds.json` around a kill.
- **Modify `quorum/runner.py`** — `invoke_gauntlet` (blocking `subprocess.run` at `:1185` → `Popen` + watcher); the intercept right after it returns (`~:1413`, before the strict-capture guard at `:1589-1602`); wrap the agy run in credential backup/restore.
- **Modify `quorum/run_all.py`** — one-line latch fix in `_is_rate_limited_verdict` (`:786`).
- **Tests:** `tests/quorum/test_agy_teardown.py`, `tests/quorum/test_agy_watch.py`, `tests/quorum/test_agy_creds.py` (new); extend `tests/quorum/test_run_all.py`, `tests/quorum/test_runner.py`.

---

## Task 1: Latch fires on a mid-run rate-limit verdict (any stage)

The smallest, highest-leverage change: today `_is_rate_limited_verdict` requires `error.stage == "setup"`, so a mid-run kill (stage `"gauntlet"`) would not latch. Drop the stage clause; key only on the marker.

**Files:** Modify `quorum/run_all.py:781-788`; Test `tests/quorum/test_run_all.py`.

- [ ] **Step 1: Write the failing test.**

```python
# tests/quorum/test_run_all.py
from quorum.run_all import _is_rate_limited_verdict
from quorum.runner import ANTIGRAVITY_RATE_LIMIT_MARKER

def test_rate_limited_verdict_detected_regardless_of_stage():
    setup_v = {"error": {"stage": "setup", "message": f"{ANTIGRAVITY_RATE_LIMIT_MARKER}: …"}}
    midrun_v = {"error": {"stage": "gauntlet", "message": f"{ANTIGRAVITY_RATE_LIMIT_MARKER}: killed mid-run"}}
    other_v = {"error": {"stage": "gauntlet", "message": "no Antigravity transcript captured"}}
    assert _is_rate_limited_verdict(setup_v) is True      # preflight path still works
    assert _is_rate_limited_verdict(midrun_v) is True      # NEW: mid-run kill latches
    assert _is_rate_limited_verdict(other_v) is False      # a plain capture failure does not
    assert _is_rate_limited_verdict(None) is False
```

- [ ] **Step 2: Run it — expect FAIL** (`midrun_v` returns False today).
Run: `uv run pytest tests/quorum/test_run_all.py::test_rate_limited_verdict_detected_regardless_of_stage -x -q`
Expected: FAIL on the `midrun_v` assertion.

- [ ] **Step 3: Implement** — in `quorum/run_all.py`, change `_is_rate_limited_verdict` to drop the `stage == "setup"` clause:

```python
def _is_rate_limited_verdict(verdict: dict | None) -> bool:
    if not verdict:
        return False
    err = verdict.get("error") or {}
    return ANTIGRAVITY_RATE_LIMIT_MARKER in (err.get("message") or "")
```

- [ ] **Step 4: Run** — expect PASS. Then run the existing latch test (`test_run_batch_fail_fast_on_agy_rate_limit`) to confirm no regression: `uv run pytest tests/quorum/test_run_all.py -x -q`.

- [ ] **Step 5: Commit.** `git add quorum/run_all.py tests/quorum/test_run_all.py && git commit -m "fix(agy): latch on rate-limit verdict regardless of error stage"`

## Task 2: Credential backup / read-back / restore

Protect the shared `~/.gemini/oauth_creds.json` (confirmed shared, not per-run; A4). Restore only if the post-run file is **corrupt** (a legitimate token refresh changes the bytes but stays valid JSON — that must NOT trigger a restore).

**Files:** Create `quorum/agy_creds.py`, `tests/quorum/test_agy_creds.py`.

- [ ] **Step 1: Write the failing tests.**

```python
# tests/quorum/test_agy_creds.py
import json, pathlib
from quorum.agy_creds import backup_credential

def _write(p, obj): p.write_text(json.dumps(obj))

def test_corrupt_creds_restored(tmp_path, monkeypatch):
    creds = tmp_path / ".gemini" / "oauth_creds.json"; creds.parent.mkdir(parents=True)
    _write(creds, {"access_token": "good", "refresh_token": "r"})
    monkeypatch.setattr("quorum.agy_creds._CRED_PATH", creds)
    b = backup_credential()
    creds.write_text('{"access_token": "tru')          # simulate half-written kill
    b.verify_or_restore()
    assert json.loads(creds.read_text())["access_token"] == "good"   # restored

def test_legitimate_refresh_not_restored(tmp_path, monkeypatch):
    creds = tmp_path / ".gemini" / "oauth_creds.json"; creds.parent.mkdir(parents=True)
    _write(creds, {"access_token": "old", "refresh_token": "r"})
    monkeypatch.setattr("quorum.agy_creds._CRED_PATH", creds)
    b = backup_credential()
    _write(creds, {"access_token": "rotated", "refresh_token": "r"})  # valid refresh
    b.verify_or_restore()
    assert json.loads(creds.read_text())["access_token"] == "rotated"  # left alone

def test_missing_creds_is_noop(tmp_path, monkeypatch):
    monkeypatch.setattr("quorum.agy_creds._CRED_PATH", tmp_path / "nope.json")
    assert backup_credential() is None      # nothing to protect; caller no-ops
```

- [ ] **Step 2: Run — expect FAIL** (module missing).
Run: `uv run pytest tests/quorum/test_agy_creds.py -x -q`

- [ ] **Step 3: Implement `quorum/agy_creds.py`.** `_CRED_PATH = pathlib.Path.home()/".gemini"/"oauth_creds.json"`. `backup_credential()` returns `None` if absent, else a `CredBackup` holding a temp copy. `verify_or_restore()` restores from the copy **only** when the live file fails `json.load` (corrupt); valid JSON (refreshed or not) is left untouched. Keep it ~30 lines; the tests above are the contract.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit.** `git add quorum/agy_creds.py tests/quorum/test_agy_creds.py && git commit -m "feat(agy): backup+restore oauth_creds around mid-run kills"`

## Task 3: Discover and kill gauntlet's private tmux server

Given a run's scratch dir, find the `gauntlet-*` named server whose pane cwd is under it, and `kill-server`. `subprocess` is injected so tests assert the issued commands without a real tmux.

**Files:** Create `quorum/agy_teardown.py`, `tests/quorum/test_agy_teardown.py`.

- [ ] **Step 1: Write the failing tests** (contract: it lists `gauntlet-*` sockets, matches by `pane_start_path`, kills the right one):

```python
# tests/quorum/test_agy_teardown.py
from quorum.agy_teardown import kill_run_tmux_server

def make_runner(sockets, panes):
    calls = []
    def runner(cmd, **kw):
        calls.append(cmd)
        class R: returncode = 0; stdout = ""; stderr = ""
        if cmd[:3] == ["tmux", "-L", "_LIST_"]:           # sentinel; real code lists socket dir
            pass
        if "list-panes" in cmd:
            name = cmd[2]; R.stdout = panes.get(name, "")
        return R
    return runner, calls

def test_kills_the_server_under_the_scratch_dir(tmp_path, monkeypatch):
    scratch = tmp_path / "run123" / "gauntlet-agent" / "scratch"; scratch.mkdir(parents=True)
    # two private servers exist; only B's pane is under our scratch dir
    monkeypatch.setattr("quorum.agy_teardown._list_gauntlet_sockets",
                        lambda: ["gauntlet-1-aaaaaa", "gauntlet-2-bbbbbb"])
    panes = {"gauntlet-1-aaaaaa": "/some/other/scratch\n",
             "gauntlet-2-bbbbbb": f"{scratch}\n"}
    runner, calls = make_runner([], panes)
    killed = kill_run_tmux_server(scratch, runner=runner)
    assert killed is True
    assert ["tmux", "-L", "gauntlet-2-bbbbbb", "kill-server"] in calls
    assert ["tmux", "-L", "gauntlet-1-aaaaaa", "kill-server"] not in calls

def test_no_match_returns_false(tmp_path, monkeypatch):
    monkeypatch.setattr("quorum.agy_teardown._list_gauntlet_sockets", lambda: [])
    assert kill_run_tmux_server(tmp_path, runner=lambda *a, **k: None) is False
```

- [ ] **Step 2: Run — expect FAIL** (module missing).
Run: `uv run pytest tests/quorum/test_agy_teardown.py -x -q`

- [ ] **Step 3: Implement `quorum/agy_teardown.py`.** Key primitives (shown — these are the tricky bits):

```python
import os, pathlib, subprocess

def _socket_dir() -> pathlib.Path:
    base = os.environ.get("TMUX_TMPDIR", "/tmp")
    return pathlib.Path(base) / f"tmux-{os.getuid()}"

def _list_gauntlet_sockets() -> list[str]:
    d = _socket_dir()
    return sorted(p.name for p in d.glob("gauntlet-*")) if d.is_dir() else []

def _pane_path(name: str, runner) -> str:
    r = runner(["tmux", "-L", name, "list-panes", "-a", "-F", "#{pane_start_path}"],
               capture_output=True, text=True)
    return (getattr(r, "stdout", "") or "").strip()

def kill_run_tmux_server(scratch_dir, *, runner=subprocess.run) -> bool:
    target = str(pathlib.Path(scratch_dir).resolve())
    for name in _list_gauntlet_sockets():
        for line in _pane_path(name, runner).splitlines():
            if str(pathlib.Path(line.strip()).resolve()) == target or target in line:
                runner(["tmux", "-L", name, "kill-server"])
                return True
    return False
```

(Implement to pass the tests; the `_list_gauntlet_sockets` monkeypatch in the test isolates the glob.)

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit.** `git add quorum/agy_teardown.py tests/quorum/test_agy_teardown.py && git commit -m "feat(agy): discover+kill gauntlet private tmux server by scratch dir"`

## Task 4: The agy.log rate-limit watcher

A daemon thread that tails the log, fires teardown on a match, exposes `tripped`. Tolerates the file being absent at start (agy creates it late).

**Files:** Create `quorum/agy_watch.py`, `tests/quorum/test_agy_watch.py`.

- [ ] **Step 1: Write the failing tests** (contract: detects a mid-stream 429, ignores a clean log, tolerates a late-created file, calls teardown once):

```python
# tests/quorum/test_agy_watch.py
import time, threading
from quorum.agy_watch import AgyRateLimitWatcher

def _run_until(pred, timeout=2.0):
    end = time.time() + timeout
    while time.time() < end:
        if pred(): return True
        time.sleep(0.02)
    return False

def test_detects_resource_exhausted_and_tears_down(tmp_path):
    log = tmp_path / "agy.log"; log.write_text("starting\n")
    killed = []
    w = AgyRateLimitWatcher(log, tmp_path, teardown=lambda sd: killed.append(sd) or True,
                            poll_interval=0.02)
    w.start()
    with log.open("a") as f: f.write("googleapi: Error 429: RESOURCE_EXHAUSTED\n")
    assert _run_until(lambda: w.tripped)
    assert killed == [tmp_path]
    assert "RESOURCE_EXHAUSTED" in w.matched_text
    w.stop()

def test_clean_log_does_not_trip(tmp_path):
    log = tmp_path / "agy.log"; log.write_text("all good\nmore output\n")
    w = AgyRateLimitWatcher(log, tmp_path, teardown=lambda sd: True, poll_interval=0.02)
    w.start(); time.sleep(0.2)
    assert w.tripped is False
    w.stop()

def test_tolerates_absent_then_created_log(tmp_path):
    log = tmp_path / "agy.log"   # does not exist yet
    w = AgyRateLimitWatcher(log, tmp_path, teardown=lambda sd: True, poll_interval=0.02)
    w.start(); time.sleep(0.1)
    log.write_text("429 RESOURCE_EXHAUSTED\n")
    assert _run_until(lambda: w.tripped)
    w.stop()
```

- [ ] **Step 2: Run — expect FAIL** (module missing).

- [ ] **Step 3: Implement `quorum/agy_watch.py`.** A `threading.Thread` subclass (daemon) that polls `log_path` every `poll_interval`, re-reading appended bytes, applying `quorum.runner._agy_log_shows_rate_limit` to new content; on hit set `self.tripped`, capture `matched_text`, call `teardown(scratch_dir)` once, and stop. `teardown` defaults to `quorum.agy_teardown.kill_run_tmux_server`. `stop()` joins. The tests are the contract; keep it focused.

> **Detection-latency note (the one live residual):** this watches `agy.log`, the only deterministic continuous signal (gauntlet does not stream the pane — confirmed from source). If a one-time observation of a real throttled run shows agy's Go-`glog` holds the 429 line until exit, add a `transcript.jsonl`-stall fallback here. Either way the gauntlet wall-clock budget remains the guaranteed backstop, so this does not block the task.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit.** `git add quorum/agy_watch.py tests/quorum/test_agy_watch.py && git commit -m "feat(agy): agy.log rate-limit watcher thread"`

## Task 5: Wire Popen + watcher into invoke_gauntlet

Convert the blocking call at `runner.py:1185` to `Popen`, run the watcher for antigravity runs, and expose whether a mid-run rate-limit tripped.

**Files:** Modify `quorum/runner.py` (`invoke_gauntlet`, def `~:1137`, call `:1185`); Test `tests/quorum/test_runner.py`.

- [ ] **Step 1: Write the failing test** — a fake gauntlet command (a short shell script that appends `RESOURCE_EXHAUSTED` to the run's `agy.log` then sleeps) drives `invoke_gauntlet`; assert the watcher tripped and teardown was invoked, and the call returns rather than hanging.

```python
# tests/quorum/test_runner.py  (sketch; mirror existing invoke_gauntlet test fixtures)
def test_invoke_gauntlet_trips_on_midrun_rate_limit(tmp_path, monkeypatch):
    # arrange a run_dir with coding-agent-config/, point the fake "gauntlet" at a script
    # that writes "RESOURCE_EXHAUSTED" into <run_dir>/coding-agent-config/agy.log,
    # monkeypatch kill_run_tmux_server to record the call (no real tmux),
    # invoke_gauntlet(..., coding_agent="antigravity") and assert:
    #   - it returns within the test timeout (did not hang to max-time)
    #   - the recorded teardown was called with the run's scratch dir
    #   - invoke_gauntlet signals rate_limited=True to its caller
    ...
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement.** In `invoke_gauntlet`: build `cmd`/`env` unchanged (`:1159-1177`), `proc = subprocess.Popen(cmd, env=env)`; if `coding_agent == "antigravity"`, start an `AgyRateLimitWatcher(agent_config_dir/"agy.log", scratch_dir)` (pre-`touch` the log for a stable inode); `proc.wait()`; `w.stop()`. Return the existing status plus a `rate_limited` signal (e.g. a small result object or a tuple) the caller reads. Keep `_gauntlet_status_from_run_dir` (`:1186`) behavior for the non-rate-limit path.

- [ ] **Step 4: Run — expect PASS** (and the existing invoke_gauntlet tests still green).

- [ ] **Step 5: Commit.** `git add quorum/runner.py tests/quorum/test_runner.py && git commit -m "feat(agy): Popen invoke_gauntlet + mid-run rate-limit watcher"`

## Task 6: Intercept before the capture cascade → rate-limit verdict

When the watcher tripped, write a single rate-limit verdict **before** the strict-capture guard turns the empty trace into a generic `stage="capture"` indeterminate.

**Files:** Modify `quorum/runner.py` (intercept at `~:1413`, before the antigravity strict-capture guard at `:1589-1602`); wrap the agy run in `agy_creds` backup/restore (Task 2); Test `tests/quorum/test_runner.py`.

- [ ] **Step 1: Write the failing test** — with the watcher forced to "tripped", `run_scenario` (antigravity) writes a `verdict.json` whose `error.message` contains `ANTIGRAVITY_RATE_LIMIT_MARKER` and `error.stage == "gauntlet"`, **not** the `"no Antigravity transcript captured"` capture indeterminate; and `_is_rate_limited_verdict(verdict)` is True (closes the loop with Task 1).

```python
def test_midrun_rate_limit_writes_rate_limit_verdict_not_capture_indeterminate(...):
    # force invoke_gauntlet to report rate_limited=True (monkeypatch the watcher/teardown)
    run_dir, verdict = _run_scenario_inner(...antigravity...)
    err = verdict.to_dict()["error"]
    assert ANTIGRAVITY_RATE_LIMIT_MARKER in err["message"]
    assert err["stage"] == "gauntlet"
    assert "no Antigravity transcript captured" not in err["message"]
```

- [ ] **Step 2: Run — expect FAIL** (today it becomes a capture-stage indeterminate).

- [ ] **Step 3: Implement.** Right after `invoke_gauntlet` returns (`~:1413`), before `capture_tool_calls` (`:1441`) and the strict-capture guard (`:1589-1602`): if the run was antigravity and `rate_limited` (from Task 5's signal, or re-read the watcher flag), `return run_dir, _write_indeterminate(run_dir, final_reason=f"{ANTIGRAVITY_RATE_LIMIT_MARKER}: agy hit RESOURCE_EXHAUSTED mid-run; killed", gauntlet=<layer-or-None>, checks=pre_records, error=RunError(stage="gauntlet", message=f"{ANTIGRAVITY_RATE_LIMIT_MARKER}: …"))`. Wrap the whole agy run body in `cb = agy_creds.backup_credential()` … `finally: cb and cb.verify_or_restore()` so a kill can't leave a corrupt credential.

- [ ] **Step 4: Run — expect PASS.** Then the full suite: `uv run pytest -q`.

- [ ] **Step 5: Commit.** `git add quorum/runner.py tests/quorum/test_runner.py && git commit -m "feat(agy): synthesize rate-limit verdict before capture cascade; guard credential"`

## Task 7 (manual, non-blocking): confirm agy.log flush timing

One cheap live observation (the only residual the code dive couldn't resolve), done once, out of band — **does not block the tasks above.**

- [ ] During any real antigravity run, `tail -f <run_dir>/coding-agent-config/agy.log` and confirm lines appear continuously (real-time flush) rather than only at exit; capture one verbatim `RESOURCE_EXHAUSTED`/quota line when the window next trips, to pin the matcher string + `quota_metric` (feeds A2 and a future Plan B). If the line is held until exit, add the `transcript.jsonl`-stall fallback noted in Task 4. The gauntlet wall-clock budget is the guaranteed backstop regardless.

---

## Self-review

- **Spec coverage:** A1 (Tasks 4–6: watch → kill → verdict-before-cascade); A2 (Task 7 captures the 429 string / `quota_metric`; predicate refinement rides with it); A3 (Task 6 writes the marker verdict, Task 1 latches it, run-all records skipped="rate-limited" for later cells — unchanged machinery); A4 (Task 2 backup/restore, wired in Task 6); teardown discovery (Task 3) matches the corrected §4 mechanism. A5's residual is Task 7.
- **Placeholder scan:** test code is complete and runnable; the two larger modules (`agy_watch`, the runner wiring) give interface + the tricky primitives + the contract tests rather than `# TODO`. The `gauntlet=<layer-or-None>` in Task 6 resolves to the existing gauntlet layer the surrounding code already holds.
- **Type consistency:** `kill_run_tmux_server(scratch_dir, *, runner)` (Task 3) is what `AgyRateLimitWatcher(teardown=…)` (Task 4) calls and what Task 5 wires; `ANTIGRAVITY_RATE_LIMIT_MARKER` (runner.py:460) is the single string Tasks 1/6 share; `backup_credential()/verify_or_restore()` (Task 2) is what Task 6 calls.
- **Out of scope (separate plans):** B2 resume idempotency + intended-matrix-to-batch.json; B4 graceful-degradation surfacing; B5 gemini→Vertex + cap verification.
