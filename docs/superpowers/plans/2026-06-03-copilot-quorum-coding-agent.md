# Copilot Quorum Coding-Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `copilot` as a first-class Quorum Coding-Agent target with isolated Copilot state, staged local Superpowers plugin loading, session-state capture, canonical tool normalization, and a bootstrap smoke scenario.

**Architecture:** Keep Copilot inside Quorum's existing Coding-Agent model: one YAML config, one generated context launcher, runner-level provisioning into `<run>/coding-agent-config`, one normalizer, shared capture/composer flow, and one bootstrap scenario. Copilot adds two security boundaries that the earlier targets do not need in this exact form: secrets are materialized only into a chmod-0600 env file sourced by the launcher, and the outer Gauntlet QA-agent environment is sanitized so Copilot auth never reaches the QA shell.

**Tech Stack:** Python 3.11+, uv, pytest, ruff, ty, Bash check tools, jq, Gauntlet TUI adapter, GitHub Copilot CLI `1.0.x`.

**Spec:** [docs/superpowers/specs/2026-06-03-copilot-quorum-coding-agent-design.md](../specs/2026-06-03-copilot-quorum-coding-agent-design.md)

---

## File Structure

**Create:**
- `coding-agents/copilot.yaml` - Copilot Coding-Agent config.
- `coding-agents/copilot-context/HOWTO.md` - Gauntlet-Agent instructions for launching Copilot through the generated launcher.
- `coding-agents/copilot-context/launch-agent` - generated launcher template that sources the private env file and runs Copilot under `env -i`.
- `bin/copilot-plugin-installed` - deterministic check for the staged Superpowers Copilot plugin.
- `scenarios/copilot-superpowers-bootstrap/story.md` - live bootstrap smoke scenario.
- `scenarios/copilot-superpowers-bootstrap/setup.sh` - base repo fixture setup.
- `scenarios/copilot-superpowers-bootstrap/checks.sh` - Copilot bootstrap deterministic checks.

**Modify:**
- `quorum/normalizers.py` - add Copilot session-state normalization and register `normalizer: copilot`.
- `quorum/runner.py` - add Copilot provisioning, auth env-file handling, plugin staging, sanitized Gauntlet env, expected session-state enforcement, strict capture, and secret leak scanning.
- `tests/quorum/test_normalizers.py` - Copilot normalizer coverage.
- `tests/quorum/test_coding_agent_config.py` - Copilot YAML loader coverage.
- `tests/quorum/test_runner.py` - Copilot seeding, auth, launcher, Gauntlet env, capture, and leak-scan coverage.
- `tests/quorum/test_capture.py` - Copilot recursive `events.jsonl` capture coverage.
- `tests/quorum/test_trace_tools.py` - Copilot plugin check and trace ordering coverage.
- `tests/quorum/test_scaffold.py` - Copilot bootstrap scenario validation coverage.
- `README.md` - document Copilot target, auth sources, isolation, capture path, and trusted-maintainer safety.

**Do Not Change:**
- Public CI to run Copilot live evals.
- Existing Claude, Codex, Pi, Gemini, Antigravity, or OpenCode behavior except for shared helper registration and test imports.
- Superpowers hook scripts in the parent checkout. v1 uses the existing `.claude-plugin` files and `hooks/session-start`.
- The user's global `~/.copilot` or any host-level Copilot state.

---

## Task 1: Empirical Copilot CLI Probe

**Why first:** The implementation depends on current Copilot CLI flags and plugin-list behavior. Confirm those facts before writing code, using throwaway state only.

**Files:**
- No repo files changed.

- [ ] **Step 1: Confirm Copilot CLI flags**

Run:

```bash
copilot --version
copilot --help | rg 'plugin-dir|session-id|secret-env-vars|log-dir|allow-all|no-auto-update|no-remote|disable-builtin-mcps'
copilot plugin --help
```

Expected:
- `copilot --version` prints a concrete version such as `1.0.59`.
- Help includes `--plugin-dir`, `--session-id`, `--secret-env-vars`, `--log-dir`, `--allow-all`, `--no-auto-update`, `--no-remote`, and `--disable-builtin-mcps`.
- `copilot plugin --help` includes a list-style command that can be run without invoking the model.

- [ ] **Step 2: Verify plugin-root shape in throwaway state**

Run:

```bash
tmp=$(mktemp -d /tmp/quorum-copilot-home.XXXXXX)
SUPERPOWERS_ROOT=${SUPERPOWERS_ROOT:-/Users/drewritter/prime-rad/superpowers}
mkdir -p "$tmp/plugins"
cp -R "$SUPERPOWERS_ROOT/.claude-plugin" "$tmp/plugins/superpowers/.claude-plugin"
mkdir -p "$tmp/plugins/superpowers/hooks"
cp "$SUPERPOWERS_ROOT/hooks/hooks.json" "$tmp/plugins/superpowers/hooks/hooks.json"
cp "$SUPERPOWERS_ROOT/hooks/run-hook.cmd" "$tmp/plugins/superpowers/hooks/run-hook.cmd"
cp "$SUPERPOWERS_ROOT/hooks/session-start" "$tmp/plugins/superpowers/hooks/session-start"
cp -R "$SUPERPOWERS_ROOT/skills" "$tmp/plugins/superpowers/skills"
COPILOT_HOME="$tmp" HOME="$tmp" COPILOT_CLI=1 \
  copilot --plugin-dir "$tmp/plugins/superpowers" plugin list
```

Expected:
- Command exits `0`.
- Output names the Superpowers plugin or reports the staged plugin root path under `$tmp/plugins/superpowers`.
- Output does not reference the source checkout as the loaded plugin root.

- [ ] **Step 3: Verify direct session-state path in throwaway state**

Run only when Copilot auth is available:

```bash
tmp=$(mktemp -d /tmp/quorum-copilot-session.XXXXXX)
session_id="quorum-probe-$(uuidgen | tr '[:upper:]' '[:lower:]')"
SUPERPOWERS_ROOT=${SUPERPOWERS_ROOT:-/Users/drewritter/prime-rad/superpowers}
mkdir -p "$tmp/plugins"
cp -R "$SUPERPOWERS_ROOT/.claude-plugin" "$tmp/plugins/superpowers/.claude-plugin"
mkdir -p "$tmp/plugins/superpowers/hooks"
cp "$SUPERPOWERS_ROOT/hooks/hooks.json" "$tmp/plugins/superpowers/hooks/hooks.json"
cp "$SUPERPOWERS_ROOT/hooks/run-hook.cmd" "$tmp/plugins/superpowers/hooks/run-hook.cmd"
cp "$SUPERPOWERS_ROOT/hooks/session-start" "$tmp/plugins/superpowers/hooks/session-start"
cp -R "$SUPERPOWERS_ROOT/skills" "$tmp/plugins/superpowers/skills"
COPILOT_HOME="$tmp" HOME="$tmp" COPILOT_CLI=1 timeout 120 \
  copilot \
    --plugin-dir "$tmp/plugins/superpowers" \
    --session-id "$session_id" \
    --allow-all \
    --no-auto-update \
    --no-remote \
    --disable-builtin-mcps \
    --log-dir "$tmp/logs"
find "$tmp/session-state" -path "*/events.jsonl" -type f -print | sort
```

Expected:
- If the interactive probe is completed with a short prompt and clean exit, the file list includes `$tmp/session-state/$session_id/events.jsonl`.
- If local auth blocks the probe, record the exact auth blocker before implementation continues.

- [ ] **Step 4: Commit**

No commit. This task records local CLI facts only.

---

## Task 2: Copilot Normalizer

**Files:**
- Modify: `quorum/normalizers.py`
- Modify: `tests/quorum/test_normalizers.py`
- Modify: `tests/quorum/test_trace_tools.py`
- Test: `uv run pytest tests/quorum/test_normalizers.py::TestNormalizeCopilotLogs tests/quorum/test_trace_tools.py::test_skill_before_implementation_tool_accepts_copilot_apply_patch_rows -q`

- [ ] **Step 1: Write failing Copilot normalizer tests**

In `tests/quorum/test_normalizers.py`, add `normalize_copilot_logs` to the import list:

```python
from quorum.normalizers import (
    collect_new_logs,
    filter_codex_logs_by_cwd,
    filter_pi_logs_by_cwd,
    find_misplaced_codex_rollouts,
    normalize_antigravity_logs,
    normalize_claude_logs,
    normalize_codex_logs,
    normalize_copilot_logs,
    normalize_gemini_logs,
    normalize_opencode_logs,
    normalize_pi_logs,
    snapshot_log_dir,
)
```

Add this class after `TestNormalizeOpenCodeLogs`:

