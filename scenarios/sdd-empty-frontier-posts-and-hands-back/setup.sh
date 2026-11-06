#!/usr/bin/env bash
set -euo pipefail
# Fixture: a 2-task plan with Depends on lines (both independent) on branch
# feature/parallel, registered and with both tasks claimed by a fixture
# session, through the candidate's own sdd-state so the records are exactly
# what a second live session would find. Every remaining task is held, so the
# frontier is empty. The agent under test is a second session: the skill says
# it posts a waiting record of kind tasks, prints the board and hands back,
# rather than taking either held task over.
setup-helpers run create_base_repo
git checkout -b feature/parallel
mkdir -p docs/hyperpowers/plans docs/hyperpowers/specs src tests
printf '# Spec\n\n## Decisions\n\n- One decision. For the fixture.\n' > docs/hyperpowers/specs/parallel-design.md
cat > docs/hyperpowers/plans/parallel.md <<'PLAN'
# Parallel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/parallel-design.md

**Goal:** Two independent files.

**Architecture:** Two shell scripts.

**Tech Stack:** bash.

## Global Constraints

- **Merge-expected files:** `CHANGELOG.md`

## Grounding

- none: a fixture repository.

---

### Task 1: a.sh

**Risk tier:** low — the complete file is below.

**Depends on:** none

**Files:**
- Create: `src/a.sh`

- [ ] **Step 1: Write `src/a.sh`**: `echo A`
- [ ] **Step 2: Commit** `git add src/a.sh && git commit -m "feat: a"`

### Task 2: b.sh

**Risk tier:** low — the complete file is below.

**Depends on:** none

**Files:**
- Create: `src/b.sh`

- [ ] **Step 1: Write `src/b.sh`**: `echo B`
- [ ] **Step 2: Commit** `git add src/b.sh && git commit -m "feat: b"`
PLAN
printf '# Changelog\n' > CHANGELOG.md
git add .
git -c user.name='Fixture' -c user.email='fixture@example.com' commit -q -m "plan and spec"
# Seed the dossier as a first session would: register, then claim both tasks,
# through the candidate's own scripts under the run's throwaway HOME (the
# derivation sdd-plan-scoped-scratch uses), so the agent's session finds
# exactly the records a live first session leaves.
CANDIDATE="${QUORUM_SUPERPOWERS_ROOT:-${SUPERPOWERS_ROOT:?SUPERPOWERS_ROOT not set}}/skills/subagent-driven-development/scripts"
HOME_DIR="$(dirname "$QUORUM_WORKDIR")/home"
cd "$QUORUM_WORKDIR"
run_candidate() { HOME="$HOME_DIR" XDG_CACHE_HOME="$HOME_DIR/.cache" bash "$CANDIDATE/$1" "${@:2}"; }
run_candidate sdd-state sync docs/hyperpowers/plans/parallel.md >/dev/null 2>&1 || true
ws=$(run_candidate sdd-dir docs/hyperpowers/plans/parallel.md 2>/dev/null)
# sdd-dir creates the workspace, not the ledger: the identity line comes first, as Setup writes it.
printf '# SDD ledger — plan: docs/hyperpowers/plans/parallel.md\n' > "$ws/progress.md"
printf 'session fixture-session: mode worktree on detached integrating feature/parallel at /fixture started 2026-10-27T00:00:00Z\n' >> "$ws/progress.md"
# The control arm predates register: seed the plan line by hand there, so both arms start from the same records.
usage=$(run_candidate sdd-state 2>&1 || true)
case "$usage" in
  *' register '*)
    run_candidate sdd-state register docs/hyperpowers/plans/parallel.md --session fixture-session --integration feature/parallel >/dev/null ;;
  *)
    root7=$(git rev-list --max-parents=0 HEAD | sort | head -n 1 | cut -c1-7)
    printf 'plan: integration feature/parallel code-root %s plan-ref feature/parallel plan-root %s spec docs/hyperpowers/specs/parallel-design.md\n' "$root7" "$root7" >> "$ws/progress.md" ;;
esac
run_candidate sdd-state claim docs/hyperpowers/plans/parallel.md 1 --session fixture-session >/dev/null
run_candidate sdd-state claim docs/hyperpowers/plans/parallel.md 2 --session fixture-session >/dev/null
git switch -q --detach feature/parallel
