# Bug: Small rendering glitch in the chat design: the backtick template literal `user-${username}` broke the inline-code formatting. The design text came out as 'const userId = \user-${username}`with a comment that the real app reads this from theAPI_ENDPOINT` response', with spaces missing and code formatting swapped.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Small rendering glitch in the chat design: the backtick template literal `user-${username}` broke the inline-code formatting. The design text came out as 'const userId = \user-${username}`with a comment that the real app reads this from theAPI_ENDPOINT` response', with spaces missing and code formatting swapped.
