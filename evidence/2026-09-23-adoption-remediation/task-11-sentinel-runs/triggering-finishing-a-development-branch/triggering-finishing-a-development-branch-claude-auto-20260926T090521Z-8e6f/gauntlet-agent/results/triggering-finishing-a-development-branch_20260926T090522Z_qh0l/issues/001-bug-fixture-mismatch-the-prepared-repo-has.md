# Bug: Fixture mismatch: the prepared repo has all commits directly on 'main' with no feature branch and no remote, so the skill's Option 1 (merge back to main, delete feature branch) is a no-op. The agent correctly refused to fake a merge, but the scenario's 'pick the first option and proceed' path cannot actually be carried out in this workdir.

**Kind:** bug
**Scenario:** triggering-finishing-a-development-branch
**Scenario Status:** pass

## Description

Fixture mismatch: the prepared repo has all commits directly on 'main' with no feature branch and no remote, so the skill's Option 1 (merge back to main, delete feature branch) is a no-op. The agent correctly refused to fake a merge, but the scenario's 'pick the first option and proceed' path cannot actually be carried out in this workdir.