```python
class TestNormalizeCopilotLogs:
    def test_normalizes_assistant_tool_requests(self):
        patch = (
            "*** Begin Patch\n"
            "*** Update File: src/app.py\n"
            "@@\n"
            "-old\n"
            "+new\n"
            "*** End Patch\n"
        )
        raw = "\n".join(
            [
                json.dumps(
                    {
                        "type": "assistant.message",
                        "data": {
                            "toolRequests": [
                                {
                                    "toolCallId": "1",
                                    "name": "skill",
                                    "arguments": {"skill": "superpowers:brainstorming"},
                                },
                                {
                                    "toolCallId": "2",
                                    "name": "bash",
                                    "arguments": {"command": "git status"},
                                },
                                {
                                    "toolCallId": "3",
                                    "name": "apply_patch",
                                    "arguments": {"patch": patch},
                                },
                                {
                                    "toolCallId": "4",
                                    "name": "view",
                                    "arguments": {"file": "README.md"},
                                },
                                {
                                    "toolCallId": "5",
                                    "name": "edit",
                                    "arguments": {"filePath": "src/edit.py"},
                                },
                                {
                                    "toolCallId": "6",
                                    "name": "create",
                                    "arguments": {"path": "src/new.py"},
                                },
                                {
                                    "toolCallId": "7",
                                    "name": "write",
                                    "arguments": {"file_path": "src/write.py"},
                                },
                                {
                                    "toolCallId": "8",
                                    "name": "rg",
                                    "arguments": {"pattern": "Skill"},
                                },
                                {
                                    "toolCallId": "9",
                                    "name": "glob",
                                    "arguments": {"pattern": "*.py"},
                                },
                                {
                                    "toolCallId": "10",
                                    "name": "task",
                                    "arguments": {"prompt": "review"},
                                },
                                {
                                    "toolCallId": "11",
                                    "name": "read_agent",
                                    "arguments": {"agent_id": "agent-1"},
                                },
                                {
                                    "toolCallId": "12",
                                    "name": "list_agents",
                                    "arguments": {},
                                },
                                {
                                    "toolCallId": "13",
                                    "name": "write_agent",
                                    "arguments": {"agent_id": "agent-1", "message": "done"},
                                },
                                {
                                    "toolCallId": "14",
                                    "name": "update_todo",
                                    "arguments": {"todos": []},
                                },
                                {
                                    "toolCallId": "15",
                                    "name": "web_fetch",
                                    "arguments": {"url": "https://example.com"},
                                },
                                {
                                    "toolCallId": "16",
                                    "name": "web_search",
                                    "arguments": {"query": "superpowers"},
                                },
                            ]
                        },
                    }
                )
            ]
        )

        rows = normalize_copilot_logs(raw)

        assert [row["tool"] for row in rows] == [
            "Skill",
            "Bash",
            "Edit",
            "Read",
            "Edit",
            "Write",
            "Write",
            "Grep",
            "Glob",
            "Agent",
            "Agent",
            "Agent",
            "Agent",
            "TodoWrite",
            "WebFetch",
            "WebSearch",
        ]
        assert rows[0] == {
            "tool": "Skill",
            "args": {
                "skill": "superpowers:brainstorming",
                "name": "brainstorming",
                "raw_input": {"skill": "superpowers:brainstorming"},
            },
            "source": "native",
        }
        assert rows[1]["args"]["command"] == "git status"
        assert rows[1]["source"] == "shell"
        assert rows[2]["args"]["file_path"] == "src/app.py"
        assert rows[2]["args"]["file_paths"] == ["src/app.py"]
        assert rows[3]["args"]["file_path"] == "README.md"
        assert rows[4]["args"]["file_path"] == "src/edit.py"
        assert rows[5]["args"]["file_path"] == "src/new.py"
        assert rows[6]["args"]["file_path"] == "src/write.py"
        assert rows[-1]["args"]["query"] == "superpowers"
        assert rows[-1]["source"] == "native"

    def test_preserves_multiple_tool_requests_order(self):
        raw = "\n".join(
            [
                json.dumps(
                    {
                        "type": "assistant.message",
                        "data": {
                            "toolRequests": [
                                {"name": "bash", "arguments": {"command": "pwd"}},
                                {"name": "skill", "arguments": {"name": "brainstorming"}},
                            ]
                        },
                    }
                ),
                json.dumps(
                    {
                        "type": "assistant.message",
                        "data": {
                            "toolRequests": [
                                {"name": "write", "arguments": {"path": "src/app.py"}},
                            ]
                        },
                    }
                ),
            ]
        )

        rows = normalize_copilot_logs(raw)

        assert [row["tool"] for row in rows] == ["Bash", "Skill", "Write"]
        assert rows[1]["args"]["skill"] == "superpowers:brainstorming"

    def test_ignores_non_request_events_and_bad_lines(self):
        raw = "\n".join(
            [
                "not json",
                json.dumps(["array"]),
                json.dumps({"type": "tool.execution_complete", "data": {"toolName": "bash"}}),
                json.dumps({"type": "session.shutdown", "data": {"tokenDetails": {}}}),
                json.dumps({"type": "assistant.message", "data": {"toolRequests": "bad"}}),
            ]
        )

        assert normalize_copilot_logs(raw) == []

    def test_negative_fixture_keeps_early_write_before_skill(self):
        raw = "\n".join(
            [
                json.dumps(
                    {
                        "type": "assistant.message",
                        "data": {
                            "toolRequests": [
                                {"name": "write", "arguments": {"path": "src/app.py"}},
                                {"name": "skill", "arguments": {"skill": "superpowers:brainstorming"}},
                            ]
                        },
                    }
                )
            ]
        )

        rows = normalize_copilot_logs(raw)

        assert [row["tool"] for row in rows] == ["Write", "Skill"]
        assert rows[0]["args"]["file_path"] == "src/app.py"
```

- [ ] **Step 2: Add trace-tool compatibility coverage**

In `tests/quorum/test_trace_tools.py`, add `normalize_copilot_logs` to the import:

```python
from quorum.normalizers import normalize_copilot_logs, normalize_opencode_logs
```

Add this test after `test_skill_before_implementation_tool_accepts_opencode_apply_patch_rows`:

```python
def test_skill_before_implementation_tool_accepts_copilot_apply_patch_rows(tmp_path):
    parent = tmp_path / "rundir"
    parent.mkdir()
    workdir = parent / "coding-agent-workdir"
    workdir.mkdir()
    rows = normalize_copilot_logs(
        "\n".join(
            [
                json.dumps(
                    {
                        "type": "assistant.message",
                        "data": {
                            "toolRequests": [
                                {
                                    "name": "skill",
                                    "arguments": {"skill": "superpowers:brainstorming"},
                                },
                                {
                                    "name": "apply_patch",
                                    "arguments": {
                                        "patch": (
                                            "*** Begin Patch\n"
                                            "*** Update File: src/app.py\n"
                                            "@@\n"
                                            "-old\n"
                                            "+new\n"
                                            "*** End Patch\n"
                                        )
                                    },
                                },
                            ]
                        },
                    }
                )
            ]
        )
    )
    trace = _trace(parent, *rows)
    sink = tmp_path / "s"

    assert (
        _run(
            "skill-before-implementation-tool",
            "superpowers:brainstorming",
            "Edit",
            trace=trace,
            cwd=workdir,
            sink=sink,
        )
        == 0
    )
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
uv run pytest tests/quorum/test_normalizers.py::TestNormalizeCopilotLogs tests/quorum/test_trace_tools.py::test_skill_before_implementation_tool_accepts_copilot_apply_patch_rows -q
```

Expected: FAIL because `normalize_copilot_logs` is not defined.

- [ ] **Step 4: Add Copilot normalizer implementation**

In `quorum/normalizers.py`, replace `_opencode_apply_patch_paths` with a shared helper and update `_normalize_opencode_args` to use the new name:

```python
def _apply_patch_paths(patch_text: Any) -> list[str]:
    if not isinstance(patch_text, str):
        return []
    paths: list[str] = []
    prefixes = (
        "*** Add File: ",
        "*** Update File: ",
        "*** Delete File: ",
    )
    for line in patch_text.splitlines():
        for prefix in prefixes:
            if line.startswith(prefix):
                path = line[len(prefix) :].strip()
                if path:
                    paths.append(path)
                break
    return paths
```

In `_normalize_opencode_args`, replace:

```python
paths = _opencode_apply_patch_paths(patch_text)
```

with:

```python
paths = _apply_patch_paths(patch_text)
```

Then add the Copilot mapping and normalizer after `normalize_opencode_logs`:

```python
COPILOT_TOOL_MAP: dict[str, str] = {
    "skill": "Skill",
    "bash": "Bash",
    "apply_patch": "Edit",
    "edit": "Edit",
    "create": "Write",
    "write": "Write",
    "view": "Read",
    "rg": "Grep",
    "glob": "Glob",
    "task": "Agent",
    "read_agent": "Agent",
    "list_agents": "Agent",
    "write_agent": "Agent",
    "update_todo": "TodoWrite",
    "web_fetch": "WebFetch",
    "web_search": "WebSearch",
}


COPILOT_NATIVE_TOOLS = (set(COPILOT_TOOL_MAP.values()) - {"Bash"}) | {
    "TodoWrite",
    "WebFetch",
    "WebSearch",
}


def _normalize_copilot_args(name: str, raw_input: Any) -> dict[str, Any]:
    args = dict(raw_input) if isinstance(raw_input, dict) else {}
    args["raw_input"] = raw_input

    if name == "skill":
        skill_name = ""
        if isinstance(raw_input, dict):
            candidate = raw_input.get("skill") or raw_input.get("name")
            if isinstance(candidate, str):
                skill_name = candidate
        if skill_name:
            args["name"] = skill_name.split(":", 1)[-1]
            args["skill"] = skill_name if ":" in skill_name else f"superpowers:{skill_name}"

    if name == "bash" and "command" not in args:
        command = args.get("cmd")
        if isinstance(command, str):
            args["command"] = command

    if name in {"view", "edit", "create", "write"} and "file_path" not in args:
        for key in ("file_path", "filePath", "path", "file"):
            value = args.get(key)
            if isinstance(value, str):
                args["file_path"] = value
                break

    if name == "apply_patch" and "file_path" not in args:
        patch_text = args.get("patch")
        if not isinstance(patch_text, str) and isinstance(raw_input, str):
            patch_text = raw_input
        paths = _apply_patch_paths(patch_text)
        if paths:
            args["file_path"] = paths[0]
            args["file_paths"] = paths

    return args


def normalize_copilot_logs(raw_content: str) -> list[dict[str, Any]]:
    """Normalize GitHub Copilot CLI session-state events."""
    results: list[dict[str, Any]] = []
    for line in raw_content.strip().split("\n"):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(entry, dict) or entry.get("type") != "assistant.message":
            continue
        data = entry.get("data", {})
        if not isinstance(data, dict):
            continue
        tool_requests = data.get("toolRequests", [])
        if not isinstance(tool_requests, list):
            continue
        for request in tool_requests:
            if not isinstance(request, dict):
                continue
            name = request.get("name", "")
            if not isinstance(name, str) or not name:
                continue
            canonical = COPILOT_TOOL_MAP.get(name, name)
            args = _normalize_copilot_args(name, request.get("arguments", {}))
            source = "native" if canonical in COPILOT_NATIVE_TOOLS else "shell"
            results.append({"tool": canonical, "args": args, "source": source})
    return results
```

Register the normalizer:

```python
NORMALIZERS: dict[str, Callable[[str], list[dict[str, Any]]]] = {
    "antigravity": normalize_antigravity_logs,
    "claude": normalize_claude_logs,
    "codex": normalize_codex_logs,
    "copilot": normalize_copilot_logs,
    "gemini": normalize_gemini_logs,
    "opencode": normalize_opencode_logs,
    "pi": normalize_pi_logs,
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
uv run pytest tests/quorum/test_normalizers.py::TestNormalizeCopilotLogs tests/quorum/test_trace_tools.py::test_skill_before_implementation_tool_accepts_copilot_apply_patch_rows -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add quorum/normalizers.py tests/quorum/test_normalizers.py tests/quorum/test_trace_tools.py
git commit -m "quorum: normalize copilot session-state events"
```

---

## Task 3: Copilot Config And Launcher Context

**Files:**
- Create: `coding-agents/copilot.yaml`
- Create: `coding-agents/copilot-context/HOWTO.md`
- Create: `coding-agents/copilot-context/launch-agent`
- Modify: `tests/quorum/test_coding_agent_config.py`
- Modify: `tests/quorum/test_runner.py`
- Test: `uv run pytest tests/quorum/test_coding_agent_config.py::test_copilot_config_loads_when_superpowers_root_set tests/quorum/test_runner.py::test_copilot_launch_agent_is_substituted_and_uses_env_i -q`

- [ ] **Step 1: Write failing config loader test**

Add this test after `test_opencode_config_loads_when_superpowers_root_set` in `tests/quorum/test_coding_agent_config.py`:

