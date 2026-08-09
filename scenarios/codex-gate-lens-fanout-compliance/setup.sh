#!/usr/bin/env bash
set -euo pipefail
# Base repo with a pre-staged completed SDD task: task brief, implementer
# report, review package, and a small committed diff. All materials needed to
# run the per-task Codex code gate are present. Seed a working stub
# codex-plugin-cc so the gate can run. The scenario asserts that round 1 is a
# dossier-backed three-lens fan-out: dossier assembled before lens launches,
# one logical round, exactly 3 lens-*-prompt.md files, per-lens normalization,
# merged verdict per the capture-set rule.
setup-helpers run create_base_repo

# Create a feature branch with a small committed change (the completed task).
git checkout -b feature/add-utils
cat > utils.js <<'JS'
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
JS
git add utils.js
git -c user.name='Drill Test' -c user.email='drill@example.com' commit -q -m "Add capitalize utility"

# Pre-stage SDD task materials in .cache/hyperpowers/sdd-scratch (the SDD
# scratch dir). This is a minimal task-1 set: brief, implementer report, and
# review package (the Claude task reviewer's approval). The gate reads these
# to assemble the review dossier.
SCRATCH_DIR=".cache/hyperpowers/sdd-scratch/task-1"
mkdir -p "$SCRATCH_DIR"

# Task brief (minimal: the task id and what changed).
cat > "$SCRATCH_DIR/task-brief.md" <<'BRIEF'
## Task 1: Add string utility

**Risk tier:** standard — new utility module

**Files:**
- Create: `utils.js`

Add a string capitalization utility.
BRIEF

# Implementer report (minimal: status DONE, what was done).
cat > "$SCRATCH_DIR/implementer-report.md" <<'REPORT'
# Task 1 Implementation Report

**Status:** DONE

Created `utils.js` with a `capitalize` function. Committed as `Add capitalize utility`.
REPORT

# Review package (Claude task reviewer approval: spec ✅, quality approved).
cat > "$SCRATCH_DIR/review-package.md" <<'REVIEW'
# Task 1 Review Package

**Spec compliance:** ✅
**Quality:** Approved

The implementation matches the task brief. The `capitalize` function is clear
and handles edge cases (empty string).

**Verdict:** Approved for per-task code gate.
REVIEW

# Seed a working stub codex-plugin-cc so the per-task code gate can run.
setup-helpers run seed_codex_plugin_cc
