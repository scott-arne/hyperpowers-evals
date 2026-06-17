import {
  ATIF_SCHEMA_VERSION,
  type AtifMetrics,
  type AtifStep,
  type AtifToolCall,
  type AtifTrajectory,
} from '../atif/types.ts';
import { validateTrajectory } from '../atif/validate.ts';
import { canonicalizeAgentPrompt } from './agent-prompt.ts';

// Reverse mapping: Pi tool names → canonical names.
const PI_TOOL_MAP: Record<string, string> = {
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  bash: 'Bash',
  grep: 'Grep',
  find: 'Glob',
  ls: 'Glob',
};

interface PiEntry {
  type?: string;
  message?: {
    role?: string;
    content?: PiContentBlock[];
    model?: string;
    provider?: string;
    usage?: PiUsage;
  };
}

interface PiContentBlock {
  type?: string;
  name?: string;
  arguments?: unknown;
  id?: string;
}

interface PiUsage {
  input?: unknown;
  output?: unknown;
  cacheRead?: unknown;
  cacheWrite?: unknown;
  cost?: { total?: unknown };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Map a pi `message.usage` block to ATIF step metrics + extra.
 *   input→prompt_tokens, output→completion_tokens, cacheRead→cached_tokens,
 *   cost.total→cost_usd; cacheWrite→extra.cache_write.
 * Returns undefined when the message carries no usage fields at all.
 */
function piMessageUsage(
  usage: PiUsage | undefined,
  provider: string | undefined,
): {
  metrics?: AtifMetrics | undefined;
  extra?: Record<string, unknown> | undefined;
} {
  const metrics: AtifMetrics = {};
  if (usage && typeof usage === 'object') {
    const prompt = numberOrUndefined(usage.input);
    const completion = numberOrUndefined(usage.output);
    const cached = numberOrUndefined(usage.cacheRead);
    const cost = numberOrUndefined(usage.cost?.total);
    if (prompt !== undefined) metrics.prompt_tokens = prompt;
    if (completion !== undefined) metrics.completion_tokens = completion;
    if (cached !== undefined) metrics.cached_tokens = cached;
    if (cost !== undefined) metrics.cost_usd = cost;
  }

  const extra: Record<string, unknown> = {};
  if (provider) extra['provider'] = provider;
  const cacheWrite = numberOrUndefined(usage?.cacheWrite);
  if (cacheWrite !== undefined && cacheWrite !== 0)
    extra['cache_write'] = cacheWrite;

  return {
    metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };
}

/**
 * Convert a Pi JSONL session log into an ATIF v1.7 trajectory.
 *
 * Pi session files are JSONL entries. Assistant messages contain tool calls as
 * content blocks: {"type": "toolCall", "name": "read", "arguments": {...}}.
 * The special "subagent" tool is aliased to "Agent" for execution calls (those
 * that lack an "action" key in arguments), but kept verbatim for management
 * calls (list, status, resume, ...) that set "action".
 */
export function normalizePi(raw: string, version: string): AtifTrajectory {
  const steps: AtifStep[] = [];
  let stepId = 1;

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let entry: PiEntry;
    try {
      entry = JSON.parse(line) as PiEntry;
    } catch {
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    if (entry['type'] !== 'message') continue;

    const message = entry['message'];
    if (!message || typeof message !== 'object') continue;
    if (message['role'] !== 'assistant') continue;

    const content = message['content'];
    if (!Array.isArray(content)) continue;

    // Per-message usage. pi logs model/provider/usage on the assistant
    // message; attach it to the FIRST step the message produces so a
    // multi-toolCall message does not double-count its tokens. A usage-bearing
    // text-only message (no toolCall blocks) still records a metrics-only step
    // so its tokens/cost are not dropped.
    const model = typeof message.model === 'string' ? message.model : undefined;
    const { metrics, extra } = piMessageUsage(message.usage, message.provider);
    const applyUsage = (step: AtifStep): void => {
      if (model) step.model_name = model;
      if (metrics) step.metrics = metrics;
      if (extra) step.extra = extra;
    };
    let messageUsageAttached = false;

    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const b = block as PiContentBlock;
      if (b['type'] !== 'toolCall') continue;

      const name = b['name'] ?? '';
      const args = (
        typeof b['arguments'] === 'object' && b['arguments'] !== null
          ? b['arguments']
          : {}
      ) as Record<string, unknown>;

      let canonical = PI_TOOL_MAP[name] ?? name;

      // pi-subagents: execution calls (no "action" key) alias to Agent;
      // management calls (with "action" key) stay as "subagent".
      if (name === 'subagent') {
        if (!('action' in args)) {
          canonical = 'Agent';
        } else {
          canonical = 'subagent';
        }
      }

      const tc: AtifToolCall = canonicalizeAgentPrompt({
        tool_call_id: b['id'] ?? `${stepId}`,
        function_name: canonical,
        arguments: args,
      });

      const step: AtifStep = {
        step_id: stepId++,
        source: 'agent',
        tool_calls: [tc],
      };

      if (!messageUsageAttached && (model || metrics || extra)) {
        applyUsage(step);
        messageUsageAttached = true;
      }

      steps.push(step);
    }

    // Text-only assistant message that nonetheless carries usage: emit a
    // metrics-only agent step so the tokens/cost survive.
    if (!messageUsageAttached && (metrics || extra)) {
      const step: AtifStep = { step_id: stepId++, source: 'agent' };
      applyUsage(step);
      steps.push(step);
    }
  }

  if (steps.length === 0) {
    steps.push({ step_id: 1, source: 'user', message: '' });
  }

  const traj: AtifTrajectory = {
    schema_version: ATIF_SCHEMA_VERSION,
    agent: { name: 'pi', version },
    steps,
  };

  const result = validateTrajectory(traj);
  if (!result.ok) {
    throw new Error(
      `normalizePi produced invalid ATIF: ${result.errors.join('; ')}`,
    );
  }

  return traj;
}