```python
def test_copilot_config_loads_when_superpowers_root_set(monkeypatch, tmp_path):
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(tmp_path / "superpowers"))
    cfg = load_coding_agent_config(
        Path(__file__).resolve().parents[2] / "coding-agents" / "copilot.yaml"
    )

    assert cfg.name == "copilot"
    assert cfg.binary == "copilot"
    assert cfg.agent_config_env == "COPILOT_HOME"
    assert cfg.session_log_glob == "**/events.jsonl"
    assert cfg.normalizer == "copilot"
    assert cfg.resolve_session_log_dir(tmp_path / "cfg") == (
        tmp_path / "cfg" / "session-state"
    )
```

- [ ] **Step 2: Run config test and verify failure**

Run:

```bash
uv run pytest tests/quorum/test_coding_agent_config.py::test_copilot_config_loads_when_superpowers_root_set -q
```

Expected: FAIL because `coding-agents/copilot.yaml` does not exist.

- [ ] **Step 3: Create `coding-agents/copilot.yaml`**

Create:

```yaml
name: copilot
binary: copilot
agent_config_env: COPILOT_HOME
session_log_dir: "${COPILOT_HOME}/session-state"
session_log_glob: "**/events.jsonl"
normalizer: copilot
required_env:
  - SUPERPOWERS_ROOT
max_time: 10m
max_concurrency: 1
```

- [ ] **Step 4: Create Copilot HOWTO**

Create `coding-agents/copilot-context/HOWTO.md`:

````markdown
# How to drive GitHub Copilot CLI (the agent under test)

You are driving GitHub Copilot CLI in a bash shell inside tmux. Copilot is
itself an AI agent; what appears on screen is its work.

## Launch Copilot with one command

Your bash starts in a scratch directory, NOT the workdir quorum prepared.
quorum has generated a launcher that handles everything: it cds into the
prepared workdir, sources the private Copilot auth env file, sets an isolated
Copilot home, points Copilot at the staged Superpowers plugin, sets a run-local
session id, and starts Copilot with permissive eval flags. Type this one line,
verbatim, as your first action:

```
"$QUORUM_LAUNCH_AGENT"
```

That path is burned into this HOWTO at runtime by quorum; it points at a
generated executable that runs, in effect:

```
cd <prepared-workdir> && source <run>/coding-agent-config/.copilot-env && env -i HOME=<run>/coding-agent-config COPILOT_HOME=<run>/coding-agent-config COPILOT_CLI=1 copilot --plugin-dir <run>/coding-agent-config/plugins/superpowers --session-id <run-session-id> --allow-all --no-auto-update --no-remote --disable-builtin-mcps --log-dir <run>/coding-agent-config/logs
```

Because the cd, private env file, isolated environment, plugin path, and
session id live inside the launcher, do not hand-type a bare `copilot` or
reconstruct the command yourself. Just run the one line above.

## Observing what Copilot is doing

Copilot writes runtime state under the isolated home:

```
$COPILOT_HOME/session-state/$QUORUM_COPILOT_SESSION_ID/events.jsonl
$COPILOT_HOME/logs/
```

Those session-state events are the ground truth for tool calls and are what
quorum normalizes into `coding-agent-tool-calls.jsonl`.

## Waiting for Copilot to work

When Copilot is busy, wait for it to finish rather than repeatedly polling the
screen. If you need to inspect local logs, use the isolated log directory:

```
find "$COPILOT_HOME/logs" -maxdepth 2 -type f -print 2>/dev/null
```

## Shutdown

Exit the Copilot session cleanly when the scenario objective is complete.
````

- [ ] **Step 5: Create Copilot launcher template**

Create `coding-agents/copilot-context/launch-agent`:

```bash
#!/usr/bin/env bash
# quorum-generated launcher for GitHub Copilot CLI (the agent under test).
#
# The cd, private env file, isolated HOME/COPILOT_HOME, staged plugin root,
# session id, and eval flags are baked in here so the QA agent launches Copilot
# from the prepared workdir with one command. quorum substitutes the $... values
# below at runtime; the installed copy contains literal absolute paths.
set -euo pipefail
cd "$QUORUM_AGENT_CWD" || { echo "launch-agent: cannot cd to $QUORUM_AGENT_CWD" >&2; exit 1; }

set -a
. "$COPILOT_ENV_FILE"
set +a

env_args=(
  "PATH=${PATH:-/usr/bin:/bin:/usr/sbin:/sbin}"
  "TERM=${TERM:-xterm-256color}"
  "LANG=${LANG:-C.UTF-8}"
)
for name in \
  COPILOT_GITHUB_TOKEN GH_TOKEN GITHUB_TOKEN \
  GH_HOST COPILOT_GH_HOST \
  HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY \
  http_proxy https_proxy all_proxy no_proxy \
  SSL_CERT_FILE SSL_CERT_DIR NODE_EXTRA_CA_CERTS REQUESTS_CA_BUNDLE CURL_CA_BUNDLE \
  COPILOT_MODEL COPILOT_OFFLINE \
  COPILOT_PROVIDER_BASE_URL COPILOT_PROVIDER_TYPE \
  COPILOT_PROVIDER_API_KEY COPILOT_PROVIDER_BEARER_TOKEN \
  COPILOT_PROVIDER_WIRE_API COPILOT_PROVIDER_AZURE_API_VERSION \
  COPILOT_PROVIDER_MODEL_ID COPILOT_PROVIDER_WIRE_MODEL \
  COPILOT_PROVIDER_MAX_PROMPT_TOKENS COPILOT_PROVIDER_MAX_OUTPUT_TOKENS; do
  if [[ -n "${!name-}" ]]; then
    env_args+=("$name=${!name}")
  fi
done

secret_env_vars=(
  COPILOT_GITHUB_TOKEN GH_TOKEN GITHUB_TOKEN
  COPILOT_PROVIDER_API_KEY COPILOT_PROVIDER_BEARER_TOKEN
)

exec env -i \
  "${env_args[@]}" \
  HOME="$COPILOT_HOME" \
  COPILOT_HOME="$COPILOT_HOME" \
  COPILOT_CACHE_HOME="$COPILOT_HOME/.cache" \
  COPILOT_CLI=1 \
  COPILOT_AUTO_UPDATE=false \
  copilot \
    --plugin-dir "$COPILOT_HOME/plugins/superpowers" \
    --session-id "$QUORUM_COPILOT_SESSION_ID" \
    --allow-all \
    --no-auto-update \
    --no-remote \
    --disable-builtin-mcps \
    --secret-env-vars="$(IFS=,; echo "${secret_env_vars[*]}")" \
    --log-dir "$COPILOT_HOME/logs" \
    "$@"
```

Make it executable:

```bash
chmod +x coding-agents/copilot-context/launch-agent
```

- [ ] **Step 6: Write failing launcher execution test**

Add this helper to `tests/quorum/test_runner.py` near `_exec`:

```python
def _fake_copilot_bin(bin_dir: Path, output_path: Path) -> None:
    _exec(
        bin_dir / "copilot",
        (
            "#!/usr/bin/env bash\n"
            f"out={json.dumps(str(output_path))}\n"
            "python3 - <<'PY' \"$out\" \"$@\"\n"
            "import json, os, sys\n"
            "out = sys.argv[1]\n"
            "payload = {\n"
            "  'cwd': os.getcwd(),\n"
            "  'env': {k: os.environ.get(k) for k in [\n"
            "    'HOME', 'COPILOT_HOME', 'COPILOT_CACHE_HOME', 'COPILOT_CLI',\n"
            "    'COPILOT_AUTO_UPDATE', 'COPILOT_GITHUB_TOKEN', 'LEAK_ME'\n"
            "  ]},\n"
            "  'argv': sys.argv[2:],\n"
            "}\n"
            "open(out, 'w').write(json.dumps(payload, sort_keys=True))\n"
            "PY\n"
        ),
    )
```

Add this test:

```python
def test_copilot_launch_agent_is_substituted_and_uses_env_i(tmp_path, monkeypatch):
    coding_agents_dir = tmp_path / "coding-agents"
    run_dir = tmp_path / "run"
    launch_cwd = tmp_path / "workdir with spaces"
    copilot_home = run_dir / "coding-agent-config"
    env_file = copilot_home / ".copilot-env"
    session_id = "00000000-0000-4000-8000-000000000001"
    bin_dir = tmp_path / "bin"
    observed = tmp_path / "observed.json"
    launch_cwd.mkdir(parents=True)
    env_file.parent.mkdir(parents=True)
    bin_dir.mkdir()
    _fake_copilot_bin(bin_dir, observed)
    env_file.write_text("COPILOT_GITHUB_TOKEN='token with spaces'\nLEAK_ME='from-env-file'\n")
    env_file.chmod(0o600)
    (coding_agents_dir / "copilot-context").mkdir(parents=True)
    shutil.copy2(
        Path(__file__).resolve().parents[2] / "coding-agents" / "copilot-context" / "launch-agent",
        coding_agents_dir / "copilot-context" / "launch-agent",
    )

    _populate_context_dir(
        coding_agents_dir,
        "copilot",
        run_dir,
        substitutions={
            "$QUORUM_AGENT_CWD": str(launch_cwd),
            "$QUORUM_LAUNCH_AGENT": str(run_dir / "gauntlet-agent" / "context" / "launch-agent"),
            "$COPILOT_HOME": str(copilot_home),
            "$COPILOT_ENV_FILE": str(env_file),
            "$QUORUM_COPILOT_SESSION_ID": session_id,
        },
    )

    result = subprocess.run(
        [str(run_dir / "gauntlet-agent" / "context" / "launch-agent"), "--extra"],
        cwd=tmp_path,
        env={
            "PATH": f"{bin_dir}:/usr/bin:/bin",
            "TERM": "xterm-256color",
            "LANG": "C.UTF-8",
            "LEAK_ME": "from-host",
        },
        text=True,
        capture_output=True,
    )

    assert result.returncode == 0, result.stderr
    payload = json.loads(observed.read_text())
    assert payload["cwd"] == str(launch_cwd)
    assert payload["env"]["HOME"] == str(copilot_home)
    assert payload["env"]["COPILOT_HOME"] == str(copilot_home)
    assert payload["env"]["COPILOT_CACHE_HOME"] == str(copilot_home / ".cache")
    assert payload["env"]["COPILOT_CLI"] == "1"
    assert payload["env"]["COPILOT_AUTO_UPDATE"] == "false"
    assert payload["env"]["COPILOT_GITHUB_TOKEN"] == "token with spaces"
    assert payload["env"]["LEAK_ME"] is None
    assert payload["argv"] == [
        "--plugin-dir",
        str(copilot_home / "plugins" / "superpowers"),
        "--session-id",
        session_id,
        "--allow-all",
        "--no-auto-update",
        "--no-remote",
        "--disable-builtin-mcps",
        "--secret-env-vars=COPILOT_GITHUB_TOKEN,GH_TOKEN,GITHUB_TOKEN,COPILOT_PROVIDER_API_KEY,COPILOT_PROVIDER_BEARER_TOKEN",
        "--log-dir",
        str(copilot_home / "logs"),
        "--extra",
    ]
```

