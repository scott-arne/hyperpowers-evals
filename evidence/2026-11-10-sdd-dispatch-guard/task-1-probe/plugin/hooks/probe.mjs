// Payload probe for the SDD dispatch guard plan, Task 1. Appends every
// PreToolUse payload to $P/$PROBE_LOG_NAME, and denies every SendMessage and
// the Agent call described "probe three".
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const text = readFileSync(0, 'utf8');
const out = join(dirname(fileURLToPath(import.meta.url)), '..', '..', process.env.PROBE_LOG_NAME || 'payloads.jsonl');
appendFileSync(out, text.trim() + '\n');
let p = {};
try { p = JSON.parse(text); } catch { process.exit(0); }
const deny = (reason) => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }) + '\n');
if (p.tool_name === 'SendMessage') deny('PROBE-DENY sendmessage');
else if (p.tool_name === 'Agent' && p.tool_input?.description === 'probe three') deny('PROBE-DENY probe three');
