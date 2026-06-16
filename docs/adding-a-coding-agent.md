# Adding A Coding-Agent

Use this checklist to add a new quorum Coding-Agent target. Keep the shape
narrow: one target name, one YAML config, one launcher/HOWTO, one provisioning
adapter when needed, and one normalizer.

For running existing targets, use
[coding-agent-care-and-feeding.md](coding-agent-care-and-feeding.md).

## Before You Start

Confirm the CLI can run headlessly in a terminal and produce inspectable
session evidence. A desktop-only IDE integration cannot satisfy quorum.

Decide:

- Target name, e.g. `myagent`, used in `--coding-agent myagent`.
- Required credentials, and whether they use environment variables, OAuth files,
  or both.
- Where the CLI stores config and sessions when `HOME` is a throwaway directory.
- How Superpowers is installed or staged from `SUPERPOWERS_ROOT`.
- Which raw logs prove behavior and normalize into ATIF.

Do not add public-CI live runs. Live evals are trusted-maintainer operations.

## Files To Add

1. Add `coding-agents/<name>.yaml`.

   Include the CLI command, required environment variables, concurrency limits,
   `home_config_subdir`, and the session-log directory pattern used by capture.

2. Add `coding-agents/<name>-context/HOWTO.md`.

   This is what the Gauntlet-Agent reads. It should explain how to launch the
   generated agent command, how to observe the session log, and when the run is
   complete. Keep it factual and target-specific.

3. Add `coding-agents/<name>-context/launch-agent` when the target needs a
   custom launcher.

   The launcher must run from the scenario workdir, use `$QUORUM_HOME_ENV` to
   pin `HOME`, XDG dirs, and `TMPDIR`, and avoid reading the operator's real
   home-relative state.

4. Add or update `src/agents/<name>.ts`.

   Use the provisioning adapter for target-specific config seeding, auth-file
   copying, preflight checks, plugin staging, and launcher substitutions. Route
   subprocesses through `src/agents/command-runner.ts` so tests can fake them.

5. Register the target in `src/agents/index.ts` and update the agent config
   schema if the target needs new fields.

6. Add `src/normalize/<name>.ts`.

   Convert the raw session evidence into ATIF `Trajectory` rows. Transcript
   checks read the normalized trace at `<run>/trajectory.json`.

7. Wire capture/economics behavior only where the shared path cannot cover the
   new target.

   Prefer the existing snapshot/diff capture path. Add target-specific export
   code only when the CLI stores sessions in a database or hidden state that
   must be materialized first.

8. Add a bootstrap scenario gated to the new agent.

   Use a `# coding-agents: <name>` directive in `checks.sh` and check
   provisioning and behavioral evidence when possible.

9. Update docs.

   Add the target to [coding-agent-care-and-feeding.md](coding-agent-care-and-feeding.md)
   and update README's agent list. If the target has unusual auth, capture, or
   safety behavior, document that in the care guide.

## Implementation Rules

- Keep each run's agent state under `<run>/home`; never symlink or read the
  operator's real `~/.<agent>` at runtime.
- Seed credentials into the run home before launch, with chmod `0600` for
  secret-bearing files.
- Use `SUPERPOWERS_ROOT` as the plugin/skill source. A globally installed plugin
  must not satisfy the eval accidentally.
- Fail closed when provisioning evidence or expected transcripts are missing.
- Treat empty normalized traces as capture failures for strict backends.
- Keep target-specific behavior in the target adapter and normalizer; do not put
  agent conditionals in scenarios.

## Verification

Run static checks first:

```bash
bun run check
bun run quorum check
```

Then run a live bootstrap smoke for the new target:

```bash
bun run quorum run scenarios/<name>-superpowers-bootstrap --coding-agent <name>
bun run quorum show <run-dir>
```

For a useful smoke, verify:

- The CLI launched under `<run>/home`, not the operator's real home.
- Superpowers was installed or staged from `SUPERPOWERS_ROOT`.
- Raw session evidence exists where the config says it should.
- `<run>/trajectory.json` contains the expected skill/tool rows.
- Secret-bearing files remain inside `results/` and are not committed.
