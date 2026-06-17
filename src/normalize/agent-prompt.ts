import type { AtifToolCall } from '../atif/types.ts';

// ATIF's `arguments` is a free-form object and the spec (Harbor RFC 0001) blesses
// no canonical key for a subagent dispatch's instruction. We canonicalize it to
// `prompt` — the key claude/gemini/copilot/opencode/antigravity already emit, and
// the one Anthropic's Task tool uses — so cross-harness transcript checks
// (`tool-arg-match Agent --matches prompt=…`) work uniformly instead of silently
// failing on harnesses that name the key differently.
//
// codex (`spawn_agent`) and pi (`subagent`) carry the instruction under `task`;
// rename it to `prompt`. This is lossless: the raw key survives in the original
// session log, which the harness retains under the run's throwaway $HOME alongside
// the normalized trajectory.json. No-op for any non-Agent call or a call that
// already uses `prompt`.
export function canonicalizeAgentPrompt(tc: AtifToolCall): AtifToolCall {
  if (tc.function_name !== 'Agent') return tc;
  const args = tc.arguments;
  if ('prompt' in args || !('task' in args) || args['task'] === undefined) {
    return tc;
  }
  const { task, ...rest } = args;
  return { ...tc, arguments: { ...rest, prompt: task } };
}
