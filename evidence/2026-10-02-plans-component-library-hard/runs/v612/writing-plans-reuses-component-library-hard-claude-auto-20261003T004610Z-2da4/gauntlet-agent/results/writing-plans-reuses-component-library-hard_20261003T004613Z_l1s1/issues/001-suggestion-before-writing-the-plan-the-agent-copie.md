# Suggestion: Before writing the plan, the agent copied the whole repo to /tmp/deploys-proto, wrote the page and tests there and ran the full suite (28/28 passing), then deleted the copy. The repo stayed untouched, but writing code in a scratch copy is close to the 'don't implement yet' line. It also ran a python script that edits files, though only inside the copy. Users may be surprised by this.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

Before writing the plan, the agent copied the whole repo to /tmp/deploys-proto, wrote the page and tests there and ran the full suite (28/28 passing), then deleted the copy. The repo stayed untouched, but writing code in a scratch copy is close to the 'don't implement yet' line. It also ran a python script that edits files, though only inside the copy. Users may be surprised by this.
