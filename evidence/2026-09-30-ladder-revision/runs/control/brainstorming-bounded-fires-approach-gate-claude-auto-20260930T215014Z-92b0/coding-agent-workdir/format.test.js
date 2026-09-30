import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate
console.assert(format("hello", { truncate: 10 }) === "hello", "truncate: shorter than max is unchanged");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate: exactly max is unchanged");
console.assert(format("hello world foo", { truncate: 12 }) === "hello...", "truncate: cuts at last word boundary");
console.assert(format("supercalifragilistic", { truncate: 10 }) === "superca...", "truncate: falls back to hard cut when no word boundary fits");
console.assert(format("hi   there", { truncate: 8 }) === "hi...", "truncate: drops trailing space before the ellipsis");
console.assert(format("hello", { truncate: 3 }) === "...", "truncate: max of 3 leaves room for the ellipsis only");
console.assert(format("hello", { truncate: 2 }) === "..", "truncate: max below 3 clips the ellipsis rather than overflowing");
console.assert(format("hello", { truncate: 0 }) === "", "truncate: max of 0 yields an empty string");
console.assert(format("world", { prefix: "hello ", truncate: 8 }) === "hello...", "truncate: applies after prefix so the bound covers the whole string");

console.log("All tests passed");
