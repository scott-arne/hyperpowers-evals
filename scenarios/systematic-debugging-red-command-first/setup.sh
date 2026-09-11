#!/usr/bin/env bash
set -euo pipefail

# create_base_repo: git repo on `main`, 3 seed commits, "Drill Test" identity.
setup-helpers run create_base_repo

cd "$QUORUM_WORKDIR"

# Producer/consumer bug: getDiscountRate returns undefined for an unknown
# code, so finalPrice yields NaN. This scenario does not grade the SHAPE of
# the fix differently from its sibling; it grades whether a failing command
# with real output preceded the first hypothesis.
cat > src/pricing.js <<'JS'
// Pricing helpers for checkout.

const RATES = {
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
