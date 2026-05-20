#!/usr/bin/env python3
"""
Assemble Foundry NPC Actor YAML from /tmp/npcs_parsed.json.

v2: resolves talent/trait names against the existing compendium YAML packs
(copies full benefit/description/source), and parses raw weapons/armour text
into structured weapon/armour items.
"""

import json
import re
import secrets
from pathlib import Path

REPO = Path("/home/ahermon/rogue-trader-3rd-vtt")
OUT = REPO / "src/packs/npcs/npcs.yml"
IN = Path("/tmp/npcs_parsed.json")
PACKS = REPO / "src/packs"

SKILL_MAP = {
    "Acrobatics": "acrobatics", "Athletics": "athletics", "Awareness": "awareness",
    "Barter": "commerce", "Charm": "charm", "Climb": "athletics",
    "Command": "command", "Commerce": "commerce", "Common Lore": "commonLore",
    "Concealment": "stealth", "Deceive": "deceive", "Demolitions": "demolitions",
    "Dodge": "dodge", "Forbidden Lore": "forbiddenLore", "Intimidate": "intimidate",
    "Linguistics": "linguistics", "Medicae": "medicae", "Navigate": "navigate",
    "Navigation": "navigate", "Operate": "operate", "Parry": "parry",
    "Pilot": "operate", "Psyniscience": "psyniscience",
    "Scholastic Lore": "scholasticLore", "Scrutiny": "scrutiny",
    "Search": "awareness", "Security": "security", "Silent Move": "stealth",
    "Speak Language": "linguistics", "Stealth": "stealth", "Survival": "survival",
    "Tech-Use": "techUse", "Tracking": "survival", "Trade": "trade",
}

CHAR_KEYS = ["weaponSkill", "ballisticSkill", "strength", "toughness",
             "agility", "intelligence", "perception", "willpower", "fellowship"]

# RT Size trait → Foundry token (width_squares, height_squares, art_scale).
# Source: rogue-trader-3rd-vtt/size.md (Quick Mapping Table). Map scale is
# 1 square = 1 metre (RT Core p.236). Hulking occupies 1×1 but gets a 1.2×
# art scale for visual differentiation from baseline Average.
SIZE_MAP = {
    "miniscule":  (0.5, 0.5, 1.0),
    "puny":       (0.5, 0.5, 1.0),
    "scrawny":    (1, 1, 1.0),
    "average":    (1, 1, 1.0),
    "hulking":    (1, 1, 1.2),
    "enormous":   (2, 2, 1.0),
    "massive":    (3, 3, 1.0),
    "immense":    (4, 4, 1.0),
    "monumental": (6, 6, 1.0),
    "titanic":    (8, 8, 1.0),
    # Non-standard but appear in stat blocks:
    "varies":     (1, 1, 1.0),  # GM's call — default to human-size
    "swarm":      (1, 1, 1.0),  # RT swarm trait — fills 1 square
}


def size_from_traits(traits):
    """Scan an NPC's traits list for `Size (Foo)` and return (w, h, scale).
    Default to (1, 1, 1.0) — Average / Medium — if no Size trait found."""
    for t in traits or []:
        m = re.search(r"size\s*\(\s*([A-Za-z]+)\s*\)", t, flags=re.IGNORECASE)
        if m:
            key = m.group(1).lower()
            if key in SIZE_MAP:
                return SIZE_MAP[key]
    return (1, 1, 1.0)

# RT damage-type abbreviations.
DAMAGE_TYPE = {"R": "Rending", "I": "Impact", "E": "Energy", "X": "Explosive"}

