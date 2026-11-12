# Rogue Trader 3rd Edition (Foundry VTT)

Unofficial Foundry VTT system for **FFG's Rogue Trader 1e** content using **Dark Heresy 2nd Edition mechanics** as its rules base, progressively migrated to RT 1e canon mechanics. The "3rd Edition" in the name refers to the system iteration, not a game edition — there is only one printed RT edition.

Forked from mrkeathley's Dark Heresy 2 system. Authored by MortarionUA. Compatible with Foundry VTT v13–v14.

Shared homelab conventions (drive layout, `agy` review gate, Ralph loop contract, skynet/ComfyUI hosts) live in the parent `/mnt/project_data/projects/CLAUDE.md` — this file carries only what is specific to this project.

**Current version: 0.9.28** (2026-09-15). Release history: **`CHANGELOG.md`** (newest first, one entry per release with root cause / canon cite / verification). Open engine bugs: `BUGS.md`; QA audit backlog: `QA_FINDINGS.md`; authored content awaiting RT-rules review: `.ralph/data-vendor-queue.md`; pre-0.5.0 audit snapshot: `docs/history/2026-05-system-audit.md` (superseded — context only).

## Where things live

| Path | What |
|---|---|
| `src/template.json` | Actor/Item schema + type registry. **Deploy the root copy** whenever it changes. |
| `src/module/documents/{acolyte,npc,voidship}.mjs` | `prepareData` pipeline (characteristics, skills, armour, wounds, encumbrance, component bonuses) |
| `src/module/rolls/{roll-data,action-data,damage-data,assign-damage-data}.mjs` | To-hit → damage → soak pipeline |
| `src/module/rules/*.mjs` | Pure-ish rules helpers (conditions, grapple, fear, degradation, drugs, ship-combat, endeavours-helpers, vehicle/voidship crit tables, ship-roles) |
| `src/module/chargen/` | Origin-Path engine + commit mapping (wizard UI **shelved** — see below) |
| `src/packs/<pack>/<pack>.yml` | Compendium source of truth; `.db` files are generated |
| `tests/chargen/*.test.mjs` | `npm test` (node --test). Many are **source-level** regressions because the roll classes aren't node-importable |
| `tests/e2e/*.py` | Playwright checks against rt-smoke |
| `tools/agy_check/` | Cross-model pre-commit review gate (see parent §2a) |
| `tools/compendium_qa/` | Deterministic pack-vs-RT-DOCS diffs (`weapons/armour/psychic/cybernetics/availability_diff.py`) + `gear_qa.py` report |
| `tools/npc_pipeline/` | NPC extraction, YAML assembly, data fixes, ComfyUI portrait scripts |
| `tools/runtime_exerciser/exercise_rolls.py` | Drives every real roll entry point on rt-smoke across forced success/failure |
| `loops/{effects-audit,antigravity-qa}/` | Ralph loop kits (root `run_ralph.sh`; `loops/antigravity-qa/run_agy_qa.sh` supports `FOCUS=`) |

## Build & gate

- `npm run build` — full build into `build/rogue-trader-3rd/` (`build/` is gitignored; run it before the first deploy of a session)
- `npm run build:check` — lean gulp `compile` (clean+scss+copy+packs, no release zip)
- `npm test` — node tests
- `npm run packs` — rebuild `.db` from YAML · `npm run scss` · `npm run watch`

**Gate for every change:** `build:check` + `npm test` green, then live-verify on rt-smoke. Non-trivial rules/engine fixes also go through `tools/agy_check/agy_check.sh` (APPROVE before commit). It's a gate, not an oracle — overriding a stylistic REVISE point with a documented rationale is fine.

## Working standards (earned the hard way)

