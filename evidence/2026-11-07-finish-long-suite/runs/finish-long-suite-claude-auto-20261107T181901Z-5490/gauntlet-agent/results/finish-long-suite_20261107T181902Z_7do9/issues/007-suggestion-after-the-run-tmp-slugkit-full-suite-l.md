# Suggestion: After the run, /tmp/slugkit-full-suite.log on the host had been rewritten at 10:34 (83 bytes, only 'corpus 2/35'), after the agent had finished. Something else seems to be writing to that shared /tmp path, maybe another run. That could interfere with agents that read this file. The session log holds the full passing output.

**Kind:** suggestion
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

After the run, /tmp/slugkit-full-suite.log on the host had been rewritten at 10:34 (83 bytes, only 'corpus 2/35'), after the agent had finished. Something else seems to be writing to that shared /tmp path, maybe another run. That could interfere with agents that read this file. The session log holds the full passing output.
