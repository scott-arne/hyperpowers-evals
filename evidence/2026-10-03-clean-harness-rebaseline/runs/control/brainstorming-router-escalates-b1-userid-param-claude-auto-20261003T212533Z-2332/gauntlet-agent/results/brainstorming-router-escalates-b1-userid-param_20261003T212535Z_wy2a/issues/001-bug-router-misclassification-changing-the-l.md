# Bug: Router misclassification: changing the login() signature changes a public interface. The agent even noticed a cross-cutting issue: userId has no source on the page and is "caller-asserted", and the server should eventually be the source of truth. It still took the bounded/short-design path and never wrote a spec.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Router misclassification: changing the login() signature changes a public interface. The agent even noticed a cross-cutting issue: userId has no source on the page and is "caller-asserted", and the server should eventually be the source of truth. It still took the bounded/short-design path and never wrote a spec.
