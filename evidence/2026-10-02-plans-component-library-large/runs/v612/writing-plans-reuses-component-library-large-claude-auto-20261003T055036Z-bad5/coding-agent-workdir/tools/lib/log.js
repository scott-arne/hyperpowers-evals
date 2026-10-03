// Plain prefixes instead of colors: these commands mostly run in CI logs.
export function createToolLog({ out = console.log, err = console.error } = {}) {
  return {
    ok: (msg) => out(`ok    ${msg}`),
    info: (msg) => out(`      ${msg}`),
    warn: (msg) => err(`warn  ${msg}`),
    fail: (msg) => err(`FAIL  ${msg}`),
  };
}
