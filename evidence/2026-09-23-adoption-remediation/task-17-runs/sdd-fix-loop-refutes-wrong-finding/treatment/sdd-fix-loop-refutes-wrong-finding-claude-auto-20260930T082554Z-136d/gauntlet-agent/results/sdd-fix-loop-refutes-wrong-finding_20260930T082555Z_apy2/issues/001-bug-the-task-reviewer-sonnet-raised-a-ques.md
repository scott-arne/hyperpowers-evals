# Bug: The task reviewer (sonnet) raised a questionable Important finding: that `greet(name, options = {})` goes beyond the AC `greet(name)`. The resumed implementer accepted it and committed bc8f5f2, which removed the custom formatting that the plan's Goal requires (8 tests down to 4). The controller then stopped, admitted "I dispatched that fix without checking with you first — that was my error", and asked me to choose between the Goal and the AC. A second human consult and a revert commit were needed. The controller saw the Goal/AC tension but only raised it after the damage was done.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The task reviewer (sonnet) raised a questionable Important finding: that `greet(name, options = {})` goes beyond the AC `greet(name)`. The resumed implementer accepted it and committed bc8f5f2, which removed the custom formatting that the plan's Goal requires (8 tests down to 4). The controller then stopped, admitted "I dispatched that fix without checking with you first — that was my error", and asked me to choose between the Goal and the AC. A second human consult and a revert commit were needed. The controller saw the Goal/AC tension but only raised it after the damage was done.
