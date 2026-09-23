# Bug: Skill is namespaced `hyperpowers:brainstorming`, not `superpowers:brainstorming` as the acceptance criterion states. Behaviorally equivalent (same brainstorming skill from the staged plugin dir), but the naming mismatch could break automated graders that match on the `superpowers:` prefix.

**Kind:** bug
**Scenario:** superpowers-bootstrap
**Scenario Status:** pass

## Description

Skill is namespaced `hyperpowers:brainstorming`, not `superpowers:brainstorming` as the acceptance criterion states. Behaviorally equivalent (same brainstorming skill from the staged plugin dir), but the naming mismatch could break automated graders that match on the `superpowers:` prefix.
