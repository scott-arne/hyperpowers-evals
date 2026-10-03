import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from './args.js';

test('splits flags from positional arguments', () => {
  assert.deepEqual(parseArgs(['job', 'queues', '--source=rabbitmq.queues', '--dry-run']), {
    _: ['job', 'queues'],
    flags: { source: 'rabbitmq.queues', 'dry-run': true },
  });
});
