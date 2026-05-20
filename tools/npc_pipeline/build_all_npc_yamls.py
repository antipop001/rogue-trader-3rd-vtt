#!/usr/bin/env python3
"""
Per-book Foundry-Actor compendium builder.

Reads each tools/npc_pipeline/extracted/<book-slug>.json (produced by
extract_all_npcs.py) and writes src/packs/<book-slug>-npcs/<book-slug>-npcs.yml
in the Foundry actor format.

Reuses the proven build_npc_yaml.py helpers (talent/trait/weapon resolution,
inline weapon-spec parsing, schema-required field padding for Foundry V14
strict embedded-item validation, mixed-case 16-char `_id` generation).

Also updates src/system.json with one `{type: Actor}` pack entry per book.

NOTE: the existing PoC `npcs` pack is left in place; the new `corebook-npcs`
pack runs alongside it. Decide later whether to retire the curated pack.

Idempotent. Re-running overwrites the YAML files in place.
"""
import json
import re
import sys
from pathlib import Path

# Reuse the existing assembler.
sys.path.insert(0, str(Path(__file__).parent))
from build_npc_yaml import (  # noqa: E402
    build_actor, index_by_name, load_pack_yaml, yaml_dump,
)

REPO = Path("/home/ahermon/rogue-trader-3rd-vtt")
EXTRACTED_DIR = Path(__file__).parent / "extracted"
PACKS_DIR = REPO / "src" / "packs"
SYSTEM_JSON = REPO / "src" / "system.json"

# Human-friendly source / pack-label per book-slug. The slugs match what
# extract_all_npcs.book_slug() emits.
BOOK_META = {
    "corebook":              ("Rogue Trader Core Rulebook",     "Core Rulebook — NPCs"),
    "intothestorm":          ("Into the Storm",                 "Into the Storm — NPCs"),
    "battlefleetkoronus":    ("Battlefleet Koronus",            "Battlefleet Koronus — NPCs"),
    "citadelofskulls":       ("Citadel of Skulls",              "Citadel of Skulls — NPCs"),
    "darkfrontier":          ("Dark Frontier",                  "Dark Frontier — NPCs"),
    "drydock":               ("The Soul Reaver: Drydock",       "Drydock — NPCs"),
    "edgeoftheabyss":        ("Edge of the Abyss",              "Edge of the Abyss — NPCs"),
    "epochkoronus":          ("An Epoch in the Koronus Expanse","Epoch Koronus — NPCs"),
    "errata":                ("Rogue Trader Errata",            "Errata — NPCs"),
    "faithandcoin":          ("Faith and Coin",                 "Faith and Coin — NPCs"),
    "fallensuns":            ("Fallen Suns",                    "Fallen Suns — NPCs"),
    "forsakenbounty":        ("Forsaken Bounty",                "Forsaken Bounty — NPCs"),
    "hostileacquisitions":   ("Hostile Acquisitions",           "Hostile Acquisitions — NPCs"),
    "lureoftheexpanse":      ("Lure of the Expanse",            "Lure of the Expanse — NPCs"),
    "sheddinglight":         ("Shedding Light",                 "Shedding Light — NPCs"),
    "starsofinequity":       ("Stars of Inequity",              "Stars of Inequity — NPCs"),
    "taucharacterguide":     ("The Koronus Bestiary: Tau Character Guide", "Tau Character Guide — NPCs"),
    "thefrozenreaches":      ("The Frozen Reaches",             "The Frozen Reaches — NPCs"),
    "thegamemasterskit":     ("The Game Master's Kit",          "Game Master's Kit — NPCs"),
    "thekoronusbestiary":    ("The Koronus Bestiary",           "Koronus Bestiary — NPCs"),
    "thenavisprimer":        ("The Navis Primer",               "Navis Primer — NPCs"),
    "thesoulreaver":         ("The Soul Reaver",                "The Soul Reaver — NPCs"),
    "twilightcrusade":       ("Twilight Crusade",               "Twilight Crusade — NPCs"),
}


