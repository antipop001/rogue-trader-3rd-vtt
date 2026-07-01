#!/usr/bin/env python3
"""Programmatic weapons compendium-vs-source diff. Parses the weapons pack + the RT Core / Into the
Storm weapon-table rows and mechanically compares each field — no LLM, no hallucination. Reports
every mismatch (pack value vs source value) for human triage against errata.

Usage: python3 tools/compendium_qa/weapons_diff.py
"""
import re, sys, pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
DOCS = pathlib.Path("/mnt/project_data/RT/RT-DOCS")
SOURCES = [
    "CoreBook-1-200.pdf/markdown.md",
    "roguetrader_intothestorm-1-125.pdf/markdown.md",
    "roguetrader_intothestorm-126-257.pdf/markdown.md",
]
DMG_TYPE = {"R": "Rending", "X": "Explosive", "I": "Impact", "E": "Energy"}

def norm_name(s):
    s = s.lower().strip()
    s = re.sub(r'["`\'.,()]', '', s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'^(the|a) ', '', s)
    return s

def parse_rof(tok):
    """'S/2/4' | '1/–/5' | 'S/–/–' | '–/–/6'  ->  (single, burst, full) ints."""
    parts = re.split(r'[/|]', tok.strip())
    if len(parts) != 3:
        return None
    out = []
    for p in parts:
        p = p.strip().replace('–', '-').replace('—', '-')
        if p in ('-', ''): out.append(0)
        elif p.upper() in ('S','$'): out.append(1)  # OCR renders S as $
        else:
            m = re.match(r'-?\d+', p)
            out.append(int(m.group()) if m else 0)
    return tuple(out)

def parse_damage(tok):
    """'1d10+4 R' -> ('1d10+4', 'Rending').  '2d10+2 E' -> ('2d10+2','Energy')."""
    tok = tok.strip().replace('–', '-')
    m = re.match(r'([0-9]+d[0-9]+(?:[+-][0-9]+)?|[0-9]+)\s*([RXIE])?', tok)
    if not m: return (None, None)
    return (m.group(1), DMG_TYPE.get(m.group(2)) if m.group(2) else None)

def parse_source():
    """Scan source files for weapon-table rows. Returns {norm_name: {fields..., _src}}."""
    weapons = {}
    for rel in SOURCES:
        path = DOCS / rel
        if not path.exists(): continue
        for lineno, line in enumerate(path.read_text(errors='replace').split('\n'), 1):
            if not line.startswith('|'): continue
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if len(cells) != 11: continue
            name = cells[0]
            klass = cells[1]
            if klass not in ('Pistol', 'Basic', 'Heavy', 'Thrown', 'Melee'): continue
            if name.lower() in ('name',): continue
            rng = cells[2].replace('–', '-').strip()
            rof = parse_rof(cells[3])
            dmg, dtype = parse_damage(cells[4])
            pen = re.match(r'-?\d+', cells[5].replace('–', '-'))
            clip = re.match(r'-?\d+', cells[6].replace('–', '-'))
            w = {
                'name': name, 'class': klass,
                'range': int(re.match(r'\d+', rng).group()) if re.match(r'\d+', rng) else None,
                'rof': rof, 'damage': dmg, 'damageType': dtype,
                'pen': int(pen.group()) if pen else None,
                'clip': int(clip.group()) if clip else None,
                'reload': cells[7].replace('–', '-').strip(),
                'special': cells[8].strip(),
                'availability': cells[10].strip(),
                '_src': f"{rel}:{lineno}",
            }
            weapons[norm_name(name)] = w
    return weapons

def parse_pack():
    """Line-parse the weapons pack. CRITICAL: the pack layout per YAML document is
    `data:{fields}` -> `img:` -> `name:` -> `type:` -> `---`, so the data block ABOVE a `name:`
    belongs to THAT name (the name closes the document). Accumulate fields, flush on `name:`."""
    text = (REPO / 'src/packs/weapons/weapons.yml').read_text().split('\n')
    weapons = {}; buf = {}
    field = re.compile(r'^(\s*)(name|class|damage|damageType|penetration|range|reload|availability|single|burst|full|max):\s*(.*)$')
    for line in text:
        m = field.match(line)
        if not m: continue
        indent, key, val = len(m.group(1)), m.group(2), m.group(3).strip().strip("'\"")
        if key == 'name' and indent == 0:
            weapons[norm_name(val)] = dict(buf, name=val)   # data ABOVE this name belongs to it
            buf = {}
        elif key in ('class', 'damage', 'damageType', 'reload', 'availability', 'range', 'penetration') and indent == 4:
            buf[key] = val
        elif key in ('single', 'burst', 'full', 'max') and indent == 8:
            buf.setdefault('_rof', {})[key] = val
    return weapons

def main():
    src = parse_source(); pack = parse_pack()
    print(f"source weapons parsed: {len(src)}   pack weapons parsed: {len(pack)}\n")
    mismatches = 0; matched = 0; unmatched = []
    for nn, pw in sorted(pack.items()):
        sw = src.get(nn)
        if not sw:
            unmatched.append(pw['name']); continue
        matched += 1
        diffs = []
        def cmp(field, pv, sv):
            if sv in (None, '', '-') : return
            if str(pv).strip() != str(sv).strip(): diffs.append(f"{field}: pack={pv!r} src={sv!r}")
        cmp('class', pw.get('class'), sw['class'])
        cmp('damage', pw.get('damage'), sw['damage'])
        if sw['damageType']: cmp('damageType', pw.get('damageType'), sw['damageType'])
        cmp('penetration', pw.get('penetration'), sw['pen'])
        cmp('range', pw.get('range'), sw['range'])
        rof = pw.get('_rof', {})
        if sw['rof']:
            ps = (rof.get('single'), rof.get('burst'), rof.get('full'))
            ss = tuple(str(x) for x in sw['rof'])
            if tuple(str(x) for x in ps) != ss:
                diffs.append(f"RoF: pack=(s{ps[0]}/b{ps[1]}/f{ps[2]}) src=(s{ss[0]}/b{ss[1]}/f{ss[2]})")
        if sw['clip'] is not None and 'max' in rof:
            cmp('clip', rof.get('max'), sw['clip'])
        if diffs:
            mismatches += 1
            print(f"### {pw['name']}  [{sw['_src']}]")
            for d in diffs: print(f"    {d}")
    print(f"\n=== {mismatches} weapons with mismatches / {matched} matched / {len(unmatched)} pack weapons unmatched to a source row ===")
    if '-v' in sys.argv:
        print("unmatched:", ", ".join(sorted(unmatched)))

if __name__ == '__main__':
    main()
