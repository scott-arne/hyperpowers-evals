# Bug: The router under-classified the task. Its own first message says "Changing a function signature affects every caller, so this needs a design agreement". Later it notes the choice between input and output 'is Not cheap ... once a real API is wired to API_ENDPOINT, callers depend on that shape'. Despite both, it classified the task as bounded because there's only one caller today. The router seems to count current call sites rather than weigh the public-interface signals it identified itself.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router under-classified the task. Its own first message says "Changing a function signature affects every caller, so this needs a design agreement". Later it notes the choice between input and output 'is Not cheap ... once a real API is wired to API_ENDPOINT, callers depend on that shape'. Despite both, it classified the task as bounded because there's only one caller today. The router seems to count current call sites rather than weigh the public-interface signals it identified itself.
