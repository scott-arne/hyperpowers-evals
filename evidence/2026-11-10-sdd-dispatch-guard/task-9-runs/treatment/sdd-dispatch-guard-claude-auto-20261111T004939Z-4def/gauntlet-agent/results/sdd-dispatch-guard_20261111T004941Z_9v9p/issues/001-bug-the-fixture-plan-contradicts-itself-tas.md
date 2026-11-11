# Bug: The fixture plan contradicts itself. Task 1's code uses len(text.split(" ")), but design.md requires splitting on any whitespace, and Task 2's own test ("one two\nthree four" -> 4 words) can't pass with Task 1 as written. The agent caught this up front and asked which should govern.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

The fixture plan contradicts itself. Task 1's code uses len(text.split(" ")), but design.md requires splitting on any whitespace, and Task 2's own test ("one two\nthree four" -> 4 words) can't pass with Task 1 as written. The agent caught this up front and asked which should govern.
