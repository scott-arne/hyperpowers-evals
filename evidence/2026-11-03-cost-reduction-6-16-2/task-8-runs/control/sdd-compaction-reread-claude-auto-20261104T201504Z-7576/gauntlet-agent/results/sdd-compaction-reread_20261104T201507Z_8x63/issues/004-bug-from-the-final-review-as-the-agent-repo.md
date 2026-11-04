# Bug: From the final review, as the agent reported it (not confirmed by me): passing an object that can't be converted to a string as n or wpm throws a plain TypeError instead of the RangeError, because the error message is built with String(). Also, sentenceCount('He lives on Main St. It is nice.') returns 1, since an abbreviation is never counted as a sentence end.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

From the final review, as the agent reported it (not confirmed by me): passing an object that can't be converted to a string as n or wpm throws a plain TypeError instead of the RangeError, because the error message is built with String(). Also, sentenceCount('He lives on Main St. It is nice.') returns 1, since an abbreviation is never counted as a sentence end.
