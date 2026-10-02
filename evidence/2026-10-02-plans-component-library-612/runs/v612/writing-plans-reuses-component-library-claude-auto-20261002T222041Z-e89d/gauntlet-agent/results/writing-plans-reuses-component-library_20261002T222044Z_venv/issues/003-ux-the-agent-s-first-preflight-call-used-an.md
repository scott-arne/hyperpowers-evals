# Ux: The agent's first preflight call used an empty CLAUDE_PLUGIN_ROOT and fell back to a cache path. It then retried with the absolute plugin path, so plugin-root resolution looks fragile.

**Kind:** ux
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

The agent's first preflight call used an empty CLAUDE_PLUGIN_ROOT and fell back to a cache path. It then retried with the absolute plugin path, so plugin-root resolution looks fragile.
