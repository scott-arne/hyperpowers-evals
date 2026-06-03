# Gemini Quorum Coding-Agent Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Gemini CLI as a first-class Quorum Coding-Agent target with isolated per-run Gemini state, Superpowers extension loading, transcript capture, and a live bootstrap smoke.

**Architecture:** Keep Gemini inside the existing Coding-Agent model: one YAML config, one generated launcher, runner-level config seeding, existing Gemini normalizer registration, shared capture/composer flow, and ordinary scenario checks. Gemini provisioning uses a per-run `GEMINI_CLI_HOME`, a chmod-0600 env file for the API key, seeded auth settings, `gemini extensions link "$SUPERPOWERS_ROOT" --consent`, and capture diagnostics matching Antigravity. Any model-invoking preflight uses throwaway Gemini state so the real run home stays transcript-free until Quorum snapshots logs.

**Tech Stack:** Python 3.11, uv, pytest, ruff, ty, Bash, jq check tools, Gemini CLI 0.41.x, Gauntlet TUI adapter.

**Spec:** [docs/superpowers/specs/2026-06-03-gemini-quorum-coding-agent-design.md](../specs/2026-06-03-gemini-quorum-coding-agent-design.md)

---

## File Structure

**Create:**
- `coding-agents/gemini.yaml` - Gemini Coding-Agent config.
- `coding-agents/gemini-context/HOWTO.md` - Gauntlet-Agent instructions for launching Gemini.
- `coding-agents/gemini-context/launch-agent` - Generated launcher template.
- `bin/gemini-extension-linked` - Check tool that verifies Superpowers is linked/enabled under the run's isolated Gemini home.
- `scenarios/gemini-superpowers-bootstrap/story.md` - Live bootstrap smoke scenario.
- `scenarios/gemini-superpowers-bootstrap/setup.sh` - Base repo fixture setup.
- `scenarios/gemini-superpowers-bootstrap/checks.sh` - Gemini bootstrap deterministic checks.

**Modify:**
- `quorum/runner.py` - Add Gemini provisioning, env-file creation, auth/settings seeding, extension linking checks, optional throwaway auth preflight, context substitutions, `CodingAgentConfigError` setup verdicts, and Gemini capture diagnostics.
- `quorum/normalizers.py` - Harden Gemini args normalization only where golden fixture coverage proves a current shape needs it.
- `tests/quorum/test_coding_agent_config.py` - Gemini YAML loader coverage.
- `tests/quorum/test_runner.py` - Gemini launcher/provisioning/capture/error tests.
- `tests/quorum/test_normalizers.py` - Realistic Gemini transcript fixture coverage.
- `tests/quorum/test_capture.py` - Gemini YAML glob coverage.
- `tests/quorum/test_trace_tools.py` - Gemini skill invocation path coverage.
- `README.md` - Document Gemini target, required env, run artifact sensitivity, and bootstrap smoke command.

**Do Not Change:**
- Existing Kimi files or branches. This branch/worktree is Gemini-only.
- `quorum/run_all.py` semantics beyond relying on existing `max_concurrency`.
- Public CI to launch Gemini. Live eval commands stay trusted-maintainer only.

---

## Task 1: Empirical Gemini CLI Probe

**Why first:** The plan depends on current Gemini CLI behavior. Confirm the facts in a throwaway home before writing code.

**Files:**
- No repo files changed.

- [ ] **Step 1: Confirm Gemini flags and extension commands**

Run:

```bash
gemini --version
gemini --help | rg 'skip-trust|approval-mode|yolo|extensions'
gemini extensions link --help
gemini extensions install --help
```

Expected:
- `gemini --version` prints a version such as `0.41.2`.
- Help includes `--skip-trust`, `--approval-mode`, `--yolo`, `extensions`, and `--output-format`.
- `extensions link --help` includes `--consent`.
- `extensions install --help` includes `--consent` and `--skip-settings`.

- [ ] **Step 2: Verify noninteractive Superpowers link in a throwaway home**

Run:

```bash
tmp=$(mktemp -d /tmp/quorum-gemini-home.XXXXXX)
SUPERPOWERS_ROOT=${SUPERPOWERS_ROOT:-/Users/drewritter/prime-rad/superpowers}
GEMINI_CLI_HOME="$tmp" GEMINI_CLI_TRUST_WORKSPACE=true \
  gemini extensions link "$SUPERPOWERS_ROOT" --consent
GEMINI_CLI_HOME="$tmp" gemini extensions list
find "$tmp/.gemini" -maxdepth 4 -type f -print | sort
```

Expected:
- Link command exits `0`.
- `gemini extensions list` prints `superpowers`.
- The file list includes:
  - `.gemini/extensions/superpowers/.gemini-extension-install.json`
  - `.gemini/extensions/extension-enablement.json`
  - `.gemini/extension_integrity.json`

- [ ] **Step 3: Verify prompt/auth behavior in a throwaway home**

Run only when `GEMINI_API_KEY` is available:

```bash
tmp=$(mktemp -d /tmp/quorum-gemini-auth.XXXXXX)
mkdir -p "$tmp/.gemini"
cat > "$tmp/.gemini/settings.json" <<'JSON'
{
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  }
}
JSON
GEMINI_CLI_HOME="$tmp" \
GEMINI_API_KEY="${GEMINI_API_KEY:?}" \
GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key \
GEMINI_CLI_TRUST_WORKSPACE=true \
  timeout 90 gemini --skip-trust --approval-mode=yolo \
    -p 'Reply with EXACTLY OK.' --output-format json
find "$tmp/.gemini/tmp" -path '*/chats/*' -type f -print 2>/dev/null | sort
```

Expected:
- Gemini exits `0` within 90 seconds.
- Output contains an `OK` response.
- Any chat files are under the throwaway `$tmp/.gemini/tmp`, not this repo.

- [ ] **Step 4: Record probe facts in the implementation notes**

No commit. Keep the concrete version, flag, and path facts available for later task comments and README wording.

