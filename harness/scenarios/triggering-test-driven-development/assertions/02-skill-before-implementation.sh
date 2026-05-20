#!/usr/bin/env bash
# If the agent reached for Edit or Write, Skill(test-driven-development)
# must have fired earlier. Passing runs typically stop when the skill
# loads, so this tends to pass vacuously; the real failure mode it
# catches is writing the implementation before consulting the skill.
set -euo pipefail
skill-before-tool superpowers:test-driven-development Edit
skill-before-tool superpowers:test-driven-development Write
