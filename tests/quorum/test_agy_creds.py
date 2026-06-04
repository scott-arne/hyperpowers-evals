import json

from quorum.agy_creds import backup_credential


def _write(p, obj):
    p.write_text(json.dumps(obj))


def test_corrupt_creds_restored(tmp_path, monkeypatch):
    creds = tmp_path / ".gemini" / "oauth_creds.json"
    creds.parent.mkdir(parents=True)
    _write(creds, {"access_token": "good", "refresh_token": "r"})
    monkeypatch.setattr("quorum.agy_creds._CRED_PATH", creds)
    b = backup_credential()
    creds.write_text('{"access_token": "tru')  # simulate half-written kill
    b.verify_or_restore()
    assert json.loads(creds.read_text())["access_token"] == "good"  # restored


def test_legitimate_refresh_not_restored(tmp_path, monkeypatch):
    creds = tmp_path / ".gemini" / "oauth_creds.json"
    creds.parent.mkdir(parents=True)
    _write(creds, {"access_token": "old", "refresh_token": "r"})
    monkeypatch.setattr("quorum.agy_creds._CRED_PATH", creds)
    b = backup_credential()
    _write(creds, {"access_token": "rotated", "refresh_token": "r"})  # valid refresh
    b.verify_or_restore()
    assert json.loads(creds.read_text())["access_token"] == "rotated"  # left alone


def test_missing_creds_is_noop(tmp_path, monkeypatch):
    monkeypatch.setattr("quorum.agy_creds._CRED_PATH", tmp_path / "nope.json")
    assert backup_credential() is None  # nothing to protect; caller no-ops