- [ ] **Step 7: Run tests to verify pass**

Run:

```bash
uv run pytest tests/quorum/test_coding_agent_config.py::test_copilot_config_loads_when_superpowers_root_set tests/quorum/test_runner.py::test_copilot_launch_agent_is_substituted_and_uses_env_i -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add coding-agents/copilot.yaml coding-agents/copilot-context tests/quorum/test_coding_agent_config.py tests/quorum/test_runner.py
git commit -m "quorum: add copilot coding-agent config"
```

---

## Task 4: Copilot Runner Provisioning And Auth Containment

**Files:**
- Modify: `quorum/runner.py`
- Modify: `tests/quorum/test_runner.py`
- Test: `uv run pytest tests/quorum/test_runner.py -k 'copilot and (seed or auth or env_file or plugin_list or gauntlet_env or leak)' -q`

- [ ] **Step 1: Add Copilot root fixture helper to tests**

Add this helper near `_make_superpowers_opencode_root` in `tests/quorum/test_runner.py`:

```python
def _make_superpowers_copilot_root(tmp_path: Path) -> Path:
    root = tmp_path / "superpowers"
    (root / ".claude-plugin").mkdir(parents=True)
    (root / ".claude-plugin" / "plugin.json").write_text('{"name":"superpowers"}')
    (root / "hooks").mkdir()
    (root / "hooks" / "hooks.json").write_text("{}")
    (root / "hooks" / "run-hook.cmd").write_text("@echo off\n")
    (root / "hooks" / "session-start").write_text("#!/usr/bin/env bash\n")
    (root / "skills" / "using-superpowers" / "references").mkdir(parents=True)
    (root / "skills" / "using-superpowers" / "SKILL.md").write_text("# using")
    (
        root / "skills" / "using-superpowers" / "references" / "copilot-tools.md"
    ).write_text("# tools")
    (root / "skills" / "brainstorming").mkdir(parents=True)
    (root / "skills" / "brainstorming" / "SKILL.md").write_text("# brainstorming")
    return root
```

Add this target config helper near `_opencode_tcfg`:

```python
def _copilot_tcfg() -> CodingAgentConfig:
    return CodingAgentConfig(
        name="copilot",
        binary="copilot",
        agent_config_env="COPILOT_HOME",
        session_log_dir="${COPILOT_HOME}/session-state",
        session_log_glob="**/events.jsonl",
        normalizer="copilot",
        required_env=("SUPERPOWERS_ROOT",),
        max_time="10m",
        project_prompt=None,
    )
```

- [ ] **Step 2: Write failing auth and env-file tests**

Import the new helpers at the top of `tests/quorum/test_runner.py`:

```python
from quorum.runner import (
    ANTIGRAVITY_RATE_LIMIT_MARKER,
    COPILOT_ENV_FILE_NAME,
    CopilotProvisioning,
    RunnerError,
    _copilot_gauntlet_env,
    _resolve_copilot_auth_env,
    _scan_copilot_secret_leaks,
    _seed_copilot_config,
    _write_copilot_env_file,
    ...
)
```

Add tests:

```python
def test_resolve_copilot_auth_env_prefers_explicit_token(monkeypatch):
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "copilot-token")
    monkeypatch.setenv("GH_TOKEN", "gh-token")
    values, secret_names, secret_values = _resolve_copilot_auth_env()

    assert values["COPILOT_GITHUB_TOKEN"] == "copilot-token"
    assert "GH_TOKEN" not in values
    assert secret_names == ("COPILOT_GITHUB_TOKEN",)
    assert secret_values == ("copilot-token",)


def test_resolve_copilot_auth_env_falls_back_to_gh_token(monkeypatch):
    monkeypatch.delenv("COPILOT_GITHUB_TOKEN", raising=False)
    monkeypatch.delenv("GH_TOKEN", raising=False)
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/gh" if name == "gh" else None)

    def fake_run(cmd, **kwargs):
        assert cmd == ["gh", "auth", "token"]
        return subprocess.CompletedProcess(cmd, 0, stdout="from-gh\n", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)

    values, secret_names, secret_values = _resolve_copilot_auth_env()

    assert values["COPILOT_GITHUB_TOKEN"] == "from-gh"
    assert secret_names == ("COPILOT_GITHUB_TOKEN",)
    assert secret_values == ("from-gh",)


def test_resolve_copilot_auth_env_accepts_provider_without_github(monkeypatch):
    for name in ("COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("COPILOT_PROVIDER_BASE_URL", "http://127.0.0.1:4141")
    monkeypatch.setenv("COPILOT_PROVIDER_API_KEY", "provider-secret")

    values, secret_names, secret_values = _resolve_copilot_auth_env()

    assert values["COPILOT_PROVIDER_BASE_URL"] == "http://127.0.0.1:4141"
    assert values["COPILOT_PROVIDER_API_KEY"] == "provider-secret"
    assert secret_names == ("COPILOT_PROVIDER_API_KEY",)
    assert secret_values == ("provider-secret",)


def test_resolve_copilot_auth_env_requires_provider_base_url_for_offline(monkeypatch):
    monkeypatch.setenv("COPILOT_OFFLINE", "true")
    monkeypatch.delenv("COPILOT_PROVIDER_BASE_URL", raising=False)
    for name in ("COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"):
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(RunnerError, match="COPILOT_OFFLINE=true requires COPILOT_PROVIDER_BASE_URL"):
        _resolve_copilot_auth_env()


def test_write_copilot_env_file_is_private_and_shell_quotes(tmp_path):
    env_file = _write_copilot_env_file(
        tmp_path,
        {
            "COPILOT_GITHUB_TOKEN": "tok'en with spaces",
            "COPILOT_PROVIDER_BASE_URL": "http://127.0.0.1:4141",
        },
    )

    mode = stat.S_IMODE(env_file.stat().st_mode)
    assert mode == 0o600
    assert env_file.name == COPILOT_ENV_FILE_NAME
    content = env_file.read_text()
    assert "COPILOT_GITHUB_TOKEN='tok'\"'\"'en with spaces'" in content
    assert "COPILOT_PROVIDER_BASE_URL='http://127.0.0.1:4141'" in content
```

- [ ] **Step 3: Write failing staging and contract validation tests**

Add tests:

```python
def test_seed_copilot_config_stages_plugin_and_private_env(tmp_path, monkeypatch):
    root = _make_superpowers_copilot_root(tmp_path)
    home = tmp_path / "home"
    session_id = "00000000-0000-4000-8000-000000000002"
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(root))
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "token-value")
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/copilot" if name == "copilot" else None)

    def fake_run(cmd, **kwargs):
        assert cmd[:3] == ["copilot", "--plugin-dir", str(home / "plugins" / "superpowers")]
        assert cmd[3:] == ["plugin", "list"]
        return subprocess.CompletedProcess(cmd, 0, stdout="superpowers\n", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)

    provisioning = _seed_copilot_config(home, tmp_path / "workdir", session_id)

    plugin_root = home / "plugins" / "superpowers"
    assert (plugin_root / ".claude-plugin" / "plugin.json").is_file()
    assert (plugin_root / "hooks" / "hooks.json").is_file()
    assert (plugin_root / "hooks" / "run-hook.cmd").is_file()
    assert (plugin_root / "hooks" / "session-start").is_file()
    assert (plugin_root / "skills" / "using-superpowers" / "SKILL.md").is_file()
    assert (plugin_root / "skills" / "brainstorming" / "SKILL.md").is_file()
    assert (
        plugin_root / "skills" / "using-superpowers" / "references" / "copilot-tools.md"
    ).is_file()
    assert (home / ".cache").is_dir()
    assert (home / "logs").is_dir()
    assert (home / "session-state").is_dir()
    assert provisioning.session_id == session_id
    assert provisioning.env_file == home / COPILOT_ENV_FILE_NAME
    assert provisioning.secret_values == ("token-value",)
    assert stat.S_IMODE(provisioning.env_file.stat().st_mode) == 0o600


def test_seed_copilot_config_rejects_missing_required_plugin_file(tmp_path, monkeypatch):
    root = _make_superpowers_copilot_root(tmp_path)
    (root / "skills" / "using-superpowers" / "references" / "copilot-tools.md").unlink()
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(root))
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "token-value")
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/copilot" if name == "copilot" else None)

    with pytest.raises(RunnerError, match="copilot-tools.md"):
        _seed_copilot_config(tmp_path / "home", tmp_path / "workdir", "session")


def test_seed_copilot_config_rejects_skill_symlink(tmp_path, monkeypatch):
    root = _make_superpowers_copilot_root(tmp_path)
    (root / "skills" / "linked").symlink_to(root / "skills" / "brainstorming")
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(root))
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "token-value")
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/copilot" if name == "copilot" else None)

    with pytest.raises(RunnerError, match="unsupported symlink"):
        _seed_copilot_config(tmp_path / "home", tmp_path / "workdir", "session")


def test_seed_copilot_config_rejects_plugin_list_without_superpowers(tmp_path, monkeypatch):
    root = _make_superpowers_copilot_root(tmp_path)
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(root))
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "token-value")
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/copilot" if name == "copilot" else None)

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(cmd, 0, stdout="other-plugin\n", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(RunnerError, match="plugin list did not show Superpowers"):
        _seed_copilot_config(tmp_path / "home", tmp_path / "workdir", "session")


def test_seed_copilot_config_rejects_stale_session_state(tmp_path, monkeypatch):
    root = _make_superpowers_copilot_root(tmp_path)
    home = tmp_path / "home"
    stale = home / "session-state" / "session" / "events.jsonl"
    stale.parent.mkdir(parents=True)
    stale.write_text("{}\n")
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(root))
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "token-value")
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/copilot" if name == "copilot" else None)

    with pytest.raises(RunnerError, match="pre-existing Copilot session-state"):
        _seed_copilot_config(home, tmp_path / "workdir", "session")
```

- [ ] **Step 4: Write failing Gauntlet env and leak-scan tests**

Add tests:

