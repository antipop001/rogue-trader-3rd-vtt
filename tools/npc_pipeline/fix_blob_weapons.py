#!/usr/bin/env python3
"""QA-059b: repair OCR-blob NPC weapon items — parse the spec embedded in the item name,
populate the structured fields, and clean the name. ruamel round-trip for minimal diffs."""
import sys, re, glob
import yaml
yaml.SafeDumper.add_representer(type(None), lambda d, _: d.represent_scalar("tag:yaml.org,2002:null", ""))

def dump_docs(docs):
    parts = [yaml.safe_dump(d, allow_unicode=True, sort_keys=True, default_flow_style=False, width=120) for d in docs if d]
    return "---\n" + "---\n".join(parts)

CLASS_TOK = {'melee':'Melee','basic':'Basic','pistol':'Pistol','heavy':'Heavy',
             'thrown':'Thrown','exotic':'Exotic','ranged':'Basic'}
DTYPE = {'R':'Rending','E':'Energy','I':'Impact','X':'Explosive'}
SPECIAL = {  # normalized (lowercase, no spaces/hyphens) -> system.special field
    'accurate':'accurate','balanced':'balanced','blast':'blast','concussive':'concussive',
    'defensive':'defensive','felling':'felling','flame':'flame','flexible':'flexible',
    'force':'force','graviton':'graviton','hallucinogenic':'hallucinogenic','haywire':'haywire',
    'inaccurate':'inaccurate','indirect':'indirect','overheats':'overheats','powerfield':'powerField',
    'primitive':'primitive','proven':'proven','razorsharp':'razorSharp','recharge':'recharge',
    'reliable':'reliable','sanctified':'sanctified','scatter':'scatter','shocking':'shocking',
    'smoke':'smoke','snare':'snare','spray':'spray','storm':'storm','tearing':'tearing',
    'toxic':'toxic','twinlinked':'twinLinked','unbalanced':'unbalanced','unreliable':'unreliable',
    'unstable':'unstable','unwieldy':'unwieldy','warpweapon':'warpWeapon',
}
# A parenthesised weapon spec: contains damage dice, a Pen value, an RoF (S/..), or a range.
BLOB_RE = re.compile(r'\([^)]*(?:\d+d\d+|Pen\s+\d|\bS\s*/|\d+\s*m\b|Melee|Ranged|Pistol|Basic|Heavy|Thrown)[^)]*\)', re.I)

def parse_damage(s):
    m = re.search(r'(\d+)d(\d+)', s)
    if not m: return None, ''
    dice = f"{m.group(1)}d{m.group(2)}"
    rest = s[:m.start()] + s[m.end():]
    bonus = sum(int(b)*(1 if sgn=='+' else -1) for sgn,b in re.findall(r'([+\-])\s*(\d+)', rest))
    dmg = dice + (f"+{bonus}" if bonus>0 else (str(bonus) if bonus<0 else ""))
    lm = re.search(r'([REIX])\b', s)   # matches "1d10+5X", "1d5 R", "2d10 I + 4"
    return dmg, (DTYPE.get(lm.group(1),'') if lm else '')

def apply_specials(sysd, text):
    for chunk in re.split(r'[,/]| or ', text):
        chunk = chunk.strip()
        if not chunk: continue
        bm = re.match(r'^([A-Za-z \-]+?)\s*\((\d+)\)$', chunk)
        if bm:
            key = re.sub(r'[ \-]','',bm.group(1)).lower()
            if key in SPECIAL: sysd['special'][SPECIAL[key]] = int(bm.group(2))
            continue
        key = re.sub(r'[ \-]','',chunk).lower()
        if key in SPECIAL: sysd['special'][SPECIAL[key]] = True

