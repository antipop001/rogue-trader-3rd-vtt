# v0.9 — Explorer Character Sheet Redesign — CONVERGED PLAN
*Output of a two-designer collaboration (Claude + Gemini/Antigravity), 2 rounds of independent
proposal + cross-critique. Where they converged is marked ✓UNANIMOUS; the one open call is flagged.*

## The thesis (✓UNANIMOUS — both reached it independently)
**Combat is a MODE, not a tab.** The resources and rolls a player touches every round (wounds, fate,
armour, attack/dodge/parry, characteristic rolls) are fragmented across 3 of today's 7 tabs, so the
core loop — *take a hit → spend fate → roll a test* — costs multiple tab-switches mid-firefight.
Fix: make the every-round surface **persistently visible**, and tab away only what you touch once a
session. This is the single biggest UX win and requires zero schema change.

## 1. Information architecture — a persistent Command Rail + a 4-tab content region
```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER: portrait · name · career/home-world labels   (titlebar: Fear·Grapple·Cover·Vehicle) │
├────────────────────┬─────────────────────────────────────────────┤
│  COMMAND RAIL       │  CONTENT  [ Character ][ Abilities ][ Gear ][ Chronicle ] │
│  (always visible,   │                                              │
│   own scroll)       │   … active tab body (scrollable) …           │
│  ── vitals ──       │                                              │
│  Wounds ● ● ○  state │                                              │
│  Fatigue · Fate      │                                              │
│  Armour by location  │                                              │
│  Movement · Init     │                                              │
│  ── actions ──       │                                              │
│  ⚔ Attack            │                                              │
│  🛡 Dodge · Parry     │                                              │
│  Assign Damage       │                                              │
│  ── roll ──          │                                              │
│  9 characteristic    │                                              │
│  roll buttons        │                                              │
│  ▸ Active Effects    │                                              │
└────────────────────┴─────────────────────────────────────────────┘
```
- **Command Rail** (left, ~230–260px, its own scroll, OUTSIDE `.rt-body` so the tab framework never
  hides it): the entire old `combat` tab + the characteristic *rollers*. ✓UNANIMOUS.
- **Content region** = **4 tabs** (down from 7), organized by *when you look at them*:
  1. **Character** — characteristics table + a **single merged, filterable skill list** (basic /
     advanced / specialist unified; ✓both agreed to merge the 3 skill panels).
  2. **Abilities** — talents + traits + **psychic powers**. Psychic renders as a **visually distinct
     "active/castable" section** (with the psy rating/class/strength block) above the passive
     talents/traits lists — so a non-psyker still gets a full, meaningful tab, and psychic's
     active/resource-costed nature stays legible. (Reconciliation of the one residual disagreement.)
  3. **Gear** — weapons, armour, encumbrance, storage locations, cybernetics, backpack, force-field, gear.
  4. **Chronicle** — origin path, ship role, bio fields, journal, peers, enemies, **+ experience,
     corruption, insanity** (campaign progression + narrative; removes the "dead Mind tab" for non-psykers).
- Navigation stays the existing V2 tab framework (`data-action="tab"`, `changeTab`) — 4 labels, not 7.

### ⚠ THE ONE OPEN CALL FOR THE USER — nav *feel*
Both designers agree the 4-tab model is safe and correct. Claude additionally proposes an enhancement:
replace the tab strip with **anchor-navigated collapsible bands** (jump-links that scroll to a section,
each section collapsible so the scroll never runs away). It removes tab-hunting entirely but is the
bigger muscle-memory change. **Recommendation: ship 4 tabs as the baseline; A/B the collapsible-bands
variant live on rt-smoke and let feel decide.** Purely a content-region nav choice; the Rail is identical
either way.

## 2. Visual system — keep the gothic bones, add hierarchy + legibility (✓UNANIMOUS direction)
- **Typography, 3 tiers by content:** `IM Fell DW Pica` for section headers + character name (ornamental
  identity); **`Lusitana` (already loaded) for ALL data labels + numeric values**, and stop ALL-CAPS-ing
  data labels (caps only on section headers). Both converged on Lusitana over a new sans-serif — keeps
  the 40k identity while fixing small-caps scannability. (A neutral sans is optional, sparingly, only if
  a specific dense numeric table still fails legibility testing — not a default.)
- **"Rollable = teal" as a universal affordance** (✓both, agy "enthusiastically"): every clickable roll
  (characteristic/skill/weapon/power) carries the teal accent (left keyline / hover-fill); static fields
  are neutral parchment. One rule, everywhere — the fastest scannability gain.
- **Status-tinted resource cards:** wounds/fatigue/fate tint by state (healthy→neutral, ~half→amber,
  critical→crimson). Wounds already carries a `state` string; bind the tint to it. At-a-glance triage.
- **Density tiers:** rail resource cards are large/bold/high-contrast (glanceable under stress); content
  lists (skills/gear/powers) stay compact and quiet. Fixes "everything looks equally important."
