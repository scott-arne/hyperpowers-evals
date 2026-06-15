import {
  closeSync,
  fchmodSync,
  constants as fsConstants,
  openSync,
  writeSync,
} from 'node:fs';

// Write `data` to `path` at mode 0600 through an O_NOFOLLOW-protected open, so a
// pre-placed symlink at the destination cannot redirect the (secret) write to an
// attacker-controlled path. O_NOFOLLOW makes the open fail (ELOOP) when the final
// path component is a symlink, surfacing as a thrown error rather than a
// redirected secret. The parent directory must already exist (the open does not
// create it). Shared by every per-run env/credential writer (codex, gemini,
// claude, copilot).
export function writePrivateFileNoFollow(
  path: string,
  data: string | Buffer,
): void {
  const flags =
    fsConstants.O_WRONLY |
    fsConstants.O_CREAT |
    fsConstants.O_TRUNC |
    fsConstants.O_NOFOLLOW;
  const fd = openSync(path, flags, 0o600);
  try {
    fchmodSync(fd, 0o600);
    writeSync(fd, typeof data === 'string' ? Buffer.from(data) : data);
  } finally {
    closeSync(fd);
  }
}
