"use strict";
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createWorkspace, listWorkspaces } = require("./lib.js");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
assert.deepStrictEqual(listWorkspaces(path.join(root, "absent")), []);
const dir = createWorkspace(root, "/plans/a.md");
assert.match(path.basename(dir), /^[0-9a-f]{12}$/);
assert.strictEqual(createWorkspace(root, "/plans/a.md"), dir);
createWorkspace(root, "/plans/b.md");
assert.strictEqual(listWorkspaces(root).length, 2);
fs.rmSync(root, { recursive: true, force: true });
console.log("ok");
