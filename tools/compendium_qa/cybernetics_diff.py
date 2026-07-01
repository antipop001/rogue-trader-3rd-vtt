#!/usr/bin/env python3
"""Programmatic cybernetics compendium-vs-source diff. Compares each cybernetic's Availability
against RT Core Table 5-16 (Name | Availability) + any ItS cybernetics rows. No LLM.

Usage: python3 tools/compendium_qa/cybernetics_diff.py
"""
import re, sys, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
DOCS = pathlib.Path("/mnt/project_data/RT/RT-DOCS")
SOURCES = [
    "CoreBook-1-200.pdf/markdown.md",
    "roguetrader_intothestorm-1-125.pdf/markdown.md",
    "roguetrader_intothestorm-126-257.pdf/markdown.md",
]
TIERS = {'ubiquitous', 'abundant', 'plentiful', 'common', 'average', 'scarce', 'rare',
         'very rare', 'extremely rare', 'near unique', 'unique'}

def norm_name(s):
    s = re.sub(r'\([^)]*\)', '', s.lower())          # drop parenthetical qualifiers, e.g. "(MIU)"
    s = re.sub(r'["`\'.,()]', '', s.strip())
    return re.sub(r'\s+', ' ', s).strip()

def clean_avail(s):
    return re.sub(r'[†*\s]+$', '', s).strip()   # drop OCR footnote daggers/asterisks

def parse_source():
    cyb = {}
    for rel in SOURCES:
        path = DOCS / rel
        if not path.exists(): continue
        for lineno, line in enumerate(path.read_text(errors='replace').split('\n'), 1):
            if not line.startswith('|'): continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if cells and cells[0] == '': cells = cells[1:]
            if len(cells) != 2: continue
            name, avail = cells[0], clean_avail(cells[1])
            if name.lower() in ('name', '') or avail.lower() not in TIERS: continue
            cyb[norm_name(name)] = {'name': name, 'availability': avail, '_src': f"{rel}:{lineno}"}
    return cyb

def parse_pack():
    text = (REPO / 'src/packs/cybernetics/cybernetics.yml').read_text().split('\n')
    cyb = {}; buf = {}
    fld = re.compile(r'^(\s*)(name|availability):\s*(.*)$')
    for line in text:
        m = fld.match(line)
        if not m: continue
        ind, key, val = len(m.group(1)), m.group(2), m.group(3).strip().strip("'\"")
        if key == 'name' and ind == 0:
            cyb[norm_name(val)] = dict(buf, name=val); buf = {}
        elif key == 'availability' and ind == 4:
            buf['availability'] = val
    return cyb

def main():
    src = parse_source(); pack = parse_pack()
    print(f"source cybernetics (Table 5-16 etc.): {len(src)}   pack cybernetics: {len(pack)}\n")
    mism = 0; matched = 0; unmatched = []
    for nn, pw in sorted(pack.items()):
        sw = src.get(nn)
        if not sw: unmatched.append(pw['name']); continue
        matched += 1
        pv = clean_avail(pw.get('availability', '')); sv = sw['availability']
        if norm_name(pv) != norm_name(sv):
            mism += 1
            print(f"### {pw['name']}  [{sw['_src']}]\n    availability: pack={pv!r} src={sv!r}")
    print(f"\n=== {mism} availability mismatches / {matched} matched / {len(unmatched)} unmatched ===")
    if '-v' in sys.argv: print("unmatched:", ", ".join(sorted(unmatched)))

if __name__ == '__main__':
    main()
