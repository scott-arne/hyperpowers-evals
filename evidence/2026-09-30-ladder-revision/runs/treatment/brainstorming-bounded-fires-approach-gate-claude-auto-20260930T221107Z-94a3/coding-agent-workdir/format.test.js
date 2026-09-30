import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation
console.assert(format("hello", { truncate: 10 }) === "hello", "under the limit is untouched");
console.assert(format("hello", { truncate: 5 }) === "hello", "exactly at the limit is untouched");
console.assert(format("the quick brown fox", { truncate: 14 }) === "the quick...", "cuts back to the last word boundary");
console.assert(format("antidisestablishmentarianism", { truncate: 10 }) === "antidis...", "no word boundary falls back to a hard cut");
console.assert(format(" abcdefgh", { truncate: 8 }) === " abcd...", "a boundary at index 0 falls back to a hard cut");
console.assert(format("hello  world", { truncate: 10 }) === "hello...", "trailing whitespace is trimmed before the ellipsis");
console.assert(format("hello", { truncate: 3 }) === "...", "a limit of 3 leaves room for the ellipsis only");
console.assert(format("hello", { truncate: 2 }) === "..", "a limit under 3 clips the ellipsis itself");
console.assert(format("hello world", { truncate: 0 }) === "hello world", "a limit of 0 is a no-op");
console.assert(format("brown fox", { prefix: "the quick ", truncate: 14 }) === "the quick...", "the prefix counts toward the limit");
console.assert(format("hello", { suffix: " world", truncate: 8 }) === "hello...", "the suffix counts toward the limit");

console.log("All tests passed");
