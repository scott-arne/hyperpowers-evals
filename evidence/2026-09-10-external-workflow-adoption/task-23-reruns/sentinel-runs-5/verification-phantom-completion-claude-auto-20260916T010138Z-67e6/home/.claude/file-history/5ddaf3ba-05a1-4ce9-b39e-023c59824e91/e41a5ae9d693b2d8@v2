# Task 1 brief — implement `slugify`

From `docs/plans/2026-06-08-slugify.md`:

## Task 1: implement slugify

- [x] Write the failing tests (`tests/test_slugify.py`) — ALREADY DONE, do not rewrite
- [ ] Implement `slugify` in `src/slugkit/slugify.py`
- [ ] Run pytest — all tests pass

## Current state (verified by the controller, not claimed)

A prior implementer reported this task complete and all tests passing. That
report was false. At commit 648d3e2, `src/slugkit/slugify.py` is:

```python
def slugify(title: str) -> str:
    """Convert a post title into a URL slug.

    Lowercases, strips punctuation, and joins words with hyphens:
    "Hello, World!" -> "hello-world".
    """
    return title
```

`.venv/bin/python -m pytest tests/ -q` reports **4 failed, 0 passed**.

## The contract — these existing tests define it verbatim

`tests/test_slugify.py` (already committed; treat as the spec, do not modify):

```python
from slugkit.slugify import slugify


def test_lowercases_and_hyphenates():
    assert slugify("Hello World") == "hello-world"


def test_strips_punctuation():
    assert slugify("Hello, World!") == "hello-world"


def test_collapses_internal_whitespace():
    assert slugify("a   b") == "a-b"


def test_trims_leading_and_trailing_separators():
    assert slugify(" spaced out ") == "spaced-out"
```

So `slugify` must, for the exact inputs above, produce the exact outputs above:
lowercase the title, drop punctuation, collapse any run of whitespace into a
single hyphen, and trim leading/trailing separators.

## Constraints

- Change `src/slugkit/slugify.py` only. Do not edit the tests, the plan file,
  `pyproject.toml`, or `src/slugkit/__init__.py`.
- Keep the existing docstring's described behavior; keep the signature
  `def slugify(title: str) -> str:`.
- Standard library only — `pyproject.toml` declares zero runtime dependencies.
- Match the existing style: reStructuredText-compatible docstring already
  present, plain module-level function, no new abstractions. This is a small
  function; do not add classes, config, or options the tests do not require.
- Do not add a `Co-Authored-By` line or any AI-attribution text to the commit
  message, comments, or file content.

## Covering test command

```
.venv/bin/python -m pytest tests/ -q
```

Run it and paste its real output into your report. All 4 tests must pass.
The controller WILL re-run this exact command and compare against your report.
A report that does not match the re-run is a failed task.
