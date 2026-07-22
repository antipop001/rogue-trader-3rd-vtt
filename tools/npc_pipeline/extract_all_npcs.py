#!/usr/bin/env python3
"""
Scan every OCR'd RT book under /mnt/project_data/RT/RT-DOCS/*.pdf/markdown.md
and extract every NPC stat block, grouped by book.

Builds on tools/npc_pipeline/build_npcs.py (which was hard-coded to 4 corebook
NPCs). The generalisation is:
  - find every "| WS | BS | S | T | ... |" table in each book's markdown
  - walk backward from the table to identify the NPC's name (#-heading first,
    plain capitalised line second; skip the dual-header "X Profile" cell row)
  - reuse the existing block parser (parse_npc-style logic) for stats/skills/
    talents/traits/weapons/armour/gear
  - record the nearest preceding `![img-N.jpeg](img-N.jpeg)` reference for
    later portrait matching
  - emit one JSON list per book at tools/npc_pipeline/extracted/<slug>.json

Books with zero stat blocks are skipped (no output file).

Slugging convention:
  CoreBook-1-200.pdf + CoreBook-201-401.pdf       -> corebook
  roguetrader_intothestorm-1-125.pdf + ...126-257 -> intothestorm
  roguetrader_thekoronusbestiary (1).pdf          -> koronusbestiary
  roguetrader_<rest>.pdf                          -> <rest>
  Rogue Trader Errata v. 1.4 WQ.pdf               -> errata
"""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

SRC_ROOT = Path("/mnt/project_data/RT/RT-DOCS")
OUT_DIR = Path(__file__).parent / "extracted"

CHARACTERISTIC_KEYS = [
    "weaponSkill", "ballisticSkill", "strength", "toughness",
    "agility", "intelligence", "perception", "willpower", "fellowship",
]

LABELS = ["Movement", "Wounds", "Skills", "Talents", "Traits",
          "Armour", "Armor", "Weapons", "Gear"]

# Curated rename map for cases where the parser correctly picks the nearest
# heading but that heading is a thematic banner (Koronus Bestiary pattern:
# `# CREATURE NAME` → narrative → `# THEMATIC BANNER` → stat block, where the
# banner sits closer to the stats). Walking-back wouldn't reliably distinguish
# these from chapter banners (which are also h1 same-level) without semantic
# knowledge, so we patch them here.
#
# Keys are book-slug + parser-extracted name (canonicalised to title case).
NAME_RENAMES = {
    ("thekoronusbestiary", "Guardian Of The Dead"): "Bone Conqueror",
    ("thekoronusbestiary", "Nightmare Hunters"): "Khymera",
    ("thekoronusbestiary", "The Death Of Augustus Killian"): "Killian's Bane",
    ("thekoronusbestiary", "Tales From Vaporius"): "Sand Tiger",
    ("thekoronusbestiary", "Humanoid But No Longer Human"): "Shadowkith",
    ("thekoronusbestiary", "Desert Treasures"): "Unquenched",
    ("thekoronusbestiary", "Hidden Masters"): "Ur-Ghul",
}

# Stat-block-like rows that aren't actually NPCs — flavor sidebars, narrative
# events, or section banners the parser incorrectly attached a stat table to.
# (book_slug, parser-extracted name) → dropped entirely.
DROP_NPCS = {
    ("intothestorm", "Requirescant In Pace"),    # asteroid-conjunction event
    ("fallensuns", "Taking Trophies"),           # narrative vignette (PC picks up Bane)
    ("citadelofskulls", "Strangler"),            # section banner without a real stat block
}


FACTION_RULES = [
    ("eldar", "Eldar"), ("aeldari", "Eldar"), ("ork", "Ork"),
    ("kroot", "Kroot"), ("tau", "Tau"), ("stryxis", "Stryxis"),
    ("rak'gol", "Rak'Gol"), ("rakgol", "Rak'Gol"),
    ("ebon geist", "Warp"), ("warp predator", "Warp"), ("daemon", "Warp"),
    ("chaos", "Chaos"), ("traitor", "Chaos"), ("heretic", "Chaos"),
    ("dark eldar", "Dark Eldar"), ("drukhari", "Dark Eldar"),
    ("necron", "Necron"), ("tyranid", "Tyranid"),
]


