// check-probe.mjs <payloads.jsonl> <transcript.jsonl>: prints the probe's
// C1-C5 lines for one probe run (plan Task 1, Step 7 format).
import { readFileSync } from 'node:fs';

const [payloadsPath, transcriptPath] = process.argv.slice(2);
const read = (p) => readFileSync(p, 'utf8').split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const payloads = read(payloadsPath);
const recs = read(transcriptPath);
const controller = payloads.filter((p) => p.agent_id == null);
const byDesc = (d) => controller.find((p) => p.tool_name === 'Agent' && p.tool_input?.description === d);
const one = byDesc('probe one'); const three = byDesc('probe three'); const four = byDesc('probe four');
const send = controller.find((p) => p.tool_name === 'SendMessage');
const subBash = payloads.find((p) => p.tool_name === 'Bash' && p.agent_id != null);
const dispatchesWithoutAgentId = payloads.filter((p) => p.tool_name !== 'Bash').every((p) => p.agent_id == null);
const resultFor = (id) => recs.find((r) => r.type === 'user' && Array.isArray(r.message?.content) && r.message.content.some((b) => b.type === 'tool_result' && b.tool_use_id === id));
const blockFor = (id) => resultFor(id)?.message.content.find((b) => b.type === 'tool_result' && b.tool_use_id === id);
const textOf = (b) => (typeof b?.content === 'string' ? b.content : Array.isArray(b?.content) ? b.content.map((c) => c.text || '').join('\n') : '');
const useIds = new Set(recs.filter((r) => r.type === 'assistant').flatMap((r) => (r.message?.content || []).filter((b) => b.type === 'tool_use').map((b) => b.id)));
const line = (id, name, ok, detail) => console.log(`${id} ${name}: ${ok ? 'PASS' : 'FAIL'} ${detail}`);

const c1 = [one, three, four].every((p) => p && typeof p.tool_use_id === 'string' && useIds.has(p.tool_use_id) && typeof p.session_id === 'string' && typeof p.transcript_path === 'string' && typeof p.cwd === 'string' && typeof p.tool_input?.prompt === 'string')
  && one.tool_input.run_in_background === false && three.tool_input.run_in_background === true && four.tool_input.run_in_background === true;
line('C1', 'agent-payload', c1, `run_in_background one=${JSON.stringify(one?.tool_input?.run_in_background)} three=${JSON.stringify(three?.tool_input?.run_in_background)} four=${JSON.stringify(four?.tool_input?.run_in_background)}; tool_use_id in transcript: ${[one, three, four].map((p) => useIds.has(p?.tool_use_id)).join(',')}`);
const oneResult = resultFor(one?.tool_use_id)?.toolUseResult;
const oneId = oneResult?.agentId;
const c2 = !!send && typeof send.tool_input?.to === 'string' && (send.tool_input.to === oneId || send.tool_input.to === 'probe-one');
line('C2', 'sendmessage-payload', c2, `to=${JSON.stringify(send?.tool_input?.to)} probe-one agentId=${JSON.stringify(oneId)}`);
const c3 = !!subBash && typeof subBash.agent_id === 'string' && dispatchesWithoutAgentId;
line('C3', 'agent-id', c3, `subagent Bash agent_id=${JSON.stringify(subBash?.agent_id)}; controller dispatches without agent_id: ${dispatchesWithoutAgentId}`);
const threeText = textOf(blockFor(three?.tool_use_id)); const sendText = textOf(blockFor(send?.tool_use_id));
const c4 = threeText.includes('PROBE-DENY probe three') && sendText.includes('PROBE-DENY sendmessage') && !resultFor(three?.tool_use_id)?.toolUseResult?.agentId;
line('C4', 'deny-honored', c4, `probe three result: ${JSON.stringify(threeText.slice(0, 160))}; SendMessage result: ${JSON.stringify(sendText.slice(0, 160))}`);
const fourResult = resultFor(four?.tool_use_id)?.toolUseResult;
const c5 = oneResult?.status === 'completed' && (oneResult.isAsync === undefined || oneResult.isAsync === false) && fourResult?.isAsync === true && fourResult?.status === 'async_launched';
line('C5', 'result-shapes', c5, `probe one ${JSON.stringify({ status: oneResult?.status, isAsync: oneResult?.isAsync })}; probe four ${JSON.stringify({ status: fourResult?.status, isAsync: fourResult?.isAsync })}`);
