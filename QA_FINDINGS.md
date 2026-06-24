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

### QA-014 — Force-weapon psyker bonuses not automated (no +PR dmg/pen, no damage-type change, no Focus bonus)
- area: weapons
- kind: automation-gap
- severity: P2 (missing automation, manual workaround; real combat impact for any psyker with a force weapon)
- evidence: `src/packs/attack-specials/attack-specials.yml:252` (Force) — "the weapon deals bonus damage and gains bonus penetration equal to the psyker's Psy Rating … the damage type changes to Energy. In addition, whenever a psyker damages an opponent, he may make a Focus Power Test (Opposed Willpower) … for every degree of success, the force weapon's wielder deals an additional 1d10 E Damage, ignoring Armour or Toughness Bonus." The quality is listed in the catalog only (`src/module/rules/attack-specials.mjs:162` `{name:'Force', hasLevel:false}`) and is never consulted by the damage engine — `grep -niE "force" src/module/rolls/damage-data.mjs` = 0 hits (Force handling absent; only `roll-helpers.mjs` mentions a defensive-Psy-Rating multiplier, unrelated).
- canon: Into the Storm `roguetrader_intothestorm-126-257.pdf/markdown.md:77` ("Force Weapons are unique…"); full bonus text mirrored in the pack at attack-specials.yml:252.
- gap: A psyker wielding a Force weapon should add Psy Rating to its Damage AND Penetration, have its damage type become Energy, and (on a passed Focus Power Test) add +1d10 E per DoS ignoring armour/TB. The engine applies none of this — a Force weapon is just a Best-craftsmanship melee with no psyker scaling. The +PR damage/pen is a flat numeric loss on every force-weapon hit by a psyker.
- fix: In the damage pipeline, when the wielder is a psyker and the weapon has the Force quality, add `@pr` to damage and penetration and set damageType to Energy; surface the optional Focus-Power bonus-damage roll (reuse the opposed-WP / Focus path) as a prompt/effect. Needs psyker context + an opposed test, so engine work, not a data edit. · autofixable: no

