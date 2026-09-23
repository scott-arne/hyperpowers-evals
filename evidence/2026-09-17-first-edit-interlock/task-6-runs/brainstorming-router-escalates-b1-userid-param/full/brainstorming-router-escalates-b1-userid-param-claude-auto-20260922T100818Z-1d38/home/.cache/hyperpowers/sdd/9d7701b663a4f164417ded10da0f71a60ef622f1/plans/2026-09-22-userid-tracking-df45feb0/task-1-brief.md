### Task 1: Session storage module and its tests

**Risk tier:** standard — a new script plus the repo's first test infrastructure; multi-file.

**Files:**
- Create: `session.js`
- Create: `test/session.test.js`
- Modify: `package.json` (add a `scripts.test` entry)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a global `Session` object, also exported via `module.exports` for tests, with exactly three functions:
  - `getUserId()` → `string | null` — the stored id, or `null` when nothing is stored or storage is unavailable.
  - `setUserId(id)` → `undefined` — persists `id`.
  - `clear()` → `undefined` — removes the stored id.

**Mirror:** `src/utils.js:1-5` for the `module.exports` shape; `app.js:2` for the SCREAMING_SNAKE_CASE module constant.

- [ ] **Step 1: Write the failing tests**

Create `test/session.test.js` with exactly this content:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const SESSION_PATH = path.join(__dirname, '..', 'session.js');

// session.js holds closure state (the in-memory fallback and the
// storage-usable flag), so each case needs a freshly-loaded copy.
function loadSession(storage) {
  delete require.cache[require.resolve(SESSION_PATH)];
  globalThis.localStorage = storage;
  return require(SESSION_PATH);
}

function workingStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function throwingStorage(failOn) {
  return {
    getItem() {
      if (failOn === 'read') throw new Error('storage disabled');
      return null;
    },
    setItem() {
      if (failOn === 'write') throw new Error('storage disabled');
    },
    removeItem() {
      if (failOn === 'write') throw new Error('storage disabled');
    },
  };
}

test('getUserId returns null when nothing is stored', () => {
  const Session = loadSession(workingStorage());
  assert.strictEqual(Session.getUserId(), null);
});

test('setUserId then getUserId returns that id', () => {
  const Session = loadSession(workingStorage());
  Session.setUserId('u-123');
  assert.strictEqual(Session.getUserId(), 'u-123');
});

test('clear then getUserId returns null', () => {
  const Session = loadSession(workingStorage());
  Session.setUserId('u-123');
  Session.clear();
  assert.strictEqual(Session.getUserId(), null);
});

test('setUserId overwrites a previously stored id', () => {
  const Session = loadSession(workingStorage());
  Session.setUserId('u-123');
  Session.setUserId('u-456');
  assert.strictEqual(Session.getUserId(), 'u-456');
});

test('getUserId returns null and does not throw when reads fail', () => {
  const Session = loadSession(throwingStorage('read'));
  assert.doesNotThrow(() => Session.getUserId());
  assert.strictEqual(Session.getUserId(), null);
});

test('setUserId falls back to memory when writes fail', () => {
  const Session = loadSession(throwingStorage('write'));
  assert.doesNotThrow(() => Session.setUserId('u-789'));
  assert.strictEqual(Session.getUserId(), 'u-789');
});

test('stores under the app.userId key', () => {
  const storage = workingStorage();
  const Session = loadSession(storage);
  Session.setUserId('u-123');
  assert.strictEqual(storage.getItem('app.userId'), 'u-123');
});
```

- [ ] **Step 2: Add the test script to package.json**

Modify `package.json` so it reads exactly:

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

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL. Every case errors while loading the module — `Cannot find module` for `session.js`, which does not exist yet.

- [ ] **Step 4: Write the implementation**

Create `session.js` with exactly this content:

```javascript
// Identity storage for the app. The userId here is a tracking identifier
// only: it is never an authorization credential, and the server must not
// grant access based on a client-supplied copy.
(function (global) {
  const STORAGE_KEY = "app.userId";

  // localStorage throws rather than returning null when it is unavailable
  // (Safari private mode, disabled storage, enterprise policy). One failure
  // condemns it for the page load: falling back to memory keeps the login
  // form working instead of breaking it over a storage problem.
  let storageUsable = true;
  let fallbackUserId = null;

  function getUserId() {
    if (!storageUsable) {
      return fallbackUserId;
    }
    try {
      return global.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      storageUsable = false;
      return fallbackUserId;
    }
  }

  function setUserId(id) {
    fallbackUserId = id;
    if (!storageUsable) {
      return;
    }
    try {
      global.localStorage.setItem(STORAGE_KEY, id);
    } catch (e) {
      storageUsable = false;
    }
  }

  // The logout path. Nothing calls this yet — the app has no logout — but
  // the persistence design depends on an explicit clear existing.
  function clear() {
    fallbackUserId = null;
    if (!storageUsable) {
      return;
    }
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      storageUsable = false;
    }
  }

  const Session = { getUserId, setUserId, clear };

  global.Session = Session;

  // Lets the Node test runner require this file; inert in the browser.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Session;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`

Expected: PASS — 7 passing tests, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add session.js test/session.test.js package.json
git commit -m "feat: add Session module for persistent userId storage"
```

---

