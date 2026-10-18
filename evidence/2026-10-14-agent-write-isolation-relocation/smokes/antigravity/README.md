# Antigravity smoke: not run

Blocked on this host, 2026-10-17, by the human partner's decision. Two
prerequisites are missing and installing or authenticating either was out of
scope for the task:

- The `agy` binary (`coding-agents/antigravity.yaml`) is not on `PATH` and is
  not in the usual install locations.
- `~/.gemini/oauth_creds.json` — the live, rotating OAuth token the agent reads
  at runtime, which provisioning seeds into the run's throwaway home — does not
  exist.

The only Antigravity run on this host is from 2026-06-01
(`triggering-test-driven-development-antigravity-20260601T232434Z-d1ec`).

What this leaves open: the spec's second Assumption — no agent CLI inspects the
absolute workdir path beyond Antigravity's hidden-component rule — is validated
live for Claude and Codex only. The hidden-component rule is exactly why the
directory is named `workspaces` and not `.workspaces` (spec, "Layout";
`src/agents/antigravity.ts:530-546`), so the one agent whose path handling
motivated the name is the one not measured here. The brief's Antigravity
condition — a visible-launch record naming a path under `results/workspaces/` —
is therefore unmeasured, and stays unvalidated live until an Antigravity-capable
host runs `bash evidence/2026-10-14-agent-write-isolation-relocation/smokes/run-smoke.sh antigravity`.
