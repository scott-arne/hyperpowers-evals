# Suggestion: The design itself was thoughtful. It suggested returning userId from login() instead of adding a parameter, which avoided changing the signature. That may be why it felt bounded, but it quietly changed the public return shape of login(), and the brief also hinted at cross-app tracking. It never asked whether tracking needs to persist or be used by other forms.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The design itself was thoughtful. It suggested returning userId from login() instead of adding a parameter, which avoided changing the signature. That may be why it felt bounded, but it quietly changed the public return shape of login(), and the brief also hinted at cross-app tracking. It never asked whether tracking needs to persist or be used by other forms.
