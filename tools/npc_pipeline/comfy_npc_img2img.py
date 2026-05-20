#!/usr/bin/env python3
"""
Generate NPC portraits via img2img against the canonical RT corebook reference art.

Approach: load the FFG painted reference, encode to latent, run KSampler at
denoise≈0.65 so the model substantially redraws (color, detail, sharpness) but
preserves the body shape / composition / species anatomy of the source.

Base: JuggernautXL (photorealistic painted style — works well with oil-paint refs).
LoRA: Oldhammer @ 0.55 to push the painted-oil 40K aesthetic.

Run a single NPC by passing its slug as argv[1]: eldar, ork, kroot, geist.
With no arg, runs all four.
"""
import json
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

API = "http://192.168.11.22:8188"
SEED = 42
DENOISE = 0.65  # ~mid: keeps composition, repaints surface

OUT_DIR = Path("/home/ahermon/rogue-trader-3rd-vtt/src/images/npcs_v2")
OUT_DIR.mkdir(exist_ok=True, parents=True)

NPCS = {
    "kroot": {
        "ref": "rt_npc_refs/kroot_mercenary_ref.jpeg",
        "out_name": "kroot-mercenary.png",
        "denoise": 0.55,
        "positive": (
            "grim dark warhammer 40k character art, oil painting by John Blanche and Karl Kopinski, "
            "dramatic chiaroscuro lighting, dark gothic background, Games Workshop painted illustration. "
            "A single Kroot Mercenary, vulture-headed xenos alien, biped with exactly two arms and two legs, "
            "long curved raptor beak protruding forward from a narrow bird-of-prey skull, "
            "no mouth visible — just the rigid keratin beak, no human face features, "
            "stiff black porcupine-like quills crest running back across the head and down the spine, "
            "lean lanky humanoid biped body with leathery grey-green hide, "
            "four-fingered clawed hands, digitigrade bird-like legs ending in three-clawed feet, "
            "wearing minimal worn hide armor straps and bone trophy fetishes, "
            "holding a long Kroot rifle with both hands across the body, hunched predatory stance, "
            "sharp yellow predator eyes, FFG black library art style, "
            "clear anatomy, well-defined silhouette."
        ),
        "negative_extra": (
            "(extra arms:1.5), (multiple arms:1.4), three arms, four arms, six arms, many limbs, "
            "extra hands, multiple weapons, "
            "orc, ork, goblin, greenskin, snarl, tusks, fangs, jagged teeth, open fanged mouth, "
            "human-like face, broad face, wide head, troll, ogre"
        ),
        "lora": "Oldhammer.safetensors",
        "lora_strength": 0.5,
        "seed": 77,
    },
    "eldar": {
        "ref": "rt_npc_refs/eldar_corsair_ref.jpeg",
        "out_name": "eldar-corsair.png",
        "positive": (
            "grim dark warhammer 40k character art, oil painting by John Blanche and Karl Kopinski, "
            "dramatic chiaroscuro lighting, dark gothic background, Games Workshop painted illustration. "
            "A single Eldar Corsair, slim elegant alien xenos warrior with sharp angular features and pointed ears, "
            "long dark hair in a topknot, gleaming dark xeno-mesh armor with silver trim, billowing cloak, "
            "wielding a shuriken catapult pistol in one hand and a slender Eldar power sword in the other, "
            "haughty cruel expression, phantom-like grace, FFG black library art style."
        ),
        "lora": "Aeldari.safetensors",
        "lora_strength": 0.5,
        "extra_lora": "Oldhammer.safetensors",
        "extra_lora_strength": 0.45,
    },
    "ork": {
        "ref": "rt_npc_refs/ork_freebooter_ref.jpeg",
        "out_name": "ork-freebooter.png",
        "positive": (
            "grim dark warhammer 40k character art, oil painting by John Blanche and Karl Kopinski, "
            "dramatic chiaroscuro lighting, dark gothic background, Games Workshop painted illustration. "
            "A single Ork Freebooter, hulking brutish greenskin xenos warrior with sallow green hide, "
            "massive muscled hunched shoulders, heavy jaw with jagged tusks, glittering red eyes, "
            "wearing scavenged piratical patchwork plate armor with bone trophies and chains, "
            "wielding a massive crude shoota and a brutal jagged chain-axe choppa, "
            "aggressive battle-hungry slouch, bloodthirsty grin, FFG black library art style."
        ),
        "lora": "Ork-Boyz.safetensors",
        "lora_strength": 0.55,
        "extra_lora": "Oldhammer.safetensors",
        "extra_lora_strength": 0.45,
    },
    "geist": {
        "ref": "rt_npc_refs/ebon_geist_ref.jpeg",
        "out_name": "warp-predator-ebon-geist.png",
        "positive": (
            "grim dark warhammer 40k character art, oil painting by John Blanche and Karl Kopinski, "
            "dramatic chiaroscuro lighting, dark gothic background, Games Workshop painted illustration. "
            "A single Ebon Geist warp predator, a daemonic incorporeal nightmare creature, "
            "thin writhing humanoid form made of swirling black shadow and warp darkness, "
            "elongated chill talons of black ice and bone, hollow glowing pale eyes in a void-black face, "
            "wisps of icy darkness trailing from limbs, terrifying striking pose, "
            "emerging from absolute blackness, FFG black library art style."
        ),
        "lora": "Oldhammer.safetensors",
        "lora_strength": 0.55,
    },
}

