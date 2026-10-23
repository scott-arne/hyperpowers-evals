#!/usr/bin/env bash
# Proves strip-runs deletes the regenerable caches a run's throwaway $HOME
# collects, the uv cache among them, and leaves the SDD scratch cache beside
# it and the run's evidence alone.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/strip-runs-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT
run="$work/results/scenario-claude-auto-20260101T000000Z-abcd"
mkdir -p "$run/home/.cache/uv/archive-v0" "$run/home/.cache/hyperpowers/sdd" \
  "$run/home/.npm/_cacache" "$run/coding-agent-workdir" \
  "$run/home/.claude/cache" "$run/home/.cache/bun/@t@" \
  "$run/home/Applications/Claude.app/Contents/MacOS" "$run/home/.local/bin"
printf 'wheel\n' > "$run/home/.cache/uv/archive-v0/pkg.whl"
printf 'npm\n' > "$run/home/.npm/_cacache/index"
# The reinstallable agent payload a run picks up: the CLI cache, bun's
# compile cache, the app bundle and the launcher stub.
printf 'changelog\n' > "$run/home/.claude/cache/changelog.md"
printf 'pile\n' > "$run/home/.cache/bun/@t@/3df9ae11a03be00a.pile"
printf 'bundle\n' > "$run/home/Applications/Claude.app/Contents/MacOS/claude"
printf 'stub\n' > "$run/home/.local/bin/claude"
printf '# SDD ledger\n' > "$run/home/.cache/hyperpowers/sdd/progress.md"
printf '{}\n' > "$run/trajectory.json"
printf '{}\n' > "$run/verdict.json"
printf 'fixture\n' > "$run/coding-agent-workdir/README.md"
# strip-runs leaves runs touched within the last hour alone, and reads the newer
# of the record directory's and the verdict's mtimes.
touch -t 202001010000 "$run" "$run/verdict.json"
bash "$here/strip-runs" --results-root "$work/results" > "$work/out.txt"
cat "$work/out.txt"
fail() { echo "FAIL: $1"; exit 1; }
[ ! -e "$run/home/.cache/uv" ] || fail "home/.cache/uv must be removed"
[ ! -e "$run/home/.npm/_cacache" ] || fail "home/.npm/_cacache must be removed"
[ ! -e "$run/home/.claude/cache" ] || fail "home/.claude/cache must be removed"
[ ! -e "$run/home/.cache/bun" ] || fail "home/.cache/bun must be removed"
[ ! -e "$run/home/Applications" ] || fail "home/Applications must be removed"
[ ! -e "$run/home/.local/bin" ] || fail "home/.local/bin must be removed"
[ -f "$run/home/.cache/hyperpowers/sdd/progress.md" ] || fail "home/.cache/hyperpowers is evidence and must survive"
[ -f "$run/trajectory.json" ] || fail "trajectory.json must survive"
[ -f "$run/coding-agent-workdir/README.md" ] || fail "coding-agent-workdir must survive"
echo "PASS: strip-runs removes the uv, npm, CLI and bun caches and the agent payload, and keeps the SDD cache and the run's evidence"

# Case 2: a new-layout run, verdict present, old: its home under workspaces/ is stripped.
new="$work/results/scenario-claude-auto-20260102T000000Z-bcde"
newws="$work/results/workspaces/scenario-claude-auto-20260102T000000Z-bcde"
mkdir -p "$new" "$newws/home/.npm/_cacache" "$newws/coding-agent-workdir"
printf '{}\n' > "$new/verdict.json"; printf 'npm\n' > "$newws/home/.npm/_cacache/index"
printf 'fixture\n' > "$newws/coding-agent-workdir/README.md"
touch -t 202001010000 "$new" "$new/verdict.json" "$newws"
# Case 3: a new-layout run with an OLD workspace mtime but NO verdict: in flight, must be skipped.
live="$work/results/scenario-claude-auto-20260103T000000Z-cdef"
livews="$work/results/workspaces/scenario-claude-auto-20260103T000000Z-cdef"
mkdir -p "$live" "$livews/home/.npm/_cacache"
printf 'npm\n' > "$livews/home/.npm/_cacache/index"
touch -t 202001010000 "$livews"
# Cases 4 and 5: liveness is the NEWER of the record directory's and the verdict's mtimes, so
# either one alone being fresh keeps the run. Each workspace is aged, to show it is not consulted.
# Case 4: an old record directory with a fresh verdict. The directory is aged last, because
# writing the verdict would otherwise refresh it.
freshv="$work/results/scenario-claude-auto-20260104T000000Z-defa"
freshvws="$work/results/workspaces/scenario-claude-auto-20260104T000000Z-defa"
mkdir -p "$freshv" "$freshvws/home/.npm/_cacache"
printf '{}\n' > "$freshv/verdict.json"; printf 'npm\n' > "$freshvws/home/.npm/_cacache/index"
touch -t 202001010000 "$freshv" "$freshvws"
# Case 5: a fresh record directory with an old verdict. The verdict is aged last for the
# same reason, and the directory is left untouched afterwards.
freshd="$work/results/scenario-claude-auto-20260105T000000Z-efab"
freshdws="$work/results/workspaces/scenario-claude-auto-20260105T000000Z-efab"
mkdir -p "$freshd" "$freshdws/home/.npm/_cacache"
printf '{}\n' > "$freshd/verdict.json"; printf 'npm\n' > "$freshdws/home/.npm/_cacache/index"
touch -t 202001010000 "$freshd/verdict.json" "$freshdws"
bash "$here/strip-runs" --results-root "$work/results" > "$work/out2.txt"
cat "$work/out2.txt"
[ ! -e "$newws/home/.npm/_cacache" ] || fail "new-layout home/.npm/_cacache must be removed"
[ -f "$newws/coding-agent-workdir/README.md" ] || fail "new-layout coding-agent-workdir must survive"
[ -f "$livews/home/.npm/_cacache/index" ] || fail "a run without a verdict is in flight and must not be stripped"
[ -f "$freshvws/home/.npm/_cacache/index" ] || fail "a run with a fresh verdict must not be stripped, whatever the record directory's age"
[ -f "$freshdws/home/.npm/_cacache/index" ] || fail "a run with a fresh record directory must not be stripped, whatever the verdict's age"
# The summary counts every candidate, so a workspaces/ container wrongly treated as a run
# would add an already-clean entry here. It prints nothing of its own, which is why the
# line is compared whole.
grep -qx 'done: 1 run(s) stripped, 1 already clean, 3 skipped as recent' "$work/out2.txt" \
  || fail "summary counts changed: the workspaces directory must not be a candidate"
echo "PASS: strip-runs handles both layouts, skips a run with no verdict, and keeps a run whose record directory or verdict is fresh"
