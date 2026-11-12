# v0.9 Explorer Sheet Redesign — Claude, Round 1

## 0. Grounding (what's actually there)

The live sheet is `AcolyteSheetV2` → `ActorContainerSheetV2` → `HandlebarsApplicationMixin(ActorSheetV2)`.
- **One PART** (`body`, `root: true`, `scrollable: ['.rt-body']`) rendering `actor-acolyte-sheet.hbs`.
- **7 tabs** toggled by V2's tab framework (`tabGroups.primary`, `changeTab` forced on first render).
- Every action is `data-action` dispatched through `DEFAULT_OPTIONS.actions` (rolls, item/effect CRUD, fate, rest, combat). Four **window-titlebar header controls** already exist: Fear Test, Grapple, Take Cover, Operate Vehicle.
- Layout is a **6-column CSS grid** (`.tab.active { grid-template-columns: repeat(6,1fr) }`); each `rt-panel` spans via `rt-grid-col-N`/`rt-grid-row-N`.
- Visual system: `IM Fell DW Pica` + `Lusitana` serifs, teal `rgb(36,107,131)` / slate `rgb(44,76,87)`, `border-image` gothic frames over a `40k_back.png` parchment, Material Icons for controls, ALL-CAPS small-caps headers. Every field is a live `name="system.*"` input (submit-on-change).

Because it's a **single template + single PART**, I can restructure layout and tab grouping freely without touching the schema or any action handler. That's the whole design surface, and it's generous.

---

## 1. POV — Rethink the *frame*, keep the *panels*

**Evolve the panels, rethink the shell.** The individual panels (wounds, characteristics table, weapon list) are fine — they're honest, dense, and every field maps to real data. The problem is not the panels; it's the **navigation frame** they hang in.

Tie it to the table: the three highest-frequency mid-session actions are **(a) roll a skill/characteristic, (b) take a hit / adjust wounds / spend fate, (c) attack with a weapon.** On the current sheet these live on *three different tabs* (`main`, `combat`, `gear`). A player who just got shot has to leave the tab they were reading to find their wounds box, then tab again to spend fate, then tab again to roll a Toughness test. Combat is a *mode*, not a *tab* — and right now it's buried as one tab among seven, competing for attention with Social and Bio.

**Thesis: the resources and rolls you touch every round should be PERSISTENTLY visible; everything you touch once per session should be tabbed away.** So the boldest move is to **dissolve the `combat` tab into a permanent left "Command Rail"** that never leaves the screen, and collapse the remaining six tabs into four.

This is a rethink of IA and a targeted evolution of visuals — not a from-scratch reskin. The gothic identity is an asset; I keep it and sharpen it.

---

## 2. Information architecture — Persistent Command Rail + 4 content tabs

```
┌───────────────────────────────────────────────────────────────┐
│  HEADER: portrait · name · career/home-world labels           │  (window titlebar controls: Fear · Grapple · Cover · Vehicle)
├──────────────────┬────────────────────────────────────────────┤
│  COMMAND RAIL    │  CONTENT REGION (tabbed, scrollable)        │
│  (always visible)│  [ Character ] [ Gear ] [ Mind ] [ Chronicle]│
│                  │                                             │
│  Wounds  ● ● ○   │   … active tab body …                       │
│  Fatigue / Fate  │                                             │
│  Armour (by loc) │                                             │
│  Movement · Init │                                             │
│  ─────────────   │                                             │
│  ⚔ Attack        │                                             │
│  🛡 Dodge/Parry   │                                             │
│  Assign Damage   │                                             │
│  ─────────────   │                                             │
│  9 Characteristic│                                             │
│  roll buttons    │                                             │
│  ─────────────   │                                             │
│  ▸ Active Effects│                                             │
└──────────────────┴────────────────────────────────────────────┘
```

**The Command Rail** (left, fixed width ~230–260px, its own scroll) holds everything that was the `combat` tab plus the characteristic *rollers*: wounds/fatigue/fate resource cards, armour-by-location summary, movement + initiative, the four combat-control buttons, a compact 9-button characteristic roller strip, and a collapsible Active Effects drawer at the foot. This makes take-a-hit → spend-fate → roll-a-test a **zero-tab-switch** flow, which is the single biggest UX win available.

