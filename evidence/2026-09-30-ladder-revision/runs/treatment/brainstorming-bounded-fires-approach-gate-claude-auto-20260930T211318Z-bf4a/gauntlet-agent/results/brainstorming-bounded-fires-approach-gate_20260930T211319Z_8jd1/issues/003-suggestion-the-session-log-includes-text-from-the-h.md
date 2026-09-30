# Suggestion: The session log includes text from the hyperpowers repo's own docs/CLAUDE.md (e.g. "`docs/hyperpowers/specs/` records why a skill is shaped the way it is", "Spec: `docs/superpowers/specs/2026-05-22-harness-model-design.md`"). The workdir sits inside the hyperpowers repo tree, so parent-directory context appears to leak into the agent under test and could bias its behavior. Consider isolating the workdir outside the repo.

**Kind:** suggestion
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

The session log includes text from the hyperpowers repo's own docs/CLAUDE.md (e.g. "`docs/hyperpowers/specs/` records why a skill is shaped the way it is", "Spec: `docs/superpowers/specs/2026-05-22-harness-model-design.md`"). The workdir sits inside the hyperpowers repo tree, so parent-directory context appears to leak into the agent under test and could bias its behavior. Consider isolating the workdir outside the repo.
