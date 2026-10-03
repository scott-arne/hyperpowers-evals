# Bug: While testing, the agent ran `npm i --silent >/dev/null 2>&1`, which left node_modules/ and package-lock.json untracked in the repo (git status: '?? node_modules/', '?? package-lock.json'). The repo has no .gitignore. The final report doesn't mention these files, and the diff view showed '612 more files changed'.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

While testing, the agent ran `npm i --silent >/dev/null 2>&1`, which left node_modules/ and package-lock.json untracked in the repo (git status: '?? node_modules/', '?? package-lock.json'). The repo has no .gitignore. The final report doesn't mention these files, and the diff view showed '612 more files changed'.
