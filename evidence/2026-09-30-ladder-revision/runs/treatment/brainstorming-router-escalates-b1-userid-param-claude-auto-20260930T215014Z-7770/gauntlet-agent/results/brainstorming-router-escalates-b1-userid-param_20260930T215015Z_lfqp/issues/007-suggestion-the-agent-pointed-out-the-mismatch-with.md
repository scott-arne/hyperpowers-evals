# Suggestion: The agent pointed out the mismatch with the original request: the final design adds no userId parameter, because the ID is an output of login rather than an input. It recorded this in the spec rather than silently changing the request, which is good practice.

**Kind:** suggestion
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The agent pointed out the mismatch with the original request: the final design adds no userId parameter, because the ID is an output of login rather than an input. It recorded this in the spec rather than silently changing the request, which is good practice.
