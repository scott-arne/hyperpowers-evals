import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation
console.assert(format("hello", { maxLength: 10 }) === "hello", "shorter than maxLength is untouched");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly maxLength is untouched");
console.assert(format("hello world foo", { maxLength: 12 }) === "hello...", "cuts at the last word boundary");
console.assert(format("abcdefghijkl", { maxLength: 8 }) === "abcde...", "hard-cuts a word with no boundary");
console.assert(format("abc   defgh", { maxLength: 8 }) === "abc...", "drops whitespace left at the cut");
console.assert(format("hello", { maxLength: 3 }) === "...", "maxLength of 3 leaves room for the ellipsis only");
console.assert(format("hello", { maxLength: 2 }) === "..", "maxLength below 3 clips the ellipsis");
console.assert(format("hello", { maxLength: 0 }) === "", "maxLength of 0 returns an empty string");
console.assert(format("hello", { suffix: " world", maxLength: 8 }) === "hello...", "truncates after the suffix is applied");
console.assert(format("world", { prefix: "hello ", maxLength: 8 }) === "hello...", "truncates after the prefix is applied");

console.log("All tests passed");