def slugify(name):
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def book_slug(pdf_dirname):
    name = pdf_dirname[:-4] if pdf_dirname.lower().endswith(".pdf") else pdf_dirname
    if name.lower().startswith("corebook"):
        return "corebook"
    if name.lower().startswith("rogue trader errata"):
        return "errata"
    base = re.sub(r"^roguetrader_", "", name, flags=re.IGNORECASE)
    base = re.sub(r"\s*\(\d+\)\s*$", "", base)
    base = re.sub(r"-?\d+-\d+$", "", base)
    base = re.sub(r"_sourcebook$", "", base, flags=re.IGNORECASE)
    return slugify(base)


def infer_faction(name):
    n = name.lower()
    for kw, fac in FACTION_RULES:
        if kw in n:
            return fac
    return ""


def parse_profile_table(lines, ws_idx):
    """Parse a stat block table starting at the row with `| WS | BS | ...`.

    Two layouts:
      A) Dual-header: a "| <Profile-label> | | ... |" cell row sits ABOVE the WS
         row, followed by a `| --- |` separator, then WS, then the data row.
         (Markdown sees this as a 2-line table header.)
      B) Single-header: WS row is at the top, `| --- |` separator follows, then
         data row.

    Detect by checking what's at ws_idx+1:
      - "| ---" → single-header (A): data at ws_idx+2.
      - "| <values> |" → dual-header (B): data at ws_idx+1.
    Cells can span multiple lines when the converter broke "(N)\nvalue".
    """
    if ws_idx + 1 >= len(lines):
        return None, None
    next_line = lines[ws_idx + 1].lstrip()
    if next_line.startswith("| ---"):
        data_row = ws_idx + 2
    elif next_line.startswith("|"):
        data_row = ws_idx + 1
    else:
        return None, None
    if data_row >= len(lines):
        return None, None
    # First, find out how many characteristic columns the WS header declares
    # — some NPCs (mindless servitors, gun-platforms) have 7–8 columns instead
    # of the standard 9. Walk back from the WS row's `|` cells.
    ws_cells = [c.strip() for c in lines[ws_idx].strip().strip("|").split("|")]
    n_cols = max(7, len([c for c in ws_cells if c]))
    n_cols = min(n_cols, 9)

    row = lines[data_row]
    cells = [c.strip() for c in row.strip().strip("|").split("|")]
    j = data_row
    while len([c for c in cells if c]) < n_cols and j + 1 < len(lines):
        j += 1
        extra = lines[j].strip()
        if not extra or extra.startswith("|"):
            break
        extra_cells = [c.strip() for c in extra.strip("|").split("|")]
        if cells and extra_cells:
            cells[-1] = f"{cells[-1]}\n{extra_cells[0]}"
            cells.extend(extra_cells[1:])
    return cells, data_row


def parse_unnatural(cell):
    s = cell.replace("\n", " ")
    m = re.match(r"\((\d+)\)\s*(\d+)", s)
    if m:
        return int(m.group(2)), int(m.group(1))
    m = re.match(r"(\d+)", s)
    if m:
        return int(m.group(1)), 0
    return 0, 0


def _split_top_commas(text):
    parts, depth, cur = [], 0, ""
    for ch in text:
        if ch == "(":
            depth += 1; cur += ch
        elif ch == ")":
            depth -= 1; cur += ch
        elif ch == "," and depth == 0:
            parts.append(cur.strip()); cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur.strip())
    return parts


def parse_skills(line):
    text = re.sub(r"^Skills:\s*", "", line)
    skills = []
    for p in _split_top_commas(text):
        p = p.rstrip(".")
        # Emit the runtime's level-INDEX scale (0=untrained, 1=trained/+0, 2=+10,
        # 3=+20), NOT the raw bonus magnitude. A skill LISTED in a stat block is
        # trained even with no bonus, so default to 1. RT caps advances at +20.
        adv = 1
        m = re.search(r"\+(\d+)\s*$", p)
        if m:
            adv = 2 if int(m.group(1)) <= 10 else 3
            p = p[:m.start()].strip()
        p = re.sub(
            r"\s*\(([A-Z][a-z]?(/[A-Z][a-z]?)?|S|T|Fel|WP|Int|Per|Ag|Ws|Bs)\)\s*$",
            "", p,
        ).strip()
        if p:
            skills.append((p, adv))
    return skills


