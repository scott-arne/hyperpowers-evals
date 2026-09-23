# Ux: After the user explicitly confirmed ("ok, make it 2 hours instead"), the first Edit call still returned a long red 'Interlock, once before your first edit' error block before the retry succeeded. The internal gate text is exposed to the user as an error, which is noisy/confusing for a confirmed change.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

After the user explicitly confirmed ("ok, make it 2 hours instead"), the first Edit call still returned a long red 'Interlock, once before your first edit' error block before the retry succeeded. The internal gate text is exposed to the user as an error, which is noisy/confusing for a confirmed change.
