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
console.assert(format("The quick brown fox", { truncate: 12 }) === "The quick...", "truncate cuts at a word boundary");
console.assert(format("The quick brown fox", { truncate: 14 }) === "The quick...", "truncate cuts at the last boundary that fits");
console.assert(format("Supercalifragilistic", { truncate: 10 }) === "Superca...", "truncate falls back to a hard cut with no boundary");
console.assert(format("The quick brown fox", { truncate: 12 }).length <= 12, "truncated result fits the budget");
console.assert(format("hello", { truncate: 2 }) === "..", "truncate degrades to the ellipsis below its own length");
console.assert(format("The quick brown fox", { truncate: 12, prefix: ">> " }) === ">> The quick...", "prefix applies after truncation");
console.assert(format("The quick brown fox", { truncate: 12, suffix: " [more]" }) === "The quick... [more]", "suffix applies after truncation");

console.log("All tests passed");
