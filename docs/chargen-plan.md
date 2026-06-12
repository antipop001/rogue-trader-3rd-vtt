# In-Foundry Character Builder — Stage A & B Plan

> **Status 2026-06-11:** Stages A **and B** implemented, tested (51 node cases,
> `npm test`), deployed to foundrySB, Playwright-verified (`tests/e2e/verify_chargen.py`,
> `tests/e2e/verify_chargen_b.py` — full Void Born → Rogue Trader build through the
> real UI; run with `~/RTT_MAKER/.venv/bin/python`, system python lacks playwright).
> Local commits `c6d270f` (A) + `f4eb7c7` (B), not pushed — cut as 0.8.0. Implementation notes: AppV2 reserves
> `state` (read-only getter) — the wizard's builder state lives in
> `this.chargenState`; the wizard uses the replay model (`this.inputs` is the
> source of truth, ChargenState rebuilt on every change); chargen NEVER writes
> the legacy `bio.homeWorld` field ("Forge World"/"Hive World" collide with the
> DH2 `homeworlds()` list and would inject DH2 backgroundEffects). Next: Stage C
> (career rank-1 advance tables + XP spend).

Goal: port the RTT_MAKER character builder (Python, `/home/ahermon/RTT_MAKER`) into
the rogue-trader-3rd Foundry system as a guided chargen wizard. This document
covers **Stage A (data + characteristics)** and **Stage B (origin path with
mechanical effects)**. Stages C (career + XP spend) and D (gear + acquisition)
are out of scope here.

Key prior art (do not re-derive):

- `RTT_MAKER/rogue_trader/data/*.json` — rules-as-data with declarative effects,
  provenance, ItS intersections. Reused verbatim (vendored copy).
- `RTT_MAKER/rogue_trader/export/foundry.py` — the **validated** field mapping
  onto this system's acolyte schema (char keys, 49-skill key table, specialist
  specialities, `_ADVANCE = {basic:0, trained:1, +10:2, +20:3}`, origin-step →
  `bio.originPath` keys, career keys matching `rules/origin-path/careers.mjs`).
  Port its tables; do not invent new mappings.
- `RTT_MAKER/rogue_trader/{characteristics,origin,models}.py` — the engine
  semantics to port (~1,400 lines for A+B), pinned by the Python test suite.
- Design rule (user): **every rolled value supports player-entered results**
  (physical dice at the table). Applies to characteristics, wounds, fate,
  insanity/corruption rolls.

---

## Stage A — data pipeline + Stage-1 Characteristics (target: 0.8.0)

### A1. Vendored rules data

- New dir `src/module/chargen/data/` with copies of the RTT_MAKER JSON needed
  for A+B: `home_worlds.json`, `birthrights.json`, `lure_of_the_void.json`,
  `trials_and_travails.json`, `motivations.json`, `warrant_and_ship.json`,
  `species.json`. (Careers advance tables wait for Stage C; the career *step*
  in B only needs the option list already in `rules/origin-path/careers.mjs`.)
- Vendored copy, not a cross-repo reference — this repo is published and must be
  self-contained. Add `tools/sync_chargen_data.py` (stdlib, `--dry-run` default /
  `--execute`) that copies from `~/RTT_MAKER/rogue_trader/data/` and stamps
  `_meta.vendored_from` + date. Re-run when RTT_MAKER data changes.
- Runtime loading: gulp's `STATIC_FILES` already copies `src/module/**/*`, so no
  build change. `module/chargen/data.mjs` exposes a cached
  `loadStep(step)` → `fetch('systems/rogue-trader-3rd/module/chargen/data/<step>.json')`.
- IP posture: mechanical data + short trait one-liners with source/page —
  consistent with the existing talents/traits pack practice.

### A2. Engine core port (pure JS, no UI, no Foundry-document access)

- `module/chargen/characteristics.mjs` — port of `characteristics.py`:
  the 9 characteristics + abbr↔key tables, `bonus()` (tens digit), generation
  methods **Roll (2d10+25 each)** / **Roll pool + assign** / **Manual entry** /
  **Fixed 36**, `range_warnings()` (warn-only, never block), species base
  profiles (`species_set`, used in B).
- `module/chargen/state.mjs` — `ChargenState`: plain serializable mirror of the
  Python `Character` builder state: per-characteristic `{base, modifiers:[{source,
  amount}]}`, granted skills/talents/traits, origin selections, pending
  choices/rolls, `originXpSpent`, wounds/fate, log. Round-trips through JSON —
  it is stored in `flags.rt.chargen` on commit (resume + audit).