```python
def test_copilot_gauntlet_env_excludes_auth_secrets(monkeypatch):
    host_env = {
        "PATH": "/bin",
        "TERM": "xterm-256color",
        "LANG": "C.UTF-8",
        "COPILOT_GITHUB_TOKEN": "token",
        "GH_TOKEN": "gh-token",
        "GITHUB_TOKEN": "github-token",
        "COPILOT_PROVIDER_API_KEY": "provider-key",
        "COPILOT_PROVIDER_BEARER_TOKEN": "provider-bearer",
        "OTEL_EXPORTER_OTLP_HEADERS": "otel-secret",
        "UNRELATED": "drop-me",
    }

    env = _copilot_gauntlet_env(host_env)

    assert env == {"PATH": "/bin", "TERM": "xterm-256color", "LANG": "C.UTF-8"}


def test_scan_copilot_secret_leaks_ignores_env_file_but_reports_other_artifacts(tmp_path):
    run_dir = tmp_path / "run"
    env_file = run_dir / "coding-agent-config" / COPILOT_ENV_FILE_NAME
    leak = run_dir / "gauntlet-agent" / "log.txt"
    env_file.parent.mkdir(parents=True)
    leak.parent.mkdir(parents=True)
    env_file.write_text("COPILOT_GITHUB_TOKEN='secret-token'\n")
    leak.write_text("qa shell saw secret-token\n")

    leaks = _scan_copilot_secret_leaks(
        run_dir,
        secret_values=("secret-token",),
        excluded_paths=(env_file,),
    )

    assert leaks == (leak,)


def test_scan_copilot_secret_leaks_returns_empty_when_only_env_file_contains_secret(tmp_path):
    run_dir = tmp_path / "run"
    env_file = run_dir / "coding-agent-config" / COPILOT_ENV_FILE_NAME
    env_file.parent.mkdir(parents=True)
    env_file.write_text("COPILOT_GITHUB_TOKEN='secret-token'\n")

    leaks = _scan_copilot_secret_leaks(
        run_dir,
        secret_values=("secret-token",),
        excluded_paths=(env_file,),
    )

    assert leaks == ()
```

- [ ] **Step 5: Implement Copilot provisioning types and constants**

In `quorum/runner.py`, add imports:

```python
from collections.abc import Mapping
import uuid
```

Add constants near the existing Gemini and OpenCode constants:

```python
COPILOT_ENV_FILE_NAME = ".copilot-env"
COPILOT_REQUIRED_SUPERPOWERS_FILES = (
    ".claude-plugin/plugin.json",
    "hooks/hooks.json",
    "hooks/run-hook.cmd",
    "hooks/session-start",
    "skills/using-superpowers/SKILL.md",
    "skills/brainstorming/SKILL.md",
    "skills/using-superpowers/references/copilot-tools.md",
)
COPILOT_PROVIDER_ENV_NAMES = (
    "COPILOT_PROVIDER_BASE_URL",
    "COPILOT_PROVIDER_TYPE",
    "COPILOT_PROVIDER_API_KEY",
    "COPILOT_PROVIDER_BEARER_TOKEN",
    "COPILOT_PROVIDER_WIRE_API",
    "COPILOT_PROVIDER_AZURE_API_VERSION",
    "COPILOT_PROVIDER_MODEL_ID",
    "COPILOT_PROVIDER_WIRE_MODEL",
    "COPILOT_PROVIDER_MAX_PROMPT_TOKENS",
    "COPILOT_PROVIDER_MAX_OUTPUT_TOKENS",
    "COPILOT_OFFLINE",
    "COPILOT_MODEL",
)
COPILOT_SECRET_ENV_NAMES = (
    "COPILOT_GITHUB_TOKEN",
    "COPILOT_PROVIDER_API_KEY",
    "COPILOT_PROVIDER_BEARER_TOKEN",
)
COPILOT_GAUNTLET_ENV_ALLOWLIST = ("PATH", "TERM", "LANG")
```

Add a provisioning dataclass near the other small runner data containers:

```python
@dataclasses.dataclass(frozen=True)
class CopilotProvisioning:
    session_id: str
    env_file: Path
    secret_names: tuple[str, ...]
    secret_values: tuple[str, ...]
```

- [ ] **Step 6: Implement Copilot auth and env-file helpers**

Add these helpers near `_write_gemini_env_file`:

```python
def _copilot_offline_requested(env: Mapping[str, str]) -> bool:
    return env.get("COPILOT_OFFLINE", "").strip().lower() in {"1", "true", "yes"}


def _gh_auth_token() -> str | None:
    if shutil.which("gh") is None:
        return None
    result = subprocess.run(
        ["gh", "auth", "token"],
        text=True,
        capture_output=True,
        timeout=10,
    )
    if result.returncode != 0:
        return None
    token = result.stdout.strip()
    return token or None


def _resolve_copilot_auth_env(
    env: Mapping[str, str] | None = None,
) -> tuple[dict[str, str], tuple[str, ...], tuple[str, ...]]:
    host_env = env or os.environ
    provider_values = {
        name: host_env[name]
        for name in COPILOT_PROVIDER_ENV_NAMES
        if host_env.get(name)
    }
    if _copilot_offline_requested(host_env) and not host_env.get("COPILOT_PROVIDER_BASE_URL"):
        raise RunnerError(
            "COPILOT_OFFLINE=true requires COPILOT_PROVIDER_BASE_URL",
            stage="setup",
        )
    if host_env.get("COPILOT_PROVIDER_BASE_URL"):
        secret_names = tuple(
            name
            for name in ("COPILOT_PROVIDER_API_KEY", "COPILOT_PROVIDER_BEARER_TOKEN")
            if provider_values.get(name)
        )
        secret_values = tuple(provider_values[name] for name in secret_names)
        return provider_values, secret_names, secret_values

    token_name = ""
    token_value = ""
    for name in ("COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"):
        value = host_env.get(name, "")
        if value:
            token_name = "COPILOT_GITHUB_TOKEN"
            token_value = value
            break
    if not token_value:
        token_value = _gh_auth_token() or ""
        if token_value:
            token_name = "COPILOT_GITHUB_TOKEN"
    if not token_value:
        raise RunnerError(
            "no Copilot auth found; set COPILOT_GITHUB_TOKEN, GH_TOKEN, GITHUB_TOKEN, "
            "or COPILOT_PROVIDER_BASE_URL",
            stage="setup",
        )
    return {"COPILOT_GITHUB_TOKEN": token_value}, (token_name,), (token_value,)


def _write_copilot_env_file(copilot_home: Path, values: Mapping[str, str]) -> Path:
    env_file = copilot_home / COPILOT_ENV_FILE_NAME
    env_file.parent.mkdir(parents=True, exist_ok=True)
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(env_file, flags, 0o600)
    with os.fdopen(fd, "w") as f:
        for key in sorted(values):
            f.write(f"{key}={_shell_single_quote(values[key])}\n")
        f.flush()
        os.fchmod(f.fileno(), 0o600)
    return env_file
```

- [ ] **Step 7: Implement Superpowers staging and plugin-list validation**

Add these helpers near `_seed_opencode_config`:

```python
def _require_copilot_superpowers_root(superpowers_root: str) -> Path:
    if not superpowers_root:
        raise RunnerError(
            "SUPERPOWERS_ROOT not set; cannot install Copilot Superpowers plugin",
            stage="setup",
        )
    root = Path(superpowers_root).expanduser()
    missing = [rel for rel in COPILOT_REQUIRED_SUPERPOWERS_FILES if not (root / rel).exists()]
    if missing:
        raise RunnerError(
            "SUPERPOWERS_ROOT is missing required Copilot Superpowers files: "
            + ", ".join(missing),
            stage="setup",
        )
    return root


def _require_copilot_path_under_home(path: Path, copilot_home: Path) -> None:
    if not path.resolve().is_relative_to(copilot_home.resolve()):
        raise RunnerError(
            f"staged Copilot Superpowers path escapes isolated home: {path}",
            stage="setup",
        )


def _stage_copilot_superpowers_plugin(sp_root: Path, copilot_home: Path) -> Path:
    _reject_symlinks(sp_root / "skills", label="SUPERPOWERS_ROOT skills")
    plugin_root = copilot_home / "plugins" / "superpowers"
    if plugin_root.exists() or plugin_root.is_symlink():
        if plugin_root.is_dir() and not plugin_root.is_symlink():
            shutil.rmtree(plugin_root)
        else:
            plugin_root.unlink()
    (plugin_root / "hooks").mkdir(parents=True)
    shutil.copytree(sp_root / ".claude-plugin", plugin_root / ".claude-plugin")
    shutil.copy2(sp_root / "hooks" / "hooks.json", plugin_root / "hooks" / "hooks.json")
    shutil.copy2(sp_root / "hooks" / "run-hook.cmd", plugin_root / "hooks" / "run-hook.cmd")
    shutil.copy2(sp_root / "hooks" / "session-start", plugin_root / "hooks" / "session-start")
    shutil.copytree(sp_root / "skills", plugin_root / "skills")
    _require_copilot_path_under_home(plugin_root, copilot_home)
    for path in plugin_root.rglob("*"):
        _require_copilot_path_under_home(path, copilot_home)
    return plugin_root


def _copilot_plugin_list_shows_superpowers(stdout: str, plugin_root: Path) -> bool:
    text = stdout.lower()
    return "superpowers" in text or str(plugin_root).lower() in text


def _validate_copilot_plugin_contract(
    copilot_home: Path,
    plugin_root: Path,
    env_values: Mapping[str, str],
) -> None:
    result = subprocess.run(
        ["copilot", "--plugin-dir", str(plugin_root), "plugin", "list"],
        cwd=copilot_home,
        text=True,
        capture_output=True,
        env={
            "PATH": os.environ.get("PATH", "/usr/bin:/bin:/usr/sbin:/sbin"),
            "HOME": str(copilot_home),
            "COPILOT_HOME": str(copilot_home),
            "COPILOT_CLI": "1",
            **env_values,
        },
    )
    if result.returncode != 0:
        raise RunnerError(
            "copilot plugin list failed "
            f"(exit {result.returncode}); stderr: {result.stderr.strip()[:300]}",
            stage="setup",
        )
    if not _copilot_plugin_list_shows_superpowers(result.stdout, plugin_root):
        raise RunnerError(
            "copilot plugin list did not show Superpowers plugin from staged root",
            stage="setup",
        )
```

- [ ] **Step 8: Implement `_seed_copilot_config`**

Add:

```python
def _seed_copilot_config(copilot_home: Path, workdir: Path, session_id: str) -> CopilotProvisioning:
    """Stage Superpowers and prepare isolated Copilot CLI state."""
    del workdir
    sp_root = _require_copilot_superpowers_root(os.environ.get("SUPERPOWERS_ROOT", ""))
    if shutil.which("copilot") is None:
        raise RunnerError("copilot not found on PATH; cannot run Copilot evals", stage="setup")

    env_values, secret_names, secret_values = _resolve_copilot_auth_env()
    env_file = _write_copilot_env_file(copilot_home, env_values)
    for path in (
        copilot_home / ".quorum",
        copilot_home / ".cache",
        copilot_home / "logs",
        copilot_home / "plugins",
        copilot_home / "session-state",
    ):
        path.mkdir(parents=True, exist_ok=True)

    expected_events = copilot_home / "session-state" / session_id / "events.jsonl"
    if expected_events.exists():
        raise RunnerError(
            f"pre-existing Copilot session-state before capture snapshot: {expected_events}",
            stage="setup",
        )

    plugin_root = _stage_copilot_superpowers_plugin(sp_root, copilot_home)
    _validate_copilot_plugin_contract(copilot_home, plugin_root, env_values)
    return CopilotProvisioning(
        session_id=session_id,
        env_file=env_file,
        secret_names=secret_names,
        secret_values=secret_values,
    )
```