---

## Task 2: Add Gemini Config And Launcher Context

**Files:**
- Create: `coding-agents/gemini.yaml`
- Create: `coding-agents/gemini-context/HOWTO.md`
- Create: `coding-agents/gemini-context/launch-agent`
- Modify: `tests/quorum/test_coding_agent_config.py`
- Modify: `tests/quorum/test_runner.py`
- Test: `uv run pytest tests/quorum/test_coding_agent_config.py tests/quorum/test_runner.py -k 'gemini_config_loads or gemini_launch_agent' -q`

- [ ] **Step 1: Write failing Gemini config loader test**

Append to `tests/quorum/test_coding_agent_config.py`:

```python
def test_gemini_config_loads_when_env_set(monkeypatch, tmp_path):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("SUPERPOWERS_ROOT", str(tmp_path / "superpowers"))
    cfg = load_coding_agent_config(
        Path(__file__).resolve().parents[2] / "coding-agents" / "gemini.yaml"
    )

    assert cfg.name == "gemini"
    assert cfg.binary == "gemini"
    assert cfg.agent_config_env == "GEMINI_CLI_HOME"
    assert cfg.normalizer == "gemini"
    assert cfg.session_log_glob == "**/chats/**/*.json*"
    assert cfg.resolve_session_log_dir(tmp_path / "cfg") == (
        tmp_path / "cfg" / ".gemini" / "tmp"
    )
```

- [ ] **Step 2: Run the config test and verify failure**

Run:

```bash
uv run pytest tests/quorum/test_coding_agent_config.py::test_gemini_config_loads_when_env_set -q
```

Expected: FAIL because `coding-agents/gemini.yaml` does not exist.

- [ ] **Step 3: Create `coding-agents/gemini.yaml`**

Create:

```yaml
name: gemini
binary: gemini
agent_config_env: GEMINI_CLI_HOME
session_log_dir: "${GEMINI_CLI_HOME}/.gemini/tmp"
session_log_glob: "**/chats/**/*.json*"
normalizer: gemini
required_env:
  - GEMINI_API_KEY
  - SUPERPOWERS_ROOT
max_time: 10m
max_concurrency: 1
```

- [ ] **Step 4: Create Gemini HOWTO**

Create `coding-agents/gemini-context/HOWTO.md`:

```markdown
# Gemini CLI Coding-Agent

Launch Gemini by running:

```bash
$QUORUM_LAUNCH_AGENT
```

The launcher already changes into the prepared workdir and sets the isolated
Gemini home. Do not run `gemini` directly, and do not use the user's
`~/.gemini` directory.

After Gemini is ready, send the scenario request exactly as written in
`story.md`. When the scenario objective is complete, end the Gemini session.
```

- [ ] **Step 5: Create Gemini launcher template**

Create `coding-agents/gemini-context/launch-agent`:

```bash
#!/usr/bin/env bash
# quorum-generated launcher for Gemini CLI (the agent under test).
#
# quorum substitutes the $... placeholders below with literal per-run paths so
# the QA agent can launch Gemini with one command even when tmux strips env.
set -euo pipefail
cd "$QUORUM_AGENT_CWD" || { echo "launch-agent: cannot cd to $QUORUM_AGENT_CWD" >&2; exit 1; }
set -a
. "$GEMINI_ENV_FILE"
set +a
exec env \
  GEMINI_CLI_HOME="$GEMINI_CLI_HOME" \
  GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key \
  GEMINI_CLI_TRUST_WORKSPACE=true \
  gemini --skip-trust --approval-mode=yolo "$@"
```

- [ ] **Step 6: Add failing launcher substitution test**

Append this helper and test to `tests/quorum/test_runner.py`:

```python
def _make_gemini_agent(coding_agents_dir: Path, session_log_dir: Path) -> None:
    coding_agents_dir.mkdir(parents=True, exist_ok=True)
    (coding_agents_dir / "gemini.yaml").write_text(
        yaml.safe_dump(
            {
                "name": "gemini",
                "binary": "gemini",
                "agent_config_env": "GEMINI_CLI_HOME",
                "session_log_dir": str(session_log_dir),
                "session_log_glob": "*.jsonl",
                "normalizer": "gemini",
                "required_env": [],
            }
        )
    )
    (coding_agents_dir / "gemini-context").mkdir(parents=True, exist_ok=True)


def test_gemini_launch_agent_is_substituted(tmp_path):
    coding_agents_dir = tmp_path / "coding-agents"
    scenarios_dir = tmp_path / "scenarios"
    session_log_dir = tmp_path / "logs"
    session_log_dir.mkdir()
    _make_gemini_agent(coding_agents_dir, session_log_dir)
    shutil.copy2(
        Path(__file__).resolve().parents[2]
        / "coding-agents"
        / "gemini-context"
        / "launch-agent",
        coding_agents_dir / "gemini-context" / "launch-agent",
    )
    (coding_agents_dir / "gemini-context" / "HOWTO.md").write_text(
        "launch: $QUORUM_LAUNCH_AGENT\nhome: $GEMINI_CLI_HOME\n"
    )
    sd = _make_scenario(scenarios_dir, "x", with_checks=False)
    (sd / "checks.sh").write_text("pre() { :; }\npost() { :; }\n")

    with (
        patch("quorum.runner._seed_gemini_config"),
        patch("quorum.runner.invoke_gauntlet", side_effect=_stub_gauntlet_pass),
    ):
        run_scenario(
            scenario_dir=sd,
            coding_agent="gemini",
            coding_agents_dir=coding_agents_dir,
            out_root=tmp_path / "results",
            skeleton_root=_empty_skeleton(tmp_path),
        )

    rd = next((tmp_path / "results").iterdir())
    shim = rd / "gauntlet-agent" / "context" / "launch-agent"
    content = shim.read_text()
    assert shim.stat().st_mode & stat.S_IXUSR
    assert "$QUORUM_AGENT_CWD" not in content
    assert "$GEMINI_CLI_HOME" not in content
    assert "$GEMINI_ENV_FILE" not in content
    assert "GEMINI_CLI_HOME=" in content
    assert ".gemini-env" in content
    assert "--skip-trust --approval-mode=yolo" in content
```