# Weapon special qualities — keyword → schema field.
SPECIAL_KEYWORDS = {
    "accurate": "accurate", "balanced": "balanced", "blast": "blast",
    "concussive": "concussive", "defensive": "defensive", "felling": "felling",
    "flame": "flame", "flexible": "flexible", "force": "force",
    "graviton": "graviton", "hallucinogenic": "hallucinogenic", "haywire": "haywire",
    "inaccurate": "inaccurate", "indirect": "indirect", "overheats": "overheats",
    "powerField": "powerField", "primitive": "primitive", "proven": "proven",
    "razorSharp": "razorSharp", "recharge": "recharge", "reliable": "reliable",
    "sanctified": "sanctified", "scatter": "scatter", "shocking": "shocking",
    "smoke": "smoke", "snare": "snare", "spray": "spray", "storm": "storm",
    "tearing": "tearing", "toxic": "toxic", "twin-Linked": "twinLinked",
    "twinLinked": "twinLinked", "unbalanced": "unbalanced", "unreliable": "unreliable",
    "unstable": "unstable", "warpWeapon": "warpWeapon",
}


_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"


def fid():
    """Foundry-style randomID — 16 chars from mixed-case alphanumeric."""
    return "".join(secrets.choice(_ID_ALPHABET) for _ in range(16))


def _wrap_item(item):
    """Add the standard Foundry document fields embedded items normally carry."""
    item.setdefault("effects", [])
    item.setdefault("flags", {})
    item.setdefault("sort", 0)
    item.setdefault("ownership", {"default": 3})
    return item


def norm_name(s):
    """Lowercase, strip daggers, strip everything after first '(', collapse whitespace."""
    s = s.replace("†", "").replace("††", "").strip()
    s = re.sub(r"\s*\(.*", "", s)
    return re.sub(r"\s+", " ", s.lower()).strip()


def split_top_commas(s):
    """Split on commas at depth=0 in (...)/[...]."""
    out, cur, depth = [], "", 0
    for ch in s:
        if ch in "([":
            depth += 1
            cur += ch
        elif ch in ")]":
            depth -= 1
            cur += ch
        elif ch == "," and depth == 0:
            out.append(cur.strip()); cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


def load_pack_yaml(name):
    """Load src/packs/<name>/<name>.yml as a list of dicts."""
    import yaml
    path = PACKS / name / f"{name}.yml"
    if not path.exists():
        return []
    return [d for d in yaml.safe_load_all(path.read_text()) if d]


def index_by_name(docs):
    """Map norm_name(doc['name']) → doc."""
    out = {}
    for d in docs:
        if d and "name" in d:
            out[norm_name(d["name"])] = d
    return out


def to_item_stub(doc, _type, default_img):
    """Convert a compendium pack doc to an embedded actor item document."""
    # Pack docs use `data` (legacy NeDB); Foundry actor items want `system`.
    sys_data = doc.get("data", doc.get("system", {})) or {}
    return {
        "_id": fid(),
        "name": doc["name"],
        "type": _type,
        "img": doc.get("img", default_img),
        "system": sys_data,
    }


TRAIT_ALIASES = {
    # Stat-block name → compendium name
    "unnatural agility": "Unnatural Characteristic",
    "unnatural strength": "Unnatural Characteristic",
    "unnatural toughness": "Unnatural Characteristic",
    "unnatural perception": "Unnatural Characteristic",
    "unnatural willpower": "Unnatural Characteristic",
    "unnatural intelligence": "Unnatural Characteristic",
    "unnatural fellowship": "Unnatural Characteristic",
    "unnatural weapon skill": "Unnatural Characteristic",
    "unnatural ballistic skill": "Unnatural Characteristic",
}
TALENT_ALIASES = {
    "furious attack": "Furious Assault",
}


def resolve_or_stub(name, index, _type, default_img):
    """Lookup name in index, with type-specific aliases; else build minimal stub.

    The display name on the returned item always preserves the stat-block name
    (e.g. "Unnatural Agility (x2)") so the player sees the specific variant —
    but the system data is copied from the generic compendium entry so the sheet
    can show the rule text.
    """
    key = norm_name(name)
    display_name = name.replace("†", "").strip()

    # Try direct hit first.
    doc = index.get(key)
    if doc is None:
        alias_table = TRAIT_ALIASES if _type == "trait" else (TALENT_ALIASES if _type == "talent" else {})
        if key in alias_table:
            doc = index.get(norm_name(alias_table[key]))

    if doc:
        stub = to_item_stub(doc, _type, default_img)
        stub["name"] = display_name  # keep the stat-block-specific name
        return stub, True

    return {
        "_id": fid(),
        "name": display_name,
        "type": _type,
        "img": default_img,
        "system": {},
    }, False


