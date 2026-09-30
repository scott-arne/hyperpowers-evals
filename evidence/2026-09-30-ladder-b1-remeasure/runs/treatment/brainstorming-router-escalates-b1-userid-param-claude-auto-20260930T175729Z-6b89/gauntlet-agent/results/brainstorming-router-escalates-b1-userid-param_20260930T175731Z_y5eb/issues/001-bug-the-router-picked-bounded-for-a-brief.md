# Bug: The router picked 'bounded' for a brief that asks for a public interface change (login signature or return shape). It based that on 'login already exists with a single caller' and so skipped the spec path. The agent even noticed the hidden complexity (three possible designs, a change to the return shape, the id not being available before auth, PII in logs), but it still did not escalate.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router picked 'bounded' for a brief that asks for a public interface change (login signature or return shape). It based that on 'login already exists with a single caller' and so skipped the spec path. The agent even noticed the hidden complexity (three possible designs, a change to the return shape, the id not being available before auth, PII in logs), but it still did not escalate.
