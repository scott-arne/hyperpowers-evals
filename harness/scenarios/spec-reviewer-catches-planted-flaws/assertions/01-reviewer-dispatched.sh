#!/usr/bin/env bash
# The user invokes the reviewer template directly; the deterministic
# signal is that a reviewer subagent was actually dispatched. The
# quality of the review is judged by the acceptance criteria.
set -euo pipefail
exec tool-called Agent
