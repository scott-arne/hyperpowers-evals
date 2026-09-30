"""Tests for textkit.chunking."""
from __future__ import annotations

import pytest

from textkit.chunking import chunk_text


def test_chunk_text_even_split() -> None:
    assert chunk_text("abcdef", 2) == ["ab", "cd", "ef"]


def test_chunk_text_uneven_tail() -> None:
    assert chunk_text("abcdefg", 3) == ["abc", "def", "g"]


def test_chunk_text_chunk_larger_than_text() -> None:
    assert chunk_text("hi", 10) == ["hi"]


def test_chunk_text_empty() -> None:
    assert chunk_text("", 4) == []


def test_chunk_text_rejects_zero() -> None:
    with pytest.raises(ValueError):
        chunk_text("abc", 0)


def test_chunk_text_rejects_negative() -> None:
    with pytest.raises(ValueError):
        chunk_text("abc", -2)
