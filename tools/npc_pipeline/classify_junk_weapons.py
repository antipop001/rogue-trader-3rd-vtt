#!/usr/bin/env python3
"""Whitelist-KEEP classifier: since every REAL weapon has been filled, any remaining
empty-damage weapon item is KEEP only if it matches the correctly-empty real-item
whitelist; everything else is a JUNK delete candidate. PREVIEW unless --delete."""
import glob, yaml, re, sys, collections

# Correctly-empty REAL items — never delete. (Effect grenades, ammo-dependent launchers,
# snare/web entanglers, and the special-profile weapons the agents intentionally left empty.)
KEEP_RE = re.compile(r'\b('
    r'grenades?|launchers?|web|webbing|nets?|bolas|snares?|ensnar\w*|mines?|'
    r'demolition charges?|charges?|eyeburst|wraithcannon|wraith cannon|'
    r'exotic (pistol|weapon)|any one|munitions?'
    r')\b', re.I)

# Real but statless weapons — a short, proper-noun name containing a specific weapon noun
# (NOT the generic word "weapon"). Keep these rather than delete a genuine item.
WEAPON_NOUN = re.compile(r'\b(blade|knife|sword|sceptre|scepter|axe|mace|hammer|maul|'
    r'pistol|rifle|carbine|cannon|bolter|boltgun|claw|fist|fang|talon|maw|bite|tail|'
    r'spear|club|whip|lash|glaive|halberd|scythe|dagger|cutlass|flail|staff|rod|'
    r'tentacle|mandible|pincer|stinger|horn|gore|hoof|beak|barb|chainsword)\b', re.I)
GEAR_CYBER = re.compile(r'\b(reload|mechadendrite|mechandendrite|auger|bionic|calculus|'
    r'\bMIU\b|micro-?bead|data ?slate|vox|respirator|uniform|sceptre)\b', re.I)

def is_keep(name):
    n = (name or '').strip()
    if KEEP_RE.search(n):
        return True
    # Short proper-noun weapon name (no prose/gear) → keep the real item.
    if len(n) <= 30 and WEAPON_NOUN.search(n) and not GEAR_CYBER.search(n):
        return True
    return False

def main():
    delete = collections.defaultdict(list)   # file -> list of weapon names to delete
    keep = []
    names_del = collections.Counter()
    for f in glob.glob('src/packs/*-npcs/*.yml') + glob.glob('src/packs/npcs/*.yml'):
        for d in [x for x in yaml.safe_load_all(open(f)) if x]:
            if 'characteristics' not in d.get('system', {}): continue
            for it in d.get('items', []) or []:
                if it.get('type') == 'weapon' and (it.get('system', {}).get('damage','') or '') == '':
                    nm = it.get('name','')
                    if is_keep(nm): keep.append((f.split('/')[-1], d.get('name'), nm))
                    else:
                        delete[f].append((d.get('name'), nm)); names_del[nm[:60]] += 1
    if '--list' in sys.argv:
        print("===== DELETE CANDIDATES (deduped name :: count) =====")
        for nm, c in sorted(names_del.items()):
            print(f"  {c:2d}  {nm}")
        print(f"\n===== KEEP ({len(keep)}) =====")
        for fn, npc, nm in keep:
            print(f"  [{fn}] {npc} :: {nm[:60]}")
    total_del = sum(len(v) for v in delete.values())
    print(f"\nTOTALS: delete {total_del} items in {len(delete)} files  |  keep {len(keep)}")

    if '--delete' in sys.argv:
        yaml.SafeDumper.add_representer(type(None), lambda d, _: d.represent_scalar("tag:yaml.org,2002:null", ""))
        removed = 0
        for f in glob.glob('src/packs/*-npcs/*.yml') + glob.glob('src/packs/npcs/*.yml'):
            docs = [x for x in yaml.safe_load_all(open(f)) if x]
            changed = False
            for d in docs:
                if 'characteristics' not in d.get('system', {}): continue
                items = d.get('items') or []
                kept = []
                for it in items:
                    junk = (it.get('type') == 'weapon'
                            and (it.get('system', {}).get('damage','') or '') == ''
                            and not is_keep(it.get('name','')))
                    if junk: removed += 1; changed = True
                    else: kept.append(it)
                if changed: d['items'] = kept
            if changed:
                out = "---\n" + "---\n".join(
                    yaml.safe_dump(d, allow_unicode=True, sort_keys=True, default_flow_style=False, width=120)
                    for d in docs)
                open(f, 'w').write(out)
        print(f"DELETED {removed} junk weapon items.")
    return delete

if __name__ == '__main__':
    main()