### QA-015 — `Unstable` quality is unwired AND absent from the attack-specials catalog
- area: weapons
- kind: automation-gap
- severity: P2 (silent no-op; also can't be added via UI)
- evidence: `src/packs/attack-specials/attack-specials.yml:232` (Unstable) — "When an Unstable weapon scores a hit, roll 1d10. On a score of 1 it inflicts only half Damage, on a score of 2-9 it deals normal Damage, and on a score of 10 it inflicts twice the normal Damage." `grep -rni "unstable" src/module/` = **0 hits**: it is NOT in the `attackSpecials()` catalog (`src/module/rules/attack-specials.mjs:119-277`, every other quality is listed there) and NOT handled in `damage-data.mjs`. So a weapon carrying Unstable does nothing, and the quality can't even be selected from the special-quality picker.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:6021` (Unstable weapon quality, Ch.IX weapon qualities).
- gap: Per-hit damage variance (½ on a 1, ×2 on a 10) is unimplemented; the quality is also missing from the UI catalog list so it can't be authored. Double gap (engine + catalog).
- fix: Add `{name:'Unstable', hasLevel:false}` to `attackSpecials()` and, in the per-hit damage calc (`damage-data.mjs`), roll 1d10 per hit and apply ½/×1/×2 to that hit's damage. · autofixable: no (needs damage-pipeline change)

### QA-016 — `Recharge` not enforced (weapon can be fired every Round)
- area: weapons
- kind: automation-gap
- severity: P2 (missing automation; manual workaround)
- evidence: `src/packs/attack-specials/attack-specials.yml:112` (Recharge) — "the weapon must spend the Round after firing building up a charge and cannot be fired—in effect you can only fire the weapon every other Round." Listed in catalog only (`src/module/rules/attack-specials.mjs:218`); `grep -rni "recharge" src/module/` finds no enforcement — nothing flags the weapon as spent or blocks the next Round's attack.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:5967` (Recharge weapon quality).
- gap: A Recharge weapon should be unusable the Round after it fires; the engine never tracks or blocks this, so it can be fired every Round. (A per-Round Reaction-budget system already exists — `system.combat.reactions`, reset on `combatTurnChange`, per CLAUDE.md — so a "recharging until next turn" flag is feasible by the same machinery.)
- fix: On firing a Recharge weapon, set a per-Round "spent" flag (e.g. on the weapon or actor combat state) cleared on the owner's next turn; block the attack while spent. · autofixable: no (needs combat-turn state)

### QA-017 — `Power Field` parry-destroys-attacker's-weapon (75%) not automated
- area: weapons
- kind: automation-gap
- severity: P3 (situational)
- evidence: `src/packs/attack-specials/attack-specials.yml:92` (Power Field) — "When you successfully use this weapon to Parry an attack made with a weapon that lacks this quality, you have a 75% chance of destroying your attacker's weapon." The parry path `src/module/documents/acolyte.mjs:198-222` reads only Balanced (+10), Defensive (+15), Unwieldy/Unbalanced (cannot parry), and `parryBonus`; it never checks Power Field. The quality is catalog-only (`attack-specials.mjs:202`).
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:5959` (Power Field weapon quality). (The damage/penetration half of the quality is "already included in the weapon's profile" per canon, so only the parry-destroy effect is the gap.)
- gap: A successful parry with a Power-Field weapon vs a non-field weapon should give a 75% chance to destroy the attacker's weapon; unimplemented. No wrong-result on the parry roll itself — only the follow-on destroy effect is missing.
- fix: After a successful parry with a Power-Field melee weapon (and the incoming weapon lacks Power Field / Warp / Natural), prompt or auto-roll a 75% destroy check and post an effect. Needs the parry flow to know the attacker's weapon (defender-side context the engine doesn't currently thread). · autofixable: no

### QA-018 — `Customised` quality's ½ reload time not honored
- area: weapons
- kind: automation-gap
- severity: P3
- evidence: `src/packs/attack-specials/attack-specials.yml:32` (Customised) — "Reloading this weapon takes ½ the listed time, rounding up to the next full action." `grep -rniE "customised|customized" src/module/` = 0 hits. The only reload-time helper, `rapidReloadTime()` (`src/module/rolls/roll-helpers.mjs:445`), halves reload solely for the Rapid Reload talent and does not consult the weapon's Customised quality; `item.mjs:89` only exposes a boolean `canReload`.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:5915` (Customised weapon quality).
- gap: A Customised weapon should reload in half the listed time; the engine ignores the quality entirely.
- fix: Fold the Customised quality into the effective-reload computation (alongside Rapid Reload) so its displayed/used reload time halves. · autofixable: no (needs reload-time wiring; low risk but rules-adjacent)

### QA-019 — Target-side weapon-effect qualities are descriptive-only (no forced test / condition applied) — rollup
- area: weapons
- kind: automation-gap
- severity: P2 (missing automation; GM must resolve every effect by hand)
- evidence: `src/module/rolls/damage-data.mjs:391-444` — for Blast, Concussive, Corrosive, Crippling, Felling, Flame, Graviton, Hallucinogenic, Haywire, Indirect, Shocking, Snare, Toxic, Warp the engine only calls `addEffect(name, <prose>)`, attaching a sentence to the chat card (e.g. Concussive ":397" → "Target must pass Toughness test … or be Stunned"; Toxic ":437" → "Target must pass Toughness test … or suffer 1d10 damage"; Snare ":427"; Shocking ":424"; Flame ":408"). None of these roll the target's resist Test, apply the resulting condition (Stunned/Snared/Prone/on-fire/Fatigue), or subtract armour-destroyed / extra damage. Adjacent: `Flexible` ("cannot be Parried", attack-specials.yml:62) and `Smoke` (attack-specials.yml — area concealment) are catalog/data-only with no engine hook either (`grep` finds no consumer), because they are defender-side / area effects the engine doesn't orchestrate.
- canon: RT Core Ch.IX weapon qualities (`CoreBook-1-200.pdf/markdown.md` ~:5900-6030) — each quality specifies a concrete Test + condition.
- gap: The qualities are surfaced as text instructions for the GM rather than automated. This is partially **by design** (most are target-side and need the defender/GM to roll), so the workaround exists and it isn't a wrong-result — but it is the "described but the engine doesn't do it" class. Highest-value automatable subset: Concussive/Toxic/Shocking (target Toughness Test → Stun/Fatigue/damage), Snare (target Agility Test → Snared), Flame (target Agility Test → on fire) — all resolvable via the existing target-resist-roll path used by opposed psychic powers.
- fix: For the automatable subset, roll the named target Test against the listed modifier and apply the condition/secondary damage (reuse the opposed/target-roll machinery), leaving genuinely narrative ones (Smoke, Indirect deviation already auto-rolled, Warp) as text. Triage per quality; do NOT blanket-automate. · autofixable: no

### QA-020 — Combat-action help text mislabels Defensive parry bonus as +10 (canon/code = +15)
- area: weapons
- kind: data-quality
- severity: P3 (cosmetic — user-facing description string only)
- evidence: `src/module/rules/combat-actions.mjs:166` Parry action description — "the Defensive quality grants +10, Unwieldy weapons cannot Parry." But the engine applies +15 (`src/module/documents/acolyte.mjs:211` `rollData.modifiers['Defensive'] = 15`) and canon is +15.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:5933` (Defensive) — "+15 bonus to tests made when used to Parry"; mirrored in `attack-specials.yml:42`.
- gap: The Parry action's help text says +10 while the actual (correct) bonus is +15 — a misleading number shown to the user. The roll itself is correct.
- fix: Change the "+10" in the `combat-actions.mjs:166` description string to "+15". Trivially-safe string edit (deferred this iteration to keep it pure-audit). · autofixable: yes

### QA-021 — Force-field Poor-craftsmanship overload chance is 15; canon Table 3-10 says 20
- area: armour
- kind: data-quality
- severity: P1 (wrong result in play — a Poor field overloads less often than RAW)
- evidence: `src/module/rolls/force-field-data.mjs:25-36` `craftsmanshipToOverload()` returns Poor→**15**, Common→10, Good→5, Best(default)→1; consumed at `:20` (`this.overloadRating = …`) and `:45-47` (`if (this.roll.total <= this.overloadRating) this.overload = true`).
- canon: Into the Storm `roguetrader_intothestorm-126-257.pdf/markdown.md:318-323` TABLE 3-10 (Field Craftsmanship → Overload Roll): "Poor | 01-20 / Common | 01-10 / Good | 01-05 / Best | 1". Confirmed identical in Faith & Coin Table 3-5 (`roguetrader_faithandcoin.pdf/markdown.md:2483-2488`: Poor 01–20). Tau Char Guide Table 1-6 references the same.
- gap: A Poor-craftsmanship field overloads only on a d100 ≤ 15 instead of ≤ 20 — fields fail to burn out 5% less often than RAW. Common/Good/Best are all correct.
- fix: **FIXED this iteration** — `force-field-data.mjs:28` Poor now returns 20. Trivially-safe canon-backed one-token fix; no test pins the value; gate green. · autofixable: yes (done)

### QA-022 — `maxAgility` armour field is a DH2 leftover (no RT armour Max-Agility stat; no code consumer)
- area: armour
- kind: dh-leftover
- severity: P3
- evidence: `src/template.json:1617` armour type defines `maxAgility: 0`; present on many NPC armour items (e.g. `starsofinequity-npcs.yml:4211`, `thesoulreaver-npcs.yml:769`). Grep across `src/module` for `maxAgility` = **0 hits** — no derived-data path, sheet, or roll reads it. RT 1e armour table (`CoreBook-1-200.pdf/markdown.md:7160-7190`, "TABLE 5-12: ARMOUR") has columns Name | Locations Covered | AP | kg | Avail. — **no Max Agility column**.
- canon: RT Core Ch.V armour table (`CoreBook-1-200.pdf/markdown.md:7160`) — RT does not gate Agility by armour; encumbrance from heavy gear is handled separately (Ch.IX p.267), and the only armour-borne Agility penalty is the *Poor craftsmanship* −10 (see QA-023). Max-Agility-caps-Agility is a DH2 mechanic.
- gap: Dead DH2-only schema field on every armour item; defines a stat RT never uses and no code consumes. Pure cruft (no wrong-result impact).
- fix: Remove `maxAgility` from the armour template + strip it from pack YAML (mechanical), or leave as inert documented cruft. Bundle with the broader DH2-schema cleanup (QA-004/005). · autofixable: yes (no consumers to break) — deferred (touches many pack files)

### QA-023 — Poor-craftsmanship armour −10 Agility penalty not automated
- area: armour
- kind: automation-gap
- severity: P2 (missing automation; manual workaround)
- evidence: `src/module/documents/acolyte.mjs:547-645` `_computeArmour()` reads each armour's `craftsmanship` ONLY to grant Best's +1 AP (`:623-628`) and (via `item.totalWeight`) Best's half-weight; it never applies a Poor-armour Agility penalty, and `rollCharacteristic`/`rollSkill` add no such modifier. No `system.agility.modifier` is written for worn Poor armour anywhere.
- canon: RT Core armour craftsmanship (`CoreBook-1-200.pdf/markdown.md:7148`): "Characters wearing **Poor** armour take a **−10 penalty to all Agility Tests**." (CLAUDE.md 0.7.9 already notes "Poor armour (-10 Ag) not automated.")
- gap: Wearing Poor armour should impose −10 on all Agility Tests; the engine ignores Poor craftsmanship for armour entirely (only Best is wired). Manual GM application required.
- fix: In `_computeArmour` (or the roll path), when any equipped armour is Poor craftsmanship, apply −10 to Agility-governed tests (an additive `system.agility.modifier`, or a Fatigue-style `'Poor Armour'` roll modifier on Agility skills/characteristic). · autofixable: no (needs roll-modifier wiring)

### QA-024 — Good-craftsmanship armour +1 AP vs the first attack each round not automated
- area: armour
- kind: automation-gap
- severity: P3 (situational; needs per-round state)
- evidence: `src/module/documents/acolyte.mjs:623-628` only bumps AP for `maxArmourCraft[location] === 'Best'`; Good craftsmanship is never consulted in `_computeArmour`, and assign-damage (`assign-damage-data.mjs:44-49`) reads the static `armour.total` with no first-attack-this-round bump.
- canon: RT Core armour craftsmanship (`CoreBook-1-200.pdf/markdown.md:7150`): "**Good** … Against the **first attack in any round**, the armour increases its AP by 1." (CLAUDE.md 0.7.9: "Good armour (+1 AP first attack/round) not automated — requires per-round state tracking.")
- gap: Good armour should give +1 AP against the first incoming hit each Round; unimplemented. Lower priority — needs per-Round "first hit consumed" state (the Reaction-budget machinery reset on `combatTurnChange` could host the flag).
- fix: Track a per-Round "first-attack-absorbed" flag per actor (reset on combatTurnChange like reactions); in assign-damage add +1 to the struck location's AP if the actor wears Good armour there and the flag is unset, then set it. · autofixable: no (combat-turn state)

### QA-025 — Primitive armour half-AP vs non-Primitive weapons not automated
- area: armour
- kind: automation-gap
- severity: P2 (wrong soak if relied on; manual workaround)
- evidence: 7 armour entries carry `type: Primitive` (`src/packs/armour/armour.yml:14,35,54,73,92,112,770`). `assign-damage-data.mjs:42-49` reduces damage by `locationArmour.total` directly and never reads the armour's `system.type`; grep for `primitive` in `assign-damage-data.mjs`/`damage-data.mjs` shows the only Primitive handling is the *weapon*-quality damage-die cap (`damage-data.mjs:157-160`) + the unarmed/natural-weapon profile (`roll-helpers.mjs`). No path halves Primitive *armour* AP.
- canon: RT Core (`CoreBook-1-200.pdf/markdown.md:7192`): "Armour with the **Primitive quality only offers full protection against weapons also having the Primitive quality**, otherwise it only provides **half its normal AP value (rounding up)**. Primitive armour's APs are halved **before** being reduced for the weapon's penetration."
- gap: A character in Primitive armour (heavy leathers, grox hide, feudal plate, beast hide, squighide) struck by a modern weapon should soak only ⌈AP/2⌉ (before penetration); the engine applies full AP. Over-protects vs all non-Primitive weapons.
- fix: In assign-damage, when the struck location's winning armour piece is `type: 'Primitive'` and the incoming weapon lacks the Primitive quality, halve that location's worn AP (round up) before subtracting penetration. Needs the armour `type` of the winning piece threaded to the damage step (currently only the summed `total` is exposed). · autofixable: no

### QA-026 — Per-field force-field conditions/coverage not automated (rollup)
- area: armour
- kind: automation-gap
- severity: P3 (situational)
- evidence: `src/module/rolls/force-field-data.mjs:15-48` rolls a single `protectionRating` uniformly with no hit-location, attack-type, or post-block effect; `force-field-prompt.mjs:48-55` only gates on `activated`/`overloaded`. So canon per-field clauses are unimplemented: **Mirror Shield** "Protection Rating only applies to the Arm and Body" + Energy-reflect Reaction (ItS `…126-257.pdf/markdown.md:273`); **Power Field** "does not function against ranged attacks made within 3 metres, or melee attacks" + −40 stealth (ItS :325); **Conversion Field** photon-flash burst if it blocks >12 damage (ItS :296).
- canon: ItS Force Fields section (`roguetrader_intothestorm-126-257.pdf/markdown.md:265-341`).
- gap: The generic field roll ignores per-field location restrictions, attack-type exceptions, and on-block secondary effects — a Power Field wrongly blocks point-blank/melee, a Mirror Shield wrongly covers all locations, and Conversion/Mirror follow-on effects never fire. Genuinely per-item special handling the engine doesn't thread (hit location + attacker context into the field roll).
- fix: Thread hit-location + attack-type into ForceFieldData and add per-field clauses (or surface them as chat-card effect text like the target-side weapon qualities in QA-019). Triage per field; mostly narrative. · autofixable: no

### QA-027 — Synthetic Muscle Grafts +1 Strength Bonus not automated
- area: cybernetics
- kind: automation-gap
- severity: P2 (missing automation; flat always-on bonus simply absent)
- evidence: `src/packs/cybernetics/cybernetics.yml:665-681` (Synthetic Muscle Grafts) — description "Users gain a +1 to their Strength Bonus for a normal implantation." The entry carries NO `effects`/`flags.rt` block at all (unlike the wired Bionic Heart / Calculus Logi / Subskin Armour entries above/below it), so nothing applies the bonus. The actor strength derivation (`acolyte.mjs:362-379`) computes `bonus = floor(total/10) + unnatural` and only reads the Unnatural-trait list — no cybernetic-sourced Strength-Bonus addend.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:7848` — "Users gain a +1 to their Strength Bonus for a normal implantation." (CLAUDE.md "Known gaps" already flags "Synthetic Muscle Grafts +1 SB" as description-only.)
- gap: A character with Synthetic Muscle Grafts should add +1 to their Strength Bonus (raising melee damage, carry/lift, Strength-Bonus-scaled effects); the engine applies nothing. **Schema caveat:** there is no additive "Strength Bonus" field — `system.characteristics.strength.modifier` adds to the characteristic *total* (10 points = +1 SB), so an AE on `strength.modifier: +10` would also inflate the displayed raw Strength by 10. Expressing "+1 SB without +10 raw Strength" needs either a new `strength.bonusModifier` addend in the bonus formula or routing through the `.unnatural` addend.
- fix: Add an additive Strength-Bonus path (e.g. a `system.characteristics.<c>.bonusModifier` summed into `bonus = floor(total/10) + unnatural + bonusModifier`) and give Synthetic Muscle Grafts an AE writing `strength.bonusModifier: 1`. (Best-craftsmanship's Unnatural Strength ×2 + −10 Agility is the craftsmanship-conditional layer — see QA-030.) · autofixable: no (needs a schema/derivation change to express +SB cleanly)

### QA-028 — Blackbone Bracing +2 unarmed damage not automated (talents granted, damage bonus dropped)
- area: cybernetics
- kind: automation-gap
- severity: P2 (missing automation; manual workaround)
- evidence: `src/packs/cybernetics/cybernetics.yml:734-758` (Blackbone Bracing) grants Bulging Biceps + Iron Jaw via `flags.rt.grants` (wired ✓) but its third effect — "gains a +2 bonus to Damage for all unarmed attacks" — has no wiring. The unarmed-damage path only varies the *dice formula* by talent/trait (`roll-helpers.mjs:547-565` `unarmedDamageProfile` returns `{formula, primitive, source}` with no additive damage modifier) and `damage-data.mjs:113-123` substitutes that formula; there is no hook to add a flat +2 to unarmed strikes from a cybernetic. `grep -rni "blackbone" src/module/` = 0 hits.
- canon: Into the Storm `roguetrader_intothestorm-126-257.pdf/markdown.md:712` — "gains the Bulging Biceps and Iron Jaw Talents, and gains a +2 bonus to Damage for all unarmed attacks."
- gap: Blackbone Bracing's +2 unarmed damage never reaches the roll — only the two talent grants apply. Every unarmed strike under-rolls by 2.
- fix: Add an additive unarmed-damage modifier (collected from cybernetics/talents that grant it) into the unarmed branch of `damage-data.mjs` (alongside the `unarmedDamageProfile` formula), or extend `unarmedDamageProfile` to return a `+damage` addend. · autofixable: no (damage-pipeline change)

### QA-029 — Augmented Senses does not grant the Heightened Senses talent (no grants block)
- area: cybernetics
- kind: automation-gap
- severity: P2 (described grant simply absent)
- evidence: `src/packs/cybernetics/cybernetics.yml:128-127` (Augmented Senses) description "This implant grants the Heightened Senses Talent for any one sense (sight, smell, etc.)" — but the entry has NO `flags.rt.grants` block (only 4 cybernetics carry `grants:` — Bionic Heart, Memorance, Vitae, Blackbone — `grep -c "grants:" = 4`, Augmented Senses not among them). The item-grant machinery (`flags.rt.grants` + the `g.choice` choice-grant branch) exists and is used by Sixth Sense (per BUG-010), and the 5 per-sense talents exist (`talents.yml:1374-1457` Heightened Senses Sight/Smell/Sound/Taste/Touch). So a choice-grant is expressible but unwired here.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:7740` — "This implant grants the Heightened Senses Talent for any one sense (sight, smell, etc.)."
- gap: Adding Augmented Senses to an actor should grant a Heightened Senses (chosen sense) talent; nothing is granted. Parallel to Cybernetic Senses (Good craftsmanship) which also grants Heightened Senses — see QA-030.
- fix: Add `flags.rt.grants: [{name: 'Heightened Senses', type: talent, choice: <sense>}]` (choice-grant, like Sixth Sense → Rival) so the player picks the sense and the talent embeds. The 5 per-sense talents are named `Heightened Senses (Sight)` etc., so resolution may need a base "Heightened Senses" pickable or a choice-suffixed name match. · autofixable: no (grant + choice-resolution decision)

### QA-030 — Craftsmanship-conditional cybernetic bonuses (Good/Poor) entirely unwired — rollup
- area: cybernetics
- kind: automation-gap
- severity: P2 (multiple missing automations)
- evidence: Several cybernetics gate their bonuses on the item's `craftsmanship` (Poor/Common/Good/Best), but `_computeArmour`/derived data only ever reads cybernetic craftsmanship for the **armour** Best +1 AP path (`acolyte.mjs:623-628`) — there is no general "cybernetic craftsmanship → bonus" branch anywhere (`grep` shows no consumer keying cybernetic `craftsmanship` to a talent/skill/characteristic effect). Unwired craftsmanship clauses: **Bionic Arm** (`cybernetics.yml:9-13`) Poor −10 WS/BS + half-Ag fine manipulation / Good +10 Ag delicate + +10 Str using arm; **Bionic Locomotion** (`:27-33`) Poor halve Movement + Ag-test-or-fall on run / Good Sprint talent + +20 jump-leap; **Bionic Respiratory System** (`:47-56`) Poor −20 Silent Move + raised strenuous-test difficulty / Good full life support; **Cybernetic Senses** (`:313-326`) Poor −20 to that sense / Good Heightened Senses talent + +20 resist sense-attacks; **MIU** (`:473-486`) Good expanded +10 list (Logic/Inquiry/BS) + familiar-sense; **Synthetic Muscle Grafts** (`:671-675`) Best Unnatural Strength ×2 + −10 Agility (see QA-027). Only the **Common**-tier always-on bonuses are wired (Bionic Respiratory +20 vs gas; MIU common +10 Tech/Pilot/Drive).
- canon: RT Core `CoreBook-1-200.pdf/markdown.md` cybernetics section (pp.131-134; e.g. `:7740`, `:7848`) + Into the Storm cybernetics — each entry's Poor/Good/Best line.
- gap: A character's bionics craftsmanship has no mechanical effect beyond armour AP. Poor bionics impose none of their penalties; Good bionics grant none of their bonuses/talents. The whole craftsmanship-conditional layer of cybernetics is descriptive-only. (Most players ship Common, so the live impact is bounded — but Good/Poor are routinely chosen.)
- fix: Add a cybernetic-craftsmanship resolution layer: per item, when `craftsmanship` is Good/Poor, apply the listed AE/conditionalBonus/grant/penalty (e.g. Good Bionic Locomotion → grant Sprint; Poor Bionic Arm → −10 WS/BS conditionalBonus). Mechanical but per-entry; triage Common-only vs craftsmanship-tiered. · autofixable: no

### QA-032 — Hyperactive Nymune Organ: +1 Reaction/round + Full-Move/Run movement bonus recorded as narrative but automatable
- area: talents
- kind: automation-gap
- severity: P2 (missing automation; a standing per-round combat bonus simply absent)
- evidence: `src/packs/talents/talents.yml:1535` (Hyperactive Nymune Organ) — "The Kroot gains one additional Reaction per round. When taking the Full Move action, the Kroot may move an extra number of metres equal to his unmodified Agility Bonus. When taking the Run action, he may double his movement for one Round." No `effects`/`conditionalBonuses`/`grants`. It is recorded as intentionally text-only in the ratchet (`tests/chargen/effect_wiring_audit.test.mjs:218` NARRATIVE list). BUT the engine ALREADY computes a per-round Reaction budget by talent name (`acolyte.mjs:432` `reactionBudget(...)` → `system.combat.reactions.{dodge,parry}.max`; `roll-helpers.mjs:220-230` adds +1 for Step Aside/Wall of Steel), and movement is derived in `base-actor._computeMovement` — so "+1 Reaction" and "extra AgB metres" are the same class of effect already wired for two other talents.
- canon: Into the Storm `roguetrader_intothestorm-1-125.pdf/markdown.md:2065` (Hyperactive Nymune Organ) — verbatim "gains one additional Reaction per round … move an extra number of metres equal to his unmodified Agility Bonus … double his movement [on Run]."
- gap: A Kroot with this talent should have +1 Reaction each Round and a larger Full Move/Run; the engine grants neither. Caveat: the current reaction-budget model tracks `dodge.max`/`parry.max` as separate base-1 pools rather than RT's single shared Reaction (RT Core p.244), so "one additional Reaction" has no exact slot — same modelling gap that leaves Defensive Stance's "gain an additional Reaction" (`combat-actions.mjs:140`) unautomated.
- fix: Extend `reactionBudget` to add the extra Reaction for this talent (and ideally rework dodge/parry into a shared pool to match RT), and add the Full-Move +AgB / Run-double to `_computeMovement` by talent name. Engine work, not a data AE. · autofixable: no
- note: Listed only as an unverified candidate in the BUGS.md SWEEP block; this is the first verified finding (with canon) — not a re-file of a fixed bug.

### QA-033 — Warp Conduit: +1 Psy Rating when pushing / −10 Psychic Phenomena recorded as narrative but automatable
- area: talents
- kind: automation-gap
- severity: P2 (missing automation; affects every Push by a psyker with the talent)
- evidence: `src/packs/talents/talents.yml:3365` (Warp Conduit) — "When pushing, he may add a +1 bonus to his Psy Rating and subtract -10 on any resultant Psychic Phenomenon rolls." No `effects`/`conditionalBonuses`; recorded as NARRATIVE in `effect_wiring_audit.test.mjs:219`. The psychic Push engine exists and is the natural host: `PsychicRollData.pushCap` getter + Fettered/Unfettered/Push PR resolution (`roll-data.mjs` ~L374+, per CLAUDE.md §H) and `checkForPerils` (`action-data.mjs:25`) already gate Phenomena on the rating-vs-PR relationship — a +1-PR-on-push and a −10-phenomena addend slot directly into that path.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:4800` (Talent summary) "+1 to Psy Rating when pushing"; full text `:5674` (## WARP CONDUIT). Prereq table `:2441`.
- gap: A psyker with Warp Conduit gets no PR bump and no phenomena mitigation when Pushing; both are unimplemented. Cross-refs the QA-PSYCHIC dimension (push/phenomena path).
- fix: When the cast is a Push and the actor has Warp Conduit, add +1 to the effective Psy Rating used for the power and −10 to the Psychic Phenomena roll. Needs psyker/cast context (like QA-014's Force-weapon gap), so engine work. · autofixable: no

### QA-034 — Combat-action-penalty-negating talents (Sharpshooter, Takedown) unwired — rollup
- area: talents
- kind: automation-gap
- severity: P2 (the −20 penalty is engine-applied but never removed → wrong to-hit for these talents)
- evidence: The engine applies the Called Shot and Stun −20 modifiers (`src/module/rules/combat-actions.mjs:124` Called Shot `attack.modifier: -20`; `:277` Stun `attack.modifier: -20`). Two talents negate exactly these but are unwired: **Sharpshooter** (`talents.yml:2886`) "When making a called shot, he does not incur the normal -20 penalty"; **Takedown** (`talents.yml:3027`) "When performing a Stun Action, the character does not suffer a -20 penalty to his Weapon Skill." Neither carries `effects`/`conditionalBonuses`; both sit in the NARRATIVE ratchet (`effect_wiring_audit.test.mjs:228,229`). `conditionalBonuses` key only on skills/characteristics (`base-actor.collectOptionalBonuses` `:87-90`), so they can't express "when the action is Called Shot/Stun" — the attack flow doesn't consult the talent.
- canon: Sharpshooter — RT Core `CoreBook-1-200.pdf/markdown.md:4777` "No penalties for called shots"; Takedown — `:5576` "When performing a Stun Action, the character does not suffer a –20 penalty to his Weapon Skill."
- gap: A character with Sharpshooter still eats −20 on Called Shots; with Takedown still eats −20 on Stun — the penalty the talent is supposed to cancel is applied unconditionally. Same engine shortfall as BUG-003 (Weapon Master): the conditional machinery has no "weapon-class / combat-action" condition. (Bulging Biceps' "no −30 for failing to brace" is the same class but the engine doesn't currently apply the brace −30 at all — `combat-actions.mjs:116` is description-only — so there's nothing to negate yet.)
- fix: Extend the conditional/attack-specials machinery with an action-subtype (and weapon-class, per BUG-003) condition, and have the attack modifier sum skip/cancel the Called Shot/Stun −20 when the actor has the matching talent. Engine work. · autofixable: no

### QA-035 — Polyglot: treat-all-languages-as-Basic (−10) recorded as narrative but expressible via the existing `treatAsBasic` path
- area: talents
- kind: automation-gap
- severity: P3 (situational; Advanced-language tests are simply blocked-or-manual)
- evidence: `src/packs/talents/talents.yml:2437` (Polyglot) — "He treats all languages as Basic Skills … tests using this Talent suffer a -10 penalty." Recorded as NARRATIVE (`effect_wiring_audit.test.mjs:227`). The `treatAsBasic` mechanism already exists (0.7.20): `acolyte.mjs:157` lets `rollSkill` proceed on an untrained skill when `skill.treatAsBasic`, and `:461-494` sets `treatAsBasic` per-skill — but only from the manual "As Basic" advance=-1 dropdown, never from a talent. Speak Language is an Advanced specialist skill, so without Polyglot wiring its untrained specialities stay blocked.
- canon: RT Core `CoreBook-1-200.pdf/markdown.md:5417` (## POLYGLOT).
- gap: Polyglot should let a character attempt any Speak Language test untrained at a −10 penalty; the engine grants neither the treat-as-Basic nor the −10. Manual workaround only.
- fix: When the actor has Polyglot, set `treatAsBasic` on all Speak Language specialities in `_computeSkills` and add a −10 conditional on those rolls. Modest engine work (talent-driven `treatAsBasic` + a language-scoped conditional). · autofixable: no

### QA-036 — not-a-bug rollup: re-roll / immunity / PF / positional talents correctly left narrative (no engine path)
- area: talents
- kind: not-a-bug
- severity: P3
- evidence: Verified during this talents/traits audit that the following NARRATIVE-listed entries are correctly text-only because the engine has no mechanism to express them: **re-roll-failed-Test** — Nerves of Steel (`talents.yml:2270` "re-roll failed Willpower Tests to avoid/recover from Pinning"), Strong Minded (`:2967` re-roll vs mind-affecting Psychic Techniques), Unshakeable Faith (`:3289` re-roll failed WP vs Fear), Die Hard (`:607` roll twice to avoid death) — there is NO re-roll-prompt path in the roll pipeline (`rollCharacteristic`/`rollSkill` produce a single 1d100), so a static AE/conditional can't model them; **immunity / condition-suppression** — Fearless (`:898`), Jaded (`:1700`), Duty Unto Death (`:737`), Iron Jaw (`:1685` Toughness-test-to-ignore-Stun), Hardy (`:1215`), Dark Soul (`:530` half Malignancy penalty) — these gate on conditions the engine doesn't track (Fear/Pinning/Stun/Malignancy state); **PF / Endeavour / Objective-points** — Hard Bargain (`:1187` +1 PF per Endeavour), Bloodtracker (`:337` +100 Objective Points), Master Enginseer (`:2087` Fate-Point auto-success) — group/Endeavour economy the engine doesn't orchestrate; **positional / ally-targeted** — Master & Commander (`:2028` no gang-up penalty for allies + boarding +10), Into the Jaws of Hell (`:1645` allies immune to Fear + ship +5 Morale), Ancestral Blessing/Blood of the Stalker (`:58`/`:323` once-per-day buff to N Kroot allies). Plus traits Auto-Stabilised (`traits.yml:5`), Dark Sight (`:54`), Regeneration (`:155`), Strange Physiology (`:183`) — all gate on combat-state/lighting/hit-location resolution the engine doesn't currently thread.
- canon: RT Core Ch.III talents / Ch.XIV traits + ItS — as cited per entry above.
- gap: None now — recording that these were checked and their NARRATIVE classification is currently correct. The re-roll cluster (Nerves of Steel / Strong Minded / Unshakeable Faith / Die Hard) becomes automatable only once a re-roll-prompt subsystem exists; the immunity cluster only once Fear/Pinning/Stun/Malignancy are tracked conditions.
- fix: No action; revisit the re-roll cluster if/when a re-roll prompt path is added. · autofixable: n/a

### QA-031 — not-a-bug rollup: cybernetics correctly wired or correctly narrative-only
- area: cybernetics
- kind: not-a-bug
- severity: P3
- evidence: Verified during this cybernetics audit that the following are already correctly handled and need no change: **AE/conditionalBonus/armour-wired** — Bionic Respiratory System (Common +20 T vs gas, conditionalBonus `:63-70`), Calculus Logi (+10 Literacy/Logic/Scholastic Lore AE `:224-255`), Cranial Armour (+1 head AP `:293-305`), Bionic Heart (+1 body AP + Sprint grant `:188-203`), Subskin Armour (+2 arms/body/legs `:651-663`), Medicae Mechadendrite (+10 Medicae/Interrogation AE `:410-437`), Optical Mechadendrite (+10 Perception AE + +20 night conditionalBonus `:547-578`), Utility Mechadendrite (+10 Tech-Use AE `:709-732`), Scribe-Tines (+10 Inquiry AE `:614-637`), Manipulator Mechadendrite (+20 Str conditionalBonus `:378-385`), MIU (+10 Tech/Pilot/Drive conditionalBonus `:493-500`), Memorance (Total Recall grant `:458-462`), Vitae Supplacement (Autosanguine grant `:865-869`). **Correctly narrative/immunity-only (no numeric bonus to wire)** — Implant Systems (section header), Locator Matrix, Respiratory Filter (gas immunity), Gastral Bionics (ingested-poison immunity), Pain Ward (ignore-Stun, conditional/narrative), Voidskin (extra void-exposure rounds), Volitor Implant (compulsion control), Vox Implant (comms), Cortex Implants (creation-time stat loss / Insanity), Auger Arrays (auspex equipment). **Correctly modelled as weapons/equipment, not bonuses** — Baleful Eye, Ballistic Mechadendrite, MIU Weapon Interface, Internal Blade, Internal Power Cell (these grant a usable weapon/action, not a flat modifier; they render as items with their text).
- canon: RT Core Ch.V cybernetics + ItS cybernetics.
- gap: None — recording the wired/narrative subset so a later pass doesn't re-flag them. The genuine unwired gaps are QA-027 (Synthetic Muscle Grafts +1 SB), QA-028 (Blackbone +2 unarmed), QA-029 (Augmented Senses grant), QA-030 (craftsmanship-conditional layer).
- fix: No action. · autofixable: n/a

### QA-037 — Focus Power Test is missing the +5-per-Psy-Rating bonus (every psychic test rolls far too low)
- area: psychic
- kind: dh-leftover
- severity: P0 (wrong result in play — every Focus Power Test is short by 5×PR)
- evidence: `src/module/rolls/roll-data.mjs:416` is the only PR-adjacent Focus modifier — `this.modifiers['focus'] = this.hasFocus ? 10 : 0` (a flat +10 toggled by the `psy.hasFocus` sheet flag). The effective Psy Rating is computed at `:392-400` (`this.pr` = Fettered ⌈rating/2⌉ / Unfettered rating / Push rating+cap) but is used ONLY for damage/range/phenomena — never added to the test target. `grep -niE "5 ?\* ?(this\.)?pr|psy rating|rating ?\* ?5" src/module/rolls/{roll-data,action-data}.mjs src/module/documents/acolyte.mjs` finds NO `5×PR` term anywhere. The base target is `Willpower.total` (or the power's skill) with only `difficulty`/`modifier`/`focus`/`power` modifiers (`roll-data.mjs:388-420`).
- canon: RT Core p.157 (`CoreBook-1-200.pdf/markdown.md:8043`): "In any Focus Power Test, the Psyker adds **+5 to his Focus Power score for each level of Psy Rating**." Worked example (`:8056`): "Quitis' Focus Power Tests that use Willpower begin at 70 (**Willpower 45 + Psy Rating 5x5**)." This is NOT the DH2 mechanic 0.7.12 removed — 0.7.12 correctly dropped the DH2 "±10 per PR-difference-from-max" term, but RT 1e's distinct "+5 per PR level" was never added, leaving the test with no PR bonus at all. CLAUDE.md §H's claim that the engine "preserved" a correct PR bonus is false — none exists.
- gap: A Willpower-45 / PR-5 psyker should roll Focus Power Tests at 70; the engine rolls them at 45 (or 55 with the homebrew `hasFocus` +10) — 15-25 points too hard for every single power cast. The flat `hasFocus ? 10` modifier is itself non-canon (RT has no inherent +10 for focusing). Severity P0: it makes every psyker's powers fail dramatically more often than RAW, across the whole psychic subsystem.
- fix: In `PsychicRollData.update()` (`roll-data.mjs:415`) add `this.modifiers['psy rating'] = 5 * this.pr;` (effective PR already accounts for Fettered/Unfettered/Push), and remove or re-justify the flat `focus`+10. ⚠ Foundry-coupled (roll pipeline) — verify on rt-smoke (PR-5 Unfettered WP-45 → modifiedTarget 70). · autofixable: no (engine roll change; rules-load-bearing — verify live)

### QA-038 — Push psychic-phenomena logic wrong: Push+doubles diverted to Perils (no such RT rule); Push must ALWAYS roll Phenomena
- area: psychic
- kind: dh-leftover
- severity: P1 (wrong phenomena/perils outcome on every Push)
- evidence: `src/module/rolls/action-data.mjs:60-72` `checkForPerils()`: on Push (`pr > rating`), `if (!isDoubles) triggerPhenomena` ELSE `if (isDoubles) triggerPerils` (with comment "Push + doubles is also a Perils trigger per RT corebook p.181"). So a Push that rolls doubles fires `drawFromTable('Perils of the Warp')` and SKIPS the Psychic Phenomena roll; a Push without doubles rolls Phenomena.
- canon: RT Core p.157 Table 6-1 (`CoreBook-1-200.pdf/markdown.md:8049` Sanctioned row, `:8060`): Push "will **always** trigger a phenomena check" — i.e. Push ALWAYS rolls on the **Psychic Phenomena** table (doubles or not), with a +5/+1-rating bonus. There is **no** "doubles on Push → Perils" rule. Perils of the Warp is reached ONLY when the Psychic Phenomena result is **75+** (`:8169`: "75+ | Perils of the Warp ... Roll on Table 6-3 ... instead"). The "doubles" mechanic governs only Unfettered (`:8049`, `:8114`). The cited p.181 rule does not exist; this is the DH2 "Push doubles = Perils" convention leaking in.
- gap: (1) Push+doubles wrongly rolls Perils directly and skips Phenomena — should roll Phenomena like any other Push; (2) Perils is never reached via the canonical 75+ Phenomena escalation, since `drawFromTable('Psychic Phenomena')` (`action-data.mjs:13-29`) just returns the result text — a 75+ "roll on Perils instead" entry is shown as prose, not auto-rolled on the Perils table. Net: Push outcomes are systematically wrong (too many direct Perils on doubles; no Perils on a high non-doubles Phenomena roll).
- fix: Make Push always roll the Psychic Phenomena table (drop the doubles→Perils branch); detect a 75+ Phenomena result (or a "Perils of the Warp" entry) and chain into `drawFromTable('Perils of the Warp')`. Keep Unfettered = doubles→Phenomena, Fettered = none. ⚠ Foundry-coupled — verify on rt-smoke. · autofixable: no (rules logic + table escalation)

### QA-039 — Psychic-phenomena/perils roll modifiers (Push per-rating, Sustaining, Renegade, warding) not applied
- area: psychic
- kind: automation-gap
- severity: P2 (missing automation; phenomena severity systematically too low/high)
- evidence: `src/module/rolls/action-data.mjs:13-29` `drawFromTable(tableName)` takes no modifier and calls `table.roll()` raw; `checkForPerils()` (`:74-82`) draws with no bonus. None of the Table 6-1 / Astropathic / warding modifiers to the Phenomena/Perils roll are applied.
- canon: RT Core p.157 Table 6-1 (`CoreBook-1-200.pdf/markdown.md:8049-8050`): Push = "+5 per +1 rating desired, up to +3/+15" (Sanctioned) / "+10 per +1 rating ... up to +4/+40" (Renegade); Unfettered Renegade doubles = "add +5 per Psy Rating used"; **Sustaining Multiple Powers** = "+10 to all rolls on the Psychic Phenomena Table" (`:8047` + p.158 `:8049` last col, and +10 per extra power `:8049`/p.158 text). Plus Astropathic Choir Push burnout "+20" (`:8307`), Hexagrammatic Warding "−10" (`:8311`), Lost-to-the-Warp "+10" (`:8211`).
- gap: The Psychic Phenomena (and Perils) roll is always unmodified, so Push casts (which canon makes progressively more dangerous the harder you push) are as safe as a base roll, and sustaining/warding effects do nothing to the roll. The engine has the cast context (`pr`, `rating`, push amount) to compute the Push bonus but discards it.
- fix: Give `drawFromTable` a numeric modifier param and pass the computed Phenomena bonus from `checkForPerils` (Push: +5×(pr−rating) Sanctioned / +10×(pr−rating) Renegade, capped; +10 per additional sustained power; ± warding). Apply via the RollTable roll formula or by adjusting the drawn range. · autofixable: no

### QA-040 — Per-DoS / per-rating psychic damage & effect scaling not automated (description-only); Psychic Storm path is dead
- area: psychic
- kind: automation-gap
- severity: P2 (missing automation; manual workaround)
- evidence: `PsychicDamageData` (`src/module/rolls/damage-data.mjs:462-467`) is an empty `DamageData` subclass — no per-DoS logic. Damage is the static power `system.damage` Roll formula (`damage-data.mjs:103`, `@pr`-bound). The only DoS-driven scaling is the attack-type multi-hit path (`action-data.mjs:231-254`): `isPsychicBarrage` (attackType `Psychic Barrage`, +1 hit per 2 DoS, Semi-Auto-like) and `isPsychicStorm` (attackType `Psychic Storm`, +1 hit per DoS, Full-Auto-like). **No pack power uses `Psychic Storm`** (`grep -c "Psychic Storm" src/packs/psychic-powers/psychic-powers.yml` = 0; distinct attackTypes are Concentration/Psychic Bolt/Psychic Barrage only) — so the `isPsychicStorm` branch (`action-data.mjs:246`, `item.mjs:56`) is dead. Powers whose canon text scales per-DoS or per-rating are description-only: Banishment "1d10 R" each turn (pack `psychic-powers.yml:1322`, ItS per-DoS variant `roguetrader_intothestorm-126-257.pdf/markdown.md:3339` "1d10 per Degree of Success"); Terrify "+1 Fear level per 3 Psy Rating" (`CoreBook-1-200.pdf/markdown.md:8403`); Mind Scan tiered 1/2/3/4-success effects (`:8366-8372`). Force Shards (`psychic-powers.yml:2537`, attackType `Psychic Barrage`) canon is "an additional force shard **for every Degree of Success**" (`CoreBook-1-200.pdf/markdown.md:8791`) = per-DoS, but Barrage only gives +1 per **2** DoS → under-counts hits.
- canon: as cited inline (RT Core Ch.VI + ItS). CLAUDE.md 0.7.23 already flags per-DoS scaling as a schema limitation ("the damage/penetration Roll-formula fields can't express [per-DoS] without engine support").
- gap: Per-DoS damage (Banishment ItS), per-rating effect scaling (Terrify), and tiered-success outcomes (Mind Scan) never reach the roll/result — the GM must read the text and apply by hand. Separately, a power that should scale per-DoS (Force Shards) is tagged Barrage (per-2-DoS) and under-counts, and the per-DoS `Psychic Storm` classification exists in code but is unused by any data.
- fix: Add a per-DoS scaling hook to `PsychicDamageData` (e.g. additional damage dice / effect tiers keyed off `rollData.dos`), or at minimum a schema field for "per-DoS damage" the engine reads; re-tag genuinely per-DoS attack powers as `Psychic Storm` (or fix Force Shards' classification). Triage per power; mostly engine work. · autofixable: no

### QA-041 — Navigator power tier progression (Novice/Adept/Master) unmodelled; `tier`/`level` fields unused; Navigators wrongly exposed to Phenomena
- area: psychic
- kind: automation-gap
- severity: P2 (Navigator powers have no mechanical tier scaling; latent wrong-result on phenomena)
- evidence: 21 Navigator-discipline powers exist (`grep -c "discipline: Navigator" src/packs/psychic-powers/psychic-powers.yml` = 21). The `psychicPower` schema has `tier: 0` and `level: 0` (`src/template.json:1726`+), but no code reads `psychicPower.system.tier`/`.level` (`grep` of `.tier`/`.level` in `roll-data`/`action-data`/`damage-data` only hits weapon Primitive/Proven/Blast levels). So a Navigator power's Novice→Adept→Master escalation (different damage/effects per tier) and the flat per-tier test bonus are not stored per-power or applied. Separately, `checkForPerils()` (`action-data.mjs:47-48`) gates only on `rollData.power` + `sourceActor.psy.rating` with no Navigator exclusion.
- canon: RT Core p.180 (`CoreBook-1-200.pdf/markdown.md:8946-8948`): "Each Navigator power is divided into three levels: **Novice, Adept and Master**"; per-tier test bonus (`:8967-8969`): "+0 Novice, +10 Adept, +20 Master"; tiered effects e.g. Lidless Stare Novice 1d10+WPB / Adept 2d10+WPB+Insanity / Master save-or-die (`:9041-9045`). And (`:8973`): "Navigators **never need to roll for Psychic Phenomena or Perils of the Warp**."
- gap: (1) Navigator powers carry no tier data and get no +0/+10/+20 test bonus or tier-scaled effect — they resolve as a single flat power; (2) if a Navigator power is cast through the psychic path with `psy.rating > 0`, the engine would wrongly trigger Phenomena/Perils, which Navigators are immune to. (Bounded: Navigator powers are largely narrative and may not be cast via this path, but the tier scaling and immunity are unimplemented.)
- fix: Model Navigator tier (a usable `tier` field with the +0/+10/+20 test addend and tier-keyed effect text/damage), and short-circuit `checkForPerils` for Navigator-discipline powers (or actors flagged Navigator). · autofixable: no

### QA-042 — Voidship hull-damage model is homebrew (fixed 1–4 by penetration tier) instead of RT's Damage − Armour → Hull Integrity
- area: ship
- kind: dh-leftover
- severity: P1 (wrong hull-loss amounts every ship hit; not RT RAW)
- evidence: `src/module/rolls/action-data.mjs:515-558` sets a hit's tier by comparing the weapon Damage to facing armour: `damage >= armour.prow` → `penetration`, `damage >= armour.prow + 3` → `overpenetration` (an invented "+3 = overpenetration" threshold; the RT armour table has no such band). Then `src/module/rolls/assign-damage-data.mjs:81-116` `finalize()` assigns a **fixed** `voidshipHullDamage` by hit type — Overpenetrating Hit = 2, Penetrating Hit = 1, Overpenetrating Critical = 4, Penetrating Critical = 2, Nonpenetrating Critical = 1 — regardless of the actual Damage value. A Damage-10 macrocannon hit vs Armour-5 deals 1–2 Hull, not 5.
- canon: RT Core Ch.VIII "Damage and Critical Hits" (`CoreBook-201-401.pdf/markdown.md:1252` worked lance example: "9 points of damage to its Hull Integrity" = the rolled Damage after armour is bypassed; `:1216`: a hit's Damage minus the target's Armour reduces Hull Integrity, "If the shot does not do any damage to Hull Integrity, inflict 1 automatic point of damage"). RT ship damage = (rolled Damage − Armour, after void shields) applied to Hull Integrity; there is no Nonpenetrating/Penetrating/Overpenetrating tiering and no fixed 1–4 hull constant.
- gap: Ships lose a flat 1–4 Hull per hit driven by a homebrew penetration tier, instead of (Damage − Armour) Hull Integrity. Both the tier thresholds (`armour`, `armour+3`) and the fixed hull constants are invented; the weapon's real Damage roll never reaches Hull Integrity. Makes every ship-vs-ship exchange mathematically wrong vs RAW.
- fix: Replace the tier→fixed-hull model with `hullLoss = max(0, rolledDamage − facingArmour)` (lances ignore armour; void shields absorb whole hits first), then roll on the Critical Hits chart only when the weapon's Crit Rating is met (see QA-044). Larger engine rework — assign-damage + action-data ship branches. · autofixable: no

### QA-043 — Voidship critical-damage results use a homebrew Nonpen/Pen/Crit × component × d10 matrix, not RT Table 8-12 (the canonical RollTable already exists in the `tables` pack, unused)
- area: ship
- kind: dh-leftover
- severity: P1 (non-canon critical results; duplicate canon table sits unused)
- evidence: `src/module/rules/voidship-critical-damage.mjs:1-346` defines `criticalDamage()` as a three-level (`Nonpenetrating`/`Penetrating`/`Critical`) × 10-component-type (`Weapon`/`Augur Array`/`Plasma Drive`/`Bridge`/…/`Other`) × `1-10` matrix, and `getVoidshipCriticalDamage(type, location)` (`:334-346`) rolls `Math.floor(Math.random()*10)+1` into it. `assign-damage-data.mjs:85-113` calls `executeCritical("Penetrating"/"Critical"/"Nonpenetrating", component)` into this matrix. Meanwhile the **canonical** RT table is already authored as a RollTable: `src/packs/tables/tables.yml:832` `name: Critical Hits to Starships` ("Rogue Trader corebook Table 8-12 (p.232)… On 11+, see the Catastrophic Damage sub-table") + `:982` `Catastrophic Damage` — but no engine code references either RollTable.
- canon: RT Core Table 8-12 (p.232) is a **single** chart indexed by one number 1–12+ (rolled `1d5` on a normal Critical, or the damage-past-Armour value on a Crippled ship), escalating to a Catastrophic Damage sub-table at 11+ (`CoreBook-201-401.pdf/markdown.md:1216` "roll 1d5 on the Critical Hit chart"; `:1204` "1-9 / 10–12"; `:1268` "Compare the value of the damage that exceeded the Armour to the Critical Hit chart"). It is NOT keyed by penetration level or component type. Documented as CLAUDE.md deviation #6, but unfiled as a concrete QA item.
- gap: Engine generates critical results from a homebrew matrix with a different index space, severity model, and component keying than RT; the player-facing canonical RollTable (already shipped for "manual GM use") and the engine disagree. No 11+ → Catastrophic escalation in the engine path.
- fix: Point `executeCritical` at the `Critical Hits to Starships` RollTable (index by `damage − Armour` / `1d5`), chain to `Catastrophic Damage` on 11+, retire the homebrew matrix (or keep behind a setting). · autofixable: no

### QA-044 — Voidship critical-hit TRIGGER uses a fixed roll ≤ target/10 (≈10 DoS), not the weapon's Crit Rating; `shipWeapon` has no `critRating` field
- area: ship
- kind: automation-gap
- severity: P1 (criticals fire at the wrong frequency for every ship weapon)
- evidence: `src/module/rolls/action-data.mjs:352-353` marks a ship-weapon shot `isCritical` purely when `rollTotal <= target/10` (i.e. roughly 10 degrees of success) — a constant threshold for every weapon. `grep -niE "crit" src/template.json` finds no `critRating` on the `shipWeapon` schema, and `src/packs/ship-weapons/ship-weapons.yml` mentions "Crit Rating" only in prose component descriptions (`:158`, `:1174`-style), never as a structured field. So the weapon's actual Crit Rating is unused.
- canon: RT Core p.219 (`CoreBook-201-401.pdf/markdown.md:1174` "Crit Rating: This is the number of successes the shot must have to score a critical hit on the target"; `:1216` "if the character rolls a number of successes equal to the weapon's Crit Rating, the shot has caused a Critical Hit"; `:1252` worked example: lance with Crit Rating 4 crits on "four degrees of success"). Crit Rating varies per weapon (lances low, macrobatteries higher).
- gap: A weapon with Crit Rating 4 should crit at 4 DoS, one with Crit Rating 8 at 8 DoS — the engine crits all of them only at ~10 DoS (`target/10`), so low-Crit-Rating weapons (lances) critical far less often than RAW and the per-weapon Crit Rating stat is entirely ignored.
- canon-source: RT Core p.219
- fix: Add `critRating` to the `shipWeapon` template + ship-weapons data; in `_calculateVoidshipHits` set `isCritical` when `degreesOfSuccess >= weapon.system.critRating` (DoS = tens-difference, BUG-001 convention). · autofixable: no

### QA-045 — Void shields are permanently decremented and never restored per Strategic Round (or between attackers in a Round)
- area: ship
- kind: automation-gap
- severity: P1 (a ship's shields stay spent forever; vastly under-protects over a fight)
- evidence: `src/module/rolls/action-data.mjs:449-470` `calculateVoidShields()` decrements a local `shields` per absorbed hit and writes it back persistently: `await this.rollData.targetActor.update({ system: { shields: shields } })`. Nothing restores it: the only round hook, `hooks-manager.mjs:170-180` `onCombatTurnChange`, resets character **Reaction** budget (`system.combat.reactions.{dodge,parry}`) only — `grep -rniE "restore.*shield|shield.*restore|strategicRound"` across `src/module` returns nothing. There is no Strategic-Round structure to restore on.
- canon: RT Core p.226 (`CoreBook-201-401.pdf/markdown.md:1240`): "It is important to note that void shields reduce hits from **all ships** firing on them… Even if they overload and another attacker fires on the ship in the **same Strategic Round**, the void shields will be **restored in time** to protect against that attacker's fire as well." Void shields reset to full each Strategic Round (and effectively per attacker within a Round).
- gap: Once a ship's shields absorb hits they remain reduced indefinitely (no per-Round or per-attacker restore), so a target is unshielded for the rest of the battle after the first volley — the opposite of RAW, where shields restore each Round and even between attackers in a Round.
- fix: Restore `system.shields` to the ship's full Void-Shield rating at the start of each Strategic Round (and re-apply per attacker within a Round); requires a Strategic-Round tracker or a per-attacker restore in the shield step. · autofixable: no

### QA-046 — Crippled-ship state (0 Hull Integrity) not automated: no −10 Manoeuvrability/Detection, ½ Speed, ½ weapon Strength, or crippled-crit rule
- area: ship
- kind: automation-gap
- severity: P2 (missing automation; GM applies by hand)
- evidence: `src/module/documents/voidship.mjs` has no Crippled handling — `grep -niE "cripple|hullInteg"` returns only the `_computeComponentBonuses` `hullIntegrity` bonus accumulator (`:84`), no check of current Hull Integrity ≤ 0. `_computeComponentBonuses`/`rollCrew` (`:104-138`) apply component bonuses to Manoeuvrability/Detection/turrets but never the Crippled penalties, and the ship-damage path (`assign-damage-data.mjs:81-116`) tracks `voidshipHullDamage` without flipping a Crippled state or changing the crit rule when Hull = 0.
- canon: RT Core p.220 "Crippled Ships" (`CoreBook-201-401.pdf/markdown.md:1254-1268`): at 0 Hull Integrity a ship is Crippled — "−10 penalty to its Manoeuvrability and Detection, and reduce its Speed to half… reduce the strength of all weapon Components by half (round up)"; and "When a Crippled ship takes damage past its Armour, it takes a Critical Hit" (damage-past-Armour value indexes the Critical Hit chart directly).
- gap: A ship at 0 Hull Integrity keeps full Speed/Manoeuvrability/Detection/weapon Strength and does not auto-take a Critical Hit on every armour-penetrating hit — all four Crippled effects are unmodelled, so a wrecked ship fights at full capability.
- fix: Derive `isCrippled = hullIntegrity.value <= 0` in `voidship.prepareData`, subtract 10 from Manoeuvrability/Detection, halve Speed, halve each weapon Strength (round up); in the ship-damage branch, when target `isCrippled` and damage > Armour, route straight to the Critical Hits chart. · autofixable: no

### QA-047 — Strategic Round / Strategic Turn structure and VU positional movement entirely absent (rollup)
- area: ship
- kind: automation-gap
- severity: P3 (structural; GM tracks on a tabletop map — partially intended manual)
- evidence: No Strategic-Round/Turn turn-structure, initiative, VU distance, facing-relative movement, or range-band measurement exists in code — `grep -rniE "strategicRound|void unit|VU\b|range band"` across `src/module` finds only the narrative "3d6 VU" text inside a crit string (`voidship-critical-damage.mjs:252`) and a comment in `roll-helpers.mjs`. `ship-weapon-prompt.mjs`/`crew-prompt.mjs` are one-shot roll dialogs with no distance/positioning input; `voidship.mjs` `rollCrew` hardcodes only Manoeuvre + Detection crew actions (`:112-120`) — Manoeuvre Actions (Adjust Speed/Bearing, Come About), Ramming, Boarding-as-movement, Disengage, and the Shooting firing-arc/range-band-by-VU checks (RT firing arcs) are not modelled.
- canon: RT Core pp.213-220 (`CoreBook-201-401.pdf/markdown.md:862-1006`): combat runs in Strategic Rounds/Turns with an initiative order; each ship makes one Manoeuvre + one Shooting Action per Turn; distance/movement measured in VUs (1 VU ≈ 10,000 km, `:926`); weapons fire only at targets within their firing arc and incur range-band modifiers by VU distance.
- gap: The system resolves only isolated ship attack/crew rolls; the turn economy (one Manoeuvre + one Shooting per Turn, Extended Actions, initiative), VU-measured movement/range, firing arcs, ramming and disengage are all GM-tracked off-system. (NOTE — not-a-bug sub-area: component-bonus wiring is broadly present — `grep -c "bonuses:" ship-components.yml` = 20 `bonuses:` blocks feeding `_computeComponentBonuses`, matching CLAUDE.md's 18-component claim; only ~4 components carry a "+N to <stat>" in prose, a small tail to verify but not a systemic gap.)
- fix: Out of scope for a single pass — would need a Foundry Combat-tracker integration for Strategic Rounds plus a VU/arc movement layer. File as a known structural limitation; individual Manoeuvre/Shooting actions could be added incrementally. · autofixable: no

### QA-048 — Vehicle "Rear" armour input displays the Side value (copy-paste typo) — FIXED (trivial)
- area: sheet-ui
- kind: data-quality
- severity: P2 (the rear-armour field shows the wrong number; reverts to Side on every re-render)
- evidence: `src/templates/actor/panel/vehicle-armour-panel.hbs:13` (before fix): `<input ... name="system.rear" value="{{actor.side}}" />`. The Front (`:5` `value="{{actor.front}}"`) and Side (`:9` `value="{{actor.side}}"`) rows bind their own getter, but the Rear row reused `{{actor.side}}`. The getters exist and are distinct: `src/module/documents/vehicle.mjs:38-42` `get rear() { return this.system.rear; }` / `get side()`. So a value typed into the Rear field saves to `system.rear` (the `name=` is correct) but the displayed value always reflects `system.side` after the next render — Rear and Side appear locked together.
- canon: n/a — code-smell / copy-paste bug.
- gap: The Rear armour input mis-displays the Side value, so editing Rear looks like it "doesn't stick" (it does persist, but the box redraws with the Side number). Pure display defect on the vehicle sheet.
- fix: Change `value="{{actor.side}}"` → `value="{{actor.rear}}"` on the Rear row. **Applied this iteration** (trivially-safe template typo; gate green). · autofixable: yes (done)

### QA-049 — Experience-spent breakdown (spentCharacteristics/Skills/Talents/PsychicPowers + calculatedTotal) is computed every prepareData but never displayed; the sheet drives Spent/Available from a hand-entered `used`
- area: sheet-ui
- kind: automation-gap
- severity: P2 (the engine computes actual XP spent but the sheet ignores it; players manually track "Spent")
- evidence: `src/module/documents/acolyte.mjs:517-544` `_computeExperience()` sums real XP spend into `experience.spentCharacteristics`, `.spentSkills`, `.spentTalents`, `.spentPsychicPowers` (from each characteristic/skill/speciality/talent/power `.cost`) and `experience.calculatedTotal` (`:542-543`). But `src/templates/actor/panel/experience-panel.hbs` renders only `system.experience.total` (input, `:5`), `system.experience.used` (a **manual** number input, `:9`), and `system.experience.available` (`:13`, where `available = total − used`, `acolyte.mjs:544`). A grep of `src/templates/` for `spentCharacteristics|spentSkills|spentTalents|calculatedTotal` returns nothing — none of the computed breakdown or the computed total spend is shown anywhere.
- canon: n/a — automation/UX gap (RT Core p.24 XP-advance accounting; the values are correct, just unsurfaced).
- gap: The system already knows exactly how much XP each actor has spent (`calculatedTotal`) and the per-category split, yet the sheet asks the user to type `used` by hand and computes Available from that manual figure. The auto-computed real spend never reaches the UI and never reconciles against `used`, so the two can silently disagree.
- fix: Render `experience.calculatedTotal` (and ideally the per-category breakdown) in the Experience panel; consider driving `used`/`available` from `calculatedTotal` (or showing both with a mismatch indicator). · autofixable: no (UX decision: auto-drive vs. display-only)

### QA-050 — `insanityBonus` / `corruptionBonus` are computed in derived data but have zero consumers (never displayed, never read by any roll)
- area: sheet-ui
- kind: not-a-bug
- severity: P3 (dead computed values; no wrong result, pure cruft)
- evidence: `src/module/documents/acolyte.mjs:395-396`: `this.system.insanityBonus = Math.floor(this.insanity / 10);` / `this.system.corruptionBonus = Math.floor(this.corruption / 10);`. A repo-wide grep (`grep -rn "insanityBonus\|corruptionBonus" src/`) returns ONLY these two write sites — no template renders them and no roll/rule reads them. The raw `system.insanity` / `system.corruption` ARE displayed (`insanity-panel.hbs:5`, `corruption-panel.hbs:5`), but the tens-bonus derivations are not.
- canon: n/a — code smell. (In DH2 the insanity/corruption "bonus" gates Malignancy/Disorder/Mutation tables; RT 1e has no such automated table here, so the derived value has no purpose as wired.)
- gap: Two derived fields recomputed on every `prepareData()` that nothing consumes — a DH2-shaped leftover. No correctness impact.
- fix: Either surface them on the sheet (display the tens-bonus next to the raw track) or drop the two assignments. · autofixable: yes (removal is safe — no consumers)

### QA-051 — `faction` / `subfaction` schema fields + getters (npc/vehicle/voidship) have no sheet input and no display (companion to QA-007 threatLevel)
- area: schema
- kind: dh-leftover
- severity: P3 (dead schema + unused getters; no correctness impact)
- evidence: `src/template.json:1286-1287` (`"faction": ""`, `"subfaction": ""`, in the same shared block as the QA-007 `threatLevel` at `:1289`). Getters exist on all three actor types: `src/module/documents/npc.mjs:6,10`, `vehicle.mjs:23,26`, `voidship.mjs:29,32` (`get faction()` / `get subfaction()`). No template binds an input to `system.faction`/`system.subfaction` (`grep 'name="system.faction"'` → none) and no template displays them. Same dead-field pattern QA-007 filed for `threatLevel`.
- canon: n/a — code smell. RT 1e has no faction/subfaction actor mechanic; these are fork-era metadata fields.
- gap: Two schema fields × three actor types with getters but no editor and no display — inert cruft alongside `threatLevel`.
- fix: Drop `faction`/`subfaction` from the schema and the six getters, or add a header field if faction tagging is wanted. · autofixable: yes (no consumers to break)

### QA-052 — Acquisition AVAILABILITY_MODS table does not match RT Core Table 9-35 (every tier wrong; "Abundant +50" missing)
- area: acquisition
- kind: data-quality
- severity: P0 (wrong result in play — almost every Acquisition Test rolls against the wrong target)
- evidence: `src/module/rules/acquisition.mjs:9-20` `AVAILABILITY_MODS = { ubiquitous: 30, plentiful: 20, common: 10, average: 0, scarce: -10, rare: -20, 'very rare': -30, 'extremely rare': -50, 'near unique': -60, unique: -70 }`. Used at `:104,107` to build the Acquisition target (`pf + availMod + ...`). The header comment claims "RT corebook p.270" and CLAUDE.md §G claims the table is "verbatim from RT corebook p.270" — it is NOT.
- canon: RT Core p.270 Table 9-35 (`CoreBook-201-401.pdf/markdown.md:3489-3501`): Ubiquitous **+70**, Abundant **+50**, Plentiful **+30**, Common **+20**, Average **+10**, Scarce **+0**, Rare **−10**, Very Rare **−20**, Extremely Rare **−30**, Near Unique **−50**, Unique **−70**. Worked example `:3453` confirms Rare = −10.
- gap: Every availability except Unique uses the wrong modifier — the code's values are shifted ~20-40 points harsher (Ubiquitous +30 vs +70, Common +10 vs +20, Scarce −10 vs +0, Extremely Rare −50 vs −30, Near Unique −60 vs −50), and the **Abundant (+50)** tier is absent entirely (an item with `availability: Abundant` falls through to `?? 0`). Net effect: acquisitions are systematically much harder than RAW, and the Herodor example (`:3453`, Rare −10 + Good −10 + Negligible +30 = +10, PF 40 → roll ≤ 50) cannot be reproduced.
- fix: Replace AVAILABILITY_MODS with the Table 9-35 values above (add `abundant: 50`). · autofixable: yes (verbatim canon values)

### QA-053 — Acquisition SCALE_MODS has Negligible and Trivial swapped and mis-valued vs Table 9-35
- area: acquisition
- kind: data-quality
- severity: P0 (wrong result in play — small-quantity acquisitions get the wrong Scale bonus)
- evidence: `src/module/rules/acquisition.mjs:29-37` `SCALE_MODS = { trivial: 30, negligible: 20, minor: 10, standard: 0, major: -10, significant: -20, vast: -30 }`.
- canon: RT Core p.270 Table 9-35 (`CoreBook-201-401.pdf/markdown.md:3502-3509`): Negligible **+30** (Single Man), Trivial **+20** (Squad 3-5), Minor +10, Standard +0, Major −10, Significant −20, Vast −30. Herodor example `:3453` confirms Negligible = +30 ("a single pistol … Negligible Scale +30"); the Crew/`:3443` note also lists seven Scale categories "ranging from Negligible to Vast".
- gap: The code gives Negligible +20 and Trivial +30 — the two smallest-scale tiers are swapped (and thus both wrong). A single-item acquisition (the overwhelmingly common case, Negligible) gets +20 instead of the canon +30, and the Herodor worked example again cannot be reproduced. Minor/Standard/Major/Significant/Vast are correct.
- fix: Set `negligible: 30, trivial: 20` (the other five are already correct). · autofixable: yes

### QA-054 — Commerce skill bonus to Acquisition applied as +10/DoS instead of RT's +2/DoS
- area: acquisition
- kind: automation-gap
- severity: P1 (wrong result — Commerce help inflates the acquisition target 5× over RAW)
- evidence: `src/module/rules/acquisition.mjs:107` `const target = pf + availMod + craftMod + scaleMod + (commerce * 10) + extraMod;` where `commerce` is the "Commerce DoS (optional)" field (`:77-78,100`). Each Degree of Success entered adds **+10** to the target.
- canon: RT Core p.270 "Commerce and Acquisition" (`CoreBook-201-401.pdf/markdown.md:3534`): "For each degree the Explorer beats his opponent, he may increase his Profit Factor by **2 points**. For each degree his opponent beats him, however, he must decrease his Profit Factor by 2." Worked example `:3548`: beating by one degree = +2 PF.
- gap: The dialog adds +10 per Commerce DoS rather than +2 — a 5× over-application of the Commerce contest bonus. A 3-DoS Commerce win gives +30 in code vs +6 RAW. (The opposed Commerce vs Commerce/Scrutiny contest itself is also not run — the user types in a net DoS by hand — which is acceptable for a manual dialog, but the per-DoS scalar must be ×2.)
- fix: Change `(commerce * 10)` to `(commerce * 2)`; update the field label/help to read "Commerce net DoS (±2 PF each)". · autofixable: yes

### QA-055 — Starship-component / starship acquisition uses the generic Scale modifier; Table 9-36 component types and the "no Scale bonus for components" rule are unmodelled
- area: acquisition
- kind: automation-gap
- severity: P2 (manual workaround — GM must hand-enter the right modifier; the dialog offers the wrong Scale dropdown for ship gear)
- evidence: `src/module/rules/acquisition.mjs:55-106` always exposes the generic `SCALE_MODS` dropdown and adds `scaleMod` to the target for any item. There is no ship-component branch (no reference to Table 9-36, component type, or Hull Modifier anywhere in the file).
- canon: RT Core p.270 (`CoreBook-201-401.pdf/markdown.md:3558-3568`): for starship Components the GM works out the modifier from Availability + Craftsmanship and, **in place of Scale**, uses Table 9-36: Starship Component Acquisitions (by component type). Earlier `:509` is explicit: "when determining the Acquisition Threshold required to acquire starship Components, the GM should never give the players a bonus based on Scale." Acquiring a whole starship uses a Hull-Modifier (= hull Ship-Point value) and disallows all modifiers except a Commerce bonus (`:3568`).
- gap: The Acquire button on ship components / ship weapons (any item with an `availability`) opens the same dialog that adds a Scale bonus — directly contradicting the "never give a Scale bonus for Components" rule — and offers no Table 9-36 component-type modifier. The Hull-Modifier path for buying a ship is absent. All of this is GM-tracked off-system.
- fix: When the acquiring item is a `shipComponent`/`shipWeapon`, suppress the Scale dropdown and offer a Table 9-36 component-type modifier instead; add a Hull-Modifier path for whole-starship acquisition. · autofixable: no (needs item-type plumbing + Table 9-36 data)

### QA-056 — Profit-Factor flows + craftsmanship modifiers are correct (not-a-bug rollup)
- area: acquisition
- kind: not-a-bug
- severity: P3 (verification record)
- evidence: PF is a single group-wide world setting (`src/module/rogue-trader-settings.mjs:51-76` `getProfitFactor`/`setProfitFactor`, default 30), read by the acquisition dialog (`acquisition.mjs:56`), the Endeavour reward flow (`endeavours.mjs:83,148` adds `pfReward` to the world PF), and chargen commit (`chargen/commit.mjs:301-304` adds the dynasty `state.profitFactor` to the world PF, GM-only). The CRAFTSMANSHIP_MODS table (`acquisition.mjs:22-27` Poor +10 / Common +0 / Good −10 / Best −30) matches Table 9-35 exactly (`CoreBook-201-401.pdf/markdown.md:3510-3514`). The "fair price ±30" GM fudge (`:3485`) is covered by the dialog's free "Additional modifier" field. The auto-pass (PF≥100) / auto-fail (PF≤0) edge rules (`:3467-3468`) are satisfied implicitly by the `1d100` range (target ≥100 → roll ≤100 always succeeds; target ≤0 → roll ≥1 always fails).
- canon: RT Core p.270 (`:3428-3434`, `:3510-3514`) — PF is shared dynasty-wide; craftsmanship modifiers as listed.
- gap: none — these aspects are faithful. The acquisition defects are confined to the Availability table (QA-052), Scale tiers (QA-053), Commerce scalar (QA-054), and the missing ship-component path (QA-055).
- fix: n/a · autofixable: n/a

### QA-057 — 27 NPCs have `wounds.max: 0` (no wound track; many are real combatants, not swarms)
- area: data-quality
- kind: data-quality
- severity: P1 (NPC unusable in combat — Assign Damage / wound tracking has nothing to subtract from)
- evidence: 27 NPC actors across the supplement packs carry `system.wounds: { max: 0, value: 0 }`. Confirmed real combatants, not swarms: `src/packs/thesoulreaver-npcs/thesoulreaver-npcs.yml:3987` **Wych** (WS 61, BS 41, etc.) with `wounds.max: 0` at `:4050`; same file `Hekatrix Bloodbride`; `src/packs/thekoronusbestiary-npcs/thekoronusbestiary-npcs.yml` `Howling Banshee`, `Sand Tiger`; `src/packs/starsofinequity-npcs/starsofinequity-npcs.yml:59` Apex Predator, `Shadowed Stalker`, `Venomous Terror`, `Representative`; `src/packs/faithandcoin-npcs/faithandcoin-npcs.yml:89,337,483,674`. Full enumeration via a yaml scan of `src/packs/*-npcs/*.yml` → 27 with `wounds.max==0`.
- canon: RT Core — every creature stat block lists a Wounds value; the engine's damage pipeline (`assign-damage-data.mjs`, BUG-005) reduces `wounds.value`/`max`. A 0 Wounds combatant dies to any hit / can't be tracked. The Wych (Soul Reaver) and Howling Banshee (Koronus Bestiary) have published Wound totals in their source stat blocks.
- gap: Upstream OCR/extraction (`tools/npc_pipeline/`) failed to parse the Wounds line for these 27 NPCs, leaving a 0 that the system has no way to know is wrong. CLAUDE.md 0.7.25 flagged "27 NPCs with wounds.max=0" as a known upstream bug — still unfixed and never filed as a tracked finding.
- fix: Re-extract the Wounds value for the 27 affected NPCs from their source stat blocks (re-run `extract_all_npcs.py` with a Wounds-line fix, or hand-patch the 27). · autofixable: no (needs source-book values)

### QA-058 — 3 NPCs have an all-zero characteristic block (every stat base 0 → unrollable)
- area: data-quality
- kind: data-quality
- severity: P1 (NPC non-functional — every characteristic/skill test resolves against 0)
- evidence: 3 NPCs whose entire `system.characteristics` block is `{ base: 0, unnatural: 0 }` for all nine stats: `src/packs/starsofinequity-npcs/starsofinequity-npcs.yml:10703` **Representative** (chars `:10717-10741`, also `wounds.max: 0`); `src/packs/thenavisprimer-npcs/thenavisprimer-npcs.yml:8847` **The Luminary** (skills present but every governing characteristic is 0); `:10537` **Plaguebearer**. Verified by yaml scan: exactly these 3 have all-zero characteristics.
- canon: RT Core — every NPC/creature has a characteristic profile (WS/BS/S/T/Ag/Int/Per/WP/Fel). A 0 in all nine means `bonus = floor(0/10) = 0`, so every test target is the flat modifier only.
- gap: Extraction produced placeholder zero stat blocks for these three — either the source entry is a narrative/abstract entity that shouldn't be an Actor, or the stat table failed to parse. Either way they ship as broken playable Actors.
- fix: Either populate the source-book characteristics, or remove/re-tag these as non-statblock entries. · autofixable: no (needs source values or a design call)

### QA-059 — 289 NPC-embedded weapon items have empty `damage`; 76 weapon "items" are OCR description-blobs mis-parsed as weapons
- area: data-quality
- kind: data-quality
- severity: P1 (natural-weapon attacks roll no damage; junk items clutter sheets)
- evidence: A yaml scan of `src/packs/*-npcs/*.yml` finds **289** embedded `type: weapon` items whose `system.damage` is `''`. Confirmed non-functional: `src/packs/starsofinequity-npcs/starsofinequity-npcs.yml:164` **Oversized claws** → `damage: ''`, `penetration: ''`, `class: ''`, `description: ''` (a natural weapon with no profile at all). Many are natural weapons (Fangs, Horns, Trample, Cruel talons, Barbed Tail). Separately, **76** embedded "weapon" names are OCR blobs — the inline weapon spec + the next NPC's description got swept into one item *name*: `:557` `name: 'or vicious beak (Melee; 1d10+4; Pen 0; Primitive) # Shadowed Stalker The most dangerous xenos beasts are not always…'` (counted via `grep` for names containing `(Melee;` / ` # ` / `Pen N` across the NPC packs → 76).
- canon: RT Core creature stat blocks give each natural weapon a damage profile (e.g. claws `1d10+SB R`). The attack pipeline (`damage-data.mjs`) rolls `system.damage`; an empty string yields no damage roll.
- gap: The NPC-pipeline inline-weapon parser (`tools/npc_pipeline/build_npc_yaml.py`) failed to populate `damage`/`penetration` for these natural weapons and, for the 76 blobs, mis-split the markdown so a weapon spec + trailing prose became a single item name. CLAUDE.md 0.7.25 noted "261 weapon items with empty damage field" as a known upstream bug — the count is now 289 (NPC-embedded) and still unaddressed. NOTE not-a-bug: the 9 empty-damage items in the standalone `weapons` pack (`Grenade Launcher (Mezoa/Voss)`, `Auto-Launcher`, `Missile Launcher (Locke/Retobi)`, `Blind/Hallucinogen/Smoke Grenade`) are *correctly* empty — launchers take their damage from the loaded munition and effect grenades deal no damage.
- fix: Re-run the inline-weapon extraction with a fixed name/spec splitter and damage-field population; hand-verify the 76 blob items. · autofixable: no (needs source re-extraction)

### QA-060 — Orphan pre-0.7.17 skill keys still on PoC NPCs (dead data; guarded, harmless)
- area: data-quality
- kind: data-quality
- severity: P3 (no runtime effect — a defensive guard skips them)
- evidence: `src/packs/npcs/npcs.yml` still carries removed consolidated skill keys: `linguistics` (`:485,1416`), `operate` (`:491`), `stealth` (`:493,1418,1771`), `athletics` (`:1408`) under Eldar Corsair / Kroot Mercenary skill blocks (7 instances). The 0.7.17/0.7.18 skill split removed these keys from `template.json`. The guard `src/module/documents/acolyte.mjs:446` `if (!skill.characteristic && (!Array.isArray(skill.characteristics) || skill.characteristics.length === 0)) continue;` skips them so `_computeSkills` doesn't abort.
- canon: n/a — code/data smell. RT 1e split these into `climb`/`swim`, `concealment`/`silentMove`/`shadowing`, `speakLanguage`/…, `drive`/`pilot` (CLAUDE.md 0.7.17/0.7.18).
- gap: Orphan keys are inert (guarded) but carry stale advance data that will never surface on the sheet; only the PoC `npcs.yml` pack retains them (the 334-NPC supplement packs were rebuilt post-split).
- fix: Strip the orphan keys from `src/packs/npcs/npcs.yml` (4 xenos PoC NPCs), or regenerate that pack through the current pipeline. · autofixable: yes (data deletion, guard already protects)

### QA-061 — OCR footnote daggers (†) left in NPC gear/name fields
- area: data-quality
- kind: cosmetic
- severity: P2 (cosmetic — clutters equipment display)
- evidence: 16 `†` occurrences across `src/packs/*-npcs/*.yml`, mostly in `rawGear`/`name` strings: `src/packs/edgeoftheabyss-npcs/edgeoftheabyss-npcs.yml:3087` `name: Stryxis Ghost-field† and robes`; `src/packs/starsofinequity-npcs/starsofinequity-npcs.yml:6098` `rawGear: Dispersal field†, 2 smoke grenades…`; `src/packs/thekoronusbestiary-npcs/thekoronusbestiary-npcs.yml:7312` `Swooping Hawk Wings††, …`; `:11233` `Kustom Force Field†††…`; `src/packs/thesoulreaver-npcs/thesoulreaver-npcs.yml:4623` `dominion mask† †Dominion Mask: The wearer…`.
- canon: n/a — OCR artifact. The daggers are PDF footnote markers that point to a rules note printed elsewhere; they carry no in-app meaning.
- gap: Footnote daggers survived extraction into item names/gear lists, rendering literally on sheets. Some (the Soul Reaver entry) also concatenated the footnote *body* onto the gear string.
- fix: Strip standalone `†`/`††`/`†††` markers from item names and `rawGear` (and detach concatenated footnote bodies into the description). · autofixable: yes (string cleanup)
