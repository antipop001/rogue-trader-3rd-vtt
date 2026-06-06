#!/usr/bin/env python3
"""
Re-generate portraits for NPCs flagged by audit_face_framing.py as
FACE_TINY / FACE_LOW / FACE_EDGE_LR / FACE_CROPPED_*.

Differences vs comfy_npc_batch.py:
  - PORTRAIT-BUST prompt: explicit composition guidance pushing face into upper
    third, head-and-shoulders framing, looking at viewer.
  - 1024×1024 square aspect — matches what Foundry's square token crop wants.
  - txt2img always, even when a portrait_ref exists — the existing img2img
    refs are full-body book scans that anchor full-body composition (the
    whole reason FACE_TINY happens). For reframing we want the model to
    pick its own composition under the bust prompt.
  - Overwrites existing PNGs (the entire point is to replace the framing).

Input: reads /tmp/framing.json (produced by audit_face_framing.py --json),
filters for actionable statuses, and reframes one-per-NPC.

Idempotent across re-runs ONLY if --skip-existing is passed and the PNG
has been re-audited as GOOD. Default behavior is to overwrite, so a
second invocation re-rolls everything in the queue.
"""
import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path("/home/ahermon/rogue-trader-3rd-vtt")
OUT_ROOT = REPO / "src/images/npcs"

API = "http://192.168.11.22:8188"
BASE_CKPT = "JuggernautXL_v9_RunDiffusionPhoto_v2.safetensors"

# Faction → (LoRA filename, weight)
FACTION_LORA = {
    "Eldar": ("Aeldari.safetensors", 0.55),
    "Ork": ("Ork-Boyz.safetensors", 0.55),
    "Tau": ("Tau.safetensors", 0.50),
}
OLDHAMMER_STRENGTH = 0.50

ACTIONABLE = {"FACE_TINY", "FACE_LOW", "FACE_EDGE_LR",
              "FACE_CROPPED_TOP", "FACE_CROPPED_BTM"}

UNIVERSAL_NEG = (
    "blurry, low quality, distorted, deformed, bad anatomy, extra limbs, "
    "multiple characters, group, crowd, two people, duplicate, twins, "
    "extra arms, extra legs, mutation, watermark, text, signature, modern, "
    "contemporary, anime style, cell shaded, chibi, photograph, "
    "ensemble cast, three figures, four figures, "
    # New negatives for the bust pass
    "full body shot, action pose, wide shot, distant figure, full length, "
    "tiny face, face cropped out, looking away"
)


def build_bust_prompt(name, faction=""):
    """Compose a positive prompt heavily biased toward portrait-bust composition."""
    parts = [
        # Composition first — model attends to early tokens most
        "portrait bust, head and shoulders, face centered upper third, "
        "dramatic close-up, looking at viewer, intense gaze",
        # Style
        "grim dark warhammer 40k character art, oil painting by John Blanche "
        "and Karl Kopinski, dramatic chiaroscuro lighting, dark gothic "
        "background, Games Workshop painted illustration",
        f"A single {name}",
    ]
    if faction:
        parts.append(f"{faction} xenos" if faction not in ("Warp", "Chaos") else f"{faction} entity")
    parts.append("FFG black library art style, clear anatomy, expressive face, well-defined silhouette")
    return ". ".join(parts) + "."