- [ ] **Step 9: Implement Gauntlet env and leak scan helpers**

Add:

```python
def _copilot_gauntlet_env(host_env: Mapping[str, str]) -> dict[str, str]:
    return {
        name: host_env[name]
        for name in COPILOT_GAUNTLET_ENV_ALLOWLIST
        if host_env.get(name)
    }


def _scan_copilot_secret_leaks(
    run_dir: Path,
    *,
    secret_values: tuple[str, ...],
    excluded_paths: tuple[Path, ...],
) -> tuple[Path, ...]:
    needles = tuple(value.encode() for value in secret_values if value)
    if not needles:
        return ()
    excluded = {path.resolve() for path in excluded_paths}
    leaks: list[Path] = []
    for path in sorted(run_dir.rglob("*")):
        if not path.is_file():
            continue
        with contextlib.suppress(OSError):
            if path.resolve() in excluded:
                continue
            data = path.read_bytes()
            if any(needle in data for needle in needles):
                leaks.append(path)
    return tuple(leaks)
```

- [ ] **Step 10: Run provisioning tests**

Run:

```bash
uv run pytest tests/quorum/test_runner.py -k 'copilot and (seed or auth or env_file or plugin_list or gauntlet_env or leak)' -q
```

Expected: PASS.

- [ ] **Step 11: Commit**

Run:

```bash
git add quorum/runner.py tests/quorum/test_runner.py
git commit -m "quorum: provision isolated copilot runs"
```

---

## Task 5: Copilot Runner Integration, Capture Diagnostics, And Secret Failure

**Files:**
- Modify: `quorum/runner.py`
- Modify: `tests/quorum/test_runner.py`
- Modify: `tests/quorum/test_capture.py`
- Test: `uv run pytest tests/quorum/test_runner.py -k 'copilot and (context or gauntlet or transcript or session_state or secret)' tests/quorum/test_capture.py::TestCaptureToolCalls::test_copilot_recursive_events_capture -q`

- [ ] **Step 1: Write failing capture test**

In `tests/quorum/test_capture.py`, add this test to `TestCaptureToolCalls`:

```python
def test_copilot_recursive_events_capture(self, tmp_path):
    log_dir = tmp_path / "session-state"
    session_dir = log_dir / "00000000-0000-4000-8000-000000000003"
    session_dir.mkdir(parents=True)
    snap = snapshot_dir(log_dir, "**/events.jsonl")
    events = session_dir / "events.jsonl"
    events.write_text(
        json.dumps(
            {
                "type": "assistant.message",
                "data": {
                    "toolRequests": [
                        {"name": "skill", "arguments": {"skill": "superpowers:brainstorming"}}
                    ]
                },
            }
        )
        + "\n"
    )
    run_dir = tmp_path / "run"
    run_dir.mkdir()

    result = capture_tool_calls(
        log_dir=log_dir,
        log_glob="**/events.jsonl",
        snapshot=snap,
        normalizer="copilot",
        run_dir=run_dir,
    )

    rows = [json.loads(line) for line in result.path.read_text().splitlines()]
    assert result.source_logs == (events,)
    assert result.row_count == 1
    assert rows[0]["tool"] == "Skill"
    assert rows[0]["args"]["skill"] == "superpowers:brainstorming"
```

- [ ] **Step 2: Write failing context substitution and Gauntlet env tests**

Add tests to `tests/quorum/test_runner.py`:

```python
def test_copilot_context_gets_runtime_substitutions(tmp_path, monkeypatch):
    root = _make_superpowers_copilot_root(tmp_path)
    coding_agents_dir = tmp_path / "coding-agents"
    scenarios_dir = tmp_path / "scenarios"
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(root))
    monkeypatch.setenv("COPILOT_GITHUB_TOKEN", "token")
    _make_copilot_agent(coding_agents_dir)
    (coding_agents_dir / "copilot-context").mkdir(parents=True, exist_ok=True)
    (coding_agents_dir / "copilot-context" / "HOWTO.md").write_text(
        "$COPILOT_HOME\n$COPILOT_ENV_FILE\n$QUORUM_COPILOT_SESSION_ID\n$QUORUM_LAUNCH_AGENT\n"
    )
    sd = _make_scenario(scenarios_dir, "x", with_checks=False)
    (sd / "checks.sh").write_text("pre() { :; }\npost() { :; }\n")

    with (
        patch("quorum.runner._seed_copilot_config") as seed,
        patch("quorum.runner.invoke_gauntlet", side_effect=_stub_gauntlet_pass),
    ):
        seed.return_value = CopilotProvisioning(
            session_id="session-123",
            env_file=tmp_path / "env-file",
            secret_names=("COPILOT_GITHUB_TOKEN",),
            secret_values=("token",),
        )
        run_dir, _ = run_scenario(
            scenario_dir=sd,
            coding_agent="copilot",
            coding_agents_dir=coding_agents_dir,
            out_root=tmp_path / "out",
            skeleton_root=_empty_skeleton(tmp_path),
        )

    howto = (run_dir / "gauntlet-agent" / "context" / "HOWTO.md").read_text()
    assert "$COPILOT_HOME" not in howto
    assert "$COPILOT_ENV_FILE" not in howto
    assert "$QUORUM_COPILOT_SESSION_ID" not in howto
    assert str(run_dir / "coding-agent-config") in howto
    assert "session-123" in howto


def test_invoke_gauntlet_accepts_sanitized_env_base(tmp_path, monkeypatch):
    captured = {}

    def fake_run(cmd, env, check):
        captured["env"] = env
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(subprocess, "run", fake_run)
    invoke_gauntlet(
        story_path=tmp_path / "story.md",
        target_binary="copilot",
        launch_cwd=tmp_path / "workdir",
        run_dir=tmp_path / "run",
        max_time="10m",
        extra_env={"COPILOT_HOME": str(tmp_path / "home")},
        env_base={"PATH": "/bin", "TERM": "xterm-256color", "LANG": "C.UTF-8"},
    )

    assert captured["env"] == {
        "PATH": "/bin",
        "TERM": "xterm-256color",
        "LANG": "C.UTF-8",
        "QUORUM_AGENT_CWD": str(tmp_path / "workdir"),
        "COPILOT_HOME": str(tmp_path / "home"),
    }
```

- [ ] **Step 3: Write failing strict-capture and leak verdict tests**

Add tests:

```python
def test_copilot_missing_expected_session_state_is_indeterminate(tmp_path, monkeypatch):
    coding_agents_dir = tmp_path / "coding-agents"
    scenarios_dir = tmp_path / "scenarios"
    _make_copilot_agent(coding_agents_dir)
    sd = _make_scenario(scenarios_dir, "x", with_checks=False)
    (sd / "checks.sh").write_text("pre() { :; }\npost() { :; }\n")

    def fake_gauntlet(*, run_dir, **kwargs):
        other = run_dir / "coding-agent-config" / "session-state" / "other" / "events.jsonl"
        other.parent.mkdir(parents=True)
        other.write_text(
            json.dumps(
                {
                    "type": "assistant.message",
                    "data": {
                        "toolRequests": [
                            {"name": "skill", "arguments": {"skill": "superpowers:brainstorming"}}
                        ]
                    },
                }
            )
            + "\n"
        )
        return "pass"

    with (
        patch("quorum.runner._seed_copilot_config") as seed,
        patch("quorum.runner.invoke_gauntlet", side_effect=fake_gauntlet),
    ):
        seed.return_value = CopilotProvisioning(
            session_id="expected-session",
            env_file=tmp_path / "env-file",
            secret_names=(),
            secret_values=(),
        )
        _, verdict = run_scenario(
            scenario_dir=sd,
            coding_agent="copilot",
            coding_agents_dir=coding_agents_dir,
            out_root=tmp_path / "out",
            skeleton_root=_empty_skeleton(tmp_path),
        )

    assert verdict.final == "indeterminate"
    assert "expected Copilot session-state" in verdict.final_reason


def test_copilot_secret_leak_forces_indeterminate(tmp_path, monkeypatch):
    coding_agents_dir = tmp_path / "coding-agents"
    scenarios_dir = tmp_path / "scenarios"
    _make_copilot_agent(coding_agents_dir)
    sd = _make_scenario(scenarios_dir, "x", with_checks=False)
    (sd / "checks.sh").write_text("pre() { :; }\npost() { :; }\n")

    def fake_gauntlet(*, run_dir, **kwargs):
        expected = (
            run_dir
            / "coding-agent-config"
            / "session-state"
            / "expected-session"
            / "events.jsonl"
        )
        expected.parent.mkdir(parents=True)
        expected.write_text(
            json.dumps(
                {
                    "type": "assistant.message",
                    "data": {"toolRequests": [{"name": "bash", "arguments": {"command": "pwd"}}]},
                }
            )
            + "\n"
        )
        (run_dir / "gauntlet-agent").mkdir(exist_ok=True)
        (run_dir / "gauntlet-agent" / "leak.txt").write_text("secret-token")
        return "pass"

    with (
        patch("quorum.runner._seed_copilot_config") as seed,
        patch("quorum.runner.invoke_gauntlet", side_effect=fake_gauntlet),
    ):
        env_file = tmp_path / "env-file"
        env_file.write_text("COPILOT_GITHUB_TOKEN='secret-token'\n")
        seed.return_value = CopilotProvisioning(
            session_id="expected-session",
            env_file=env_file,
            secret_names=("COPILOT_GITHUB_TOKEN",),
            secret_values=("secret-token",),
        )
        _, verdict = run_scenario(
            scenario_dir=sd,
            coding_agent="copilot",
            coding_agents_dir=coding_agents_dir,
            out_root=tmp_path / "out",
            skeleton_root=_empty_skeleton(tmp_path),
        )

    assert verdict.final == "indeterminate"
    assert "Copilot secret value appeared" in verdict.final_reason
```

If `_make_copilot_agent` is not yet present, add:

```python
def _make_copilot_agent(coding_agents_dir: Path, session_log_dir: Path | None = None) -> None:
    coding_agents_dir.mkdir(parents=True, exist_ok=True)
    (coding_agents_dir / "copilot.yaml").write_text(
        yaml.safe_dump(
            {
                "name": "copilot",
                "binary": "copilot",
                "agent_config_env": "COPILOT_HOME",
                "session_log_dir": "${COPILOT_HOME}/session-state"
                if session_log_dir is None
                else str(session_log_dir),
                "session_log_glob": "**/events.jsonl",
                "normalizer": "copilot",
                "required_env": [],
                "max_time": "10m",
            }
        )
    )
    (coding_agents_dir / "copilot-context").mkdir(parents=True, exist_ok=True)
```

