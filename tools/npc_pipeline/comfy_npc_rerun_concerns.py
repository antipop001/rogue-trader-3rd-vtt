#!/usr/bin/env python3
"""Targeted re-run for CONCERN portraits — typically NPCs that share a
canonical reference with another NPC, where the very-low denoise of the
original colorize run made both outputs visually identical.

Strategy: same reference image, but:
  - higher denoise (0.32) so seed variation actually shows up
  - per-NPC seed (hash of slug)
  - prompt augmented with the NPC's name + truncated description, so the
    model has a directional nudge that differentiates the two outputs

DELETES the existing PNG for each CONCERN slug before re-running so the
idempotent skip logic doesn't fire.
"""
import json
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path("/home/ahermon/rogue-trader-3rd-vtt")
EXTRACTED_DIR = REPO / "tools/npc_pipeline/extracted"
VERIFIED_DIR = Path("/tmp/npc_verified")
OUT_ROOT = REPO / "src/images/npcs"
CONCERN_LIST = Path("/tmp/concern_slugs.json")

API = "http://192.168.11.22:8188"
WHISPERX_INPUT_DIR = "/home/ahermon/comfyui/input/rt_npc_refs"
BASE_CKPT = "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"
OLDHAMMER_STRENGTH = 0.35
DENOISE = 0.32  # higher than the bulk-colorize 0.18 so seed variation matters

NEGATIVE = (
    "text, page text, book text, watermark, signature, border, frame, "
    "blurry, low quality, jpeg artifacts, duplicate face, multiple characters, "
    "mutation, deformed, extra limbs"
)


def slug_seed(slug):
    return abs(hash(slug)) % (2**31)


def build_prompt(name, faction, description):
    parts = [
        f"warhammer 40k character art, oil painting, FFG illustration, "
        f"a portrait of {name}",
    ]
    if faction:
        parts.append(f"{faction} faction")
    if description:
        first = re.split(r"(?<=[\.\!\?])\s+", description.strip(), maxsplit=1)[0]
        first = first[:200].rstrip()
        if first:
            parts.append(first)
    parts.append("vibrant colors, clean composition, sharp focus, painted detail")
    return ", ".join(parts)


def workflow(ref_subpath, prompt, seed):
    g = {}
    g["ckpt"] = {"class_type": "CheckpointLoaderSimple",
                 "inputs": {"ckpt_name": BASE_CKPT}}
    g["lora_old"] = {"class_type": "LoraLoader",
                     "inputs": {"lora_name": "Oldhammer.safetensors",
                                "strength_model": OLDHAMMER_STRENGTH,
                                "strength_clip": OLDHAMMER_STRENGTH,
                                "model": ["ckpt", 0], "clip": ["ckpt", 1]}}
    g["pos"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": prompt, "clip": ["lora_old", 1]}}
    g["neg"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": NEGATIVE, "clip": ["lora_old", 1]}}
    g["ref"] = {"class_type": "LoadImage", "inputs": {"image": ref_subpath}}
    g["scale"] = {"class_type": "ImageScale",
                  "inputs": {"image": ["ref", 0], "upscale_method": "lanczos",
                             "width": 832, "height": 1216, "crop": "center"}}
    g["enc"] = {"class_type": "VAEEncode",
                "inputs": {"pixels": ["scale", 0], "vae": ["ckpt", 2]}}
    g["ks"] = {"class_type": "KSampler",
               "inputs": {"seed": seed, "steps": 26, "cfg": 5.5,
                          "sampler_name": "dpmpp_2m", "scheduler": "karras",
                          "denoise": DENOISE,
                          "model": ["lora_old", 0],
                          "positive": ["pos", 0], "negative": ["neg", 0],
                          "latent_image": ["enc", 0]}}
    g["vae"] = {"class_type": "VAEDecode",
                "inputs": {"samples": ["ks", 0], "vae": ["ckpt", 2]}}
    g["save"] = {"class_type": "SaveImage",
                 "inputs": {"images": ["vae", 0], "filename_prefix": "npc_concern_rerun"}}
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
            data = json.loads(urllib.request.urlopen(
                f"{API}/history/{prompt_id}", timeout=15).read())
            if prompt_id in data:
                entry = data[prompt_id]
                s = entry.get("status", {}).get("status_str")
                if s in ("success", "error"):
                    return entry
        except Exception as e:
            print(f"    poll err: {e}", flush=True)
        time.sleep(3)
    raise TimeoutError


def fetch(filename, subfolder, type_):
    params = urllib.parse.urlencode({"filename": filename,
                                     "subfolder": subfolder, "type": type_})
    return urllib.request.urlopen(f"{API}/view?{params}", timeout=60).read()


def main():
    concerns = json.load(open(CONCERN_LIST))
    npc_index = {}
    for jf in EXTRACTED_DIR.glob("*.json"):
        for n in json.loads(jf.read_text()):
            npc_index[(jf.stem, n["slug"])] = n

    verified = {}
    for vf in VERIFIED_DIR.glob("*.json"):
        for r in json.loads(vf.read_text()):
            verified[(vf.stem, r["slug"])] = r

    ok = err = skip = 0
    for book, slug in concerns:
        key = (book, slug)
        npc = npc_index.get(key)
        v = verified.get(key)
        if not npc or not v or v.get("verdict") not in ("GOOD", "UNCLEAR"):
            print(f"  skip {book}/{slug}: not GOOD-verified")
            skip += 1
            continue
        out_path = OUT_ROOT / book / f"{slug}.png"
        # Force a re-roll by deleting the existing file first.
        if out_path.exists():
            out_path.unlink()
        ref_filename = Path(v["reference"]).name
        ref_subpath = f"rt_npc_refs/{book}/{ref_filename}"
        prompt = build_prompt(npc["name"], npc.get("faction") or "",
                              npc.get("description") or "")
        seed = slug_seed(slug)
        print(f"  [{book}/{slug}] seed={seed}", flush=True)
        try:
            res = submit(workflow(ref_subpath, prompt, seed))
            entry = wait_for(res["prompt_id"])
            if entry.get("status", {}).get("status_str") != "success":
                print(f"    FAILED: {entry.get('status')}", flush=True)
                err += 1
                continue
            outs = entry["outputs"].get("save", {}).get("images", [])
            if not outs:
                err += 1; continue
            info = outs[0]
            data = fetch(info["filename"], info.get("subfolder", ""),
                         info.get("type", "output"))
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(data)
            ok += 1
        except Exception as e:
            print(f"    EXCEPTION: {e}", flush=True)
            err += 1

    print(f"\nDone: ok={ok} err={err} skip={skip}")


if __name__ == "__main__":
    main()
