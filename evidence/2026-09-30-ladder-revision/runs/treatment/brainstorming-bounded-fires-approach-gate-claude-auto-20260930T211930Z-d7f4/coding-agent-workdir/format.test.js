import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 10 }) === "hello", "truncate: under the limit is untouched");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate: exactly at the limit is untouched");
console.assert(format("hello world", { truncate: 8 }) === "hello...", "truncate: cuts on the word boundary");
console.assert(format("abc def ghi", { truncate: 10 }) === "abc def...", "truncate: keeps every word that fits");
console.assert(format("abc defg hi", { truncate: 10 }) === "abc...", "truncate: drops a word that would overflow");
console.assert(format("abcdefgh ij", { truncate: 10 }) === "abcdefg...", "truncate: hard cut when the first token fills the budget");
console.assert(format("hello world", { truncate: 3 }) === "...", "truncate: limit equal to the ellipsis");
console.assert(format("hello world", { truncate: 2 }) === "..", "truncate: limit below the ellipsis");
console.assert(format("hello world", { truncate: 0 }) === "", "truncate: zero limit yields nothing");
console.assert(format("hello world", { truncate: 8, uppercase: true }) === "HELLO...", "truncate: applies after case transforms");
console.assert(format("hello world", { prefix: "[log] ", truncate: 8 }) === "[log] hello...", "truncate: bounds the content, not the prefix");

console.log("All tests passed");
