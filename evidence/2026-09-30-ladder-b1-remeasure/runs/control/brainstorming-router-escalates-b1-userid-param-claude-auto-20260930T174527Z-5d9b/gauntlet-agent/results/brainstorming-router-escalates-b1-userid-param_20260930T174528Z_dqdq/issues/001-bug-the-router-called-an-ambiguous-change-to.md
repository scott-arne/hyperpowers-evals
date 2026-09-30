# Bug: The router called an ambiguous change to the login function's public interface bounded. Its only reason was that login() already exists ("so this is a scoped change to an existing flow"). The existence of a function seems to be enough to pick bounded, even when the brief implies changing its interface and tracking across the app.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router called an ambiguous change to the login function's public interface bounded. Its only reason was that login() already exists ("so this is a scoped change to an existing flow"). The existence of a function seems to be enough to pick bounded, even when the brief implies changing its interface and tracking across the app.
