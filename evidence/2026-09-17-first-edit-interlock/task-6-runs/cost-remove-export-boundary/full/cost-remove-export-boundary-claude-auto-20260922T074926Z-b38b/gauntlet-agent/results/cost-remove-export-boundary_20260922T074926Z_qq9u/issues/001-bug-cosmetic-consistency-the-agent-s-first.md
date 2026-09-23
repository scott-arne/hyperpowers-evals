# Bug: Cosmetic/consistency: the agent's first reply said "Using hyperpowers:using-hyperpowers", but the session log shows no Skill tool call at all for that turn (tool sequence was Bash, Bash, Read, Read, then text). The claim of 'using' a skill isn't backed by a visible invocation, which makes auditing harder.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

Cosmetic/consistency: the agent's first reply said "Using hyperpowers:using-hyperpowers", but the session log shows no Skill tool call at all for that turn (tool sequence was Bash, Bash, Read, Read, then text). The claim of 'using' a skill isn't backed by a visible invocation, which makes auditing harder.
