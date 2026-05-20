#!/usr/bin/env bash
# If the agent dispatched a subagent (the Agent tool), Skill(dispatching-
# parallel-agents) must have fired earlier — the skill is meant to shape
# the dispatch strategy, not annotate it. Vacuous if the agent never
# dispatched (e.g. the QA agent ended the run once the skill loaded).
set -euo pipefail
skill-before-tool superpowers:dispatching-parallel-agents Agent
