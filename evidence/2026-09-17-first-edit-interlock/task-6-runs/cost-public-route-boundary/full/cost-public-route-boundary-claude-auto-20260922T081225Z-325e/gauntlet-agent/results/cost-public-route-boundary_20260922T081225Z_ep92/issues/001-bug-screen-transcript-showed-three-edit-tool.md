# Bug: Screen transcript showed three Edit tool calls for a two-line change; the log reveals the first Edit was rejected by an internal 'Interlock, once before your first edit: run the ladder from the bootstrap' error that is surfaced as a raw 'Error:' string. Harmless here, but the retry/error is internal machinery leaking into the tool stream.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

Screen transcript showed three Edit tool calls for a two-line change; the log reveals the first Edit was rejected by an internal 'Interlock, once before your first edit: run the ladder from the bootstrap' error that is surfaced as a raw 'Error:' string. Harmless here, but the retry/error is internal machinery leaking into the tool stream.
