#!/usr/bin/env python3
"""Programmatic psychic-powers compendium-vs-source diff. Powers are prose in the source, but each
has a `## Power Name` heading followed by structured `Value: N xp` and `Prerequisites: ...` lines —
the most error-prone fields (the 0.7.23 audit found cost bugs). Compares those against the pack.
Damage/range live in free prose and stay agent/manual-verified (noted, not diffed). No LLM.

Usage: python3 tools/compendium_qa/psychic_diff.py
"""
import re, sys, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
DOCS = pathlib.Path("/mnt/project_data/RT/RT-DOCS")
SOURCES = [
    "CoreBook-1-200.pdf/markdown.md",
    "roguetrader_intothestorm-1-125.pdf/markdown.md",
    "roguetrader_intothestorm-126-257.pdf/markdown.md",
]

def norm_name(s):
    s = re.sub(r'["`\'.,()]', '', s.lower().strip())
    return re.sub(r'\s+', ' ', s)

def parse_source():
    """For each `## Power` heading, grab Value:/Prerequisites: in the lines before the next heading."""
    powers = {}
    for rel in SOURCES:
        path = DOCS / rel
        if not path.exists(): continue
        lines = path.read_text(errors='replace').split('\n')
        for i, line in enumerate(lines):
            m = re.match(r'^#{2,3}\s+(.+?)\s*$', line)
            if not m: continue
            name = m.group(1).strip()
            if len(name) > 45 or not re.match(r'^[A-Za-z]', name): continue
            cost = prereq = None
            for j in range(i + 1, min(i + 12, len(lines))):
                if re.match(r'^#{1,3}\s', lines[j]): break
                cm = re.match(r'\s*Value:\s*([0-9]+)\s*xp', lines[j], re.I)
                if cm and cost is None: cost = int(cm.group(1))
                pm = re.match(r'\s*Prerequisites?:\s*(.+?)\s*$', lines[j], re.I)
                if pm and prereq is None: prereq = pm.group(1).strip()
            if cost is None and prereq is None: continue
            powers[norm_name(name)] = {'name': name, 'cost': cost,
                                       'prereq': ('' if (prereq or '').lower() in ('none', '-', '') else prereq),
                                       '_src': f"{rel}:{i+1}"}
    return powers

def parse_pack():
    text = (REPO / 'src/packs/psychic-powers/psychic-powers.yml').read_text().split('\n')
    powers = {}; buf = {}
    fld = re.compile(r'^(\s*)(name|cost|prerequisite|discipline):\s*(.*)$')
    for line in text:
        m = fld.match(line)
        if not m: continue
        ind, key, val = len(m.group(1)), m.group(2), m.group(3).strip().strip("'\"")
        if key == 'name' and ind == 0:
            powers[norm_name(val)] = dict(buf, name=val); buf = {}
        elif key in ('cost', 'prerequisite', 'discipline') and ind == 4:
            buf[key] = val
    return powers

def main():
    src = parse_source(); pack = parse_pack()
    print(f"source powers w/ Value or Prereq: {len(src)}   pack powers: {len(pack)}\n")
    mism = 0; matched = 0; unmatched = []
    for nn, pw in sorted(pack.items()):
        sw = src.get(nn)
        if not sw: unmatched.append(pw['name']); continue
        matched += 1
        diffs = []
        pcost = pw.get('cost', '')
        # Navigator powers intentionally carry cost 0 (Lineage-tied) — skip cost check for those.
        if sw['cost'] is not None and str(pcost) not in ('', '0') and str(pcost) != str(sw['cost']):
            diffs.append(f"cost: pack={pcost} src={sw['cost']}")
        if sw['prereq'] is not None:
            pp = norm_name(pw.get('prerequisite', '')); sp = norm_name(sw['prereq'])
            if pp != sp and not (pp == '' and sp == ''):
                diffs.append(f"prereq: pack={pw.get('prerequisite','')!r} src={sw['prereq']!r}")
        if diffs:
            mism += 1
            print(f"### {pw['name']}  [{sw['_src']}]")
            for d in diffs: print(f"    {d}")
    print(f"\n=== {mism} powers with cost/prereq mismatches / {matched} matched / {len(unmatched)} unmatched ===")
    if '-v' in sys.argv: print("unmatched:", ", ".join(sorted(unmatched)))

if __name__ == '__main__':
    main()
