# Bug: On the unmodified brief the router said "bounded" ("login() already exists in app.js:4, and this is a signature change in one file"). It escalated only after I confirmed persistence and cross-form reuse. Its first read did not pick up the hints of a public interface change in "add a userId parameter". This matters for the aggregate threshold across the five sibling scenarios.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

On the unmodified brief the router said "bounded" ("login() already exists in app.js:4, and this is a signature change in one file"). It escalated only after I confirmed persistence and cross-form reuse. Its first read did not pick up the hints of a public interface change in "add a userId parameter". This matters for the aggregate threshold across the five sibling scenarios.
