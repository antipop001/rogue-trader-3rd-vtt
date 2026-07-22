#!/usr/bin/env python3
"""Recover 'plain-trained' NPC skills (statblock-listed with no bonus) that the
original extraction flattened to advance:0 = untrained.

Re-parses each RT-DOCS book's stat blocks with the FIXED parse_skills (which now
emits the 0..3 index scale, listed-but-unbonused => 1), maps skill names -> pack
keys via SKILL_MAP, matches each pack NPC by (book, name), and RAISES the pack
skill advance to the source value where the source lists it. Only ever raises
0 -> {1,2,3}; logs (does not silently change) any pack>0 that disagrees.

--write to apply; default is a dry-run report.
"""
import sys, re, glob, argparse
from pathlib import Path
from collections import defaultdict

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

import extract_all_npcs as ex          # fixed parse_skills (index scale)
from build_npc_yaml import SKILL_MAP    # display-name -> pack skill key

SRC_ROOT = Path("/mnt/project_data/RT/RT-DOCS")


def norm(name):
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def loose(name):
    """Alphanumeric-only key — absorbs OCR punctuation drift (stray quotes, daggers)."""
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def recovered_by_book():
    """book_slug -> { name_key -> { skill_key -> best_index } }, keyed by BOTH the
    normalized name and the loose (alphanumeric-only) name for drift-tolerant matching."""
    out = defaultdict(lambda: defaultdict(dict))
    for pdf_dir in sorted(SRC_ROOT.glob("*.pdf")):
        slug, npcs = ex.extract_book(pdf_dir)
        if not npcs:
            continue
        for npc in npcs:
            skmap = {}
            for sname, adv in npc.get("skills", []):
                base = re.sub(r"\s*\(.*?\)\s*$", "", sname).strip()
                key = SKILL_MAP.get(base)
                if not key:
                    continue
                if adv > skmap.get(key, 0):
                    skmap[key] = adv
            if not skmap:
                continue
            for k in {norm(npc["name"]), loose(npc["name"])}:
                # merge (max) in case two source names collapse to the same key
                dst = out[slug][k]
                for sk, v in skmap.items():
                    if v > dst.get(sk, 0):
                        dst[sk] = v
    return out


# ---- minimal doc-structured YAML rewriter (line level, preserves formatting) ----
def process_pack(path, book_recovered, stats):
    text = Path(path).read_text()
    docs = text.split("\n---\n")
    changed = 0
    for di, doc in enumerate(docs):
        lines = doc.split("\n")
        # NPC name (top-level `name:` — first match at 0 indent)
        name = None
        for l in lines:
            m = re.match(r"^name:\s*(.+?)\s*$", l)
            if m:
                name = m.group(1).strip().strip("'\"")
                break
        if name is None:
            continue
        rec = book_recovered.get(norm(name)) or book_recovered.get(loose(name))
        if not rec:
            if re.search(r"^type: npc$", doc, re.M):
                stats["unmatched"].append(f"{Path(path).name} :: {name}")
            continue
        stats["matched"] += 1
        # locate skills section and rewrite advances
        in_skills = False
        cur_key = None
        for i, l in enumerate(lines):
            m2 = re.match(r"^  ([A-Za-z]+):\s*$", l)
            if m2:
                in_skills = (m2.group(1) == "skills")
                cur_key = None
                continue
            if not in_skills:
                continue
            mk = re.match(r"^    ([A-Za-z]+):\s*$", l)
            if mk:
                cur_key = mk.group(1)
                continue
            ma = re.match(r"^(      )advance:\s*(-?\d+)\s*$", l)
            if ma and cur_key and cur_key in rec:
                cur = int(ma.group(2))
                want = rec[cur_key]
                if cur == 0 and want >= 1:
                    lines[i] = f"{ma.group(1)}advance: {want}"
                    changed += 1
                    stats["recovered"] += 1
                elif cur > 0 and want != cur:
                    stats["discrepancy"].append(
                        f"{Path(path).name} :: {name} :: {cur_key} pack={cur} source={want}")
        docs[di] = "\n".join(lines)
    if changed and stats["write"]:
        Path(path).write_text("\n---\n".join(docs))
    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    print("Re-parsing source books ...", flush=True)
    rec = recovered_by_book()
    print(f"  books with NPCs: {len(rec)}")

    stats = {"matched": 0, "recovered": 0, "unmatched": [], "discrepancy": [], "write": args.write}
    pack_files = sorted(glob.glob(str(ROOT / "src/packs/*-npcs/*.yml")) +
                        glob.glob(str(ROOT / "src/packs/npcs/npcs.yml")))
    per_file = {}
    for pf in pack_files:
        slug = Path(pf).stem.replace("-npcs", "")
        book_rec = rec.get(slug)
        if book_rec is None and slug == "npcs":
            book_rec = rec.get("corebook", {})   # base pack sources from corebook
        if book_rec is None:
            # try any book whose slug is a prefix/suffix match
            cand = [k for k in rec if k in slug or slug in k]
            book_rec = rec.get(cand[0], {}) if cand else {}
            if not cand:
                print(f"  NO SOURCE BOOK for pack {Path(pf).name} (slug={slug})")
        n = process_pack(pf, book_rec, stats)
        per_file[Path(pf).name] = n

    print(f"\n{'WROTE' if args.write else 'DRY-RUN'} — recoveries per file:")
    for f, n in per_file.items():
        if n:
            print(f"  {n:4d}  {f}")
    print(f"\nNPCs matched to source: {stats['matched']}")
    print(f"Plain-trained skills recovered (0 -> >=1): {stats['recovered']}")
    print(f"Unmatched NPC docs (no source skills applied): {len(stats['unmatched'])}")
    for u in stats["unmatched"][:25]:
        print(f"    - {u}")
    if len(stats["unmatched"]) > 25:
        print(f"    ... and {len(stats['unmatched'])-25} more")
    print(f"\nDiscrepancies (pack>0 disagrees with source, LEFT UNCHANGED): {len(stats['discrepancy'])}")
    for d in stats["discrepancy"][:25]:
        print(f"    - {d}")
    if len(stats["discrepancy"]) > 25:
        print(f"    ... and {len(stats['discrepancy'])-25} more")


if __name__ == "__main__":
    main()
