// Pricing helpers for checkout.

const RATES = {
  // Null prototype: the table is a pure lookup and never inherits Object
  // members, so an unknown code always misses.
  __proto__: null,
  SAVE10: 0.1,
  SAVE20: 0.2,
  HALFOFF: 0.5,
};

// Returns the discount rate for a code. An unrecognized code is not a failure:
// it means no discount, so the miss resolves to 0 rather than undefined.
function getDiscountRate(code) {
  const rate = RATES[code];
  return rate === undefined ? 0 : rate;
}

// Returns the price after applying the discount for `code`.
function finalPrice(price, code) {
  const rate = getDiscountRate(code);
  return price - price * rate;
}

module.exports = { getDiscountRate, finalPrice };
