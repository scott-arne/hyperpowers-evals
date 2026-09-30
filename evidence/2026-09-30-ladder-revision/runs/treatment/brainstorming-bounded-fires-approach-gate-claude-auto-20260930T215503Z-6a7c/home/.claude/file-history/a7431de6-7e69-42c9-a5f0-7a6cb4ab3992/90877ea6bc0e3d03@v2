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
console.assert(format("hello world", { maxLength: 8 }) === "hello...", "cuts on a word boundary");
console.assert(format("the quick brown fox", { maxLength: 12 }) === "the quick...", "keeps whole words up to the budget");
console.assert(format("hello world", { maxLength: 10 }) === "hello...", "backs off a mid-word cut to the previous boundary");
console.assert(format("supercalifragilistic", { maxLength: 10 }) === "superca...", "falls back to a hard cut with no boundary in range");
console.assert(format("hi     there", { maxLength: 9 }) === "hi...", "trims whitespace before the ellipsis");
console.assert(format("hello", { maxLength: 3 }) === "...", "maxLength of 3 leaves room only for the ellipsis");
console.assert(format("hello", { maxLength: 2 }) === "..", "maxLength below 3 clips the ellipsis itself");
console.assert(format("hello", { maxLength: 0 }) === "", "maxLength of 0 yields an empty string");
console.assert(format("world", { prefix: "hello ", maxLength: 8 }) === "hello...", "bounds the final output, after prefix");
console.assert(format("hello world", { uppercase: true, maxLength: 8 }) === "HELLO...", "composes with other options");

console.log("All tests passed");