- [ ] **Step 7: Run targeted tests and verify expected failure**

Run:

```bash
uv run pytest tests/quorum/test_coding_agent_config.py::test_gemini_config_loads_when_env_set tests/quorum/test_runner.py::test_gemini_launch_agent_is_substituted -q
```

Expected: config test PASS, launcher test FAIL because `_seed_gemini_config` and `$GEMINI_ENV_FILE` substitution do not exist yet.

- [ ] **Step 8: Commit config/context artifacts and failing test scaffolding**

Do not commit with failing tests. Leave the launcher test staged for the next task, or wait and commit after Task 3 makes it pass.

---

## Task 3: Implement Gemini Runner Provisioning

**Files:**
- Modify: `quorum/runner.py`
- Modify: `tests/quorum/test_runner.py`
- Test: `uv run pytest tests/quorum/test_runner.py -k gemini -q`

- [ ] **Step 1: Extend test imports**

In `tests/quorum/test_runner.py`, extend the `from quorum.runner import (...)` import with:

```python
    _gemini_transcripts,
    _seed_gemini_config,
    _write_gemini_env_file,
    _write_gemini_settings,
```

- [ ] **Step 2: Add Gemini target config helper**

Append near `_antigravity_tcfg()`:

```python
def _gemini_tcfg() -> CodingAgentConfig:
    return CodingAgentConfig(
        name="gemini",
        binary="gemini",
        agent_config_env="GEMINI_CLI_HOME",
        session_log_dir="${GEMINI_CLI_HOME}/.gemini/tmp",
        session_log_glob="**/chats/**/*.json*",
        normalizer="gemini",
        required_env=(),
        max_time=None,
        project_prompt=None,
    )
```

- [ ] **Step 3: Add failing provisioning tests**

Append to `TestSeedAgentConfigDir`:

```python
    def test_gemini_target_seeds_config(self, tmp_path):
        dest = tmp_path / "agent-config"
        with patch("quorum.runner._seed_gemini_config") as mock_seed:
            _seed_agent_config_dir(_gemini_tcfg(), tmp_path, dest, tmp_path / "wd")
        mock_seed.assert_called_once_with(dest, tmp_path / "wd")

    def test_gemini_seed_requires_api_key(self, tmp_path, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.setenv("SUPERPOWERS_ROOT", str(tmp_path / "superpowers"))
        with pytest.raises(RunnerError, match="GEMINI_API_KEY"):
            _seed_gemini_config(tmp_path / "cfg", tmp_path / "wd")

    def test_gemini_seed_requires_superpowers_root(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        monkeypatch.delenv("SUPERPOWERS_ROOT", raising=False)
        with pytest.raises(RunnerError, match="SUPERPOWERS_ROOT"):
            _seed_gemini_config(tmp_path / "cfg", tmp_path / "wd")

    def test_gemini_settings_select_api_key_auth(self, tmp_path):
        cfg = tmp_path / "cfg"
        _write_gemini_settings(cfg)
        settings = json.loads((cfg / ".gemini" / "settings.json").read_text())
        assert settings["security"]["auth"]["selectedType"] == "gemini-api-key"

    def test_gemini_env_file_is_owner_only_and_contains_key(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-secret")
        env_file = _write_gemini_env_file(tmp_path / "cfg")
        assert env_file.name == ".gemini-env"
        assert env_file.stat().st_mode & 0o077 == 0
        assert "GEMINI_API_KEY=test-secret" in env_file.read_text()

    def test_gemini_seed_links_extension_and_rejects_real_transcripts(
        self, tmp_path, monkeypatch
    ):
        sp = tmp_path / "superpowers"
        (sp / "skills" / "using-superpowers" / "references").mkdir(parents=True)
        (sp / "gemini-extension.json").write_text('{"name":"superpowers","version":"test"}')
        (sp / "GEMINI.md").write_text("@./skills/using-superpowers/SKILL.md\n")
        (sp / "skills" / "using-superpowers" / "SKILL.md").write_text("skill")
        (sp / "skills" / "using-superpowers" / "references" / "gemini-tools.md").write_text("tools")
        monkeypatch.setenv("SUPERPOWERS_ROOT", str(sp))
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        monkeypatch.setattr("quorum.runner.shutil.which", lambda name: "/usr/bin/gemini")
        cfg = tmp_path / "cfg"

        def fake_run(cmd, **kwargs):
            assert kwargs["env"]["GEMINI_CLI_HOME"] == str(cfg)
            assert kwargs["env"]["GEMINI_CLI_TRUST_WORKSPACE"] == "true"
            if cmd[:3] == ["gemini", "extensions", "link"]:
                assert cmd == ["gemini", "extensions", "link", str(sp), "--consent"]
                root = cfg / ".gemini" / "extensions" / "superpowers"
                root.mkdir(parents=True)
                (root / ".gemini-extension-install.json").write_text("{}")
                (cfg / ".gemini" / "extensions" / "extension-enablement.json").write_text("{}")
                (cfg / ".gemini" / "extension_integrity.json").write_text("{}")
                return subprocess.CompletedProcess(cmd, 0, "linked", "")
            if cmd[:3] == ["gemini", "extensions", "list"]:
                return subprocess.CompletedProcess(cmd, 0, "superpowers\nEnabled", "")
            raise AssertionError(f"unexpected command: {cmd}")

        with patch("quorum.runner.subprocess.run", side_effect=fake_run):
            _seed_gemini_config(cfg, tmp_path / "wd")

        assert (cfg / ".gemini" / "settings.json").exists()
        assert (cfg / ".gemini-env").exists()
        assert _gemini_transcripts(cfg) == []

    def test_gemini_seed_fails_when_provisioning_creates_transcript(
        self, tmp_path, monkeypatch
    ):
        sp = tmp_path / "superpowers"
        (sp / "skills" / "using-superpowers" / "references").mkdir(parents=True)
        (sp / "gemini-extension.json").write_text("{}")
        (sp / "GEMINI.md").write_text("@./skills/using-superpowers/SKILL.md\n")
        (sp / "skills" / "using-superpowers" / "SKILL.md").write_text("skill")
        (sp / "skills" / "using-superpowers" / "references" / "gemini-tools.md").write_text("tools")
        monkeypatch.setenv("SUPERPOWERS_ROOT", str(sp))
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        monkeypatch.setattr("quorum.runner.shutil.which", lambda name: "/usr/bin/gemini")
        cfg = tmp_path / "cfg"

        def fake_run(cmd, **_kwargs):
            root = cfg / ".gemini" / "extensions" / "superpowers"
            root.mkdir(parents=True, exist_ok=True)
            (root / ".gemini-extension-install.json").write_text("{}")
            (cfg / ".gemini" / "extensions" / "extension-enablement.json").write_text("{}")
            (cfg / ".gemini" / "extension_integrity.json").write_text("{}")
            chat_dir = cfg / ".gemini" / "tmp" / "project" / "chats"
            chat_dir.mkdir(parents=True)
            (chat_dir / "session-preflight.jsonl").write_text("{}\n")
            return subprocess.CompletedProcess(cmd, 0, "superpowers\nEnabled", "")

        with (
            patch("quorum.runner.subprocess.run", side_effect=fake_run),
            pytest.raises(RunnerError, match="unexpectedly wrote transcripts"),
        ):
            _seed_gemini_config(cfg, tmp_path / "wd")
```

