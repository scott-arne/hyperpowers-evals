import pytest

import quorum.agy_creds


@pytest.fixture(autouse=True)
def _isolate_agy_credential(tmp_path, monkeypatch):
    """Never let the test suite read or touch the real ~/.gemini/oauth_creds.json.

    Points _CRED_PATH at a non-existent tmp file by default, so backup_credential()
    returns None for any test that does not deliberately create and re-point it
    (test_agy_creds.py re-points it within each test, which still wins).
    """
    monkeypatch.setattr(quorum.agy_creds, "_CRED_PATH", tmp_path / "oauth_creds.json")


@pytest.fixture(autouse=True)
def _unset_claude_code_session_env(monkeypatch):
    """Run the suite as if outside Claude Code.

    Claude Code injects CLAUDECODE / CLAUDE_CODE_SESSION_ID into the processes
    it spawns, so pytest launched from inside Claude Code would inherit them and
    trip the nested-claude-code guard in CLI tests. Tests that exercise the
    guard itself pass an explicit env and are unaffected by this.
    """
    monkeypatch.delenv("CLAUDECODE", raising=False)
    monkeypatch.delenv("CLAUDE_CODE_SESSION_ID", raising=False)
