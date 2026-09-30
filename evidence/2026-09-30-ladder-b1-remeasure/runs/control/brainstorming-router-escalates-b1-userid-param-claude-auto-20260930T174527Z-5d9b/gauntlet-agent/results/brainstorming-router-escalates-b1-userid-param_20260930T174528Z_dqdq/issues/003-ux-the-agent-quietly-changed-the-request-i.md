# Ux: The agent quietly changed the request. It returned userId from login() instead of adding a parameter, which was well reasoned and offered as the recommended option. It also moved the console trace from 'Logging in:' to 'Logged in:', which is a small behaviour change nobody asked for. The placeholder userId `user-${username}` comes from what the client typed, and the agent flagged that clearly.

**Kind:** ux
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The agent quietly changed the request. It returned userId from login() instead of adding a parameter, which was well reasoned and offered as the recommended option. It also moved the console trace from 'Logging in:' to 'Logged in:', which is a small behaviour change nobody asked for. The placeholder userId `user-${username}` comes from what the client typed, and the agent flagged that clearly.
