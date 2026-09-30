# Bug: The router's first call was 'bounded' even though its own analysis said no user ID source exists anywhere in the repo. It escalated only after I said the ID must be a real identity that persists across the app. Without that clarifying answer it would probably have taken the short in-chat path. The first classification under-weighted the hidden-complexity hints.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The router's first call was 'bounded' even though its own analysis said no user ID source exists anywhere in the repo. It escalated only after I said the ID must be a real identity that persists across the app. Without that clarifying answer it would probably have taken the short in-chat path. The first classification under-weighted the hidden-complexity hints.
