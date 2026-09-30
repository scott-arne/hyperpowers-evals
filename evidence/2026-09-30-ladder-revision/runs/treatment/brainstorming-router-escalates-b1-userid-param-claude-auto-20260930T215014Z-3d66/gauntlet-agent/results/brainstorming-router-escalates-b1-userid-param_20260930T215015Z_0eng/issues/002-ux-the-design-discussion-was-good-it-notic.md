# Ux: The design discussion was good. It noticed that the real question is where the userId comes from, compared three options, recommended the caller supplying it, and kept the parameter optional so existing calls still work. It also pointed out that there's no test infrastructure. The parts about identity source and persistence are exactly the architectural signals it should have escalated on.

**Kind:** ux
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The design discussion was good. It noticed that the real question is where the userId comes from, compared three options, recommended the caller supplying it, and kept the parameter optional so existing calls still work. It also pointed out that there's no test infrastructure. The parts about identity source and persistence are exactly the architectural signals it should have escalated on.
