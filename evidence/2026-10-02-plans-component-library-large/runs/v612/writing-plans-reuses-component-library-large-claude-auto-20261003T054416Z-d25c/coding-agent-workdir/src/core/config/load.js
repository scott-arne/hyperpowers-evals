import { fileURLToPath } from 'node:url';
import { readEnv } from './env.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export function loadConfig(env = process.env) {
  return {
    port: readEnv('PORT', { fallback: 3000, parse: Number, env }),
    dataDir: readEnv('HARBOR_DATA_DIR', { fallback: `${ROOT}data/`, env }),
    logLevel: readEnv('LOG_LEVEL', { fallback: 'info', env }),
  };
}
