# Bug: Namespace mismatch vs. the story: the skill loaded is `hyperpowers:brainstorming`, not `superpowers:brainstorming`. Behaviorally equivalent (same plugin root, hyperpowers worktree), but if any tooling matches on the literal `superpowers:` prefix it will miss this.

**Kind:** bug
**Scenario:** superpowers-bootstrap
**Scenario Status:** pass

## Description

Namespace mismatch vs. the story: the skill loaded is `hyperpowers:brainstorming`, not `superpowers:brainstorming`. Behaviorally equivalent (same plugin root, hyperpowers worktree), but if any tooling matches on the literal `superpowers:` prefix it will miss this.
