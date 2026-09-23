// Measures the probe trace's own cost, the figure R1-5 turned on.
//
// The trace is the whole instrument: `trace()` in hooks/interlock-lib.cjs is a
// single fs.appendFileSync of one short line, guarded by an env-var check that
// returns early when INTERLOCK_PROBE_TRACE is unset. So the perturbation the
// probe's logging wrapper adds to a hook invocation is exactly
// (number of trace records emitted) x (cost of one appendFileSync), and the
// unset path costs a branch.
//
// This reproduces both paths against a file on the same filesystem the probe
// wrote to. It measures this machine today; it does not recover the reading
// taken during the Task 2 review, which was never retained.
//
// Run: node trace-overhead.cjs

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// A representative trace line, copied from the resolve branch that emits the
// probe's longest records.
const LINE =
  'resolve\ttoolu_vrtx_012gt87xTgtrmPMCVPLLkygR\treads=1\tfirst=present\tresult=present';

const N = 20000;
const target = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'trace-overhead-')),
  'trace.log',
);

function traceOn(line) {
  try {
    fs.appendFileSync(target, line + '\n');
  } catch (e) {
    /* not the hook's business */
  }
}

const OFF = '';
function traceOff(line) {
  if (!OFF) return;
  try {
    fs.appendFileSync(target, line + '\n');
  } catch (e) {
    /* not the hook's business */
  }
}

function timeIt(fn, n) {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i += 1) fn(LINE);
  return Number(process.hrtime.bigint() - t0) / 1e6; // ms
}

// Warm the path so the reading is steady-state, not first-open.
timeIt(traceOn, 1000);

const onMs = timeIt(traceOn, N);
const offMs = timeIt(traceOff, N);

const per = (ms) => (ms / N) * 1000; // microseconds per call

console.log(`node            ${process.version}`);
console.log(`platform        ${process.platform} ${os.release()}`);
console.log(`target          ${target}`);
console.log(`line bytes      ${Buffer.byteLength(LINE) + 1}`);
console.log(`iterations      ${N}`);
console.log('');
console.log(`trace enabled   ${onMs.toFixed(1)} ms total   ${per(onMs).toFixed(2)} us/call`);
console.log(`trace inert     ${offMs.toFixed(1)} ms total   ${per(offMs).toFixed(4)} us/call`);
console.log('');
// The committed probe logs emit 0, 1, 2, or 3 trace records per invocation
// (14/17/50/31 across probe/**/*.log), so the per-invocation cost is a range,
// not a single figure.
for (const k of [1, 2, 3]) {
  console.log(
    `per invocation at ${k} trace record${k > 1 ? 's' : ''}: ${((per(onMs) * k) / 1000).toFixed(3)} ms`,
  );
}
console.log(`file size after ${fs.statSync(target).size} bytes`);

fs.rmSync(path.dirname(target), { recursive: true, force: true });
