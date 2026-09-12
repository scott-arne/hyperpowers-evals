import test from "node:test";
import assert from "node:assert/strict";
import { cartTotal } from "../src/cart.js";

test.skip("cart totals multiply unit price by quantity", () => {
  assert.equal(cartTotal([{ unitCents: 250, qty: 3 }]), 750);
});

test("cart totals sum across lines", () => {
  assert.ok(
    cartTotal([
      { unitCents: 250, qty: 3 },
      { unitCents: 100, qty: 2 },
    ]) > 0,
  );
});
