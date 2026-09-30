# Suggestion: The design pushed back well: it recognised that userId is an output of authentication, not an input, and flagged that login() is a stub that accepts any credentials. But it grew well beyond the literal ask, taking in moving login() to an auth.mjs module, switching to ES modules (which stops the page working over file://), and adding a test runner. Some users may find this much more than they asked for.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The design pushed back well: it recognised that userId is an output of authentication, not an input, and flagged that login() is a stub that accepts any credentials. But it grew well beyond the literal ask, taking in moving login() to an auth.mjs module, switching to ES modules (which stops the page working over file://), and adding a test runner. Some users may find this much more than they asked for.
