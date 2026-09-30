# Bug: The router did not escalate. The brief asks to change login()'s public signature and to track logins, which suggests persistence and use across the app. The router picked bounded because login() has only one caller today. It did notice the interface concern itself ("Not cheap: the parameter position and whether userId is an input or an output — that's the callers' contract, and reversing it later means touching every call site"), but it did not escalate on that basis.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router did not escalate. The brief asks to change login()'s public signature and to track logins, which suggests persistence and use across the app. The router picked bounded because login() has only one caller today. It did notice the interface concern itself ("Not cheap: the parameter position and whether userId is an input or an output — that's the callers' contract, and reversing it later means touching every call site"), but it did not escalate on that basis.
