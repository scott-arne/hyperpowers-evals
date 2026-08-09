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
//   adversarial-review (detached job protocol) -> for code gates that need job lifecycle
//   status --json -> report running/finished jobs
//   status <id> --wait --json -> poll a job until terminal
//   result <id> --json -> fetch job result
// Any other argv prints an empty object and exits 0, so the stub never hard-errors
// the probe. No imports, no Codex, no network — pure deterministic stdout.
const STUB_COMPANION = `#!/usr/bin/env node
// Deterministic stub of codex-plugin-cc's codex-companion.mjs, seeded by the
// hyperpowers-evals codex-seed setup-helper. Real Codex is never invoked.
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const { homedir, tmpdir } = require('os');

const argv = process.argv.slice(2);
const sub = argv[0];

// State file for the detached job protocol (when enabled via CODEX_STUB_JOB_PROTOCOL=1
// or the existence of a .codex-stub-job-protocol marker file in the home directory)
const homeDir = homedir();
const jobProtocolEnabled = process.env.CODEX_STUB_JOB_PROTOCOL === '1' ||
                           existsSync(join(homeDir, '.codex-stub-job-protocol'));
const STATE_DIR = process.env.CODEX_STUB_STATE_DIR || join(tmpdir(), 'codex-stub');
const STATE_FILE = join(STATE_DIR, 'jobs.json');

function loadState() {
  if (!existsSync(STATE_FILE)) return { jobs: [] };
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

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

// Detached job protocol for code gates (enabled by CODEX_STUB_JOB_PROTOCOL=1
// or .codex-stub-job-protocol marker file)
if (jobProtocolEnabled) {
  if (sub === "adversarial-review") {
    // Register a job in state and exit; status/result commands will track it
    const state = loadState();
    const jobId = \`job-\${Date.now()}\`;
    state.jobs.push({
      id: jobId,
      status: 'queued',
      jobClass: 'review',
      createdAt: Date.now(),
      polled: false
    });
    saveState(state);
    // Don't print the job id — the gate finds it via status --json
    process.exit(0);
  }

  if (sub === "status") {
    const state = loadState();
    const targetId = argv[1];

    if (argv.includes('--json') && !targetId) {
      // status --json: report running/finished jobs
      const running = state.jobs.filter(j => j.status === 'queued' || j.status === 'running');
      const finished = state.jobs.filter(j => j.status === 'completed' || j.status === 'failed');
      process.stdout.write(JSON.stringify({
        running,
        latestFinished: finished[finished.length - 1] || null,
        recent: state.jobs.slice(-5)
      }));
      process.exit(0);
    }

    if (targetId && argv.includes('--json')) {
      // status <id> --wait --json: poll a job until terminal
      const job = state.jobs.find(j => j.id === targetId);
      if (!job) {
        process.stdout.write(JSON.stringify({ error: 'job not found' }));
        process.exit(1);
      }

      // Advance job state: queued -> running on first poll, running -> completed on second
      if (job.status === 'queued') {
        job.status = 'running';
        job.polled = false;
        saveState(state);
      } else if (job.status === 'running' && !job.polled) {
        job.polled = true;
        saveState(state);
      } else if (job.status === 'running' && job.polled) {
        job.status = 'completed';
        saveState(state);
      }

      process.stdout.write(JSON.stringify({
        job: { status: job.status, id: job.id, jobClass: job.jobClass }
      }));
      process.exit(0);
    }
  }

  if (sub === "result") {
    const jobId = argv[1];
    const state = loadState();
    const job = state.jobs.find(j => j.id === jobId);

    if (!job || job.status !== 'completed') {
      process.stdout.write(JSON.stringify({ error: 'job not completed' }));
      process.exit(1);
    }

    // Return a canned payload whose storedJob.result.result is the approval payload
    const reviewResult = {
      verdict: "approve",
      summary: "Ship: stub review. Coverage: documents read — dossier; adjudicated decisions considered — yes; changed surfaces reviewed — full diff; test evidence inspected — yes.",
      findings: [],
      next_steps: []
    };

    process.stdout.write(JSON.stringify({
      storedJob: {
        result: {
          result: reviewResult,
          rawOutput: JSON.stringify(reviewResult)
        }
      }
    }));
    process.exit(0);
  }
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
