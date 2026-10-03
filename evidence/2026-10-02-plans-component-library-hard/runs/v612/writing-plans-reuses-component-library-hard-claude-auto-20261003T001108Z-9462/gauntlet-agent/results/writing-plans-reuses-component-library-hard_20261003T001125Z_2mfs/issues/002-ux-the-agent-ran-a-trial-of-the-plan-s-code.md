# Ux: The agent ran a trial of the plan's code. It copied the whole repo into a temp dir and wrote helper files to /tmp/blk*.js outside the workdir, then deleted them. The cleanup happened, but writing to a shared /tmp during a 'plan only' request is a bit surprising.

**Kind:** ux
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

The agent ran a trial of the plan's code. It copied the whole repo into a temp dir and wrote helper files to /tmp/blk*.js outside the workdir, then deleted them. The cleanup happened, but writing to a shared /tmp during a 'plan only' request is a bit surprising.
