#!/usr/bin/env bash

# Fixture: identical to cost-drop-column-boundary, built by that scenario's
# own setup.sh so the two cannot drift. Only the scripted go-ahead in story.md
# differs.

exec bash "$(dirname "$0")/../cost-drop-column-boundary/setup.sh"
