import { expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FinalVerdictSchema } from '../src/contracts/verdict.ts';
import {
  buildStoppedVerdict,
  writeStoppedVerdict,
} from '../src/runner/stopped.ts';

test('buildStoppedVerdict is indeterminate with stage=stopped', () => {
  const v = buildStoppedVerdict({
    scenario: 'demo',
    codingAgent: 'claude',
    startedAt: '2026-06-12T00:00:00.000Z',
  });
  const parsed = FinalVerdictSchema.parse(v);
  expect(parsed.final).toBe('indeterminate');
  expect(parsed.error?.stage).toBe('stopped');
  expect(parsed.scenario).toBe('demo');
});

test('writeStoppedVerdict lands verdict.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stopped-'));
  writeStoppedVerdict(dir, {
    scenario: 'demo',
    codingAgent: 'claude',
    startedAt: '2026-06-12T00:00:00.000Z',
  });
  const j = FinalVerdictSchema.parse(
    JSON.parse(readFileSync(join(dir, 'verdict.json'), 'utf8')),
  );
  expect(j.final).toBe('indeterminate');
  expect(j.error?.stage).toBe('stopped');
});

test('a stopped verdict without a captured provenance carries no provenance field', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'stopped-'));
  writeStoppedVerdict(runDir, {
    scenario: 'scn',
    codingAgent: 'claude',
    startedAt: '2026-10-05T00:00:00.000Z',
  });
  const verdict = JSON.parse(
    readFileSync(join(runDir, 'verdict.json'), 'utf8'),
  );
  expect(verdict.final).toBe('indeterminate');
  expect('provenance' in verdict).toBe(false);
});

test('a stopped verdict carries the provenance handed to it and never reads provenance.json', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'stopped-'));
  const provenance = {
    evals_commit: 'a'.repeat(40),
    evals_clean: true,
    gauntlet: { path: null, checkout: null, commit: null, clean: null },
  };
  writeFileSync(
    join(runDir, 'provenance.json'),
    JSON.stringify({ ...provenance, evals_commit: 'f'.repeat(40) }),
  );
  writeStoppedVerdict(runDir, {
    scenario: 'scn',
    codingAgent: 'claude',
    startedAt: '2026-10-05T00:00:00.000Z',
    provenance,
  });
  const verdict = JSON.parse(
    readFileSync(join(runDir, 'verdict.json'), 'utf8'),
  );
  expect(verdict.provenance).toEqual(provenance);
});

test('a malformed provenance.json cannot stop a stopped verdict from being written', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'stopped-'));
  writeFileSync(join(runDir, 'provenance.json'), '{"evals_commit": ');
  writeStoppedVerdict(runDir, {
    scenario: 'scn',
    codingAgent: 'claude',
    startedAt: '2026-10-05T00:00:00.000Z',
  });
  const verdict = JSON.parse(
    readFileSync(join(runDir, 'verdict.json'), 'utf8'),
  );
  expect(verdict.final).toBe('indeterminate');
  expect('provenance' in verdict).toBe(false);
});
