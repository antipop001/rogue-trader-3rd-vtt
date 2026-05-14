# Rogue Trader 3rd VTT — Correction Checklist

Prioritized punch list to bring the system in line with **FFG Rogue Trader 1e** (corebook + Into the Storm + Living Errata v1.4). Generated 2026-05-13 from a read-only audit; see `CLAUDE.md` § "2026-05-13 — System audit findings" for the supporting analysis.

Priorities:
- **P0** — wrong at the table (mechanically incorrect for RT 1e). Fix first.
- **P1** — large content/feature gaps that block actual play (no ships to fly, no psychic powers to cast). Fix next.
- **P2** — cleanup, polish, schema work, optional purity goals.

Tick a box once done. Notes in italics belong inline.

---

## P0 — Mechanical correctness — DONE

### `src/module/rules/combat-actions.mjs`

- [x] **All Out Attack** — `attack.modifier` 30 → 20 (RT corebook p.241)
- [x] **Charge** — `attack.modifier` 20 → 10
- [x] **Full Auto Burst** — `attack.modifier` -10 → 20
- [x] **Semi-Auto Burst** — `attack.modifier` 0 → 10; also `type` Half → Full (caught 2026-05-14, audit missed it)
- [x] **Stun** — `type` Half → Full (caught 2026-05-14, audit missed it)
- [x] **Delay** — `type` Full → Half
- [x] **Guarded Action** — `type` Half → Full (RT corebook calls this "Guarded Attack"; name kept for back-compat)
- [x] **Tactical Advance** — removed (DH2-only)
- [x] Verified Standard Attack +10, Called Shot -20, Aim Half +10 / Full +20, Suppressing Fire -20 against RT corebook pp.147-148

### `src/module/rules/combat-actions.mjs` — Evasion split — DONE

- [x] Single Evasion Reaction replaced with separate **Dodge** (Ag-based, ranged + melee) and **Parry** (WS-based, melee only) Reactions.

### Skill list — Parry is a Reaction in RT, not a skill

- [ ] Decide policy: keep `parry` as a skill (DH2 convention, allows +10/+20/+30 progression on the sheet) **or** remove from `src/template.json` (line 483) and rewire UI to roll Parry as a WS test under the Reactions panel. Document the decision in CLAUDE.md.

### Damage roll — DH2-specific DoS-replaces-die

- [ ] Audit `src/module/rolls/damage-data.mjs` and weapon-prompt for the DH2 rule "swap one damage die for DoS." If implemented, gate it behind an RT toggle or remove. (Pending verification — not yet inspected.)

---

## P1 — Content gaps that block play

### Psychic powers — DONE 2026-05-13

`src/packs/psychic-powers/psychic-powers.yml` rebuilt from RT Core Rulebook Ch.VI + Into the Storm + Errata v1.4. 79 entries.