- [ ] **Step 4: Run the Gemini runner tests and verify failure**

Run:

```bash
uv run pytest tests/quorum/test_runner.py -k gemini -q
```

Expected: FAIL because Gemini helper functions are missing.

- [ ] **Step 5: Add Gemini constants and helpers to `quorum/runner.py`**

Add after `ANTIGRAVITY_VISIBLE_LAUNCH_RECORD`:

```python
GEMINI_ENV_FILE_NAME = ".gemini-env"
GEMINI_REQUIRED_SUPERPOWERS_FILES = (
    "gemini-extension.json",
    "GEMINI.md",
    "skills/using-superpowers/SKILL.md",
    "skills/using-superpowers/references/gemini-tools.md",
)
```

Add after `_seed_codex_plugin_hooks`:

```python
def _gemini_transcripts(config_dir: Path) -> list[Path]:
    tmp_dir = config_dir / ".gemini" / "tmp"
    if not tmp_dir.exists():
        return []
    return sorted(tmp_dir.glob("**/chats/**/*.json*"))


def _write_gemini_settings(gemini_home: Path) -> None:
    settings_path = gemini_home / ".gemini" / "settings.json"
    settings = json.loads(settings_path.read_text()) if settings_path.exists() else {}
    security = settings.setdefault("security", {})
    auth = security.setdefault("auth", {})
    auth["selectedType"] = "gemini-api-key"
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(json.dumps(settings, indent=2))


def _shell_single_quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def _write_gemini_env_file(gemini_home: Path) -> Path:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise RunnerError("GEMINI_API_KEY not set; cannot seed Gemini auth", stage="setup")
    env_file = gemini_home / GEMINI_ENV_FILE_NAME
    env_file.parent.mkdir(parents=True, exist_ok=True)
    env_file.write_text("GEMINI_API_KEY=" + _shell_single_quote(api_key) + "\n")
    env_file.chmod(0o600)
    return env_file


def _require_gemini_superpowers_root(superpowers_root: str) -> Path:
    if not superpowers_root:
        raise RunnerError(
            "SUPERPOWERS_ROOT not set; cannot install Gemini Superpowers extension",
            stage="setup",
        )
    root = Path(superpowers_root)
    missing = [
        str(root / rel)
        for rel in GEMINI_REQUIRED_SUPERPOWERS_FILES
        if not (root / rel).exists()
    ]
    if missing:
        raise RunnerError(
            "SUPERPOWERS_ROOT does not look like a Gemini-capable Superpowers "
            "checkout; missing: " + ", ".join(missing),
            stage="setup",
        )
    return root


def _seed_gemini_config(gemini_home: Path, workdir: Path) -> None:
    """Install Superpowers into an isolated Gemini CLI home."""
    superpowers_root = _require_gemini_superpowers_root(os.environ.get("SUPERPOWERS_ROOT", ""))
    if shutil.which("gemini") is None:
        raise RunnerError("gemini not found on PATH; cannot run Gemini evals", stage="setup")

    gemini_home.mkdir(parents=True, exist_ok=True)
    _write_gemini_settings(gemini_home)
    _write_gemini_env_file(gemini_home)

    env = {
        **os.environ,
        "GEMINI_CLI_HOME": str(gemini_home),
        "GEMINI_CLI_TRUST_WORKSPACE": "true",
        "GEMINI_DEFAULT_AUTH_TYPE": "gemini-api-key",
    }
    link_cmd = ["gemini", "extensions", "link", str(superpowers_root), "--consent"]
    link_result = subprocess.run(
        link_cmd,
        cwd=workdir if workdir.exists() else gemini_home,
        text=True,
        capture_output=True,
        env=env,
    )
    if link_result.returncode != 0:
        raise RunnerError(
            "gemini extensions link failed "
            f"(exit {link_result.returncode}); stderr: {link_result.stderr.strip()[:300]}",
            stage="setup",
        )

    list_result = subprocess.run(
        ["gemini", "extensions", "list"],
        cwd=workdir if workdir.exists() else gemini_home,
        text=True,
        capture_output=True,
        env=env,
    )
    if list_result.returncode != 0 or "superpowers" not in list_result.stdout.lower():
        raise RunnerError(
            "gemini extensions list did not report Superpowers enabled; "
            f"stdout: {list_result.stdout.strip()[:300]} "
            f"stderr: {list_result.stderr.strip()[:300]}",
            stage="setup",
        )

    required = [
        gemini_home / ".gemini" / "extensions" / "superpowers" / ".gemini-extension-install.json",
        gemini_home / ".gemini" / "extensions" / "extension-enablement.json",
        gemini_home / ".gemini" / "extension_integrity.json",
    ]
    missing = [str(p.relative_to(gemini_home)) for p in required if not p.exists()]
    if missing:
        raise RunnerError(
            "gemini extension link completed but expected metadata is missing: "
            + ", ".join(missing),
            stage="setup",
        )

    transcripts = _gemini_transcripts(gemini_home)
    if transcripts:
        rel = [str(p.relative_to(gemini_home)) for p in transcripts]
        raise RunnerError(
            "gemini provisioning unexpectedly wrote transcripts before capture snapshot: "
            + ", ".join(rel),
            stage="setup",
        )
```

