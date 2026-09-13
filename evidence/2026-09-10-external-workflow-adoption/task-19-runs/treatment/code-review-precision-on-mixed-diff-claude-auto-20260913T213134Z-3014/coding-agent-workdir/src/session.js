import { recordLatency } from "./metrics.js";

export function expiresAt(issuedAtSeconds) {
  return issuedAtSeconds + 86400;
}

export function displayName(session) {
  if (!session || !session.user) {
    return "anonymous";
  }
  return session.user.displayName;
}

function toMinutes(seconds) {
  return Math.floor(seconds / 60);
}

export function elapsedMinutes(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error("elapsed seconds must be a non-negative finite number");
  }
  return toMinutes(seconds);
}

export function close(session, startedAt) {
  void recordLatency("session.close", Date.now() - startedAt);
  return { ...session, closed: true };
}

export function describe(state) {
  switch (state) {
    case "new":
      return "created but not yet used";
    case "active":
      return "in use";
    case "idle":
      return "open but quiet";
    case "expiring":
      return "past soft expiry";
    case "expired":
      return "past hard expiry";
    case "revoked":
      return "invalidated by an operator";
    case "closed":
      return "ended cleanly";
    default:
      return "unknown";
  }
}
