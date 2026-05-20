# ComfyUI Setup — Reference for Claude Code

This file is the single source of truth for the ComfyUI environment, models, workflows, and conventions used in this project. Read this before suggesting paths, commands, or workflow edits.

---

## 1. Project Goal

Build a **character animation system** that turns any static character image into a walking (or running / idle) animation, with the end goal of a **Discord bot** that automates this for arbitrary user-uploaded characters.

Constraints the system must respect:
- Preserve character fidelity (face, colors, style)
- Preserve complex details (wings, weapons, armor, accessories)
- Produce smooth motion without character duplication
- Run via the **ComfyUI API** from a Python CLI / Discord bot wrapper

---

## 2. Server & Connection

| Thing | Value |
|---|---|
| Access | Remote SSH from VS Code (Remote-SSH extension) |
| ComfyUI install root | `./comfyui/ComfyUI` |
| Mounted storage root | `/mnt/comfyui/` |
| Pose data dir | `/mnt/comfyui/input/poses/` |
| Output dir | `/mnt/comfyui/output/` |
| API URL (default) | `http://localhost:8188` |
| Default launch args | `python main.py --listen 0.0.0.0 --port 8188` |

**Always use absolute paths under `/mnt/comfyui/...` when wiring inputs/outputs in workflows or scripts.** The repo path (`./comfyui/ComfyUI`) is for code; the mounted path is for assets.

---

## 3. Environment

| Component | Version |
|---|---|
| Python | 3.10 |
| Virtualenv | `comfyui-venv` (activate with `source comfyui-venv/bin/activate`) |
| PyTorch | 2.6.0+cu124 |
| TorchVision | 0.21.0+cu124 |
| TorchAudio | 2.6.0+cu124 |
| CUDA toolkit | 12.4.127 |
| cuDNN | 9.1.0.70 |
| NCCL | 2.21.5 |
| Transformers | 4.57.1 |
| ComfyUI frontend | 1.28.8 |
| NumPy | 2.1.2 |
| Pillow | 11.3.0 |
| OpenCV | 4.12.0.88 |
| controlnet_aux | 0.0.10 |

A separate `whisper-env` exists alongside (audio/transcription work) — do not touch from ComfyUI flows.

### Activate & launch
```bash
source comfyui-venv/bin/activate
cd comfyui/ComfyUI
python main.py --listen 0.0.0.0 --port 8188
```

---

## 4. Custom Nodes (all installed)

Located in `./comfyui/ComfyUI/custom_nodes/`:

1. **ComfyUI-Manager** — node package manager
2. **ComfyUI_IPAdapter_plus** — IP-Adapter (character appearance)
3. **comfyui_controlnet_aux** — preprocessors (Canny, Depth, OpenPose, DWPose)
4. **ComfyUI-VideoHelperSuite** — `VHS_LoadVideo`, `VHS_LoadImages`, `VHS_VideoCombine`
5. **ComfyUI-Advanced-ControlNet** — advanced weight scheduling, multi-CN
6. **ComfyUI-AnimateDiff-Evolved** — `ADE_AnimateDiffLoaderGen1` + motion modules
7. **websocket_image_save.py** — custom websocket image sink

---

## 5. Model Inventory

All models live under `./comfyui/ComfyUI/models/<subdir>/`.

### Checkpoints (`checkpoints/`)
- `JuggernautXL_v9.safetensors` — primary SDXL base
- `Realistic_Vision_V5.1.safetensors` — SD1.5 base, used by walking workflows
- `DreamShaper_8_pruned.safetensors` — SD1.5 alternative
- SDXL Refiner 1.0

### AnimateDiff motion modules (`animatediff_models/`)
- `mm_sd_v15_v2.ckpt` — **default** for SD1.5 workflows
- `mm_sdxl_v10_beta.ckpt` — for SDXL

### Motion LoRAs (`animatediff_motion_lora/`)
Camera-movement LoRAs (zoom/pan/tilt/roll). Character-action LoRAs are scarce — for actions, rely on OpenPose driving frames, not LoRAs.
- Cseti's walking motion collection (HuggingFace)
- Peter O'Malley's fluid motion collection (HuggingFace)

### ControlNet (`controlnet/`)
- `control_v11p_sd15_openpose.pth` — pose
- `control_v11p_sd15_canny.pth` — structure / detail preservation

