#!/usr/bin/env bash
# Task 13 Step 1 (plan 2026-10-27-parallel-development): the throwaway
# repository, its spec and three-task plan, and the two Claude configurations.
set -u
CAND=/Users/johnss51/Development/agents/hyperpowers/.worktrees/parallel-development
R=~/.cache/hyperpowers/parallel-live/repo; rm -rf "$R"; mkdir -p "$R"; git -C "$R" init -q -b main
git -C "$R" commit -q --allow-empty -m init
mkdir -p "$R/docs/hyperpowers/specs" "$R/docs/hyperpowers/plans" "$R/src" "$R/tests"
printf '# Live spec\n\n## Decisions\n\n- Two files are written by two sessions. Decided for the live run.\n' > "$R/docs/hyperpowers/specs/2026-10-27-live-design.md"
cat > "$R/docs/hyperpowers/plans/2026-10-27-live.md" <<'PLAN'
# Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/2026-10-27-live-design.md

**Goal:** Two independent files and one that reads both.

**Architecture:** Three shell scripts.

**Tech Stack:** bash.

## Global Constraints

- **Merge-expected files:** `CHANGELOG.md`

## Grounding

- none: a throwaway repository.

---

### Task 1: a.sh

**Risk tier:** standard — a script and its test, both given in full.

**Depends on:** none

**Files:**
- Create: `src/a.sh`
- Test: `tests/test-a.sh`

- [ ] **Step 1: Write the failing test** `tests/test-a.sh`: `#!/usr/bin/env bash` then `[ "$(bash src/a.sh)" = A ] && echo PASS || { echo FAIL; exit 1; }`
- [ ] **Step 2: Run it** (fails: no src/a.sh)
- [ ] **Step 3: Write `src/a.sh`**: `#!/usr/bin/env bash` then `echo A`
- [ ] **Step 4: Run it** (PASS)
- [ ] **Step 5: Commit** `git add src/a.sh tests/test-a.sh && git commit -m "feat: a"`

### Task 2: b.sh

**Risk tier:** standard — a script and its test, both given in full.

**Depends on:** none

**Files:**
- Create: `src/b.sh`
- Test: `tests/test-b.sh`

- [ ] **Step 1: Write the failing test** `tests/test-b.sh`: `[ "$(bash src/b.sh)" = B ] && echo PASS || { echo FAIL; exit 1; }`
- [ ] **Step 2: Run it** (fails)
- [ ] **Step 3: Write `src/b.sh`**: `echo B`
- [ ] **Step 4: Run it** (PASS)
- [ ] **Step 5: Commit** `git add src/b.sh tests/test-b.sh && git commit -m "feat: b"`

### Task 3: ab.sh

**Risk tier:** standard — a script and its test, both given in full.

**Depends on:** Task 1, Task 2

**Files:**
- Create: `src/ab.sh`
- Test: `tests/test-ab.sh`

- [ ] **Step 1: Write the failing test** `tests/test-ab.sh`: `[ "$(bash src/ab.sh)" = AB ] && echo PASS || { echo FAIL; exit 1; }`
- [ ] **Step 2: Run it** (fails)
- [ ] **Step 3: Write `src/ab.sh`**: `printf '%s%s\n' "$(bash src/a.sh)" "$(bash src/b.sh)"`
- [ ] **Step 4: Run it** (PASS)
- [ ] **Step 5: Commit** `git add src/ab.sh tests/test-ab.sh && git commit -m "feat: ab"`
PLAN
printf '# Changelog\n' > "$R/CHANGELOG.md"; git -C "$R" add .; git -C "$R" commit -qm "spec and plan"
for n in 1 2; do C=~/.cache/hyperpowers/parallel-live/config-$n; rm -rf "$C"; mkdir -p "$C"; cp ~/.claude/settings.json "$C/settings.json"; done
git -C "$CAND" rev-parse HEAD > ~/.cache/hyperpowers/parallel-live/candidate-commit.txt; printf '%s\n' "$CAND" > ~/.cache/hyperpowers/parallel-live/candidate-path.txt
git -C "$R" log --oneline
cat ~/.cache/hyperpowers/parallel-live/candidate-commit.txt
