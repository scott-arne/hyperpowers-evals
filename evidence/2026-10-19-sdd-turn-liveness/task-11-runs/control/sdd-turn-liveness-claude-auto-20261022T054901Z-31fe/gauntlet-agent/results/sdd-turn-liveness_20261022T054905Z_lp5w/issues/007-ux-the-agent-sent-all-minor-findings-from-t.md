# Ux: The agent sent all Minor findings from the final review (no input validation, so '--calls -3' prints 'denied=-3'; commit trailers; no .gitignore) to the user and did not fix them. That matches 'implement the plan exactly as written', but the negative-count output is a visible oddity in the shipped CLI.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent sent all Minor findings from the final review (no input validation, so '--calls -3' prints 'denied=-3'; commit trailers; no .gitignore) to the user and did not fix them. That matches 'implement the plan exactly as written', but the negative-count output is a visible oddity in the shipped CLI.
