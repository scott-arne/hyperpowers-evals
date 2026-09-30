# Bug: Possible logic issue in the proposed snippet: `cut.replace(/\s\S*$/, "")` removes the last word of the cut even when the character at the budget position is a space, i.e. when the cut already falls exactly on a word boundary. That drops a whole word it didn't need to. I spotted this in the design text only; I did not test it.

**Kind:** bug
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

Possible logic issue in the proposed snippet: `cut.replace(/\s\S*$/, "")` removes the last word of the cut even when the character at the budget position is a space, i.e. when the cut already falls exactly on a word boundary. That drops a whole word it didn't need to. I spotted this in the design text only; I did not test it.
