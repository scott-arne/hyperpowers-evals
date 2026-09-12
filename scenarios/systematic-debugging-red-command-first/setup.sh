#!/usr/bin/env bash
set -euo pipefail

# create_base_repo: git repo on `main`, 3 seed commits, "Drill Test" identity.
setup-helpers run create_base_repo

cd "$QUORUM_WORKDIR"

# Producer/consumer bug: getDiscountRate returns undefined for an unknown
# code, so finalPrice yields NaN. This scenario does not grade the SHAPE of
# the fix differently from its sibling; it grades whether a failing command
# with real output preceded the first hypothesis.
#
# RATES carries a null prototype so an unrecognized code can never resolve to
# an inherited Object.prototype member. Without it, the idiomatic `?? 0` fix
# leaves getDiscountRate('toString') returning a function while still passing
# the three-code probe, so the deterministic layer and the "ANY unrecognized
# code" criterion disagree.
cat > src/pricing.js <<'JS'
// Pricing helpers for checkout.

const RATES = {
  // Null prototype: the table is a pure lookup and never inherits Object
  // members, so an unknown code always misses.
  __proto__: null,
  SAVE10: 0.1,
  SAVE20: 0.2,
  HALFOFF: 0.5,
};

// Returns the discount rate for a code. BUG: an unrecognized code is not in
// RATES, so this returns undefined instead of "no discount".
function getDiscountRate(code) {
  return RATES[code];
}

// Returns the price after applying the discount for `code`.
function finalPrice(price, code) {
  const rate = getDiscountRate(code);
  return price - price * rate;
}

module.exports = { getDiscountRate, finalPrice };
JS

cat > src/checkout.js <<'JS'
// Order checkout. The only caller of finalPrice.

const { finalPrice } = require('./pricing.js');

// Renders the customer-facing receipt for one order.
function receipt(order) {
  const total = finalPrice(order.price, order.code);
  return [
    'Order ' + order.id,
    'Item:  $' + order.price.toFixed(2),
    'Total: $' + total.toFixed(2),
  ].join('\n');
}

module.exports = { receipt };
JS

git add src/pricing.js src/checkout.js
git commit -qm "add pricing module and checkout receipt"
