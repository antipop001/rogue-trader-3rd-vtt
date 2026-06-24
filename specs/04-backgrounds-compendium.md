# 04 — Origin-Path "Background" compendium automation

Turn the ~95 background traits (and 3 stray talents) the Origin-Path data grants
into REAL, fully-automated compendium items, so they "work like everything else":
drag-drop onto a sheet, ActiveEffects auto-apply, and they resolve at chargen
commit instead of stubbing. The in-Foundry chargen **wizard is shelved** (parked on
branch `ralph/chargen`, UI disabled) — this loop authors **content**, not wizard UI.

Canon source: RT Core + Into the Storm markdown under `/mnt/project_data/RT/RT-DOCS/`
(grep it; cite the page in each item's `source:`). The exact trait/talent NAMES to
author are the grant effects in `src/module/chargen/data/*.json` — these JSON files
are the read-only worklist (vendored; never hand-edit them). Match each new item's
`name:` BYTE-FOR-BYTE so `commit.mjs` resolves it (exact, case-sensitive lookup —
`commit.mjs` ~L120-138 keys `traitIndex`/`talentIndex` by `name`).

## Where the items go
- Traits → `src/packs/traits/traits.yml` (multi-doc YAML, `---` separated).
- The 3 talents → `src/packs/talents/talents.yml`.
- The `.db` files are build artifacts; `npm run build:check` rebuilds them. Hand-edit
  ONLY the `.yml`.

## Authoring schema (match the EXISTING entries exactly)

### Plain trait (no mechanical bonus — descriptive / narrative)
```yaml
data:
    description: 'Canon rules text, prose. Quote the book faithfully; do not invent.'
    source: 'Rogue Trader Core Rulebook, p.XX'   # or 'Into the Storm, p.XX'
img: 'systems/rogue-trader-3rd/icons/talents/blue/b_18.png'
name: 'Void Accustomed'        # EXACT match to the data/*.json grant name
type: 'trait'
flags:
    rt:
        category: 'Background'   # SHOULD: keeps the now-large pack browsable
        originStep: 'Home World' # Home World | Birthright | Lure | Trials | Motivation | Warrant | Ork | Kroot | Taint
```
Pack trait entries use top-level `data:` (description/source), NOT `system:`. No
`_id`, no `level:`, no `system:` block (Natural Armour carries no level in the pack —
level is per-actor instance data). Do not add fields the existing entries don't have.

### Trait that grants a persistent characteristic/skill bonus (ActiveEffect)
Add a top-level `effects:` array, copying the talents-pack pattern verbatim
(exemplar: **Hotshot Pilot**, `talents.yml` ~L1429-1456):
```yaml
effects:
- _id: <16-char [A-Za-z0-9], unique across the pack>
  name: 'Void Accustomed'
  img: 'systems/rogue-trader-3rd/icons/talents/blue/b_18.png'
  description: ''
  origin: ''
  disabled: false
  transfer: true          # applies while the item is on the actor
  tint: null
  statuses: []
  duration: { startTime: null, seconds: null, combat: null, rounds: null, turns: null, startRound: null, startTurn: null }
  changes:
  - key: 'system.characteristics.toughness.modifier'   # or system.skills.<key>.modifier
    mode: 2                                             # 2 = Override — the pack convention; match it
    value: '5'                                          # value is a STRING
    priority: null
  flags: {}
```
- Characteristic keys: `weaponSkill ballisticSkill strength toughness agility
  intelligence perception willpower fellowship`.
- Skill keys are camelCase (`commonLore`, `silentMove`, `forbiddenLore`, …); verify
  the exact key in `template.json` before using it.
- **`_computeSkills` runs twice** around `super.prepareData()` so AE-written
  `.modifier` feeds `skill.current`. The mode-2 convention is what the existing pack
  uses — match it for consistency ("work like everything else"); do NOT switch to
  mode 1 unless an item genuinely must stack with another source AND you document it.

### Situational / conditional bonus ("+10 when …", "vs …")
Use `flags.rt.conditionalBonuses` (exemplar: **Berserk Charge**, `talents.yml` ~L232),
NOT an always-on AE — it renders as an opt-in checkbox at roll time
(`base-actor.mjs:collectOptionalBonuses`):
```yaml
flags:
    rt:
        category: 'Background'
        conditionalBonuses:
        - applies: { skills: [], characteristics: [weaponSkill] }
          value: 10
          label: 'when …'
```

### "Choose one" outcomes
If a trait/talent name ends in `(choose one)` / `(chosen X)`, use `flags.rt.pickable`
`{kind, options}` (exemplar **Talented** ~L789; kinds: `skill`, `weaponClass`,
`group`). The `onCreateItem` hook (`hooks-manager.mjs` ~L193-223) prompts and, for
`kind: skill`, auto-builds the AE. Prefer resolving to an existing pickable talent by
exact base-name over duplicating.

### Unnatural-characteristic traits (e.g. `Unnatural Toughness (x2)`)
These are not a flat `.modifier` bump. Before authoring, check how the actor applies
"Unnatural" (grep `acolyte.mjs` / NPC pipeline for `unnatural` and existing
Unnatural-X handling) and wire via that mechanism. If it can't be expressed as an AE,
author the item with correct text + `system.level`/the documented field and note the
limitation in the data-vendor-queue.

## Do NOT double-apply already-handled effects
The dynasty/warrant label traits (`Acquisition: …`, `Contacts: …`, `Fortune & Fate:
…`, `Sanction: …`, `Warrant Age: …`, `Warrant Renown: …`, `Dynastic Warrant`) are
narrative chart outcomes whose Profit-Factor / Ship-Point / characteristic effects are
ALREADY applied by sibling `profit_factor`/`ship_points`/`char_mod` effects in the
origin data. Author these as proper items with faithful canon TEXT; add an AE ONLY for
a persistent bonus the trait itself confers that nothing else applies. Never re-grant
PF/SP via the trait.

## Requirements

- **BG-AUTHOR (MUST)** Each background-group task authors its trait names into
  `traits.yml` per the schema above, with canon text + `source:` page cite, AE/
  conditionalBonus/pickable wiring where the trait has a mechanical effect, and
  `name:` matching the data grant exactly. Then RAISE `TRAIT_RESOLVED_FLOOR` in
  `tests/chargen/background_coverage.test.mjs` by exactly the number newly resolved.

- **TAL-FIX (MUST)** Resolve the 7 talent grants that still stub (`Chem-Geld`,
  `Pistol Weapon Training (Las)`, `Pistol Weapon Training (SP)`, `Resistance
  (Interrogation)`, `Resistance (Psychic Powers)`, `Weapon Training (choose one)`,
  `Xenos Weapon Training (Ork)`) — author the missing talent(s) in `talents.yml`, or
  make the granted name resolve to an existing pickable base. Raise
  `TALENT_RESOLVED_FLOOR` to 79.

- **BG-VERIFY (MUST, last)** When `TRAIT_RESOLVED_FLOOR` reaches the total granted
  (currently 103) and `TALENT_RESOLVED_FLOOR` is 79, add a node test asserting
  `commit.mjs` embeds a REAL item (not a `gaps`-stub) for a representative sample
  (e.g. `Mutant`, `Void Accustomed`, the AE present), and regenerate the
  data-vendor-queue summary of every item authored + its canon cite.

## Gate & review (same as the rest of the loop)
- Gate = `npm run build:check` (compiles the pack — catches malformed YAML/AE) +
  `npm test` (the ratchet stays green; floors only ever rise). See `PROMPT.md`.
- The green gate CANNOT verify RT-rules correctness. Every authoring task appends a
  line to `.ralph/data-vendor-queue.md` listing the names authored + their RT-DOCS
  cites, for separate rules review (PROC-003).

## Out of scope
- The chargen wizard (shelved). No wizard pages, no `applications/chargen-wizard.mjs`.
- A separate "backgrounds" compendium pack — items live in the existing `traits`
  pack (one resolution source for `commit.mjs`); a future split is possible but not
  now.
- Re-vendoring `src/module/chargen/data/*.json` — it's the read-only worklist.