def parse_list_line(line, header):
    text = re.sub(rf"^{header}:\s*", "", line)
    return [p.rstrip(".").strip() for p in _split_top_commas(text) if p.strip()]


def find_name_for_table(lines, ws_idx, prev_ws_idx=None):
    """Walk backward from the WS row to identify the NPC's name.

    Candidate sources:
      - Dual-header inline name `| <Name> | | ... |` two-above WS
      - `#+ HEADING` lines (any level)
      - Plain capitalised label lines

    Resolution rule (preserves all previously-supported layouts AND fixes the
    Koronus Bestiary "thematic banner over creature name" failure mode):

      1. Canonical-form dual-header inline name wins over distant headings
         (Koronus Bestiary `| Creeping Stalker |` table beats banner heading).
      2. Plain-text candidates win when present — handles the Koronus
         Bestiary `Clawed Fiend` plain label sitting under a thematic banner.
      3. Multiple headings, no plain text → prefer the EARLIEST heading. The
         Bestiary uses `# CREATURE NAME` → narrative → `# THEMATIC BANNER` →
         stat block; the banner sits closer to the stats but the creature
         name comes first.
      4. Single heading or table-label fallback (`Profile`-suffixed dual
         header) otherwise.

    `prev_ws_idx` bounds the backward walk so we don't grab the previous
    NPC's heading when two stat blocks share a page.
    Returns (display_name, source_line_idx) or (None, None).
    """
    # Walk backward collecting name candidates. Two sources:
    #   - `#+ HEADING` lines (high-quality but may be a section/chapter banner)
    #   - Plain title-like lines (no terminal punctuation, ≤8 words)
    # Return the NEAREST candidate of either type — Koronus Bestiary uses a
    # `# UNSTOPPABLE FURY` section banner above prose with a plain-text
    # `Clawed Fiend` label right above the table; the nearest wins.
    # Search bound 50 lines (Twilight Crusade has Alasiel ~45 lines below
    # `# ALASIEL` after the multi-page backstory).
    # Pre-compute the dual-header inline candidate (if any). Distinguish two
    # forms:
    #   - Canonical-form ("Creeping Stalker"): the cell holds the actual NPC
    #     name and no nearby heading source is needed.
    #   - Table-label form ("Gerrit Profile"): the cell is just a column
    #     descriptor; a heading like `## ABEL GERRIT` above carries the real
    #     name. We don't trust this without a heading.
    dual_canonical = None  # cell name when it does NOT end in " Profile"
    dual_label = None      # cell name with " Profile" stripped (label form)
    if ws_idx - 2 >= 0:
        sep_line = lines[ws_idx - 1].lstrip()
        header_line = lines[ws_idx - 2].strip()
        if sep_line.startswith("| ---") and header_line.startswith("|"):
            cells = [c.strip() for c in header_line.strip().strip("|").split("|")]
            non_empty = [c for c in cells if c]
            if non_empty and len(non_empty[0]) >= 2 and len(non_empty) == 1:
                raw = non_empty[0]
                if re.search(r"\s+Profile\s*$", raw, flags=re.IGNORECASE):
                    dual_label = re.sub(r"\s+Profile\s*$", "", raw,
                                        flags=re.IGNORECASE).strip()
                else:
                    dual_canonical = raw.strip()

    # Walk backward collecting heading + plain-text candidates, bounded by
    # the previous stat block (so we don't reach into another NPC's section).
    # Reject heading candidates ending in " Profile" (table-label sub-headings
    # like `## Dweller Profile`).
    lower_bound = prev_ws_idx + 1 if prev_ws_idx is not None else -1
    i = ws_idx - 1
    heading_candidates = []        # [(idx, name)] — clean `#+` lines
    plaintext_candidates = []      # [(idx, name)] — clean Title-case lines
    profile_stripped_candidates = []  # [(idx, name)] — fallback when only
                                     # `Foo Profile`-style labels are present
    while i > lower_bound and ws_idx - i < 50:
        l = lines[i].strip()
        if not l:
            i -= 1; continue
        if re.fullmatch(r"!\[.*?\]\(.*?\)", l):
            i -= 1; continue
        if l.startswith("|"):
            i -= 1; continue
        m = re.match(r"^(#+)\s+(.+?)\s*$", l)
        if m:
            name = m.group(2).strip()
            if re.search(r"\s+Profile\s*$", name, flags=re.IGNORECASE):
                stripped = re.sub(r"\s+Profile\s*$", "", name,
                                  flags=re.IGNORECASE).strip()
                if stripped:
                    profile_stripped_candidates.append((i, stripped))
            else:
                heading_candidates.append((i, name))
        elif len(l) <= 80 and len(l.split()) <= 8 and re.match(
                r"^[A-Z][A-Za-z’‘'\-\s,\(\)]+$", l):
            if not re.search(r"[\.\!\?:;]\s*$", l):
                if re.search(r"\s+Profile\s*$", l, flags=re.IGNORECASE):
                    stripped = re.sub(r"\s+Profile\s*$", "", l,
                                      flags=re.IGNORECASE).strip()
                    if stripped:
                        profile_stripped_candidates.append((i, stripped))
                else:
                    plaintext_candidates.append((i, l))
        i -= 1

    # Resolution priority:
    #   1. Canonical dual-header inline name wins over distant candidates
    #      (Koronus Bestiary `| Creeping Stalker |` beats banner heading).
    #      A close candidate (≤4 lines) still wins.
    #   2. Nearest clean heading or plain-text candidate.
    #   3. Profile-stripped candidate fallback (`## Dark Cherub Profile`).
    #   4. Table-label dual-header (last resort).
    # NOTE: the Koronus Bestiary "thematic banner over creature name" pattern
    # (Bone Conqueror / Guardian Of The Dead) is corrected via a curated
    # rename map applied AFTER extraction — embedding it in the heuristic
    # over-corrects on corebook-style chapter-banner pages.
    nearest_named = None
    if heading_candidates or plaintext_candidates:
        all_named = heading_candidates + plaintext_candidates
        all_named.sort(key=lambda x: -x[0])
        nearest_named = all_named[0]

    if dual_canonical:
        if nearest_named and ws_idx - nearest_named[0] <= 4:
            return nearest_named[1].rstrip(".").strip(), nearest_named[0]
        return dual_canonical, ws_idx - 2

    if nearest_named:
        return nearest_named[1].rstrip(".").strip(), nearest_named[0]

    if profile_stripped_candidates:
        profile_stripped_candidates.sort(key=lambda x: -x[0])
        idx, name = profile_stripped_candidates[0]
        return name.rstrip(".").strip(), idx

    if dual_label:
        return dual_label, ws_idx - 2
    return None, None


