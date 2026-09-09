// Oracle regression for scenarios/tdd-runs-the-project-suite.
//
// Two defects this guards, both found by re-reading the scenario's own archived
// runs (control codex …-f9c5, treatment codex …-0f52):
//
//   1. The bare-suite assertion used to read the fixture runner's shared
//      .test-history.log. The Gauntlet-Agent verifies the work with its own
//      `npm test`, whose line lands in that same log, so the check passed for
//      the control Codex run — which only ever ran `npm test -- tests/…`. The
//      assertion now reads the Coding-Agent's transcript, which carries the
//      agent under test and nothing else.
//
//   2. skill-called never fired for Codex. This build wraps every shell command
//      in an `exec` tool whose input is a JavaScript program calling
//      tools.exec_command({cmd}), and the Codex normalizer left that program
//      opaque, so no command-shaped check could see the SKILL.md read.
//
// The check strings are read out of the real checks.sh rather than restated, so
// this test fails if the scenario's oracle drifts away from what it asserts.

import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { flattenToolCalls, type ToolCallView } from '../src/atif/project.ts';
import { transcriptOutcome } from '../src/check/transcript-dispatch.ts';
import { normalizeCodex } from '../src/normalize/codex.ts';

const REPO = resolve(import.meta.dir, '..');
const CHECKS = resolve(
  REPO,
  'scenarios',
  'tdd-runs-the-project-suite',
  'checks.sh',
);

// --- the scenario's own check lines -----------------------------------------

/** Split a checks.sh line into argv the way the shell would, honouring the
 *  single/double quotes the check DSL uses around regex arguments. */
function argvOf(line: string): string[] {
  const argv: string[] = [];
  let current = '';
  let quote: string | null = null;
  let open = false;
  for (const ch of line.trim()) {
    if (quote !== null) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      open = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (open) argv.push(current);
      current = '';
      open = false;
      continue;
    }
    current += ch;
    open = true;
  }
  if (open) argv.push(current);
  return argv;
}

/** The argv of the scenario's `check-transcript <verb> …` line, minus the
 *  wrapper and the verb. Fails loudly if the line is gone. */
function transcriptCheckArgs(verb: string): string[] {
  const lines = readFileSync(CHECKS, 'utf8').split('\n');
  const line = lines.find((l) =>
    l.trim().startsWith(`check-transcript ${verb} `),
  );
  if (line === undefined) {
    throw new Error(`checks.sh has no 'check-transcript ${verb}' line`);
  }
  return argvOf(line).slice(2);
}

function outcome(verb: string, calls: ToolCallView[]) {
  return transcriptOutcome(
    verb,
    transcriptCheckArgs(verb),
    calls,
    calls.length === 0,
  );
}

// --- fixtures ---------------------------------------------------------------
//
// Verbatim `exec` programs from the two archived Codex runs, with the run
// directory shortened to /run. Codex emits them as custom_tool_call payloads
// whose input is the program text.

const SKILL_READS_CONTROL = `const r = await Promise.all([
  tools.exec_command({cmd:"sed -n '1,240p' '/run/home/.codex/plugins/cache/debug/superpowers/local/skills/systematic-debugging/SKILL.md'","workdir":"/run/coding-agent-workdir","yield_time_ms":10000,"max_output_tokens":20000}),
  tools.exec_command({cmd:"sed -n '1,280p' '/run/home/.codex/plugins/cache/debug/superpowers/local/skills/test-driven-development/SKILL.md'","workdir":"/run/coding-agent-workdir","yield_time_ms":10000,"max_output_tokens":30000})
]);
for (const x of r) text(x.output);
`;

const FILE_SCOPED_RUN = `const r = await tools.exec_command({cmd:"npm test -- tests/parser.test.js","workdir":"/run/coding-agent-workdir","yield_time_ms":30000,"max_output_tokens":20000});
text(JSON.stringify(r));
`;

const FILE_SCOPED_THEN_BARE_RUN = `const r = await Promise.all([
  tools.exec_command({cmd:"npm test -- tests/parser.test.js","workdir":"/run/coding-agent-workdir","yield_time_ms":30000,"max_output_tokens":12000}),
  tools.exec_command({cmd:"npm test","workdir":"/run/coding-agent-workdir","yield_time_ms":30000,"max_output_tokens":20000})
]);
for (let i=0;i<r.length;i++){ text(\`---RUN \${i+1} exit_code=\${r[i].exit_code}---\\n\${r[i].output}\`); }`;

function codexRollout(programs: string[]): ToolCallView[] {
  const raw = programs
    .map((input, i) =>
      JSON.stringify({
        type: 'response_item',
        payload: {
          type: 'custom_tool_call',
          name: 'exec',
          input,
          call_id: `call_${i + 1}`,
        },
      }),
    )
    .join('\n');
  return flattenToolCalls(normalizeCodex(raw, 'test'));
}

function bash(...commands: string[]): ToolCallView[] {
  return commands.map((command) => ({ tool: 'Bash', args: { command } }));
}

// --- the control Codex run: the defect both checks used to miss --------------

test('control Codex run fails the bare-suite check (it only ran the named file)', () => {
  const calls = codexRollout([
    SKILL_READS_CONTROL,
    FILE_SCOPED_RUN,
    FILE_SCOPED_RUN,
  ]);
  // The failure has to be about scope, not about a transcript the checks
  // cannot read: the run's `npm test` commands are visible, and none is bare.
  const shell = calls
    .filter((c) => c.tool === 'Bash')
    .map((c) => String(c.args['command']));
  expect(shell.filter((c) => c.includes('npm test')).length).toBe(2);
  expect(outcome('tool-arg-match', calls).passed).toBe(false);
});

test('control Codex run passes skill-called (it did read SKILL.md)', () => {
  const calls = codexRollout([SKILL_READS_CONTROL, FILE_SCOPED_RUN]);
  expect(outcome('skill-called', calls).passed).toBe(true);
});

// --- the treatment Codex run: the behaviour the arm was measuring ------------

test('treatment Codex run passes both transcript checks', () => {
  const calls = codexRollout([
    SKILL_READS_CONTROL,
    FILE_SCOPED_RUN,
    FILE_SCOPED_THEN_BARE_RUN,
  ]);
  expect(outcome('skill-called', calls).passed).toBe(true);
  expect(outcome('tool-arg-match', calls).passed).toBe(true);
});

// --- the same oracle over the Claude shape -----------------------------------

test('bare suite run survives redirection and a pipe', () => {
  expect(
    outcome('tool-arg-match', bash('npm test 2>&1 | tail -30')).passed,
  ).toBe(true);
  expect(outcome('tool-arg-match', bash('cd repo && npm test')).passed).toBe(
    true,
  );
  expect(
    outcome('tool-arg-match', bash('node tools/run-tests.js')).passed,
  ).toBe(true);
});

test('file-scoped runs alone never satisfy the bare-suite check', () => {
  expect(
    outcome(
      'tool-arg-match',
      bash(
        'npm test -- tests/parser.test.js',
        'npm test -- tests/parser.test.js 2>&1 | tail -20',
        'node tools/run-tests.js tests/parser.test.js',
      ),
    ).passed,
  ).toBe(false);
});

test('an empty transcript fails the bare-suite check', () => {
  expect(outcome('tool-arg-match', []).passed).toBe(false);
});
