import { expect, test } from 'bun:test';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { type PhaseFs, writePhase } from '../src/runner/phase.ts';

test('writePhase writes {phase, updated_at, pid}', () => {
  const dir = mkdtempSync(join(tmpdir(), 'phase-'));
  writePhase(dir, 'agent');
  const j = JSON.parse(readFileSync(join(dir, 'phase.json'), 'utf8'));
  expect(j.phase).toBe('agent');
  expect(typeof j.pid).toBe('number');
  expect(j.pid).toBe(process.pid);
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
