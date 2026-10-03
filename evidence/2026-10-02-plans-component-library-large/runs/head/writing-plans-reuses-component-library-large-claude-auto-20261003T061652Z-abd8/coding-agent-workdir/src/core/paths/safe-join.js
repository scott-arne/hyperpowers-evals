import { normalize, resolve, sep } from 'node:path';

// Joins a request path under `root` and refuses anything that climbs out of
// it, such as "../../etc/passwd".
export function safeJoin(root, requested) {
  const base = resolve(root);
  const full = resolve(base, normalize(requested).replace(/^([/\\])+/, ''));
  return full === base || full.startsWith(base + sep) ? full : null;
}