- **De-clutter:** relax the heavy per-panel `border-image` frames inside the content region (group with
  subtle shadows/translucent overlays — an "auspex screen" nod); keep the parchment + teal/slate palette.
- All CSS scoped to the existing tokens in `_abstracts.scss` / `_fonts.scss`; no new palette.

## 3. Content mapping — nothing lost (exhaustive vs the 7-tab source)
| Current tab · panel | New home |
|---|---|
| combat: wounds, fatigue, fate | **Rail** (status-tinted resource cards; rest/spend/burn preserved) |
| combat: armour-display | **Rail** (armour-by-location) |
| combat: combat-controls (Attack/Dodge/Parry/Assign) | **Rail** (same `data-action`s) |
| combat: initiative, movement | **Rail** |
| combat: characteristic-roller | **Rail** (9-button roll strip; full edit → Character tab) |
| combat: active-effects | **Rail** foot (collapsible drawer) |
| main: characteristics table | **Character** |
| main: skills (basic/advanced/specialist) | **Character** (merged filterable list) |
| main: talents, traits | **Abilities** |
| psychic: psychic-powers + psy block | **Abilities** (distinct active/castable section) |
| gear: weapons/armour/encumbrance/storage/cybernetics/backpack/force-field/gear | **Gear** (1:1) |
| advances: experience, corruption, insanity | **Chronicle** |
| bio: origin-path, ship-role, bio fields | **Chronicle** |
| social: journal, peers, enemies | **Chronicle** |
| header portrait/name/labels · titlebar Fear/Grapple/Cover/Vehicle | **unchanged** |

Every `data-action`, every `name="system.*"` input, every item CRUD / roll / drag hook is **reused
verbatim** — panels are moved, not rewritten.

## 4. Data compatibility (✓UNANIMOUS — mandatory constraint met)
Pure template + SCSS reflow. **No `template.json` change. No migration.** Every panel keeps reading the
exact same `system.*` / `actor.characteristics` / `actor.skills` / `items` / `effects` paths; an existing
character (e.g. Cassian Holt) opens and renders identically-sourced data in the new arrangement. Structural
code touch is limited to the top-level `actor-acolyte-sheet.hbs` (Rail + 4 tab divs) and the SCSS grid.
Tab *keys* are internal (not persisted to actor data), so even renaming them needs no migration.

## 5. Phased implementation
- **Phase 1 — the flow win (ships first).** Restructure `actor-acolyte-sheet.hbs` into Rail + 4-tab
  content, moving existing panels per §3. Two-column flex shell (`rail | content`), rail outside
  `.rt-body`. Reuse panel markup verbatim. Delivers the persistent-resources, zero-tab-switch loop.
  *Watch the V2 double-wrapper SCSS gotcha (`.rt-wrapper` + `.rt-actor` on the same element — CLAUDE.md).*
- **Phase 2 — the look win.** 3-tier typography + drop ALL-CAPS on data, "rollable = teal", resource
  status tints, density tiers, de-cluttered inner borders. Scoped CSS on existing tokens.
- **Phase 3 — progressive-disclosure + responsive.** Active-effects drawer, bio "Details" fold, consistent
  row-expand across all lists, merged-skill-list filtering, and **responsive collapse** (under a min width
  the Rail becomes a top strip / slide-over so the narrow pop-out stays usable). Optionally A/B the
  collapsible-bands nav here.
- **Verify each phase on rt-smoke** via Playwright: open an EXISTING character, confirm every roll / CRUD /
  fate / rest path fires and all fields round-trip — the data-compat proof.

## 6. Risks / tradeoffs (honest)
- **Rail eats horizontal space** in a resizable pop-out; at ~600px it's cramped → Phase-3 responsive
  collapse; rail is the narrow column, content keeps the majority; default 900px is comfortable.
- **Always-on rail is "wasted" pixels in a pure roleplay scene** → accepted; the sheet's dominant use is
  play, optimize the common case; the rail is glanceable, not noisy.
- **4 tabs vs muscle memory** of 7 → labels are concrete; removing combat from tab-hunting nets fewer
  "where is it" moments, not more.
- **SCSS regression risk** from new grid/flex interacting with `border-image` frames + the known
  double-wrapper bug → Phase 1 is layout-only with existing classes; visual overhaul (Phase 2) isolated
  and independently verifiable.
- **Nav-feel A/B** (tabs vs bands) is the one subjective call left to live testing.

## Bottom line
One bold move both models reached independently (**combat → a persistent Rail, not a tab**), a 7→4 tab
consolidation grouped by *when you look*, a merged skill list, and a legibility/hierarchy pass that keeps
the gothic soul (Lusitana data type, rollable=teal, status-tinted resources). **Zero schema change, zero
migration, every control preserved.** One open call for the user: the content-region nav *feel* (4 tabs
baseline vs. anchor-navigated collapsible bands), best settled by a live A/B.
