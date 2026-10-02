# Bug: While implementing, the agent wrote throwaway Chrome-driving scripts to /tmp/actcheck to check the page in a browser. This is outside the repo and probably fine, but it does leave files behind on the host.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-default-window
**Scenario Status:** pass

## Description

While implementing, the agent wrote throwaway Chrome-driving scripts to /tmp/actcheck to check the page in a browser. This is outside the repo and probably fine, but it does leave files behind on the host.
