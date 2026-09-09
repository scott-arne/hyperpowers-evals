// Oracle regression for scenarios/brainstorming-asks-tooling-question.
//
// The scenario measures whether a new project's design presentation asks the
// user which tooling to stand up. Two defects made it measure something else:
//
//   1. The seeded Codex stub answered `task` with `{}`. Both gates on the
//      brainstorming architectural path - the approach gate and the spec gate -
//      invoke `codex-companion.mjs task --fresh --prompt-file <path>`, and `{}`
//      normalizes to "incomplete", which is not approval. Every scored session
//      therefore ran the degraded-gate path rather than the normal one, with
//      nothing in the run to say so.
//
//   2. The Global Constraints oracle anchored the section heading immediately
//      after the hashes, so a spec that wrote "## 2. Global Constraints" and
//      recorded the user's selection under it was scored as having no such
//      section at all.
//
// The stub now answers `task` with the shape each caller expects and logs every
// invocation, a check reads that log to prove the spec gate fired, and the
// heading match tolerates a section number. Every case below runs the
// scenario's own stub and evaluates the scenario's own check strings, both read
// out of the scenario files rather than restated here, so this test fails if
// either drifts.

import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { envSnapshot } from '../src/env.ts';

const SCENARIO = resolve(
  import.meta.dir,
  '..',
  'scenarios',
  'brainstorming-asks-tooling-question',
);
const CHECK_TOOL = resolve(
  import.meta.dir,
  '..',
  'src',
  'cli',
  'check-tool.ts',
);

/** One `command-succeeds` assertion, verbatim from the scenario's checks.sh. */
function assertion(needle: string): string {
  const line = readFileSync(join(SCENARIO, 'checks.sh'), 'utf8')
    .split('\n')
    .find(
      (l) => l.trim().startsWith('command-succeeds ') && l.includes(needle),
    );
  if (line === undefined) {
    throw new Error(`checks.sh no longer asserts anything matching ${needle}`);
  }
  const quoted = /^\s*command-succeeds\s+'(.*)'\s*$/.exec(line);
  if (quoted === null) {
    throw new Error(`cannot read the check command out of: ${line}`);
  }
  return quoted[1] as string;
}

/** The seeded Codex stub, verbatim from the scenario's setup.sh. */
function stubSource(): string {
  const setup = readFileSync(join(SCENARIO, 'setup.sh'), 'utf8');
  const heredoc =
    /cat > "\$SCRIPTS_DIR\/codex-companion\.mjs" <<'STUB'\n([\s\S]*?)\nSTUB\n/.exec(
      setup,
    );
  if (heredoc === null) {
    throw new Error('setup.sh no longer writes codex-companion.mjs');
  }
  return heredoc[1] as string;
}

