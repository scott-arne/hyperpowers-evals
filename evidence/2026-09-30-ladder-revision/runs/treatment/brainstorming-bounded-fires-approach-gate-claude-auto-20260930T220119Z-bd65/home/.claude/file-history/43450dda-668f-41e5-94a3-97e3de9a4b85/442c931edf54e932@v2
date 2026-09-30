import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 10 }) === "hello", "truncate under limit leaves string alone");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate at exact limit leaves string alone");
console.assert(format("hello world", { truncate: 8 }) === "hello...", "truncate cuts back to word boundary");
console.assert(format("supercalifragilistic", { truncate: 8 }) === "super...", "truncate hard cuts when budget has no word boundary");
console.assert(format("hello   world", { truncate: 9 }) === "hello...", "truncate trims trailing whitespace before ellipsis");
console.assert(format("hello world", { truncate: 2 }) === "..", "truncate below ellipsis width returns clipped ellipsis");
console.assert(format("hello world", { truncate: 8, uppercase: true }) === "HELLO...", "truncate runs after case transforms");
console.assert(format("hello world", { truncate: 8, suffix: "!" }) === "hello...!", "truncate runs before suffix");
console.assert(format("hello world", { truncate: 8, prefix: ">" }) === ">hello...", "truncate runs before prefix");

console.log("All tests passed");
