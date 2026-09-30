import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation tests
console.assert(format("hello", { maxLength: 10 }) === "hello", "under limit is untouched");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly at limit is untouched");
console.assert(format("hello there world", { maxLength: 12 }) === "hello...", "cuts back to word boundary");
console.assert(format("antidisestablishmentarianism", { maxLength: 10 }) === "antidis...", "hard cut when no word boundary");
console.assert(format("hello there world", { maxLength: 12 }).length <= 12, "ellipsis counts toward the budget");
console.assert(format("hello there world", { maxLength: 12, prefix: ">> " }) === ">> hello...", "prefix survives truncation");

console.log("All tests passed");
