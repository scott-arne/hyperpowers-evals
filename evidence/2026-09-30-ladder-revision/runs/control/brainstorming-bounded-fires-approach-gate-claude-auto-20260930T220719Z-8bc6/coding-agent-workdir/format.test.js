import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello world") === "hello world", "no maxLength leaves string alone");
console.assert(format("hi", { maxLength: 10 }) === "hi", "shorter than maxLength");
console.assert(format("hello", { maxLength: 5 }) === "hello", "exactly maxLength");
console.assert(format("hello world", { maxLength: 8 }) === "hello...", "cut lands on a word boundary");
console.assert(format("hello world", { maxLength: 10 }) === "hello...", "word boundary cuts short of maxLength");
console.assert(format("supercalifragilistic", { maxLength: 10 }) === "superca...", "no word boundary falls back to exact cut");
console.assert(format("ab  cdef", { maxLength: 7 }) === "ab...", "whitespace at the cut is trimmed");
console.assert(format(" abcdef", { maxLength: 6 }) === " ab...", "leading space is not treated as a boundary");
console.assert(format("hello", { maxLength: 2 }) === "..", "maxLength below ellipsis length still caps");
console.assert(format("hello", { maxLength: 0 }) === "", "maxLength 0 caps rather than disabling");
console.assert(format("hello world", { maxLength: 8, uppercase: true }) === "HELLO...", "truncates after case conversion");
console.assert(format("hello world", { maxLength: 8, suffix: "!" }) === "hello...!", "suffix applies after truncation");
console.assert(format("hello world", { maxLength: 8, prefix: ">" }) === ">hello...", "prefix applies after truncation");

console.log("All tests passed");
