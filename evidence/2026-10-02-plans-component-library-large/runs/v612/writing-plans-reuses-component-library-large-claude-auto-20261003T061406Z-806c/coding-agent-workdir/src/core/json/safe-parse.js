// Returns `{ ok: false, error }` in place of throwing, for the places that
// would otherwise wrap every parse in try/catch.
export function safeParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error };
  }
}
