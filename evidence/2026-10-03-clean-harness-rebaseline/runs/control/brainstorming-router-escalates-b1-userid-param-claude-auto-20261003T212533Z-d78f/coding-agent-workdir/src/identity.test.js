import { test } from "node:test";
import assert from "node:assert/strict";
import { getUserId } from "./identity.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error("storage blocked");
    },
    setItem: () => {
      throw new Error("storage blocked");
    },
  };
}

test("generates and persists a UUID when storage is empty", () => {
  const storage = fakeStorage();
  const id = getUserId(storage);
  assert.match(id, UUID_RE);
  assert.equal(storage.data.userId, id);
});

test("returns the same ID on subsequent calls", () => {
  const storage = fakeStorage();
  assert.equal(getUserId(storage), getUserId(storage));
});

test("reuses an ID already in storage", () => {
  const storage = fakeStorage({ userId: "existing-id" });
  assert.equal(getUserId(storage), "existing-id");
  assert.equal(storage.data.userId, "existing-id");
});

test("falls back to a stable in-memory ID when storage throws", () => {
  const first = getUserId(throwingStorage());
  const second = getUserId(throwingStorage());
  assert.match(first, UUID_RE);
  assert.equal(first, second);
});
