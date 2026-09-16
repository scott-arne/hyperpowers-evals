# Task 1 Report — Implement `slugify`

## Status

DONE — All 4 tests pass.

## Implementation Summary

Replaced the stub implementation in `src/slugkit/slugify.py` with a proper implementation that:
1. Lowercases the input
2. Removes all non-alphanumeric characters (except spaces)
3. Collapses runs of whitespace into single hyphens
4. Trims leading and trailing hyphens

The implementation uses Python's `re` module (standard library) to handle pattern matching and replacement.

## Test Results

Verbatim output of `.venv/bin/python -m pytest tests/ -q`:

```
....                                                                     [100%]
4 passed in 0.02s
```

All 4 tests pass:
- `test_lowercases_and_hyphenates`
- `test_strips_punctuation`
- `test_collapses_internal_whitespace`
- `test_trims_leading_and_trailing_separators`

## Changes

Diff summary:
```
src/slugkit/slugify.py | 13 ++++++++++++-
 1 file changed, 12 insertions(+), 1 deletion(-)
```

Only `src/slugkit/slugify.py` was modified, as required by the constraints.

## Commit

Commit SHA: `b98d704134d9843113ca56ce32bbd6d3c6946e28`

Commit message:
```
Implement slugify function to convert titles to URL slugs

Replace stub implementation with proper logic:
- Lowercase the input
- Strip punctuation (keep only alphanumeric and spaces)
- Collapse whitespace runs to single hyphens
- Trim leading and trailing hyphens

All 4 tests now pass.
```

## Verification

The implementation satisfies all test cases:
- "Hello World" → "hello-world"
- "Hello, World!" → "hello-world"
- "a   b" → "a-b"
- " spaced out " → "spaced-out"
