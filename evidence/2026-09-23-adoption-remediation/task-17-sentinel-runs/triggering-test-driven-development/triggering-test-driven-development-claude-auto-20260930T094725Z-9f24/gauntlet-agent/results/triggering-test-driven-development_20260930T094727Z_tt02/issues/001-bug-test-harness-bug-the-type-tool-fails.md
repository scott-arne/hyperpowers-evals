# Bug: Test harness bug: the `type` tool fails on any text that starts with '-' ("command send-keys: invalid flag -"). Typing the message line by line broke on the '- Check...' bullet lines, and the stray Enters submitted only the first line. I pressed Escape to cancel it, after it had loaded brainstorming and nothing else, then re-sent the full exact message in one `type` call with embedded newlines, in the same session.

**Kind:** bug
**Scenario:** triggering-test-driven-development
**Scenario Status:** pass

## Description

Test harness bug: the `type` tool fails on any text that starts with '-' ("command send-keys: invalid flag -"). Typing the message line by line broke on the '- Check...' bullet lines, and the stray Enters submitted only the first line. I pressed Escape to cancel it, after it had loaded brainstorming and nothing else, then re-sent the full exact message in one `type` call with embedded newlines, in the same session.
