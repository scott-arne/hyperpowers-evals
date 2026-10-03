### Task 1: `Session` storage module

**Risk tier:** standard — new script plus new test infrastructure (`package.json` test script).

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces: global `Session` (browser) / `module.exports = Session` (Node) with
  - `Session.getUserId(): string | null`
  - `Session.setUserId(id: string): void`
  - `Session.clearUserId(): void`
  - storage key `"userId"`.

**Mirror:** `src/utils.js:1-5` for function style and export line.

- [ ] **Step 1: Add the test script to `package.json`**

Replace the file with:

```json
{
  "name": "drill-test-project",
  "version": "1.0.0",
  "description": "Test project for Drill scenarios",
  "main": "src/index.js",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write the failing tests** — create `test/session.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert");

function installStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
}

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function throwingStorage() {
  const blocked = () => {
    throw new Error("storage blocked");
  };
  return { getItem: blocked, setItem: blocked, removeItem: blocked };
}

const Session = require("../session.js");

test.beforeEach(() => installStorage(fakeStorage()));

test("getUserId returns null when nothing is stored", () => {
  assert.strictEqual(Session.getUserId(), null);
});

test("setUserId stores a trimmed id that getUserId returns", () => {
  Session.setUserId("  u-42  ");
  assert.strictEqual(Session.getUserId(), "u-42");
  assert.strictEqual(globalThis.localStorage.getItem("userId"), "u-42");
});

test("setUserId ignores empty and whitespace-only ids", () => {
  Session.setUserId("u-1");
  Session.setUserId("   ");
  Session.setUserId("");
  assert.strictEqual(Session.getUserId(), "u-1");
});

test("clearUserId removes the stored id", () => {
  Session.setUserId("u-42");
  Session.clearUserId();
  assert.strictEqual(Session.getUserId(), null);
});

test("throwing storage degrades to nothing stored", () => {
  installStorage(throwingStorage());
  assert.strictEqual(Session.getUserId(), null);
  assert.doesNotThrow(() => Session.setUserId("u-42"));
  assert.doesNotThrow(() => Session.clearUserId());
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '../session.js'`.

- [ ] **Step 4: Write the implementation** — create `session.js`:

```js
// Shared user-session state. Load this script before any script that uses `Session`.
const Session = (() => {
  const KEY = "userId";

  function getUserId() {
    try {
      return globalThis.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function setUserId(id) {
    const trimmed = String(id ?? "").trim();
    if (!trimmed) return;
    try {
      globalThis.localStorage.setItem(KEY, trimmed);
    } catch (e) {
      // Storage unavailable: the user will be asked for their ID again next time.
    }
  }

  function clearUserId() {
    try {
      globalThis.localStorage.removeItem(KEY);
    } catch (e) {
      // Storage unavailable: nothing to clear.
    }
  }

  return { getUserId, setUserId, clearUserId };
})();

if (typeof module !== "undefined") module.exports = Session;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json session.js test/session.test.js
git commit -m "feat: add Session module for persisted userId"
```

---

