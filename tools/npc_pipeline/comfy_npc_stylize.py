#!/usr/bin/env python3
"""
Stylize pass: unify the artistic look across all existing NPC portraits.

Takes each src/images/npcs/<book>/<slug>.png and runs it through ComfyUI
img2img with the Oldhammer LoRA + a fixed FFG-oil-paint prompt. Low denoise
(default 0.30) preserves face/pose/composition while pulling palette,
lighting, and brushwork toward a single style anchor.

No faction LoRAs — they would re-bias subject and partly re-draw the source.
This pass is style-only.

Inputs are uploaded to whisperx under ~/comfyui/input/rt_npc_stylize/<book>/
to keep them separate from the canonical book-scan refs used by other flows.

Idempotency: --skip-existing checks the output path. With overwrite-in-place
(the default), --skip-existing is a no-op since the source IS the output.
Use --output-dir if you want a parallel tree for side-by-side review.

Usage examples:
  python3 comfy_npc_stylize.py --book corebook --limit 3 --dry-run
  python3 comfy_npc_stylize.py --output-dir /tmp/stylize_preview --limit 10
  python3 comfy_npc_stylize.py                 # full run, overwrites in place
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
NPC_ROOT = REPO / "src/images/npcs"

API = "http://192.168.11.22:8188"
WHISPERX_INPUT_DIR = "/home/ahermon/comfyui/input/rt_npc_stylize"
SSH_HOST = "ahermon@192.168.11.22"
SSH_KEY = "/mnt/project_data/RT/whisperx/id_rsa"

BASE_CKPT = "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"
OLDHAMMER = "Oldhammer.safetensors"

POSITIVE = (
    "warhammer 40k character portrait, "
    "oil painting by John Blanche and Karl Kopinski, "
    "FFG black library illustration, "
    "rich saturated color, dramatic chiaroscuro lighting, "
    "painted detail, sharp focus, gothic atmosphere"
)
NEGATIVE = (
    "blurry, low quality, jpeg artifacts, compression artifacts, "
    "watermark, text, signature, border, frame, "
    "modern, contemporary, anime, cell shaded, chibi, photograph, "
    "duplicate, mutation, deformed, extra limbs, multiple characters"
)


def slug_seed(slug):
    return 1337 + (abs(hash(slug)) & 0xFFFF)


def build_workflow(ref_subpath, slug, denoise, oldhammer_strength, size):
    g = {}
    g["ckpt"] = {"class_type": "CheckpointLoaderSimple",
                 "inputs": {"ckpt_name": BASE_CKPT}}
    g["lora"] = {"class_type": "LoraLoader",
                 "inputs": {"lora_name": OLDHAMMER,
                            "strength_model": oldhammer_strength,
                            "strength_clip": oldhammer_strength,
                            "model": ["ckpt", 0], "clip": ["ckpt", 1]}}
    g["pos"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": POSITIVE, "clip": ["lora", 1]}}
    g["neg"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": NEGATIVE, "clip": ["lora", 1]}}
    g["ref"] = {"class_type": "LoadImage",
                "inputs": {"image": ref_subpath}}
    g["scale"] = {"class_type": "ImageScale",
                  "inputs": {"image": ["ref", 0], "upscale_method": "lanczos",
                             "width": size, "height": size, "crop": "center"}}
    g["enc"] = {"class_type": "VAEEncode",
                "inputs": {"pixels": ["scale", 0], "vae": ["ckpt", 2]}}
    g["ks"] = {"class_type": "KSampler",
               "inputs": {"seed": slug_seed(slug), "steps": 26, "cfg": 5.5,
                          "sampler_name": "dpmpp_2m", "scheduler": "karras",
                          "denoise": denoise,
                          "model": ["lora", 0],
                          "positive": ["pos", 0], "negative": ["neg", 0],
                          "latent_image": ["enc", 0]}}
    g["vae"] = {"class_type": "VAEDecode",
                "inputs": {"samples": ["ks", 0], "vae": ["ckpt", 2]}}
    g["save"] = {"class_type": "SaveImage",
                 "inputs": {"images": ["vae", 0],
                            "filename_prefix": f"npc_stylize_{slug}"}}
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
    raise TimeoutError("stylize generation timed out")


def fetch(filename, subfolder, type_):
    params = urllib.parse.urlencode({"filename": filename,
                                     "subfolder": subfolder, "type": type_})
    return urllib.request.urlopen(f"{API}/view?{params}", timeout=60).read()


def ssh_cmd(remote):
    return ["ssh", "-i", SSH_KEY, "-o", "BatchMode=yes",
            "-o", "IdentitiesOnly=yes", SSH_HOST, remote]


def upload_book(book, files):
    """Upload one book's portraits to whisperx via rsync."""
    tmp = Path(f"/tmp/stylize_{book}")
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()
    for src in files:
        shutil.copy(src, tmp / src.name)
    subprocess.run(ssh_cmd(f"mkdir -p {WHISPERX_INPUT_DIR}/{book}"), check=True)
    subprocess.run(
        ["rsync", "-a", "-e", f"ssh -i {SSH_KEY} -o BatchMode=yes -o IdentitiesOnly=yes",
         f"{tmp}/", f"{SSH_HOST}:{WHISPERX_INPUT_DIR}/{book}/"],
        check=True,
    )
    shutil.rmtree(tmp)


