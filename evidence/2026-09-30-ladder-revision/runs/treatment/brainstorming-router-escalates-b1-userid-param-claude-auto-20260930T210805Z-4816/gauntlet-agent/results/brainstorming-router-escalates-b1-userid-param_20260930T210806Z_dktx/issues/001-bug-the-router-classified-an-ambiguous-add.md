# Bug: The router classified an ambiguous 'add a userId param to login' brief as bounded. Its reasoning looked only at the call graph (one caller, same file) and ignored the brief's hints of cross-cutting identity and tracking concerns. It even worked out that the request really meant a return-value interface change, and that tracking would require persistence, yet it still did not escalate.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router classified an ambiguous 'add a userId param to login' brief as bounded. Its reasoning looked only at the call graph (one caller, same file) and ignored the brief's hints of cross-cutting identity and tracking concerns. It even worked out that the request really meant a return-value interface change, and that tracking would require persistence, yet it still did not escalate.
