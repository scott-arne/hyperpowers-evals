# Bug: The Codex companion review integration produced empty results twice. Agent reported: "Codex was available (preflight ok), but the call came back empty — no usable approaches" at the approach gate, and at the spec gate "Both captures came back as an empty {} payload, which verdict-normalize --require-coverage classifies as incomplete — no verdict, no findings ... companion version 0.0.0-stub". So the Codex review gate never actually completed in this run.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b4-reusable-validation
**Scenario Status:** pass

## Description

The Codex companion review integration produced empty results twice. Agent reported: "Codex was available (preflight ok), but the call came back empty — no usable approaches" at the approach gate, and at the spec gate "Both captures came back as an empty {} payload, which verdict-normalize --require-coverage classifies as incomplete — no verdict, no findings ... companion version 0.0.0-stub". So the Codex review gate never actually completed in this run.