def build_workflow(name, slug, faction, seed=137):
    g = {}
    g["ckpt"] = {"class_type": "CheckpointLoaderSimple",
                 "inputs": {"ckpt_name": BASE_CKPT}}
    last_m, last_c = ["ckpt", 0], ["ckpt", 1]

    fl = FACTION_LORA.get(faction)
    if fl:
        g["lora_faction"] = {"class_type": "LoraLoader",
                             "inputs": {"lora_name": fl[0],
                                        "strength_model": fl[1],
                                        "strength_clip": fl[1],
                                        "model": last_m, "clip": last_c}}
        last_m, last_c = ["lora_faction", 0], ["lora_faction", 1]

    g["lora_old"] = {"class_type": "LoraLoader",
                     "inputs": {"lora_name": "Oldhammer.safetensors",
                                "strength_model": OLDHAMMER_STRENGTH,
                                "strength_clip": OLDHAMMER_STRENGTH,
                                "model": last_m, "clip": last_c}}
    last_m, last_c = ["lora_old", 0], ["lora_old", 1]

    g["pos"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": build_bust_prompt(name, faction), "clip": last_c}}
    g["neg"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": UNIVERSAL_NEG, "clip": last_c}}

    g["latent"] = {"class_type": "EmptyLatentImage",
                   "inputs": {"width": 1024, "height": 1024, "batch_size": 1}}

    g["ks"] = {"class_type": "KSampler",
               "inputs": {"seed": seed, "steps": 30, "cfg": 6.0,
                          "sampler_name": "dpmpp_2m", "scheduler": "karras",
                          "denoise": 1.0,
                          "model": last_m, "positive": ["pos", 0],
                          "negative": ["neg", 0],
                          "latent_image": ["latent", 0]}}
    g["vae"] = {"class_type": "VAEDecode",
                "inputs": {"samples": ["ks", 0], "vae": ["ckpt", 2]}}
    g["save"] = {"class_type": "SaveImage",
                 "inputs": {"images": ["vae", 0],
                            "filename_prefix": f"npc_reframe_{slug}"}}
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
                if entry.get("status", {}).get("status_str") in ("success", "error"):
                    return entry
        except Exception as e:
            print(f"    poll err: {e}", flush=True)
        time.sleep(3)
    raise TimeoutError("comfy generation timed out")


def fetch(filename, subfolder, type_):
    params = urllib.parse.urlencode({"filename": filename,
                                     "subfolder": subfolder, "type": type_})
    return urllib.request.urlopen(f"{API}/view?{params}", timeout=60).read()


def _slug_to_npc_name(slug):
    """Reverse the slugify: 'rogue-trader-jeremiah-blitz' -> 'Rogue Trader Jeremiah Blitz'."""
    return " ".join(w.capitalize() for w in slug.split("-"))


def _book_faction_hint(book_slug, slug):
    """Cheap heuristic based on book/slug for faction LoRA selection."""
    lower = slug.lower()
    if "tau" in book_slug or "tau" in lower or "fire-warrior" in lower or "kroot" in lower:
        return "Tau" if "fire" in lower or "tau" in lower else ""
    if "eldar" in lower or "aeldari" in lower or "harlequin" in lower or "farseer" in lower \
            or "warlock" in lower or "wraithguard" in lower or "shadowkith" in lower:
        return "Eldar"
    if "ork" in lower or "gretchin" in lower or "snotling" in lower or "warboss" in lower \
            or "kaptin" in lower:
        return "Ork"
    return ""


def run_one(entry, dry_run=False, seed=137):
    book = entry["book"]
    slug = entry["slug"]
    out_dir = OUT_ROOT / book
    out_path = out_dir / f"{slug}.png"
    faction = _book_faction_hint(book, slug)
    name = _slug_to_npc_name(slug)
    print(f"  [bust] {book}/{slug}  (faction={faction or '-'})", flush=True)
    if dry_run:
        return "dry"
    g = build_workflow(name, slug, faction, seed=seed)
    try:
        res = submit(g)
        pid = res["prompt_id"]
        e = wait_for(pid)
        status = e.get("status", {}).get("status_str")
        if status != "success":
            print(f"    FAILED: {status}", flush=True)
            return "error"
        outs = e["outputs"].get("save", {}).get("images", [])
        if not outs:
            print(f"    FAILED: no output", flush=True)
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
    ap.add_argument("--input", default="/tmp/framing.json",
                    help="path to JSON produced by audit_face_framing.py --json")
    ap.add_argument("--book", help="restrict to one book slug")
    ap.add_argument("--limit", type=int, help="stop after N successful regenerations")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--seed", type=int, default=137)
    args = ap.parse_args()

    findings = json.loads(Path(args.input).read_text())
    queue = [f for f in findings if f["status"] in ACTIONABLE]
    if args.book:
        queue = [f for f in queue if f["book"] == args.book]
    print(f"Reframe queue: {len(queue)} portraits", flush=True)

    ok = err = 0
    t0 = time.time()
    for entry in queue:
        # Per-NPC seed lets the same slug get a different result on each rerun
        s = args.seed + (hash(entry["slug"]) & 0xFFFF)
        r = run_one(entry, dry_run=args.dry_run, seed=s)
        if r == "ok":
            ok += 1
            if args.limit and ok >= args.limit:
                break
        elif r == "error":
            err += 1
    print(f"\n=== Reframe done in {(time.time()-t0)/60:.1f} min ===", flush=True)
    print(f"  ok={ok}  errors={err}", flush=True)


if __name__ == "__main__":
    main()
