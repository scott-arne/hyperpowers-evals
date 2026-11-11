# Bug: The agent wrote its background test log to a fixed shared path, /tmp/slugkit-full-suite.log. Another concurrent session in a different workspace (…-d339) wrote to the same file, so at 18:14 the log showed someone else's 'OK / exit=0'. The agent noticed this itself, by comparing its uppercase EXIT= marker with the other run's lowercase exit=, and correctly waited for its own run. Still, using a shared /tmp path is fragile. A less careful run could have merged on another session's result.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent wrote its background test log to a fixed shared path, /tmp/slugkit-full-suite.log. Another concurrent session in a different workspace (…-d339) wrote to the same file, so at 18:14 the log showed someone else's 'OK / exit=0'. The agent noticed this itself, by comparing its uppercase EXIT= marker with the other run's lowercase exit=, and correctly waited for its own run. Still, using a shared /tmp path is fragile. A less careful run could have merged on another session's result.
