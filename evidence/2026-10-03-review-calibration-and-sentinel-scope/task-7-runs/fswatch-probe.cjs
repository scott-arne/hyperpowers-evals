// Measures what the brainstorm server's watcher sees on this host. Like
// server.cjs, it holds one fs.watch on a directory; it then writes six new
// .html files and overwrites two of them, 5000 ms apart, and logs every event
// in each write's window: delay in ms, event type, and the filename the event
// reported. The server drops any event whose filename does not end in .html,
// and the tests wait 300-500 ms, so "named within 500 ms" is the figure that
// predicts a passing test.
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fswatch-probe-'));
const writes = ['a.html', 'b.html', 'c.html', 'd.html', 'e.html', 'f.html', 'a.html', 'b.html'];
const seen = new Set();
let window = null;

const watcher = fs.watch(dir, (eventType, filename) => {
  if (window) window.events.push([Date.now() - window.t0, eventType, filename]);
});

function report(w) {
  const named = w.events.filter(([ms, , name]) => name === w.file && ms <= 500).length > 0;
  console.log(JSON.stringify({ write: `${w.file} (${w.kind})`, namedWithin500ms: named, events: w.events }));
}

function step(i) {
  if (window) report(window);
  if (i >= writes.length) {
    watcher.close();
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  }
  const file = writes[i];
  window = { file, kind: seen.has(file) ? 'overwrite' : 'new', t0: Date.now(), events: [] };
  seen.add(file);
  fs.writeFileSync(path.join(dir, file), `<p>${i}</p>`);
  setTimeout(() => step(i + 1), 5000);
}

// The server's watcher is established before the first screen is written.
setTimeout(() => step(0), 500);
