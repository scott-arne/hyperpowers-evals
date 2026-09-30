import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation
console.assert(format("hello", { maxLength: 10 }) === "hello", "under the limit is untouched");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly at the limit is untouched");
console.assert(format("hello world", { maxLength: 10 }) === "hello...", "cuts back to the word boundary");
console.assert(format("hello   world", { maxLength: 11 }) === "hello...", "drops the whitespace run before the ellipsis");
console.assert(format("internationalization", { maxLength: 10 }) === "interna...", "hard cut when the budget holds no whitespace");
console.assert(format("hello world", { maxLength: 8 }).length <= 8, "never exceeds maxLength");
console.assert(format("hello", { maxLength: 3 }) === "hel", "no room for an ellipsis");
console.assert(format("hello", { maxLength: 0 }) === "", "zero budget");
console.assert(format("hello", { maxLength: -1 }) === "", "negative budget");
console.assert(format("world", { prefix: "hello ", maxLength: 10 }) === "hello...", "truncates after the prefix is applied");
console.assert(format("hello world", { uppercase: true, maxLength: 10 }) === "HELLO...", "truncates after the case transform");

console.log("All tests passed");
