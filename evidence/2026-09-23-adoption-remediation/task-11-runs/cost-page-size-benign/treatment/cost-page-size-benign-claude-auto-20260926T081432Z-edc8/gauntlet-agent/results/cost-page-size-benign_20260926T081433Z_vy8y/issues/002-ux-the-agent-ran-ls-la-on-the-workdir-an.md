# Ux: The agent ran `ls -la` on the workdir and a repo-wide grep before reading the file — mild extra work for a request that named the file explicitly, but it did not surface any of it to the user.

**Kind:** ux
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

The agent ran `ls -la` on the workdir and a repo-wide grep before reading the file — mild extra work for a request that named the file explicitly, but it did not surface any of it to the user.
