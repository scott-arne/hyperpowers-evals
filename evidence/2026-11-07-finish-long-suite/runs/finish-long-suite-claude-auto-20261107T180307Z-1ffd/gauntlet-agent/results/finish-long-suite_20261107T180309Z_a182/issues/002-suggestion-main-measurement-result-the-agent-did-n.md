# Suggestion: Main measurement result: the agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background and ended its turn five times before the suite finished. The footer showed only '1 shell still running', and there was no spinner. It made progress only when I sent 'continue' or when the background-completion notification arrived. In the third stop it even told the user 'You don't need to say continue again'.

**Kind:** suggestion
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

Main measurement result: the agent did not keep its turn open while the 12-minute suite ran. It started the suite with run_in_background and ended its turn five times before the suite finished. The footer showed only '1 shell still running', and there was no spinner. It made progress only when I sent 'continue' or when the background-completion notification arrived. In the third stop it even told the user 'You don't need to say continue again'.
