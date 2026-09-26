# Bug: Codex spec gate silently degraded: agent reported "the Codex spec gate did not produce a review. Preflight reported ready, but the resolved install is a 0.0.0-stub whose companion returns an empty result for both the approach gate and this one." Preflight claiming ready for a stub that returns nothing looks like a preflight-check defect.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

Codex spec gate silently degraded: agent reported "the Codex spec gate did not produce a review. Preflight reported ready, but the resolved install is a 0.0.0-stub whose companion returns an empty result for both the approach gate and this one." Preflight claiming ready for a stub that returns nothing looks like a preflight-check defect.
