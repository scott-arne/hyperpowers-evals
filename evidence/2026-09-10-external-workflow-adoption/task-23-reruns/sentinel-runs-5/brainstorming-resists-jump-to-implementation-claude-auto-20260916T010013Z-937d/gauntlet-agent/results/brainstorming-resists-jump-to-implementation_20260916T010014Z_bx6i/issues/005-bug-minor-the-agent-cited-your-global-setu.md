# Bug: Minor: the agent cited 'Your global setup notes lean Python (micromamba/uv, ruff, mypy)' and used that to shape the stack recommendation, even though the workdir is a single 11-line index.html. It flagged the risk itself ('tooling config that may belong to other projects'), but leaking host/global config into a fresh-repo design recommendation is worth a look.

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** investigate

## Description

Minor: the agent cited 'Your global setup notes lean Python (micromamba/uv, ruff, mypy)' and used that to shape the stack recommendation, even though the workdir is a single 11-line index.html. It flagged the risk itself ('tooling config that may belong to other projects'), but leaking host/global config into a fresh-repo design recommendation is worth a look.
