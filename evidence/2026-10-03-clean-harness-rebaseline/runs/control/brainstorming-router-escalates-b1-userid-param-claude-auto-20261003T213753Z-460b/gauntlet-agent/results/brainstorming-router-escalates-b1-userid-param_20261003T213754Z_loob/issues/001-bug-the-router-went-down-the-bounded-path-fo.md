# Bug: The router went down the bounded path for a brief that changes a public function signature (login(username, password) becomes login(username, password, userId)) and touches both index.html and app.js. It never announced a classification. It only presented a "short design" with no spec document.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router went down the bounded path for a brief that changes a public function signature (login(username, password) becomes login(username, password, userId)) and touches both index.html and app.js. It never announced a classification. It only presented a "short design" with no spec document.
