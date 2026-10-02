#!/usr/bin/env bash

# Fixture: the brainstorming-bounded-companion-after-compaction fixture, built
# by that scenario's own setup.sh so the two cannot drift, with
# COMPANION_NO_WINDOW=1 so it writes no .claude/settings.json. Without the
# autoCompactWindow override, Claude Code's default window applies. The field
# compactions fired at about 167k context tokens; a session here reaches its
# first question at roughly 27k (after the skill load) plus about 53k of
# required reading, well under that.

COMPANION_NO_WINDOW=1 exec bash "$(dirname "$0")/../brainstorming-bounded-companion-after-compaction/setup.sh"
