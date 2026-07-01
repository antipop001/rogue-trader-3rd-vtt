#!/usr/bin/env python3
"""Generalized Availability diff for any pack with a `name`+`availability` field, vs the RT-DOCS
source tables (any table row whose first cell is the item name and where exactly one cell is an
Availability tier). No LLM.

Usage: python3 tools/compendium_qa/availability_diff.py <pack>   e.g. ammo | weapon-mods | tools | consumables | cybernetics
"""
import re, sys, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
DOCS = pathlib.Path("/mnt/project_data/RT/RT-DOCS")
SOURCES = [p.name for p in DOCS.glob("*/") ]  # scan every book's markdown
TIERS = {'ubiquitous', 'abundant', 'plentiful', 'common', 'average', 'scarce', 'rare',
         'very rare', 'extremely rare', 'near unique', 'unique'}

def norm(s):
    s = re.sub(r'\([^)]*\)', '', s.lower())
    s = re.sub(r'["`\'.,()†*]', '', s.strip())
    return re.sub(r'\s+', ' ', s).strip()

def clean_avail(s):
    return re.sub(r'[†*\s]+$', '', s).strip()

def parse_source():
    """Any table row where first cell = name and exactly one cell is an availability tier."""
    out = {}
    for d in DOCS.glob("*/markdown.md"):
        for line in d.read_text(errors='replace').split('\n'):
            if not line.startswith('|'): continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if cells and cells[0] == '': cells = cells[1:]
            if len(cells) < 2: continue
            tier_cells = [c for c in cells[1:] if clean_avail(c).lower() in TIERS]
            if len(tier_cells) != 1: continue
            name = cells[0]
            if norm(name) in ('name', '') or len(name) > 45: continue
            out.setdefault(norm(name), clean_avail(tier_cells[0]))   # first occurrence wins
    return out

def parse_pack(pack):
    text = (REPO / f'src/packs/{pack}/{pack}.yml').read_text().split('\n')
    out = {}; buf = {}
    fld = re.compile(r'^(\s*)(name|availability):\s*(.*)$')
    for line in text:
        m = fld.match(line)
        if not m: continue
        ind, key, val = len(m.group(1)), m.group(2), m.group(3).strip().strip("'\"")
        if key == 'name' and ind == 0:
            out[norm(val)] = dict(buf, _name=val); buf = {}
        elif key == 'availability' and ind == 4:
            buf['availability'] = val
    return out

def main():
    pack = sys.argv[1] if len(sys.argv) > 1 else 'ammo'
    src = parse_source(); pk = parse_pack(pack)
    mism = matched = 0; unmatched = []
    for nn, pw in sorted(pk.items()):
        sv = src.get(nn)
        if sv is None: unmatched.append(pw['_name']); continue
        matched += 1
        pv = clean_avail(pw.get('availability', ''))
        if norm(pv) != norm(sv):
            mism += 1; print(f"### {pw['_name']}: pack={pv!r} src={sv!r}")
    print(f"\n=== [{pack}] {mism} availability mismatches / {matched} matched / {len(unmatched)} unmatched ===")
    if '-v' in sys.argv: print("unmatched:", ", ".join(sorted(unmatched)))

if __name__ == '__main__':
    main()
