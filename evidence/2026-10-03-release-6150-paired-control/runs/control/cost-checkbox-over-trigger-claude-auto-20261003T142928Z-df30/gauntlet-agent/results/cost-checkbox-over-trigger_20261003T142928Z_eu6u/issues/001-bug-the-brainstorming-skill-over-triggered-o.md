# Bug: The brainstorming skill over-triggered on an obviously trivial request. The user said "Just a basic checkbox with on/off state, nothing fancy", and loading `hyperpowers:brainstorming` was the agent's very first tool call, before it had even looked at the repo.

**Kind:** bug
**Scenario:** cost-checkbox-over-trigger
**Scenario Status:** fail

## Description

The brainstorming skill over-triggered on an obviously trivial request. The user said "Just a basic checkbox with on/off state, nothing fancy", and loading `hyperpowers:brainstorming` was the agent's very first tool call, before it had even looked at the repo.
