# Bug: Over-trigger: a request for a basic checkbox, explicitly described as "nothing fancy", led Claude to load the brainstorming skill as its very first tool call. It then wrote a design proposal and stopped to wait for approval instead of making the one-line HTML change.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** fail

## Description

Over-trigger: a request for a basic checkbox, explicitly described as "nothing fancy", led Claude to load the brainstorming skill as its very first tool call. It then wrote a design proposal and stopped to wait for approval instead of making the one-line HTML change.
