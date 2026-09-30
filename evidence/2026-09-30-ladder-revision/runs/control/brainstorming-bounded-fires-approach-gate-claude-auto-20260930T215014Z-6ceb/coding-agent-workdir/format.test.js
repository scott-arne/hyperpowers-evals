import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation
console.assert(format("hello", { maxLength: 20 }) === "hello", "under the limit is unchanged");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly at the limit is unchanged");
console.assert(format("the quick brown fox", { maxLength: 12 }) === "the quick...", "cuts at a word boundary");
console.assert(format("hello world", { maxLength: 8 }) === "hello...", "the ellipsis counts against maxLength");

console.log("All tests passed");
