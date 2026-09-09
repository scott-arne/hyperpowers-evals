import {
  ATIF_SCHEMA_VERSION,
  type AtifFinalMetrics,
  type AtifStep,
  type AtifToolCall,
  type AtifTrajectory,
} from '../atif/types.ts';
import { validateTrajectory } from '../atif/validate.ts';
import { canonicalizeAgentPrompt } from './agent-prompt.ts';

// Codex token usage lives in `event_msg` rows whose payload.type is
// "token_count". `info.total_token_usage` is the running session cumulative
// (the last one is the session total); `info.last_token_usage` is a per-turn
// delta. Codex rollout steps are individual tool calls with no turn/message
// structure to hang per-turn usage on, so the session total maps to
// AtifTrajectory.final_metrics, not per-step metrics.
interface CodexTokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  reasoning_output_tokens?: number;
}

function asTokenUsage(value: unknown): CodexTokenUsage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return value as CodexTokenUsage;
}

// Map the final cumulative codex usage into ATIF final_metrics. cached has no
// first-class final-metrics field so it rides in extra.total_cached_tokens. No
// cost is logged by codex; cost is priced downstream by obol.
function finalMetricsFromUsage(usage: CodexTokenUsage): AtifFinalMetrics {
  const fm: AtifFinalMetrics = {};
  // ATIF token buckets are DISJOINT (prompt = UNCACHED input). codex's
  // input_tokens INCLUDES cached input, so subtract the cached portion; the
  // cached count rides in extra.total_cached_tokens below.
  if (typeof usage.input_tokens === 'number')
    fm.total_prompt_tokens = Math.max(
      0,
      usage.input_tokens - (usage.cached_input_tokens ?? 0),
    );
  // codex output_tokens ALREADY INCLUDES reasoning_output_tokens (verified
  // against real rollouts: total_tokens == input_tokens + output_tokens, and
  // reasoning ⊆ output in every row). completion = output_tokens; folding
  // reasoning in again would double-count it and break the disjoint-sum
  // conservation (prompt + cached + completion == total_tokens).
  if (typeof usage.output_tokens === 'number')
    fm.total_completion_tokens = usage.output_tokens;
  if (typeof usage.cached_input_tokens === 'number')
    fm.extra = { total_cached_tokens: usage.cached_input_tokens };
  return fm;
}

// Reverse mapping: Codex tool names → canonical names.
// spawn_agent aliases to Agent (1:1 with a subagent launch). wait_agent and
// close_agent are async-protocol join/teardown calls; aliasing them too would
// inflate tool-count Agent threefold.
const CODEX_TOOL_MAP: Record<string, string> = {
  spawn_agent: 'Agent',
};

const NATIVE_TOOLS = new Set([
  'EnterWorktree',
  'ExitWorktree',
  'EnterPlanMode',
  'ExitPlanMode',
  'TaskCreate',
  'TaskUpdate',
  'TaskList',
  'TaskGet',
  'Skill',
  'Agent',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
]);

interface CodexFunctionCallPayload {
  type: 'function_call';
  name?: string;
  arguments?: string | Record<string, unknown>;
  call_id?: string;
}

interface CodexCustomToolCallPayload {
  type: 'custom_tool_call';
  name?: string;
  input?: string;
  call_id?: string;
}

interface CodexLocalShellCallPayload {
  type: 'local_shell_call';
  action?: { command?: string[] };
}

type CodexPayload =
  | CodexFunctionCallPayload
  | CodexCustomToolCallPayload
  | CodexLocalShellCallPayload
  | { type: string };

function parseArgs(
  raw: string | Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (raw === undefined) return {};
  if (typeof raw === 'object' && raw !== null) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null)
        return parsed as Record<string, unknown>;
      return { raw };
    } catch {
      return { raw };
    }
  }
  return {};
}

// Extract target paths from an apply_patch body (same header format the
// copilot/opencode normalizers parse). Without this, codex apply_patch edits
// carry only `{patch}` and are invisible to the implementation-path checks
// (implementation-tool-not-called / skill-before-implementation-tool).
function applyPatchPaths(patchText: unknown): string[] {
  if (typeof patchText !== 'string') return [];
  const paths: string[] = [];
  const prefixes = ['*** Add File: ', '*** Update File: ', '*** Delete File: '];
  for (const line of patchText.split('\n')) {
    for (const pre of prefixes) {
      if (line.startsWith(pre)) {
        paths.push(line.slice(pre.length).trim());
        break;
      }
    }
  }
  return paths;
}

function withPatchPaths(
  args: Record<string, unknown>,
): Record<string, unknown> {
  if ('file_path' in args) return args;
  const patchText =
    typeof args['patch'] === 'string'
      ? args['patch']
      : typeof args['input'] === 'string'
        ? args['input']
        : undefined;
  const paths = applyPatchPaths(patchText);
  if (paths.length > 0) {
    return { ...args, file_path: paths[0], file_paths: paths };
  }
  return args;
}

