import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SCHEMAS } from '../src/shared/schemas/index.js';
import { JOBS } from './jobs/index.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const now = Date.parse('2026-10-01T09:30:00Z');

// Every client method answers with what its upstream sent during the run that
// wrote data/: sources/recordings/<source>/<method>.json, named like the URLs.
const sources = new Proxy({}, {
  get: (_, source) => new Proxy({}, {
    get: (_, method) => async () => read(`./sources/recordings/${kebab(source)}/${kebab(method)}.json`),
  }),
});

// A job change that would rewrite a checked-in snapshot fails here first.
for (const [name, job] of Object.entries(JOBS)) {
  test(`${job.snapshot}: the recorded responses replay to data/${job.snapshot}.json`, async () => {
    const { generatedAt, ...stored } = read(`../data/${job.snapshot}.json`);
    const extras = job.extras ? await job.extras(sources) : {};
    assert.deepEqual({ [SCHEMAS[name].key]: await job.collect(sources, { now }), ...extras }, stored);
  });
}
