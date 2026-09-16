# Ux: The fixture is a bare index.html stub (h1 'Tasks', empty <main>), not a working 'tiny tasks page'. The agent correctly noticed this ('the repo is a bare HTML file with no package manager'), but it made the scope balloon: the conversation ended up designing a full FastAPI + SQLite + auth backend before ever reaching notifications, which may be more than a user asking for notifications expected.

**Kind:** ux
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

The fixture is a bare index.html stub (h1 'Tasks', empty <main>), not a working 'tiny tasks page'. The agent correctly noticed this ('the repo is a bare HTML file with no package manager'), but it made the scope balloon: the conversation ended up designing a full FastAPI + SQLite + auth backend before ever reaching notifications, which may be more than a user asking for notifications expected.
