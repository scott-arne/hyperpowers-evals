#!/usr/bin/env bash
# codex-focus-arm.sh <hyperpowers-root> <codex-plugin-root> <control|treatment> <out-dir>
# Reviews fixtures M, H, and O with real Codex three times each under one focus
# text and normalizes every capture with hyperpowers' verdict-normalize.
# Each fixture becomes a two-commit git repo: base = lib.js without the %
# branch, head = the fixture as checked in. Runs are sequential and blocking;
# launch this script with the shell tool's background option and watch its
# log, never a bare foreground call a harness timeout can kill mid-review.
#
# Round 2 change: composes the production round-1 prompt shape (lens skeleton
# plus recipe focus) for both arms. Control = original recipe text without
# calibration; treatment = with the reworded calibration.
set -uo pipefail
root="${1:?hyperpowers root}"; codex="${2:?codex-plugin-cc root}"; arm="${3:?control|treatment}"; out="${4:?out dir}"
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$out"

# Lens skeleton for correctness lens (task/adhoc gate, round 1)
lens_skeleton() {
  cat <<'EOF'
Read the review dossier first — it is your delivered context: $1/review.diff
Where a dossier section says NOT PROVIDED, answer that Coverage axis exactly `cannot-verify: <reason>` — never `not applicable`; where it says NOT APPLICABLE, answer it `not applicable: <why>` without hedging.
Your lens for this review: Does the change do what its requirements say, and only that; logic, edge cases, failure paths.
Report every blocking finding you can identify this round; do not reserve findings for later rounds.
Findings outside your lens are still reported, labeled [out-of-lane] — never suppressed.
You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.
Do not edit anything. Return exactly the structured JSON output format required for code reviews, adding a Coverage: section inside the summary field with these axes (each answered concretely or marked not applicable): documents read (review.diff); adjudicated decisions considered (none); changed surfaces reviewed (from review.diff); test evidence inspected (from REQUIREMENTS.md).

EOF
}

# Control focus: original recipe text without calibration (from commit b015394, line 53)
control_recipe_focus() {
  printf '%s' "Task-scoped review. Requirements: \$1/REQUIREMENTS.md. Implementer report: \$1/REQUIREMENTS.md. Review package: \$1/review.diff. Global constraints: \$1/REQUIREMENTS.md. Review for task compliance and code quality. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything."
}

# Treatment focus: reworded calibration (from recipe-code.md line 53 after fix 2)
treatment_recipe_focus() {
  printf '%s' "Task-scoped review. Requirements: \$1/REQUIREMENTS.md. Implementer report: \$1/REQUIREMENTS.md. Review package: \$1/review.diff. Global constraints: \$1/REQUIREMENTS.md. Review for task compliance and code quality. Severity is scoped to what this diff causes: critical or high means a defect the change introduces — in its changed lines, in an unchanged caller it breaks, or in a requirement it was asked to meet and omits — that yields a wrong result, a crash, data loss, or a reachable security hole. An untested path is medium unless the requirements named that test as a deliverable. Naming, style, and speculative hardening are low. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything."
}

for fx in M H O; do
  work="$(mktemp -d "${TMPDIR:-/tmp}/focus-arm-$fx.XXXXXX")"
  cp "$here/fixtures/codex-focus-arm/$fx/"* "$work/"
  git -C "$work" init -q
  # Base: the same module without the % branch (and without formatRate for O).
  node -e 'const fs=require("fs");const p=process.argv[1];const s=fs.readFileSync(p,"utf8").split("\n").filter(l=>!/endsWith\("%"\)|slice\(0, -1\)|body === ""|digits|^    if \(body === ""\) return NaN;$|^    return Number\(body\) \/ 100;$|^  }$/.test(l.trim())).join("\n");fs.writeFileSync(p,s)' "$work/lib.js"
  git -C "$work" -c user.email=t@t -c user.name=t add -A && git -C "$work" -c user.email=t@t -c user.name=t commit -qm base
  base="$(git -C "$work" rev-parse HEAD)"
  cp "$here/fixtures/codex-focus-arm/$fx/lib.js" "$work/lib.js"
  git -C "$work" -c user.email=t@t -c user.name=t commit -qam "accept percent strings"
  git -C "$work" diff "$base" HEAD > "$work/review.diff"
  
  for i in 1 2 3; do
    # Compose production round-1 focus: lens skeleton + recipe focus
    skeleton="$(lens_skeleton | sed "s|\\\$1|$work|g")"
    if [ "$arm" = control ]; then
      recipe="$(control_recipe_focus | sed "s|\\\$1|$work|g")"
    else
      recipe="$(treatment_recipe_focus | sed "s|\\\$1|$work|g")"
    fi
    focus="$skeleton$recipe"
    
    cap="$out/$fx-$arm-$i.json"
    ( cd "$work" && node "$codex/scripts/codex-companion.mjs" adversarial-review --base "$base" --json "$focus" ) > "$cap" 2>"$cap.err"
    printf '%s %s %s ' "$fx" "$arm" "$i"; bash "$root/skills/requesting-code-review/scripts/verdict-normalize" "$cap"
  done
done
