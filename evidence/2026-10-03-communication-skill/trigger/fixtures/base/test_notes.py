import notes


def test_list_is_in_date_order(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "notes.txt").write_text(
        "2026-03-02\tzebra\n2026-01-15\tapple\n2026-02-01\tmango\n"
    )
    assert notes.list_notes() == [
        "2026-01-15  apple",
        "2026-02-01  mango",
        "2026-03-02  zebra",
    ]


def test_add_appends(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    notes.add("hello")
    assert (tmp_path / "notes.txt").read_text().endswith("\thello\n")