- **Canon source = local RT-DOCS first** (`/mnt/project_data/RT/RT-DOCS/`), cite verbatim + page. NotebookLM holds only CoreBook + Into the Storm + Errata — useless for supplements, and its inference has deleted correct rules before (Maximal +2 Pen, 0.8.25 → restored 0.8.42).
- **Errata v1.4 overrides the corebook** (e.g. Righteous Fury = one extra 1d10, cascading).
- **Never let an LLM produce a shipped stat value.** Extract deterministically (column-mapped table parsing) and validate the tool against known-good entries first.
- **Loop / agy findings: trust the area, verify the code read and the citation.** Discovery agents have repeatedly hallucinated code that doesn't exist (BUG-Q-260/261) and cite DH2 rules. Triage against actual source + verbatim canon before fixing.
- **QA after every content batch** (compilePacks + `gear_qa.py` + tests + live pack counts) — it caught truncation/off-by-one bugs in 0.9.18/0.9.21/0.9.22.
- **Verify as the failing actor/permission, with real hit-tested clicks, on successful outcomes** (0.8.33: a success-only crash hid behind GM + JS `.click()` + single rolls).
- Design rule for combat outcomes: **test-gated → `[Apply: X]` button; deterministic → auto-apply.**

## Foundry gotchas specific to this system

- **Item grants (`flags.rt.grants`):** defer off the `createItem` hook turn (`setTimeout`) AND embed on a freshly fetched `game.actors.get(actor.id)` — the hook's `item.parent` goes stale after an AE re-prepare and `createEmbeddedDocuments` on it **hangs**.
- **`_source` reads must be idempotent** — `_computeCharacteristics` runs twice per `prepareData` (before/after AEs). Derive from immutable `_source`, never mutate it.
- **Schema additions back-fill defaults into every actor's `_source`** — a new numeric field reads as `0`, not absent (0.9.6 wounds collapse). Treat `0` as "not migrated" where 0 is impossible.
- **AppV2 has a read-only `state` getter** — don't name a property `state`.
- **DialogV2 strips nested `<form>`** — dialogs reading `button.form` migrate cleanly; ones reading a specific nested form must be restructured or stay V1. Close DialogV2s via `foundry.applications.instances`, not `element.close()`.
- **`new Roll()` rejects non-string formulas** — coerce with `String()`.
- **`_getAttackSpecials` matches flags via `capitalize(flag)`** — camelCase/multi-word quality flags (`cleansingFire`, `gyroStabilised`) must be read directly off `weapon.system.special`.
- **`getFlag/setFlag` validate scope** — use `rogue-trader-3rd`, not the raw `flags.rt` key.
- **SCSS:** partials are imported under `.rt-wrapper { … }`; compound `& &` or `#{&}` modifiers compile to impossible `.rt-wrapper … .rt-wrapper` selectors. Check: `grep -E '\.rt-wrapper [^,{]+ \.rt-wrapper' build/rogue-trader-3rd/*.css`. Sheet partials (`sheets/actor`) sit outside `.rt-wrapper` because V2 puts both classes on one element.
- **Embedded items in Actor packs** need every schema-required template field, string `range`/`penetration`, and 16-char `[A-Za-z0-9]` `_id`s — otherwise they're silently dropped.
- More V2 notes: `~/.claude/projects/-home-ahermon/memory/reference_foundry_v2_sheet_gotchas.md`.

## Shelved: chargen wizard

The in-Foundry chargen wizard (Stage A characteristics + Stage B origin path) is **shelved reversibly**: the `renderActorDirectory` button hook is commented out in `hooks-manager.mjs` and `AcolyteSheetV2.CHARGEN_UI_ENABLED=false`. Code is intact; the parked branch is `ralph/chargen`. `module/chargen/commit.mjs` is still used to resolve origin-path grants by exact name. **Never write legacy `bio.homeWorld`** (Forge/Hive World collide with old DH2 names).

## Test environment (foundrySB)

| Property | Value |
|---|---|
| CTID | 211 (foundrySB) |
| IP / URL | 192.168.11.36 · http://192.168.11.36:30000 |
| Foundry / Node | v14.361 · v24.15.0 |
| World | rt-smoke |
| App / Data / Log | `/opt/foundry` · `/var/lib/foundrydata` · `/var/log/foundry.log` |
| SSH | `ssh -i ~/.ssh/foundry_test project@192.168.11.36` |

### Deploy loop

1. `npm run build`, then rsync **each subdirectory** of `build/rogue-trader-3rd/` to its matching subdirectory under `/var/lib/foundrydata/Data/systems/rogue-trader-3rd/` (never two sources into one dest — they collide). Include the root `template.json` when the schema changed.
2. `sudo systemctl restart foundry.service`.
3. **Compendium changed?** Foundry V14 caches each `.db` as a LevelDB subdirectory and then ignores `.db` changes silently, even across restarts. Drop the caches:
   ```bash
   sudo systemctl stop foundry.service && \
   sudo rm -rf /var/lib/foundrydata/Data/systems/rogue-trader-3rd/packs/*/ && \
   sudo systemctl start foundry.service
   ```
   (`*/` removes only the root-owned LevelDB dirs, not the `.db` files.)