// ---------------------------------------------------------------------------
// The `exec` tool
//
// Newer Codex builds do not expose exec_command as a tool. They expose one
// `exec` tool whose input is a JavaScript program that calls
// `tools.exec_command({cmd: "..."})`, frequently several at once:
//
//   const r = await Promise.all([
//     tools.exec_command({cmd:"npm test", "workdir":"/w"}),
//   ]);
//
// Recorded as {function_name:'exec', arguments:{input}}, that program is opaque
// to every command-shaped check — skill reads (detect/skill.ts keys off the
// Bash/Shell command text), tool-arg-match on Bash.command, investigated,
// worktree-created — so a Codex run silently scores as if it had run no shell
// command at all. Unwrapping each cmd into its own Bash call gives this build
// the same shape the older exec_command function_call already normalizes to.
// ---------------------------------------------------------------------------

const JS_STRING_ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
};

/**
 * Read the JavaScript string literal whose opening quote is at `start`,
 * resolving the escapes a shell command can carry. Returns null when `start` is
 * not a quote or the literal never closes.
 */
function readStringLiteral(src: string, start: number): string | null {
  const quote = src[start];
  if (quote !== '"' && quote !== "'" && quote !== '`') return null;

  let out = '';
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i] as string;
    if (ch === quote) return out;
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const esc = src[i + 1];
    if (esc === undefined) return null;
    i++;
    if (esc === 'u' && src[i + 1] === '{') {
      const close = src.indexOf('}', i + 2);
      const hex = close < 0 ? '' : src.slice(i + 2, close);
      if (/^[0-9a-fA-F]{1,6}$/.test(hex)) {
        out += String.fromCodePoint(Number.parseInt(hex, 16));
        i = close;
        continue;
      }
    }
    if (esc === 'u' || esc === 'x') {
      const width = esc === 'u' ? 4 : 2;
      const hex = src.slice(i + 1, i + 1 + width);
      if (hex.length === width && /^[0-9a-fA-F]+$/.test(hex)) {
        out += String.fromCharCode(Number.parseInt(hex, 16));
        i += width;
        continue;
      }
    }
    // Anything else (\\, \", \', \`, a line continuation, an unknown escape)
    // stands for the character itself.
    out += JS_STRING_ESCAPES[esc] ?? esc;
  }
  return null;
}

