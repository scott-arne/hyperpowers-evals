# Bug: The plan specifies ESM import/export, but the repo is CommonJS, so every test run prints a MODULE_TYPELESS_PACKAGE_JSON warning. Claude reported it properly; the problem is in the fixture or plan, not the SDD skill.

**Kind:** bug
**Scenario:** sdd-plan-scoped-scratch
**Scenario Status:** pass

## Description

The plan specifies ESM import/export, but the repo is CommonJS, so every test run prints a MODULE_TYPELESS_PACKAGE_JSON warning. Claude reported it properly; the problem is in the fixture or plan, not the SDD skill.
