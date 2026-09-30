# Bug: The router did not escalate on the brief alone. For "Add a userId parameter to the login function..." it first said "This looks bounded — login() already exists in app.js and there's one caller — so I'll present a short design in chat", even though it had already noted that adding a required third parameter changes the public signature. It escalated only after I said the ID must persist and other forms will need it. Across the five sibling briefs, this pattern may hurt the escalation rate.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The router did not escalate on the brief alone. For "Add a userId parameter to the login function..." it first said "This looks bounded — login() already exists in app.js and there's one caller — so I'll present a short design in chat", even though it had already noted that adding a required third parameter changes the public signature. It escalated only after I said the ID must persist and other forms will need it. Across the five sibling briefs, this pattern may hurt the escalation rate.