def _weapon_defaults():
    """All schema-required fields for a weapon item under v14 strict validation.
    Templates inherited: physicalItem, itemDescription, damage, attack, action,
    backpack. Missing fields cause silent doc rejection during compendium load.
    NOTE: `range` and `penetration` are declared as strings (`""`) in template.json
    even though they hold numeric values — embedded item validation rejects ints here.
    """
    return {
        # physicalItem
        "availability": "Common", "craftsmanship": "Common", "weight": 0,
        "equipped": True, "inBackpack": False,
        # itemDescription
        "description": "", "source": "",
        # damage
        "damage": "", "damageType": "", "penetration": "", "special": {},
        # attack
        "range": "", "attackType": "", "attackBonus": 0,
        "rateOfFire": {"single": 1, "burst": 0, "full": 0},
        # action
        "target": "", "effect": "",
        # backpack
        "backpack": {"inBackpack": False},
        # weapon-specific
        "class": "", "type": "", "reload": "",
        "clip": {"max": 0, "value": 0}, "modifications": [],
    }


def _armour_defaults():
    """Schema-required fields for an armour item."""
    return {
        # physicalItem
        "availability": "Common", "craftsmanship": "Common", "weight": 0,
        "equipped": True, "inBackpack": False,
        # itemDescription
        "description": "", "source": "",
        # backpack
        "backpack": {"inBackpack": False},
        # armourPoints
        "type": "", "armourPoints": {"head": 0, "body": 0, "leftArm": 0, "rightArm": 0, "leftLeg": 0, "rightLeg": 0},
        # armour-specific
        "maxAgility": 0, "protectionRating": 0, "overloadOn": 0,
    }


def parse_weapon_spec(name, spec):
    """
    Parse a stat-block weapon spec like:
      "60m; S/3/10; 1d10+4 R; Pen 6; Clip 100; Reload 2Full; Reliable"
      "1d10+9 R; Pen 2 Tearing"
      "(1d10+3 R, Tearing, Toxic, Warp Weapon)" (Ebon Geist style — comma-separated)
    Returns a partial weapon system dict.
    """
    sys = _weapon_defaults()
    sys["source"] = "Rogue Trader Core Rulebook, Ch. XIV"
    if not spec:
        return sys

    # Some specs use commas instead of semicolons (Ebon Geist). Normalize to ";".
    if ";" not in spec and "," in spec:
        spec = spec.replace(",", ";")

    parts = [p.strip() for p in spec.split(";")]
    for p in parts:
        # Range: e.g. "60m" or "30m" — schema says string
        if re.match(r"^\d+\s*m$", p):
            sys["range"] = str(int(re.match(r"^(\d+)", p).group(1)))
            continue
        # Rate of fire: "S/3/10" or "S/-/-" or "S/--/--"
        m = re.match(r"^(S|—|-+)\s*/\s*(\d+|—|-+)\s*/\s*(\d+|—|-+)$", p)
        if m:
            def n(v): return int(v) if v.isdigit() else 0
            sys["rateOfFire"]["single"] = 1 if m.group(1).upper() == "S" else 0
            sys["rateOfFire"]["burst"] = n(m.group(2))
            sys["rateOfFire"]["full"] = n(m.group(3))
            continue
        # Damage: "1d10+9 R" or "1d10 R" or "1d5+6 R"
        m = re.match(r"^(\d+d\d+(?:[+\-]\d+)?)\s+([REIX])\b", p)
        if m:
            sys["damage"] = m.group(1)
            sys["damageType"] = DAMAGE_TYPE.get(m.group(2), "")
            continue
        # Penetration: "Pen 2" maybe with trailing keyword "Pen 2 Tearing" — schema string
        m = re.match(r"^Pen\s+(\d+)(.*)$", p, re.IGNORECASE)
        if m:
            sys["penetration"] = m.group(1)
            tail = m.group(2).strip()
            if tail:
                _apply_special_keywords(sys, tail)
            continue
        # Clip
        m = re.match(r"^Clip\s+(\d+)", p, re.IGNORECASE)
        if m:
            sys["clip"]["max"] = int(m.group(1))
            sys["clip"]["value"] = sys["clip"]["max"]
            continue
        # Reload
        m = re.match(r"^Reload\s+(.+)$", p, re.IGNORECASE)
        if m:
            sys["reload"] = m.group(1).strip()
            continue
        # Otherwise treat as a special-quality keyword (or several).
        _apply_special_keywords(sys, p)

    # Heuristic class: if range > 0 → ranged class (Basic by default); else Melee.
    if sys["class"] == "":
        try:
            r = int(sys["range"]) if sys["range"] else 0
        except (TypeError, ValueError):
            r = 0
        sys["class"] = "Basic" if r > 0 else "Melee"
    return sys


