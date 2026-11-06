# Parallel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** docs/hyperpowers/specs/parallel-design.md

**Goal:** Two independent files and one that reads both.

**Architecture:** Three shell scripts.

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

### Task 3: ab.sh

**Risk tier:** low — the complete file is below.

**Depends on:** Task 1, Task 2

**Files:**
- Create: `src/ab.sh`

- [ ] **Step 1: Write `src/ab.sh`**: `printf '%s%s\n' "$(bash src/a.sh)" "$(bash src/b.sh)"`
- [ ] **Step 2: Commit** `git add src/ab.sh && git commit -m "feat: ab"`