### IP-Adapter (`ipadapter/`)
- `ip-adapter-plus_sd15.safetensors` — **primary**
- `ip-adapter_sd15.safetensors`
- `ip-adapter_sdxl.safetensors`

### CLIP Vision (`clip_vision/`)
- `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`

### DWPose (`controlnet_aux/`)
- `dw-ll_ucoco_384.onnx`
- `yolox_l.onnx`

### VAE (`vae/`)
- `vae-ft-mse-840000-ema-pruned.safetensors`

---

## 6. Pose Library

Pre-extracted DWPose frames live in `/mnt/comfyui/input/poses/`. The pre-extracted approach is preferred — saves ~15s per generation vs. running DWPose live, and removes the failure mode where DWPose drops frames on bad source video.

```
/mnt/comfyui/input/poses/
├── walking_front/        # 20 frames, character walks toward camera
├── walking_side/         # side profile walk
├── running/
├── idle/
└── custom/               # user-extensible
```

Currently extracted: **20 male + 20 female** walking frames (front view).

Naming: zero-padded sequential — `0001.png`, `0002.png`, …

`VHS_LoadImages` config for pose loading:
```
directory: poses/walking_front
image_load_cap: 20
skip_first_images: 0
select_every_nth: 1
```

---

## 7. The Triple Control System (CORE TECHNIQUE)

This is the central pattern. **Separate concerns** across three controllers; never let two controllers fight over the same aspect (especially pose).

| Controller | Job | Strength | Notes |
|---|---|---|---|
| **IP-Adapter** | Character appearance (face, colors, style) | **0.95** (animation) / 0.92 (universal bot) | The only thing controlling "how it looks" |
| **Canny ControlNet** | Structural detail preservation (wings, weapons, armor) | **0.35** strength, **end_at = 0.85** | The `end_at` is critical — see below |
| **OpenPose ControlNet** | Walking motion | **0.80** (animation) / 0.75 (universal bot) | Drives leg/body pose from pre-extracted frames |
| AnimateDiff | Temporal coherence across frames | — | `mm_sd_v15_v2.ckpt`, `sqrt_linear` beta schedule |

### Why `Canny end_at = 0.85` matters
Canny preserves detail (held weapons, wing edges) during the first 85% of denoising, then **disables itself** so OpenPose can finish the motion in the last 15%. Without this, weapons disappear because the OpenPose reference frames show empty hands.

### KSampler defaults
- Steps: **28** (balanced) / 20 (fast) / 35 (high)
- CFG: **6.5**
- Sampler: `dpmpp_2m`
- Scheduler: `karras`
- Denoise: 1.0 for full generation; 0.80–0.85 when adapting an existing motion without a dedicated LoRA

### Output defaults
- Frame rate: **8 fps**
- Frame count: **20** (16 fast / 20 balanced / 24 high)
- Resolution: 576×832 (portrait) or 512×768
- Format: `video/h264-mp4`, `yuv420p`, `crf 19`
- File prefix: `CharacterWalk`

Generation time on RTX 3060 12GB: **~2.5 min** for the balanced preset (20 frames @ 28 steps).

---

## 8. Workflows

All workflow JSONs live at the project root. Use these instead of building from scratch.

| File | Purpose | When to use |
|---|---|---|
| `workflow_basic_animatediff.json` | Minimal img→video | Sanity checks, baseline |
| `workflow_advanced_animatediff_with_ipadapter.json` | + IP-Adapter | Style preservation tests |
| `workflow_advanced_CORRECTED.json` / `_FIXED_NODE_NAMES.json` / `_FULLY_FIXED.json` | Iterative fixes on the advanced workflow — `FULLY_FIXED` is the latest good version | Reference for the advanced lineage |
| `workflow_OPENPOSE_IPADAPTER_WALKING.json` | IP-Adapter + OpenPose, live DWPose extraction | When you need to extract poses from a fresh video |
| `workflow_POSE_EXTRACTION_HELPER.json` | DWPose → SaveImage | Run once to build pose library |
| `workflow_OPTIMIZED_PREEXTRACTED_POSES.json` | Triple control + pre-extracted poses | **Fastest path, current production candidate** |
| `workflow_UNIVERSAL_CHARACTER_ANIMATOR.json` | Triple control tuned for arbitrary characters (no per-character prompt tuning) | **Discord bot integration** |

