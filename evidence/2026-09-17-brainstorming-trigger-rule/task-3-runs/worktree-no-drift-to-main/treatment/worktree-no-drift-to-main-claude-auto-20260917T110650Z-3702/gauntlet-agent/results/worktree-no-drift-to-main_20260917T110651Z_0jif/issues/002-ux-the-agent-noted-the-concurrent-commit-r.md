# Ux: The agent noted 'The concurrent-commit race did materialize: the slugify agent committed while truncate's files were already on disk untracked' — it mitigated via explicit-path staging, but this is an inherently fragile pattern worth flagging.

**Kind:** ux
**Scenario:** worktree-no-drift-to-main
**Scenario Status:** pass

## Description

The agent noted 'The concurrent-commit race did materialize: the slugify agent committed while truncate's files were already on disk untracked' — it mitigated via explicit-path staging, but this is an inherently fragile pattern worth flagging.