def parse_spec(spec, sysd):
    # Tokens are separated by ';' or ',' (some blobs use commas, e.g. "Pistol, 35m, S/2/–").
    # Multi-word specials ("Primitive, Unbalanced") still resolve since each word is a token.
    for p in re.split(r'[;,]', spec):
        p = p.strip()
        if not p: continue
        low = p.lower()
        seg0 = low.split('/')[0].strip()      # "melee/thrown" -> "melee"
        if low in CLASS_TOK: sysd['class'] = CLASS_TOK[low]; continue
        if seg0 in CLASS_TOK: sysd['class'] = CLASS_TOK[seg0]; continue
        if re.match(r'^\d+\s*m$', p): sysd['range'] = re.match(r'^(\d+)', p).group(1); continue
        DASH = r'[—–\-=]+'
        m = re.match(rf'^(S|{DASH})\s*/\s*(\d+|{DASH})\s*/\s*(\d+|{DASH})$', p)
        if m:
            nn = lambda v: int(v) if v.isdigit() else 0
            sysd['rateOfFire'] = {'single': 1 if m.group(1).upper()=='S' else 0,
                                  'burst': nn(m.group(2)), 'full': nn(m.group(3))}; continue
        m = re.match(r'^(?:Rld|Reload)\s+(.+)$', p, re.I)
        if m: sysd['reload'] = m.group(1).strip(); continue
        m = re.match(r'^Clip\s+(\d+)', p, re.I)
        if m: sysd['clip'] = {'max': int(m.group(1)), 'value': int(m.group(1))}; continue
        m = re.match(r'^Pen\s+(\d+)(.*)$', p, re.I)
        if m:
            sysd['penetration'] = m.group(1)
            if m.group(2).strip(): apply_specials(sysd, m.group(2))
            continue
        if re.search(r'\d+d\d+', p):
            dmg, dt = parse_damage(p)
            if dmg: sysd['damage'] = dmg; sysd['damageType'] = dt
            continue
        apply_specials(sysd, p)

def clean_name(name):
    pre = name.split('(')[0].strip()
    pre = re.sub(r'^(or|and)\s+', '', pre, flags=re.I).strip()
    return pre or 'Natural Weapon'

def fix_item(it):
    name = str(it.get('name',''))
    m = BLOB_RE.search(name)
    if not m:
        # name has prose but no parseable spec — just truncate prose noise
        if ' # ' in name or '##' in name or '\n' in name:
            it['name'] = re.sub(r'\s*#.*$','', name.split('\n')[0]).strip() or name[:40]
            return 'trimmed'
        return None
    spec = re.sub(r'\s+',' ', m.group(0)[1:-1])   # drop the surrounding ()
    probe = {'damage':'', 'damageType':'', 'penetration':'', 'range':'', 'class':'',
             'rateOfFire':{'single':1,'burst':0,'full':0}, 'clip':{'max':0,'value':0},
             'reload':'', 'special':{}}
    parse_spec(spec, probe)
    # Guard: only rewrite if we actually recovered a weapon profile (damage or range/RoF),
    # so a mis-detected paren never blanks a working weapon.
    if not (probe['damage'] or probe['range'] or probe['rateOfFire']['burst'] or probe['rateOfFire']['full']):
        if ' # ' in name or '##' in name or '\n' in name:
            it['name'] = re.sub(r'\s*#.*$','', name.split('\n')[0]).strip() or name[:40]
            return 'trimmed'
        return None
    if probe['class'] == '':
        probe['class'] = 'Basic' if (probe['range'] or '') not in ('', '0') else 'Melee'
    sysd = it.setdefault('system', {})
    sysd.setdefault('special', {})
    for k, v in probe.items():
        if k == 'special':
            sysd['special'].update(v)
        elif v not in ('', {'single':1,'burst':0,'full':0}, {'max':0,'value':0}):
            sysd[k] = v
    it['name'] = clean_name(name)
    return 'parsed'

def main(files):
    total_parsed = total_trimmed = 0
    for f in files:
        with open(f) as fh: docs = [d for d in yaml.safe_load_all(fh) if d]
        changed = False; p=t=0
        for d in docs:
            for it in d.get('items', []) or []:
                if it.get('type') != 'weapon': continue
                r = fix_item(it)
                if r == 'parsed': p+=1; changed=True
                elif r == 'trimmed': t+=1; changed=True
        if changed:
            with open(f,'w') as fh: fh.write(dump_docs(docs))
            print(f"  {f.split('/')[-1]}: parsed {p}, trimmed {t}")
        total_parsed+=p; total_trimmed+=t
    print(f"TOTAL parsed {total_parsed}, trimmed {total_trimmed}")

if __name__ == '__main__':
    files = sys.argv[1:] or (glob.glob('src/packs/*-npcs/*.yml')+glob.glob('src/packs/npcs/*.yml'))
    main(files)
