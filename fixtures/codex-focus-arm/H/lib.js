"use strict";
// Rates arrive as numbers or numeric strings; undefined means "not set".
function parseRate(input) {
  if (input === undefined) return 0;
  if (typeof input === "string" && input.endsWith("%")) {
    const digits = input.match(/\d+(\.\d+)?/);
    return Number(digits[0]) / 100;
  }
  return Number(input);
}
module.exports = { parseRate };
