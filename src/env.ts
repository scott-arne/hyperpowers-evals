// The ONLY module that reads process.env (coding standard §6.5). Everything else
// imports from here; the gate (Biome noProcessEnv) keeps it that way.

// The single sanctioned process.env read (§6.5); Biome exempts this file via override.
const source: Readonly<Record<string, string | undefined>> = process.env;

/** The known environment keys, typed for the few callers that read them directly. */
interface KnownEnv {
  readonly SUPERPOWERS_ROOT: string | undefined;
  readonly ANTHROPIC_API_KEY: string | undefined;
  readonly OPENAI_API_KEY: string | undefined;
}

/** Frozen, typed view of the known environment keys. */
export const env: KnownEnv = Object.freeze({
  SUPERPOWERS_ROOT: source['SUPERPOWERS_ROOT'],
  ANTHROPIC_API_KEY: source['ANTHROPIC_API_KEY'],
  OPENAI_API_KEY: source['OPENAI_API_KEY'],
});

/** Dynamic lookup for a scenario's `required_env` keys (§6.5). */
export function getEnv(key: string): string | undefined {
  return source[key];
}

/** Snapshot of the full environment, for composing subprocess env (§6.5). */
export function envSnapshot(): Readonly<Record<string, string | undefined>> {
  return source;
}

/** SUPERPOWERS_ROOT, required for live runs; throws if unset. */
export function superpowersRoot(): string {
  if (!env.SUPERPOWERS_ROOT) throw new Error('SUPERPOWERS_ROOT is not set');
  return env.SUPERPOWERS_ROOT;
}

/**
 * The single sanctioned process.env WRITE (§6.5). The drill-owned codex hook
 * install exports DRILL_CODEX_HOME; route that write through here rather than
 * touching process.env at the call site, keeping env.ts the only boundary.
 */
export function setProcessEnv(key: string, value: string): void {
  process.env[key] = value;
}
