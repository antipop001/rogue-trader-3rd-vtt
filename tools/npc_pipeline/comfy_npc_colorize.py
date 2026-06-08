#!/usr/bin/env python3
"""
Reference-cleanup portrait pipeline.

For each NPC whose canonical reference has been VERIFIED as a real match
(/tmp/npc_verified/<book>.json with verdict in {GOOD, UNCLEAR}):
  1. Upload the reference image to whisperx's ~/comfyui/input/rt_npc_refs/<book>/
  2. Run a LOW-DENOISE (~0.18) img2img through ComfyUI to smooth out
     page-text bleed on the edges, clean up JPEG artifacts, and bump
     resolution to 832x1216 portrait aspect.
  3. Save to src/images/npcs/<book>/<slug>.png.

The reference is doing 95% of the work — the model just polishes.
No faction LoRAs (they bias the result away from canon). Only Oldhammer
at low weight to nudge style consistency.

Skips:
  - WRONG verdicts (drop the bad ref entirely)
  - NPCs with no reference at all
  - Outputs that already exist (idempotent)
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path("/home/ahermon/rogue-trader-3rd-vtt")
VERIFIED_DIR = Path("/tmp/npc_verified")
EXTRACTED_DIR = REPO / "tools/npc_pipeline/extracted"
OUT_ROOT = REPO / "src/images/npcs"

API = "http://192.168.11.22:8188"
WHISPERX_INPUT_DIR = "/home/ahermon/comfyui/input/rt_npc_refs"
SSH_HOST = "ahermon@192.168.11.22"

BASE_CKPT = "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"
OLDHAMMER_STRENGTH = 0.30  # very light — reference does the work

DENOISE = 0.18  # low: preserve canonical composition + colors


POSITIVE = (
    "warhammer 40k character art, oil painting, FFG illustration, "
    "vibrant colors, clean composition, sharp focus, no text, no border, "
    "high quality painted detail"
)
NEGATIVE = (
    "text, page text, book text, watermark, signature, border, frame, "
    "blurry, low quality, jpeg artifacts, compression artifacts, "
    "duplicate, mutation, deformed"
)


# === Comfy workflow =========================================================

def slug_seed(slug):
    """Stable seed per slug so two NPCs sharing a reference still produce
    distinct comfy prompt_ids (otherwise comfy dedupes the second request)."""
    return abs(hash(slug)) % (2**31)


def build_workflow(ref_subpath, seed=42):
    g = {}
    g["ckpt"] = {"class_type": "CheckpointLoaderSimple",
                 "inputs": {"ckpt_name": BASE_CKPT}}
    g["lora_old"] = {"class_type": "LoraLoader",
                     "inputs": {"lora_name": "Oldhammer.safetensors",
                                "strength_model": OLDHAMMER_STRENGTH,
                                "strength_clip": OLDHAMMER_STRENGTH,
                                "model": ["ckpt", 0], "clip": ["ckpt", 1]}}
    g["pos"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": POSITIVE, "clip": ["lora_old", 1]}}
    g["neg"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": NEGATIVE, "clip": ["lora_old", 1]}}
    g["ref"] = {"class_type": "LoadImage", "inputs": {"image": ref_subpath}}
    g["scale"] = {"class_type": "ImageScale",
                  "inputs": {"image": ["ref", 0], "upscale_method": "lanczos",
                             "width": 832, "height": 1216, "crop": "center"}}
    g["enc"] = {"class_type": "VAEEncode",
                "inputs": {"pixels": ["scale", 0], "vae": ["ckpt", 2]}}
    g["ks"] = {"class_type": "KSampler",
               "inputs": {"seed": seed, "steps": 24, "cfg": 5.0,
                          "sampler_name": "dpmpp_2m", "scheduler": "karras",
                          "denoise": DENOISE,
                          "model": ["lora_old", 0],
                          "positive": ["pos", 0], "negative": ["neg", 0],
                          "latent_image": ["enc", 0]}}
    g["vae"] = {"class_type": "VAEDecode",
                "inputs": {"samples": ["ks", 0], "vae": ["ckpt", 2]}}
    g["save"] = {"class_type": "SaveImage",
                 "inputs": {"images": ["vae", 0], "filename_prefix": "npc_colorize"}}
    return g


def submit(graph):
    body = json.dumps({"prompt": graph}).encode()
    req = urllib.request.Request(f"{API}/prompt", data=body,
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def wait_for(prompt_id, timeout=600):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = urllib.request.urlopen(f"{API}/history/{prompt_id}", timeout=15).read()
            data = json.loads(r)
            if prompt_id in data:
                entry = data[prompt_id]
                s = entry.get("status", {}).get("status_str")
                if s in ("success", "error"):
                    return entry
        except Exception as e:
            print(f"    poll err: {e}", flush=True)
        time.sleep(3)
    raise TimeoutError("comfy generation timed out")


def fetch(filename, subfolder, type_):
    params = urllib.parse.urlencode({"filename": filename,
                                     "subfolder": subfolder, "type": type_})
    return urllib.request.urlopen(f"{API}/view?{params}", timeout=60).read()


# === Upload helpers =========================================================

def stage_and_upload(work):
    """Upload all referenced source images to whisperx, grouped by book.

    `work` is list of dicts {book, slug, ref_local, ref_filename}.
    """
    by_book = {}
    for w in work:
        by_book.setdefault(w["book"], []).append((w["ref_local"], w["ref_filename"]))
    print(f"Uploading {sum(len(v) for v in by_book.values())} reference images "
          f"across {len(by_book)} books", flush=True)
    for book, files in by_book.items():
        tmp = Path(f"/tmp/npc_refs_clean_{book}")
        if tmp.exists():
            shutil.rmtree(tmp)
        tmp.mkdir()
        for local, fname in files:
            shutil.copy(local, tmp / fname)
        subprocess.run(["ssh", SSH_HOST,
                        f"mkdir -p {WHISPERX_INPUT_DIR}/{book}"], check=True)
        subprocess.run(["rsync", "-a",
                        f"{tmp}/", f"{SSH_HOST}:{WHISPERX_INPUT_DIR}/{book}/"],
                       check=True)
        print(f"  {book}: {len(files)} files", flush=True)


# === Main ==================================================================

def find_local_ref(book_pdf_dir: Path, ref_filename: str):
    pages = book_pdf_dir / "pages"
    if not pages.is_dir():
        return None
    for p in pages.iterdir():
        candidate = p / ref_filename
        if candidate.is_file():
            return candidate
    return None


def build_work_list(accept_unclear=True):
    """Return list of work items: dict per NPC to be processed."""
    work = []
    skipped = {"wrong": 0, "no_ref": 0, "no_local": 0}

    # Index extracted NPCs by (book, slug) for source_book lookup
    npc_index = {}
    for jf in EXTRACTED_DIR.glob("*.json"):
        book = jf.stem
        for n in json.loads(jf.read_text()):
            npc_index[(book, n["slug"])] = n

    for vf in sorted(VERIFIED_DIR.glob("*.json")):
        book = vf.stem
        records = json.loads(vf.read_text())
        for rec in records:
            verdict = rec.get("verdict")
            if verdict == "WRONG":
                skipped["wrong"] += 1
                continue
            if verdict == "UNCLEAR" and not accept_unclear:
                continue
            slug = rec["slug"]
            ref_filename = Path(rec["reference"]).name  # img-N.jpeg
            npc = npc_index.get((book, slug))
            if not npc:
                continue
            book_pdf_dir = Path("/mnt/project_data/RT/RT-DOCS") / npc["source_book"]
            local = find_local_ref(book_pdf_dir, ref_filename)
            if not local:
                skipped["no_local"] += 1
                continue
            work.append({
                "book": book,
                "slug": slug,
                "name": npc["name"],
                "ref_local": str(local),
                "ref_filename": ref_filename,
            })
    return work, skipped


def run_one(item):
    out_dir = OUT_ROOT / item["book"]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{item['slug']}.png"
    if out_path.exists():
        return "skip"
    ref_subpath = f"rt_npc_refs/{item['book']}/{item['ref_filename']}"
    g = build_workflow(ref_subpath, seed=slug_seed(item['slug']))
    print(f"  [{item['book']}/{item['slug']}] {item['name']}", flush=True)
    try:
        res = submit(g)
        pid = res["prompt_id"]
        entry = wait_for(pid)
        if entry.get("status", {}).get("status_str") != "success":
            print(f"    FAILED: {entry.get('status')}", flush=True)
            return "error"
        outs = entry["outputs"].get("save", {}).get("images", [])
        if not outs:
            return "error"
        info = outs[0]
        data = fetch(info["filename"], info.get("subfolder", ""),
                     info.get("type", "output"))
        out_path.write_bytes(data)
        return "ok"
    except Exception as e:
        print(f"    EXCEPTION: {e}", flush=True)
        return "error"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--upload", action="store_true",
                    help="upload reference images to whisperx first")
    ap.add_argument("--good-only", action="store_true",
                    help="skip UNCLEAR refs (only process GOOD)")
    ap.add_argument("--dry-run", action="store_true",
                    help="print plan, don't run comfy")
    args = ap.parse_args()

    work, skipped = build_work_list(accept_unclear=not args.good_only)
    print(f"Plan: {len(work)} NPCs to colorize "
          f"(skipped {skipped['wrong']} WRONG, {skipped['no_local']} no local ref)",
          flush=True)

    if args.dry_run:
        for w in work[:20]:
            print(f"  {w['book']}/{w['slug']}  <- {w['ref_filename']}")
        if len(work) > 20:
            print(f"  ... and {len(work)-20} more")
        return

    if args.upload:
        stage_and_upload(work)

    counts = {"ok": 0, "skip": 0, "error": 0}
    t0 = time.time()
    by_book = {}
    for w in work:
        by_book.setdefault(w["book"], []).append(w)
    for book, items in by_book.items():
        print(f"\n=== {book}: {len(items)} ===", flush=True)
        for item in items:
            r = run_one(item)
            counts[r] += 1
    dt = time.time() - t0
    print(f"\n=== Done in {dt/60:.1f} min ===  ok={counts['ok']} skip={counts['skip']} err={counts['error']}",
          flush=True)


if __name__ == "__main__":
    main()