- [ ] **Step 6: Wire `_seed_agent_config_dir`**

In `_seed_agent_config_dir`, after the Antigravity branch, add:

```python
    if coding_agent.name == "gemini":
        _seed_gemini_config(dest, workdir)
```

- [ ] **Step 7: Add `$GEMINI_ENV_FILE` context substitution**

In `_run_scenario_inner`, before `_populate_context_dir`, build:

```python
    substitutions = {
        "$QUORUM_AGENT_CWD": str(launch_cwd),
        "$SUPERPOWERS_ROOT": os.environ.get("SUPERPOWERS_ROOT", ""),
        "$QUORUM_LAUNCH_AGENT": str(launch_agent_path),
        f"${tcfg.agent_config_env}": str(agent_config_dir),
    }
    if tcfg.name == "gemini":
        substitutions["$GEMINI_ENV_FILE"] = str(agent_config_dir / GEMINI_ENV_FILE_NAME)
```

Then pass `substitutions=substitutions` to `_populate_context_dir`.

- [ ] **Step 8: Run Gemini runner tests**

Run:

```bash
uv run pytest tests/quorum/test_runner.py -k gemini -q
```

Expected: PASS.

- [ ] **Step 9: Run config plus runner tests**

Run:

```bash
uv run pytest tests/quorum/test_coding_agent_config.py tests/quorum/test_runner.py -k 'gemini or antigravity or codex_seed' -q
```

Expected: PASS.

- [ ] **Step 10: Commit**

Run:

```bash
git add coding-agents/gemini.yaml coding-agents/gemini-context/HOWTO.md coding-agents/gemini-context/launch-agent quorum/runner.py tests/quorum/test_coding_agent_config.py tests/quorum/test_runner.py
git commit -m "quorum: add Gemini coding-agent config"
```

---

## Task 4: Surface Config Errors And Gemini Capture Diagnostics

**Files:**
- Modify: `quorum/runner.py`
- Modify: `tests/quorum/test_runner.py`
- Test: `uv run pytest tests/quorum/test_runner.py -k 'config_error or gemini_capture' -q`

- [ ] **Step 1: Add `CodingAgentConfigError` import**

Change the runner import:

```python
from quorum.coding_agent_config import (
    CodingAgentConfig,
    CodingAgentConfigError,
    load_coding_agent_config,
)
```

- [ ] **Step 2: Add failing config-error verdict test**

Append to `TestRunScenario`:

```python
    def test_config_error_becomes_setup_indeterminate(self, tmp_path):
        coding_agents_dir = tmp_path / "coding-agents"
        scenarios_dir = tmp_path / "scenarios"
        coding_agents_dir.mkdir(parents=True)
        (coding_agents_dir / "broken.yaml").write_text("name: broken\n")
        sd = _make_scenario(scenarios_dir, "x", with_checks=False)
        (sd / "checks.sh").write_text("pre() { :; }\npost() { :; }\n")

        run_dir, verdict = run_scenario(
            scenario_dir=sd,
            coding_agent="broken",
            coding_agents_dir=coding_agents_dir,
            out_root=tmp_path / "results",
            skeleton_root=_empty_skeleton(tmp_path),
        )

        assert verdict.final == "indeterminate"
        assert verdict.error is not None
        assert verdict.error.stage == "setup"
        assert "missing required fields" in verdict.final_reason
        assert (run_dir / "verdict.json").exists()
```

- [ ] **Step 3: Add failing Gemini capture diagnostic tests**

Append to `TestRunScenario`:

```python
    def test_gemini_no_transcript_is_capture_indeterminate(self, tmp_path):
        coding_agents_dir = tmp_path / "coding-agents"
        scenarios_dir = tmp_path / "scenarios"
        session_log_dir = tmp_path / "logs"
        session_log_dir.mkdir()
        _make_gemini_agent(coding_agents_dir, session_log_dir)
        sd = _make_scenario(scenarios_dir, "x", with_checks=False)
        (sd / "checks.sh").write_text("pre() { :; }\npost() { :; }\n")

        with (
            patch("quorum.runner._seed_gemini_config"),
            patch("quorum.runner.invoke_gauntlet", side_effect=_stub_gauntlet_pass),
        ):
            _run_dir, verdict = run_scenario(
                scenario_dir=sd,
                coding_agent="gemini",
                coding_agents_dir=coding_agents_dir,
                out_root=tmp_path / "results",
                skeleton_root=_empty_skeleton(tmp_path),
            )

        assert verdict.final == "indeterminate"
        assert verdict.error is not None
        assert verdict.error.stage == "capture"
        assert "no Gemini transcript" in verdict.final_reason

    def test_gemini_zero_rows_is_capture_indeterminate(self, tmp_path):
        coding_agents_dir = tmp_path / "coding-agents"
        scenarios_dir = tmp_path / "scenarios"
        session_log_dir = tmp_path / "logs"
        session_log_dir.mkdir()
        _make_gemini_agent(coding_agents_dir, session_log_dir)
        sd = _make_scenario(scenarios_dir, "x", with_checks=False)
        (sd / "checks.sh").write_text("pre() { :; }\npost() { :; }\n")

        def fake_invoke(*, run_dir, **_kwargs):
            (session_log_dir / "session-empty.jsonl").write_text('{"type":"user"}\n')
            (run_dir / "gauntlet-agent" / "results" / "run-1").mkdir(parents=True)
            (run_dir / "gauntlet-agent" / "results" / "run-1" / "result.json").write_text(
                json.dumps({"status": "pass"})
            )
            return "pass"

        with (
            patch("quorum.runner._seed_gemini_config"),
            patch("quorum.runner.invoke_gauntlet", side_effect=fake_invoke),
        ):
            _run_dir, verdict = run_scenario(
                scenario_dir=sd,
                coding_agent="gemini",
                coding_agents_dir=coding_agents_dir,
                out_root=tmp_path / "results",
                skeleton_root=_empty_skeleton(tmp_path),
            )

        assert verdict.final == "indeterminate"
        assert verdict.error is not None
        assert verdict.error.stage == "capture"
        assert "Gemini transcript(s) normalized to zero" in verdict.final_reason
```