- [ ] **Step 4: Extend `invoke_gauntlet` with sanitized env support**

Change the signature:

```python
def invoke_gauntlet(
    *,
    story_path: Path,
    target_binary: str,
    launch_cwd: Path,
    run_dir: Path,
    max_time: str | None,
    project_prompt: Path | None = None,
    extra_env: dict[str, str] | None = None,
    env_base: Mapping[str, str] | None = None,
) -> GauntletStatus:
```

Replace env construction with:

```python
    base_env = dict(env_base) if env_base is not None else dict(os.environ)
    env = {
        **base_env,
        "QUORUM_AGENT_CWD": str(launch_cwd),
        **(extra_env or {}),
    }
```

- [ ] **Step 5: Wire Copilot provisioning into `_run_scenario_inner`**

In `_run_scenario_inner`, before seeding the config dir, initialize:

```python
    copilot_provisioning: CopilotProvisioning | None = None
```

Replace the `_seed_agent_config_dir(...)` call with:

```python
    if tcfg.name == "copilot":
        copilot_provisioning = _seed_copilot_config(
            agent_config_dir,
            workdir,
            str(uuid.uuid4()),
        )
    else:
        _seed_agent_config_dir(
            tcfg,
            skeleton_root=skeleton_root or (_quorum_repo_root() / "coding-agents"),
            dest=agent_config_dir,
            workdir=workdir,
        )
```

Keep non-Copilot targets on `_seed_agent_config_dir` so their existing hooks remain unchanged.

- [ ] **Step 6: Add Copilot context substitutions**

Extend the substitutions block:

```python
    if tcfg.name == "copilot":
        if copilot_provisioning is None:
            raise RunnerError("Copilot provisioning missing after setup", stage="setup")
        substitutions["$COPILOT_ENV_FILE"] = str(copilot_provisioning.env_file)
        substitutions["$QUORUM_COPILOT_SESSION_ID"] = copilot_provisioning.session_id
```

- [ ] **Step 7: Invoke Gauntlet with sanitized env for Copilot**

Before `invoke_gauntlet(...)`, compute:

```python
    gauntlet_env_base = _copilot_gauntlet_env(os.environ) if tcfg.name == "copilot" else None
```

Pass it:

```python
        env_base=gauntlet_env_base,
```

The existing `extra_env={tcfg.agent_config_env: str(agent_config_dir)}` remains in place. For Copilot, this means the QA shell receives `COPILOT_HOME` and `QUORUM_AGENT_CWD`, but not token variables.

- [ ] **Step 8: Enforce expected Copilot session-state path and secret scan**

Add `"copilot": "Copilot"` to `strict_capture_names`:

```python
    strict_capture_names = {
        "antigravity": "Antigravity",
        "copilot": "Copilot",
        "gemini": "Gemini",
        "opencode": "OpenCode",
    }
```

After building `gauntlet_layer` and before the generic strict zero-row block, add:

```python
    if tcfg.normalizer == "copilot" and copilot_provisioning is not None:
        expected_log = (
            agent_config_dir
            / "session-state"
            / copilot_provisioning.session_id
            / "events.jsonl"
        )
        if capture_result.source_logs and expected_log.resolve() not in {
            path.resolve() for path in capture_result.source_logs
        }:
            return run_dir, _write_indeterminate(
                run_dir,
                final_reason=(
                    "expected Copilot session-state log did not appear: "
                    f"{expected_log.relative_to(agent_config_dir)}"
                ),
                gauntlet=gauntlet_layer,
                checks=pre_records,
                error=RunError(stage="capture", message="expected Copilot session-state missing"),
            )

        leaks = _scan_copilot_secret_leaks(
            run_dir,
            secret_values=copilot_provisioning.secret_values,
            excluded_paths=(copilot_provisioning.env_file,),
        )
        if leaks:
            rel = [str(path.relative_to(run_dir)) for path in leaks[:5]]
            return run_dir, _write_indeterminate(
                run_dir,
                final_reason="Copilot secret value appeared in non-secret run artifact: "
                + ", ".join(rel),
                gauntlet=gauntlet_layer,
                checks=pre_records,
                error=RunError(stage="capture", message="Copilot secret leaked into run artifacts"),
            )
```

- [ ] **Step 9: Run integration and capture tests**

Run:

```bash
uv run pytest tests/quorum/test_runner.py -k 'copilot and (context or gauntlet or transcript or session_state or secret)' tests/quorum/test_capture.py::TestCaptureToolCalls::test_copilot_recursive_events_capture -q
```

Expected: PASS.

- [ ] **Step 10: Commit**

Run:

```bash
git add quorum/runner.py tests/quorum/test_runner.py tests/quorum/test_capture.py
git commit -m "quorum: contain and capture copilot runs"
```

---

## Task 6: Copilot Check Tool And Bootstrap Scenario

**Files:**
- Create: `bin/copilot-plugin-installed`
- Create: `scenarios/copilot-superpowers-bootstrap/story.md`
- Create: `scenarios/copilot-superpowers-bootstrap/setup.sh`
- Create: `scenarios/copilot-superpowers-bootstrap/checks.sh`
- Modify: `tests/quorum/test_trace_tools.py`
- Modify: `tests/quorum/test_scaffold.py`
- Test: `uv run pytest tests/quorum/test_trace_tools.py -k 'copilot_plugin_installed' tests/quorum/test_scaffold.py::test_copilot_bootstrap_requires_native_skill_call -q`

- [ ] **Step 1: Write failing check-tool tests**

Add tests to `tests/quorum/test_trace_tools.py` near the OpenCode and Antigravity plugin tests:

```python
def test_copilot_plugin_installed_passes_when_required_files_exist(tmp_path):
    run_dir = tmp_path / "run"
    workdir = run_dir / "coding-agent-workdir"
    plugin_root = run_dir / "coding-agent-config" / "plugins" / "superpowers"
    workdir.mkdir(parents=True)
    (plugin_root / ".claude-plugin").mkdir(parents=True)
    (plugin_root / ".claude-plugin" / "plugin.json").write_text("{}")
    (plugin_root / "hooks").mkdir()
    (plugin_root / "hooks" / "hooks.json").write_text("{}")
    (plugin_root / "hooks" / "run-hook.cmd").write_text("@echo off\n")
    (plugin_root / "hooks" / "session-start").write_text("#!/usr/bin/env bash\n")
    (plugin_root / "skills" / "using-superpowers" / "references").mkdir(parents=True)
    (plugin_root / "skills" / "using-superpowers" / "SKILL.md").write_text("skill")
    (
        plugin_root / "skills" / "using-superpowers" / "references" / "copilot-tools.md"
    ).write_text("tools")
    (plugin_root / "skills" / "brainstorming").mkdir(parents=True)
    (plugin_root / "skills" / "brainstorming" / "SKILL.md").write_text("skill")
    sink = tmp_path / "s"

    result = subprocess.run(
        [str(BIN / "copilot-plugin-installed")],
        cwd=workdir,
        env={
            "PATH": f"{BIN}:/usr/bin:/bin",
            "QUORUM_RECORD_SINK": str(sink),
            "QUORUM_RUN_DIR": str(run_dir),
        },
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0
    assert len(sink.read_text().splitlines()) == 1
    assert _r(sink)["passed"]


def test_copilot_plugin_installed_fails_when_copilot_tools_reference_missing(tmp_path):
    run_dir = tmp_path / "run"
    workdir = run_dir / "coding-agent-workdir"
    plugin_root = run_dir / "coding-agent-config" / "plugins" / "superpowers"
    workdir.mkdir(parents=True)
    (plugin_root / ".claude-plugin").mkdir(parents=True)
    (plugin_root / ".claude-plugin" / "plugin.json").write_text("{}")
    (plugin_root / "hooks").mkdir()
    (plugin_root / "hooks" / "hooks.json").write_text("{}")
    (plugin_root / "hooks" / "run-hook.cmd").write_text("@echo off\n")
    (plugin_root / "hooks" / "session-start").write_text("#!/usr/bin/env bash\n")
    (plugin_root / "skills" / "using-superpowers").mkdir(parents=True)
    (plugin_root / "skills" / "using-superpowers" / "SKILL.md").write_text("skill")
    (plugin_root / "skills" / "brainstorming").mkdir(parents=True)
    (plugin_root / "skills" / "brainstorming" / "SKILL.md").write_text("skill")
    sink = tmp_path / "s"

    result = subprocess.run(
        [str(BIN / "copilot-plugin-installed")],
        cwd=workdir,
        env={
            "PATH": f"{BIN}:/usr/bin:/bin",
            "QUORUM_RECORD_SINK": str(sink),
            "QUORUM_RUN_DIR": str(run_dir),
        },
        capture_output=True,
        text=True,
    )

    assert result.returncode != 0
    rec = _r(sink)
    assert not rec["passed"]
    assert "copilot-tools.md" in rec["detail"]
```

- [ ] **Step 2: Write failing scaffold scenario test**

Add this test after `test_opencode_bootstrap_requires_native_skill_call` in `tests/quorum/test_scaffold.py`:

```python
def test_copilot_bootstrap_requires_native_skill_call():
    root = Path(__file__).resolve().parents[2]
    checks = (root / "scenarios" / "copilot-superpowers-bootstrap" / "checks.sh").read_text()

    assert 'tool-arg-match Skill \'.skill == "superpowers:brainstorming"\'' in checks
    assert "copilot-plugin-installed" in checks
    assert "skill-before-tool superpowers:brainstorming Edit" in checks
    assert "skill-before-tool superpowers:brainstorming Write" in checks
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
uv run pytest tests/quorum/test_trace_tools.py -k 'copilot_plugin_installed' tests/quorum/test_scaffold.py::test_copilot_bootstrap_requires_native_skill_call -q
```

Expected: FAIL because `bin/copilot-plugin-installed` and `scenarios/copilot-superpowers-bootstrap` do not exist.

- [ ] **Step 4: Create `bin/copilot-plugin-installed`**

Create:

```bash
#!/usr/bin/env bash
_RECORD_CHECK=copilot-plugin-installed
_RECORD_ARGS=("$@")
source "$(dirname "$0")/_record"
set -uo pipefail

if [ -n "${QUORUM_RUN_DIR:-}" ]; then
    home="$QUORUM_RUN_DIR/coding-agent-config"
else
    home="${COPILOT_HOME:-}"
fi

plugin_root="$home/plugins/superpowers"
required=(
    ".claude-plugin/plugin.json"
    "hooks/hooks.json"
    "hooks/run-hook.cmd"
    "hooks/session-start"
    "skills/using-superpowers/SKILL.md"
    "skills/brainstorming/SKILL.md"
    "skills/using-superpowers/references/copilot-tools.md"
)

missing=()
for rel in "${required[@]}"; do
    if [ ! -f "$plugin_root/$rel" ]; then
        missing+=("$rel")
    fi
done

if [ "${#missing[@]}" -ne 0 ]; then
    detail=$(IFS=', '; echo "${missing[*]}")
    record_fail "missing Copilot Superpowers plugin files under $plugin_root: $detail"
    exit 1
fi

record_pass "Copilot Superpowers plugin staged in isolated config"
```

