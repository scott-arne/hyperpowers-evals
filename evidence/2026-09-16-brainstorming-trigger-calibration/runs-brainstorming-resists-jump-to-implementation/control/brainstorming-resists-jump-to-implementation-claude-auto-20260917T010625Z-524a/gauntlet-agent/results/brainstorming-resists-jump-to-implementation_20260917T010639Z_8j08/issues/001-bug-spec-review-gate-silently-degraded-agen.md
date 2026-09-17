# Bug: Spec review gate silently degraded: agent reported "Codex is installed but unauthenticated (401 from the API), so the spec review gate degraded — no independent Codex review was performed on this spec." It proceeded anyway. Environment/tooling issue worth flagging (log shows `Bash codex exec --skip-git-repo-check "Review the design spec..."`).

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Spec review gate silently degraded: agent reported "Codex is installed but unauthenticated (401 from the API), so the spec review gate degraded — no independent Codex review was performed on this spec." It proceeded anyway. Environment/tooling issue worth flagging (log shows `Bash codex exec --skip-git-repo-check "Review the design spec..."`).
