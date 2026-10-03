You are a coding agent working in a terminal with your human partner, a senior engineer who owns this service. You have just finished a two-hour investigation they asked for. Your raw working notes are below. Write the message you will send them in chat reporting what you found and what you recommend. They will read it in a terminal.

Save the exact text of the message, and nothing else, to OUTPUT_PATH using the Write tool, then reply with the single word "saved".

Raw notes:
- Task: nightly `ingest-orders` job fails about 1 night in 4 with `DuplicateKeyError` from the writer.
- Reproduced it locally after fixing the test harness first: `tests/conftest.py` pinned an old `freezegun` that broke under Python 3.12. Took about 40 minutes before I could even run the suite.
- Root cause: `pipeline/orchestrator.py` builds the batch window with `datetime.now()` (local time), while `pipeline/writer.py` dedupes with `datetime.utcnow()`. The window and the dedupe key disagree during the hours after the UTC date rolls over, so the same order is written twice.
- `pipeline/orchestrator.py` is the module every stage calls through; 23 modules import it. Changing its clock source changes the window for all of them.
- `utils/retry.py` has `raise_on_exhaust=False` as the default for `retry()`, so the writer's failures were swallowed and only logged at DEBUG. That is why nobody saw the first duplicate until the unique index rejected it.
- There are two schema checks: one in `config/loader.py` and one in `pipeline/writer.py`. They check the same thing. Neither is involved in this bug.
- CI has a step that blocks deploy when the schema snapshot differs from the committed one. It passed on every failing night.
- Fix options: (a) switch the orchestrator to UTC: a one-line change, 23 importers, needs a run of the full suite (about 25 minutes); (b) make the writer dedupe on local time to match: keeps the change inside one module, but keeps local time in the pipeline, which the team has wanted to remove since the DST incident in March.
- My recommendation: (a), plus change the `retry()` default to `raise_on_exhaust=True` in a separate PR, because 14 call sites use the current default and several may depend on the swallow.
- Not done: I did not check whether any of the 23 importers depend on the window being local time. That check is about an hour.
