import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 10 }) === "hello", "truncate leaves short strings alone");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate leaves exact-length strings alone");
console.assert(format("The quick brown fox", { truncate: 14 }) === "The quick...", "truncate cuts at the last word boundary");
console.assert(format("supercalifragilistic", { truncate: 10 }) === "superca...", "truncate falls back to a hard cut with no word boundary");
console.assert(format("hello world", { suffix: "!!", truncate: 8 }) === "hello...", "truncate applies to the string after suffix");
console.assert(format("hello", { truncate: 2 }) === "..", "truncate never returns more than maxLength");

console.log("All tests passed");
