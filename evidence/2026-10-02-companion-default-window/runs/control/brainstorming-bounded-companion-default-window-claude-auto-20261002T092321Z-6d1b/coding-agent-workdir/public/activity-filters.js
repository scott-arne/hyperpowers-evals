// Decides which activity events the filters on activity.html let through.
// Loaded as a plain script in the page and required by the node tests.

// The fixed list of event types from the activity API, in display order.
const EVENT_TYPES = [
  'Sign-in',
  'Sign-in failed',
  'Sign-out',
  'Session expired',
  'Password changed',
  'Two-factor enabled',
  'Email change requested',
  'Settings updated',
  'API token used',
];

function matchesFilters(event, filters) {
  return filters.types.has(event.type);
}

if (typeof module !== 'undefined') module.exports = { EVENT_TYPES, matchesFilters };
