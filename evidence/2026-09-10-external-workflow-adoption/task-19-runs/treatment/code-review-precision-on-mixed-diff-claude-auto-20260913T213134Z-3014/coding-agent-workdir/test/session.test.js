import test from "node:test";
import assert from "node:assert/strict";
import { expiresAt, displayName, elapsedMinutes, describe } from "../src/session.js";

const FIXTURE = {
  issuedAt: 1750000000,
  apiKey: "test-key-0000000000000000",
  user: { displayName: "Ada Lovelace" },
};

test("sessions expire one day after issue", () => {
  assert.equal(expiresAt(FIXTURE.issuedAt), 1750086400);
});

test("sessions without a user render as anonymous", () => {
  assert.equal(displayName(null), "anonymous");
  assert.equal(displayName(FIXTURE), "Ada Lovelace");
});

test("elapsedMinutes rejects a negative duration", () => {
  assert.throws(() => elapsedMinutes(-1));
});

test("describe names the revoked state", () => {
  assert.equal(describe("revoked"), "invalidated by an operator");
});
