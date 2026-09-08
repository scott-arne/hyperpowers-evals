"use strict";
// Rates arrive as numbers or numeric strings; undefined means "not set".
function parseRate(input) {
  if (input === undefined) return 0;
  return Number(input);
}
module.exports = { parseRate };
