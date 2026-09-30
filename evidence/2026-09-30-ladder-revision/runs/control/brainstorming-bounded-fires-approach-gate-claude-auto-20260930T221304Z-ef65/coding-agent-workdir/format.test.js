import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation. The '...' counts against the budget, so the result is never
// longer than the given max.
console.assert(format("hello", { truncate: 20 }) === "hello", "truncate leaves short strings alone");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate leaves exact-length strings alone");
console.assert(format("The quick brown fox", { truncate: 15 }) === "The quick...", "truncate cuts at a word boundary");
console.assert(format("hello world", { truncate: 9 }) === "hello...", "truncate drops the whitespace before the ellipsis");
console.assert(format("supercalifragilistic", { truncate: 10 }) === "superca...", "truncate hard-cuts when there is no word boundary to back up to");
console.assert(format("hello", { truncate: 3 }) === "hel", "truncate with no room for an ellipsis just cuts");
console.assert(format("hello", { truncate: 0 }) === "", "truncate to zero yields an empty string");
console.assert(format("world", { prefix: "hello ", truncate: 8 }) === "hello...", "truncate measures the final string, after prefix");

console.log("All tests passed");
