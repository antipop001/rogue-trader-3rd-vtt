#!/usr/bin/env python3
"""Programmatic armour compendium-vs-source diff. Parses the armour pack + the RT Core / Into the
Storm armour tables (`Name | Locations Covered | AP | kg | Avail`) and mechanically compares the
per-location Armour Points. No LLM. Reports mismatches for human triage against errata.

Usage: python3 tools/compendium_qa/armour_diff.py
"""
import re, sys, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
DOCS = pathlib.Path("/mnt/project_data/RT/RT-DOCS")
SOURCES = [
    "CoreBook-1-200.pdf/markdown.md",
    "roguetrader_intothestorm-1-125.pdf/markdown.md",
    "roguetrader_intothestorm-126-257.pdf/markdown.md",
]
LOCS = ['head', 'leftArm', 'rightArm', 'body', 'leftLeg', 'rightLeg']

def norm_name(s):
    s = re.sub(r'["`\'.,()]', '', s.lower().strip())
    return re.sub(r'\s+', ' ', s)

def locations_to_ap(covered, ap):
    """'Arms, Body, Legs' + ap -> {loc: ap for covered, 0 else}."""
    out = {l: 0 for l in LOCS}
    c = covered.lower()
    if 'all' in c:
        return {l: ap for l in LOCS}
    if 'arm' in c: out['leftArm'] = out['rightArm'] = ap
    if 'leg' in c: out['leftLeg'] = out['rightLeg'] = ap
    if 'body' in c: out['body'] = ap
    if 'head' in c: out['head'] = ap
    return out

def parse_source():
    weapons = {}
    for rel in SOURCES:
        path = DOCS / rel
        if not path.exists(): continue
        for lineno, line in enumerate(path.read_text(errors='replace').split('\n'), 1):
            if not line.startswith('|'): continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if cells and cells[0] == '': cells = cells[1:]
            if len(cells) != 5: continue                       # Name | Locations | AP | kg | Avail
            name, covered, apc, wt, avail = cells
            if name.lower() in ('name', '') or covered.lower() in ('locations covered', ''): continue
            m = re.match(r'\d+', apc.strip())
            if not m: continue                                 # section headers have empty AP
            ap = int(m.group())
            weapons[norm_name(name)] = {
                'name': name, 'ap': locations_to_ap(covered, ap), 'covered': covered,
                'availability': avail.strip(), '_src': f"{rel}:{lineno}",
            }
    return weapons

def parse_pack():
    """data -> img -> name -> --- : the data ABOVE a name belongs to it."""
    text = (REPO / 'src/packs/armour/armour.yml').read_text().split('\n')
    armour = {}; buf = {'ap': {}}
    fld = re.compile(r'^(\s*)(name|type|weight|availability|head|leftArm|rightArm|body|leftLeg|rightLeg):\s*(.*)$')
    for line in text:
        m = fld.match(line)
        if not m: continue
        ind, key, val = len(m.group(1)), m.group(2), m.group(3).strip().strip("'\"")
        if key == 'name' and ind == 0:
            armour[norm_name(val)] = dict(buf, name=val); buf = {'ap': {}}
        elif key in LOCS and ind == 8:
            buf['ap'][key] = val
        elif key in ('type', 'weight', 'availability') and ind == 4:
            buf[key] = val
    return armour

def main():
    src = parse_source(); pack = parse_pack()
    print(f"source armour parsed: {len(src)}   pack armour parsed: {len(pack)}\n")
    mism = 0; matched = 0; unmatched = []
    for nn, pw in sorted(pack.items()):
        sw = src.get(nn)
        if not sw:
            unmatched.append(pw['name']); continue
        matched += 1
        diffs = []
        for loc in LOCS:
            pv = str(pw['ap'].get(loc, 0)); sv = str(sw['ap'][loc])
            if pv != sv: diffs.append(f"{loc}: pack={pv} src={sv}")
        if diffs:
            mism += 1
            print(f"### {pw['name']}  [{sw['_src']}]  (covers: {sw['covered']})")
            for d in diffs: print(f"    {d}")
    print(f"\n=== {mism} armour with AP mismatches / {matched} matched / {len(unmatched)} unmatched ===")
    if '-v' in sys.argv: print("unmatched:", ", ".join(sorted(unmatched)))

if __name__ == '__main__':
    main()
