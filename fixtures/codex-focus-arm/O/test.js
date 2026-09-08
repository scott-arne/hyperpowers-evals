"use strict";
const assert = require("node:assert");
const { parseRate } = require("./lib.js");
assert.strictEqual(parseRate(undefined), 0);
assert.strictEqual(parseRate(0.25), 0.25);
assert.strictEqual(parseRate("0.5"), 0.5);
console.log("ok");
