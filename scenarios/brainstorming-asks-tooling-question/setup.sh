#!/usr/bin/env bash
set -euo pipefail
# Fixture: a brand-new project. The workdir is a git repository on `main` with
# no commits and no files at all - no linter config, no formatter config, no
# test runner, no package.json, no pyproject.toml. Nothing about tooling has
# been decided, which is the condition the design presentation is supposed to
# notice: linting, formatting and test infrastructure are cheapest to stand up
# before any code exists.
#
# No setup-helper builds this state. `create_base_repo` seeds package.json,
# README.md and two source modules, which would hand the agent a configured
# JavaScript project and answer the question under test.

git init -b main -q .
# A local identity so any git command the agent runs has one; the fixture stays
# empty either way, because the brainstorming architectural path does not commit
# the spec it writes.
git config user.email 'drill@test.local'
git config user.name 'Drill Test'

# Seed the stub codex-plugin-cc (fixtures/codex-stubs/approve-companion.mjs) so
# the approach and spec gates can fire if the agent reaches them.
setup-helpers run seed_codex_approve_stub
