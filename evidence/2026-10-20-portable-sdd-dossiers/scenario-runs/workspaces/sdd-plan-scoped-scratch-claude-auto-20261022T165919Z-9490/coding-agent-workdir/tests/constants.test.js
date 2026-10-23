import { GREETING_PREFIX } from '../src/constants.js';
if (GREETING_PREFIX !== "Hello") throw new Error("Test failed");
console.log("Test passed");
