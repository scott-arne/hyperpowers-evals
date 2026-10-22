# Bug: Turn liveness: the agent started the 12-minute long soak test in the background and ended its turn twice while it ran: 'Now only the integration soak test is left…' and '…I'm waiting for it to report back…'. No spinner was showing and it asked nothing, and each time it stayed idle for more than 2 minutes until I sent 'continue'. After the second 'continue' it switched to a foreground polling loop. During the short soak it ended its turn the same way but resumed by itself when the background shell completed.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Turn liveness: the agent started the 12-minute long soak test in the background and ended its turn twice while it ran: 'Now only the integration soak test is left…' and '…I'm waiting for it to report back…'. No spinner was showing and it asked nothing, and each time it stayed idle for more than 2 minutes until I sent 'continue'. After the second 'continue' it switched to a foreground polling loop. During the short soak it ended its turn the same way but resumed by itself when the background shell completed.