def parse_npc_block(name, lines, start_line_idx, ws_idx, next_table_idx):
    """Parse a single NPC block from <start..next_table_idx-1>.

    `start_line_idx` is the name line, `ws_idx` the | WS | row, `next_table_idx`
    is the line containing the NEXT stat-block table (or len(lines) for the last
    block in the file).
    """
    cells, data_row = parse_profile_table(lines, ws_idx)
    if cells is None or len(cells) < 7:
        return None
    cells = [c for c in cells if c][:9]
    characteristics = {}
    for key, cell in zip(CHARACTERISTIC_KEYS, cells):
        base, unnatural = parse_unnatural(cell)
        characteristics[key] = {"base": base, "unnatural": unnatural}
    # Pad any missing characteristics with 0/0 (e.g. servitor with no Fel).
    for key in CHARACTERISTIC_KEYS:
        characteristics.setdefault(key, {"base": 0, "unnatural": 0})

    # Description = lines between name and the table (skipping image markdown
    # and any "X Profile" dual-header row).
    desc_block = lines[start_line_idx + 1:ws_idx]
    desc = "\n".join(desc_block)
    desc = re.sub(r"!\[.*?\]\(.*?\)", "", desc)
    desc = re.sub(r"^\|.*\|\s*$", "", desc, flags=re.MULTILINE)
    desc = re.sub(r"\n{3,}", "\n\n", desc).strip()

    # Stat-block followers from data_row+1 up to the next NPC (or EOF).
    bound = next_table_idx if next_table_idx else len(lines)
    rest_lines = lines[data_row + 1:bound]
    rest_lines = [re.sub(r"!\[.*?\]\(.*?\)", "", l) for l in rest_lines]
    label_pattern_inline = r"\*\*(" + "|".join(LABELS) + r"):\*\*\s*"
    label_pattern_head = r"^##\s+(Movement|Wounds):\s*"
    rest_lines = [re.sub(label_pattern_inline, r"\1: ", l) for l in rest_lines]
    rest_lines = [re.sub(label_pattern_head, r"\1: ", l) for l in rest_lines]

    paragraphs, cur = [], []
    for l in rest_lines:
        if l.strip() == "":
            if cur:
                paragraphs.append(" ".join(cur)); cur = []
        else:
            cur.append(l.strip())
    if cur:
        paragraphs.append(" ".join(cur))

    leading_label = re.compile(r"^\s*(" + "|".join(LABELS) + r"):", re.IGNORECASE)
    label_pattern = r"\b(" + "|".join(LABELS) + r"):\s*"
    merged = []
    for para in paragraphs:
        if merged and not leading_label.match(para):
            # Continuation paragraph (image-broken list). But STOP merging once
            # we've moved into a new paragraph that's clearly prose: if the
            # current section already has a closing period, this is a new
            # section/prose block — don't merge.
            if not re.search(r"[\.\!\?]\s*$", merged[-1]):
                merged[-1] = merged[-1].rstrip() + " " + para
                continue
            # Otherwise: treat as prose; stop scanning further (we've exited
            # the stat block).
            break
        merged.append(para)

    section = {}
    for para in merged:
        parts = re.split(label_pattern, " " + para)
        i = 1
        while i + 1 < len(parts):
            key = parts[i].lower()
            val = parts[i + 1].strip()
            if key not in section:
                section[key] = val
            i += 2

    def trim_footnotes(s):
        if not s:
            return s
        m = re.search(r"\.\s+†", s)
        if m: s = s[:m.start() + 1]
        m = re.search(r"\.\s+[A-Z][A-Za-z\s\-]+:", s)
        if m: s = s[:m.start() + 1]
        return s

    movement = section.get("movement", "").strip().rstrip(".").replace("**", "").strip()
    try:
        wounds = int(re.match(r"(\d+)", section.get("wounds", "")).group(1))
    except (AttributeError, ValueError):
        wounds = 0

    skills_list = parse_skills("Skills: " + trim_footnotes(section.get("skills", ""))) if "skills" in section else []
    talents_list = parse_list_line("Talents: " + trim_footnotes(section.get("talents", "")), "Talents") if "talents" in section else []
    traits_list = parse_list_line("Traits: " + trim_footnotes(section.get("traits", "")), "Traits") if "traits" in section else []
    weapons_text = trim_footnotes(section.get("weapons", "")).strip()
    armour_text = trim_footnotes(section.get("armour", section.get("armor", ""))).strip()
    gear_text = trim_footnotes(section.get("gear", "")).strip()

    # Find the closest image reference around the stat block. Search the
    # description block first (the page art typically sits between heading and
    # stat table). If none found, look at the lines immediately AFTER the stat
    # block (some books put the portrait below). Window: 30 lines either side.
    portrait_ref = None
    # Preceding (closest wins)
    for k in range(start_line_idx, max(-1, start_line_idx - 30), -1):
        m = re.search(r"!\[(img-\d+\.jpeg)\]\(\1\)", lines[k])
        if m:
            portrait_ref = m.group(1)
            break
    if not portrait_ref:
        end_search = min(len(lines), (next_table_idx or ws_idx + 60))
        for k in range(ws_idx, end_search):
            m = re.search(r"!\[(img-\d+\.jpeg)\]\(\1\)", lines[k])
            if m:
                portrait_ref = m.group(1)
                break

    # Normalise name capitalisation: if it's ALL CAPS make it Title Case;
    # leave Mixed Case alone.
    display = name
    if display.isupper():
        display = display.title()

    return {
        "name": display.strip(),
        "slug": slugify(display),
        "faction": infer_faction(display),
        "description": desc,
        "characteristics": characteristics,
        "wounds": wounds,
        "movement": movement,
        "skills": skills_list,
        "talents": talents_list,
        "traits": traits_list,
        "weapons_text": weapons_text,
        "armour_text": armour_text,
        "gear_text": gear_text,
        "portrait_ref": portrait_ref,
        "ws_line": ws_idx + 1,  # 1-indexed for human grep
    }


