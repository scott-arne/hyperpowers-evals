"""Barf-level overrides read from a scenario's story.md frontmatter.

These are barf orchestration hints, distinct from the fields gauntlet
parses out of the story card. The `barf_` prefix makes ownership explicit:
gauntlet ignores unknown frontmatter keys, so these are barf-only. They are
deliberately NOT gauntlet card fields — if gauntlet honored a card-level
budget, an explicit `--max-time` on a direct `gauntlet run` would be
expected to override it, and the precedence would get confusing. Keeping
them barf-only means barf owns budget policy and a direct `gauntlet run
--max-time` is always authoritative on its own.
"""

from __future__ import annotations

import re
from pathlib import Path

# Frontmatter is the block between the leading `---` fences. Mirrors
# gauntlet's own lenient splitFrontmatter rather than full-yaml-parsing the
# block, so we tolerate exactly what gauntlet tolerates.
_FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)

# A gauntlet duration: bare integer (seconds) or integer with ms/s/m/h suffix.
_DURATION = re.compile(r"^\d+(ms|s|m|h)?$")


class StoryMetaError(ValueError):
    """Raised when a barf_ override in story.md frontmatter is malformed."""


def read_barf_max_time(story_path: Path) -> str | None:
    """Return the `barf_max_time` override from story.md frontmatter, or None.

    Strict-override semantics: when present, the caller uses this in place of
    the coding-agent default — it may be larger OR smaller. The value is a
    gauntlet duration string (e.g. "90m", "600s", or bare "1800" seconds).
    Raises StoryMetaError on a malformed value.
    """
    text = story_path.read_text()
    m = _FRONTMATTER.match(text)
    if not m:
        return None
    for line in m.group(1).splitlines():
        key, sep, val = line.partition(":")
        if not sep or key.strip() != "barf_max_time":
            continue
        value = val.strip().strip('"').strip("'")
        if not _DURATION.match(value):
            raise StoryMetaError(
                f"{story_path}: barf_max_time={val.strip()!r} is not a valid "
                f"duration (expected like 90m, 600s, or bare seconds 1800)"
            )
        return value
    return None
