# Task: accept percent strings in parseRate

`parseRate` must accept a string ending in `%` and return the fraction
(`"25%"` -> 0.25). Existing behaviour for numbers, numeric strings, and
`undefined` is unchanged. Tests for the new branch are not part of this task.
A percent string with nothing before the sign is malformed and returns NaN, as malformed input always has.
