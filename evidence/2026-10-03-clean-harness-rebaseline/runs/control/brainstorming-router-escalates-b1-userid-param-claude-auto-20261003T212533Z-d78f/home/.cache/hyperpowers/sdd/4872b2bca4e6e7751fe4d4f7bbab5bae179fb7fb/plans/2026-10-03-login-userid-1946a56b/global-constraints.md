## Global Constraints (verbatim from plan)
- No build step; the app stays plain browser JavaScript.
- `package.json` must NOT gain `"type": "module"` (it would break the CommonJS `src/index.js`). Node 26 detects ESM syntax in `.js` files on its own.
- Tests use Node's built-in `node:test`; no new dependencies.
- `localStorage` key is exactly `"userId"`.
- `getUserId` never throws.
