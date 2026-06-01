# Email Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a simple email validation module in JavaScript (Node.js) that checks for an `@` symbol, at least one character before `@`, a dot in the domain part, and handles non-string inputs safely.

**Architecture:** A lightweight ES module exporting a single function `validateEmail`. The implementation will utilize standard JavaScript string operations (`lastIndexOf`, `slice`, and `includes`) to implement validation rules.

**Tech Stack:** JavaScript (ES Modules), Node.js (v18+ native test runner).

---

### Task 1: Package Initialization

**Files:**
- Create: `/Users/drewritter/.codex/worktrees/4162/superpowers-evals/results/triggering-test-driven-development-antigravity-20260601T232434Z-d1ec/coding-agent-config/.gemini/antigravity-cli/scratch/email-validator/package.json`

- [ ] **Step 1: Create package.json**
  Write package.json with ES modules configuration:
  ```json
  {
    "name": "email-validator",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "test": "node --test"
    }
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add email-validator/package.json
  # Note: Results directory is git-ignored, so we don't commit it to git, but we simulate standard workflow.
  ```

---

### Task 2: Validate Email Function (TDD Implementation)

**Files:**
- Create: `/Users/drewritter/.codex/worktrees/4162/superpowers-evals/results/triggering-test-driven-development-antigravity-20260601T232434Z-d1ec/coding-agent-config/.gemini/antigravity-cli/scratch/email-validator/validator.js`
- Create: `/Users/drewritter/.codex/worktrees/4162/superpowers-evals/results/triggering-test-driven-development-antigravity-20260601T232434Z-d1ec/coding-agent-config/.gemini/antigravity-cli/scratch/email-validator/validator.test.js`

- [ ] **Step 1: Write the failing tests**
  Create `/Users/drewritter/.codex/worktrees/4162/superpowers-evals/results/triggering-test-driven-development-antigravity-20260601T232434Z-d1ec/coding-agent-config/.gemini/antigravity-cli/scratch/email-validator/validator.test.js` containing tests for all constraints:
  ```javascript
  import test from 'node:test';
  import assert from 'node:assert';
  import { validateEmail } from './validator.js';

  test('validateEmail - valid email addresses', () => {
    assert.strictEqual(validateEmail('a@b.c'), true);
    assert.strictEqual(validateEmail('user@domain.com'), true);
    assert.strictEqual(validateEmail('first.last@sub.domain.co.uk'), true);
  });

  test('validateEmail - missing @ symbol', () => {
    assert.strictEqual(validateEmail('abc.com'), false);
    assert.strictEqual(validateEmail('abc'), false);
  });

  test('validateEmail - no characters before @ symbol', () => {
    assert.strictEqual(validateEmail('@domain.com'), false);
    assert.strictEqual(validateEmail('@'), false);
  });

  test('validateEmail - no dot in domain part', () => {
    assert.strictEqual(validateEmail('a@b'), false);
    assert.strictEqual(validateEmail('user@domain'), false);
    assert.strictEqual(validateEmail('user@domain.'), false); // Dot with empty after it is technically valid for rule, but let's check
  });

  test('validateEmail - non-string inputs', () => {
    assert.strictEqual(validateEmail(null), false);
    assert.strictEqual(validateEmail(undefined), false);
    assert.strictEqual(validateEmail(123), false);
    assert.strictEqual(validateEmail({}), false);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test email-validator/validator.test.js` inside `/Users/drewritter/.codex/worktrees/4162/superpowers-evals/results/triggering-test-driven-development-antigravity-20260601T232434Z-d1ec/coding-agent-config/.gemini/antigravity-cli/scratch`
  Expected: FAIL (Cannot find module './validator.js' or validateEmail is not defined)

- [ ] **Step 3: Write minimal implementation**
  Create `/Users/drewritter/.codex/worktrees/4162/superpowers-evals/results/triggering-test-driven-development-antigravity-20260601T232434Z-d1ec/coding-agent-config/.gemini/antigravity-cli/scratch/email-validator/validator.js` with:
  ```javascript
  export function validateEmail(email) {
    if (typeof email !== 'string') {
      return false;
    }
    const atIndex = email.lastIndexOf('@');
    if (atIndex <= 0) {
      return false;
    }
    const domainPart = email.slice(atIndex + 1);
    // The domain part must contain a dot, and there must be at least one character after the dot.
    // Let's check domainPart.includes('.') and that it doesn't end with a dot.
    if (!domainPart.includes('.') || domainPart.endsWith('.')) {
      return false;
    }
    return true;
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test email-validator/validator.test.js` inside `/Users/drewritter/.codex/worktrees/4162/superpowers-evals/results/triggering-test-driven-development-antigravity-20260601T232434Z-d1ec/coding-agent-config/.gemini/antigravity-cli/scratch`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add email-validator/validator.js email-validator/validator.test.js
  ```
