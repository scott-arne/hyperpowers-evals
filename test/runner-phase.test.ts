import { expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { runScenario } from '../src/runner/index.ts';
import { type PhaseFs, writePhase } from '../src/runner/phase.ts';

test('writePhase writes {phase, updated_at, pid, host}', () => {
  const dir = mkdtempSync(join(tmpdir(), 'phase-'));
  writePhase(dir, 'agent');
  const j = JSON.parse(readFileSync(join(dir, 'phase.json'), 'utf8'));
  expect(j.phase).toBe('agent');
  expect(typeof j.pid).toBe('number');
  expect(j.pid).toBe(process.pid);
  expect(j.host).toBe(hostname());
  expect(typeof j.updated_at).toBe('string');
  expect(
    readdirSync(dir).filter((n) => n.startsWith('phase.json.tmp-')),
  ).toEqual([]);
});

test('writePhase writes a temporary file and renames it over phase.json, never writing phase.json itself', () => {
  const dir = mkdtempSync(join(tmpdir(), 'phase-'));
  try {
    const ops: string[] = [];
    const recording: PhaseFs = {
      writeFileSync: (p, data) => {
        ops.push(`write ${basename(p)}`);
        writeFileSync(p, data);
      },
      renameSync: (from, to) => {
        ops.push(`rename ${basename(from)} ${basename(to)}`);
        renameSync(from, to);
      },
      rmSync: (p, options) => {
        ops.push(`rm ${basename(p)}`);
        rmSync(p, options);
      },
    };
    writePhase(dir, 'checks', recording);
    const tmp = `phase.json.tmp-${process.pid}`;
    expect(ops).toEqual([`write ${tmp}`, `rename ${tmp} phase.json`]);
    expect(
      JSON.parse(readFileSync(join(dir, 'phase.json'), 'utf8')).phase,
    ).toBe('checks');
    expect(
      readdirSync(dir).filter((n) => n.startsWith('phase.json.tmp-')),
    ).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a failed rename leaves the previous phase.json, removes the temporary file and rethrows', () => {
  const dir = mkdtempSync(join(tmpdir(), 'phase-'));
  try {
    writePhase(dir, 'agent');
    const before = readFileSync(join(dir, 'phase.json'), 'utf8');
    const failing: PhaseFs = {
      writeFileSync,
      renameSync: () => {
        throw new Error('rename failed');
      },
      rmSync,
    };
    expect(() => writePhase(dir, 'checks', failing)).toThrow('rename failed');
    expect(readFileSync(join(dir, 'phase.json'), 'utf8')).toBe(before);
    expect(
      readdirSync(dir).filter((n) => n.startsWith('phase.json.tmp-')),
    ).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runScenario leaves phase.json at done once verdict.json is written, for a run that ends in an error verdict', async () => {
  // An unknown coding-agent trips the first guard, so no agent is provisioned;
  // the verdict is still written, and the phase must still end at done.
  const root = mkdtempSync(join(tmpdir(), 'phase-run-'));
  try {
    const codingAgentsDir = join(root, 'agents');
    mkdirSync(codingAgentsDir);
    const { runDir, verdict } = await runScenario({
      scenarioDir: join(root, 'scn'),
      codingAgent: 'no-such-agent',
      codingAgentsDir,
      outRoot: join(root, 'out'),
    });
    expect(verdict.final).toBe('indeterminate');
    expect(existsSync(join(runDir, 'verdict.json'))).toBe(true);
    const phase = JSON.parse(readFileSync(join(runDir, 'phase.json'), 'utf8'));
    expect(phase.phase).toBe('done');
    expect(phase.pid).toBe(process.pid);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
