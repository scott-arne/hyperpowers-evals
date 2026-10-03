import { LEVELS } from './levels.js';

// One JSON line per entry, which is what the log shipper expects.
export function createLogger({ level = 'info', sink = (line) => process.stderr.write(`${line}\n`), base = {} } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const log = (lvl, msg, fields = {}) => {
    if (LEVELS[lvl] < threshold) return;
    sink(JSON.stringify({ level: lvl, msg, ...base, ...fields }));
  };
  return {
    debug: (msg, fields) => log('debug', msg, fields),
    info: (msg, fields) => log('info', msg, fields),
    warn: (msg, fields) => log('warn', msg, fields),
    error: (msg, fields) => log('error', msg, fields),
    child: (fields) => createLogger({ level, sink, base: { ...base, ...fields } }),
  };
}
