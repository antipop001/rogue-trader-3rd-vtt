#!/usr/bin/env python3
"""
Parse RT corebook NPC stat blocks into a structured intermediate JSON.

Run on a subset of `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md`.
Emits `/tmp/npcs_parsed.json` for downstream YAML assembly + image gen.

Schema per NPC:
    {
        "name": str,              # e.g. "Eldar Corsair"
        "slug": str,              # e.g. "eldar-corsair"
        "faction": str,           # heuristic: e.g. "Eldar", "Ork", "Kroot", "Warp"
        "description": str,       # paragraph(s) of flavor text before the profile
        "characteristics": {      # 9 RT characteristics, keyed by long name
            "weaponSkill": {"base": 48, "unnatural": 0},
            ...
        },
        "wounds": int,
        "movement": str,          # e.g. "5/10/15/30"
        "skills": [               # list of (skill_name, advance) tuples (advance index 0..3)
            ("Awareness", 10), ("Acrobatics", 0), ...
        ],
        "talents": [str, ...],    # parsed names (specialty in parens kept verbatim)
        "traits": [str, ...],
        "weapons_text": str,      # raw "Weapons:" line; embed parsing is deferred
        "armour_text": str,       # raw "Armour:" line
        "gear_text": str,         # raw "Gear:" line
    }
"""

import json
import re
import sys
from pathlib import Path

CHARACTERISTIC_KEYS = [
    "weaponSkill", "ballisticSkill", "strength", "toughness",
    "agility", "intelligence", "perception", "willpower", "fellowship",
]

# Faction inference based on name keywords (heuristic — extend per-section as needed).
FACTION_RULES = [
    ("Eldar", "Eldar"),
    ("Ork", "Ork"),
    ("Kroot", "Kroot"),
    ("Ebon Geist", "Warp"),
    ("Warp Predator", "Warp"),
]


def slugify(name):
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def infer_faction(name):
    for kw, fac in FACTION_RULES:
        if kw.lower() in name.lower():
            return fac
    return ""


def parse_profile_table(lines, start_idx):
    """
    Two table formats appear in the markdown:
      A) double-header tables (Eldar/Ork/Kroot): label row, separator, "WS BS S T..." row, data row
      B) single-header tables (Ebon Geist):     "WS BS S T..." row, separator, data row
    Detect B by checking if the line right after WS starts with "| ---".

    Cells may span multiple lines when the markdown converter broke an "(N)\nvalue"
    cell across a newline. We merge continuation rows until we accumulate 9 cells.
    """
    for i in range(start_idx, min(start_idx + 8, len(lines))):
        if re.match(r"\s*\|\s*WS\s*\|", lines[i]):
            data_row = i + 2 if (i + 1 < len(lines) and lines[i + 1].lstrip().startswith("| ---")) else i + 1

            # Collect cells from data_row, merging continuation lines that lack a leading "|".
            row = lines[data_row]
            cells = [c.strip() for c in row.strip().strip("|").split("|")]
            j = data_row
            while len([c for c in cells if c]) < 9 and j + 1 < len(lines):
                j += 1
                extra = lines[j].strip()
                if not extra or extra.startswith("|"):
                    break
                # Continuation: split by '|' too, then prepend its first element to the last cell of cells.
                extra_cells = [c.strip() for c in extra.strip("|").split("|")]
                if cells and extra_cells:
                    cells[-1] = f"{cells[-1]}\n{extra_cells[0]}"
                    cells.extend(extra_cells[1:])
            return cells, data_row
    return None, None


def parse_unnatural(cell):
    """
    A cell like '(8)\n45' means: base=45, unnatural_bonus=8 (i.e., +8 to the bonus, which
    on RT means an Unnatural Characteristic x2 = doubled bonus → +TB equal to base bonus).
    For simplicity we return (base, unnatural_value_as_displayed).
    """
    m = re.match(r"\((\d+)\)\s*(\d+)", cell.replace("\n", " "))
    if m:
        return int(m.group(2)), int(m.group(1))
    m = re.match(r"(\d+)", cell)
    if m:
        return int(m.group(1)), 0
    return 0, 0


def parse_skills(line):
    """
    Parse a 'Skills:' line into a list of (skill_name, advance) tuples.
    Skills may have a characteristic in parens "(Ag)" and an advance "+10" / "+20".
    Skills may also have a specialty in parens, e.g. "Forbidden Lore (The Black Library, Xenos, The Warp) (Int)".
    We ignore the characteristic-in-parens entry; we keep specialty text as part of the skill name.
    """
    text = re.sub(r"^Skills:\s*", "", line)
    # Split on commas that are NOT inside parens.
    parts = []
    depth = 0
    cur = ""
    for ch in text:
        if ch == "(":
            depth += 1
            cur += ch
        elif ch == ")":
            depth -= 1
            cur += ch
        elif ch == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur.strip())

    skills = []
    for p in parts:
        p = p.rstrip(".")
        # A skill listed in a stat block is TRAINED, even with no bonus. Emit the
        # runtime's level-INDEX scale (0=untrained, 1=trained/+0, 2=+10, 3=+20),
        # NOT the raw bonus magnitude — the sheet dropdown + _skillAdvanceToValue
        # expect 0..3. RT caps skill advances at +20, so +20 and +30 both -> 3.
        adv = 1  # listed but un-bonused => Trained (+0)
        m = re.search(r"\+(\d+)\s*$", p)
        if m:
            bonus = int(m.group(1))
            adv = 2 if bonus <= 10 else 3
            p = p[: m.start()].strip()
        # Strip a trailing characteristic-in-parens like "(Ag)" or "(Int)" or "(Per)".
        p = re.sub(r"\s*\(([A-Z][a-z]?(/[A-Z][a-z]?)?|S|T|Fel|WP|Int|Per|Ag|Ws|Bs)\)\s*$", "", p).strip()
        skills.append((p, adv))
    return skills


