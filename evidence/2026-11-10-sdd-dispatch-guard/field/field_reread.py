"""Field re-read rate: for every compaction after an SDD invocation in a main
session transcript, did a full Read of the SDD SKILL.md come before the next
Agent or SendMessage dispatch? Prints one line per compaction and a tally."""
import json, sys, glob, os, collections

SDD = 'subagent-driven-development/SKILL.md'

def full_read(b):
    i = b['input']
    if b['name'] == 'Read' and i.get('file_path', '').endswith(SDD):
        return not i.get('offset') and (not i.get('limit') or i['limit'] >= 1500)
    if b['name'] == 'Bash':
        c = i.get('command', '')
        return SDD in c and c.lstrip().startswith('cat ')
    return False

def scan(path):
    out = []; sdd = False; pending = None; entry = None
    with open(path, 'rb') as f:
        for raw in f:
            if b'compact_boundary' in raw:
                try: d = json.loads(raw)
                except Exception: continue
                if d.get('subtype') == 'compact_boundary' and sdd:
                    if pending: out.append(pending)
                    pending = {'ts': d['timestamp'], 'entry': d.get('entrypoint'), 'reread': False, 'partial': False, 'next': None}
                continue
            if b'"tool_use"' not in raw: continue
            try: d = json.loads(raw)
            except Exception: continue
            if d.get('type') != 'assistant' or d.get('isSidechain'): continue
            for b in d['message'].get('content', []):
                if b.get('type') != 'tool_use': continue
                if b['name'] == 'Skill' and 'subagent-driven' in str(b['input'].get('skill')): sdd = True
                if not pending: continue
                if full_read(b): pending['reread'] = True
                elif SDD in json.dumps(b['input']): pending['partial'] = True
                elif b['name'] in ('Agent', 'SendMessage') and pending['next'] is None:
                    pending['next'] = (b['name'], b['input'].get('run_in_background'))
                    out.append(pending); pending = None
    if pending: out.append(pending)
    return out

if __name__ == '__main__':
    since = sys.argv[1]
    tally = collections.Counter()
    for path in sorted(glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl'))):
        if os.path.getmtime(path) < float(sys.argv[2]): continue
        for e in scan(path):
            if e['ts'] < since: continue
            k = 'full' if e['reread'] else ('partial' if e['partial'] else 'none')
            tally[(e['entry'], k)] += 1
            print(os.path.basename(os.path.dirname(path))[-28:], os.path.basename(path)[:8], e['ts'][:16], e['entry'], k, e['next'])
    print(tally)