def _apply_special_keywords(sys, text):
    """Apply any RT special-quality keywords in `text` to sys['special']."""
    # Split further on commas/spaces; each chunk may be like "Tearing" or "Balanced" or "Blast(3)".
    for chunk in re.split(r"[,]+", text):
        chunk = chunk.strip()
        if not chunk:
            continue
        # "Blast (3)" or "Blast(3)" → blast=3
        m = re.match(r"^([A-Za-z\-]+)\s*\((\d+)\)", chunk)
        if m:
            kw = m.group(1).strip().lower()
            for key, field in SPECIAL_KEYWORDS.items():
                if kw == key.lower() or kw == field.lower():
                    sys["special"][field] = int(m.group(2))
                    break
            continue
        kw = chunk.strip().lower()
        for key, field in SPECIAL_KEYWORDS.items():
            if kw == key.lower() or kw == field.lower():
                sys["special"][field] = True
                break


def parse_weapons_text(text, weapon_index):
    """
    Parse the raw 'Weapons:' line into a list of weapon items.
    For each comma-split entry: "Chain axe (1d10+9 R; Pen 2 Tearing)"
      name = "Chain axe", spec = "1d10+9 R; Pen 2 Tearing"
    Try compendium lookup first; if no match, build a custom inline weapon from the spec.
    Pure gear/quantity items like "1d5 frag grenades" → skipped (handled as gear).
    """
    items = []
    for entry in split_top_commas(text):
        entry = entry.rstrip(".").strip()
        if not entry:
            continue
        # Pull "(<spec>)" tail if present.
        m = re.match(r"^(.*?)\s*\(([^)]*)\)\s*$", entry, re.DOTALL)
        name = m.group(1).strip() if m else entry
        spec = m.group(2).strip() if m else ""
        # Strip leading quantity like "2 plasma grenades", "4 blind grenades", "1d5 frag grenades"
        name = re.sub(r"^(\d+d?\d*)\s+", "", name).strip()
        name = re.sub(r"^(\d+)\s+", "", name).strip()
        if not name:
            continue
        # Strip dagger footnote markers and pluralization "grenades" → "grenade" for lookup
        clean = name.replace("†", "").strip()
        clean_lc = clean.lower()
        # Build candidate lookup keys: original, depluralized, leading-qualifier stripped.
        QUALIFIERS = ["xeno-crafted ", "xenos-crafted ", "xeno ", "looted ", "ork "]
        candidates = [clean_lc, re.sub(r"s$", "", clean_lc)]
        for q in QUALIFIERS:
            if clean_lc.startswith(q):
                candidates.append(clean_lc[len(q):])
                candidates.append(f"{q.strip()} {clean_lc[len(q):]}")  # e.g. "ork shoota"
        # Hard aliases for corebook spellings that don't follow a pattern.
        WEAPON_ALIASES = {"shoots": "ork shoota", "shoota": "ork shoota"}
        if clean_lc in WEAPON_ALIASES:
            candidates.insert(0, WEAPON_ALIASES[clean_lc])
        if re.sub(r"s$", "", clean_lc) in WEAPON_ALIASES:
            candidates.insert(0, WEAPON_ALIASES[re.sub(r"s$", "", clean_lc)])
        found = None
        for k in candidates:
            if k in weapon_index:
                found = weapon_index[k]
                break
        if found:
            it = to_item_stub(found, "weapon", "systems/rogue-trader-3rd/icons/items/buckets/melee-chain-axe.png")
            # Merge defaults under existing data so Foundry's strict template validation passes.
            merged = _weapon_defaults()
            merged.update(it["system"] or {})
            merged["equipped"] = True
            # Coerce ints → strings for schema-declared string fields (compendium legacy).
            if isinstance(merged.get("range"), int):
                merged["range"] = str(merged["range"])
            if isinstance(merged.get("penetration"), int):
                merged["penetration"] = str(merged["penetration"])
            it["system"] = merged
            items.append(it)
        else:
            sys = parse_weapon_spec(clean, spec)
            items.append({
                "_id": fid(),
                "name": clean.title() if clean.islower() else clean,
                "type": "weapon",
                "img": "systems/rogue-trader-3rd/icons/items/buckets/melee-chain-axe.png",
                "system": sys,
            })
    return items


