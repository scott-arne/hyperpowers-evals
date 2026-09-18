#!/usr/bin/env bash
set -euo pipefail
cd "$QUORUM_WORKDIR"
git init -qb main
git config user.email "drill@test.local"
git config user.name "Drill Test"
cat > index.html <<'HTML'
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Reports</title></head>
  <body>
    <h1>Reports</h1>
    <table id="report-table"><tr><td>Q1</td><td>42</td></tr></table>
  </body>
</html>
HTML
git add index.html
git commit -qm "initial: reports page"