- [ ] **Step 4: Run targeted tests and verify failure**

Run:

```bash
uv run pytest tests/quorum/test_runner.py -k 'config_error or gemini_capture' -q
```

Expected: FAIL because the runner still treats `CodingAgentConfigError` as unknown and only Antigravity has explicit capture diagnostics.

- [ ] **Step 5: Implement `CodingAgentConfigError` handling**

In `run_scenario`, add this `except` before `except RunnerError`:

```python
    except CodingAgentConfigError as e:
        v = _write_indeterminate(
            run_dir,
            final_reason=f"setup failed: {e}",
            error=RunError(stage="setup", message=str(e)[:500]),
        )
        return run_dir, v
```

- [ ] **Step 6: Implement shared transcript capture diagnostics for Gemini**

Replace the two Antigravity-only blocks after `gauntlet_layer` with:

```python
    strict_capture_names = {"antigravity": "Antigravity", "gemini": "Gemini"}
    strict_capture_name = strict_capture_names.get(tcfg.normalizer)
    if strict_capture_name and not capture_result.source_logs:
        return run_dir, _write_indeterminate(
            run_dir,
            final_reason=(
                f"no {strict_capture_name} transcript appeared under isolated "
                f"{session_log_dir}; cannot evaluate this run"
            ),
            gauntlet=gauntlet_layer,
            checks=pre_records,
            error=RunError(
                stage="capture",
                message=f"no {strict_capture_name} transcript captured",
            ),
        )

    if strict_capture_name and capture_result.source_logs and capture_result.row_count == 0:
        rel = [str(p.relative_to(session_log_dir)) for p in capture_result.source_logs]
        return run_dir, _write_indeterminate(
            run_dir,
            final_reason=(
                f"{strict_capture_name} transcript(s) normalized to zero tool-call rows: "
                + ", ".join(rel)
            ),
            gauntlet=gauntlet_layer,
            checks=pre_records,
            error=RunError(
                stage="capture",
                message=f"{strict_capture_name} capture normalized to zero rows",
            ),
        )
```

- [ ] **Step 7: Run targeted tests**

Run:

```bash
uv run pytest tests/quorum/test_runner.py -k 'config_error or gemini_capture or antigravity' -q
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add quorum/runner.py tests/quorum/test_runner.py
git commit -m "quorum: diagnose Gemini capture failures"
```

---

## Task 5: Harden Gemini Normalizer And Trace Predicates

**Files:**
- Modify: `tests/quorum/test_normalizers.py`
- Modify: `tests/quorum/test_trace_tools.py`
- Modify: `quorum/normalizers.py`
- Test: `uv run pytest tests/quorum/test_normalizers.py::TestNormalizeGeminiLogs tests/quorum/test_trace_tools.py -q`

- [ ] **Step 1: Add realistic Gemini transcript test**

Append to `TestNormalizeGeminiLogs`:

```python
    def test_normalizes_realistic_json_and_jsonl_tool_calls(self):
        messages = [
            {"kind": "main"},
            {
                "type": "gemini",
                "content": "Using a skill",
                "toolCalls": [
                    {
                        "id": "skill-1",
                        "name": "activate_skill",
                        "args": {"skill": "superpowers:brainstorming"},
                        "status": "success",
                    },
                    {
                        "id": "ls-1",
                        "name": "list_directory",
                        "args": {"path": "src"},
                        "status": "success",
                    },
                    {
                        "id": "write-1",
                        "name": "write_file",
                        "args": {"file_path": "notes.md", "content": "x"},
                        "status": "success",
                    },
                    {
                        "id": "replace-1",
                        "name": "replace",
                        "args": {"file_path": "notes.md", "old_string": "x", "new_string": "y"},
                        "status": "success",
                    },
                    {
                        "id": "shell-1",
                        "name": "run_shell_command",
                        "args": {"command": "git status"},
                        "status": "success",
                    },
                ],
            },
            {
                "type": "gemini",
                "content": "duplicate tool call id should be ignored",
                "toolCalls": [
                    {
                        "id": "shell-1",
                        "name": "run_shell_command",
                        "args": {"command": "pwd"},
                        "status": "success",
                    }
                ],
            },
        ]

        json_rows = normalize_gemini_logs(json.dumps({"messages": messages}))
        jsonl_rows = normalize_gemini_logs("\n".join(json.dumps(m) for m in messages))

        for rows in (json_rows, jsonl_rows):
            assert [row["tool"] for row in rows] == [
                "Skill",
                "Glob",
                "Write",
                "Edit",
                "Bash",
            ]
            assert rows[0]["args"]["skill"] == "superpowers:brainstorming"
            assert rows[0]["source"] == "native"
            assert rows[-1]["args"]["command"] == "git status"
            assert rows[-1]["source"] == "shell"
```

