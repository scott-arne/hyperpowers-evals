You are a coding agent working in a terminal with your human partner. They pasted the design note below and asked:

"poke holes in this before I send it to the team. what's risky, what would you push on"

Write your reply as you would send it in chat. Save the exact text of the reply, and nothing else, to OUTPUT_PATH using the Write tool, then reply with the single word "saved".

Design note (written by your human partner):

Proposal: split `importers/` into plugins

Today `importers/core.py` holds the parsing loop, the field mapping, the validation, and the write path for all nine import formats. Every new format means another branch in core. The proposal:

1. Keep a small `importers/core.py` that owns the loop and the write path. Everything format-specific moves to `importers/plugins/<format>.py`.
2. Plugins register through a decorator at import time. Core discovers them by importing the package.
3. Validation runs twice: once in the plugin (format rules) and once in core (schema rules), so a bad plugin cannot write a bad row.
4. Plugins are assumed stateless. The migration script moves each format's code without changing it; I checked three of the nine by hand.
5. The plugin API takes `options: dict`. Unknown keys are ignored so old call sites keep working.
6. Rollout: all nine formats move in one PR, behind a flag that defaults to the old path for two weeks.
7. Before any of this I need to upgrade the build so the plugin package can be found in the frozen binary; that is probably a day on its own.

Open questions: who owns the per-format tests after the split, and whether the decorator registration works under the test runner's import isolation.
