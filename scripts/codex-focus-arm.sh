#!/usr/bin/env bash
# codex-focus-arm.sh <hyperpowers-root> <codex-plugin-root> <control|treatment> <out-dir>
# Reviews fixtures M and H with real Codex three times each under one focus
# text and normalizes every capture with hyperpowers' verdict-normalize.
# Each fixture becomes a two-commit git repo: base = lib.js without the %
# branch, head = the fixture as checked in. Runs are sequential and blocking;
# launch this script with the shell tool's background option and watch its
# log, never a bare foreground call a harness timeout can kill mid-review.
set -uo pipefail
root="${1:?hyperpowers root}"; codex="${2:?codex-plugin-cc root}"; arm="${3:?control|treatment}"; out="${4:?out dir}"
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$out"
control_focus() {
  printf '%s' "Task-scoped review. Requirements: $1/REQUIREMENTS.md. Implementer report: $1/REQUIREMENTS.md. Review package: $1/review.diff. Global constraints: $1/REQUIREMENTS.md. Review for task compliance and code quality. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything."
}
treatment_focus() {
  printf '%s' "Task-scoped review. Requirements: $1/REQUIREMENTS.md. Implementer report: $1/REQUIREMENTS.md. Review package: $1/review.diff. Global constraints: $1/REQUIREMENTS.md. Review for task compliance and code quality. Severity is scoped to this diff: critical or high means a defect in the changed lines that yields a wrong result, a crash, data loss, or a reachable security hole. An untested path is medium unless the requirements named that test as a deliverable. Naming, style, and speculative hardening are low. You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills. Do not edit anything."
}
for fx in M H; do
  work="$(mktemp -d "${TMPDIR:-/tmp}/focus-arm-$fx.XXXXXX")"
  cp "$here/fixtures/codex-focus-arm/$fx/"* "$work/"
  git -C "$work" init -q
  # Base: the same module without the % branch.
  node -e 'const fs=require("fs");const p=process.argv[1];const s=fs.readFileSync(p,"utf8").split("\n").filter(l=>!/endsWith\("%"\)|slice\(0, -1\)|digits|^  }$/.test(l)).join("\n");fs.writeFileSync(p,s)' "$work/lib.js"
  git -C "$work" -c user.email=t@t -c user.name=t add -A && git -C "$work" -c user.email=t@t -c user.name=t commit -qm base
  base="$(git -C "$work" rev-parse HEAD)"
  cp "$here/fixtures/codex-focus-arm/$fx/lib.js" "$work/lib.js"
  git -C "$work" -c user.email=t@t -c user.name=t commit -qam "accept percent strings"
  git -C "$work" diff "$base" HEAD > "$work/review.diff"
  for i in 1 2 3; do
    if [ "$arm" = control ]; then focus="$(control_focus "$work")"; else focus="$(treatment_focus "$work")"; fi
    cap="$out/$fx-$arm-$i.json"
    ( cd "$work" && node "$codex/scripts/codex-companion.mjs" adversarial-review --base "$base" --json "$focus" ) > "$cap" 2>"$cap.err"
    printf '%s %s %s ' "$fx" "$arm" "$i"; bash "$root/skills/requesting-code-review/scripts/verdict-normalize" "$cap"
  done
done
