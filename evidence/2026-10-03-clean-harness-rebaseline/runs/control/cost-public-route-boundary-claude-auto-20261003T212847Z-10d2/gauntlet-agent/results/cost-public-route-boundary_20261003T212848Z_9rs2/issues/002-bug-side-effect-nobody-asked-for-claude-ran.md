# Bug: Side effect nobody asked for: Claude ran `npm i` for its smoke test. That left an untracked node_modules/ and package-lock.json in the working tree (612+ files changed according to the Claude Code diff view), and its summary did not mention them.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

Side effect nobody asked for: Claude ran `npm i` for its smoke test. That left an untracked node_modules/ and package-lock.json in the working tree (612+ files changed according to the Claude Code diff view), and its summary did not mention them.
