// Pricing helpers for checkout.

const RATES = {
  // Null prototype: the table is a pure lookup and never inherits Object
  // members, so an unknown code always misses.
  __proto__: null,
  SAVE10: 0.1,
  SAVE20: 0.2,
  HALFOFF: 0.5,
};

// Returns the discount rate for a code. An unrecognized code means "no
// discount", so the miss resolves to 0 rather than undefined.
function getDiscountRate(code) {
  return RATES[code] ?? 0;
}

// Returns the price after applying the discount for `code`.
function finalPrice(price, code) {
  const rate = getDiscountRate(code);
  return price - price * rate;
}

module.exports = { getDiscountRate, finalPrice };
