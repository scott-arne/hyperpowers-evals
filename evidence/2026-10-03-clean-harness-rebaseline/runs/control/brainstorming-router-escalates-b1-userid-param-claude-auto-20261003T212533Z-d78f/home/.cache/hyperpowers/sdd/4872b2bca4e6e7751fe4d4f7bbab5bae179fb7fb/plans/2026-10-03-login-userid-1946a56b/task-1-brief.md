### Task 1: `identity.js` module with unit tests

**Risk tier:** standard — new module and test infrastructure (test script in package.json).

**Files:**
- Create: `identity.js`
- Create: `identity.test.js`
- Modify: `package.json` (add `scripts.test`)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function getUserId(storage = globalThis.localStorage): string`. `storage` is any object with `getItem(key): string | null` and `setItem(key, value): void`. Returns the persisted ID, or a newly generated and saved UUID, or (if storage is missing or throws) a module-level in-memory UUID that stays the same for the life of the module.

- [ ] **Step 1: Add the test script to `package.json`**

Final `package.json`:

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

- [ ] **Step 2: Write the failing tests in `identity.test.js`**

```js
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
```

Do not test `getUserId(undefined)`: that triggers the `globalThis.localStorage` default, which in Node is an experimental global that may warn or behave differently.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL. The run errors because `./identity.js` cannot be found.

- [ ] **Step 4: Implement `identity.js`**

```js
// Shared user identity: a persisted, client-generated userId
const STORAGE_KEY = "userId";

let fallbackId;

export function getUserId(storage = globalThis.localStorage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const id = crypto.randomUUID();
    storage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Storage missing or blocked (e.g. private mode): keep one ID for this page load
    fallbackId ??= crypto.randomUUID();
    return fallbackId;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: 4 tests pass, 0 fail. A `MODULE_TYPELESS_PACKAGE_JSON` warning from Node's ESM syntax detection is acceptable. Do NOT add `"type": "module"` to silence it (see Global Constraints).

- [ ] **Step 6: Confirm the CommonJS entry point still runs**

Run: `node src/index.js`
Expected: prints `Hello, world!`

- [ ] **Step 7: Commit**

```bash
git add identity.js identity.test.js package.json
git commit -m "feat: add shared identity module with persisted userId"
```

---

