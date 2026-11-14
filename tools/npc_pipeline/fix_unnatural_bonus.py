#!/usr/bin/env python3
"""Convert NPC `characteristics.<c>.unnatural` from the PRINTED bonus to the engine's EXTRA.

RT stat blocks print an Unnatural Characteristic as "(10) 52": the parenthesised figure is
the *total* Characteristic Bonus after the multiplier (RT Core p.368: Unnatural Agility (x2)
on Ag 52 → AgB 10). `extract_all_npcs.parse_unnatural` stored that printed total in
`unnatural`, but the engine (`unnaturalExtra`, acolyte `_computeCharacteristics`) treats
`unnatural` as the additive EXTRA on top of the raw bonus (rawBonus × (N − 1)). So every
NPC with a printed "(N)" came out at raw + total — a Kabalite Warrior's AgB and Initiative
read 15 instead of 10, and the inflated bonus also implied ×3 to the Lightning Reflexes path.

Fix: extra = printed − floor(base / 10). Applied only where printed ≥ raw bonus (a printed
total below the raw bonus is an OCR fragment and is left alone — listed with --report).

Also applies hand-verified corrections (HAND_FIXES) for stat lines where OCR dropped the
characteristic itself and kept only the "(N)" — e.g. Farseer Serrenon "Ag (10) 57" landed as
base 10. Values are the printed (base, bonus) pairs, read off the source PDFs.

Text-based so the pack YAML keeps its formatting. Idempotent only in the sense that it
records nothing — run it ONCE (a second run would subtract the raw bonus again).
APPLIED 2026-11-13 (0.9.29). A plain run only (re)applies the idempotent HAND_FIXES /
TRAIT_RENAMES from npc_hand_fixes.py. --apply-again also re-runs the printed->extra
conversion, which would double-subtract on already-converted packs: use it only on packs
regenerated from the pre-fix extraction.
Usage: fix_unnatural_bonus.py [--dry-run] [--report] [--apply-again]
"""
import re
import sys
from pathlib import Path

PACKS = Path(__file__).resolve().parent.parent.parent / "src" / "packs"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from npc_hand_fixes import HAND_FIXES, TRAIT_RENAMES, daemonic_tb_printed, stored_unnatural  # noqa: E402

CHAR_HDR = re.compile(r"^(\s+)characteristics:\s*$")


def process_doc(pack, lines, report, convert):
    """Rewrite one YAML document (list of lines) in place; return #changes."""
    name = next((l[6:].strip().strip("'\"") for l in lines if l.startswith("name: ")), None)
    changes = 0
    item_names = [l.strip()[6:].strip().strip("'\"") for l in lines if re.match(r"^\s*- name: |^  name: ", l)]
    daemonic = daemonic_tb_printed(item_names)
    for (tp, tn, old), new in TRAIT_RENAMES.items():
        if tp == pack and tn == name:
            for idx, l in enumerate(lines):
                if l.strip() == f"name: {old}":
                    lines[idx] = l.replace(old, new)
                    changes += 1
    i = 0
    while i < len(lines):
        m = CHAR_HDR.match(lines[i])
        if not m:
            i += 1
            continue
        ind = len(m.group(1))
        j = i + 1
        while j < len(lines) and (len(lines[j]) - len(lines[j].lstrip()) > ind or not lines[j].strip()):
            cm = re.match(r"^(\s+)(\w+):\s*$", lines[j])
            if cm and len(cm.group(1)) == ind + 2:
                key = cm.group(2)
                bi = ui = None
                k = j + 1
                while k < len(lines) and len(lines[k]) - len(lines[k].lstrip()) > ind + 2:
                    if re.match(r"^\s+base:", lines[k]):
                        bi = k
                    if re.match(r"^\s+unnatural:", lines[k]):
                        ui = k
                    k += 1
                if bi is not None and ui is not None:
                    base = int(float(lines[bi].split(":", 1)[1]))
                    printed = int(float(lines[ui].split(":", 1)[1]))
                    hf = HAND_FIXES.get((pack, name, key))
                    if hf:
                        # Absolute printed values: idempotent, applied on every run.
                        base, printed = hf
                        extra = stored_unnatural(base, printed)
                    elif convert:
                        extra = stored_unnatural(base, printed)
                        if printed > 0 and extra == printed:
                            report.append(f"{pack} | {name} | {key}: base {base}, printed ({printed}) < raw bonus {base // 10} — left as-is (OCR?)")
                    else:
                        extra = printed
                    if daemonic and key == "toughness":
                        extra = 0
                    bpre = lines[bi].split(":", 1)[0]
                    upre = lines[ui].split(":", 1)[0]
                    nb, nu = f"{bpre}: {base}", f"{upre}: {extra}"
                    if lines[bi] != nb or lines[ui] != nu:
                        lines[bi], lines[ui] = nb, nu
                        changes += 1
                j = k
            else:
                j += 1
        i = j
    return changes


def main():
    dry = "--dry-run" in sys.argv
    # The printed->extra conversion was applied 2026-11-13; only re-run it (--apply-again)
    # on packs regenerated from the pre-fix extraction. HAND_FIXES / TRAIT_RENAMES are
    # absolute and idempotent, so a plain run just (re)applies them.
    convert = "--apply-again" in sys.argv
    report = []
    total = 0
    used = set()
    for f in sorted(PACKS.glob("*npcs*/*.yml")):
        pack = f.parent.name
        text = f.read_text()
        docs = text.split("\n---\n")
        out = []
        n = 0
        for d in docs:
            lines = d.split("\n")
            nm = next((l[6:].strip().strip("'\"") for l in lines if l.startswith("name: ")), None)
            used.update(k for k in HAND_FIXES if k[0] == pack and k[1] == nm)
            n += process_doc(pack, lines, report, convert)
            out.append("\n".join(lines))
        if n:
            print(f"{pack}: {n} characteristic(s) rewritten")
            total += n
            if not dry:
                f.write_text("\n---\n".join(out))
    missing = set(HAND_FIXES) - used
    for m in sorted(missing):
        print("HAND_FIX NOT FOUND:", m)
    print(f"total {total}{' (dry run)' if dry else ''}")
    if "--report" in sys.argv:
        print("\n".join(report))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
