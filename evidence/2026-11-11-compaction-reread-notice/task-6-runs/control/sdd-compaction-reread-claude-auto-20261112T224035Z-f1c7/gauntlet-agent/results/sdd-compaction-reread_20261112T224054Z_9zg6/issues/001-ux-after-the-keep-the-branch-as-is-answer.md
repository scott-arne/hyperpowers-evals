# Ux: After the 'Keep the branch as-is' answer, the finishing step detached HEAD: "I detached the checkout from the branch and released this session's lock on it... you're now on a detached HEAD". The user asked to keep the branch as-is, so leaving them on a detached HEAD is surprising, even though the commits are unchanged.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After the 'Keep the branch as-is' answer, the finishing step detached HEAD: "I detached the checkout from the branch and released this session's lock on it... you're now on a detached HEAD". The user asked to keep the branch as-is, so leaving them on a detached HEAD is surprising, even though the commits are unchanged.
