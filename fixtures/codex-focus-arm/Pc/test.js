"use strict";
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createWorkspace, listWorkspaces, eventsFor } = require("./lib.js");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ws-"));
assert.deepStrictEqual(listWorkspaces(path.join(root, "absent")), []);
const name = path.basename(createWorkspace(root, "/plans/a.md"));
assert.match(name, /^[0-9a-f]{12}$/);
assert.deepStrictEqual(eventsFor(root, name), []);
fs.writeFileSync(path.join(root, "events.log"), `${name}\tpaused\nffffffffffff\tresumed\n${name}\tresumed\n`);
assert.deepStrictEqual(eventsFor(root, name), ["paused", "resumed"]);
fs.rmSync(root, { recursive: true, force: true });
console.log("ok");