def parse_armour_text(text):
    """
    Parse e.g. 'Xeno mesh void armour (Body 5, Head 5, Arms 4, Legs 4).'
    Returns a list with a single armour item (or empty list if text is unparseable).
    """
    if not text or not text.strip():
        return []
    text = text.rstrip(".").strip()
    m = re.match(r"^(.*?)\s*\(([^)]*)\)\s*$", text)
    if not m:
        return []
    name = m.group(1).strip()
    points_text = m.group(2)
    ap = {"body": 0, "head": 0, "leftArm": 0, "rightArm": 0, "leftLeg": 0, "rightLeg": 0}
    for piece in [p.strip() for p in points_text.split(",")]:
        m2 = re.match(r"^(Body|Head|Arms|Legs|Primitive)\s+(\d+)", piece, re.IGNORECASE)
        if not m2:
            continue
        loc, val = m2.group(1).lower(), int(m2.group(2))
        if loc == "body":
            ap["body"] = val
        elif loc == "head":
            ap["head"] = val
        elif loc == "arms":
            ap["leftArm"] = ap["rightArm"] = val
        elif loc == "legs":
            ap["leftLeg"] = ap["rightLeg"] = val
    sys = _armour_defaults()
    sys.update({
        "armourPoints": ap,
        "source": "Rogue Trader Core Rulebook, Ch. XIV",
        "type": "Other",
        "equipped": True,
    })
    return [{
        "_id": fid(),
        "name": name,
        "type": "armour",
        "img": "systems/rogue-trader-3rd/icons/items/buckets/armour-primitive.png",
        "system": sys,
    }]


