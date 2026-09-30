# Performance: While the reviewer subagent ran in the background, the parent polled with `sleep 60` and then `sleep 120` Bash calls instead of waiting for a completion notification. The whole run took about 4m45s.

**Kind:** performance
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** pass

## Description

While the reviewer subagent ran in the background, the parent polled with `sleep 60` and then `sleep 120` Bash calls instead of waiting for a completion notification. The whole run took about 4m45s.
