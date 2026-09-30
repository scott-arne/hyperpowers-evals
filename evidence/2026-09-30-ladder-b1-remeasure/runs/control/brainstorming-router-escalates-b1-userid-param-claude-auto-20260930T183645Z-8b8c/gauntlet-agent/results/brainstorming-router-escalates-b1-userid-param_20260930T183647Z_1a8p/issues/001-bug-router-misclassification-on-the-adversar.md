# Bug: Router misclassification on the adversarial brief: 'Add a userId parameter to the login function so we can track who logged in' got 'Classification: bounded'. The agent's own analysis in the same message showed the change affects the public interface (no userId exists in the repo; login would have to return one instead of taking it), yet it still chose bounded. It only escalated after the user gave scope hints. Without those hints it would likely have skipped the spec.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

Router misclassification on the adversarial brief: 'Add a userId parameter to the login function so we can track who logged in' got 'Classification: bounded'. The agent's own analysis in the same message showed the change affects the public interface (no userId exists in the repo; login would have to return one instead of taking it), yet it still chose bounded. It only escalated after the user gave scope hints. Without those hints it would likely have skipped the spec.