- [x] Rebuild from RT Core Rulebook Ch.VI: **Telepathy, Divination, Telekinesis** (the corebook only has these 3 disciplines, NOT 5 — the earlier "Biomancy, Pyromancy" entries in this checklist were wrong; those are DH2-supplement only)
- [x] Add **Navigator powers** (corebook pp.223–234 + ItS p.189)
- [x] **Astropathic Choirs** is NOT a power — it's a relay-assistance rule (corebook p.162; Errata v1.4 raised max bonus +5→+10). The only Astropath-exclusive technique is Astral Telepathy (in Telepathy discipline).
- [x] No daemonology/chrono/void-frost imported (they're not in RT corebook or ItS)
- [x] Theosophamy discipline added (ItS p.197 — 7 sanctioned-psyker faith powers)
- [x] Errata v1.4 corrections baked into descriptions

**Remaining caveats** (see CLAUDE.md "Psychic-powers rebuild" section for full list):
- [ ] Schema extension: `damage` is currently `int` — extend to support `1d10+PR` formulas so automation can roll
- [ ] Targeted re-query for Navigator XP costs (currently all `0` — RT Navigator powers tie to Lineage talents)
- [ ] Decide whether Astropath/Navigator Starship Actions belong in `psychic-powers` (current home) or a separate `ship-actions` pack

### Voidship content — DONE 2026-05-14

3 new packs built from RT-DOCS markdown (no NotebookLM needed — tabular stats live in CoreBook part 2 and ItS part 2 as proper markdown tables):

- [x] `ship-components` — 73 entries (36 essential + 18 supplemental + 14 archeotech + 5 xenotech), registered in `system.json`
- [x] `ship-weapons` — 18 entries (macrobatteries, lances, archeotech weaponry from corebook + ItS)
- [x] `ship-traits` — 34 entries (14 hull patterns + 10 Machine Spirit Oddities + 10 Past Histories)
- [x] Hull patterns embedded in `ship-traits` (no `shipHull` item type) with full stat block in description

**Caveats:**
- [ ] Multi-variant components (21 of them — e.g. Combat Bridge differs across hull sizes) have first variant's stats in fields and a "Hull-size variants:" appendix in the description. Could split into per-variant entries later for cleaner drag-and-drop installation.
- [ ] `shipWeapon.damage` is stored as `int` (parses base from `1d10+X`); full dice formula lives in description. Schema extension needed for proper damage rolling.
- [ ] `voidship-critical-damage.mjs` and `voidship-hit-locations.mjs` audit vs. corebook tables (pp.222–223) — not yet performed.
- [ ] Errata for Excess Void Armour / Overload Shield Generators / Null Bay — not yet applied (these components are in the `ship-components` pack but the errata pass against ItS Ch.IV wasn't run).

### Other un-rebuilt packs — DONE 2026-05-14

All rebuilt from RT corebook via RT-DOCS markdown:

- [x] `cybernetics` → **Bionic Replacements** + Implant Systems (25 entries from corebook p.131+)
- [x] `ammo` → 3 specialty rounds (Inferno Shells, Man-Stopper, Tempest Bolt). RT doesn't catalogue ammo as a separate category — pack is intentionally minimal.
- [x] `consumables` → drugs/stimms/recaf (21 entries from corebook Ch.V)
- [x] `tools` → general gear + clothing (47 entries from corebook Ch.V)
- [x] `weapon-mods` → weapon upgrades (33 entries; includes craftsmanship sub-entries that warrant a manual review)
- [x] `attack-specials` → 25 universal qualities from corebook + Force from ItS (26 total)
- [x] `traits` → 33 creature/character traits from corebook Ch.XIV (replaces DH2 fork content)
- [x] `aptitudes` → DROPPED (DH2-only concept, no RT 1e equivalent)
- [ ] `tables` → only 3 RollTables present; corebook is sparse but Stars of Inequity supplement has many (not available locally; would need re-extraction)

**Caveats:**
- [ ] `weapon-mods` came in at 33 (vs ~14 expected) because h2 sub-headers like "Best/Good/Poor" craftsmanship variants got picked up. Manual review may want to consolidate or filter.
- [ ] ItS additions for `weapon-mods` (Calamity Vent, Exterminator Cartridge, additional drugs, etc.) not yet extracted — corebook-only pass.

### Errata sweep (Living Errata v1.4)

- [ ] Apply ammo errata (p.135 of errata)
- [ ] Apply career advance table errata (talents added/removed per career schedule) — relevant once career data is modeled
- [ ] Apply starship-component errata (Excess Void Armour, Overload Shield Generators, Null Bay) when ship packs are built
- [ ] Re-run a comprehensive errata pass against talents (CLAUDE.md notes some entries had OCR fill-ins) and verify Psy Rating, Rite of Fear, Frenzy, Catfall (tail), Luminen Shock (middle), Unarmed Warrior (middle), Swift Attack (tail) against the printed book

### Three uncommitted YAML files

- [ ] Commit `src/packs/armour/armour.yml`, `src/packs/talents/talents.yml`, `src/packs/weapons/weapons.yml` once verified
- [ ] Run `npm run packs` to confirm YAML round-trips to NeDB cleanly (CLAUDE.md flags this validation as not yet performed)
- [ ] Load the system in Foundry and confirm sheets render correctly with the rebuilt data

---

## P2 — Engine, schema, and the big DH2-vs-RT call

These are larger changes; they decide whether this system is "RT 1e content on a DH2 engine" (current state) or "pure RT 1e engine."

### Decision point: keep or drop the DH2 character-creation pipeline?

Currently the engine carries the full DH2 creation flow (Home World × Background × Role × Aptitudes × 1,000 xp). RT 1e replaces this with Origin Path (Home World → Birthright → Lure of the Void → Trials and Travails → Motivation → Career) and 5,000 xp baked in. Two paths:

**Path A — Keep DH2 creation pipeline (minimum-effort):**
- [ ] Replace the DH2 homeworld entries in `src/module/rules/homeworlds.mjs` with RT homeworlds (Death World, Forge World, Frontier World, Highborn, Hive World, Imperial World, Schola Progenium, Shrine World, Void Born)
- [ ] Reuse the "Background" slot for RT's Birthright (or repurpose for Career)
- [ ] Reuse the "Role" slot for RT's Career (Arch-militant, Astropath Transcendent, Explorator, Missionary, Navigator, Rogue Trader, Seneschal, Void-master)
- [ ] Replace `src/module/rules/divinations.mjs` content with RT's Motivation or remove entirely
- [ ] Keep Aptitudes as a documentation-only field or remove

**Path B — Switch to RT-faithful Origin Path + Career advance tables (large effort):**
- [ ] Schema additions to `acolyte.bio`: `birthright`, `lureOfTheVoid`, `trialsAndTravails`, `motivation`, `career`
- [ ] Replace `acolyte.aptitudes` with `career.rank` and a per-career advance-table data model
- [ ] Build advance-table data files for each of the 8 Careers (corebook Ch.II pp.35–73)
- [ ] Build a character-creation wizard that walks Origin Path → spend 4,500 xp through career table → 500 discretionary
- [ ] Migration path for existing DH2-built characters

### Economy — Profit Factor + Acquisition Test — DONE 2026-05-14

- [x] `profitFactor` as a world setting (default 30), GM-editable in Configure Settings
- [x] `game.rt.acquisition()` opens an Acquisition Test dialog (`src/module/rules/acquisition.mjs`)
- [x] Modifier tables: Availability, Craftsmanship, Scale — RT corebook p.270
- [ ] Pre-populate dialog from a right-clicked item's availability/craftsmanship (would need a sheet button or context-menu integration)
- [ ] Endeavours tracker for PF awards
- [ ] Remove `characteristics.influence` from `src/template.json` (replaced by group PF — left in place for back-compat; safe to remove later)

### Aptitudes system — drop or formalize as flavor

`src/module/documents/acolyte.mjs:57` + `src/module/rules/homeworlds.mjs`/`roles.mjs`/`backgrounds.mjs` + `src/packs/aptitudes/aptitudes.yml` all reference aptitudes.

- [ ] Decide: drop entirely (Path B above), or keep as flavor (Path A — leave the field, ignore for advancement-cost logic). Document the choice in CLAUDE.md.
- [ ] If dropping: remove `aptitudes` field from talent schema (currently `aptitudes: ''` is convention) and the `aptitudes` compendium pack.

### Psychic mechanic — DONE 2026-05-14

- [x] Added `psy.strength` enum: `fettered` | `unfettered` | `push` (defaults to unfettered)
- [x] Fettered (`pr < rating`): skips Phenomena check; default PR = ⌈rating/2⌉
- [x] Unfettered (`pr === rating`): Phenomena on doubles
- [x] Push (`pr > rating`): Phenomena on any non-doubles; -10 per push point (via existing modifier formula); default PR = rating + pushCap
- [x] Push cap: Sanctioned +3, Unsanctioned +4 (PsychicRollData.pushCap getter; bound/unbound aliased)
- [x] `psy.class` converted from free-text input to select (sanctioned/unsanctioned/bound/unbound)
- [ ] Wire up `src/packs/tables/tables.yml` Psychic Phenomena and Perils of the Warp tables to auto-roll on trigger (currently just flagged in chat)

### Skill list — DH1/RT split vs DH2 consolidations

Current skill list is hybrid. For RT 1e fidelity (vs. DH2 consolidations):

- [ ] Decide policy: keep DH2-consolidated `athletics` and `stealth`, or split into RT's Climb/Swim and Concealment/Silent Move/Shadowing
- [ ] `operate` and `navigate` already use RT-style sub-specialties — leave as is
- [ ] Verify specialty lists on `commonLore`, `forbiddenLore`, `scholasticLore`, `linguistics`, `trade` against RT corebook (current entries look RT-correct already, but verify Common Lore: Tactics vs Strategy, Forbidden Lore: Archaeotech wording, etc.)

### Cleanup / polish

- [ ] Decide on `DarkHeresy*` class names — rename to `RogueTrader*` for clarity, or leave as-is (purely cosmetic)
- [ ] Add page numbers to talent `source:` fields (NotebookLM omits them; do a targeted re-query)
- [ ] Extend `weapon.special` schema to capture parameter values for parameterized qualities (Blast `(X)`, Snare `(X)`, Felling `(X)`, Force, etc.) — currently `special: { blast: true }` loses the `(X)`
- [ ] Add `forceField.protectionRating` schema or fold into `armour.protectionRating` (currently embedded in description text only)
- [ ] Add a `npc.threatLevel` encounter-budget tool — or remove the field (DH2-only concept; RT relies on GM judgment)
- [ ] Document deviations explicitly in CLAUDE.md (e.g. "Parry kept as skill", "consolidated Stealth retained")
- [ ] Add a system migration script (`src/module/rogue-trader-migrations.mjs` exists — extend it) for any breaking schema changes above

### Optional new-content build

- [ ] `endeavours` system (corebook pp.288–294) — Expedition/Trade/Military/Criminal types, achievement tracking, PF awards
- [ ] `exploration-challenges` (Stars of Inequity supplement) — warp travel, system generation
- [ ] `renown` per-character track (Battlefleet Koronus, Edge of the Abyss supplements)
- [ ] Pre-built sample NPCs (Imperial citizens, void-born, Eldar Corsairs, Ork pirates) as a `bestiary` pack

---

## Quick-win bundle (1 commit, ~30 min of work)

If you want a single high-impact PR that doesn't require new content:

1. Fix the 6 combat-action modifier values in `src/module/rules/combat-actions.mjs` (P0 first bullet group)
2. Remove the Tactical Advance entry
3. Split Evasion → Dodge + Parry (or at minimum, document the split in comments)
4. Commit the three pending YAML files (`armour`, `talents`, `weapons`)
5. Run `npm run packs` and `npm run build`, smoke-test in Foundry

This alone moves the system from "DH2 with RT labels" to "DH2 with RT combat math + RT-canon content for talents/weapons/armour."
