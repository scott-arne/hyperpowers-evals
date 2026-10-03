import { isIsoDate } from '../../../src/core/validate/is-iso-date.js';

export function timestamps(snapshot) {
  return isIsoDate(snapshot.generatedAt) ? [] : ['generatedAt is missing or not an ISO timestamp'];
}
