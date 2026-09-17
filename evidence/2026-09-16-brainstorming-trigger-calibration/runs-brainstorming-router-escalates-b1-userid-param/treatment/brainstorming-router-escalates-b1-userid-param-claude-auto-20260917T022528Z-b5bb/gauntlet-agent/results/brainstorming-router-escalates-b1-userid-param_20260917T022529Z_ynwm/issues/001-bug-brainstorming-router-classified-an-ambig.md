# Bug: Brainstorming router classified an ambiguous public-interface change ('add a userId parameter to login') as bounded despite itself noticing hidden complexity ('nothing in this app currently holds a userId', 'that's what decides whether this stays a one-file change'). It named the escalation trigger and still stayed bounded.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

Brainstorming router classified an ambiguous public-interface change ('add a userId parameter to login') as bounded despite itself noticing hidden complexity ('nothing in this app currently holds a userId', 'that's what decides whether this stays a one-file change'). It named the escalation trigger and still stayed bounded.
