# specs/ — frozen requirements

These files are the **ground truth** the Ralph loop builds against. Each file is a
list of numbered, testable requirements. `fix_plan.md` tasks cite a requirement ID
(e.g. `CAR-002`) so every change traces back to a spec.

## ⚠️ Provenance / freeze status

**Branch `ralph/backgrounds` (off `main`), focus retargeted 2026-06-23.** The
in-Foundry chargen **wizard is shelved** (parked on `ralph/chargen`, UI disabled,
kept out of releases). This branch's loop authors **content**: turning the ~95
Origin-Path background traits (+ 3 stray talents) that the origin data grants into
real, automated `traits`/`talents` compendium items, so they work like everything
else. Canon source: RT Core + Into the Storm (`/mnt/project_data/RT/RT-DOCS/`); the
trait NAMES come from `src/module/chargen/data/*.json`.

The wizard-parity specs `01`/`02`/`03` (career/XP, equipment/dynasty, powers/taint/
validation) stay with the shelved wizard on `ralph/chargen` and are NOT present here.

**Review/edit before kicking off a long run** — the loop treats every `REQ` as a
hard requirement. Canon correctness is NOT gate-checked; authored content is logged
to `.ralph/data-vendor-queue.md` for separate RT-rules review.

## Requirement ID convention

`<AREA>-<NNN>`. Active areas (this branch):
- `ARCH` — architecture invariants (engine purity, vendored data)
- `PROC` — process / quality gates
- `BG`   — background trait authoring (Origin-Path → real automated compendium items)
- `TAL-FIX` — resolve the stray origin-granted talents that still stub

Shelved with the wizard on `ralph/chargen` (not used here): `VEND`, `CAR`, `EQP`,
`DYN`, `ACQ`, `POW`, `TAINT`, `VAL`, `TPRE`, `HYG`.

A requirement is **MUST** (RAW-mandated or architectural invariant) or **SHOULD**
(desired depth/UX; the loop may defer if `fix_plan.md` deprioritises it).

## Files
- `00-architecture-and-process.md` — engine/data separation, vendored data, the gate.
- `04-backgrounds-compendium.md` — the active spec: authoring schema (trait YAML,
  ActiveEffects, conditionalBonuses, pickable), name-resolution rules, BG/TAL-FIX
  requirements, the coverage ratchet.

## Scope
- **Game scope:** Rogue Trader Core Rulebook + Into the Storm only (per CLAUDE.md).
- **Canon source:** `/mnt/project_data/RT/RT-DOCS/` — cite the page in each item's
  `source:`. Do not invent rules.
- **Out of scope:** the chargen wizard (shelved), re-vendoring chargen data, a
  separate backgrounds pack, export/derived-stat work.
