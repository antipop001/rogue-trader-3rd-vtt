#!/usr/bin/env python3
"""QA-057/058/059a: apply source-extracted NPC fixes to a pack YAML with a minimal diff.

Input JSON (one file per pack) shape:
{
  "<NPC name>": {
    "wounds": 12,                                  # optional -> system.wounds.{max,value}
    "characteristics": {"weaponSkill": 35, ...},   # optional -> system.characteristics.<k>.base
    "weapons": {
      "<current item name>": {                      # matched by the item's CURRENT name
        "name": "Pump-Action Shotgun",              # optional rename
        "damage": "1d10+4", "damageType": "Impact", # set only the provided fields
        "penetration": "0", "class": "Basic",
        "special": {"scatter": true},               # merged into system.special
        "skip": true                                # optional: leave this weapon untouched
      }
    }
  }
}

Re-dumps with the pipeline's exact PyYAML settings so unchanged docs are byte-identical
(diff confined to the changed values). Reports unmatched NPCs/weapons so nothing is silent.
"""
import sys, json, re, yaml
yaml.SafeDumper.add_representer(type(None), lambda d, _: d.represent_scalar("tag:yaml.org,2002:null", ""))

CHAR_KEYS = {'weaponSkill','ballisticSkill','strength','toughness','agility',
             'intelligence','perception','willpower','fellowship'}
DTYPE = {'R':'Rending','E':'Energy','I':'Impact','X':'Explosive'}

def norm_dtype(v):
    """Normalise a damage type: a single letter R/E/I/X -> the full word; else pass through."""
    return DTYPE.get(str(v).strip().upper(), v) if v and len(str(v).strip()) == 1 else v

def dump_docs(docs):
    parts = [yaml.safe_dump(d, allow_unicode=True, sort_keys=True, default_flow_style=False, width=120) for d in docs if d]
    return "---\n" + "---\n".join(parts)

def apply(pack_yaml, fixes):
    with open(pack_yaml) as fh: docs = [d for d in yaml.safe_load_all(fh) if d]
    by_name = {}
    for d in docs:
        if 'system' in d and 'characteristics' in d.get('system', {}):
            by_name.setdefault(d.get('name'), d)
    report = {'npcsApplied': 0, 'woundsSet': 0, 'charsSet': 0, 'weaponsSet': 0,
              'missingNpcs': [], 'missingWeapons': [], 'skipped': 0}
    for npc, fx in fixes.items():
        # The work-list annotated weapon-NPC keys as "Name (SB n)"; strip that to match the
        # real actor name.
        clean = re.sub(r'\s*\(SB\s*\d+\)\s*$', '', npc)
        d = by_name.get(npc) or by_name.get(clean)
        if not d:
            report['missingNpcs'].append(npc); continue
        report['npcsApplied'] += 1
        sysd = d['system']
        if 'wounds' in fx:
            w = int(fx['wounds']); sysd.setdefault('wounds', {})
            sysd['wounds']['max'] = w; sysd['wounds']['value'] = w
            report['woundsSet'] += 1
        if 'characteristics' in fx:
            for k, v in fx['characteristics'].items():
                if k not in CHAR_KEYS: continue
                sysd['characteristics'].setdefault(k, {'base': 0, 'unnatural': 0})
                sysd['characteristics'][k]['base'] = int(v)
            report['charsSet'] += 1
        for wname, wfx in (fx.get('weapons') or {}).items():
            items = [it for it in d.get('items', []) or [] if it.get('type') == 'weapon' and it.get('name') == wname]
            if not items:
                report['missingWeapons'].append(f"{npc} :: {wname}"); continue
            it = items[0]
            if wfx.get('skip'):
                report['skipped'] += 1; continue
            s = it.setdefault('system', {})
            for field in ('damage', 'damageType', 'penetration', 'class', 'range', 'reload', 'attackType'):
                if field in wfx: s[field] = norm_dtype(wfx[field]) if field == 'damageType' else wfx[field]
            if 'clip' in wfx: s['clip'] = {'max': int(wfx['clip']), 'value': int(wfx['clip'])}
            if 'rateOfFire' in wfx: s['rateOfFire'] = wfx['rateOfFire']
            if 'special' in wfx: s.setdefault('special', {}).update(wfx['special'])
            if 'name' in wfx: it['name'] = wfx['name']
            report['weaponsSet'] += 1
    with open(pack_yaml, 'w') as fh: fh.write(dump_docs(docs))
    return report

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("usage: apply_npc_fixes.py <pack.yml> <fixes.json>"); sys.exit(2)
    rep = apply(sys.argv[1], json.load(open(sys.argv[2])))
    print(json.dumps(rep, indent=1))
