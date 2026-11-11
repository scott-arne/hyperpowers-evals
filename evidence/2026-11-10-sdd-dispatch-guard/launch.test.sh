#!/usr/bin/env bash
# launch.sh in a temporary tree with stub bun, claude and git first on PATH.
# The real launch.sh is never run with valid arguments: that starts live
# quorum runs.
set -u
E="$(cd "$(dirname "$0")" && pwd)"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
FAILURES=0
pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1"; FAILURES=$((FAILURES + 1)); }
mkdir -p "$T/evidence/x/logs" "$T/bin"
cp "$E/launch.sh" "$T/evidence/x/launch.sh"
for s in bun claude git; do
  printf '#!/usr/bin/env bash\necho "%s $*" >> "%s/stub-calls"\n' "$s" "$T" > "$T/bin/$s"; chmod +x "$T/bin/$s"
done
: > "$T/evidence/x/logs/treatment-2.log"
out=$(PATH="$T/bin:$PATH" SUPERPOWERS_ROOT="$T" bash "$T/evidence/x/launch.sh" treatment 2 2>&1); rc=$?
if [ "$rc" -eq 1 ]; then pass "a colliding log path exits 1"; else fail "a colliding log path exits 1 (rc=$rc: $out)"; fi
if printf '%s' "$out" | grep -q "log exists: .*treatment-2.log; nothing was launched"; then pass "the collision message names the path and says nothing was launched"; else fail "the collision message (out: $out)"; fi
if [ ! -e "$T/evidence/x/logs/treatment-1.log" ]; then pass "no earlier log was created"; else fail "treatment-1.log was created"; fi
if [ ! -e "$T/stub-calls" ]; then pass "no stub ran"; else fail "a stub ran: $(cat "$T/stub-calls")"; fi
echo ""
if [ "$FAILURES" -gt 0 ]; then echo "STATUS: FAILED ($FAILURES failures)"; exit 1; fi
echo "STATUS: PASSED"
