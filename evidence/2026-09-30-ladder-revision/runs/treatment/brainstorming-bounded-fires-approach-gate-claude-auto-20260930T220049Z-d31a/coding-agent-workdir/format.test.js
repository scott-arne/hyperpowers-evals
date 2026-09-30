import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 20 }) === "hello", "truncate: shorter than max is untouched");
console.assert(format("hello", { truncate: 5 }) === "hello", "truncate: exactly max is untouched");
console.assert(format("hello world", { truncate: 8 }) === "hello...", "truncate: cuts at word boundary");
console.assert(format("hi there friend", { truncate: 12 }) === "hi there...", "truncate: no trailing space before ellipsis");
console.assert(format("internationalization", { truncate: 10 }) === "interna...", "truncate: hard cut when no word boundary");
console.assert(format("hello world", { truncate: 3 }) === "...", "truncate: no room for content");
console.assert(format("hello world", { truncate: 2 }) === "..", "truncate: max shorter than the ellipsis");
console.assert(format("hello world", { truncate: 0 }) === "", "truncate: zero is a real value, not ignored");
console.assert(format("hello world", { truncate: 8, uppercase: true }) === "HELLO...", "truncate: composes with uppercase");
console.assert(format("world peace", { truncate: 10, prefix: "say " }) === "say...", "truncate: bounds the decorated string");

console.log("All tests passed");
