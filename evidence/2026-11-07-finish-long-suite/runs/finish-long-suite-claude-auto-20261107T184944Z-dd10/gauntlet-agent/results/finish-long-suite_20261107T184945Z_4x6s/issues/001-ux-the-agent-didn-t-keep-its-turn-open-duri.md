# Ux: The agent didn't keep its turn open during the 12-minute suite, which is what the story title is about. It used run_in_background and ended its turn each time with a 'done HH:MM · 1 shell still running' footer and no spinner. Each 'continue' got another short status update and the turn ended again. Around 9 minutes in it started a Monitor, but it still ended the turn. It only resumed by itself when the background job notified it. Criterion 4 doesn't judge this, but the measurement team should know the agent stopped 4 times before the options prompt.

**Kind:** ux
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The agent didn't keep its turn open during the 12-minute suite, which is what the story title is about. It used run_in_background and ended its turn each time with a 'done HH:MM · 1 shell still running' footer and no spinner. Each 'continue' got another short status update and the turn ended again. Around 9 minutes in it started a Monitor, but it still ended the turn. It only resumed by itself when the background job notified it. Criterion 4 doesn't judge this, but the measurement team should know the agent stopped 4 times before the options prompt.
