// Shared user identity: a persisted, client-generated userId
const STORAGE_KEY = "userId";

let fallbackId;

export function getUserId(storage = globalThis.localStorage) {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const id = crypto.randomUUID();
    storage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Storage missing or blocked (e.g. private mode): keep one ID for this page load
    fallbackId ??= crypto.randomUUID();
    return fallbackId;
  }
}
