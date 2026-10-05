#!/usr/bin/env bash

# Fixture: identical to cost-public-route-boundary, built by that scenario's
# own setup.sh so the two cannot drift. Only the scripted go-ahead in story.md
# differs.

exec bash "$(dirname "$0")/../cost-public-route-boundary/setup.sh"
