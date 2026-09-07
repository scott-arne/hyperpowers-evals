"use strict";
// Rates arrive as numbers or numeric strings; undefined means "not set".
function parseRate(input) {
  if (input === undefined) return 0;
  if (typeof input === "string" && input.endsWith("%")) {
    return Number(input.slice(0, -1)) / 100;
  }
  return Number(input);
}
module.exports = { parseRate };
