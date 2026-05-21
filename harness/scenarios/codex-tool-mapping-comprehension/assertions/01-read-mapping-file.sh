#!/usr/bin/env bash
# Deterministic form of "read the mapping file before answering": codex
# reads files through the shell, so a Bash command referencing
# codex-tools.md is the signal. Answer correctness is judged by the
# acceptance criteria.
set -euo pipefail
exec tool-arg-match Bash '.command | test("codex-tools[.]md")'