def build_actor(npc, talent_idx, trait_idx, weapon_idx, book_slug=None):
    # Per-book namespacing avoids slug collisions across books (e.g. two
    # distinct "Ork Freebooter" entries from different supplements). Only set
    # `img` if the file actually exists locally — otherwise Foundry will 404
    # on the asset; leaving the field blank causes it to fall back to the
    # default mystery-man icon instead.
    rel_path = (f"images/npcs/{book_slug}/{npc['slug']}.png"
                if book_slug else
                f"images/npcs/{npc['slug']}.png")
    abs_local = Path(__file__).resolve().parent.parent.parent / "src" / rel_path
    img_path = f"systems/rogue-trader-3rd/{rel_path}" if abs_local.is_file() else ""

    chars = {k: {"base": npc["characteristics"][k]["base"],
                 "unnatural": npc["characteristics"][k]["unnatural"]} for k in CHAR_KEYS}

    skills = {}
    for sname, adv in npc["skills"]:
        base = re.sub(r"\s*\(.*?\)\s*$", "", sname).strip()
        key = SKILL_MAP.get(base)
        if key and adv >= skills.get(key, {}).get("advance", 0):
            skills[key] = {"advance": adv}

    items = []
    talent_default_img = "systems/rogue-trader-3rd/icons/talents/blue/b_18.png"
    trait_default_img = "systems/rogue-trader-3rd/icons/talents/blue/b_18.png"

    talent_miss = []
    trait_miss = []
    for t in npc["talents"]:
        it, hit = resolve_or_stub(t, talent_idx, "talent", talent_default_img)
        items.append(_wrap_item(it))
        if not hit:
            talent_miss.append(t)
    for t in npc["traits"]:
        it, hit = resolve_or_stub(t, trait_idx, "trait", trait_default_img)
        items.append(_wrap_item(it))
        if not hit:
            trait_miss.append(t)

    for it in parse_weapons_text(npc["weapons_text"], weapon_idx):
        items.append(_wrap_item(it))
    for it in parse_armour_text(npc["armour_text"]):
        items.append(_wrap_item(it))

    tok_w, tok_h, tok_scale = size_from_traits(npc.get("traits"))
    return {
        "name": npc["name"],
        "type": "npc",
        "img": img_path,
        "prototypeToken": {
            "name": npc["name"], "actorLink": False,
            "texture": {"src": img_path, "scaleX": tok_scale, "scaleY": tok_scale},
            "width": tok_w, "height": tok_h, "disposition": -1,
        },
        "system": {
            "wounds": {"max": npc["wounds"], "value": npc["wounds"], "critical": 0, "rolled": True},
            "characteristics": chars,
            "skills": skills,
            "npc": {"faction": npc["faction"], "subfaction": "", "type": "troop", "threatLevel": 0},
        },
        "items": items, "effects": [],
        "flags": {"rt": {
            "description": npc["description"], "movement": npc["movement"],
            "rawGear": npc["gear_text"], "source": "Rogue Trader Core Rulebook, Ch. XIV",
        }},
    }, talent_miss, trait_miss


def yaml_dump(docs):
    import yaml
    yaml.SafeDumper.add_representer(
        type(None), lambda d, _: d.represent_scalar("tag:yaml.org,2002:null", "")
    )
    parts = [yaml.safe_dump(d, allow_unicode=True, sort_keys=True, default_flow_style=False, width=120) for d in docs]
    return "---\n" + "---\n".join(parts)


def main():
    talent_idx = index_by_name(load_pack_yaml("talents"))
    trait_idx = index_by_name(load_pack_yaml("traits"))
    weapon_idx = index_by_name(load_pack_yaml("weapons"))
    print(f"Indexed: {len(talent_idx)} talents, {len(trait_idx)} traits, {len(weapon_idx)} weapons")

    npcs = json.loads(IN.read_text())
    actors = []
    for n in npcs:
        a, tmiss, trmiss = build_actor(n, talent_idx, trait_idx, weapon_idx)
        actors.append(a)
        wcount = sum(1 for i in a["items"] if i["type"] == "weapon")
        acount = sum(1 for i in a["items"] if i["type"] == "armour")
        print(f"  {n['name']}: {sum(1 for i in a['items'] if i['type']=='talent')} talents, "
              f"{sum(1 for i in a['items'] if i['type']=='trait')} traits, "
              f"{wcount} weapons, {acount} armour")
        if tmiss:
            print(f"    UNRESOLVED talents: {tmiss}")
        if trmiss:
            print(f"    UNRESOLVED traits:  {trmiss}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(yaml_dump(actors))
    print(f"Wrote {len(actors)} NPC actor docs to {OUT}")


if __name__ == "__main__":
    main()
