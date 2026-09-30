import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation tests
console.assert(format("hello", { maxLength: 10 }) === "hello", "under maxLength is untouched");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly maxLength is untouched");
console.assert(format("supercalifragilistic", { maxLength: 10 }) === "superca...", "no word boundary falls back to a hard cut");
console.assert(format("hello world foo", { maxLength: 12 }) === "hello...", "cuts at the last word boundary that fits");
console.assert(format("hello  world", { maxLength: 10 }) === "hello...", "trailing whitespace is dropped before the ellipsis");
console.assert(format(" abcdefghij", { maxLength: 8 }) === " abcd...", "a leading space is not treated as a usable boundary");
console.assert(format("hello", { maxLength: 2 }) === "he", "maxLength too small for an ellipsis hard cuts without one");
console.assert(format("hello", { suffix: " world", maxLength: 8 }) === "hello...", "truncation applies after the suffix");

console.log("All tests passed");
