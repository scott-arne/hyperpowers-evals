# Bug: The router picked the bounded path for an ambiguous brief about a public interface change. Its reason was that there is a single call site (app.js:23). It did not count the hidden complexity it had itself pointed out: userId doesn't exist anywhere in the app, and the change affects authentication and identity.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router picked the bounded path for an ambiguous brief about a public interface change. Its reason was that there is a single call site (app.js:23). It did not count the hidden complexity it had itself pointed out: userId doesn't exist anywhere in the app, and the change affects authentication and identity.
