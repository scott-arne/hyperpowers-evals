import { parseIso } from '../time/parse-iso.js';

export function isIsoDate(value) {
  return parseIso(value) !== null;
}
