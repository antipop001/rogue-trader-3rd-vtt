#!/usr/bin/env python3
"""
Mass NPC portrait generator. Reads every tools/npc_pipeline/extracted/<book>.json
and renders one portrait per NPC using the ComfyUI API on whisperx.

For each NPC:
  - If a canonical reference image exists (npc['portrait_ref']) → img2img at
    denoise 0.55. Reference must already be uploaded to whisperx's
    ~/comfyui/input/rt_npc_refs/<book>/<img>.jpeg
    (use --upload to push them via scp before generation).
  - Else → txt2img.

LoRA stacking:
  - Faction LoRA per the parser's inferred faction (Eldar/Ork/Tau/Astartes).
  - Oldhammer.safetensors @ 0.5 always — the painted-oil style anchor.

Output: src/images/npcs/<book>/<slug>.png  (one per NPC, namespaced by book).

Idempotent: skips an NPC whose output PNG already exists.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path("/home/ahermon/rogue-trader-3rd-vtt")
EXTRACTED_DIR = Path(__file__).parent / "extracted"
SRC_REFS_ROOT = Path("/mnt/project_data/RT/RT-DOCS")
OUT_ROOT = REPO / "src/images/npcs"

API = "http://192.168.11.22:8188"
WHISPERX_INPUT_DIR = "/home/ahermon/comfyui/input/rt_npc_refs"
SSH_HOST = "ahermon@192.168.11.22"

BASE_CKPT = "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"

# Faction → (LoRA filename, weight). None means no faction LoRA.
FACTION_LORA = {
    "Eldar": ("Aeldari.safetensors", 0.55),
    "Ork": ("Ork-Boyz.safetensors", 0.55),
    "Tau": ("Tau.safetensors", 0.50),
    # Kroot, Stryxis, Rak'Gol, Warp, Chaos, etc. — no LoRA, just Oldhammer.
}

OLDHAMMER_STRENGTH = 0.50  # always stacked

# Bestiary-style references (creature naming heuristics for prompt hints)
BESTIAL_HINTS = {
    "stalker", "fiend", "beast", "razorwing", "leech", "serpent",
    "predator", "behemoth", "wraith", "geist", "demon", "daemon",
    "swarm", "tyranid", "kraken", "ptera", "spider", "wurm", "worm",
}


# === Prompt construction =====================================================

UNIVERSAL_NEG = (
    "blurry, low quality, distorted, deformed, bad anatomy, extra limbs, "
    "multiple characters, group, crowd, two people, duplicate, twins, "
    "extra arms, extra legs, mutation, watermark, text, signature, modern, "
    "contemporary, anime style, cell shaded, chibi, photograph, "
    "ensemble cast, three figures, four figures"
)


def build_prompt(npc):
    """Compose a positive prompt from the parsed NPC fields."""
    name = npc["name"]
    faction = npc.get("faction", "") or ""
    desc = (npc.get("description") or "").strip()
    lower_name = name.lower()
    is_creature = any(h in lower_name for h in BESTIAL_HINTS) or faction in ("Warp", "Chaos")

    parts = [
        "grim dark warhammer 40k character art, oil painting by John Blanche "
        "and Karl Kopinski, dramatic chiaroscuro lighting, dark gothic "
        "background, Games Workshop painted illustration",
        f"A single {name}",
    ]
    if faction:
        parts.append(f"{faction} xenos" if faction not in ("Warp", "Chaos") else f"{faction} entity")
    if desc:
        # Use the first sentence (up to ~250 chars).
        first = re.split(r"(?<=[\.\!\?])\s+", desc, maxsplit=1)[0]
        first = first[:250].rstrip()
        if first:
            parts.append(first)
    if is_creature:
        parts.append("predatory pose, dark gothic 41st millennium")
    parts.append("FFG black library art style, clear anatomy, well-defined silhouette")
    return ". ".join(parts) + "."


def faction_lora_pair(faction):
    return FACTION_LORA.get(faction)


# === ComfyUI workflow ========================================================

def build_workflow(npc, ref_subpath, seed=42, denoise_img2img=0.55):
    g = {}
    g["ckpt"] = {"class_type": "CheckpointLoaderSimple",
                 "inputs": {"ckpt_name": BASE_CKPT}}
    last_m, last_c = ["ckpt", 0], ["ckpt", 1]

    fl = faction_lora_pair(npc.get("faction", ""))
    if fl:
        g["lora_faction"] = {"class_type": "LoraLoader",
                             "inputs": {"lora_name": fl[0],
                                        "strength_model": fl[1], "strength_clip": fl[1],
                                        "model": last_m, "clip": last_c}}
        last_m, last_c = ["lora_faction", 0], ["lora_faction", 1]

    g["lora_old"] = {"class_type": "LoraLoader",
                     "inputs": {"lora_name": "Oldhammer.safetensors",
                                "strength_model": OLDHAMMER_STRENGTH,
                                "strength_clip": OLDHAMMER_STRENGTH,
                                "model": last_m, "clip": last_c}}
    last_m, last_c = ["lora_old", 0], ["lora_old", 1]

    g["pos"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": build_prompt(npc), "clip": last_c}}
    g["neg"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": UNIVERSAL_NEG, "clip": last_c}}

    if ref_subpath:
        g["ref"] = {"class_type": "LoadImage", "inputs": {"image": ref_subpath}}
        g["scale"] = {"class_type": "ImageScale",
                      "inputs": {"image": ["ref", 0], "upscale_method": "lanczos",
                                 "width": 832, "height": 1216, "crop": "center"}}
        g["enc"] = {"class_type": "VAEEncode",
                    "inputs": {"pixels": ["scale", 0], "vae": ["ckpt", 2]}}
        latent = ["enc", 0]
        denoise = denoise_img2img
    else:
        g["latent"] = {"class_type": "EmptyLatentImage",
                       "inputs": {"width": 832, "height": 1216, "batch_size": 1}}
        latent = ["latent", 0]
        denoise = 1.0

    g["ks"] = {"class_type": "KSampler",
               "inputs": {"seed": seed, "steps": 30, "cfg": 6.0,
                          "sampler_name": "dpmpp_2m", "scheduler": "karras",
                          "denoise": denoise,
                          "model": last_m, "positive": ["pos", 0], "negative": ["neg", 0],
                          "latent_image": latent}}
    g["vae"] = {"class_type": "VAEDecode",
                "inputs": {"samples": ["ks", 0], "vae": ["ckpt", 2]}}
    g["save"] = {"class_type": "SaveImage",
                 "inputs": {"images": ["vae", 0],
                            "filename_prefix": f"npc_batch_{npc['slug']}"}}
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
                status = entry.get("status", {}).get("status_str")
                if status in ("success", "error"):
                    return entry
        except Exception as e:
            print(f"    poll err: {e}", flush=True)
        time.sleep(3)
    raise TimeoutError("comfy generation timed out")


def fetch(filename, subfolder, type_):
    params = urllib.parse.urlencode({"filename": filename,
                                     "subfolder": subfolder, "type": type_})
    return urllib.request.urlopen(f"{API}/view?{params}", timeout=60).read()


# === Reference upload helpers ===============================================

def resolve_ref_local_path(book_pdf_dir, ref_filename):
    """Given a book directory and 'img-12.jpeg', find pages/page-N/img-12.jpeg."""
    for page_dir in (book_pdf_dir / "pages").iterdir():
        candidate = page_dir / ref_filename
        if candidate.is_file():
            return candidate
    return None


def collect_refs(npcs_by_book):
    """Build manifest: list of (book_pdf_dir, ref_filename) for upload."""
    refs = set()
    for book_slug, npcs in npcs_by_book.items():
        for npc in npcs:
            if not npc.get("portrait_ref"):
                continue
            book_pdf_dir = SRC_REFS_ROOT / npc["source_book"]
            local = resolve_ref_local_path(book_pdf_dir, npc["portrait_ref"])
            if local:
                refs.add((book_slug, local))
    return sorted(refs, key=lambda x: (x[0], str(x[1])))


def upload_refs(refs):
    """rsync each (book_slug, local_path) to whisperx under rt_npc_refs/<book>/."""
    # Group by book to make a single rsync per book.
    by_book = {}
    for book_slug, local in refs:
        by_book.setdefault(book_slug, []).append(local)
    print(f"Uploading reference images: {sum(len(v) for v in by_book.values())} files across {len(by_book)} books", flush=True)
    for book_slug, files in by_book.items():
        # Stage in a temp dir so rsync sees a single source
        tmp = Path(f"/tmp/npc_refs_{book_slug}")
        if tmp.exists():
            shutil.rmtree(tmp)
        tmp.mkdir(parents=True)
        for f in files:
            shutil.copy(f, tmp / f.name)
        # Ensure remote dir
        subprocess.run(["ssh", SSH_HOST, f"mkdir -p {WHISPERX_INPUT_DIR}/{book_slug}"], check=True)
        rsync_cmd = ["rsync", "-a",
                     f"{tmp}/", f"{SSH_HOST}:{WHISPERX_INPUT_DIR}/{book_slug}/"]
        subprocess.run(rsync_cmd, check=True)
        print(f"  {book_slug}: {len(files)} files", flush=True)
    print("Upload complete.", flush=True)


# === Main batch loop =========================================================

def run_one(npc, book_slug, dry_run=False):
    out_dir = OUT_ROOT / book_slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{npc['slug']}.png"
    if out_path.exists():
        return "skip"
    ref_subpath = None
    if npc.get("portrait_ref"):
        ref_subpath = f"rt_npc_refs/{book_slug}/{npc['portrait_ref']}"
    g = build_workflow(npc, ref_subpath)
    mode = "img2img" if ref_subpath else "txt2img"
    print(f"  [{mode}] {book_slug}/{npc['slug']}", flush=True)
    if dry_run:
        return "dry"
    try:
        res = submit(g)
        pid = res["prompt_id"]
        entry = wait_for(pid)
        status = entry.get("status", {}).get("status_str")
        if status != "success":
            err = entry.get("status", {}).get("messages", [])
            print(f"    FAILED: {status}: {json.dumps(err)[:300]}", flush=True)
            return "error"
        outs = entry["outputs"].get("save", {}).get("images", [])
        if not outs:
            print(f"    FAILED: no output image", flush=True)
            return "error"
        info = outs[0]
        data = fetch(info["filename"], info.get("subfolder", ""), info.get("type", "output"))
        out_path.write_bytes(data)
        return "ok"
    except Exception as e:
        print(f"    EXCEPTION: {e}", flush=True)
        return "error"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--upload", action="store_true",
                    help="upload reference images to whisperx before generating")
    ap.add_argument("--dry-run", action="store_true",
                    help="don't submit to comfy, just print what would happen")
    ap.add_argument("--book", help="restrict to a single book slug")
    ap.add_argument("--limit", type=int, help="stop after N successful generations")
    args = ap.parse_args()

    # Load every per-book JSON.
    npcs_by_book = {}
    for jf in sorted(EXTRACTED_DIR.glob("*.json")):
        if args.book and jf.stem != args.book:
            continue
        d = json.loads(jf.read_text())
        if d:
            npcs_by_book[jf.stem] = d

    total = sum(len(v) for v in npcs_by_book.values())
    with_ref = sum(1 for npcs in npcs_by_book.values() for n in npcs if n.get("portrait_ref"))
    print(f"Loaded {total} NPCs across {len(npcs_by_book)} books "
          f"({with_ref} with reference / {total-with_ref} txt2img)", flush=True)

    if args.upload:
        refs = collect_refs(npcs_by_book)
        upload_refs(refs)

    counts = {"ok": 0, "skip": 0, "error": 0, "dry": 0}
    t0 = time.time()
    for book_slug, npcs in npcs_by_book.items():
        print(f"\n=== {book_slug}: {len(npcs)} NPCs ===", flush=True)
        for npc in npcs:
            r = run_one(npc, book_slug, dry_run=args.dry_run)
            counts[r] += 1
            if args.limit and counts["ok"] >= args.limit:
                print(f"\nLimit {args.limit} reached.", flush=True)
                break
        if args.limit and counts["ok"] >= args.limit:
            break

    dt = time.time() - t0
    print(f"\n=== Done in {dt/60:.1f} min ===", flush=True)
    print(f"  ok={counts['ok']}  skipped={counts['skip']}  errors={counts['error']}", flush=True)


if __name__ == "__main__":
    main()
