import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 10 }) === "hello", "truncate: shorter than limit is unchanged");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate: exactly at limit is unchanged");
console.assert(format("The quick brown fox", { truncate: 12 }) === "The quick...", "truncate: cuts at word boundary");
console.assert(format("Hello world again", { truncate: 9 }) === "Hello...", "truncate: no trailing space before ellipsis");
console.assert(format("Helloworldlong", { truncate: 8 }) === "Hello...", "truncate: hard cut when no word boundary in range");
console.assert(format("hello", { truncate: 3 }) === "...", "truncate: limit equal to ellipsis yields ellipsis only");
console.assert(format("hello", { truncate: 0 }) === "", "truncate: zero limit yields empty string");
console.assert(format("The quick brown fox", { truncate: 12, prefix: "> " }) === "> The quick...", "truncate: prefix applies after truncation");

console.log("All tests passed");
