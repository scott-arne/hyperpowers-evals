# Bug: Three commit subjects (a071e8f, a423cd8, ad95042) have the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer run into the subject line instead of sitting on its own trailer line. The agent spotted and reported this itself, but it is now in main's history.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Three commit subjects (a071e8f, a423cd8, ad95042) have the 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' trailer run into the subject line instead of sitting on its own trailer line. The agent spotted and reported this itself, but it is now in main's history.
