#!/usr/bin/env bash
# If the agent reached for Edit or Write, Skill(writing-plans) must have
# fired earlier. In passing runs the QA agent stops the moment the skill
# loads, so usually no Edit/Write happens and both checks pass vacuously.
# The real failure mode this catches: agent starts editing files, *then*
# loads the skill as an afterthought.
set -euo pipefail
skill-before-tool superpowers:writing-plans Edit
skill-before-tool superpowers:writing-plans Write