4. A restart drops Foundry to the SETUP screen (rt-smoke no longer auto-launches). Relaunch from an admin page session: `fetch('/setup',{method:'POST',body:JSON.stringify({action:'launchWorld',world:'rt-smoke'})})`.

### Headless debugging (Playwright)

Use **`/mnt/project_data/tools/playwright-venv/bin/python`**: the older 3.12 venvs (`~/.venvs/playwright`, `~/RTT_MAKER/.venv`) broke when the host moved to Python 3.14 (parent §1). Export `PLAYWRIGHT_BROWSERS_PATH=/mnt/project_data/playwright` in non-login shells. Log in at `/join` as Gamemaster. Since v14 build 370 the user select is `select[name='userId']` (it was `userid`). The GM seat is single-occupancy, so the user must log out of their tab first. Weapon/psychic attacks need a controlled token and an equipped weapon. Template: `tests/e2e/verify_reaction_fate.py`.

- **Disable the canvas for real clicks:** headless Chromium rendering the WebGL canvas starves the main thread, so `click()`, `bounding_box()` and screenshots hang. Run `game.settings.set('core','noCanvas',true)` and reload; it's a client setting, so only the test browser is affected.
- **Expand the sidebar:** it starts collapsed off-screen (buttons report "outside of the viewport"). Call `ui.sidebar.changeTab('chat','primary'); ui.sidebar.expand()`.
- **Activate test combats:** a test `Combat` must be `activate()`d as well as `startCombat()`ed, or `game.combat` is a different combat and Reaction-budget code silently doesn't run.
- **Relaunching the world:** the box now hosts other systems' worlds and rt-smoke does **not** auto-launch after a restart. After restarting Foundry, relaunch it from `/setup` with the admin password (ask the user; never write it into a file).

RNG forcing: `CONFIG.Dice.randomUniform=()=>0.05` forces MAX; `modifiedTarget` is a getter — set `baseTarget`; forcing every die to 10 makes `1d10x10` throw max-recursion — force only the base die.

### Release zips

The box has 2 GB RAM; `gulp createArchive` gets OOM-killed. Stream the zip straight to `/mnt/project_data/RT/rt-vtt-archive/` (no `zip` binary on this host):
```bash
python3 - <<'PY'
import os, zipfile
src="build/rogue-trader-3rd"; dest="/mnt/project_data/RT/rt-vtt-archive/rogue-trader-3rd-vtt-<VER>.zip"
with zipfile.ZipFile(dest,"w",zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for r,_,fs in os.walk(src):
        for f in fs: z.write(os.path.join(r,f), os.path.relpath(os.path.join(r,f), src))
PY
```
Entries are relative to `build/rogue-trader-3rd/` so `system.json` sits at the zip root. This repo (incl. `.git`, ~1.5 GB) is on the mount, outside the CT 330 backup — push to GitHub.

## Schema notes

- **Talents** keep a DH2-shaped schema (`aptitudes`, `tier`, `prerequisites`, `benefit`, `cost`) — convention `aptitudes: ''`, `tier: '1'`; `tier` is unused. The aptitude *system* was removed in 0.8.11.
- **Weapons:** `class` (Pistol/Basic/Heavy/Melee/Thrown), `type`, `damage`, `damageType` (Energy/Explosive/Impact/Rending), `penetration`, `range`, `rateOfFire {single,burst,full}`, `clip {max,value}`, `reload`, `special {…}` (parameterised qualities carry a level, e.g. `blast: 3`), `weight`, `availability`, `craftsmanship`, `jammed`, `recharging`.
- **Armour:** `armourPoints {head,leftArm,rightArm,body,leftLeg,rightLeg}`, `stacksArmour` (worn-over items add instead of competing for max), `type`, `weight`, `availability`. (`maxAgility` was removed in 0.8.6.)
- **Wounds:** `max` is fully derived — `resolveWoundsBase(startingTB, roll, …)` = `2×startingTB + roll` (Chronicle tab), falling back to legacy `base`/`max`; plus `wounds.modifier` from effects.
- **Skills:** 49 RT 1e skills, advance is a level **index** 0..3 (Untrained/Trained/+10/+20), never the bonus magnitude. Untrained Basic = half characteristic; untrained Advanced blocked.
- **Ship components:** `bonuses {…}` summed into `system.componentBonuses` by `_computeComponentBonuses` (skips Destroyed/Unpowered). Pack YAML for ship components is **append-only** — a regression test slices by byte distance.
- Compendium YAML layout puts each item's `data:` block **above** its `name:` — don't misread it.