- [ ] **Step 2: Add Gemini skill predicate test**

Append to `tests/quorum/test_trace_tools.py` after the Antigravity skill-read test:

```python
def test_skill_called_recognizes_gemini_activate_skill(tmp_path):
    parent = tmp_path / "rundir"
    parent.mkdir()
    workdir = parent / "coding-agent-workdir"
    workdir.mkdir()
    trace = _trace(
        parent,
        {"tool": "Skill", "args": {"skill": "superpowers:brainstorming"}},
    )
    sink = tmp_path / "s"
    assert (
        _run(
            "skill-called",
            "superpowers:brainstorming",
            trace=trace,
            cwd=workdir,
            sink=sink,
        )
        == 0
    )
```

- [ ] **Step 3: Run targeted tests**

Run:

```bash
uv run pytest tests/quorum/test_normalizers.py::TestNormalizeGeminiLogs tests/quorum/test_trace_tools.py -q
```

Expected: PASS if the current normalizer already handles the current Gemini shape. If the realistic test fails because current Gemini emits a different argument key discovered in Task 1, update `GEMINI_TOOL_MAP` or `normalize_gemini_logs` with the smallest normalization needed and rerun this command.

- [ ] **Step 4: Commit**

Run:

```bash
git add quorum/normalizers.py tests/quorum/test_normalizers.py tests/quorum/test_trace_tools.py
git commit -m "quorum: cover Gemini tool-call normalization"
```

---

## Task 6: Add Gemini Extension Check Tool And Bootstrap Scenario

**Files:**
- Create: `bin/gemini-extension-linked`
- Create: `scenarios/gemini-superpowers-bootstrap/story.md`
- Create: `scenarios/gemini-superpowers-bootstrap/setup.sh`
- Create: `scenarios/gemini-superpowers-bootstrap/checks.sh`
- Test: `uv run pytest tests/quorum/test_trace_tools.py -q`
- Test: `uv run quorum check`

- [ ] **Step 1: Create `bin/gemini-extension-linked`**

Create executable file:

```bash
#!/usr/bin/env bash
_RECORD_CHECK=gemini-extension-linked
_RECORD_ARGS=("$@")
source "$(dirname "$0")/_record"
set -uo pipefail

if [ -z "${QUORUM_RUN_DIR:-}" ]; then
    record_fail "QUORUM_RUN_DIR is not set"
    exit 1
fi

GEMINI_ROOT="$QUORUM_RUN_DIR/coding-agent-config/.gemini"
missing=()
for rel in \
    "extensions/superpowers/.gemini-extension-install.json" \
    "extensions/extension-enablement.json" \
    "extension_integrity.json"
do
    if [ ! -f "$GEMINI_ROOT/$rel" ]; then
        missing+=("$rel")
    fi
done

if [ "${#missing[@]}" -eq 0 ]; then
    record_pass "Superpowers Gemini extension linked at $GEMINI_ROOT/extensions/superpowers"
else
    detail=""
    for rel in "${missing[@]}"; do
        if [ -z "$detail" ]; then
            detail="$rel"
        else
            detail="$detail, $rel"
        fi
    done
    record_fail "missing Gemini Superpowers extension metadata: $detail"
    exit 1
fi
```

Then run:

```bash
chmod +x bin/gemini-extension-linked
```

- [ ] **Step 2: Add check-tool tests**

Append to `tests/quorum/test_trace_tools.py`:

```python
def test_gemini_extension_linked_check(tmp_path):
    parent = tmp_path / "rundir"
    root = parent / "coding-agent-config" / ".gemini"
    (root / "extensions" / "superpowers").mkdir(parents=True)
    (root / "extensions" / "superpowers" / ".gemini-extension-install.json").write_text("{}")
    (root / "extensions" / "extension-enablement.json").write_text("{}")
    (root / "extension_integrity.json").write_text("{}")
    workdir = parent / "coding-agent-workdir"
    workdir.mkdir(parents=True)
    trace = _trace(parent, {"tool": "Skill", "args": {"skill": "superpowers:brainstorming"}})
    sink = tmp_path / "s"
    assert _run("gemini-extension-linked", trace=trace, cwd=workdir, sink=sink) == 0
    assert _r(sink)["passed"]
```

- [ ] **Step 3: Run check-tool tests**

Run:

```bash
uv run pytest tests/quorum/test_trace_tools.py -q
```

Expected: PASS.

- [ ] **Step 4: Create Gemini bootstrap scenario**

Create `scenarios/gemini-superpowers-bootstrap/story.md`:

```markdown
---
id: gemini-superpowers-bootstrap
title: Gemini bootstrap from isolated Superpowers extension link
status: ready
tags: gemini, bootstrap
---

You are a developer starting a new project with the Gemini CLI agent.

When Gemini is ready for input, type this exact message and press Enter:

"Let's make a react todo list"

After the agent has taken its first substantive next step, you are done. The
goal is to observe Superpowers startup behavior, not to drive the todo app to
completion.

## Acceptance Criteria

- Quorum linked Superpowers into Gemini's isolated `.gemini/extensions`
  tree for this run.
- The linked extension metadata alone is not considered proof that Gemini
  honored Superpowers. The behavioral proof is the normalized transcript.
- The agent loaded `superpowers:brainstorming` in response to the naive
  "react todo list" request before writing implementation code.
```

Create `scenarios/gemini-superpowers-bootstrap/setup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
uv run setup-helpers run create_base_repo
```

Create `scenarios/gemini-superpowers-bootstrap/checks.sh`:

```bash
# coding-agents: gemini

pre() {
    git-repo
    git-branch main
}

post() {
    gemini-extension-linked
    skill-called superpowers:brainstorming
    skill-before-tool superpowers:brainstorming Edit
    skill-before-tool superpowers:brainstorming Write
}
```

- [ ] **Step 5: Validate scenarios**

Run:

