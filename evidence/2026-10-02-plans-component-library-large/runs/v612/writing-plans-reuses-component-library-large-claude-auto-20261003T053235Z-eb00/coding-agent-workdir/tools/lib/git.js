import { execFileSync } from 'node:child_process';
import { ROOT } from './fs.js';

export function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

export function lastTag() {
  try {
    return git('describe', '--tags', '--abbrev=0');
  } catch {
    return null;
  }
}

// Commit subjects since `tag`, oldest first; every commit when there is none.
export function subjectsSince(tag) {
  const range = tag ? [`${tag}..HEAD`] : [];
  const out = git('log', '--reverse', '--format=%s', ...range);
  return out ? out.split('\n') : [];
}
