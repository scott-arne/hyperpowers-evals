// Tracks who is currently logged in. The state is module-private and copied on
// the way in and out, so callers can only reach it through the three functions
// below. That keeps the storage free to change later without breaking them.
let currentUser = null;

export function setCurrentUser({ userId, username }) {
  currentUser = { userId, username };
}

export function getCurrentUser() {
  return currentUser === null ? null : { ...currentUser };
}

export function clearCurrentUser() {
  currentUser = null;
}