/** Every shell command an `exec` program runs, in program order. */
export function execProgramCommands(program: string): string[] {
  const commands: string[] = [];
  const callRe = /\bexec_command\s*\(/g;
  const starts: number[] = [];
  for (let m = callRe.exec(program); m !== null; m = callRe.exec(program)) {
    starts.push(m.index + m[0].length);
  }

  for (let i = 0; i < starts.length; i++) {
    const from = starts[i] as number;
    // Bound the key search at the next call so a call with no cmd key cannot
    // borrow the following call's command.
    const to = starts[i + 1] ?? program.length;
    const key = /(?:^|[{,\s])["']?cmd["']?\s*:\s*/.exec(
      program.slice(from, to),
    );
    if (key === null) continue;
    const cmd = readStringLiteral(program, from + key.index + key[0].length);
    if (cmd !== null) commands.push(cmd);
  }
  return commands;
}

/** One payload becomes N shell calls. The call_id is suffixed so the caller's
 *  dedup still drops a repeated payload whole, rather than keeping the first
 *  command of a fresh payload and discarding the rest. */
function bashCalls(callId: string, commands: string[]): AtifToolCall[] {
  return commands.map((command, i) => ({
    tool_call_id: callId ? `${callId}#${i + 1}` : '',
    function_name: 'Bash',
    arguments: { command },
  }));
}

function normalizePayload(payload: CodexPayload): AtifToolCall[] {
  if (payload.type === 'function_call') {
    const p = payload as CodexFunctionCallPayload;
    const name = p.name ?? '';
    const args = parseArgs(p.arguments);
    const callId = p.call_id ?? '';
    if (name === 'exec_command') {
      return [
        {
          tool_call_id: callId,
          function_name: 'Bash',
          arguments: {
            command: typeof args['cmd'] === 'string' ? args['cmd'] : '',
          },
        },
      ];
    }
    if (name === 'exec') {
      const program = typeof args['input'] === 'string' ? args['input'] : '';
      const commands = execProgramCommands(program);
      if (commands.length > 0) return bashCalls(callId, commands);
    }
    if (name === 'apply_patch') {
      return [
        {
          tool_call_id: callId,
          function_name: 'Edit',
          arguments: withPatchPaths(args),
        },
      ];
    }
    const canonical = CODEX_TOOL_MAP[name] ?? name;
    return [
      canonicalizeAgentPrompt({
        tool_call_id: callId,
        function_name: canonical,
        arguments: args,
      }),
    ];
  }

  if (payload.type === 'custom_tool_call') {
    const p = payload as CodexCustomToolCallPayload;
    const name = p.name ?? '';
    const callId = p.call_id ?? '';
    if (name === 'apply_patch') {
      return [
        {
          tool_call_id: callId,
          function_name: 'Edit',
          arguments: withPatchPaths({ patch: p.input ?? '' }),
        },
      ];
    }
    if (name === 'exec') {
      const commands = execProgramCommands(p.input ?? '');
      if (commands.length > 0) return bashCalls(callId, commands);
    }
    const canonical = CODEX_TOOL_MAP[name] ?? name;
    return [
      {
        tool_call_id: callId,
        function_name: canonical,
        arguments: { input: p.input ?? '' },
      },
    ];
  }

  if (payload.type === 'local_shell_call') {
    const p = payload as CodexLocalShellCallPayload;
    const cmd = p.action?.command ?? [];
    const cmdStr = Array.isArray(cmd) ? cmd.join(' ') : String(cmd);
    return [
      {
        tool_call_id: '',
        function_name: 'Bash',
        arguments: { command: cmdStr },
      },
    ];
  }

  return [];
}

/**
 * Convert a Codex rollout log (JSONL) into an ATIF v1.7 trajectory.
 *
 * Codex logs use:
 *   {"type": "response_item", "payload": {"type": "function_call", ...}}
 *   {"type": "response_item", "payload": {"type": "custom_tool_call", ...}}
 *   {"type": "response_item", "payload": {"type": "local_shell_call", ...}}
 *
 * All tool calls are collected into a single agent step, since Codex rollout
 * logs do not carry separate message/turn structure. Each tool call gets its
 * own step to match the ATIF convention of one step per logical action.
 */
export function normalizeCodex(raw: string, version: string): AtifTrajectory {
  const steps: AtifStep[] = [];
  let stepId = 1;

  // Deduplicate local_shell_call by a synthetic id since they lack call_id.
  // For function_call and custom_tool_call, deduplicate by call_id.
  const seenCallIds = new Set<string>();

  // Last cumulative session usage and model, harvested from the non-tool rows.
  let sessionUsage: CodexTokenUsage | undefined;
  let modelName: string | undefined;

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }

    // token_count events ride on `event_msg` rows, not `response_item`.
    if (entry['type'] === 'event_msg') {
      const payload = entry['payload'];
      if (
        payload &&
        typeof payload === 'object' &&
        (payload as { type?: unknown }).type === 'token_count'
      ) {
        const info = (payload as { info?: unknown }).info;
        const total =
          info && typeof info === 'object'
            ? asTokenUsage(
                (info as { total_token_usage?: unknown }).total_token_usage,
              )
            : undefined;
        if (total) sessionUsage = total;
      }
      continue;
    }

    // Model is recorded on turn_context (and the session_meta source); take the
    // first one we see.
    if (entry['type'] === 'turn_context' && modelName === undefined) {
      const payload = entry['payload'];
      const model =
        payload && typeof payload === 'object'
          ? (payload as { model?: unknown }).model
          : undefined;
      if (typeof model === 'string' && model) modelName = model;
      continue;
    }

    if (entry['type'] !== 'response_item') continue;

    // Codex uses "payload" (real runs) or "item" (test fixtures using item key).
    const payload = (entry['payload'] ?? entry['item'] ?? {}) as CodexPayload;

    // One payload can carry several shell calls (an `exec` program running a
    // Promise.all of exec_commands), so this is a list.
    for (const tc of normalizePayload(payload)) {
      // Deduplicate: skip if we've seen this call_id (non-empty).
      if (tc.tool_call_id && seenCallIds.has(tc.tool_call_id)) continue;
      if (tc.tool_call_id) seenCallIds.add(tc.tool_call_id);

      steps.push({
        step_id: stepId++,
        source: 'agent',
        tool_calls: [tc],
      });
    }
  }

  // ATIF requires at least one step. If log was empty/unparseable, emit a
  // minimal user step so validateTrajectory doesn't reject it.
  if (steps.length === 0) {
    steps.push({ step_id: 1, source: 'user', message: '' });
  }

  const traj: AtifTrajectory = {
    schema_version: ATIF_SCHEMA_VERSION,
    agent: { name: 'codex', version },
    steps,
  };
  if (modelName) traj.agent.model_name = modelName;
  if (sessionUsage) traj.final_metrics = finalMetricsFromUsage(sessionUsage);

  const result = validateTrajectory(traj);
  if (!result.ok) {
    throw new Error(
      `normalizeCodex produced invalid ATIF: ${result.errors.join('; ')}`,
    );
  }

  return traj;
}

export { NATIVE_TOOLS };
