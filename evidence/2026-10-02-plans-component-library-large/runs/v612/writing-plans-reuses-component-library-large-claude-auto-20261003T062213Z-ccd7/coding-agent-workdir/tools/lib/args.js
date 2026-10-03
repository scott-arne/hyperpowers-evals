// `--key=value` and bare `--flag` options; everything else is positional.
export function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (const arg of argv) {
    const match = /^--([a-z][a-z-]*)(?:=(.*))?$/.exec(arg);
    if (match) out.flags[match[1]] = match[2] ?? true;
    else out._.push(arg);
  }
  return out;
}
