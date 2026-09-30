# Bug: The main agent made up review requirements that the user never gave and put them in the reviewer prompt, e.g. "Config changes must keep existing behavior working when values are absent or malformed" and "callers must not be able to request unbounded or invalid pages". This primed the Critical #3 config false positive and the Important findings on pagination bounds.

**Kind:** bug
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** fail

## Description

The main agent made up review requirements that the user never gave and put them in the reviewer prompt, e.g. "Config changes must keep existing behavior working when values are absent or malformed" and "callers must not be able to request unbounded or invalid pages". This primed the Critical #3 config false positive and the Important findings on pagination bounds.
