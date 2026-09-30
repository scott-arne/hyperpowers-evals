import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncation
console.assert(format("hello", { maxLength: 20 }) === "hello", "shorter than max is unchanged");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly max is unchanged");
console.assert(format("the quick brown fox", { maxLength: 12 }) === "the quick...", "cuts at a word boundary");
console.assert(format("the quick brown fox", { maxLength: 16 }) === "the quick...", "backs up to the previous word boundary");
console.assert(format("supercalifragilistic", { maxLength: 10 }) === "superca...", "hard-cuts when there is no word boundary");
console.assert(format("hello     world", { maxLength: 11 }) === "hello...", "drops trailing whitespace before the ellipsis");
console.assert(format("the quick brown fox", { maxLength: 12 }).length <= 12, "ellipsis counts toward max length");
console.assert(format("hello world", { maxLength: 3 }) === "...", "max length of 3 leaves room for the ellipsis only");
console.assert(format("hello world", { maxLength: 2 }) === "..", "max length below 3 clips the ellipsis");
console.assert(format("hello world", { maxLength: 0 }) === "", "max length of 0 is empty");
console.assert(format("world peace now", { prefix: "hello ", maxLength: 15 }) === "hello world...", "truncates after the prefix is applied");
console.assert(format("hello", { prefix: ">> ", maxLength: 20 }) === ">> hello", "prefix is untouched when under max length");

console.log("All tests passed");