const scratch = mkdtempSync(join(tmpdir(), 'tooling-question-oracle-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let cases = 0;

interface Workdir {
  /** Where the agent works; also where the checks run. */
  readonly dir: string;
  /** What the harness exports as QUORUM_AGENT_CONFIG_DIR. */
  readonly configDir: string;
  /** The seeded stub's entry point. */
  readonly stub: string;
}

function newWorkdir(): Workdir {
  const root = join(scratch, `c${++cases}`);
  const dir = join(root, 'coding-agent-workdir');
  const configDir = join(root, 'home', '.claude');
  const stubDir = join(
    configDir,
    'plugins',
    'cache',
    'openai-codex',
    'codex',
    'stub',
    'scripts',
  );
  mkdirSync(join(dir, 'docs', 'hyperpowers', 'specs'), { recursive: true });
  mkdirSync(stubDir, { recursive: true });
  const stub = join(stubDir, 'codex-companion.mjs');
  writeFileSync(stub, stubSource());
  return { dir, configDir, stub };
}

/** Evaluate one of the scenario's assertions the way the harness would. */
function passes(w: Workdir, check: string): boolean {
  const res = spawnSync('bun', ['run', CHECK_TOOL, 'command-succeeds', check], {
    cwd: w.dir,
    encoding: 'utf8',
    env: { ...envSnapshot(), QUORUM_AGENT_CONFIG_DIR: w.configDir },
  });
  if (res.error) throw res.error;
  // 127 is the crash band: a broken check, not an honest answer.
  if (res.status !== 0 && res.status !== 1) {
    throw new Error(`check-tool exited ${res.status}: ${res.stderr}`);
  }
  return res.status === 0;
}

/** Run the seeded stub exactly as the skills invoke it. */
function callGate(w: Workdir, prompt: string): string {
  const promptFile = join(scratch, `prompt-${++cases}.md`);
  writeFileSync(promptFile, prompt);
  const res = spawnSync(
    'node',
    [w.stub, 'task', '--fresh', '--prompt-file', promptFile],
    { encoding: 'utf8' },
  );
  if (res.status !== 0) throw new Error(`stub failed: ${res.stderr}`);
  return res.stdout;
}

/** The gate's approval authority, from the hyperpowers checkout above this one. */
const NORMALIZE = resolve(
  import.meta.dir,
  '..',
  '..',
  'skills',
  'requesting-code-review',
  'scripts',
  'verdict-normalize',
);

function normalized(text: string, flags: string[] = []): string {
  const payload = join(scratch, `payload-${++cases}.txt`);
  writeFileSync(payload, text);
  const res = spawnSync('bash', [NORMALIZE, ...flags, payload], {
    encoding: 'utf8',
  });
  if (res.status !== 0)
    throw new Error(`verdict-normalize failed: ${res.stderr}`);
  return JSON.parse(res.stdout).result as string;
}

const APPROACH_PROMPT = [
  'You are a stateless reviewer for this request only.',
  '',
  'Read the context file at:',
  '/tmp/run/approach-context.md',
  '',
  'Respond in exactly this shape:',
  '',
  'Approaches (2-3, each genuinely different):',
  '- name: ...',
].join('\n');

const SPEC_PROMPT = [
  'You are a stateless reviewer for this request only.',
  '',
  'Review this design spec as a DOCUMENT (not code):',
  '/tmp/run/coding-agent-workdir/docs/hyperpowers/specs/2026-09-09-csvsink-design.md',
].join('\n');

const LENS_PROMPT = [
  'Read the review dossier first - it is your delivered context: /tmp/gate/dossier.md',
  'Your lens for this review: every requirement present, unambiguous, and internally consistent.',
  'Return exactly the Required document-review output below, adding a Coverage: section before Summary.',
].join('\n');

// --- the Codex gates actually answer ----------------------------------------

test('the stub answers the approach gate with the shape that gate asks for', () => {
  const w = newWorkdir();
  const out = callGate(w, APPROACH_PROMPT);
  expect(out).toContain('Approaches (2-3, each genuinely different):');
  expect(out).toContain('rough-complexity:');
  // The scenario measures whether the agent asks about tooling, so the stub
  // must never volunteer it.
  expect(out).not.toMatch(
    /\b(ruff|pytest|lint|linting|linter|format|formatter|formatting|coverage|fuzz|mutation testing|test runner|test infrastructure)\b/i,
  );
});

test('the stub answers a document review with a payload that normalizes to approved', () => {
  const w = newWorkdir();
  for (const prompt of [SPEC_PROMPT, LENS_PROMPT]) {
    const out = callGate(w, prompt);
    // Both with and without the coverage floor round-1 lens captures apply.
    expect(normalized(out)).toBe('approved');
    expect(normalized(out, ['--require-coverage'])).toBe('approved');
  }
});

test('the empty answer the old stub gave is not approval', () => {
  expect(normalized('{}')).toBe('incomplete');
});

// --- the spec-gate-fired check ----------------------------------------------

const GATE_CHECK = () => assertion('calls.log');

test('no gate call at all fails the spec-gate check', () => {
  const w = newWorkdir();
  expect(passes(w, GATE_CHECK())).toBe(false);
});

test('an approach-gate call alone does not satisfy the spec-gate check', () => {
  const w = newWorkdir();
  callGate(w, APPROACH_PROMPT);
  expect(passes(w, GATE_CHECK())).toBe(false);
});

test('a spec-gate call satisfies it, by either prompt shape', () => {
  for (const prompt of [SPEC_PROMPT, LENS_PROMPT]) {
    const w = newWorkdir();
    callGate(w, prompt);
    expect(passes(w, GATE_CHECK())).toBe(true);
  }
});

// --- the Global Constraints oracle ------------------------------------------

const GC_CHECK = () => assertion('global constraints');

function withSpec(body: string): Workdir {
  const w = newWorkdir();
  writeFileSync(
    join(w.dir, 'docs', 'hyperpowers', 'specs', '2026-09-09-x-design.md'),
    `# x\n\n${body}`,
  );
  return w;
}

test('a spec whose Global Constraints section names the selection passes', () => {
  for (const heading of [
    '## Global Constraints',
    '### Global Constraints',
    '## **Global Constraints**',
    '## Global Constraints (inherited by every plan)',
    '## 2. Global Constraints',
    '### 4.2 Global Constraints',
    '## 3. **Global Constraints**',
  ]) {
    const w = withSpec(
      `${heading}\n\n- Development dependencies: pytest, ruff.\n`,
    );
    expect(passes(w, GC_CHECK())).toBe(true);
  }
});

test('the selection recorded anywhere but Global Constraints does not count', () => {
  const w = withSpec(
    '## 8. Testing Strategy\n\npytest with a first fixture, ruff with format on.\n',
  );
  expect(passes(w, GC_CHECK())).toBe(false);
});

test('a Global Constraints section naming no tooling does not count', () => {
  for (const heading of ['## Global Constraints', '## 2. Global Constraints']) {
    const w = withSpec(
      `${heading}\n\nPython 3.12. No runtime dependencies.\n\n## Testing\n\npytest.\n`,
    );
    expect(passes(w, GC_CHECK())).toBe(false);
  }
});

test('no spec at all does not count', () => {
  const w = newWorkdir();
  expect(passes(w, GC_CHECK())).toBe(false);
});
