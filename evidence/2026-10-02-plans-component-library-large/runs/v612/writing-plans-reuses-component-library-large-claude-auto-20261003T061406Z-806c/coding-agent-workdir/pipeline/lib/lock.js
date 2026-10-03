import { open, unlink } from 'node:fs/promises';

// Runs `fn` while holding a lock file. Returns { skipped: true } without
// running it when another run holds the lock.
export async function withLock(path, fn) {
  let handle;
  try {
    handle = await open(path, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') return { skipped: true };
    throw error;
  }
  try {
    return { skipped: false, value: await fn() };
  } finally {
    await handle.close();
    await unlink(path);
  }
}
