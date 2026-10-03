You are a coding agent working in a terminal with your human partner. Earlier in this session you traced a failure together, so they already know the background in the notes below. They just asked:

"ok so do we wrap the flaky call in a retry and ship Friday, or fix the ordering thing properly? your call, but tell me why"

Write your reply as you would send it in chat. Save the exact text of the reply, and nothing else, to OUTPUT_PATH using the Write tool, then reply with the single word "saved".

Notes you both already have:
- `billing/sync.py` calls `ledger.post()` and then `inventory.reserve()`. In about 2% of runs, `reserve()` runs before `post()` has committed, and the reconciliation job flags the order.
- `inventory.reserve()` works correctly; it is reading a row the ledger has not committed yet.
- A retry around `reserve()` with a 200 ms backoff hides the problem in testing: 0 flags in 500 local runs.
- The proper fix is to make `sync.py` wait on the ledger commit callback before calling `reserve()`. It touches `billing/sync.py`, `ledger/client.py`, and the two test files. You estimated 1.5 days including a staging soak.
- Friday is in 2 days. The release has 4 other changes in it that marketing has announced.
- `billing/sync.py` is called from the checkout path, the admin refund path, and the nightly batch; all three would get either change.
- The reconciliation job has caught every case so far; no money has moved wrong. Each flagged order costs a support agent about 10 minutes.
- Nothing else in this release touches billing.