NEGATIVE = (
    "bird, crow, raven, parrot, owl, eagle, full bird, anthropomorphic bird with feathered body, "
    "feathered body, feathered arms, cartoon, mascot, plush, "
    "human face, human mouth, human nose, skull mask, bone mask, tribal mask, war paint, "
    "headdress, native american, aztec, "
    "yellow power armor, imperial fists, space marine, ceramite shoulder pad, "
    "blurry, low quality, distorted, deformed, bad anatomy, extra limbs, multiple characters, "
    "group, crowd, two people, duplicate, twins, extra arms, extra legs, mutation, watermark, "
    "text, signature, modern, contemporary, anime style, cell shaded, chibi, photograph, "
    "ensemble cast, three figures, four figures"
)


def workflow(npc_key):
    npc = NPCS[npc_key]
    g = {}
    # Base
    g["ckpt"] = {"class_type": "CheckpointLoaderSimple",
                 "inputs": {"ckpt_name": "JuggernautXL_v9_RunDiffusionPhoto_v2.safetensors"}}
    last_model, last_clip = ["ckpt", 0], ["ckpt", 1]

    # Primary LoRA
    g["lora1"] = {"class_type": "LoraLoader",
                  "inputs": {"lora_name": npc["lora"],
                             "strength_model": npc["lora_strength"], "strength_clip": npc["lora_strength"],
                             "model": last_model, "clip": last_clip}}
    last_model, last_clip = ["lora1", 0], ["lora1", 1]

    # Optional second LoRA (e.g. Oldhammer stacked on faction LoRA)
    if "extra_lora" in npc:
        g["lora2"] = {"class_type": "LoraLoader",
                      "inputs": {"lora_name": npc["extra_lora"],
                                 "strength_model": npc["extra_lora_strength"],
                                 "strength_clip": npc["extra_lora_strength"],
                                 "model": last_model, "clip": last_clip}}
        last_model, last_clip = ["lora2", 0], ["lora2", 1]

    # Prompts (per-NPC negative override allowed)
    full_negative = NEGATIVE
    if "negative_extra" in npc:
        full_negative = npc["negative_extra"] + ", " + NEGATIVE
    g["pos"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": npc["positive"], "clip": last_clip}}
    g["neg"] = {"class_type": "CLIPTextEncode",
                "inputs": {"text": full_negative, "clip": last_clip}}

    # Load reference, scale to SDXL portrait, encode to latent
    g["ref"] = {"class_type": "LoadImage", "inputs": {"image": npc["ref"]}}
    g["scale"] = {"class_type": "ImageScale",
                  "inputs": {"image": ["ref", 0],
                             "upscale_method": "lanczos",
                             "width": 832, "height": 1216,
                             "crop": "center"}}
    g["enc"] = {"class_type": "VAEEncode",
                "inputs": {"pixels": ["scale", 0], "vae": ["ckpt", 2]}}

    # KSampler with partial denoise — preserves structure of the reference (per-NPC override allowed)
    g["ksampler"] = {"class_type": "KSampler",
                     "inputs": {"seed": npc.get("seed", SEED), "steps": 30, "cfg": 6.0,
                                "sampler_name": "dpmpp_2m", "scheduler": "karras",
                                "denoise": npc.get("denoise", DENOISE),
                                "model": last_model,
                                "positive": ["pos", 0], "negative": ["neg", 0],
                                "latent_image": ["enc", 0]}}
    g["vae"] = {"class_type": "VAEDecode",
                "inputs": {"samples": ["ksampler", 0], "vae": ["ckpt", 2]}}
    g["save"] = {"class_type": "SaveImage",
                 "inputs": {"images": ["vae", 0],
                            "filename_prefix": f"npc_img2img_{npc_key}"}}
    return g


def submit(graph):
    body = json.dumps({"prompt": graph}).encode()
    req = urllib.request.Request(f"{API}/prompt", data=body,
                                 headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())


def wait_for(prompt_id, timeout=300):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = urllib.request.urlopen(f"{API}/history/{prompt_id}", timeout=10).read()
        data = json.loads(r)
        if prompt_id in data:
            entry = data[prompt_id]
            ss = entry.get("status", {}).get("status_str")
            if ss == "success":
                return entry
            if ss == "error":
                return entry
        time.sleep(2)
    raise TimeoutError("comfy generation timed out")


def download(filename, subfolder, type_):
    params = urllib.parse.urlencode({"filename": filename, "subfolder": subfolder, "type": type_})
    return urllib.request.urlopen(f"{API}/view?{params}", timeout=30).read()


def run_one(key):
    print(f"=== {key} ===")
    g = workflow(key)
    res = submit(g)
    prompt_id = res["prompt_id"]
    print(f"  prompt_id={prompt_id}")
    entry = wait_for(prompt_id)
    status = entry.get("status", {})
    if status.get("status_str") != "success":
        print("  FAILED:", json.dumps(entry.get("status", {}), indent=2))
        return None
    img_info = entry["outputs"]["save"]["images"][0]
    data = download(img_info["filename"], img_info.get("subfolder", ""), img_info.get("type", "output"))
    out = OUT_DIR / NPCS[key]["out_name"]
    out.write_bytes(data)
    print(f"  -> {out}, {len(data)//1024} KB")
    return out


def main():
    keys = sys.argv[1:] or list(NPCS.keys())
    for k in keys:
        if k not in NPCS:
            print(f"unknown: {k}"); continue
        run_one(k)


if __name__ == "__main__":
    main()
