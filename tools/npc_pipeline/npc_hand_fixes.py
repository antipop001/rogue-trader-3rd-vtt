"""Hand-verified NPC stat corrections, shared by build_npc_yaml.py (regeneration) and
fix_unnatural_bonus.py (the one-shot 0.9.29 pack rewrite).

RT stat blocks print an Unnatural Characteristic as "(10) 52": the parenthesised figure is
the TOTAL bonus after the multiplier (RT Core p.368). The engine stores `unnatural` as the
EXTRA on top of the raw bonus, so `stored_unnatural` converts printed -> extra.

HAND_FIXES covers stat lines OCR mangled: the "(N)" captured as the characteristic itself,
"(N)" and value concatenated, or a digit of the "(N)" dropped. Each value is the PRINTED
(characteristic, bonus) pair, read from the source PDF (pdftotext -layout) or Errata v1.4.
Keys: (pack dir, actor name, characteristic key).
"""

import re

MORGAASH = "Morgaash Kulgraz, Kaptin Of Da Wurldbreaka, Warlord Of Undred-Undred Teef"

HAND_FIXES = {
    # --- Eldar -------------------------------------------------------------------------
    ("fallensuns-npcs", "Badb Ra", "agility"): (55, 10),
    ("fallensuns-npcs", "Farseer Caille", "agility"): (57, 10),
    ("fallensuns-npcs", "Farseer Caille", "willpower"): (59, 10),
    ("lureoftheexpanse-npcs", "Pathfinder", "agility"): (55, 10),
    ("lureoftheexpanse-npcs", "Farseer Serrenon", "agility"): (57, 10),
    ("lureoftheexpanse-npcs", "Farseer Serrenon", "willpower"): (59, 10),
    # Lure p.132 "S (10) 50, T (12) 60, Ag (6) 30"
    ("lureoftheexpanse-npcs", "Wraithguard", "strength"): (50, 10),
    ("lureoftheexpanse-npcs", "Wraithguard", "toughness"): (60, 12),
    ("lureoftheexpanse-npcs", "Wraithguard", "agility"): (30, 6),
    ("thekoronusbestiary-npcs", "Dark Reaper", "agility"): (50, 10),
    # Koronus p.57 "S (10) 50, T (12) 60" (OCR: 10 / 11)
    ("thekoronusbestiary-npcs", "Wraithguard", "strength"): (50, 10),
    ("thekoronusbestiary-npcs", "Wraithguard", "toughness"): (60, 12),
    # Koronus p.58 "S (16) 85"; T per Errata v1.4: "the Toughness Bonus listed with its
    # Characteristics should be (16)" (and Unnatural Toughness x2, see TRAIT_RENAMES).
    ("thekoronusbestiary-npcs", "Wraithlord", "strength"): (85, 16),
    ("thekoronusbestiary-npcs", "Wraithlord", "toughness"): (88, 16),
    # Koronus "Ag (10) 52" (OCR concatenated: 1052)
    ("thekoronusbestiary-npcs", "Warp Spider", "agility"): (52, 10),
    # --- Orks --------------------------------------------------------------------------
    ("edgeoftheabyss-npcs", MORGAASH, "strength"): (75, 14),
    ("edgeoftheabyss-npcs", MORGAASH, "toughness"): (68, 12),
    ("starsofinequity-npcs", "Kaptin Skellkap Graffletz", "strength"): (65, 12),
    ("starsofinequity-npcs", "Kaptin Skellkap Graffletz", "toughness"): (67, 12),
    ("starsofinequity-npcs", "Skabgob", "strength"): (53, 10),
    ("starsofinequity-npcs", "Skabgob", "toughness"): (51, 10),
    ("thenavisprimer-npcs", "Gur'Kall the Wanderer", "strength"): (60, 12),
    ("thenavisprimer-npcs", "Gur'Kall the Wanderer", "toughness"): (54, 10),
    # --- Tyranids / daemons / others ---------------------------------------------------
    ("starsofinequity-npcs", "Genestealer", "agility"): (60, 12),
    ("starsofinequity-npcs", "Broodlord", "agility"): (60, 12),
    ("thekoronusbestiary-npcs", "Bone Conqueror", "strength"): (54, 10),
    ("thekoronusbestiary-npcs", "Waves Of Death", "strength"): (53, 10),
    ("thekoronusbestiary-npcs", "Waves Of Death", "toughness"): (57, 15),
    ("thekoronusbestiary-npcs", "Screamer of Tzeentch", "agility"): (50, 10),
    ("twilightcrusade-npcs", "Heldrake", "toughness"): (62, 12),
    # Twilight Crusade: printed "(1)"/"(4)" are truncated two-digit bonuses. Unnatural
    # Strength (x2) on S 65 = 12; "Total TB: 14" is printed for both.
    ("twilightcrusade-npcs", "Forgefiend", "strength"): (65, 12),
    ("twilightcrusade-npcs", "Forgefiend", "toughness"): (65, 14),
    ("twilightcrusade-npcs", "Maulerfiend", "strength"): (65, 12),
    ("twilightcrusade-npcs", "Maulerfiend", "toughness"): (65, 14),
}

# Errata v1.4: "The Wraithlord should possess the Unnatural Toughness (x2) Trait instead of
# the listed Unnatural Toughness (x3) Trait".
TRAIT_RENAMES = {
    ("thekoronusbestiary-npcs", "Wraithlord", "Unnatural Toughness (x3)"): "Unnatural Toughness (x2)",
}


def stored_unnatural(base, printed):
    """Printed total bonus -> engine extra. A printed figure below the raw bonus is an OCR
    fragment with no safe reading; it is returned verbatim (add a HAND_FIXES entry)."""
    raw = base // 10
    if printed > 0 and raw > 0 and printed >= raw:
        return printed - raw
    return printed


def corrected(pack, name, key, base, printed):
    """Apply HAND_FIXES, returning (base, printed)."""
    return HAND_FIXES.get((pack, name, key), (base, printed))


_DAEMONIC = re.compile(r"^\s*daemonic\s*(\(|$)", re.I)
_UNNAT_T = re.compile(r"^\s*unnatural\s+toughness\b", re.I)


def daemonic_tb_printed(trait_names):
    """True when the printed "(N)" above Toughness is the Daemonic doubled soak TB rather
    than Unnatural Toughness: the NPC has Daemonic (not "Daemonic Presence") and no
    Unnatural Toughness. The engine applies Daemonic at soak (daemonicToughnessMultiplier,
    RT Core p.364 "double their Toughness Bonus against all damage"), so the stored extra
    must be 0 or soak is doubled twice and Toughness Tests/Felling wrongly see it."""
    names = list(trait_names)
    return any(_DAEMONIC.match(n) for n in names) and not any(_UNNAT_T.match(n) for n in names)
