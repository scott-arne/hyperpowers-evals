#!/usr/bin/env bash
set -euo pipefail
# Fixture: the base JavaScript repo on `main`, plus a committed two-task plan
# under docs/hyperpowers/plans/. The plan is deliberately small and mechanically
# verifiable so an inline session can finish it well inside the time budget --
# the measurement here is routing, not implementation skill.
#
# The plan is hand-written rather than elicited from writing-plans. The
# elicited-fixture rule in CLAUDE.md exists to keep SDD *cost* comparisons
# honest; this scenario measures which execution path the agent takes, and a
# fixed plan text keeps the control and treatment arms comparing the same input.

setup-helpers run create_base_repo

# The clone path of create_base_repo copies the template's history without a
# local identity, so set one: the agent commits as it executes the plan.
git config user.email 'drill@test.local'
git config user.name 'Drill Test'

mkdir -p docs/hyperpowers/plans
cat > docs/hyperpowers/plans/2026-09-09-config-flags.md <<'PLAN'
# Plan: command-line flag parsing for the CLI entry point

## Goal

`src/index.js` takes no options. Add a small flag parser and cover it with
tests, so options can be added later without hand-rolling argv handling at
every call site.

## Task 1: Add parseFlags

**Files:**
- Create: `src/flags.js`

Create `src/flags.js` exporting `parseFlags(argv)` in CommonJS, matching the
style of `src/utils.js`. It takes an array of arguments already stripped of the
node binary and the script path, and returns a plain object:

- `--name=value` sets `name` to the string `value`.
- `--name` with no `=` sets `name` to `true`.
- An argument that does not start with `--` is collected, in order, under `_`.

`parseFlags([])` returns `{ _: [] }`.

**Verification:**

```
node -e "console.log(require('./src/flags').parseFlags(['--verbose','--out=x','a']))"
```

prints an object equal to `{ _: ['a'], verbose: true, out: 'x' }` (key order
does not matter).

## Task 2: Cover parseFlags with tests

**Files:**
- Create: `test/flags.test.js`
- Modify: `package.json`

Add `test/flags.test.js` using the built-in `node:test` runner and
`node:assert/strict`, with one case per rule in Task 1 plus the empty-argv case.
Add a `"scripts"` entry to `package.json` so `npm test` runs `node --test`.

**Verification:** `npm test` exits 0 and reports every case passing.
PLAN

git add docs/hyperpowers/plans/2026-09-09-config-flags.md
git commit -q -m "Add the config-flags plan"

# Seed a stub codex-plugin-cc with the detached job protocol enabled. The inline
# path can still reach the Codex review gate after a task, and a gate that finds
# no companion (or a companion missing `status`/`result`) degrades or stalls --
# either way it burns the time budget and contaminates a routing measurement.
# The stub's job-protocol result is an approve with no findings, which is the
# cheapest terminal answer the gate can get.
HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
touch "$HOME_DIR/.codex-stub-job-protocol"
setup-helpers run seed_codex_plugin_cc
