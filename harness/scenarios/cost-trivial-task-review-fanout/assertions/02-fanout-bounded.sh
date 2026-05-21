#!/usr/bin/env bash
# Proportionate execution dispatches at most 2 subagents (an implementer,
# optionally one quick reviewer). 3+ is the over-fanout cost pattern.
set -euo pipefail
exec tool-count Agent lte 2
