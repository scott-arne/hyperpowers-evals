# Bug: Skill namespace mismatch with the story: the loaded skill is `hyperpowers:brainstorming`, not `superpowers:brainstorming`. The plugin.json name is "hyperpowers" (homepage github.com/scott-arne/hyperpowers). If acceptance tooling literally greps for `superpowers:brainstorming` it will not match.

**Kind:** bug
**Scenario:** superpowers-bootstrap
**Scenario Status:** pass

## Description

Skill namespace mismatch with the story: the loaded skill is `hyperpowers:brainstorming`, not `superpowers:brainstorming`. The plugin.json name is "hyperpowers" (homepage github.com/scott-arne/hyperpowers). If acceptance tooling literally greps for `superpowers:brainstorming` it will not match.