def parse_list_line(line, header):
    """Parse a 'Talents:' or 'Traits:' line into a list of names. Specialties in parens stay attached."""
    text = re.sub(rf"^{header}:\s*", "", line)
    parts = []
    depth = 0
    cur = ""
    for ch in text:
        if ch == "(":
            depth += 1
            cur += ch
        elif ch == ")":
            depth -= 1
            cur += ch
        elif ch == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur.strip())
    return [p.rstrip(".").strip() for p in parts if p.strip()]


def find_npc_blocks(content, npc_names):
    """
    Given the full markdown and a list of NPC header strings to look for,
    return a dict {name: (start_line_idx, end_line_idx)}.
    Each NPC's block runs from its header to the next NPC header or end-of-section.
    """
    lines = content.splitlines()
    matches = {}
    sorted_indices = []
    for i, line in enumerate(lines):
        for name in npc_names:
            # Allow # or ## header.
            if re.match(rf"^#+\s+{re.escape(name)}\s*$", line, re.IGNORECASE):
                matches[name] = i
                sorted_indices.append((i, name))
    sorted_indices.sort()

    # Find every `#`-prefixed header (any level) so the LAST target NPC has a bounded block.
    header_indices = [i for i, l in enumerate(lines) if re.match(r"^#+\s+\S", l)]

    blocks = {}
    for k, (start, name) in enumerate(sorted_indices):
        if k + 1 < len(sorted_indices):
            end = sorted_indices[k + 1][0]
        else:
            # Walk forward to the next non-trivial header (skipping the NPC's own header).
            next_headers = [h for h in header_indices if h > start]
            # Skip immediate `## Profile`-style sub-headers inside the same NPC by allowing
            # at least 5 lines of slack; pick the first header beyond the stat block region.
            end = next((h for h in next_headers if h > start + 5 and not re.search(r"profile", lines[h], re.IGNORECASE)), len(lines))
        blocks[name] = (start, end)
    return blocks, lines


