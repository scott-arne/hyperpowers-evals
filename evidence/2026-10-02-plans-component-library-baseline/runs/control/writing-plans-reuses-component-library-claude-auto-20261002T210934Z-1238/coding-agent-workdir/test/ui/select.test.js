import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterBar, selectField } from '../../src/ui/index.js';

test('marks the selected option', () => {
  const html = selectField({
    name: 'env',
    label: 'Environment',
    options: [
      { value: '', label: 'All' },
      { value: 'staging', label: 'staging' },
    ],
    value: 'staging',
  });
  assert.match(html, /<select name="env" class="ui-select" data-autosubmit>/);
  assert.match(html, /<option value="staging" selected>staging<\/option>/);
  assert.match(html, /<option value="">All<\/option>/);
});

test('filterBar carries kept query values in hidden inputs', () => {
  const html = filterBar({ action: '/x', fields: ['<i>f</i>'], keep: { sort: 'name', dir: '' } });
  assert.match(html, /^<form class="ui-filter-bar" method="get" action="\/x"><i>f<\/i>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.doesNotMatch(html, /name="dir"/);
});
