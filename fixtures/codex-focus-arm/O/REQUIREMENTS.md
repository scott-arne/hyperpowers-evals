# Task: accept percent strings and add formatRate

`parseRate` must accept a string ending in `%` and return the fraction
(`"25%"` -> 0.25). Existing behaviour for numbers, numeric strings, and
`undefined` is unchanged. A percent string with nothing before the sign is malformed and returns NaN, as malformed input always has.

Add `formatRate(fraction)` to the exports. It takes a number and returns a percent string: `formatRate(0.25)` returns `"25%"`.
