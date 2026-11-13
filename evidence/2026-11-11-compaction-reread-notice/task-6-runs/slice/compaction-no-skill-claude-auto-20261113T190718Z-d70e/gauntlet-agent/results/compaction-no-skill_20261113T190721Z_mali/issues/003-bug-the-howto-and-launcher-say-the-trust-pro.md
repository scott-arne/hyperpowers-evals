# Bug: The HOWTO and launcher say the trust prompt is suppressed and the dialogs are bypassed. In practice I had to get through a theme picker, security notes, a workspace trust prompt (default 'No, exit'), a 'Newer Opus model available' prompt and a Bypass Permissions warning (default 'No, exit'). The model prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose 'No' there so settings would stay unchanged. The banner then showed 'Opus 5.5 · Google Vertex AI'.

**Kind:** bug
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

The HOWTO and launcher say the trust prompt is suppressed and the dialogs are bypassed. In practice I had to get through a theme picker, security notes, a workspace trust prompt (default 'No, exit'), a 'Newer Opus model available' prompt and a Bypass Permissions warning (default 'No, exit'). The model prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose 'No' there so settings would stay unchanged. The banner then showed 'Opus 5.5 · Google Vertex AI'.
