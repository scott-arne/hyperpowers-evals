import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 10 }) === "hello", "truncate: shorter than max is untouched");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate: exactly max is untouched");
console.assert(format("the quick brown fox", { truncate: 12 }) === "the quick...", "truncate: cuts at a word boundary");
console.assert(format("hello world", { truncate: 9 }) === "hello...", "truncate: cuts back to the previous boundary mid-word");
console.assert(format("abcdefghijklmnop", { truncate: 10 }) === "abcdefg...", "truncate: hard cut when there is no space");
console.assert(format("See https://very-long-url-here", { truncate: 20 }) === "See...", "truncate: long word straddling the limit falls back to the previous boundary");
console.assert(format("hello world", { truncate: 4 }) === "h...", "truncate: max just above the ellipsis");
console.assert(format("hello world", { truncate: 3 }) === "...", "truncate: max equal to the ellipsis");
console.assert(format("hello world", { truncate: 2 }) === "..", "truncate: max below the ellipsis");
console.assert(format("hello world", { truncate: 9 }).length <= 9, "truncate: output never exceeds max");
console.assert(format("hello world", { truncate: 8, prefix: ">> " }) === ">> hello...", "truncate: prefix survives and sits outside the limit");
console.assert(format("hello world", { truncate: 8, uppercase: true }) === "HELLO...", "truncate: applies after the case transforms");

console.log("All tests passed");
