import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { maxLength: 10 }) === "hello", "under maxLength is untouched");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly maxLength is untouched");
console.assert(format("hello world foo", { maxLength: 12 }) === "hello...", "truncates at word boundary");
console.assert(format("hello world", { maxLength: 9 }) === "hello...", "no space left before the ellipsis");
console.assert(format("antidisestablishmentarianism", { maxLength: 10 }) === "antidis...", "hard cut when the budget holds no space");
console.assert(format("hello world", { maxLength: 8 }).length <= 8, "never exceeds maxLength");
console.assert(format("hello", { maxLength: 3 }) === "hel", "no room for content plus ellipsis");
console.assert(format("hello", { maxLength: 0 }) === "", "zero maxLength yields an empty string");
console.assert(format("hello", { suffix: " world", maxLength: 8 }) === "hello...", "truncates after suffix is applied");

console.log("All tests passed");