def extract_book(pdf_dir: Path):
    """Return (book_slug, [npc_dict, ...]). Skips books with no stat blocks."""
    md_path = pdf_dir / "markdown.md"
    if not md_path.is_file():
        return None, []
    content = md_path.read_text(encoding="utf-8")
    lines = content.splitlines()
    ws_indices = [i for i, l in enumerate(lines) if re.match(r"^\|\s*WS\s*\|", l)]
    if not ws_indices:
        return book_slug(pdf_dir.name), []

    npcs = []
    seen_slugs = defaultdict(int)
    for k, ws_idx in enumerate(ws_indices):
        prev_ws = ws_indices[k - 1] if k > 0 else None
        name, start_idx = find_name_for_table(lines, ws_idx, prev_ws_idx=prev_ws)
        if not name:
            print(f"  WARN  {pdf_dir.name}:{ws_idx+1}: no name resolved for stat block", file=sys.stderr)
            continue
        next_ws = ws_indices[k + 1] if k + 1 < len(ws_indices) else None
        npc = parse_npc_block(name, lines, start_idx, ws_idx, next_ws)
        if not npc:
            print(f"  WARN  {pdf_dir.name}:{ws_idx+1}: parse failed for '{name}'", file=sys.stderr)
            continue
        # Drop known false-positive stat blocks (flavor sidebars / events).
        if (book_slug(pdf_dir.name), npc["name"]) in DROP_NPCS:
            continue
        # Apply curated banner-name corrections (Koronus Bestiary pattern).
        renamed = NAME_RENAMES.get((book_slug(pdf_dir.name), npc["name"]))
        if renamed:
            npc["name"] = renamed
            npc["slug"] = slugify(renamed)
            npc["faction"] = infer_faction(renamed)
        # De-dupe within a book by slug — RT supplements list NPCs in multiple
        # places (sidebar + appendix). Pick the one with the richest data
        # (more skills/talents/traits/weapons text).
        slug = npc["slug"]
        if seen_slugs[slug]:
            prev = next(n for n in npcs if n["slug"] == slug)
            def richness(n):
                return (len(n["skills"]) + len(n["talents"]) + len(n["traits"])
                        + (1 if n["weapons_text"] else 0)
                        + (1 if n["armour_text"] else 0))
            if richness(npc) > richness(prev):
                npcs[npcs.index(prev)] = npc
            continue
        seen_slugs[slug] += 1
        npcs.append(npc)

    return book_slug(pdf_dir.name), npcs


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    per_book = defaultdict(list)
    grand_total = 0
    for pdf_dir in sorted(SRC_ROOT.iterdir()):
        if not pdf_dir.is_dir():
            continue
        slug, npcs = extract_book(pdf_dir)
        if slug is None:
            continue
        n = len(npcs)
        print(f"{n:>4}  {pdf_dir.name}  -> {slug}-npcs", flush=True)
        if n:
            # Tag each NPC with its source book for downstream pipelines
            for npc in npcs:
                npc["source_book"] = pdf_dir.name
            per_book[slug].extend(npcs)
            grand_total += n

    print(f"\nTotal: {grand_total} NPCs across {len(per_book)} books")
    for slug, npcs in sorted(per_book.items(), key=lambda x: -len(x[1])):
        out = OUT_DIR / f"{slug}.json"
        out.write_text(json.dumps(npcs, indent=2, ensure_ascii=False))
        print(f"  {len(npcs):>4} -> {out}")


if __name__ == "__main__":
    main()