def make_actor_with_source(npc, talent_idx, trait_idx, weapon_idx, source_text, book_slug):
    """Wrap build_actor() to inject the book-specific source string + image path."""
    actor, tmiss, trmiss = build_actor(npc, talent_idx, trait_idx, weapon_idx, book_slug=book_slug)
    actor["flags"]["rt"]["source"] = source_text
    # Also propagate into any inline-parsed weapons/armour that defaulted to
    # the corebook source string.
    for it in actor["items"]:
        sysd = it.get("system") or {}
        if sysd.get("source") == "Rogue Trader Core Rulebook, Ch. XIV":
            sysd["source"] = source_text
    return actor, tmiss, trmiss


def write_book_pack(book_slug, npcs, talent_idx, trait_idx, weapon_idx):
    source_text, label = BOOK_META.get(
        book_slug, (book_slug.replace("-", " ").title(),
                    f"{book_slug.replace('-', ' ').title()} — NPCs"),
    )
    pack_name = f"{book_slug}-npcs"
    out_dir = PACKS_DIR / pack_name
    out_file = out_dir / f"{pack_name}.yml"
    out_dir.mkdir(parents=True, exist_ok=True)

    actors = []
    miss_t, miss_tr = [], []
    for n in npcs:
        a, tmiss, trmiss = make_actor_with_source(
            n, talent_idx, trait_idx, weapon_idx, source_text, book_slug,
        )
        actors.append(a)
        miss_t.extend(tmiss)
        miss_tr.extend(trmiss)

    out_file.write_text(yaml_dump(actors))
    return pack_name, label, len(actors), miss_t, miss_tr


def update_system_json(new_packs):
    """Add {type:'Actor'} pack entries for every <book>-npcs not already registered."""
    data = json.loads(SYSTEM_JSON.read_text())
    existing = {p["name"] for p in data.get("packs", [])}
    added = []
    for pack_name, label in new_packs:
        if pack_name in existing:
            continue
        data["packs"].append({
            "name": pack_name,
            "system": "rogue-trader-3rd",
            "label": label,
            "path": f"./packs/{pack_name}.db",
            "type": "Actor",
            # GM-only: players can't browse these in the compendium sidebar.
            "ownership": {"PLAYER": "NONE", "ASSISTANT": "OWNER"},
        })
        added.append(pack_name)
    SYSTEM_JSON.write_text(json.dumps(data, indent=2) + "\n")
    return added


def main():
    talent_idx = index_by_name(load_pack_yaml("talents"))
    trait_idx = index_by_name(load_pack_yaml("traits"))
    weapon_idx = index_by_name(load_pack_yaml("weapons"))
    print(f"Indexed: {len(talent_idx)} talents, {len(trait_idx)} traits, {len(weapon_idx)} weapons")

    json_files = sorted(EXTRACTED_DIR.glob("*.json"))
    if not json_files:
        sys.exit(f"no extracted JSONs in {EXTRACTED_DIR} (run extract_all_npcs.py first)")

    print(f"\nBuilding {len(json_files)} compendium pack(s):")
    new_packs = []
    total_actors = 0
    total_miss_t, total_miss_tr = set(), set()
    for jf in json_files:
        book_slug = jf.stem
        npcs = json.loads(jf.read_text())
        if not npcs:
            print(f"  skip {book_slug} (0 NPCs)")
            continue
        pack_name, label, n, mt, mtr = write_book_pack(
            book_slug, npcs, talent_idx, trait_idx, weapon_idx,
        )
        total_actors += n
        total_miss_t.update(mt)
        total_miss_tr.update(mtr)
        new_packs.append((pack_name, label))
        print(f"  {pack_name}: {n} actors  ({label})")

    print(f"\nUpdating {SYSTEM_JSON}...")
    added = update_system_json(new_packs)
    print(f"  registered {len(added)} new pack(s): {added if added else '(none — all already present)'}")

    print(f"\nTotal: {total_actors} actors across {len(new_packs)} packs")
    if total_miss_t:
        print(f"\nUnresolved talents ({len(total_miss_t)} unique) — render as name-only stubs:")
        for t in sorted(total_miss_t)[:40]:
            print(f"  - {t}")
        if len(total_miss_t) > 40:
            print(f"  ... and {len(total_miss_t)-40} more")
    if total_miss_tr:
        print(f"\nUnresolved traits ({len(total_miss_tr)} unique):")
        for t in sorted(total_miss_tr)[:40]:
            print(f"  - {t}")
        if len(total_miss_tr) > 40:
            print(f"  ... and {len(total_miss_tr)-40} more")


if __name__ == "__main__":
    main()
