"""URL slugs for the publishing pipeline."""

import re
import unicodedata

__all__ = ["slugify"]


def strip_accents(text: str) -> str:
    """Drop combining marks, so "é" becomes "e"."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def slugify(text: str) -> str:
    """Lower-case ``text``, strip accents, and hyphenate its letters and digits."""
    text = strip_accents(text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")