## Source-of-truth conventions

- `source: "Rogue Trader Core Rulebook, p.XX"` / `"Into the Storm, p.XX"` / `"<Supplement name>, p.XX"`. Packs now include supplement content (0.9.13+), not just Core + ItS + Errata.
- Authored or extracted content that the gate can't judge goes to `.ralph/data-vendor-queue.md`.

## Content extraction

1. **`/mnt/project_data/RT/RT-DOCS/`** — per-book `<book>.pdf/markdown.md` + `pages/page-N/`. `grep` it first.
2. **NotebookLM** notebook `cd87d917-4cea-45b3-b27c-a149070b1826` — CoreBook/ItS/Errata synthesis only (parent §5).

RT-DOCS quirks:
- `CoreBook-1-200.pdf` lost its stat tables (descriptions only); `CoreBook-201-401.pdf` has them as markdown tables. Early Ch.VIII components: stats in part 2, descriptions in part 1.
- Some headers lose their `#`; use a plain-line fallback.
- British/American spelling drift (Gellar/Geller, Auger/Augur) and curly vs straight apostrophes — normalise before name matching/dedup.
- OCR artifacts: `S`→`$` in RoF, `S–/–`, doubled class cells, cross-bled descriptions (augur arrays) — read the source table, not the pack prose.
- Adventure books hide player gear in prose reward tables that the header-signature auto-detector skips.

## NPC compendium + portraits

20 GM-only `<book>-npcs` Actor packs (~338 NPCs), built by `tools/npc_pipeline/` (`extract_all_npcs.py` → `build_npc_yaml.py` / `build_all_npc_yamls.py`; `SKILL_MAP` maps display names → keys; `apply_npc_fixes.py` / `recover_plain_trained_skills.py` for data passes). Token size comes from the `Size (X)` trait per `size.md`. Remaining skill-less NPCs are creatures, stat-by-reference entries, or supplement OCR failures.

Portraits come from ComfyUI on **skynet VM 500** (`http://192.168.11.22:8188`, see parent §4 — the old `whisperx` LXC is gone; SSH as `ahermon` with `~/.ssh/skynet_ed25519`). JuggernautXL v9 + `Oldhammer` LoRA (0.45–0.60) + faction LoRAs (Aeldari/Ork-Boyz/Tau/Astartes); scripts `comfy_npc_img2img.py` (canon-ref img2img, denoise 0.50–0.65), `comfy_npc_reframe.py` (portrait-bust txt2img 1024²), `comfy_npc_stylize.py` (style-unify, denoise 0.30); `audit_face_framing.py` → `BAD_FRAMING.md`. **Strict-check every portrait against its canon reference** before committing — niche xenos (Kroot especially) drift to nearest-neighbour species; counter each named drift with a targeted negative prompt (`~/.claude/projects/-home-ahermon/memory/feedback_canon_strict_check.md`). Never install ComfyUI-Manager (the 2026-05 RCE vector).

## Documented deviations from RT 1e (deliberate)

1. **Parry is also a skill** (Basic, WS) so it can take advances; the roll reads the equipped melee weapon's Balanced/Defensive/Unwieldy/craftsmanship/`parryBonus`.
2. **`DarkHeresy*` class names** remain — cosmetic, not worth the churn.
3. **Boarding and hit-and-run share one opposed-Command resolver** (`rollBoarding`); only the attack/defend asymmetry is modelled.
4. **Strategic-Round positioning stays on the GM's canvas** (1 square = 1 VU); the system takes VU distance + arc as inputs.
5. **Good armour (+1 AP first attack/round) and Poor armour (−10 Ag)** are not automated.
6. **Primitive + Scatter at long range stack to ×4 armour** (literal reading; GM may house-rule ×2).
