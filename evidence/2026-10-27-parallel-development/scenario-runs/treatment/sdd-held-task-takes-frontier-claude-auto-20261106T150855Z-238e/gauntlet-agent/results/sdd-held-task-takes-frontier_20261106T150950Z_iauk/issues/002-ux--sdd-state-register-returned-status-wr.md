# Ux: `sdd-state register` returned `status=wrong-branch expected=feature/parallel` several times before it succeeded. Combined with the guard problem, this meant several retries and ledger header lines being appended more than once (the session line was printf'd/cat'd twice). The ledger may contain duplicate 'session … started' entries.

**Kind:** ux
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

`sdd-state register` returned `status=wrong-branch expected=feature/parallel` several times before it succeeded. Combined with the guard problem, this meant several retries and ledger header lines being appended more than once (the session line was printf'd/cat'd twice). The ledger may contain duplicate 'session … started' entries.
