# Bug: All Codex review gates (the approach gate and both spec lenses) returned empty responses from the stub companion (0.0.0-stub). The agent recorded this and continued without an independent review. This is expected given the stub, but the preflight check reported 'ok' even though the companion was unusable.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

All Codex review gates (the approach gate and both spec lenses) returned empty responses from the stub companion (0.0.0-stub). The agent recorded this and continued without an independent review. This is expected given the stub, but the preflight check reported 'ok' even though the companion was unusable.
