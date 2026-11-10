"""Replay manifest: the sessions field_reread.py measured, with counts of
main-chain Agent and SendMessage calls at or before a fixed cutoff."""
import json, sys, glob, os, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from field_reread import scan

CUTOFF = '2026-11-10T18:10:00Z'
SINCE = '2026-11-04T06:00'
WINDOW_START = '2026-11-06T21:00:00Z'
rows = []
for path in sorted(glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl'))):
    if os.path.getmtime(path) < float(sys.argv[1]): continue
    if not any(e['ts'] >= SINCE for e in scan(path)): continue
    agent = send = 0
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for raw in f:
            try: d = json.loads(raw)
            except Exception: continue
            ts = d.get('timestamp')
            if ts and ts > CUTOFF: break
            h.update(raw)
            if d.get('type') != 'assistant' or d.get('isSidechain') or not ts or ts < WINDOW_START: continue
            for b in d['message'].get('content', []):
                if b.get('type') == 'tool_use' and b['name'] == 'Agent': agent += 1
                elif b.get('type') == 'tool_use' and b['name'] == 'SendMessage': send += 1
    rows.append((os.path.basename(os.path.dirname(path)), os.path.basename(path)[:-6], agent, send, h.hexdigest()[:12]))
for r in rows: print('\t'.join(map(str, r)))
