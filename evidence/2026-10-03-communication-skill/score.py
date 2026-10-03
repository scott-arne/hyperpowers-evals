"""Count AI-writing tells in message files. Every match must still be read by hand."""
import re
import sys
from pathlib import Path

PATTERNS = {
    "jargon": re.compile(r"\b(blast radius|footguns?|yak[- ]?shav\w*|spine|seams?|belt[- ]and[- ]suspenders|gate|gates|gated|gating|gatekeep\w*)\b", re.I),
    "load-bearing": re.compile(r"\bload[- ]bearing\b", re.I),
    "not-x-but-y": re.compile(
        r"(\b(?:is|are|was|were|it'?s|that'?s|this is|isn'?t|aren'?t|wasn'?t|weren'?t|not)\s+(?:just|only|merely|simply|really|actually|about|a|an|the)?\s*[^.;:\n]{1,70}?[,;:]\s*(?:it'?s|it is|that'?s|but|rather)\b"
        r"|\bnot\s+(?:just|only|merely|simply)\b[^.\n]{0,80}?\bbut\b"
        r"|\brather than\b"
        r"|\bisn'?t\s+(?:a|an|the|really|just|about)?\s*[^.;,\n]{1,50},\s*(?:it|that|this)'?s?\b)", re.I),
    "dash": re.compile(r"[—–]| -- "),
    "bold-label": re.compile(r"^\s*(?:[-*]\s+)?\*\*[^*\n]{1,60}\*\*\s*[:.]", re.M),
    "bold-any": re.compile(r"\*\*[^*\n]+\*\*"),
    "header": re.compile(r"^#{1,6}\s", re.M),
    "chat-residue": re.compile(r"\b(let me know|want me to|would you like|happy to|should i|shall i|hope this helps|great question)\b", re.I),
    "stager": re.compile(r"\b(to be clear|honestly|here'?s the thing|the real (?:question|issue|problem|risk|win)|at its core|fundamentally|bottom line|tl;?dr|in short)\b", re.I),
    "ai-words": re.compile(r"\b(robust|crucial|key (?:point|risk|issue|detail)|delve|leverage|align(?:s|ed)? with|underscore|highlight|pivotal|ensure|ensuring|critical path|surface(?:s|d)?|non-trivial|nontrivial|orthogonal|invariant|footprint|downstream|upstream|semantics|hygiene)\b", re.I),
    "fragment-closer": re.compile(r"^(?:[A-Z][^.!?\n]{0,45}[.!?])$", re.M),
}


def score(path: Path) -> dict:
    text = path.read_text()
    out = {}
    for name, rx in PATTERNS.items():
        out[name] = [m.group(0).strip() for m in rx.finditer(text)]
    out["words"] = [str(len(text.split()))]
    return out


def main(argv):
    files = sorted(Path(p) for p in argv)
    names = list(PATTERNS) + ["words"]
    print("file".ljust(14) + "".join(n[:11].rjust(12) for n in names))
    for f in files:
        s = score(f)
        print(f.name.ljust(14) + "".join(str(len(s[n]) if n != "words" else s[n][0]).rjust(12) for n in names))
    print()
    for f in files:
        s = score(f)
        print(f"== {f.name}")
        for n in PATTERNS:
            if s[n]:
                print(f"  {n}: {s[n]}")


if __name__ == "__main__":
    main(sys.argv[1:])
