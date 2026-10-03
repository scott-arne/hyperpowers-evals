const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

// Accepts only UTC timestamps in the form the pipeline writes; Date.parse on
// its own also takes local times and RFC 2822 dates.
export function parseIso(text) {
  if (typeof text !== 'string' || !ISO.test(text)) return null;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
}
