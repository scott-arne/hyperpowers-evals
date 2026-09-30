'use strict';

const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/store');
const handlers = require('../src/handlers');

const CLOCK = Date.UTC(2026, 0, 1);

function seed() {
  store.orders.length = 0;
  for (let i = 0; i < 25; i += 1) {
    store.orders.push({
      id: `ord_${String(i).padStart(8, '0')}`,
      total: (i + 1) * 100,
      createdAt: new Date(CLOCK + i * 1000).toISOString(),
    });
  }
}

test('listOrdersHandler returns a page of orders', async () => {
  seed();
  const res = await handlers.listOrdersHandler({ page: 1, size: 10 });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.size, 10);
  assert.strictEqual(res.orders.length, 10);
});

test('createOrderHandler rejects a malformed id', () => {
  const res = handlers.createOrderHandler({ id: 'nope', total: 100 });
  assert.strictEqual(res.status, 400);
});
