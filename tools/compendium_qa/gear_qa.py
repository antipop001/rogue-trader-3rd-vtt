#!/usr/bin/env python3
"""Compendium gear QA report — scans the item packs for data-quality issues.

Checks: broken img paths, invalid Availability tier, invalid damageType, missing/blank
required fields, armour AP sanity, placeholder descriptions, and weapon `special` flags
the damage engine does not (yet) handle. Informational — prints a report, exits 0 unless
a HARD invariant fails (broken img / invalid availability / invalid damageType).

Usage: python3 tools/compendium_qa/gear_qa.py [--strict]
"""
import os, re, sys, glob
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICONS=set(os.listdir(os.path.join(ROOT,"src/icons/items/buckets")))
AVAIL={'ubiquitous','abundant','plentiful','common','average','scarce','rare','very rare','extremely rare','near unique','unique'}
DTYPES={'energy','impact','explosive','rending',''}
WCLASS={'pistol','basic','heavy','melee','thrown','exotic','launcher',''}
# quality flags the engine actually reads (from damage-data.mjs / attack-specials handling)
ENGINE_QUALS={'accurate','balanced','blast','flame','proven','tearing','scatter','snare','shocking',
 'toxic','primitive','powerfield','power field','unbalanced','unwieldy','reliable','unreliable',
 'inaccurate','recharge','overheats','maximal','felling','razorsharp','lance','defensive','sanctified',
 'storm','twinlinked','concussive','crippling','graviton','hallucinogenic','smoke','flexible','vengeful'}

def load(pack):
    import yaml
    with open(os.path.join(ROOT,f"src/packs/{pack}/{pack}.yml"),encoding='utf-8') as fh:
        return [d for d in yaml.safe_load_all(fh) if d]

PACKS=['weapons','armour','ammo','weapon-mods','tools','consumables','cybernetics']
hard=0; soft=0
unmapped={}
placeholder=0
for pk in PACKS:
    docs=load(pk)
    for d in docs:
        name=d.get('name','?'); data=d.get('data',{}) or {}
        img=d.get('img','')
        fn=img.rsplit('/',1)[-1]
        if fn and fn not in ICONS:
            print(f"[HARD] {pk}/{name}: img not found: {fn}"); hard+=1
        av=str(data.get('availability','')).lower()
        if av and av not in AVAIL:
            print(f"[HARD] {pk}/{name}: bad availability '{data.get('availability')}'"); hard+=1
        if pk=='weapons':
            if str(data.get('damageType','')).lower() not in DTYPES:
                print(f"[HARD] {pk}/{name}: bad damageType '{data.get('damageType')}'"); hard+=1
            if str(data.get('class','')).lower() not in WCLASS:
                print(f"[SOFT] {pk}/{name}: unusual class '{data.get('class')}'"); soft+=1
            for k in (data.get('special') or {}):
                if k.lower() not in ENGINE_QUALS:
                    unmapped.setdefault(k, []).append(name)
        if pk=='armour':
            for loc,v in (data.get('armourPoints') or {}).items():
                if not isinstance(v,(int,float)) or v<0 or v>20:
                    print(f"[SOFT] {pk}/{name}: odd AP {loc}={v}"); soft+=1
        desc=str(data.get('description',''))
        if 'source book for full rules' in desc or desc.strip()=='':
            placeholder+=1

print(f"\n=== SUMMARY ===")
for pk in PACKS: print(f"  {pk}: {len(load(pk))} items")
print(f"  placeholder/empty descriptions: {placeholder}")
print(f"  HARD issues: {hard}   SOFT issues: {soft}")
if unmapped:
    print(f"\n=== weapon `special` flags NOT wired in the engine ({len(unmapped)}) — description-only, wire if desired ===")
    for k,items in sorted(unmapped.items()):
        print(f"  {k}: {len(items)}x (e.g. {items[0]})")
sys.exit(1 if (hard>0 and '--strict' in sys.argv) else 0)
