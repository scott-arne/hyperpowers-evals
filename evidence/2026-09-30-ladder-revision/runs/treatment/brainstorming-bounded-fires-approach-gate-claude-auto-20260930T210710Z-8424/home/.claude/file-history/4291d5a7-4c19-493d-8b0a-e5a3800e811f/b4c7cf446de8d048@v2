import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello world", { truncate: 9 }) === "hello...", "truncate at word boundary");
console.assert(format("hello", { truncate: 10 }) === "hello", "shorter than max is untouched");
console.assert(format("hello", { truncate: 5 }) === "hello", "exactly max is untouched");
console.assert(format("supercalifragilistic", { truncate: 10 }) === "superca...", "no boundary falls back to hard cut");
console.assert(format("hello world", { truncate: 3 }) === "...", "max of 3 leaves room only for the ellipsis");
console.assert(format("hello world", { truncate: 2 }) === "..", "ellipsis is clipped to stay within max");
console.assert(format("hello world", { truncate: 9 }).length <= 9, "output never exceeds max");
console.assert(format("hello world", { truncate: 9, uppercase: true }) === "HELLO...", "truncate composes with case transforms");
console.assert(format("hello world", { truncate: 9, prefix: ">> " }) === ">> hello...", "prefix is applied after truncation");

console.log("All tests passed");
