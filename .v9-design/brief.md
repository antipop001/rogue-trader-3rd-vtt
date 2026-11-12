# v0.9 — Explorer (character) sheet redesign — SHARED DESIGN BRIEF

You are one of TWO UI designers (one Claude, one Gemini/Antigravity) collaborating on a redesign of
the **Explorer character sheet** for an unofficial **Rogue Trader 1e** Foundry VTT system. Round 1:
produce your own independent redesign proposal. (Later rounds you'll critique each other and converge.)

## Goal
Same FUNCTIONALITY, dramatically better FLOW / LOOK / FEEL / UX. The user has explicitly authorized a
**rethink from scratch** — a fundamentally different layout/navigation is on the table if it's clearly
better (single-scroll, sidebar, at-a-glance dashboard, progressive disclosure, etc.). Deliverable is a
WRITTEN PLAN (no mockup needed yet).

## Tech + hard constraints (a proposal that violates these is out of scope)
- **Foundry VTT ApplicationV2** sheet (`HandlebarsApplicationMixin(ActorSheetV2)`), Handlebars templates,
  SCSS. Must work on Foundry **v13 and v14**. Pop-out resizable window (not full-screen).
- **DATA COMPATIBILITY IS MANDATORY:** this is a PRESENTATION-LAYER redesign. It must render EXISTING
  actors from their current `system` data with ZERO re-entry — a player opens their existing character
  and it just works on the new sheet. Do NOT propose changing the `system` schema (template.json). If
  any data restructuring is genuinely needed, it MUST come with an automatic migration; call that out
  explicitly and treat it as a cost.
- Every current control/roll must survive: characteristic rolls, skill rolls (basic/advanced/specialist,
  incl. untrained gating), weapon attacks, psychic casts, force-field, acquisition test, fear test,
  grapple, take-cover, reload/clear-jam, rest, spend/burn fate, drug use, item CRUD, active effects,
  the GM "apply PF" and chargen entry points, drag-drop of items.

## Current information architecture (7 tabs; the data/functions that must all remain reachable)
- **combat**: wounds, fatigue, fate, armour-display, combat-controls, initiative, characteristic-roller, movement, active-effects
- **main**: characteristics (9), traits, skills (basic / advanced / specialist), talents
- **bio**: origin-path (Home World→Birthright→Lure→Trials→Motivation→Career), ship-role, bio fields
- **gear**: weapons, encumbrance, armour, storage-locations, cybernetics, backpack, force-field, gear
- **psychic**: psychic-powers, psy (rating/class/strength)
- **advances**: corruption, experience, insanity
- **social**: journal, peers, enemies
- Header: portrait, name, key bio labels.

## Where to look (READ these to ground your proposal in reality — do not guess)
- Sheet class: `src/module/sheets/actor/acolyte-sheet.mjs` (+ base `actor-container-sheet.mjs`)
- Top-level template: `src/templates/actor/actor-acolyte-sheet.hbs` (tabs + panel includes)
- The 46 panel partials: `src/templates/actor/panel/*.hbs`
- Visual system (SCSS): `src/scss/` — `_abstracts.scss` (colours: teal `rgb(36,107,131)`, dark-blue
  `rgb(44,76,87)`, black borders), `_fonts.scss` (`IM Fell DW Pica` + `Lusitana` serifs — gothic/period),
  `components/` (`_header`, `_navigation`, `_panel`, `_grids`, `_characteristics`, `_controls`, `_form_fields`).
- `CLAUDE.md` for architecture + the V2-sheet gotchas.

## Known pain points to consider (not exhaustive — form your own view)
- Dense, uniform panel grid with little visual hierarchy; everything looks equally important.
- 7 tabs fragment related info (e.g. combat resources on one tab, gear that drives them on another).
- Small-caps labels + serif fonts are on-theme but can hurt scannability/legibility at speed.
- In-play flow (roll a skill, take a hit, spend fate) spans multiple tabs.

## What your Round-1 proposal must contain
1. A clear POV: evolve vs. rethink, and WHY (tie to in-play user tasks — a GM/player mid-session).
2. Proposed information architecture / navigation model (tabs? sidebar? dashboard? scroll?).
3. Layout of the primary view(s) — what's always visible vs. progressively disclosed.
4. Visual system direction (hierarchy, density, typography, colour, the 40K gothic identity — keep/evolve).
5. How EACH current tab's content maps into the new structure (nothing lost).
6. How it stays data-compatible (presentation-only) + any migration you'd (reluctantly) propose.
7. A phased implementation path (what ships first for early value).
8. Honest risks/tradeoffs.
Be concrete and opinionated. Quality over length.
