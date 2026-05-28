# tests/barf/test_story_meta.py
import pytest

from barf.story_meta import StoryMetaError, read_barf_max_time


def _story(tmp_path, body: str):
    p = tmp_path / "story.md"
    p.write_text(body)
    return p


FM = (
    "---\n"
    "id: x\n"
    "title: y\n"
    "tags: sdd\n"
    "{extra}"
    "---\n"
    "\nBody text.\n"
)


def test_no_frontmatter_returns_none(tmp_path):
    p = _story(tmp_path, "No frontmatter here, just body.\n")
    assert read_barf_max_time(p) is None


def test_frontmatter_without_key_returns_none(tmp_path):
    p = _story(tmp_path, FM.format(extra=""))
    assert read_barf_max_time(p) is None


def test_minutes_value(tmp_path):
    p = _story(tmp_path, FM.format(extra="barf_max_time: 90m\n"))
    assert read_barf_max_time(p) == "90m"


def test_seconds_value(tmp_path):
    p = _story(tmp_path, FM.format(extra="barf_max_time: 600s\n"))
    assert read_barf_max_time(p) == "600s"


def test_bare_seconds_value(tmp_path):
    p = _story(tmp_path, FM.format(extra="barf_max_time: 1800\n"))
    assert read_barf_max_time(p) == "1800"


def test_quoted_value_is_stripped(tmp_path):
    p = _story(tmp_path, FM.format(extra='barf_max_time: "45m"\n'))
    assert read_barf_max_time(p) == "45m"


def test_malformed_value_raises(tmp_path):
    p = _story(tmp_path, FM.format(extra="barf_max_time: ninety\n"))
    with pytest.raises(StoryMetaError):
        read_barf_max_time(p)
