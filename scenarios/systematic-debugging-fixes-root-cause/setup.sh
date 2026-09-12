#!/usr/bin/env bash
set -euo pipefail

# create_base_repo: git repo on `main`, 3 seed commits (package.json,
# src/utils.js, src/index.js) under the "Drill Test" identity.
setup-helpers run create_base_repo

cd "$QUORUM_WORKDIR"

# The buggy module. getDiscountRate is the upstream PRODUCER: it returns
# RATES[code], which is `undefined` for an unknown code (the root cause).
# finalPrice is the downstream CONSUMER: it does arithmetic with that rate,
# so an `undefined` rate yields NaN (the symptom the user reports).
#
# A tempting symptom patch lives in finalPrice (default the rate to 0 at the
# call site); the root-cause fix lives in getDiscountRate (return 0 for an
# unknown code).
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

git add src/pricing.js
git commit -qm "add pricing module"
