---
name: reportkit-export-subcommand-design
description: "Decided-but-unimplemented design for the reportkit `export` subcommand (formats, destination, schema)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5dda2147-3827-4501-9a31-57eb86bd7877
  modified: 2026-09-12T18:32:28.544Z
---

As of 2026-09-12, a `reportkit export` subcommand is designed but NOT approved
and NOT implemented. The user said "looks reasonable, I'll think it over."
Three forks were explicitly decided by the user during brainstorming:

- **Formats: CSV and JSON, explicitly not PDF.** Selected via a required
  `--format {csv,json}` option.
- **Destination: explicit `--out PATH`.** Rejected the `--out-dir` +
  derived-filename option, so reportkit owns no filename policy; the external
  `/usr/local/bin/reportkit-nightly` cron wrapper builds the dated name.
- **Schema: exact integer cents, total carried structurally.** CSV is
  `account_id,cents` with a header and deliberately no total row (a total row
  breaks naive CSV parsers); JSON is `{day, rows[], total_cents}`. Rejected
  formatted decimal strings and the both-columns variant.

**Why:** these are user decisions about an unbuilt feature, so nothing in the
repo or git history records them. The schema in particular is the durable part
— once a downstream consumer parses the file, it is expensive to change.

**How to apply:** if this work resumes, do not re-litigate these three choices;
pick up from the approval gate. The open items still to confirm were the atomic
write (temp file + `os.replace`) and whether to bump the version. `summarize`
stays untouched so the cron email keeps working.
