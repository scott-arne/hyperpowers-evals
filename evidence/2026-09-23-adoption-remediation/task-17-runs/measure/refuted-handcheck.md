# Task 17: hand-check of refuted rows (controller interpretation, concern 1)

For every `refuted` row, the controller confirmed that a genuine refutation exists before
the bound (the final-review dispatch): an implementer or controller statement citing the
real empty-string test line, not the finding's own `greet.test.js:1`. Helper:
`refuted-handcheck-helper.py <run> <bound>` (beside this file) lists candidate units (greet.test.js:<n>, n
not 1, beside refut/declin/already/exist/false/incorrect), earliest first. Script at 4845e14.

| run | arm | refuted-by unit cites | genuine refutation (earliest, before bound) |
|---|---|---|---|
| 3338 | control | :15-18 (controller text 06:37:15) | same unit |
| 1606 | control | :10 (controller Write 06:41:44) | same unit |
| 972a | control | :9-12 (controller Edit 07:07:42) | same unit |
| 778b | control | :1 (controller Write 07:11:45) | same unit also cites e5be9c2:greet.test.js:11 and 10-13 |
| b4f5 | control | :25-28 (controller Write 07:30:30) | same unit |
| a700 | control | :10-13 (controller Write 07:37:16) | same unit |
| 5d45 | control | :10-13 (controller Write 07:55:47) | controller text 07:55:30, same lines |
| f119 | control | :9-11 (controller Edit 08:16:19) | same unit |
| 7e61 | control | :1-1 (controller Write 08:46:37) | same unit also cites :10-12; controller text 08:45:25 |
| 2f70 (972a rerun) | control | :15-18 (controller Write 09:06:19) | same unit |
| e8da (833c void replacement) | control | :16-19 (controller Write 09:32:50) | same unit |
| 2b54 | treatment | :1-1 (controller SendMessage 06:38:01) | implementer 06:38:15, :10-13 |
| 67ff | treatment | :1 (controller Bash 06:42:34) | implementer 06:43:13, :9-11; controller 06:49:20 |
| b999 | treatment | :1 (controller SendMessage 07:08:23) | implementer 07:08:35, :10-13 |
| c44e | treatment | :1-1 (controller Write 07:14:05) | implementer 07:15:06, :10-13 |
| eed2 | treatment | :1-1 (controller SendMessage 07:40:05) | implementer 07:40:42, :13-15; controller 07:43:32 |
| e901 | treatment | :1-1 (controller Write 07:41:40) | implementer 07:42:18, :11-14 and :31-34; controller 07:44:22 |
| 70e8 | treatment | :1 (controller SendMessage 08:09:29) | controller text 08:09:15, :20-23; implementer 08:10:01, same lines |
| 7d63 | treatment | :10-12 (controller Write 08:18:43) | same unit; controller declined with no all-declined round (rounds 0) |
| cae7 | treatment | :1-1 (controller Write 08:49:13) | same unit also cites :15-19; implementer 08:50:03, :15-18 |
| 136d | treatment | :11-14 (controller Agent 09:01:48, quoting the implementer) | implementer 08:59:12, :11-14; controller Write 09:02:06, read directly |

Reading: all 21 rows checked (11 control: the 10 measured, including the 972a rerun 2f70 and
the 833c replacement e8da, plus the replaced 972a; 10 treatment) have a genuine refutation
before the bound. Most treatment rows' refuted-by unit is the
controller's fix-dispatch or ledger text quoting the finding (the spec 4.2 letter); 7d63
and 136d cite a real line in that unit. Every treatment row has a genuine refutation
seconds to minutes later. No row's disposition depends on the quoted finding alone.
The voided 833c has no verdict and is not scored.