### Bot-relevant node IDs (universal animator)
- **Node 1** — `LoadImage` — user's character image
- **Node 2** — `VHS_LoadImages` — pose frames directory
- **Node 16** — `EmptyLatentImage` — `batch_size` = frame count
- **Node 19** — `VHS_VideoCombine` — output

---

## 9. Hard-Won Lessons (do not relearn these)

1. **ControlNet conflicts cause character duplication.** Two controllers fighting over pose = duplicates. Strict separation of concerns (IP-Adapter ≠ pose; Canny ≠ pose; only OpenPose controls pose).
2. **`Canny end_at` is non-negotiable** for held objects. Default 0.85.
3. **SDXL + epic-fantasy keywords ("epic", "dramatic", "cinematic") trigger ensemble-cast compositions.** Counter with portrait-composition language, vertical aspect ratio, and aggressive negatives (`multiple characters, group, crowd, two people, duplicate`).
4. **Character-action MotionLoRAs barely exist.** Available LoRAs are camera moves and fluid effects. For real character actions, drive with OpenPose frames + denoise 0.80–0.85 + ultra-specific prompt.
5. **Pre-extracted poses beat live DWPose** on both speed and reliability. Always extract once, reuse.
6. **Front-view walking videos give the best DWPose extraction.** Side / back / occluded views degrade quality.

---

## 10. Recommended Negative Prompt (universal)

```
blurry, low quality, distorted, deformed, bad anatomy, extra limbs,
multiple characters, group, crowd, two people, duplicate, twins,
extra arms, extra legs, mutation, watermark, text
```

---

## 11. ComfyUI API Usage (for the Discord bot)

```python
import json, requests

workflow = json.load(open("workflow_UNIVERSAL_CHARACTER_ANIMATOR.json"))
workflow["1"]["inputs"]["image"] = "user_character.png"
workflow["2"]["inputs"]["directory"] = "poses/walking_front"
workflow["16"]["inputs"]["batch_size"] = 20

r = requests.post("http://localhost:8188/prompt", json={"prompt": workflow})
prompt_id = r.json()["prompt_id"]
# Poll GET /history/{prompt_id} for completion
# Output lands in /mnt/comfyui/output/CharacterWalk_*.mp4
```

Endpoints used:
- `POST /prompt` — submit workflow
- `GET /history/{id}` — poll completion
- `GET /view?filename=...&type=output` — fetch result

---

## 12. Troubleshooting Cheatsheet

| Symptom | Fix |
|---|---|
| CUDA OOM | Drop frames to 16, drop resolution to 512×512, or relaunch with `--lowvram` |
| Character duplicates / "twins" | Something other than OpenPose is influencing pose. Verify IP-Adapter weight ≤ 0.95 and Canny is **detail only** (start_at 0, end_at 0.85). Strengthen negatives. |
| Weapon / wing disappears mid-walk | `Canny end_at` too low — raise toward 0.85. Verify Canny strength ≥ 0.35. |
| Stiff legs, no motion | OpenPose strength too low — raise to 0.80+. Or Canny end_at = 1.0 is choking the motion phase. |
| Flicker between frames | Raise steps to 30+, lower CFG to 6, try `euler` or `euler_ancestral`. Check AnimateDiff `context_length`. |
| Models won't load | Filename mismatch — verify exact filenames in section 5. Restart ComfyUI after adding models. |
| DWPose returns garbage skeleton | Source video quality issue. Use pre-extracted poses instead. |

---

## 13. Quick Reference

```bash
# Activate
source comfyui-venv/bin/activate

# Launch (exposed for API)
cd comfyui/ComfyUI && python main.py --listen 0.0.0.0 --port 8188

# Update everything
pip install --upgrade pip
# Custom nodes: use ComfyUI-Manager in the web UI

# Useful paths
/mnt/comfyui/input/poses/          # pose library
/mnt/comfyui/output/                # generated videos
./comfyui/ComfyUI/models/           # all model weights
./comfyui/ComfyUI/custom_nodes/     # extensions
```

---

*Keep this file updated when adding new pose sets, models, or workflows.*