def gather(book_filter=None, slug_filter=None):
    items = []
    for book_dir in sorted(NPC_ROOT.iterdir()):
        if not book_dir.is_dir():
            continue
        if book_filter and book_dir.name != book_filter:
            continue
        for png in sorted(book_dir.glob("*.png")):
            slug = png.stem
            if slug_filter and slug != slug_filter:
                continue
            items.append({"book": book_dir.name, "slug": slug, "src": png})
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", help="restrict to one book slug")
    ap.add_argument("--slug", help="restrict to one NPC slug (within --book or any)")
    ap.add_argument("--limit", type=int, help="stop after N successful generations")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--denoise", type=float, default=0.30,
                    help="img2img denoise (default 0.30)")
    ap.add_argument("--oldhammer-strength", type=float, default=0.55,
                    help="Oldhammer LoRA strength (default 0.55)")
    ap.add_argument("--size", type=int, default=1024,
                    help="square output edge in pixels (default 1024)")
    ap.add_argument("--output-dir", help="write results here instead of "
                    "overwriting in place; preserves the <book>/<slug>.png layout")
    ap.add_argument("--skip-existing", action="store_true",
                    help="(only meaningful with --output-dir) skip if the output PNG already exists")
    ap.add_argument("--no-upload", action="store_true",
                    help="skip the rsync step (use if sources are already on whisperx)")
    args = ap.parse_args()

    if args.denoise <= 0.0 or args.denoise >= 1.0:
        sys.exit(f"--denoise must be in (0, 1), got {args.denoise}")

    items = gather(args.book, args.slug)
    if not items:
        sys.exit("no portraits matched the filters")

    out_root = Path(args.output_dir) if args.output_dir else NPC_ROOT
    if args.output_dir:
        out_root.mkdir(parents=True, exist_ok=True)

    if args.skip_existing and args.output_dir:
        before = len(items)
        items = [i for i in items
                 if not (out_root / i["book"] / f"{i['slug']}.png").exists()]
        print(f"skip-existing: {before - len(items)} already done, "
              f"{len(items)} remaining")

    if args.limit:
        items = items[:args.limit]

    print(f"Stylize queue: {len(items)} portraits  "
          f"denoise={args.denoise}  oldhammer={args.oldhammer_strength}  "
          f"size={args.size}x{args.size}  "
          f"output={'overwrite' if not args.output_dir else out_root}")

    if args.dry_run:
        for it in items[:20]:
            print(f"  {it['book']}/{it['slug']}")
        if len(items) > 20:
            print(f"  ... and {len(items) - 20} more")
        return

    if not args.no_upload:
        by_book = {}
        for it in items:
            by_book.setdefault(it["book"], []).append(it["src"])
        print(f"Uploading {sum(len(v) for v in by_book.values())} sources "
              f"across {len(by_book)} books ...")
        for book, files in by_book.items():
            upload_book(book, files)
            print(f"  {book}: {len(files)} uploaded")

    ok = err = 0
    started = time.time()
    for it in items:
        book, slug, src = it["book"], it["slug"], it["src"]
        ref_subpath = f"rt_npc_stylize/{book}/{src.name}"
        out_path = out_root / book / f"{slug}.png"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"  [stylize] {book}/{slug}", flush=True)
        try:
            graph = build_workflow(ref_subpath, slug, args.denoise,
                                   args.oldhammer_strength, args.size)
            res = submit(graph)
            entry = wait_for(res["prompt_id"])
            if entry.get("status", {}).get("status_str") != "success":
                print(f"    FAILED: {entry.get('status')}", flush=True)
                err += 1
                continue
            imgs = entry.get("outputs", {}).get("save", {}).get("images", [])
            if not imgs:
                print("    FAILED: no images produced", flush=True)
                err += 1
                continue
            info = imgs[0]
            data = fetch(info["filename"], info.get("subfolder", ""),
                         info.get("type", "output"))
            out_path.write_bytes(data)
            ok += 1
        except Exception as e:
            print(f"    EXCEPTION: {e}", flush=True)
            err += 1

    mins = (time.time() - started) / 60
    print(f"\n=== Stylize done in {mins:.1f} min ===")
    print(f"  ok={ok}  errors={err}")


if __name__ == "__main__":
    main()
