# Suggestion: The agent treated a change as small because of how few files it touches. Consider checking the router's heuristic for this: a signature change to a public function, plus a stated goal of tracking identity, should count toward the architectural path even when the call sites are local today.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The agent treated a change as small because of how few files it touches. Consider checking the router's heuristic for this: a signature change to a public function, plus a stated goal of tracking identity, should count toward the architectural path even when the call sites are local today.
