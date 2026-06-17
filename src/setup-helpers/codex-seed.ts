// Seed a stub codex-plugin-cc install into the coding agent's throwaway home so
// the hyperpowers Codex review gate takes its "Codex available" path
// deterministically — without a real Codex CLI, auth, or network.
//
// The gate's probe (skills/requesting-code-review/scripts/codex-available.sh)
// resolves the codex install from $HOME/.claude/plugins/installed_plugins.json,
// confirms <installPath>/scripts/codex-companion.mjs exists, then runs
// `node <companion> setup --json` and requires top-level `ready === true`. This
// helper writes a registry entry plus a stub companion that satisfies all three:
// it prints {"ready":true,...} for `setup --json` and a canned review-output
// JSON (verdict + findings) for `review`, so the gate's fix-loop has structured
// input. Everything is deterministic; no real Codex is involved.
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { HelperContext } from './context.ts';

// The agent's throwaway $HOME is a sibling of the workdir: the runner creates
// <runDir>/coding-agent-workdir (the workdir) and <runDir>/home (the agent HOME)
// before running setup.sh, so dirname(workdir)/home is the agent's home and
// already exists. (src/runner/index.ts: workdir = join(runDir,
// 'coding-agent-workdir'); runHomeDir = join(runDir, 'home').)
function agentHomeFromWorkdir(workdir: string): string {
  return join(dirname(workdir), 'home');
}

// A stub codex-companion.mjs. Mirrors the two subcommands the gate invokes:
//   setup --json  -> readiness probe; the gate requires ready===true
//   review …      -> code review; emits the review-output schema shape
// Any other argv prints an empty object and exits 0, so the stub never hard-errors
// the probe. No imports, no Codex, no network — pure deterministic stdout.
const STUB_COMPANION = `#!/usr/bin/env node
// Deterministic stub of codex-plugin-cc's codex-companion.mjs, seeded by the
// hyperpowers-evals codex-seed setup-helper. Real Codex is never invoked.
const argv = process.argv.slice(2);
const sub = argv[0];

if (sub === "setup") {
  // The gate parses only top-level \`ready\`; include the fuller shape for fidelity.
  process.stdout.write(JSON.stringify({
    ready: true,
    node: { available: true, detail: "stub" },
    codex: { available: true, detail: "stub codex-companion" },
    auth: { available: true, loggedIn: true, detail: "stub auth" },
    reviewGateEnabled: false
  }));
  process.exit(0);
}

if (sub === "review" || sub === "adversarial-review") {
  // A canned review-output.schema.json payload: one high finding (maps to the
  // gate's blocking "Important") plus one low (non-blocking "Minor"), so the
  // gate's fix-loop and severity mapping have real input to act on.
  process.stdout.write(JSON.stringify({
    verdict: "needs-attention",
    summary: "Stub Codex review: one blocking and one minor finding.",
    findings: [
      {
        severity: "high",
        title: "Missing input validation on the new handler",
        body: "The new endpoint does not validate its input before use.",
        file: "src/handler.js",
        line_start: 1,
        line_end: 1,
        confidence: 0.9,
        recommendation: "Validate and reject malformed input."
      },
      {
        severity: "low",
        title: "Minor naming nit",
        body: "A helper could be named more clearly.",
        file: "src/handler.js",
        line_start: 10,
        line_end: 10,
        confidence: 0.5,
        recommendation: "Consider a clearer name."
      }
    ],
    next_steps: ["Address the blocking finding, then re-review."]
  }));
  process.exit(0);
}

// Unknown subcommand: emit an empty object rather than erroring, so the probe's
// readiness parse degrades cleanly instead of the stub crashing.
process.stdout.write("{}");
process.exit(0);
`;

// installed_plugins.json shape the probe reads: plugins["codex@openai-codex"] is
// an array of install records; the probe picks the newest record whose
// scripts/codex-companion.mjs exists. We seed exactly one, pointing at the stub.
function registryJson(installPath: string): string {
  return `${JSON.stringify(
    {
      version: 2,
      plugins: {
        'codex@openai-codex': [
          {
            scope: 'user',
            installPath,
            version: 'stub',
            installedAt: '2026-01-01T00:00:00.000Z',
            lastUpdated: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    },
    null,
    2,
  )}\n`;
}

// Seed the stub codex-plugin-cc install into the agent's throwaway home.
// Dispatchable as `setup-helpers run seed_codex_plugin_cc`. Layers onto an
// existing fixture (does its own home-relative writes; no git init), so it can
// follow create_base_repo in a chain.
export function seedCodexPluginCc(ctx: HelperContext): void {
  const home = agentHomeFromWorkdir(ctx.workdir);
  const pluginsDir = join(home, '.claude', 'plugins');
  const installPath = join(
    pluginsDir,
    'cache',
    'openai-codex',
    'codex',
    'stub',
  );
  const scriptsDir = join(installPath, 'scripts');

  mkdirSync(scriptsDir, { recursive: true });

  const companion = join(scriptsDir, 'codex-companion.mjs');
  writeFileSync(companion, STUB_COMPANION, 'utf8');
  chmodSync(companion, 0o755);

  writeFileSync(
    join(pluginsDir, 'installed_plugins.json'),
    registryJson(installPath),
    'utf8',
  );
}