def parse_npc(name, lines, start, end):
    """Parse one NPC block from lines[start:end]."""
    block = lines[start:end]

    # Description = lines between header and the first markdown-table row (whichever
    # comes first — a "| X Profile |" label row, a separator row, or the WS column row).
    profile_start_off = None
    desc_end_off = None
    for i, l in enumerate(block):
        if re.match(r"\s*\|", l) and desc_end_off is None:
            desc_end_off = i
        if re.match(r"\s*\|\s*WS\s*\|", l):
            profile_start_off = i
            break
    if profile_start_off is None:
        return None

    description = "\n".join(block[1 : desc_end_off if desc_end_off is not None else profile_start_off]).strip()
    # Strip image markdown and any standalone "## Subtype Profile" sub-headers.
    description = re.sub(r"!\[.*?\]\(.*?\)", "", description)
    description = re.sub(r"^##?\s+.*?Profile\s*$", "", description, flags=re.MULTILINE)
    description = re.sub(r"\n{3,}", "\n\n", description).strip()

    # Profile table.
    cells, data_row_off = parse_profile_table(block, profile_start_off)
    if cells is None or len(cells) < 9:
        return None
    cells = [c for c in cells if c][:9]
    characteristics = {}
    for key, cell in zip(CHARACTERISTIC_KEYS, cells):
        base, unnatural = parse_unnatural(cell)
        characteristics[key] = {"base": base, "unnatural": unnatural}

    # Movement + Wounds + Skills/Talents/Traits + Weapons/Armour/Gear can appear
    # in arbitrary order — process the rest of the block paragraph-by-paragraph so a
    # trailing footnote (after a blank line) doesn't bleed into the previous section.
    rest_lines = block[data_row_off + 1 :]
    # Strip inline image markdown so embedded `![img-N.jpeg](...)` doesn't pollute skill names.
    rest_lines = [re.sub(r"!\[.*?\]\(.*?\)", "", l) for l in rest_lines]
    # Normalize `**Label:**` to `Label:` and demote any `## Label:` to plain `Label:`.
    LABELS = ["Movement", "Wounds", "Skills", "Talents", "Traits", "Armour", "Armor", "Weapons", "Gear"]
    label_pattern_inline = r"\*\*(" + "|".join(LABELS) + r"):\*\*\s*"
    label_pattern_head = r"^##\s+(Movement|Wounds):\s*"
    rest_lines = [re.sub(label_pattern_inline, r"\1: ", l) for l in rest_lines]
    rest_lines = [re.sub(label_pattern_head, r"\1: ", l) for l in rest_lines]

    movement = ""
    wounds = 0
    skills_list = []
    talents_list = []
    traits_list = []
    weapons_text = ""
    armour_text = ""
    gear_text = ""

    # Group rest_lines into paragraphs (split on blank lines), then for each paragraph
    # extract LABEL: VALUE pairs that may run several labels on one paragraph
    # (e.g. "Movement: 5/10/15/30  Wounds: 12").
    paragraphs = []
    cur_para = []
    for l in rest_lines:
        if l.strip() == "":
            if cur_para:
                paragraphs.append(" ".join(cur_para))
                cur_para = []
        else:
            cur_para.append(l.strip())
    if cur_para:
        paragraphs.append(" ".join(cur_para))

    label_pattern = r"\b(" + "|".join(LABELS) + r"):\s*"
    leading_label = re.compile(r"^\s*(" + "|".join(LABELS) + r"):", re.IGNORECASE)
    section = {}
    # First, merge any paragraph that doesn't start with a label into the previous
    # paragraph — image markdown often interrupts a skill/talent list with a blank-image-blank
    # sequence, splitting one logical section across two paragraphs.
    merged = []
    for para in paragraphs:
        if merged and not leading_label.match(para):
            merged[-1] = merged[-1].rstrip() + " " + para
        else:
            merged.append(para)
    for para in merged:
        parts = re.split(label_pattern, " " + para)
        i = 1
        while i + 1 < len(parts):
            key = parts[i].lower()
            val = parts[i + 1].strip()
            if key not in section:
                section[key] = val
            i += 2

    movement = section.get("movement", "").strip().rstrip(".").replace("**", "").strip()
    try:
        wounds = int(re.match(r"(\d+)", section.get("wounds", "")).group(1))
    except (AttributeError, ValueError):
        wounds = 0

    # Footnotes can leak in when paragraph-merge glues a "†..." or "Capitalized Word:"
    # explanation onto the end of a list section. Cut at the first such boundary.
    def trim_footnotes(s):
        if not s:
            return s
        # Cut at ". †..." (dagger-prefixed footnote)
        m = re.search(r"\.\s+†", s)
        if m:
            s = s[: m.start() + 1]
        # Cut at ". <Capital>...:" (sentence followed by a labeled definition, e.g. "Daemonic Presence:")
        m = re.search(r"\.\s+[A-Z][A-Za-z\s\-]+:", s)
        if m:
            s = s[: m.start() + 1]
        return s

    if "skills" in section:
        skills_list = parse_skills("Skills: " + trim_footnotes(section["skills"]))
    if "talents" in section:
        talents_list = parse_list_line("Talents: " + trim_footnotes(section["talents"]), "Talents")
    if "traits" in section:
        traits_list = parse_list_line("Traits: " + trim_footnotes(section["traits"]), "Traits")
    if "armour" in section or "armor" in section:
        armour_text = trim_footnotes(section.get("armour") or section.get("armor") or "").strip()
    if "weapons" in section:
        weapons_text = trim_footnotes(section["weapons"]).strip()
    if "gear" in section:
        gear_text = trim_footnotes(section["gear"]).strip()

    return {
        "name": name,
        "slug": slugify(name),
        "faction": infer_faction(name),
        "description": description,
        "characteristics": characteristics,
        "wounds": wounds,
        "movement": movement,
        "skills": skills_list,
        "talents": talents_list,
        "traits": traits_list,
        "weapons_text": weapons_text,
        "armour_text": armour_text,
        "gear_text": gear_text,
    }


def main():
    src = Path("/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md")
    content = src.read_text(encoding="utf-8")

    # Headers in the markdown — they're a mix of # and ## levels.
    target_names = ["ELDAR CORSAIR", "ORK FREEBOOTER", "KROOT MERCENARY", "WARP PREDATOR (EBON GEIST)"]
    blocks, lines = find_npc_blocks(content, target_names)

    npcs = []
    for name in target_names:
        if name not in blocks:
            print(f"WARN: header not found for {name}", file=sys.stderr)
            continue
        start, end = blocks[name]
        npc = parse_npc(name.title().replace("(Ebon Geist)", "(Ebon Geist)"), lines, start, end)
        if npc:
            # Tidy display name capitalization.
            npc["name"] = {
                "ELDAR CORSAIR": "Eldar Corsair",
                "ORK FREEBOOTER": "Ork Freebooter",
                "KROOT MERCENARY": "Kroot Mercenary",
                "WARP PREDATOR (EBON GEIST)": "Warp Predator (Ebon Geist)",
            }[name]
            npc["slug"] = slugify(npc["name"])
            npc["faction"] = infer_faction(npc["name"])
            npcs.append(npc)
        else:
            print(f"WARN: failed to parse {name}", file=sys.stderr)

    out = Path("/tmp/npcs_parsed.json")
    out.write_text(json.dumps(npcs, indent=2, ensure_ascii=False))
    print(f"Wrote {len(npcs)} NPCs to {out}")


if __name__ == "__main__":
    main()
