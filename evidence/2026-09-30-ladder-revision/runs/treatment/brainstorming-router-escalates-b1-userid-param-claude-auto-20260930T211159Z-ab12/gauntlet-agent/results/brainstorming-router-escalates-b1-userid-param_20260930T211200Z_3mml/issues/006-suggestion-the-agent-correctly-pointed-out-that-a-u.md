# Suggestion: The agent correctly pointed out that a userId parameter on login is the wrong shape (login establishes identity; the caller has nothing to pass). It kept login(username, password) as-is and recorded the departure from the literal request in the spec. This was good pushback.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The agent correctly pointed out that a userId parameter on login is the wrong shape (login establishes identity; the caller has nothing to pass). It kept login(username, password) as-is and recorded the departure from the literal request in the spec. This was good pushback.