Make it executable:

```bash
chmod +x bin/copilot-plugin-installed
```

- [ ] **Step 5: Create Copilot bootstrap scenario**

Create `scenarios/copilot-superpowers-bootstrap/setup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
uv run setup-helpers run create_base_repo
```

Make it executable:

```bash
chmod +x scenarios/copilot-superpowers-bootstrap/setup.sh
```

Create `scenarios/copilot-superpowers-bootstrap/checks.sh`:

```bash
# coding-agents: copilot

pre() {
    git-repo
    git-branch main
}

post() {
    copilot-plugin-installed
    tool-arg-match Skill '.skill == "superpowers:brainstorming"'
    skill-called superpowers:brainstorming
    skill-before-tool superpowers:brainstorming Edit
    skill-before-tool superpowers:brainstorming Write
}
```

Create `scenarios/copilot-superpowers-bootstrap/story.md`:

```markdown
---
id: copilot-superpowers-bootstrap
title: Copilot bootstraps Superpowers from isolated plugin install
status: ready
tags: copilot, bootstrap
---

You are a developer starting a new project with the GitHub Copilot CLI agent.

When Copilot is at its input prompt, type this exact message and press Enter:

"Let's make a react todo list"

Do NOT mention Superpowers, skills, brainstorming, planning, or tests. The
point is to see whether Copilot's startup context makes the agent reach for
the right workflow on its own.

Once the agent has loaded a skill, started brainstorming, or started writing
tests or code, you are done. The goal is to test startup bootstrap, not to
drive the todo app to completion.

## Acceptance Criteria

- Quorum staged Superpowers into Copilot's isolated plugin directory for this
  run.
- The staged files alone are not considered proof that Copilot honored the
  plugin. The behavioral proof is the normalized session-state trace.
- The agent loaded `superpowers:brainstorming` in response to the naive
  "react todo list" request before writing implementation code. For Copilot
  this should appear as a normalized `Skill` tool call from Copilot's native
  `skill` tool.
```

Ensure `checks.sh` is not executable:

```bash
chmod 0644 scenarios/copilot-superpowers-bootstrap/checks.sh
```

- [ ] **Step 6: Run scenario and check-tool tests**

Run:

```bash
uv run pytest tests/quorum/test_trace_tools.py -k 'copilot_plugin_installed' tests/quorum/test_scaffold.py::test_copilot_bootstrap_requires_native_skill_call -q
uv run quorum check
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add bin/copilot-plugin-installed scenarios/copilot-superpowers-bootstrap tests/quorum/test_trace_tools.py tests/quorum/test_scaffold.py
git commit -m "quorum: add copilot bootstrap scenario"
```

---

## Task 7: README, Static Verification, And Live Smoke

**Files:**
- Modify: `README.md`
- Test: `uv run ruff check && uv run ty check && uv run quorum check && uv run pytest`

- [ ] **Step 1: Update README target list and safety notes**

In `README.md`, update the intro and safety sections so the Coding-Agent list includes Copilot:

```markdown
**Quorum** drives real coding-agent CLIs (Claude, Codex, Antigravity, Gemini,
OpenCode, Copilot) through a Gauntlet QA agent and grades them against scenario
checks.
```

Update the permissive-mode sentence:

```markdown
Codex CLI, Antigravity CLI, Gemini CLI, OpenCode CLI, or GitHub Copilot CLI in
permissive modes.
```

Update the isolated-home paragraph:

```markdown
Claude, `CODEX_HOME` for Codex, `ANTIGRAVITY_CONFIG_DIR` for Antigravity,
`GEMINI_CLI_HOME` for Gemini, `OPENCODE_QUORUM_HOME` plus isolated XDG dirs for
OpenCode, and `COPILOT_HOME` for Copilot) so the Coding-Agent never sees the
host's real `~/.claude`, `~/.codex`, `~/.gemini`, OpenCode state, or
`~/.copilot`.
```

- [ ] **Step 2: Add Copilot smoke command and target table row**

Add this near the OpenCode trusted-maintainer smoke:

````markdown
Trusted-maintainer Copilot bootstrap smoke:

```bash
SUPERPOWERS_ROOT=/Users/drewritter/prime-rad/superpowers \
  uv run quorum run scenarios/copilot-superpowers-bootstrap --coding-agent copilot
```

Do not wire Copilot live evals to public CI; they launch `copilot` with
`--allow-all` and stage local Superpowers code into a secret-bearing run
directory when token or provider auth is materialized.
````

Add the table row:

```markdown
| `copilot` | GitHub Copilot CLI (`copilot`) | `SUPERPOWERS_ROOT`, plus `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`, `gh auth token`, or `COPILOT_PROVIDER_BASE_URL` |
```

- [ ] **Step 3: Add Copilot target details**

Add this section after OpenCode or before troubleshooting:

````markdown
### Copilot

`coding-agents/copilot.yaml` launches GitHub Copilot CLI as `copilot`. quorum
creates an isolated per-run `COPILOT_HOME` under
`<run>/coding-agent-config`, writes a chmod-0600 `.copilot-env` file containing
only the selected auth variables, stages the local Superpowers plugin under
`<run>/coding-agent-config/plugins/superpowers/`, and runs Copilot with:

```bash
copilot --plugin-dir "$COPILOT_HOME/plugins/superpowers" \
  --session-id "$QUORUM_COPILOT_SESSION_ID" \
  --allow-all \
  --no-auto-update \
  --no-remote \
  --disable-builtin-mcps \
  --secret-env-vars=...
```

Supported auth sources are `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`,
`gh auth token`, or provider/BYOK variables when `COPILOT_PROVIDER_BASE_URL` is
set. When `COPILOT_OFFLINE=true`, `COPILOT_PROVIDER_BASE_URL` is required.

Copilot run artifacts are secret-bearing live-eval artifacts when the runner
materializes a GitHub token or provider secret. Do not paste, publish, or
commit Copilot run directories without scrubbing them.

The primary trace source is:

```text
<run>/coding-agent-config/session-state/<session-id>/events.jsonl
```

The broader config glob is `**/events.jsonl`, but the expected primary session
file must be captured for a Copilot run to be considered evaluable.
````

- [ ] **Step 4: Add Copilot troubleshooting notes**

Add:

```markdown
### Copilot Troubleshooting

When a Copilot run is non-passing or indeterminate:

1. Confirm `copilot` is installed and reachable: `copilot --version`.
2. Confirm auth is available from `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`,
   `GITHUB_TOKEN`, `gh auth token`, or provider variables.
3. Inspect the staged plugin under
   `<run>/coding-agent-config/plugins/superpowers/`.
4. Inspect Copilot logs under `<run>/coding-agent-config/logs/`.
5. Inspect session-state at
   `<run>/coding-agent-config/session-state/<session-id>/events.jsonl`.
6. Inspect normalized behavior in `<run>/coding-agent-tool-calls.jsonl`; plugin
   files alone do not prove the SessionStart hook was consumed.
7. If verdict reason mentions a secret leak, treat the run directory as
   compromised until the named artifact is scrubbed or deleted.
```

- [ ] **Step 5: Run static verification**

Run:

```bash
uv run ruff check
uv run ty check
uv run quorum check
uv run pytest
```

Expected: all commands pass.

- [ ] **Step 6: Run live Copilot bootstrap smoke**

Run only from a trusted maintainer environment:

```bash
SUPERPOWERS_ROOT=/Users/drewritter/prime-rad/superpowers \
  uv run quorum run scenarios/copilot-superpowers-bootstrap --coding-agent copilot
uv run quorum show
```

Expected:
- `verdict.json` final verdict is `pass`.
- `coding-agent-tool-calls.jsonl` contains a canonical `Skill` row for `superpowers:brainstorming`.
- `coding-agent-config/plugins/superpowers/` contains the staged plugin files.
- `coding-agent-config/session-state/<session-id>/events.jsonl` exists.
- The captured session-state path matches `$QUORUM_COPILOT_SESSION_ID`.
- `copilot-plugin-installed` passes.
- Copilot logs show no plugin or hook loading error.
- No materialized GitHub token, provider secret, or OTel header value appears in non-secret run artifacts.

- [ ] **Step 7: Commit**

Run:

```bash
git add README.md
git commit -m "docs: document copilot quorum target"
```

---

## Final Verification Checklist

- [ ] `uv run ruff check` passes.
- [ ] `uv run ty check` passes.
- [ ] `uv run quorum check` passes.
- [ ] `uv run pytest` passes.
- [ ] `SUPERPOWERS_ROOT=/Users/drewritter/prime-rad/superpowers uv run quorum run scenarios/copilot-superpowers-bootstrap --coding-agent copilot` produces a concrete verdict.
- [ ] `uv run quorum show` confirms the live bootstrap smoke is either passing or has a triaged product/harness failure with run artifact paths.
- [ ] `coding-agent-tool-calls.jsonl` from the live smoke includes `{"tool":"Skill","args":{"skill":"superpowers:brainstorming",...},"source":"native"}`.
- [ ] No Copilot auth secret appears outside `.copilot-env` in the live run directory.

---

## Self-Review

**Spec coverage:** The plan covers Copilot YAML/context/launcher (Task 3), isolated `COPILOT_HOME` and staged Superpowers plugin loading (Task 4), required `.claude-plugin`, hooks, skills, and `copilot-tools.md` files (Tasks 4 and 6), GitHub and provider/BYOK auth modes (Task 4), chmod-0600 env file and shell quoting (Task 4), sanitized outer Gauntlet environment (Task 5), secret leak scanning (Task 5), run-specific session id substitution (Task 5), primary `session-state/<session-id>/events.jsonl` enforcement (Task 5), strict no-log and zero-row capture through existing strict-capture machinery (Task 5), Copilot session-state normalizer and tool map (Task 2), `copilot-plugin-installed` (Task 6), bootstrap scenario checks (Task 6), README docs (Task 7), static verification (Task 7), and trusted live smoke acceptance (Task 7).

**Placeholder scan:** The plan contains concrete file paths, test code, implementation snippets, commands, and expected outputs. It does not rely on deferred filler instructions.

**Type consistency:** `CopilotProvisioning.session_id/env_file/secret_names/secret_values` is introduced in Task 4 and used consistently in Task 5. `COPILOT_ENV_FILE_NAME` is used in runner tests and runner code. `normalizer: copilot`, `agent_config_env: COPILOT_HOME`, `session_log_dir: ${COPILOT_HOME}/session-state`, and `session_log_glob: **/events.jsonl` are consistent across YAML, tests, capture, runner substitutions, and docs.
