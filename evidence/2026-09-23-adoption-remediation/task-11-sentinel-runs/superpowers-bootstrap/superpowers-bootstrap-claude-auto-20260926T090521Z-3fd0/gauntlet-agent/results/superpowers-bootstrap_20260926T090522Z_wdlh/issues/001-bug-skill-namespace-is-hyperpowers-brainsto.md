# Bug: Skill namespace is `hyperpowers:brainstorming`, not `superpowers:brainstorming` as the acceptance criterion states. The staged plugin's plugin.json declares name "hyperpowers" (fork/rename). Same skill content, but any automated grader matching the literal string 'superpowers:brainstorming' would report a false failure.

**Kind:** bug
**Scenario:** superpowers-bootstrap
**Scenario Status:** pass

## Description

Skill namespace is `hyperpowers:brainstorming`, not `superpowers:brainstorming` as the acceptance criterion states. The staged plugin's plugin.json declares name "hyperpowers" (fork/rename). Same skill content, but any automated grader matching the literal string 'superpowers:brainstorming' would report a false failure.
