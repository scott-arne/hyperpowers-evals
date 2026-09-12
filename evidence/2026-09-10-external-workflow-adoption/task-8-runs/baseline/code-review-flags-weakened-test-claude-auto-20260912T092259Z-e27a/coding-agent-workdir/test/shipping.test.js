import test from "node:test";
import assert from "node:assert/strict";
import { shippingCents } from "../src/cart.js";

test("orders below the free-shipping threshold pay the flat rate", () => {
  assert.equal(shippingCents(4999), 599);
});

test("orders at or above the threshold ship free", () => {
  assert.equal(shippingCents(5000), 0);
});
