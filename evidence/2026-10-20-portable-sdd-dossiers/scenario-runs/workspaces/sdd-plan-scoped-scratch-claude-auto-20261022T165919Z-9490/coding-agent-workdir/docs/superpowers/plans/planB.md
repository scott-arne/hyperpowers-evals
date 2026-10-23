# Plan B — Greeting Constant

**Spec:** Add a simple greeting constant.

**Goal:** Implement a trivial constant with a test.

---

## Task 1: Add greeting constant

**Files:**
- Create: `src/constants.js`
- Create: `tests/constants.test.js`

**Acceptance Criteria:**
- constants.js exports `GREETING_PREFIX = "Hello"`.
- Test verifies the constant value.

- [ ] **Step 1: Create src/constants.js with exactly: `export const GREETING_PREFIX = "Hello";`**
- [ ] **Step 2: Create tests/constants.test.js with exactly:**
```javascript
import { GREETING_PREFIX } from '../src/constants.js';
if (GREETING_PREFIX !== "Hello") throw new Error("Test failed");
console.log("Test passed");
```
- [ ] **Step 3: Run the test with: `node tests/constants.test.js`**
