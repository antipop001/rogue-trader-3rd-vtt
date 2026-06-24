# QA findings — Rogue Trader 3rd (correctness / DH2-leftover / automation-gap audit)

Filed by the QA-audit Ralph loop (`specs/07-qa-audit.md`, `fix_plan.md`). Each finding
is verified against the source (file:line read) + RT canon. This is a triage list for a
human / a later fix-loop — confirmed P0/P1 engine bugs get promoted to `BUGS.md`.
Already-fixed bugs live in `BUGS.md` (BUG-001…010) and are NOT re-filed here.

Format per finding:
```
### QA-<NNN> — <title>
- area: <rules|schema|weapons|armour|cybernetics|talents|traits|psychic|ship|sheet-ui|acquisition|data-quality|naming|other>
- kind: <dh-leftover|automation-gap|data-quality|cosmetic|not-a-bug>
- severity: <P0|P1|P2|P3>
- evidence: <file:line> — <quote/paraphrase>
- canon: <RT-DOCS ref or "n/a — code smell">
- gap: <does X, should do Y>
- fix: <suggestion> · autofixable: <yes|no>
```

---

<!-- findings appended below, numbered QA-001, QA-002, … -->

### QA-001 — DH2 Home World/Background/Role/Divination pipeline runs in live actor prepareData()
- area: rules
- kind: dh-leftover
- severity: P2
- evidence: `src/module/documents/acolyte.mjs:85` calls `_computeBackgroundFields()` every `prepareData()`; `:318-358` reads `bio.homeWorld/background/role/divination/elite` and pushes DH2 `home_world_bonus`/`background_bonus`/`role_bonus`/divination `effect` into `backgroundEffects.abilities`; `_computeCharacteristics()` `:382-388` sets `has_bonus`/`has_negative` from the DH2 homeworld's `bonus_characteristics`/`negative_characteristic`. Source data is pure DH2: `rules/backgrounds.mjs:4` "Adeptus Administratum" with `aptitudes:['Knowledge','Social']`; `rules/roles.mjs:4` "Assassin/Chirurgeon/Desperado/Hierophant/Mystic/Sage/Seeker/Warrior".
- canon: RT 1e has no Home World × Background × Role × aptitude-pair creation model and no DH2 "background bonuses"; it uses the Origin Path chain (Home World → Birthright → Lure of the Void → Trials → Motivation → Career) — RT Core Ch.I. CLAUDE.md §B/§D flag these modules as DH2 fork content.
- gap: The DH2 background machinery is still wired into live derived data. It is currently **dormant** (the RT sheet no longer renders these fields — `config.mjs:40-46` puts them in `bio.primary:[]` + `skip`; the chargen wizard deliberately never writes them — `commit.mjs`; and no pack/NPC YAML sets them), so it is a no-op for any actor created in RT. But it remains a **latent active-leak**: any DH2-imported actor, or a `bio.homeWorld` value set via console/migration, would re-inject DH2 characteristic flags + bonus abilities at prepareData time. It is effectively dead code carrying a DH2-contamination risk.
- fix: Delete `_computeBackgroundFields()` + its call at `acolyte.mjs:85`, the homeworld branch in `_computeCharacteristics()` (`:382-388`), and the 5 imports (`acolyte.mjs:1-5`); drop the `DarkHeresy.bio.{homeWorld,background,role,elite,divination}` builders in `config.mjs:35-39`. Retire the 5 rules modules (or keep only as inert reference). Coordinate with QA-DH-SCHEMA (the template.json `bio` fields). · autofixable: no (touches derived-data path; needs the schema pass + a legacy-actor migration decision)

### QA-002 — `divinations.mjs` is DH2 Emperor's Tarot — a mechanic absent from RT 1e
- area: rules
- kind: dh-leftover
- severity: P3
- evidence: `src/module/rules/divinations.mjs:1-25` exports 25 Emperor's-Tarot entries keyed by a `roll:` percentile (e.g. `:5` "Mutation without, corruption within." → "Roll once on the Malignancies table"; `:18` WS/BS +3 / Ag or Int −3). Imported at `acolyte.mjs:3`, resolved live at `acolyte.mjs:347`, and surfaced as a dropdown via `config.mjs:39` `divination: divinationNames()`.
- canon: RT 1e character creation (RT Core Ch.I) has no Emperor's Tarot / Divination step at all — it is a Dark Heresy mechanic. CLAUDE.md §D: "RT does not use this mechanic."
- gap: A DH2-only subsystem (data + config dropdown + prepareData resolution) ships with no RT analog and no path to set it on an RT actor; pure dead/contaminating code.
- fix: Remove `divinations.mjs`, its import/use at `acolyte.mjs:3,346-354`, and `config.mjs:6,39`. Rolls into the QA-001 cleanup. · autofixable: no (part of the derived-data removal above)

