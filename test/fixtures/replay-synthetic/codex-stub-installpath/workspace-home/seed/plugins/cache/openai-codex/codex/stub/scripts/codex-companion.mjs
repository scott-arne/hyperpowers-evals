#!/usr/bin/env node
// The smallest stand-in for the seeded codex-companion.mjs stub that answers
// the readiness probe the archived pre-checks ran: `setup --json` prints the
// shape the gate reads and exits 0. The real stub
// (src/setup-helpers/codex-seed.ts) also serves the review and job
// subcommands; a counterfactual only has to answer the command the check
// shape runs.
process.stdout.write(JSON.stringify({ ready: true }));
