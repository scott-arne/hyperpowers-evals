# Bug: The router classified 'Add a userId parameter to the login function' as bounded because login() has only one caller today. In the same message, Claude said the choice would change a 'public-ish signature' and would be 'hard to remove once other call sites appear'. It named the architectural risk itself but still skipped the spec-doc path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router classified 'Add a userId parameter to the login function' as bounded because login() has only one caller today. In the same message, Claude said the choice would change a 'public-ish signature' and would be 'hard to remove once other call sites appear'. It named the architectural risk itself but still skipped the spec-doc path.
