const test = require('node:test');
const assert = require('node:assert');

const { getDiscountRate, finalPrice } = require('../src/pricing.js');
const { receipt } = require('../src/checkout.js');

test('known code discounts the price', () => {
  assert.strictEqual(getDiscountRate('SAVE10'), 0.1);
  assert.strictEqual(finalPrice(100, 'SAVE10'), 90);
});

test('unrecognized code means no discount', () => {
  assert.strictEqual(getDiscountRate('BOGUS'), 0);
  assert.strictEqual(finalPrice(100, 'BOGUS'), 100);
});

test('missing code means no discount', () => {
  assert.strictEqual(finalPrice(100, undefined), 100);
});

test('receipt shows full price for an unrecognized code', () => {
  const lines = receipt({ id: 8812, price: 100, code: 'BOGUS' });
  assert.strictEqual(lines, ['Order 8812', 'Item:  $100.00', 'Total: $100.00'].join('\n'));
});
