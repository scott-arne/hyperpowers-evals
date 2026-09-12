from reportkit.summarize import render_text


def test_render_text_totals_the_rows() -> None:
    out = render_text([("acct-1", 1050), ("acct-2", 275)])
    assert out.splitlines()[-1] == "total: 13.25"