- Dice are **injected** (`{roll(n,sides)}` interface): the wizard passes a
  Foundry `Roll`-backed implementation (rolls go to chat); tests pass a stub;
  manual entry bypasses dice entirely.
- `module/chargen/mapping.mjs` — direct port of `foundry.py`'s `_CHAR_KEY`,
  `_SKILL_KEY`, specialist-skill + speciality tables, `_ADVANCE`,
  `_ORIGIN_STEP`, career-key table.

### A3. Commit-to-actor

- `module/chargen/commit.mjs` — `ChargenState` → actor data. Stage-A scope:
  - `system.characteristics.<key>.base` = generated base;
    `.modifier` = sum of origin modifiers (0 in Stage A — but wired now, so B
    gets the proper base/modifier split the Python exporter couldn't do).
  - actor name; `flags.rt.chargen` = serialized state.
  - Modes: create a new acolyte, or apply to an existing acolyte (confirm
    overwrite if the target has non-default characteristics).

### A4. Wizard shell (ApplicationV2)

- `module/applications/chargen-wizard.mjs` — `ApplicationV2` +
  `HandlebarsApplicationMixin` (NOT FormApplication; the V1 prompts are legacy).
  Honour the V2 gotchas memory: contentClasses vs frame classes, no `.rt-wrapper`
  reuse — the wizard gets its own top-level SCSS scope (`.rt-chargen`), imported
  at top level in `rogue-trader-3rd.scss`, **outside** any wrapper block
  (gotchas #11/#12).
- Layout: left rail listing stages (1 Characteristics, 2 Origin Path, 3 Career &
  XP *(disabled — Stage C)*, …), content pane, Back/Next, persistent
  warnings strip (range warnings, illegal picks).
- Stage-1 pane: method selector; per-characteristic row (name, base, bonus);
  Roll / Roll All buttons (chat-visible) AND editable inputs for table dice;
  pool mode shows the 9 rolled values to drag/assign.
- Entry points: a **"Character Creation"** button in the Actors directory footer
  (`renderActorDirectory` hook), plus a header control on acolyte sheets that
  have a `flags.rt.chargen` in-progress state (resume).
- Templates under `src/templates/chargen/`; SCSS `src/scss/components/_chargen.scss`.

### A5. Verification & release

- Add a minimal `node --test` harness for the pure modules (`tests/chargen/` in
  repo, not shipped in STATIC_FILES — exclude pattern like foundry-core).
  Mirror representative cases from RTT_MAKER's pytest suite (bonus math, pool
  assignment, range warnings, state round-trip).
- Playwright against live foundrySB: drive the wizard end-to-end, create an
  actor, assert characteristic values on the sheet.
- Ship as **0.8.0** (first chargen release; new minor).

---

## Stage B — Origin Path with mechanical effects (target: 0.8.x, 2–3 releases)

### B1. Effects interpreter (`module/chargen/origin.mjs`, pure JS)

Port of `origin.py` (849 lines). Semantics to preserve exactly:

- **Effect kinds:** `char_mod`, `char_mod_choice` (pool `"any"` or list),
  `grant_skill`, `grant_talent` (optional `condition {char,min,max}` evaluated
  against current values), `trait`, `profit_factor`, `fate`, `wounds`,
  `insanity`/`corruption` (fixed `amount` or `dice`+`bonus`), cross-step
  `substitute {target,replacement}`, nested generic
  `choice {id, options:[{label, effects}]}`.
- **Option metadata:** `xp_cost` — **hard debit** against the 500 starting pool;
  overspend throws (`OriginError` equivalent) — the one deliberate exception to
  warn-don't-block. `requires`/`excludes` clause groups
  (`{any_of|all_of: [{step,option}|{step,source}|{species}|{career}]}`),
  `substitutes_for`, `distinct_group` ("choose N distinct"), Warrant & Ship
  2-D chart adjacency.
- **Query API for the UI:** `legalOptions(state, step)`,
  `illegalityReasons(state, option)`, `availableChoiceOptions(...)`,
  `warrantLegalNext(...)` — dropdowns show only legal options from day one
  (this was still a polish TODO in RTT_MAKER; do it right here).
- `computeStartingWounds` (TB×mult + dice + flat) and `computeStartingFate`
  (d10 threshold table) with `roll` override for manual entry.
- Unresolved decisions/rolls become pending entries on the state; the wizard
  resolves them inline before allowing Next.

### B2. Wizard origin-path steps

- Step order: **Species** (Stage 1b — Human default; Kroot/Ork replace Home
  World and gate `{species}` clauses) → Home World → Birthright → Lure of the
  Void → Trials & Travails → Motivation → **Warrant & Ship** (optional, ItS) →
  Career (selection only; advances are Stage C).
- Per step: option cards/dropdown filtered to legal options, source filter chip
  (Core / +Into the Storm), provenance shown (`source p.NN`), `xp_cost` badge,
  running origin-XP meter (spent / 500).
- Choice resolution inline: `char_mod_choice` pools, generic choices,
  distinct-group pickers ("choose N, no repeats"). Rolls (insanity/corruption
  dice, wounds 1d5, fate d10) each get **Roll-to-chat or type-the-result** —
  never app-roll only.
- Re-entering an earlier step invalidates downstream picks (the Python engine is
  apply-once; the wizard replays the state from inputs — same model as
  RTT_MAKER `persistence.py`: store *inputs*, recompute state).

### B3. Commit mapping (extends `commit.mjs`)

Reuse `foundry.py` decisions verbatim:

- char modifiers → `.modifier` (base stays the rolled base — improvement over
  the export's fold-into-base).
- skills → `system.skills.<key>.advance` via `_ADVANCE` (basic→0, trained→1);
  specialist skills → `specialities.<spec>` with `taken: true` + advance.
  Unmapped names: wizard warning + appended to `system.bio.notes` (mirror
  `mapping_gaps()` — never silently dropped).
- talents → fetch from the **talents compendium by name** (full benefit text);
  fallback to a synthesized stub item. For pickable talents
  (`flags.rt.pickable`): the wizard already resolved the choice, so pre-set
  `system.choice` (+ name suffix + ActiveEffect, reusing
  `hooks-manager.mjs` helpers) so `onCreateItem` does not re-prompt.
- traits → traits compendium by name, else stub trait item with the data text.
- origin selections → `system.bio.originPath.<step>.{value,notes}` using the
  existing dropdown keys (foundry.py's `_ORIGIN_STEP` + career-key tables);
  Warrant & Ship has no originPath slot → bio notes. Keeps the current sheet
  fully compatible.
- wounds → `system.wounds.{max,value}` + `rolled: true`; fate →
  `system.fate.{max,value}` + `rolled: true`.
- insanity/corruption → `system.insanity` / `system.corruption`.
- profit-factor effects: summed and shown at the end; **GM-only button** to add
  to the world PF setting (it is world-level in this system), else bio note.
- experience: total 5000? No — Stage 3 pool is 500: set
  `system.experience.total = 500`, `used = originXpSpent` (Stage C will own XP
  properly).
- full input log + state → `flags.rt.chargen` (resume; audit; future re-edit).

### B4. Verification & releases

- `node --test`: port ~30 representative origin cases from the Python suite
  (legality/intersections, xp_cost overspend throws, distinct groups, warrant
  adjacency, substitute, conditional talent grants, wounds/fate math).
- Playwright e2e on foundrySB: build a known character (e.g. Void Born →
  Vaunted → … → Rogue Trader from the Core example), commit, assert sheet
  values + embedded talent/trait items.
- Suggested cuts: **0.8.1** = B1 interpreter + tests (can ship dark),
  **0.8.2** = origin UI + commit (the visible release). Adjust to taste.

---

## Open items / risks (check during B, not blockers)

1. **DH2-legacy `backgroundEffects`** (`documents/acolyte.mjs:269+`) keys off
   free-text `bio.homeWorld` against the DH2 `rules/homeworlds.mjs` list.
   Verify it's display-only and that RT origin names don't accidentally match a
   DH2 entry; if they can, stop writing legacy `bio.homeWorld` from chargen.
2. **Option-name → dropdown-key mismatches**: foundry.py has the career and
   origin-step tables; spot-check all 6 steps' option keys against
   `rules/origin-path/*.mjs` during B3 (ItS broad-heading entries esp.).
3. **Compendium name matching** for talents/traits granted by origin data —
   run a one-off audit script (data names vs pack names) before B2 UI work so
   gaps surface early.
4. **Wizard styling** — own `.rt-chargen` scope, top-level SCSS import; run the
   doubled-wrapper grep before every release (gotcha #12).
