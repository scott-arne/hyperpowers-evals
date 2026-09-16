#!/usr/bin/env python3
"""Classify each measurement run: condition, scenario, final verdict, turn-1 action class,
token totals, payload/listing hashes. Reads the per-process logs for run dirs."""
import sys, os, re, json, glob, hashlib, math
EV = "/Users/johnss51/Development/agents/hyperpowers/evals"
E = os.path.join(EV, "evidence/2026-09-16-over-trigger-measurement")
rows = []
for log in sorted(glob.glob(os.path.join(E, "logs", "*.log"))):
    name = os.path.basename(log)
    if name.startswith("pilot-"): cond, scen = "descriptions-on", "cost-checkbox-over-trigger"
    else:
        m = re.match(r"(as-is|descriptions-on)-(.+)-p\d+\.log", name)
        if not m: continue
        cond, scen = m.group(1), m.group(2)
    for line in open(log, encoding="utf-8", errors="replace"):
        m = re.search(r"run-dir\s+(\S+)", line)
        if m: rows.append((cond, scen, m.group(1).rstrip("/"), name))
def first_action(transcript):
    for line in open(transcript, encoding="utf-8", errors="replace"):
        try: rec = json.loads(line)
        except Exception: continue
        if rec.get("type") != "assistant": continue
        for c in (rec.get("message") or {}).get("content") or []:
            if c.get("type") == "tool_use":
                n = c.get("name"); inp = c.get("input") or {}
                if n == "Skill": return "Skill(%s)" % inp.get("skill")
                if n in ("Edit", "Write", "MultiEdit", "NotebookEdit"): return "direct-edit"
                return "explore(%s)" % n
    return "none"
def hashes(transcript):
    h = {"payload": None, "listing": None, "model": None}
    for line in open(transcript, encoding="utf-8", errors="replace"):
        try: rec = json.loads(line)
        except Exception: continue
        att = rec.get("attachment") or {}
        if att.get("type") == "hook_additional_context" and h["payload"] is None:
            h["payload"] = hashlib.sha256(json.dumps(att.get("content"), sort_keys=True).encode()).hexdigest()[:12]
        if att.get("type") == "skill_listing" and h["listing"] is None:
            c = att.get("content") or ""; hp = [l for l in c.split("\n") if l.startswith("- hyperpowers:")]
            h["listing"] = "%s(desc %d/%d)" % (hashlib.sha256(c.encode()).hexdigest()[:8], sum(1 for l in hp if ": " in l[2:]), len(hp))
        if rec.get("type") == "assistant" and h["model"] is None:
            h["model"] = (rec.get("message") or {}).get("model")
    return h
out = []
for cond, scen, rd, log in rows:
    if not os.path.isabs(rd): rd = os.path.join(EV, rd)
    v = os.path.join(rd, "verdict.json")
    if not os.path.exists(v): continue
    d = json.load(open(v)); final = d.get("final")
    ts = glob.glob(os.path.join(rd, "home/.claude/projects/*/*.jsonl"))
    fa = first_action(ts[0]) if ts else "no-transcript"; hs = hashes(ts[0]) if ts else {}
    tok = None
    tu = os.path.join(rd, "coding-agent-token-usage.json")
    if os.path.exists(tu):
        try:
            u = json.load(open(tu)); tok = u.get("total_tokens") or u.get("total") or sum(v for k, v in u.items() if isinstance(v, (int, float)))
        except Exception: tok = None
    out.append({"condition": cond, "scenario": scen, "run": os.path.basename(rd), "final": final, "first_action": fa, "tokens": tok, **hs, "log": log})
json.dump(out, open(os.path.join(E, "runs.json"), "w"), indent=1)
def wilson(k, n, z=1.96):
    if n == 0: return (0, 0)
    p = k / n; den = 1 + z*z/n; c = (p + z*z/(2*n)) / den; h = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / den
    return (max(0, c-h), min(1, c+h))
print("%-16s %-42s %4s %5s %5s  %-14s %s" % ("condition", "scenario", "n", "fail", "pass", "fail-rate 95%CI", "first actions"))
for scen in sorted({r["scenario"] for r in out}):
    for cond in ("as-is", "descriptions-on"):
        rs = [r for r in out if r["condition"] == cond and r["scenario"] == scen]
        if not rs: continue
        k = sum(1 for r in rs if r["final"] == "fail"); n = len(rs); lo, hi = wilson(k, n)
        fa = {}
        for r in rs: fa[r["first_action"]] = fa.get(r["first_action"], 0) + 1
        print("%-16s %-42s %4d %5d %5d  %.0f%% [%.0f-%.0f]   %s" % (cond, scen, n, k, sum(1 for r in rs if r["final"] == "pass"), 100*k/n, 100*lo, 100*hi, dict(sorted(fa.items(), key=lambda x: -x[1]))))
print("\npayload hashes:", sorted({r.get("payload") for r in out if r.get("payload")}))
print("listing variants:", sorted({(r["condition"], r.get("listing")) for r in out if r.get("listing")}))
print("models:", sorted({r.get("model") for r in out if r.get("model")}))