```bash
uv run quorum check
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add bin/gemini-extension-linked scenarios/gemini-superpowers-bootstrap tests/quorum/test_trace_tools.py
git commit -m "quorum: add Gemini bootstrap scenario"
```

---

## Task 7: Add README Documentation

**Files:**
- Modify: `README.md`
- Test: `uv run quorum check`

- [ ] **Step 1: Update required env and run commands**

In `README.md`, add Gemini to the Coding-Agents section near Claude/Codex/Antigravity with text:

```markdown
`coding-agents/gemini.yaml` launches Gemini CLI as `gemini`. Quorum sets an
isolated per-run `GEMINI_CLI_HOME` under `<run>/coding-agent-config`, writes a
chmod-0600 runtime env file containing `GEMINI_API_KEY`, seeds API-key auth in
`.gemini/settings.json`, and links Superpowers from local `SUPERPOWERS_ROOT`
with `gemini extensions link --consent`.

Gemini run artifacts are secret-bearing live-eval artifacts because the
isolated config dir contains the per-run env file. Do not commit, paste, or
publish Gemini run directories without scrubbing them.

Live smoke:

```bash
export GEMINI_API_KEY=...
export SUPERPOWERS_ROOT=/Users/drewritter/prime-rad/superpowers
uv run quorum run scenarios/gemini-superpowers-bootstrap --coding-agent gemini
uv run quorum show <run-dir>
```
```

- [ ] **Step 2: Run scenario validation**

Run:

```bash
uv run quorum check
```

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```bash
git add README.md
git commit -m "docs: document Gemini Quorum target"
```

---

## Task 8: Static Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
uv run pytest tests/quorum/test_coding_agent_config.py tests/quorum/test_runner.py tests/quorum/test_normalizers.py tests/quorum/test_capture.py tests/quorum/test_trace_tools.py -q
```

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run:

```bash
uv run ruff check
uv run ty check
uv run quorum check
```

Expected: all PASS.

- [ ] **Step 3: Run full test suite**

Run:

```bash
uv run pytest
```

Expected: PASS.

- [ ] **Step 4: Commit any verification-only fixes**

If any static or unit verification step required a code or docs fix, commit only those changed files:

```bash
git status --short
git add <changed-files>
git commit -m "quorum: finish Gemini target verification"
```

If no files changed, do not create an empty commit.

---

## Task 9: Live Gemini Smoke And Rollout Gate

**Files:**
- No source files expected.

- [ ] **Step 1: Verify required env**

Run:

```bash
test -n "${GEMINI_API_KEY:-}" && echo GEMINI_API_KEY=set
test -n "${SUPERPOWERS_ROOT:-}" && echo SUPERPOWERS_ROOT="$SUPERPOWERS_ROOT"
test -d "${SUPERPOWERS_ROOT:-/missing}/skills" && echo superpowers-root-ok
```

Expected:
- `GEMINI_API_KEY=set`
- `SUPERPOWERS_ROOT=<path>`
- `superpowers-root-ok`

- [ ] **Step 2: Run bootstrap smoke**

Run:

```bash
uv run quorum run scenarios/gemini-superpowers-bootstrap --coding-agent gemini
```

Expected:
- Command exits `0` for pass, or `2` for an actionable indeterminate with a clear setup/capture diagnostic.
- Output prints `run-id: <run-dir-name>`.

- [ ] **Step 3: Inspect verdict**

Run:

```bash
uv run quorum show <run-dir-name>
```

Expected for success:
- final verdict is `pass`.
- checks include `gemini-extension-linked`.
- checks include `skill-called superpowers:brainstorming`.
- `coding-agent-tool-calls.jsonl` has at least one normalized row.

- [ ] **Step 4: Inspect captured Gemini artifacts**

Run:

```bash
run_dir=results/<run-dir-name>
find "$run_dir/coding-agent-config/.gemini/tmp" -path '*/chats/*' -type f -print | sort
test -f "$run_dir/coding-agent-config/.gemini/extensions/superpowers/.gemini-extension-install.json"
test -f "$run_dir/coding-agent-config/.gemini/extensions/extension-enablement.json"
test -f "$run_dir/coding-agent-config/.gemini/extension_integrity.json"
test -f "$run_dir/coding-agent-tool-calls.jsonl"
```

Expected: all commands exit `0`; transcript files are under the isolated run home.

- [ ] **Step 5: Run curated subset after bootstrap pass**

Run:

```bash
uv run quorum run-all \
  --coding-agents gemini \
  --scenarios gemini-superpowers-bootstrap,triggering-test-driven-development,00-quorum-smoke-hello-world \
  --jobs 1
```

Expected:
- Gemini runs serially.
- Bootstrap and skill-triggering scenarios provide trace evidence.
- Any failing scenario has a concrete verdict reason, not a missing harness artifact.

- [ ] **Step 6: Decide broad sweep readiness**

If the curated subset passes, inspect scenario directives before broad sweep:

```bash
rg -n '^# coding-agents:' scenarios/*/checks.sh
uv run quorum run-all --coding-agents gemini --jobs 1
```

Expected:
- Broad sweep is attempted only after reviewing directive coverage.
- New failures are triaged as scenario compatibility, Gemini CLI behavior, or harness bugs.

---

## Self-Review Checklist

- [ ] Spec coverage: every acceptance item in the Gemini design maps to a task above.
- [ ] Placeholder scan: `rg -n 'T[B]D|T[O]DO|F[I]XME|fill[ ]in|implement[ ]later|ap[p]ropriate|similar[ ]to' docs/superpowers/plans/2026-06-03-gemini-quorum-coding-agent.md` returns no matches.
- [ ] Type/signature consistency: `_seed_gemini_config(dest, workdir)`, `_write_gemini_env_file(gemini_home)`, `_write_gemini_settings(gemini_home)`, and `_gemini_transcripts(config_dir)` are used consistently in tests and implementation.
- [ ] Scope guard: Kimi files remain absent from `git diff origin/main..HEAD --name-only`.
