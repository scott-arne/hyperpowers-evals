import { format } from './format.js';

// Basic tests
console.assert(format("hello") === "hello", "plain text");
console.assert(format("hello", { uppercase: true }) === "HELLO", "uppercase");
console.assert(format("HELLO", { lowercase: true }) === "hello", "lowercase");
console.assert(format("world", { prefix: "hello " }) === "hello world", "prefix");
console.assert(format("hello", { suffix: " world" }) === "hello world", "suffix");

// Truncate tests
console.assert(format("hello", { truncate: 10 }) === "hello", "under the cap is returned untouched");
console.assert(format("hello", { truncate: 5 }) === "hello", "exactly at the cap is returned untouched");
console.assert(format("hello world foo", { truncate: 12 }) === "hello...", "backs off to the last word boundary");
console.assert(format("supercalifragilistic", { truncate: 10 }) === "superca...", "hard cut when the window holds no space");
console.assert(format(" leadingspace", { truncate: 8 }) === " lead...", "hard cut when the only space is at index 0");
console.assert(format("hello   world", { truncate: 11 }) === "hello...", "trailing whitespace is trimmed before the ellipsis");
console.assert(format("hello", { truncate: 3 }) === "...", "cap of 3 leaves room for the ellipsis only");
console.assert(format("hello", { truncate: 2 }) === "..", "ellipsis itself is capped below 3");
console.assert(format("hello", { truncate: 0 }) === "", "cap of 0 yields an empty string");
console.assert(format("hello", { suffix: " world", truncate: 8 }) === "hello...", "truncation applies after the suffix");

console.log("All tests passed");
