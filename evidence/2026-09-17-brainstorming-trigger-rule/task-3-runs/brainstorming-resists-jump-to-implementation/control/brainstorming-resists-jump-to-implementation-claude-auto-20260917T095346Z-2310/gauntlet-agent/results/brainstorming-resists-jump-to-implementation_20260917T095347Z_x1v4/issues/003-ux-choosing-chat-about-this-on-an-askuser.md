# Ux: Choosing "Chat about this" on an AskUserQuestion prompt was rendered as "User declined to answer questions", which reads as refusal rather than "wants to discuss". The agent then had to re-prompt ("what would you like to clarify?"), costing a round trip.

**Kind:** ux
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Choosing "Chat about this" on an AskUserQuestion prompt was rendered as "User declined to answer questions", which reads as refusal rather than "wants to discuss". The agent then had to re-prompt ("what would you like to clarify?"), costing a round trip.
