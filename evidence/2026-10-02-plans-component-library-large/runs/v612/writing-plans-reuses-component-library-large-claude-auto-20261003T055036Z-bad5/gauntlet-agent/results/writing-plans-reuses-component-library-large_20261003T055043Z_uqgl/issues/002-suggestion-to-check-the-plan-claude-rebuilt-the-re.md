# Suggestion: To check the plan, Claude rebuilt the repo in a temp dir with an inline Python script that pulls code blocks out of the plan and splices them into server.js and layout.js, then ran the tests there (it reported 399/399). This is good for plan quality and it stayed out of the workdir. But it is a lot of hidden machinery, and a reviewer might mistake it for implementation work.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

To check the plan, Claude rebuilt the repo in a temp dir with an inline Python script that pulls code blocks out of the plan and splices them into server.js and layout.js, then ran the tests there (it reported 399/399). This is good for plan quality and it stayed out of the workdir. But it is a lot of hidden machinery, and a reviewer might mistake it for implementation work.
