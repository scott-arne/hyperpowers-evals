import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { maxLength: 10 }) === "hello", "under the limit is untouched");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly at the limit is untouched");
console.assert(format("the quick brown fox", { maxLength: 15 }) === "the quick...", "cuts back to a word boundary");
console.assert(format("the quick brown fox", { maxLength: 12 }) === "the quick...", "boundary landing on the cut needs no backtrack");
console.assert(format("supercalifragilistic", { maxLength: 10 }) === "superca...", "no word boundary falls back to a hard cut");
console.assert(format(" verylongword", { maxLength: 8 }) === " very...", "a boundary leaving no content falls back to a hard cut");
console.assert(format("hello    world", { maxLength: 10 }) === "hello...", "trailing whitespace is stripped before the ellipsis");
console.assert(format("hello", { maxLength: 3 }) === "...", "maxLength 3 leaves room for the ellipsis only");
console.assert(format("hello", { maxLength: 2 }) === "..", "maxLength below 3 clips the ellipsis");
console.assert(format("hello", { maxLength: 0 }) === "", "maxLength 0 returns an empty string");
console.assert(format("hello", { suffix: " world", maxLength: 8 }) === "hello...", "the cap applies after suffix");
console.assert(format("hello", { maxLength: -1 }) === "hello", "a negative maxLength does not truncate");

console.log("All tests passed");
