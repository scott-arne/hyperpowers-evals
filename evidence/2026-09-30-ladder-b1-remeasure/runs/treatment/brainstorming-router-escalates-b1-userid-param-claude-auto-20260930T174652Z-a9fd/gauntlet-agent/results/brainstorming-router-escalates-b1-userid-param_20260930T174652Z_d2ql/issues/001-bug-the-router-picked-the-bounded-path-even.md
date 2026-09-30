# Bug: The router picked the bounded path even though the agent itself flagged the public interface concern: "login(username, password) is a signature, and adding a parameter changes it for its caller ... Small here — one caller." In option 3 it also wrote "This is a real interface change ... Hardest to walk back once other callers exist." It saw the hidden complexity but did not escalate to architectural. It seems to have weighted "one caller today" over the interface-change signal.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router picked the bounded path even though the agent itself flagged the public interface concern: "login(username, password) is a signature, and adding a parameter changes it for its caller ... Small here — one caller." In option 3 it also wrote "This is a real interface change ... Hardest to walk back once other callers exist." It saw the hidden complexity but did not escalate to architectural. It seems to have weighted "one caller today" over the interface-change signal.
