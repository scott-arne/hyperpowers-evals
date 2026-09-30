import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 10 }) === "hello", "truncate: shorter than max is untouched");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate: exact length is untouched");
console.assert(format("hello world", { truncate: 0 }) === "hello world", "truncate: falsy max does not truncate");
console.assert(format("the quick brown fox", { truncate: 15 }) === "the quick...", "truncate: cuts at word boundary");
console.assert(format("supercalifragilistic", { truncate: 10 }) === "superca...", "truncate: hard cut when no word boundary fits");
console.assert(format("hello     world", { truncate: 11 }) === "hello...", "truncate: strips trailing whitespace before ellipsis");
console.assert(format("hello", { truncate: 3 }) === "...", "truncate: max of 3 leaves room only for the ellipsis");
console.assert(format("hello", { truncate: 2 }) === "..", "truncate: max below 3 still respects the bound");
console.assert(format("world", { prefix: "hello ", truncate: 9 }) === "hello...", "truncate: applies after prefix");
console.assert(format("hello world", { suffix: "!!!", truncate: 8 }) === "hello...", "truncate: applies after suffix");
console.assert(format("the quick brown fox", { uppercase: true, truncate: 15 }) === "THE QUICK...", "truncate: composes with uppercase");

console.log("All tests passed");
