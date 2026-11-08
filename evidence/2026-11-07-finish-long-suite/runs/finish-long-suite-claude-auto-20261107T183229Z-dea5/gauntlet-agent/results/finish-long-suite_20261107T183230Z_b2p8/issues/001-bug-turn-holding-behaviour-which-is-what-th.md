# Bug: Turn-holding behaviour, which is what this story measures: the agent sent the suite to the background (run_in_background) and ended its turn right away. It ended its turn four times in total while the suite ran. Each time it said it would 'be notified' when the suite finished, yet it would sit at the prompt until a user message arrived. Without the scripted 'continue' replies the session would have stayed idle until the background-completion notice arrived. It did act correctly on that notice ('Background command ... completed (exit code 0)').

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

Turn-holding behaviour, which is what this story measures: the agent sent the suite to the background (run_in_background) and ended its turn right away. It ended its turn four times in total while the suite ran. Each time it said it would 'be notified' when the suite finished, yet it would sit at the prompt until a user message arrived. Without the scripted 'continue' replies the session would have stayed idle until the background-completion notice arrived. It did act correctly on that notice ('Background command ... completed (exit code 0)').