### QA-003 — `elite-advances` resolved into backgroundEffects but never applied (dead even in DH2 terms)
- area: rules
- kind: dh-leftover
- severity: P3
- evidence: `src/module/documents/acolyte.mjs:356-358` `if (this.bio?.elite) { this.backgroundEffects.eliteAdvance = eliteAdvances().find(...) }` — stores the record but, unlike homeworld/background/role/divination, never pushes it into `backgroundEffects.abilities`; no sheet template reads `backgroundEffects.eliteAdvance`. `rules/elite-advances.mjs` (71 lines) is DH2 elite-advance data.
- canon: RT 1e uses Career advance tables, not DH2 elite advances — CLAUDE.md §D ("RT uses a different advance system").
- gap: DH2-only data + a resolution line whose result is never consumed (dead-store) — does nothing even if `bio.elite` were set. Pure cruft.
- fix: Drop `elite-advances.mjs`, the `acolyte.mjs:5,356-358` import+use, and `config.mjs:1,38`. Part of the QA-001 sweep. · autofixable: no (bundle with the derived-data removal)

### QA-004 — Aptitude system (acolyte field + `aptitude` Item type + live Aptitudes panel) is DH2-only
- area: schema
- kind: dh-leftover
- severity: P2
- evidence: `src/template.json:1432` `acolyte.system.aptitudes: {}`; `:1470` + `:1604-1608` register an `aptitude` Item type (`itemDescription` template). `src/module/documents/acolyte.mjs:64-65` `get aptitudes()`; `src/module/documents/item.mjs:41` `get isAptitude()`. The panel is **live on the active V2 sheet**: `templates/actor/actor-acolyte-sheet.hbs:109` includes `panel/aptitude-panel.hbs` (that's the V2 template — `sheets/actor/acolyte-sheet-v2.mjs:54` points `PARTS.body.template` at it). `aptitude-panel.hbs:7` renders an "Aptitudes" header + a create-button (`data-action="itemCreate" data-type="aptitude"`) and lists `item.isAptitude` items.
- canon: RT 1e has no aptitude system — character progression uses per-Career advance tables (RT Core Ch.III), not DH2's Offence/Finesse/Defence/Psyker/Tech/Knowledge/Leadership/Fieldcraft/Social aptitude pairs. CLAUDE.md §B/§C flags the whole aptitude pipeline as DH2 dead weight; the `aptitudes` pack was already DROPPED (CLAUDE.md pack table). The Item type + sheet panel were not.
- gap: A DH2-only subsystem (acolyte field + registered Item type + a live, user-facing "Aptitudes" panel with a create control) ships with no RT meaning. A player can still create aptitude items; nothing in the RT engine consumes `system.aptitudes` (the getter is read by nothing functional). Functional dead-weight + UI clutter, not wrong-in-play.
- fix: Remove the `aptitude` Item type from the registry, the `aptitude-panel.hbs` include at `actor-acolyte-sheet.hbs:109`, the panel template + its `handlebars-manager.mjs:16` registration, the `acolyte.system.aptitudes` field, and `get aptitudes()`/`get isAptitude()`. (Bundle with QA-001's derived-data DH2 cleanup; needs a legacy-actor migration decision since existing actors may hold aptitude items.) · autofixable: no (UI + Item-type removal, migration decision)

### QA-005 — Talent item schema carries DH2 `aptitudes` + `tier` fields rendered on the talent sheet
- area: schema
- kind: dh-leftover
- severity: P3
- evidence: `src/template.json:1764-1773` talent type defines `aptitudes: ""` and `tier: 0`. Both are rendered as editable inputs on the item sheet: `templates/item/item-talent-sheet.hbs:15` `name="system.tier"` and `:27` `name="system.aptitudes"`.
- canon: RT 1e talents have no aptitudes and no tiers (those are DH2 concepts). CLAUDE.md "Schema notes": "Talent items use a DH-2e-inspired schema (`aptitudes`, `tier`, …) — but the content now reflects RT 1e talents, which don't natively have aptitudes/tiers. Convention … `aptitudes: ''` and `tier: '1'` … The `tier` field is currently not consumed by any sheet code." Confirmed: no `.mjs` reads `talent.system.tier` for any mechanic (grep finds only the template input).
- gap: Two DH2-only fields persist in the talent schema and are shown as editable controls on every talent sheet, inviting input that the engine never uses. `tier` is read by no code; `aptitudes` is `''` on all RT-sourced pack talents.
- fix: Remove the `aptitudes`/`tier` inputs from `item-talent-sheet.hbs` (and optionally the schema fields, with a migration note). Low priority — cosmetic schema cruft. · autofixable: yes (template input removal is safe; schema-field removal needs a migration decision)

### QA-006 — `charm` skill carried a dangling `"Inf"` (removed Influence characteristic) in its `characteristics` array
- area: schema
- kind: dh-leftover
- severity: P3
- evidence: `src/template.json:215-218` (before fix) `charm.characteristics: ["Fel", "Inf"]` while `charm.characteristic: "Fel"`. `"Inf"` was the only remaining reference to the deleted DH2 Influence characteristic (the `influence` characteristic itself is already gone from `base.characteristics` — grep for `influence` in template.json finds nothing). `_findCharacteristic` (`base-actor.mjs:152-159`) returns a `{total:0}` fallback for an unknown short-code, so any code path that selected `"Inf"` would roll against 0.
- canon: RT Core Skills table (CoreBook-1-200 markdown :3789) — "Charm | Basic | Fellowship | Interaction"; Charm is governed by Fellowship only.
- gap: A skill `characteristics` array offered a non-existent governing characteristic. Harmless in the common path (`characteristic: "Fel"` and `_computeSkills` reads `characteristics[0]`), but any characteristic-selector UI would surface a broken "Inf" option resolving to 0.
- fix: **FIXED this iteration** — removed `"Inf"` from `charm.characteristics` (now `["Fel"]`). Trivially-safe one-token data fix; gate green. · autofixable: yes (done)

### QA-007 — `threatLevel` (npc/vehicle/voidship) is a DH2-only field with getters but no consumer
- area: schema
- kind: dh-leftover
- severity: P3
- evidence: `src/template.json:1293` `npc.threatLevel: 0`. Getters exist at `src/module/documents/npc.mjs:17-18`, `vehicle.mjs:31-32`, `voidship.mjs:37-38` (`get threatLevel() { return this.system.threatLevel; }`) but nothing reads those getters — no sheet renders it, no encounter-builder consumes it.
- canon: n/a — code smell. RT 1e relies on GM judgement for encounter difficulty; there is no Threat Level / encounter-budget mechanic. CLAUDE.md deviation #4 already documents this as DH2-only flavour with no consumer.
- gap: Dead DH2 field + three unused getters. No correctness impact; pure cruft.
- fix: Drop `npc.threatLevel` from the schema and the three getters (or leave as documented inert flavour). · autofixable: yes (no consumers to break)

### QA-008 — not-a-bug rollup: confirmed-correctly-absent / deliberate DH2 schema items
- area: schema
- kind: not-a-bug
- severity: P3
- evidence: Verified during this `template.json` DH2-ism audit: (a) **`subtlety`** — grep across `src/module`, `src/templates`, `src/template.json` finds zero references (correct; DH2-only, properly absent). (b) **`influence` characteristic** — removed from `base.characteristics` (grep `influence` in template.json = 0 hits); only the orphan `"Inf"` skill ref remained, addressed in QA-006. (c) **parry-as-skill** — `src/template.json:120` (creature combat reactions) + `:746` define `parry` both as a Reaction budget AND as a WS skill; this is a **deliberate, documented** DH2-style house-rule extension (CLAUDE.md deviation #1 — lets characters spend XP on +10/+20 Parry; 0.7.9/0.7.16 wired the reaction modifiers + Basic-skill classification). Not changing.
- canon: RT Core — no Subtlety stat; 9 characteristics (no Influence); Parry is a Reaction. The repo already matches RT on (a)/(b); (c) is an intentional preserved deviation.
- gap: None — recording that these were checked and are either correct or a documented intentional deviation.
- fix: No action. · autofixable: n/a

### QA-009 — DH2 fork-origin naming cruft rollup (`DarkHeresy*` classes + "Dark Heresy" strings)
- area: naming
- kind: cosmetic
- severity: P3 (one user-visible string is P2-ish — see below)
- evidence: Verified directly this iteration.
  - **Config namespace:** `src/module/rules/config.mjs:15` `export const DarkHeresy = {};` — assigned to `CONFIG.rt` at `hooks-manager.mjs:107` (`CONFIG.rt = DarkHeresy`). The runtime global is correctly `game.rt`/`CONFIG.rt` (no `.dh`/`game.dh` anywhere), but the backing object keeps the fork name.
  - **21 `DarkHeresy*` sheet classes** (base `DarkHeresyItemSheet` at `src/module/sheets/item/item-sheet.mjs:4`; base `DarkHeresyItemContainerSheet` at `item-container-sheet.mjs:7`; + 19 item-sheet subclasses, one per `src/module/sheets/item/*-sheet.mjs`, each `export class DarkHeresy<Type>Sheet`). ~91 `DarkHeresy` identifier occurrences total (declarations + imports + the `hooks-manager.mjs` registrations ~L129-146). Internal-only; class names are never shown to users.
  - **User-visible / log "Dark Heresy" strings (6):** `hooks-manager.mjs:57` `console.log('Dark Heresy 2nd Edition | Registering system hooks')`; `:80` `console.log(\`Loading Dark Heresy 2nd Edition System…\`)`; `:91` `const consolePrefix = 'Dark Heresy | '` (prefixes runtime warns); `:246` `console.error('Dark Heresy | applyItemGrants failed', e)`; **`src/module/tours/main-tour.mjs:7`** `description: "Learn the basic features of the Dark Heresy 2nd edition system"` (this one is **in-app UI**, the only genuinely player-facing string); `src/module/chargen/data/taint_tables.json:298` a `_note` data comment (chargen shelved).
  - **Stale identifiers in `src/module/documents/item-container.mjs`:** class was renamed to `RogueTraderItemContainer` (`:5`) but `:3` still exports `DH_CONTAINER_ID = 'nested'` and `:12` logs `'DarkHeresyItemContainer: ' + this.name + ' update'` (debug `console.log` left in, references the old class name).
  - `src/lang/en.json` is **clean** — no Dark Heresy / DH cruft; no lowercase `dark-heresy`/`darkheresy` variants exist in src.
- canon: n/a — code smell / branding. CLAUDE.md "Stale/branding things" §J + deviation #3 already note `DarkHeresy*` class names as cosmetic fork residue ("renaming would touch many template files for zero functional gain. Defer.").
- gap: Fork-origin naming persists. No functional impact (globals are `rt`), but: the **main tour shows "Dark Heresy 2nd edition system"** to players (mislabels the system in-app); console boot/error lines say "Dark Heresy 2nd Edition" (confusing in logs/bug reports); a leftover debug `console.log` fires on every container update.
- fix: Lowest-risk, highest-value first: (1) fix the **tour description** + the 4 `hooks-manager.mjs` console strings to "Rogue Trader 3rd" — pure string edits, gate-safe; (2) remove the stray debug `console.log` at `item-container.mjs:12`. Bulk class rename (`DarkHeresy*`→`RogueTrader*`/`RT*`, `DarkHeresy` const→`RogueTrader`) is mechanical but touches ~25 files + the `hooks-manager` registrations — defer to a dedicated rename pass per CLAUDE.md. · autofixable: yes for the strings (low risk); no for the bulk class rename (large mechanical churn, do as its own commit)

### QA-010 — `commerce` skill governed by Intelligence; RT canon says Fellowship
- area: schema
- kind: data-quality
- severity: P1 (wrong test target in play)
- evidence: `src/template.json` (before fix) `commerce.characteristic: "Int"`, `characteristics: ["Int","Fel"]`. `acolyte.mjs:449` resolves the test characteristic as `skill.characteristic` (primary) → `:459-475` sets `skill.current` from it → `rollSkill` uses `skill.current` as `baseTarget` (`acolyte.mjs:184`). So every Commerce test rolled against Intelligence, not Fellowship.
- canon: RT Core skills table `CoreBook-1-200.pdf/markdown.md:3793` "Commerce | Advanced | **Fellowship**"; skill header `:3997` "## COMMERCE (ADVANCED) **Fellowship**"; starting-skill notation `:1769`/`:3217` "Commerce (Fel)".
- gap: Commerce tested at Int instead of Fel — a wrong characteristic for every Commerce roll (acquisition/haggling). Likely a DH2/fork carryover (Commerce was Int-flavoured in the fork's hybrid list).
- fix: **FIXED this iteration** — set `commerce.characteristic: "Fel"` and trimmed `characteristics` to `["Fel"]`. Trivially-safe canon-backed data fix; gate green (build OK, 166 tests). · autofixable: yes (done)

### QA-011 — `survival` skill governed by Perception; RT canon says Intelligence
- area: schema
- kind: data-quality
- severity: P1 (wrong test target in play)
- evidence: `src/template.json` (before fix) `survival.characteristic: "Per"`, `characteristics: ["Per","Ag","Int"]`. Same roll path as QA-010 (`acolyte.mjs:449,459-475,184`) → every Survival test rolled against Perception, not Intelligence.
- canon: RT Core skills table `CoreBook-1-200.pdf/markdown.md:3826` "Survival | Advanced | **Intelligence** | Exploration"; in-text reference `:1014` "Survival (**Int**) Tests" (Hivebound home-world penalty); skill header `:4506` "# SURVIVAL (ADVANCED, EXPLORATION)".
- gap: Survival tested at Per instead of Int. (Note: DH1/DH2 governed Survival by Int too — the `Per` here is a fork drift, not a DH2 mechanic per se.)
- fix: **FIXED this iteration** — set `survival.characteristic: "Int"` and trimmed `characteristics` to `["Int"]`. Trivially-safe canon-backed data fix; gate green. · autofixable: yes (done)

### QA-012 — not-a-bug: skill list + all specialist specialty lists now match RT canon (deviation #5 resolved)
- area: schema
- kind: not-a-bug
- severity: P3
- evidence: Full cross-check of `src/template.json:148-1286` (49 skills) against RT Core skills table `CoreBook-1-200.pdf/markdown.md:3784-3833` + per-skill specialty headers. All 48 RT-canon skills are present (the 49th is `parry`, the documented deliberate parry-as-skill deviation — CLAUDE.md #1). Specialty counts/names match canon EXACTLY: Common Lore 14 (`:4007`), Forbidden Lore 11 (`:4156`), Scholastic Lore 16 (`:4349`), Trade 13 (`:4551`), Speak Language 7 (`:4488`), Secret Tongue 7 (`:4431`), Ciphers 5 (`:3961`), Navigate Surface/Stellar/Warp (`:4278`), Pilot Personal/Flyer/SpaceCraft (`:4316`), Drive Ground/Skimmer/Walker (`:4141`), Performance Dancer/Musician/Singer/Storyteller (`:4298`). RT splits (Climb+Swim not Athletics; Concealment+Silent Move+Shadowing not Stealth; Speak Language+Secret Tongue+Ciphers+Literacy not Linguistics) are all in place; Barter (Fel/Basic) and Commerce (Fel/Advanced) both exist as distinct skills per canon.
- canon: RT Core Ch.III Skills — as cited above.
- gap: None — the specialty-list drift recorded as CLAUDE.md "Documented deviation #5" (Common Lore 8 vs 14, Forbidden 6 vs 11, Scholastic 9 vs 16, Trade 10 vs 13, Linguistics consolidation) was RESOLVED by the 0.7.17/0.7.18 skill rebuild. Recording that it was re-verified and is correct.
- fix: No action; update CLAUDE.md deviation #5 to mark resolved when convenient. · autofixable: n/a

### QA-013 — multi-entry `characteristics` arrays diverge from RT's single governing characteristic (vestigial)
- area: schema
- kind: data-quality
- severity: P3
- evidence: Many skills carry a `characteristics` array with >1 entry while RT lists exactly one governing characteristic — e.g. `src/template.json` `awareness.characteristics: ["Per","Fel","Int"]` (canon Perception only), `command: ["Fel","Int","S","WP"]` (canon Fellowship), `acrobatics: ["Ag","S"]` (canon Agility), `medicae: ["Int","Ag","Per"]` (canon Intelligence). The roll path uses only the singular `skill.characteristic` (`acolyte.mjs:449` falls back to `characteristics[0]` ONLY when `characteristic` is empty; `rollSkill` rolls `skill.current` from the primary), so these extra array entries are not actually offered as alternate roll characteristics anywhere — they are display/vestigial data.
- canon: RT Core skills table `CoreBook-1-200.pdf/markdown.md:3784-3833` — one Characteristic column per skill.
- gap: The arrays imply alternate governing characteristics that don't exist in RT and aren't honoured by the engine. No wrong-result impact (primary char drives rolls), but it's misleading fork-residue data and was the vector for the `charm`/`"Inf"` bug (QA-006) and masked the QA-010/011 primary-char errors (the correct char was buried in the array).
- fix: Normalise every skill's `characteristics` array to the single canon governing characteristic (matching `characteristic`). Mechanical but touches ~15 skills + needs confirming no sheet/prompt code reads `characteristics[1+]`; file rather than bulk-edit this iteration. · autofixable: yes (data-only, low risk) but deferred — do as one reviewed pass