**Four content tabs** (down from seven):
1. **Character** — characteristics *table* (full editable initial/advance/modifier/unnatural detail), skills (basic/advanced/specialist), talents, traits.
2. **Gear** — weapons, armour, encumbrance, storage locations, cybernetics, backpack, force-field, gear.
3. **Mind** — psychic powers + psy block, corruption, insanity, experience. (The "psyche, degradation, progression" cluster — where a psyker's power *and* its cost live together.)
4. **Chronicle** — origin path, ship role, bio fields, journal, peers, enemies. (Everything narrative/between-sessions.)

Why these four: they map to **when you look at them** — Character (constant reference), Gear (loadout, changes occasionally), Mind (psyker/advancement, session boundaries), Chronicle (roleplay, rarely mid-combat). Merging `advances` into Mind and `psychic` alongside it puts XP-spend next to the powers you spend it on; merging `bio`+`social` into Chronicle is the natural "story" bucket.

Navigation stays the existing V2 tab framework (`data-action="tab"`, `changeTab`) — just four labels instead of seven, and the rail sits **outside** `.rt-body` so the tab framework never toggles it.

---

## 3. Primary view — always-visible vs. progressively disclosed

**Always visible (the rail + header):** name/portrait; wounds (current/max/critical + state, with rest buttons); fatigue; fate (+ spend/burn); armour per location; movement + initiative; Attack/Dodge/Parry/Assign-Damage; the 9 characteristic roll buttons. This is the "can I survive and act this round" surface.

**Default content tab = Character**, so on open you see rail + the full characteristics/skills/talents reference — the most-consulted data.

**Progressively disclosed:**
- **Active Effects** — collapsed drawer in the rail foot (you rarely edit them mid-roll, but you want to *see* the count).
- **Item detail** — keep the existing row-expand pattern (`trait-toggle` → `.table-cell--description`) for weapon damage/pen, talent benefit text, critical injury descriptions. It already works; it's good progressive disclosure. Extend it consistently to every list.
- **Characteristic *table* detail** (initial/advance/modifier/unnatural editing) lives in the Character tab, while the rail shows only the roll button + current value. Editing is occasional; rolling is constant. Split accordingly.
- **Rarely-edited bio fields** (build, complexion, quirks…) collapse under a "Details" fold in Chronicle.

---

## 4. Visual system — keep the gothic bones, add hierarchy and legibility

Keep: the serif display face, the parchment/`border-image` frames, teal/slate, Material Icons. The 40K identity is a feature. Evolve four things:

1. **A real type scale + a legibility split.** Reserve the ornamental `IM Fell DW Pica` for **section headers and the character name only**. Switch **data labels and numeric values to `Lusitana`** (already loaded, far more legible at 8–10pt) and stop ALL-CAPS-ing data labels — caps stay for section headers where they read as "chapter heading," not "form label." Small-caps at speed is the stated pain point; this fixes it without leaving the period aesthetic.

2. **Make "rollable" a visual class.** Right now a roll button and a static value look similar. Give every rollable (characteristic/skill/weapon/power) the teal accent — a left keyline or hover-fill — and make static fields neutral parchment. Teal becomes "you can click this to roll," everywhere, one rule. This is the fastest scannability gain on the sheet.

3. **Status color on resources.** Wounds/fatigue/fate cards get a state tint: healthy → neutral, ~half → amber, critical → the existing red the `colorCode` helper already drives for characteristics. Wounds already carries a `state` string ("Healthy"/"Lightly"…); bind the tint to it. At-a-glance triage without reading numbers.

4. **Density tiers.** Two densities, deliberately: **resource cards** in the rail are large, bold, high-contrast (glanceable under stress); **list tables** (skills, gear, powers) stay compact and quiet. Today everything is one uniform density, which is the "everything looks equally important" complaint. The rail/tab split naturally enforces the tier.

No new fonts, no palette change — this is CSS scoped to the existing tokens in `_abstracts.scss`/`_fonts.scss`.

---

## 5. Where every current tab's content goes (nothing lost)

| Current tab → panel | New home | Notes |
|---|---|---|
| **combat**: wounds, fatigue, fate | **Rail** (resource cards) | rest / spend-fate / burn buttons preserved verbatim |
| combat: armour-display | **Rail** (armour summary) | per-location AP glance |
| combat: combat-controls | **Rail** (Attack/Dodge/Parry/Assign) | same `data-action`s |
| combat: initiative, movement | **Rail** | compact strip |
| combat: characteristic-roller | **Rail** (9-button strip) | roll only; full edit → Character tab |
| combat: active-effects | **Rail** foot (collapsible drawer) | CRUD intact |
| **main**: characteristics table | **Character** | full editable table |
| main: traits, skills (basic/adv/spec), talents | **Character** | untrained-gating + add-specialist preserved |
| **bio**: origin-path, ship-role, bio fields | **Chronicle** | bio detail fields under a "Details" fold |
| **gear**: weapons, armour, encumbrance, storage, cybernetics, backpack, force-field, gear | **Gear** | one-to-one |
| **psychic**: psychic-powers, psy block | **Mind** | |
| **advances**: corruption, experience, insanity | **Mind** | XP sits with the powers it buys |
| **social**: journal, peers, enemies | **Chronicle** | |
| Header: portrait/name/labels | **Header** (unchanged) | |
| Titlebar: Fear/Grapple/Cover/Operate Vehicle, (Chargen shelved) | **Titlebar** (unchanged) | no code change |

Every `data-action`, every `name="system.*"` input, every item CRUD/roll/drag hook is reused as-is — panels are **moved, not rewritten**. Nothing is dropped; the mapping above is exhaustive against the 7-tab list in the brief.

---

## 6. Data compatibility — presentation-only, zero migration

This is a **pure template-and-SCSS reflow**:
- No `template.json` change. Every panel keeps reading the exact same `system.*`, `actor.characteristics`, `actor.skills`, `items`, `effects` paths. An existing actor renders identically-sourced data in a new arrangement.
- No action-handler change. The rail's buttons are the same `data-action` strings already registered in `AcolyteSheetV2` / `ActorContainerSheetV2`. The four titlebar controls are untouched.
- The only structural code touch is the top-level `actor-acolyte-sheet.hbs` (rail + 4 tab divs instead of 7) and the SCSS grid rules. Optionally rename `tabGroups.primary`'s tab keys — but I'd **keep the keys** (`combat`→ gone, `main`/`bio`/`gear`/`psychic`/`advances`/`social` remapped) minimal to avoid churn; new keys are internal, not persisted to actor data, so even renaming them needs **no migration**.

**Migration proposed: none.** I will not restructure any stored data. The one place a schema temptation exists — unifying combat resources — is resisted; the rail *groups* existing fields visually, it doesn't merge them. If a future round wants (say) a computed "equipped weapons" quick-list in the rail, that's derived in `_prepareContext`, still zero-migration.

---

## 7. Phased implementation

- **Phase 1 — The flow win (ships first, highest value).** Restructure `actor-acolyte-sheet.hbs` into Rail + 4-tab content, moving existing panels per §5. Minimal new SCSS: a two-column flex shell (`rail | content`), rail outside `.rt-body`, content keeps the tab framework. Reuse existing panel markup verbatim. This alone delivers the persistent-resources, zero-tab-switch combat flow. **Watch the V2 double-wrapper SCSS gotcha** (`.rt-wrapper` + `.rt-actor` land on the same element) — scope the new grid rules accordingly, per CLAUDE.md.
- **Phase 2 — The look win.** Type-scale + legibility split (Lusitana for data, ornamental serif for headers), the "rollable = teal" rule, resource status tints, density tiers. Scoped CSS on existing tokens.
- **Phase 3 — Progressive-disclosure polish.** Active-effects drawer, bio "Details" fold, consistent row-expand across all lists, and **responsive collapse**: under a min window width the rail drops to a top strip (or a slide-over) so the pop-out stays usable when narrow.
- **Verify each phase on rt-smoke** via the existing Playwright flow: open an existing character, confirm every roll/CRUD/fate/rest path fires and all fields round-trip — the data-compat proof.

---

## 8. Risks & tradeoffs (honest)

- **Rail eats horizontal space in a resizable pop-out.** At ~600px the two-column layout is cramped. *Mitigation:* Phase-3 responsive collapse; also the rail is the *narrow* column, so content keeps the majority. Default width already 900px, comfortable.
- **The rail is a lot of always-on pixels.** For a pure roleplay scene it's "wasted." *Tradeoff accepted:* the sheet's dominant use is play; optimizing for the common case is correct, and the rail is glanceable, not noisy.
- **Merging `advances` into `Mind` is opinionated.** A non-psyker's "Mind" tab is then just corruption/insanity/XP — the "Mind" label fits loosely. *Alternative if it grates in review:* name it **"Fate & Progress"** or split XP back out. Low cost to change; it's a label.
- **Four tabs may still feel like "where's X?" for muscle memory** of long-time users. *Mitigation:* keep labels concrete; the rail removes the most-searched-for content (combat) from tab-hunting entirely, which nets fewer "where is it" moments, not more.
- **SCSS regression risk** from new grid/flex rules interacting with the `border-image` panel frames and the known double-wrapper bug. *Mitigation:* Phase 1 changes layout only with existing panel classes; visual overhaul (Phase 2) is isolated and independently verifiable.
- **Tab-framework assumption:** the rail must sit outside `.rt-body` (the `scrollable`/tabbed region) or `changeTab` will hide it. Verified against the current `_onRender` force-activate — straightforward, but it's the one structural thing to get right in Phase 1.

**Bottom line:** one bold move (combat becomes a persistent rail, not a tab), one supporting move (7→4 tabs grouped by *when you look*, not *what edition called it what*), and a legibility/hierarchy pass that keeps the gothic soul. Zero schema change, zero migration, every control survives.
