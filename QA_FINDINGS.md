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

### QA-031 — not-a-bug rollup: cybernetics correctly wired or correctly narrative-only
- area: cybernetics
- kind: not-a-bug
- severity: P3
- evidence: Verified during this cybernetics audit that the following are already correctly handled and need no change: **AE/conditionalBonus/armour-wired** — Bionic Respiratory System (Common +20 T vs gas, conditionalBonus `:63-70`), Calculus Logi (+10 Literacy/Logic/Scholastic Lore AE `:224-255`), Cranial Armour (+1 head AP `:293-305`), Bionic Heart (+1 body AP + Sprint grant `:188-203`), Subskin Armour (+2 arms/body/legs `:651-663`), Medicae Mechadendrite (+10 Medicae/Interrogation AE `:410-437`), Optical Mechadendrite (+10 Perception AE + +20 night conditionalBonus `:547-578`), Utility Mechadendrite (+10 Tech-Use AE `:709-732`), Scribe-Tines (+10 Inquiry AE `:614-637`), Manipulator Mechadendrite (+20 Str conditionalBonus `:378-385`), MIU (+10 Tech/Pilot/Drive conditionalBonus `:493-500`), Memorance (Total Recall grant `:458-462`), Vitae Supplacement (Autosanguine grant `:865-869`). **Correctly narrative/immunity-only (no numeric bonus to wire)** — Implant Systems (section header), Locator Matrix, Respiratory Filter (gas immunity), Gastral Bionics (ingested-poison immunity), Pain Ward (ignore-Stun, conditional/narrative), Voidskin (extra void-exposure rounds), Volitor Implant (compulsion control), Vox Implant (comms), Cortex Implants (creation-time stat loss / Insanity), Auger Arrays (auspex equipment). **Correctly modelled as weapons/equipment, not bonuses** — Baleful Eye, Ballistic Mechadendrite, MIU Weapon Interface, Internal Blade, Internal Power Cell (these grant a usable weapon/action, not a flat modifier; they render as items with their text).
- canon: RT Core Ch.V cybernetics + ItS cybernetics.
- gap: None — recording the wired/narrative subset so a later pass doesn't re-flag them. The genuine unwired gaps are QA-027 (Synthetic Muscle Grafts +1 SB), QA-028 (Blackbone +2 unarmed), QA-029 (Augmented Senses grant), QA-030 (craftsmanship-conditional layer).
- fix: No action. · autofixable: n/a
