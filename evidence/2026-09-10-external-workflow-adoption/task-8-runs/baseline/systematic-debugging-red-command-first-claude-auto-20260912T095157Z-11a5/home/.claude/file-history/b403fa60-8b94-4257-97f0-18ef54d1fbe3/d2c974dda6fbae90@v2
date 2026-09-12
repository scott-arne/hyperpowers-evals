const test = require('node:test');
const assert = require('node:assert');

const { getDiscountRate, finalPrice } = require('../src/pricing.js');

test('known codes discount the price', () => {
  assert.strictEqual(getDiscountRate('SAVE10'), 0.1);
  assert.strictEqual(finalPrice(100, 'SAVE10'), 90);
  assert.strictEqual(finalPrice(100, 'HALFOFF'), 50);
});

test('an unrecognized code charges full price', () => {
  assert.strictEqual(getDiscountRate('BOGUS'), 0);
  assert.strictEqual(finalPrice(100, 'BOGUS'), 100);
});

// Inherited Object members must not be mistaken for discount codes.
test('an Object member name charges full price', () => {
  assert.strictEqual(finalPrice(100, 'toString'), 100);
});

test('a missing code charges full price', () => {
  assert.strictEqual(finalPrice(100, undefined), 100);
});
