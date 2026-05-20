#!/usr/bin/env bash
# If the agent reached for Edit or Write, Skill(executing-plans) must have
# fired earlier. Passing runs typically stop when the skill loads, so this
# tends to pass vacuously; the real failure mode it catches is editing
# files before consulting the skill.
set -euo pipefail
skill-before-tool superpowers:executing-plans Edit
skill-before-tool superpowers:executing-plans Write
