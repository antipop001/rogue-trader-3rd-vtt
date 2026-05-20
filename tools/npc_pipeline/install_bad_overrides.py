#!/usr/bin/env python3
"""Install canonical reference overrides from /mnt/project_data/RT/RT-NPC/ for
the NPCs flagged BAD by the sanity-check sweep.

Skips ComfyUI entirely — these references are the user's hand-curated canon
art, so we preserve them as-is. Each is converted to PNG at the Foundry token
aspect ratio (832×1216) with letterbox padding so the figure isn't cropped.
"""
import shutil
import sys
from pathlib import Path

from PIL import Image

RT_NPC = Path("/mnt/project_data/RT/RT-NPC")
OUT = Path("/home/ahermon/rogue-trader-3rd-vtt/src/images/npcs")
TARGET_W, TARGET_H = 832, 1216  # Foundry portrait aspect

# Map RT-NPC filename (case-folded, extension-stripped, whitespace-normalised)
# → (book, slug). Built manually from inspecting the RT-NPC folder against
# the BAD list.
FILE_MAP = {
    "attack squig":                                      ("thefrozenreaches", "attack-squig"),
    "cryptek":                                           ("sheddinglight", "cryptek"),
    "damaris skitarii tech-guard":                       ("thefrozenreaches", "damaris-skitarii-tech-guard"),
    "farseer caille":                                    ("fallensuns", "farseer-caille"),
    "fleshwrought drake":                                ("thesoulreaver", "fleshwrought-drake"),
    "gretchin headhunter":                               ("starsofinequity", "gretchin-headhunter"),
    "grotesque":                                         ("thesoulreaver", "grotesque"),
    "guardian of the inner sanctum":                     ("faithandcoin", "guardian-of-the-inner-sanctum"),
    "gun-master":                                        ("lureoftheexpanse", "gun-master"),
    "inquisitor havelock blackheel":                     ("thenavisprimer", "inquisitor-havelock-blackheel"),
    "iniquity-pattern combat servitor":                  ("citadelofskulls", "iniquity-pattern-combat-servitor"),
    "karanak":                                           ("starsofinequity", "kanrak"),
    "lathe-pattern murder servitor":                     ("hostileacquisitions", "lathe-pattern-murder-servitor"),
    "master shaper ashak kor of the misthound kindred": ("edgeoftheabyss", "master-shaper-ashak-kor-of-the-misthound-kindred"),
    "maulerfiend":                                       ("twilightcrusade", "maulerfiend"),
    "ork warphead":                                      ("thenavisprimer", "ork-warphead"),
    "ork weirdboy":                                      ("thenavisprimer", "ork-weirdboy"),
    "pathfinder":                                        ("lureoftheexpanse", "pathfinder"),
    "plaguebearer":                                      ("thenavisprimer", "plaguebearer"),
    "priest-king ansai":                                 ("lureoftheexpanse", "priest-king-ansai"),
    "renegade":                                          ("corebook", "renegade"),
    "skabgob":                                           ("starsofinequity", "skabgob"),
    "squig":                                             ("thenavisprimer", "squig"),
    "statues of the dark lament":                        ("thegamemasterskit", "statues-of-the-dark-lament"),
    "tunnel horror":                                     ("citadelofskulls", "tunnel-horror"),
    "warboss snokgritz":                                 ("thefrozenreaches", "warboss-snokgritz"),
    "warlock bhaine dhûn":                               ("fallensuns", "warlock-bhaine-dh-n"),
    "warppredator":                                      ("corebook", "warp-predator-ebon-geist"),
    "criminal mastermind":                               ("hostileacquisitions", "the-criminal-mastermind"),
    "culexus-assassin":                                  ("thenavisprimer", "culexus-assassin"),
    "forgefiend":                                        ("twilightcrusade", "forgefiend"),
}


def canon_key(name):
    """Lowercase, strip extension and trailing whitespace."""
    return name.lower().strip()


def letterbox_fit(src_path: Path, dst_path: Path):
    """Open image, scale-to-fit 832×1216 preserving aspect, pad with black."""
    im = Image.open(src_path).convert("RGB")
    sw, sh = im.size
    scale = min(TARGET_W / sw, TARGET_H / sh)
    new_w, new_h = int(round(sw * scale)), int(round(sh * scale))
    resized = im.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGB", (TARGET_W, TARGET_H), (0, 0, 0))
    off_x = (TARGET_W - new_w) // 2
    off_y = (TARGET_H - new_h) // 2
    canvas.paste(resized, (off_x, off_y))
    canvas.save(dst_path, "PNG", optimize=True)


def main():
    files = sorted(RT_NPC.iterdir())
    by_key = {}
    for f in files:
        if not f.is_file():
            continue
        stem = f.stem  # filename minus extension
        key = canon_key(stem)
        by_key[key] = f

    unmatched_files = []
    unmatched_slugs = []
    n_ok = 0
    for ref_key, (book, slug) in FILE_MAP.items():
        ref_file = by_key.get(ref_key)
        if not ref_file:
            unmatched_slugs.append((ref_key, book, slug))
            continue
        out_dir = OUT / book
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{slug}.png"
        letterbox_fit(ref_file, out_path)
        print(f"  {book}/{slug}.png  ←  {ref_file.name}")
        n_ok += 1

    # Surface any RT-NPC files that didn't match a slug
    seen_keys = set(FILE_MAP.keys())
    for key, f in by_key.items():
        if key not in seen_keys:
            unmatched_files.append(f.name)

    print(f"\nInstalled {n_ok}/{len(FILE_MAP)} overrides.")
    if unmatched_slugs:
        print(f"\nBAD slugs with no override file:")
        for key, book, slug in unmatched_slugs:
            print(f"  - {book}/{slug}  (expected file '{key}.*')")
    if unmatched_files:
        print(f"\nRT-NPC files with no slug match:")
        for f in unmatched_files:
            print(f"  - {f}")


if __name__ == "__main__":
    main()
