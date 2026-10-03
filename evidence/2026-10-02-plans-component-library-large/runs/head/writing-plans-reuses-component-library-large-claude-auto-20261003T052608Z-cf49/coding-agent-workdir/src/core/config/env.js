// Reads one environment variable, with a default and an optional parser.
// A parser that returns NaN or undefined counts as a bad value.
export function readEnv(name, { fallback, parse = (v) => v, env = process.env } = {}) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = parse(raw);
  if (value === undefined || Number.isNaN(value)) throw new Error(`${name} has an invalid value: ${raw}`);
  return value;
}
