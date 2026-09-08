"use strict";
// Rates arrive as numbers or numeric strings; undefined means "not set".
function parseRate(input) {
  if (input === undefined) return 0;
  if (typeof input === "string" && input.endsWith("%")) {
    const body = input.slice(0, -1).trim();
    if (body === "") return NaN;
    return Number(body) / 100;
  }
  return Number(input);
}
module.exports = { parseRate };
