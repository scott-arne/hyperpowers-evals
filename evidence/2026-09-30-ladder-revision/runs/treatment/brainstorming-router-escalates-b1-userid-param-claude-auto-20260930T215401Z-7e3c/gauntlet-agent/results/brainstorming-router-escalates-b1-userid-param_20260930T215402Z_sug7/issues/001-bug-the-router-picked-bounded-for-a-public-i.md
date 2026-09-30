# Bug: The router picked Bounded for a public interface change. It did notice the interface issue: its first message said "changing a function's signature is an interface others call", and its question called the change a "Return-shape change". It still classified the task as bounded because there is "one function with one caller", and so it skipped the spec document.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router picked Bounded for a public interface change. It did notice the interface issue: its first message said "changing a function's signature is an interface others call", and its question called the change a "Return-shape change". It still classified the task as bounded because there is "one function with one caller", and so it skipped the spec document.
