// Re-score the six archived tdd-runs-the-project-suite runs against the
// repaired oracles. There is no `quorum replay`, so this does what a replay
// would: re-normalize the Codex runs from their preserved rollout logs (the
// Claude normalizer is untouched, so those trajectories stand), then re-run the
// scenario's post() over each run's preserved coding-agent-workdir. The
// Gauntlet-Agent's grade is read from the archived verdict, not re-judged.
//
// Nothing under results/ is written: fresh trajectories land in the round2 dir.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { captureToolCalls } from '/Users/johnss51/Development/agents/hyperpowers/evals/src/capture/index.ts';
import { runPhase } from '/Users/johnss51/Development/agents/hyperpowers/evals/src/checks/index.ts';

const EVALS = '/Users/johnss51/Development/agents/hyperpowers/evals';
const RESULTS = join(EVALS, 'results');
const CHECKS = join(EVALS, 'scenarios/tdd-runs-the-project-suite/checks.sh');
const OUT =
  '/Users/johnss51/.cache/hyperpowers/sdd/193a951fd4f675975a919be372c5015a95aa0491/plans/2026-09-05-gate-calibration-55863419/task-6-runs/round2';

const RUNS: { arm: string; agent: string; dir: string }[] = [
  {
    arm: 'control',
    agent: 'claude-auto',
    dir: 'tdd-runs-the-project-suite-claude-auto-20260909T030930Z-3a53',
  },
  {
    arm: 'control',
    agent: 'claude-sonnet-vertex',
    dir: 'tdd-runs-the-project-suite-claude-sonnet-vertex-20260909T030930Z-0e0d',
  },
  {
    arm: 'control',
    agent: 'codex',
    dir: 'tdd-runs-the-project-suite-codex-20260909T031311Z-f9c5',
  },
  {
    arm: 'treatment',
    agent: 'claude-auto',
    dir: 'tdd-runs-the-project-suite-claude-auto-20260909T032357Z-90f9',
  },
  {
    arm: 'treatment',
    agent: 'claude-sonnet-vertex',
    dir: 'tdd-runs-the-project-suite-claude-sonnet-vertex-20260909T032357Z-92a0',
  },
  {
    arm: 'treatment',
    agent: 'codex',
    dir: 'tdd-runs-the-project-suite-codex-20260909T032650Z-0f52',
  },
];

/** The transcript to score this run against. Codex runs are re-normalized from
 *  their rollout logs so the repaired normalizer is what produced them. */
function transcriptFor(runDir: string, agent: string, outDir: string): string {
  if (!agent.startsWith('codex')) {
    return join(runDir, 'trajectory.json');
  }
  const result = captureToolCalls({
    logDir: join(runDir, 'home/.codex/sessions'),
    logGlob: '**/rollout-*.jsonl',
    snapshot: new Set<string>(),
    normalizer: 'codex',
    runDir: outDir,
    launchCwd: join(runDir, 'coding-agent-workdir'),
  });
  console.log(
    `    re-normalized ${result.sourceLogs.length} rollout log(s) -> ${result.rowCount} tool call(s)`,
  );
  return result.path;
}

const summary: string[] = [];

for (const run of RUNS) {
  const runDir = join(RESULTS, run.dir);
  const outDir = join(OUT, run.arm, run.agent);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n=== ${run.arm}/${run.agent}`);
  console.log(`    ${run.dir}`);

  const verdict = JSON.parse(
    readFileSync(join(runDir, 'verdict.json'), 'utf8'),
  ) as { gauntlet: { status: string }; final: string };

  const transcript = transcriptFor(runDir, run.agent, outDir);
  if (!existsSync(transcript)) {
    throw new Error(`no transcript for ${run.dir}`);
  }

  const { records, exitCode } = await runPhase({
    checksSh: CHECKS,
    phase: 'post',
    workdir: join(runDir, 'coding-agent-workdir'),
    repoRoot: EVALS,
    transcriptPath: transcript,
    runDir,
    codingAgent: run.agent,
  });

  const failed = records.filter((r) => !r.passed);
  for (const r of records) {
    console.log(`    ${r.passed ? 'PASS' : 'FAIL'} ${r.check} — ${r.detail}`);
  }
  const composed =
    verdict.gauntlet.status === 'pass' && failed.length === 0 ? 'pass' : 'fail';
  console.log(
    `    gauntlet=${verdict.gauntlet.status} post-failures=${failed.length} phase-exit=${exitCode} => ${composed} (was ${verdict.final})`,
  );

  writeFileSync(
    join(outDir, 'post-checks.json'),
    `${JSON.stringify(
      {
        run: run.dir,
        arm: run.arm,
        coding_agent: run.agent,
        transcript,
        gauntlet: verdict.gauntlet.status,
        original_final: verdict.final,
        rescored_final: composed,
        phase_exit: exitCode,
        records,
      },
      null,
      2,
    )}\n`,
  );
  summary.push(
    `${run.arm.padEnd(9)} ${run.agent.padEnd(20)} gauntlet=${verdict.gauntlet.status.padEnd(4)} was=${verdict.final.padEnd(4)} now=${composed}`,
  );
}

console.log('\n--- summary ---');
for (const line of summary) console.log(line);
