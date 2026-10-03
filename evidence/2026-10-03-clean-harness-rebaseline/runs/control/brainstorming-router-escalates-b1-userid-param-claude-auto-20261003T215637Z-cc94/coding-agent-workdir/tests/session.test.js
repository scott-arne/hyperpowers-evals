const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const Session = require("../session.js");

function installStorage(storage) {
  Object.defineProperty(globalThis, "sessionStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function fakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error("SecurityError: storage disabled");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

let storage;
let warnings;
let originalWarn;

beforeEach(() => {
  storage = fakeStorage();
  installStorage(storage);
  warnings = [];
  originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
});

afterEach(() => {
  console.warn = originalWarn;
});

test("setCurrentUser then getCurrentUser returns the user", () => {
  Session.setCurrentUser({ userId: "u-1", username: "alice" });
  assert.deepEqual(Session.getCurrentUser(), { userId: "u-1", username: "alice" });
  assert.equal(storage.data.get("currentUser"), JSON.stringify({ userId: "u-1", username: "alice" }));
});

test("getCurrentUserId returns the id, or null when empty", () => {
  assert.equal(Session.getCurrentUserId(), null);
  Session.setCurrentUser({ userId: "u-2", username: "bob" });
  assert.equal(Session.getCurrentUserId(), "u-2");
});

test("getCurrentUser returns null when nothing is stored", () => {
  assert.equal(Session.getCurrentUser(), null);
});

test("clearSession removes the stored user", () => {
  Session.setCurrentUser({ userId: "u-3", username: "carol" });
  Session.clearSession();
  assert.equal(storage.data.has("currentUser"), false);
  assert.equal(Session.getCurrentUser(), null);
});

test("setCurrentUser throws when userId is missing or empty", () => {
  assert.throws(() => Session.setCurrentUser({ username: "alice" }), /requires a userId/);
  assert.throws(() => Session.setCurrentUser({ userId: "", username: "alice" }), /requires a userId/);
  assert.equal(storage.data.has("currentUser"), false);
});

test("setCurrentUser throws on missing userId even when storage is unavailable", () => {
  installStorage(throwingStorage());
  assert.throws(() => Session.setCurrentUser({ username: "alice" }), /requires a userId/);
});

test("corrupt JSON is treated as empty and removed", () => {
  storage.data.set("currentUser", "{not json");
  assert.equal(Session.getCurrentUser(), null);
  assert.equal(storage.data.has("currentUser"), false);
});

test("stored value without userId is treated as empty and removed", () => {
  storage.data.set("currentUser", JSON.stringify({ username: "alice" }));
  assert.equal(Session.getCurrentUser(), null);
  assert.equal(storage.data.has("currentUser"), false);
});

test("unavailable storage warns and never throws", () => {
  installStorage(throwingStorage());
  assert.doesNotThrow(() => Session.setCurrentUser({ userId: "u-4", username: "dave" }));
  assert.equal(Session.getCurrentUser(), null);
  assert.equal(Session.getCurrentUserId(), null);
  assert.doesNotThrow(() => Session.clearSession());
  assert.ok(warnings.length >= 1, "expected at least one console.warn");
});
