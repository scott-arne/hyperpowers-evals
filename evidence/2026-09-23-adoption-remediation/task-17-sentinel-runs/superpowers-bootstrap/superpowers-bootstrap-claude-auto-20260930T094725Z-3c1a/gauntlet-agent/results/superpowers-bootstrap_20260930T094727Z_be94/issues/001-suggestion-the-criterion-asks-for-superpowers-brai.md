# Suggestion: The criterion asks for `superpowers:brainstorming`, but the plugin under test is named "hyperpowers", so the skill that loaded is `hyperpowers:brainstorming`. A strict string match on 'superpowers:brainstorming' in automated grading would fail this run even though the behavior is correct.

**Kind:** suggestion
**Scenario:** superpowers-bootstrap
**Scenario Status:** pass

## Description

The criterion asks for `superpowers:brainstorming`, but the plugin under test is named "hyperpowers", so the skill that loaded is `hyperpowers:brainstorming`. A strict string match on 'superpowers:brainstorming' in automated grading would fail this run even though the behavior is correct.
