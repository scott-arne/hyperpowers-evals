import { fnv1a } from './fnv1a.js';

export function weakEtag(body) {
  return `W/"${body.length.toString(16)}-${fnv1a(body).toString(16)}"`;
}
