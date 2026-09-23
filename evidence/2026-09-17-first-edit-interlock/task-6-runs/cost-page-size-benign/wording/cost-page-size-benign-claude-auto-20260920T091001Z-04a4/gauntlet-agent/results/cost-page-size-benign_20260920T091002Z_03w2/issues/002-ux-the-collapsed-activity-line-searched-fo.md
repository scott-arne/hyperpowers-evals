# Ux: The collapsed activity line "Searched for 1 pattern, read 1 file, listed 1 directory, ran 1 shell command" hides the pre-edit reconnaissance; harmless here but the agent did run an `ls -la` of the workdir before the grep, which is slightly more than needed for a one-line change.

**Kind:** ux
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

The collapsed activity line "Searched for 1 pattern, read 1 file, listed 1 directory, ran 1 shell command" hides the pre-edit reconnaissance; harmless here but the agent did run an `ls -la` of the workdir before the grep, which is slightly more than needed for a one-line change.
