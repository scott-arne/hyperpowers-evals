import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changelogSection } from './changelog.js';
import { bumpVersion } from './version.js';

test('bumps each part and drops a pre-release tag', () => {
  assert.equal(bumpVersion('0.9.0', 'patch'), '0.9.1');
  assert.equal(bumpVersion('0.9.3', 'minor'), '0.10.0');
  assert.equal(bumpVersion('1.0.0-rc.2', 'major'), '2.0.0');
});

test('groups changelog entries by area', () => {
  assert.equal(
    changelogSection('0.9.1', '2026-10-01', ['Pipeline: add the deploys snapshot', 'Fix the oncall table']),
    '## 0.9.1 (2026-10-01)\n\n### Pipeline\n\n- add the deploys snapshot\n\n### Dashboard\n\n- Fix the oncall table\n',
  );
});
