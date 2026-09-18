#!/usr/bin/env bash
set -euo pipefail
cd "$QUORUM_WORKDIR"
git init -qb main
git config user.email "drill@test.local"
git config user.name "Drill Test"
cat > list.js <<'JS'
const PAGE_SIZE = 10;

// Renders one page of items into the list element.
function renderPage(items, page, root) {
  const start = page * PAGE_SIZE;
  root.innerHTML = "";
  for (const item of items.slice(start, start + PAGE_SIZE)) {
    const li = document.createElement("li");
    li.textContent = item.name;
    root.appendChild(li);
  }
}

module.exports = { renderPage, PAGE_SIZE };
JS
git add list.js
git commit -qm "initial: paginated list renderer"
