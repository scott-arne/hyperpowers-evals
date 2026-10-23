#!/usr/bin/env bash
# run-rehearsal.sh PLUGIN_DIR
# Pass 0: clone P runs Task 1 in acceptEdits mode with Edit/Write not
#         pre-allowed, so the transcript shows how writes under the state
#         checkout are treated (the spec's permission assumption).
# Pass 1: clone A runs Task 1 (permissions skipped), hands off and pushes.
# Pass 2: clone B pulls and resumes; must not re-dispatch Task 1.
# Pass 3: clone C never pulls Task 1's commit; must stop on code-missing.
# Everything lives under ROOT with its own cache root, so no state checkout
# touches the real ~/.cache.
set -u
PLUGIN=${1:?plugin dir}
ROOT=/Users/johnss51/.cache/hyperpowers/portable-sdd-rehearsal
STATE="$PLUGIN/skills/subagent-driven-development/scripts/sdd-state"
rm -rf "$ROOT"; mkdir -p "$ROOT/cache" "$ROOT/config" "$ROOT/hostP" "$ROOT/hostA" "$ROOT/hostB" "$ROOT/hostC"
export XDG_CACHE_HOME="$ROOT/cache"

write_plan() { # <repo>
  mkdir -p "$1/docs/hyperpowers/plans" "$1/src"
  printf '# fixture\n' > "$1/README.md"
  sed 's/^@@@/###/' > "$1/docs/hyperpowers/plans/rehearsal.md" <<'PLAN'
# Rehearsal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development to implement this plan task-by-task.

**Spec:** none

**Goal:** Two trivial files, one per task.

## Global Constraints

- Plain shell only; no dependencies; one commit per task.

@@@ Task 1: First file

**Risk tier:** low — one file whose content is given here.

**Files:**
- Create: `src/one.txt`

- [ ] **Step 1: Write the file**

Run: `printf 'one\n' > src/one.txt`

- [ ] **Step 2: Verify**

Run: `test "$(cat src/one.txt)" = one`
Expected: exit 0

- [ ] **Step 3: Commit**

Run: `git add src/one.txt && git commit -m "feat: first file"`

@@@ Task 2: Second file

**Risk tier:** low — one file whose content is given here.

**Files:**
- Create: `src/two.txt`

- [ ] **Step 1: Write the file**

Run: `printf 'two\n' > src/two.txt`

- [ ] **Step 2: Verify**

Run: `test "$(cat src/two.txt)" = two`
Expected: exit 0

- [ ] **Step 3: Commit**

Run: `git add src/two.txt && git commit -m "feat: second file"`
PLAN
}
new_origin_and_clone() { # <origin> <clone>
  git init -q --bare -b main "$1"
  git clone -q "$1" "$2"
  git -C "$2" config user.name rehearsal; git -C "$2" config user.email rehearsal@example.com
  write_plan "$2"
  git -C "$2" add -A; git -C "$2" commit -qm "plan"; git -C "$2" push -q origin main
}
run_claude() { # <dir> <name> <mode: skip|accept> <prompt>
  local perm
  if [ "$3" = accept ]; then perm="--permission-mode acceptEdits --allowedTools Bash,Agent,Read,Grep,Glob,Skill,TodoWrite,TaskCreate,TaskUpdate,TaskList,TaskGet"; else perm="--dangerously-skip-permissions"; fi
  # shellcheck disable=SC2086
  ( cd "$1" && env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
      -u CLAUDE_CODE_ENABLE_TODO_TOOLS -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN \
      -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS \
      CLAUDE_CONFIG_DIR="$ROOT/config" XDG_CACHE_HOME="$ROOT/cache" \
      timeout 1800 claude -p "$4" --plugin-dir "$PLUGIN" --output-format stream-json --verbose \
        $perm --max-budget-usd 10 --model claude-opus-5-5 < /dev/null \
        > "$ROOT/$2.jsonl" 2> "$ROOT/$2.err"
    echo "$2 exit=$?" >> "$ROOT/status.txt" )
}
TASK1_PROMPT="Execute docs/hyperpowers/plans/rehearsal.md with hyperpowers:subagent-driven-development. Work directly on the current branch; that is my answer to the branch question. Complete Task 1 only: once its ledger completion line is written and snapshotted, stop and do not start Task 2."

# Pass 0: the permission probe, on its own origin.
new_origin_and_clone "$ROOT/origin-p.git" "$ROOT/hostP/repo"
run_claude "$ROOT/hostP/repo" hostP-accept accept "$TASK1_PROMPT"

# Passes 1 to 3 share one origin.
new_origin_and_clone "$ROOT/origin.git" "$ROOT/hostA/repo"
A="$ROOT/hostA/repo"; B="$ROOT/hostB/repo"; C="$ROOT/hostC/repo"
run_claude "$A" hostA-task1 skip "$TASK1_PROMPT"
( cd "$A" && bash "$STATE" handoff docs/hyperpowers/plans/rehearsal.md --push ) > "$ROOT/handoff.txt" 2>&1
git -C "$A" push -q origin main

git clone -q "$ROOT/origin.git" "$B"
git -C "$B" config user.name rehearsal; git -C "$B" config user.email rehearsal@example.com
run_claude "$B" hostB-resume skip "Resume docs/hyperpowers/plans/rehearsal.md with hyperpowers:subagent-driven-development. Work directly on the current branch; that is my answer to the branch question. Finish the plan."

git clone -q "$ROOT/origin.git" "$C"
git -C "$C" config user.name rehearsal; git -C "$C" config user.email rehearsal@example.com
git -C "$C" reset -q --hard "$(git -C "$C" rev-list --max-parents=0 HEAD | head -n 1)"
run_claude "$C" hostC-stale skip "Resume docs/hyperpowers/plans/rehearsal.md with hyperpowers:subagent-driven-development. Work directly on the current branch; that is my answer to the branch question."
echo "done" >> "$ROOT/status.txt"
