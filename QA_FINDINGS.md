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

### QA-062 — Dead registered partial `bonuses-panel.hbs` + orphaned `bonusVocalize` handler (DH2 backgroundEffects)
- area: sheet-ui
- kind: dh-leftover
- severity: P3 (cosmetic / dead code — preloaded partial never rendered, handler unreachable)
- evidence: `src/module/handlebars/handlebars-manager.mjs:20` preloads `templates/actor/panel/bonuses-panel.hbs`, but a full sweep of `src/templates` for `{{> …bonuses-panel.hbs}}` returns NONE — the partial is never invoked by any sheet template, nor referenced as an AppV2 `PARTS` template in any `.mjs` (only the preload line mentions it). The panel renders `actor.backgroundEffects.abilities` (`bonuses-panel.hbs:9`) — the DH2 Home World/Background/Role/Divination machinery flagged in QA-001 (`acolyte.mjs:322,331,340,349` push into `backgroundEffects.abilities`). Its sole `data-action="bonusVocalize"` button (`bonuses-panel.hbs:18`) is the ONLY emitter of that action, yet the action IS registered on the live V2 sheet (`acolyte-sheet-v2.mjs:17` `bonusVocalize: AcolyteSheetV2._onBonusVocalize`, handler at `:103`) — so the handler is unreachable too. (The parallel v1 jQuery handler `acolyte-sheet.mjs:84` is also dead — `acolyte-sheet.mjs`'s `AcolyteSheet` is imported at `hooks-manager.mjs:3` but never `registerSheet`'d; only `AcolyteSheetV2` is registered `:123`.)
- canon: n/a — code smell + DH2 leftover. RT 1e has no Home World/Background/Role/Divination "background bonuses" (see QA-001 canon note, RT Core Ch.I).
- gap: A registered/preloaded partial that no template includes (1 of 53 registered partials — the other 52 are all invoked, confirmed by sweep), plus a live-registered sheet action handler whose only DOM trigger lives in that uninvoked partial. Both exist solely to display the dormant DH2 `backgroundEffects.abilities` array. Pure dead weight; renders nothing in RT play.
- fix: Remove the `bonuses-panel.hbs` preload line (`handlebars-manager.mjs:20`), the template file, the `bonusVocalize` action registration + `_onBonusVocalize` on the V2 sheet, and the v1 `_onBonusVocalize`. Bundle with QA-001's `backgroundEffects` removal (same DH2 machinery) so the orphaned handler+panel disappear with the data that feeds them. · autofixable: yes (self-contained dead code — nothing invokes the partial or reaches the handler; safest done alongside QA-001)

### QA-063 — Damage-class/quality-changing ammo unwired (Tempest Bolt Shells, Acid Shells)
- area: weapons
- kind: automation-gap
- severity: P1 (wrong damage type & quality in play; for Acid Shells the whole damage profile is ignored)
- evidence: `src/module/rules/ammo.mjs` has switch cases for 11 of the 18 ammo types but NONE for **Tempest Bolt Shells** or **Acid Shells**. `calculateAmmoSpecials` (`:130-144`) and `calculateAmmoAttackSpecials` (`:71-122`) both lack these names. Tempest Bolt Shells (`src/packs/ammo/ammo.yml:97`, desc `:76-78`): "Change the weapon's damage class to **Energy** and the weapon gains the **Shock** quality. …adds 3 Damage…vs Machine Trait." Acid Shells (`src/packs/ammo/ammo.yml:134`, desc `:110-114`): "Acid Shells cause **2d10 E Damage, 0 Penetration**…suffers…being set on Fire. Each hit against an armoured target will reduce its AP value by 1." The engine HAS the pattern wired for other ammo (Inferno Shells → Flame `:87-92`; Explosive Arrows → `hit.damageType='Explosive'` `:141-143`), so these are clear omissions, not unsupportable mechanics.
- canon: RT Core (Tempest Bolt Shells); Into the Storm p.131 (Acid Shells) — per the entries' own `source:` fields and quoted `**Effects:**` blocks.
- gap: Firing Tempest Bolt Shells leaves damage type unchanged (no Energy, no Shock); firing Acid Shells rolls the weapon's normal damage instead of 2d10 E / 0 Pen. The AP-reduction (Acid) and +3-vs-Machine (Tempest) are target-trait/state effects that stay narrative, but the base damage-type/quality/profile changes are automatable.
- fix: Add `case 'Tempest Bolt Shells'` to `calculateAmmoSpecials` (set `hit.damageType='Energy'`) and to `calculateAmmoAttackSpecials` (push `{name:'Shock', level:true}`); add `case 'Acid Shells'` that overrides the damage formula to `2d10` Energy / penetration 0 (and notes the on-fire + AP-strip as effect text). · autofixable: yes (Tempest/Shock straightforward; Acid damage-override needs a formula-replacement hook)

### QA-064 — Flat damage/penetration-modifier ammo unwired (Microburst Flask, Nephium Fuel Tank, Void Rounds)
- area: weapons
- kind: automation-gap
- severity: P2 (missing flat numeric modifiers; manual workaround)
- evidence: `calculateAmmoDamageBonuses` (`src/module/rules/ammo.mjs:156-172`) and `calculateAmmoPenetrationBonuses` (`:184-194`) handle Amputator/Bleeder/Dumdum/Expander/Hot-Shot/Man-Stopper but NOT **Microburst Flask**, **Nephium Fuel Tank**, or **Void Rounds**. Microburst Flask (`src/packs/ammo/ammo.yml:206`, desc `:183-185`): "add **-2 Damage, +2 Penetration** and +10 metres to the weapon's Range…cannot be fired in Maximal Mode…keeps the weapon from Overheating." Nephium Fuel Tank (`:240`, desc `:219-221`): "Agility Tests made by targets…suffer a -10 penalty and the weapon's base damage is increased by **2**." Void Rounds (`:421`, desc `:398-402`): "…when used in a normal atmosphere…they suffer **-1 Damage**." These map directly onto the existing `hit.modifiers[...]` / `hit.penetrationModifiers[...]` pattern (cf. Expander Rounds +1 dmg/+1 pen `:166-168,185-187`).
- canon: Into the Storm p.131 (all three) — per each entry's `source:` + quoted `**Effects:**` block.
- gap: Loading any of these has no effect on the damage/penetration roll. The flat ±damage and +pen modifiers are trivially expressible in the existing switch; only the situational parts (Range +10m / atmosphere-gating / cannot-Maximal / no-Overheat) need more.
- fix: Add cases to `calculateAmmoDamageBonuses` (`microburst: -2`, `nephium: 2`, `void rounds: -1`) and `calculateAmmoPenetrationBonuses` (`microburst: 2`). · autofixable: yes (flat modifiers); Maximal-block/no-Overheat for Microburst would go in `calculateAmmoAttackSpecials`

### QA-065 — Action/target-conditional ammo unwired (Tracer Shells, Organgrinder Rounds)
- area: weapons
- kind: automation-gap
- severity: P2 (Tracer +5 BS) / P3 (Organgrinder target cascade — narrative-heavy)
- evidence: No cases in `ammo.mjs` for **Tracer Shells** or **Organgrinder Rounds**. Tracer Shells (`src/packs/ammo/ammo.yml:385`, desc `:362-366`): "The user gains a **+5 to Ballistic Skill Tests when firing the weapon on Full Auto**" (plus a +5-to-be-hit drawback). This fits the existing action-conditional pattern — cf. Motion Predictor `weapon-modifiers.mjs:96-99` adds +10 only on Full/Semi-Auto Burst, and `calculateAmmoAttackBonuses` (`ammo.mjs:53-63`) already writes `specialModifiers` for Explosive Arrows. Organgrinder Rounds (`:282`, desc `:256-263`): on damage, target makes a Toughness Test at −10 per point of Damage taken; failure → 2d5 Rending ignoring Armour/TB — a target-side resist cascade with no engine path (cf. QA-019: target-side qualities are descriptive-only).
- canon: Into the Storm p.131 (both) — per `source:` + quoted `**Effects:**` blocks.
- gap: Tracer Shells give no +5 BS when the weapon is fired Full Auto; Organgrinder's Toughness-cascade is never prompted. Tracer is automatable now (the Full-Auto-conditional modifier pattern already exists); Organgrinder needs the same target-resist-roll machinery QA-019 calls for.
- fix: Add `case 'Tracer Shells'` to `calculateAmmoAttackBonuses` setting `specialModifiers['tracer'] = 5` gated on `rollData.action === 'Full Auto Burst'`. Leave Organgrinder for the QA-WEAPONS-DESCRIPTIVE-FIX target-resist pass. · autofixable: yes (Tracer) / no (Organgrinder)

### QA-066 — Most mechanically-effecting weapon modifications are unwired (Overcharge Pack +1 dmg et al.)
- area: weapons
- kind: automation-gap
- severity: P2 (Overcharge Pack flat +1 damage missing; rest situational)
- evidence: `src/module/rules/weapon-modifiers.mjs` wires only 6 mods by name — Compact (`:28`), Mono (`:44,60`), Red-Dot Laser Sight (`:81`), Custom Grip (`:86`), Modified Stock (`:89`), Motion Predictor (`:96`) — plus Fluid Action (`action-data.mjs:235`) and Forearm Weapon Mounting / Pistol Grip / Telescopic Sight / Omni-Scope (`range.mjs:41,46,137`). The `weapon-mods` pack contains mechanically-effecting mods with no matching case: **Overcharge Pack** (`src/packs/weapon-mods/weapon-mods.yml:252`) "**+1 Damage**, but halves clip size" — a flat damage modifier that fits `calculateWeaponModifiersDamageBonuses` (`weapon-modifiers.mjs:27-31`, which today holds only Compact's pen modifier); plus **Photo Sight** (`:281`, no darkness penalty), **Preysense Sight** (`:311`, +20 night Perception), **Silencer** (`:368`, −20 to detect), **Suspensors** (`:399`, half weight + always-braced), **Fire Selector** (`:67`), **Melee Attachment** (`:125`), **Vox-Operated** (`:461`), and ItS **Calamity Vents** (`:862`), **Exterminator Cartridge** (`:901`), **Tox Dispenser** (`:933`).
- canon: RT Core Ch.IV weapon upgrades / Into the Storm Ch.III — per each entry's `source:` and quoted `**Effects:**` blocks.
- gap: Equipping Overcharge Pack gives no +1 damage on the roll (the damage-bonus switch covers no weapon mods at all). The other listed mods are situational/narrative (darkness & detection penalties, braced status, mode-switching, one-shot attachments) which the engine doesn't currently model — so they stay text-only — but Overcharge Pack's flat +1 is a clear automatable omission.
- fix: Add `case 'Overcharge Pack': hit.modifiers['overcharge pack'] = 1;` to `calculateWeaponModifiersDamageBonuses`. Triage the rest into the broader engine work (braced status, darkness penalties) or leave narrative. · autofixable: yes (Overcharge Pack only)

### QA-067 — vestigial multi-entry skill `characteristics` arrays normalised to single RT governing characteristic (FIXED)
- area: schema
- kind: data-quality
- severity: P3
- evidence: `src/template.json` — 21 of 49 skills carried a `characteristics` array with >1 entry (e.g. `awareness ["Per","Fel","Int"]`, `command ["Fel","Int","S","WP"]`, `trade ["Int","Ag","Fel"]`, `medicae ["Int","Ag","Per"]`) while RT lists exactly one governing characteristic per skill. Confirmed the ONLY reader of the array is the `acolyte.mjs:449` fallback (`short = !skill.characteristic ? skill.characteristics[0] : skill.characteristic`), which never fires here because all 49 skills have a non-empty primary `characteristic`. `base-actor.mjs:97-98` `.characteristics.includes(...)` reads a talent's `applies.characteristics`, not the skill array; no sheet template iterates `skill.characteristics` (the `characteristic-panel.hbs:11` / `chargen-wizard.hbs:250` `#each` loops walk the 9-characteristic actor map, not skill arrays). Verified every array's element [0] already equalled the skill's `characteristic` (assert in the edit script), so truncation is loss-free.
- canon: RT Core skills table `CoreBook-1-200.pdf/markdown.md:3784-3833` — one Characteristic column per skill.
- gap: The arrays implied alternate governing characteristics that don't exist in RT and weren't honoured by the engine — misleading fork-residue (the vector for the QA-006 `charm`/`"Inf"` bug and the masking of QA-010/011 primary-char errors). RESOLVED.
- fix: Truncated each multi-entry array to `[characteristic]` for all 21 skills (Acrobatics, Awareness, Command, Common Lore, Deceive, Demolitions, Forbidden Lore, Inquiry, Interrogation, Intimidate, Logic, Medicae, Navigate, Performance, Psyniscience, Scholastic Lore, Scrutiny, Security, Sleight of Hand, Tech Use, Trade). Data-only; gate green (build OK, 166 node tests pass). Closes QA-013. · autofixable: yes — DONE this iteration

### QA-068 — Completeness critic: six combat/RT subsystems never audited as a QA dimension
- area: other
- kind: not-a-bug (process / coverage finding — names shallow dimensions, spawns follow-up tasks)
- severity: P2 (audit-coverage gap; the underlying subsystems range P1→P3, triaged in the spawned tasks)
- evidence: The 13 seed dimensions (QA-001..067) covered DH-leftovers, schema, naming, skills, weapons, armour, cybernetics, talents/traits, psychic, ship, sheet-UI, acquisition, data-quality. A re-scan of `src/module/rules/` + `src/module/documents/acolyte.mjs` found six substantial subsystems with real code/data that NO dimension audited end-to-end:
  1. **Combat actions vs RT Table 9-1** — `src/module/rules/combat-actions.mjs` defines ~30 actions (read `:89-178`+: Standard Attack, Aim, All Out Attack, Called Shot, Charge, Defensive Stance, Delay, Disengage, Dodge, Parry, Feint, Full Auto Burst, …) with `modifier`/`subtype`. Only spot-touched in 0.7.x changelogs (pre-QA-loop) and tangentially in QA-034; no systematic action-by-action verify of modifier/subtype/Half-vs-Full vs RT Core Table 9-1 (Aim +10/+20, Manoeuvre, Grapple, Suppressing Fire, Multiple Attacks, Brace, Knock-down, etc.).
  2. **Personal Critical Hits (RT Table 8-12)** — `src/module/rules/critical-damage.mjs` (227 lines) is a full Energy/Impact/Rending/Explosive × location × 1-10 table, IS invoked by `assign-damage-data.mjs:172` (`getCriticalDamage`) when `wounds.value <= 0`. The voidship side was audited (QA-043 → homebrew); the personal table's VALUES were never checked vs RT Core. Read `critical-damage.mjs:1-25` (Energy/Arm rows quote canon-looking effects, but no line-by-line vs the book).
  3. **Movement & Encumbrance math** — `acolyte.mjs:90-91` calls `_computeMovement()`/`_computeEncumbrance()` (`:662-704`); encumbrance thresholds (`max = 0.9 / 2.25 / 4.5 …`) and AB→Half/Full/Charge/Run movement never verified vs RT Core p.245/p.262.
  4. **Conditions / status effects** — grep for `CONFIG.statusEffects` / `toggleStatusEffect` / Stunned|Prone|Pinned|Blinded|"on fire" machinery in `src/module/` returns NOTHING, yet `critical-damage.mjs` text repeatedly imposes "Stunned", "knocked Prone", "Useless [limb]", "catch fire", "Lost Arm". So the engine PRODUCES condition outcomes it cannot apply or track — companion to QA-036 ("no Fear/Pinning/Stun state to gate on").
  5. **Fear / Pinning / Insanity / Corruption / Malignancy / Mutation** — grep for `rollFear`/`fearTest`/`pinningTest`/insanity-disorder/`malignan`/`mutation` in `src/module/` hits only chargen DATA (`birthrights.json`, `lure_of_the_void.json`, `backgrounds.mjs:115,170` narrative text) — no engine automation of the RT psychology subsystem. Noted obliquely in QA-036/QA-050; never audited as a dimension.
  6. **Endeavours / Renown** — `src/module/rules/endeavours.mjs` (184 lines) + `rogue-trader-settings.mjs:60-84` + `hooks-manager.mjs:101` (`openEndeavoursDialog`) exist; acquisition/PF flows were audited (QA-052..056) but the Endeavour objective / Profit-Factor-reward / Renown logic was not. (Also lighter: `aim.mjs`, `hit-locations.mjs` reversed-d100 — spot-noted correct in 0.7.13 changelog but not QA-verified.)
- canon: RT Core Table 9-1 (combat actions), Table 8-12 (critical hits), pp.245/262 (movement/encumbrance), Ch.VIII Fear/Pinning + Ch.VIII Insanity/Corruption, Ch.XII Endeavours — at `/mnt/project_data/RT/RT-DOCS/`.
- gap: These dimensions weren't covered by the seed list, so genuine DH2-leftover / automation-gap issues in them remain unsurfaced. This finding records the coverage gap; the six follow-up tasks below schedule the actual audits.
- fix: Append QA-COMBAT-ACTIONS, QA-CRIT-DAMAGE-TABLE, QA-MOVEMENT-ENCUMBRANCE, QA-CONDITIONS, QA-PSYCHOLOGY, QA-ENDEAVOURS to `fix_plan.md` as new discovery dimensions. · autofixable: n/a (process finding)

### QA-069 — Manoeuvre action missing `Attack` subtype → never appears in the attack dropdown
- area: rules
- kind: data-quality
- severity: P2 (action unselectable from combat)
- evidence: `src/module/rules/combat-actions.mjs:230-236` defines `Manoeuvre` with `subtype: ['Movement', 'Melee']` (no `'Attack'`). `updateAvailableCombatActions` (`:31-43`) builds the weapon attack dropdown by `.filter((action) => action.subtype.includes('Attack'))` then Melee/Ranged — so Manoeuvre is filtered out and a melee attacker can never pick it. No other UI surfaces the action catalog.
- canon: RT Core combat-actions table (`CoreBook-201-401.pdf/markdown.md:1853`) — `Manoeuvre | Half | Attack, Melee, Movement | Opposed WS Test, if you win, move enemy 1 metre.` Body text `:2083` "Type: Half Action  Subtype: Attack, Melee, Movement". Manoeuvre carries the **Attack** subtype.
- gap: Code omits the `Attack` subtype, so Manoeuvre (an opposed-WS attack that shoves an enemy 1m) is hidden from the melee combat-action dropdown despite being a canon Attack action. Knock Down/Grapple/Stun etc. all carry `Attack` and appear; Manoeuvre is the lone Attack-subtype action that doesn't.
- fix: Add `'Attack'` to Manoeuvre's `subtype` array → `['Attack', 'Melee', 'Movement']`. Data-only, matches canon. · autofixable: yes

### QA-070 — Tactical Advance wrongly dropped as "DH2-only" (it is RT canon); several RT actions absent from the catalog
- area: rules
- kind: dh-leftover (mis-classification) + automation-gap
- severity: P3
- evidence: `src/module/rules/combat-actions.mjs` `allCombatActions()` (`:86-327`) has no `Tactical Advance`, `Move`, `Run`, `Stand/Mount`, `Focus Power`, or `Use a Skill` entry. CLAUDE.md §A ("2026-05-13 audit") asserts *"Tactical Advance: removed (DH2-only)"*. The RT Core combat-actions table lists all of these: `Tactical Advance | Full | Concentration, Movement | Move from cover to cover.` (`CoreBook-201-401.pdf/markdown.md:1869`); `Move`/`Run`/`Stand/Mount`/`Focus Power`/`Use a Skill` at `:1854,:1862,:1867,:1849,:1871`.
- canon: RT Core combat-actions table `CoreBook-201-401.pdf/markdown.md:1841-1871`. Tactical Advance is a genuine RT 1e action, NOT a DH2-only carryover — the removal rationale recorded in CLAUDE.md is factually wrong.
- gap: Tactical Advance was deleted on a false premise. The catalog also omits Move/Run/Stand/Focus Power/Use a Skill — most are non-attack and handled by other UI (movement panel, psychic tab, skill rolls), so their absence from the *attack* catalog is low-impact, EXCEPT **Run**, whose combat-relevant rider ("until your next turn, ranged attacks vs you −20 BS, melee +20 WS" — `:2138`) is unmodeled anywhere. None of these are DH2 leftovers.
- fix: Re-add `Tactical Advance` (`Full`, `['Concentration','Movement']`) and correct the CLAUDE.md note. Optionally add `Run`/`Move` as catalog entries if the engine ever needs the Run easier-to-hit-in-melee modifier (currently QA-071 territory). · autofixable: partial (Tactical Advance re-add is trivial; Run modifier needs target-side wiring)

### QA-071 — Combat-action SIDE-EFFECTS unautomated: only the actor's own to-hit modifier is applied
- area: rules
- kind: automation-gap
- severity: P1 (missing automation; manual GM workaround per action)
- evidence: `calculateCombatActionModifier` (`src/module/rules/combat-actions.mjs:7-26`) sets ONLY `rollData.modifiers['attack'] = actionInfo.attack.modifier` (the active character's own to-hit). No code applies the actions' defensive / opponent-facing / reaction riders:
  - **Defensive Stance** (`:136-141`): "Gain an additional Reaction. Opponents suffer −20 WS." The reaction budget (`reactionBudget`/`canSpendReaction`, `roll-helpers.mjs:220,248`) is NOT bumped by Defensive Stance, and the −20 to opponents' WS is never applied to incoming attacks.
  - **All Out Attack** "cannot Dodge or Parry": only a narrative chat line (`action-data.mjs:154-155 addEffect`) + Aim-suppression (`roll-data.mjs:216`). The Dodge/Parry spend gate (`acolyte.mjs:167-178`) checks only the per-Round budget via `canSpendReaction` — it never consults the All Out Attack flag, so the actor can still freely Dodge/Parry the Round he went All Out.
  - **Guarded Attack** (`:196-203`): the −10 own attack IS applied, but the "+10 to all Dodge and Parry tests until your next turn" half is unmodeled.
  - **Charge/Run** make the mover easier to hit in melee (`+20 WS` to attackers, `:2138`) — unmodeled.
- canon: RT Core combat-actions table + bodies — Defensive Stance/All Out Attack/Guarded Attack/Run (`CoreBook-201-401.pdf/markdown.md:1830-1869`, Run rider `:2138`).
- gap: The engine models each action as a flat self-to-hit number and ignores every reaction-grant, reaction-lockout, opponent penalty, and "easier to hit" rider — so Defensive Stance grants no extra Reaction, All Out Attack doesn't forfeit Reactions, Guarded Attack gives no defensive bonus, and Charge/Run targets aren't easier to hit. All require GM hand-tracking.
- fix: Extend `calculateCombatActionModifier` (or a new post-action hook) to: bump `system.combat.reactions` for Defensive Stance; gate `canSpendReaction`/`acolyte.mjs:172` on an `All Out Attack`-this-round flag; add a +10 Dodge/Parry conditional for Guarded Attack; and tag the target's "easier to hit in melee" status from Charge/Run. Needs the reaction-budget + a status/condition layer (cf. QA-CONDITIONS). · autofixable: no (engine + state tracking)

### QA-072 — Knock Down description: wrong Charge condition + omits "armour counts double"
- area: rules
- kind: data-quality
- severity: P3 (cosmetic — action is GM-resolved, not engine-automated)
- evidence: `src/module/rules/combat-actions.mjs:210-215` Knock Down description: "Make an opposed Strength test (with **+10 if using Charge**). 2+DoS gives (1d5-3)+SB Impact and 1 level of fatigue." The opposed-Strength test + 1d5−3+SB + Fatigue are correct, but the +10 condition and an armour clause are off.
- canon: RT Core `CoreBook-201-401.pdf/markdown.md:2073-2080` — "+10 bonus to the test" applies "If the attacker spent **a Half Action to move** before performing the Knock-Down attack" (any move, not specifically Charge — and Charge is a Full Action so it can't precede a Half-Action Knock-Down in the same turn), and the 2-DoS damage is dealt "with **armour counting as double**". Also the reverse case (target wins by 2+ DoS → attacker knocked prone) is undocumented in the entry.
- gap: Help text mis-states the +10 trigger (Charge vs "moved as a Half Action first") and drops the "armour counts double" rule. Display-only; the Knock Down action isn't mechanically resolved by the engine, so no roll is wrong — just the on-card guidance.
- fix: Reword to "(+10 if you spent a Half Action to move first); on 2+ DoS deals 1d5−3+SB Impact with armour counting double, plus 1 level of Fatigue." · autofixable: yes (text only)

### QA-073 — Personal Critical Hits table is Dark Heresy 2e text, not RT 1e Tables 9-11..9-26
- area: rules
- kind: dh-leftover
- severity: P2 (wrong descriptive effect text; the wound math is unaffected — but effects diverge from RT canon)
- evidence: `src/module/rules/critical-damage.mjs:1-207` — the `criticalDamage()` map (Energy/Explosive/Impact/Rending × Arm/Body/Head/Leg × 1-10). E.g. Energy/Arm/1 = "The attack grazes the target's arm, causing it to spasm uncontrollably with pain. All tests involving that arm suffer a –30 penalty for [[1d5]] rounds"; Energy/Arm/3 = "The arm suffers superficial burns … suffers [[1d5]] levels of Fatigue, and can take only a Half Action"; entries reference the DH2 structured-condition system ("Lost Hand condition (see **page 242**)", "Lost Arm condition (see page 242)", "Lost Foot condition (see page 243)") and DH2 page refs ("Scatter Diagram on page 230").
- canon: RT Core Tables 9-11..9-26, `CoreBook-201-401.pdf/markdown.md:2620-2729+`. RT Energy/Arm/1 = "A blast to the arm leaves it all numb and tingly. Tests made involving the arm are at –30 for **1 Round**." (code says 1d5 rounds); RT Energy/Arm/3 = "burns the target's arm leaving him **Stunned for 1 Round** and inflicts **2 levels of Fatigue**. The arm is useless for 1d5 Rounds." (completely different effect from code's #3); RT uses "the target counts as only having one arm / loses the hand permanently" rather than a named "Lost Hand condition", and RT page refs are different (Scatter Diagram **page 248**, Special Damage **page 260/210**). Row-by-row the DH2 and RT tables diverge in specific outcomes (#1/#3/#4/#5 etc. shifted), not just wording.
- gap: The engine attaches DH2 critical-effect descriptions to RT criticals. The crit *damage number* (wounds.critical) is right, but the narrated effect (Stunned/Useless/severed/page-referenced conditions) is the wrong edition's text and points players at non-existent RT page numbers / a condition framework RT doesn't use.
- fix: Re-author `critical-damage.mjs` from RT Core Tables 9-11..9-26 (Energy 9-11..9-14, Explosive 9-15..9-18, Impact 9-19..9-22, Rending 9-23..9-26), each location's 1..10+ row. Large data re-author (rules-faithful) — file, don't trivially fix. · autofixable: no

### QA-074 — Critical-effect lookup never resolves for limb hits (`Right/Left Arm/Leg` ≠ table key `Arm/Leg`)
- area: rules
- kind: automation-gap
- severity: P2 (no critical-effect text shown for 4 of 6 hit locations; wound damage still applies)
- evidence: `assign-damage-data.mjs:172` calls `getCriticalDamage(this.hit.damageType, this.hit.location, …)` with the RAW location string. `this.hit.location` is one of `Head / Right Arm / Left Arm / Body / Right Leg / Left Leg` (`rules/hit-locations.mjs:29-60` `creatureHitLocations()` + `additionalHitLocations()` :22-27). But `critical-damage.mjs` keys locations as `Arm / Body / Head / Leg`, and `getFuzzy()` (`:209-218`) only does an exact case-insensitive name match (`obj[term]` then `term.toUpperCase() === name.toUpperCase()`) — no substring/`Right `/`Left ` stripping. So `getFuzzy({Arm,Body,Head,Leg}, "Right Arm")` → undefined → `getCriticalDamage` returns null → `this.criticalEffect` is null for all Arm/Leg hits. Only Head/Body ever resolve.
- canon: n/a — code smell. (Compare `:44` in the SAME file, which DOES normalise for the armour lookup: `location.replace(/\s/g,"").toUpperCase() === name.toUpperCase()` to match `leftArm`/`rightArm` — the crit path was never given the equivalent strip.)
- gap: A character reduced past 0 Wounds by an Arm or Leg hit takes the correct critical *damage* but gets NO critical *effect* (the table text that drives Stunned/Useless-limb/severed outcomes). Two of six locations silently never trigger a critical-hit description.
- fix: Normalise the location before lookup — either strip a leading `Right `/`Left ` in `getCriticalDamage` (map to `Arm`/`Leg`), or make `getFuzzy` fall back to a suffix/word match, or pass a normalised location at `:172`. One-line-ish, but pick the normalisation deliberately (don't collapse a future Right/Left-specific table). · autofixable: yes (small, but defer to the QA-073 re-author so both land together)

### QA-075 — Critical-damage indexing (running total, TB, armour, damageType) is correct — not-a-bug
- area: rules
- kind: not-a-bug
- severity: P3 (record that this was checked and is fine)
- evidence: `assign-damage-data.mjs:132-173` — each hit's damage is reduced by `usableArmour + tb` (armour minus penetration, then TB) at `:132`; overflow past remaining Wounds becomes Critical Damage (`:143-150`); the crit table is indexed by the RUNNING total `this.actor.system.wounds.critical + this.criticalDamageTaken` (`:172`), and `getCriticalDamage` caps `amount > 10 → 10` (`:226`) matching RT's "10+" final row. TB is NOT re-subtracted from the critical total except via the True Grit talent (`:167-169`). `damageType` is one of Energy/Impact/Rending/Explosive (`damage-data.mjs:28,376`), matching the four RT critical subtables.
- canon: RT Core p.220+ critical-damage rules — damage reduced by Armour + TB each hit; damage past 0 Wounds is Critical Damage cross-referenced against the running Critical total; "10+" is the cap row. Matches the code.
- gap: none — the index math, TB handling, armour-minus-penetration, and damageType selection are all RT-correct. The ONLY problems on the personal-critical path are the table TEXT edition (QA-073) and the limb-location lookup (QA-074).
- fix: none. · autofixable: n/a

### QA-076 — Movement has no minimum-1 floor: negative / zero movement for small or low-Agility actors
- area: rules
- kind: automation-gap
- severity: P2 (wrong movement values for AgB-0 actors and small low-AgB creatures — but only at the extreme low end)
- evidence: `src/module/documents/base-actor.mjs:143` — `let base = agility.bonus * moveMult + size - 4;` then `movement = {half: base, full: base*2, charge: base*3, run: base*6}` (`:144-149`). No clamp. The `size - 4` term correctly maps the Size trait's "Base Movement" column (Average size=4 → +0, Hulking 5 → +1 … Miniscule 1 → −3), but nothing floors the result. A Miniscule (size 1) creature with Agility Bonus 2 → `base = 2 + 1 − 4 = −1` → movement `{half:−1, full:−2, charge:−3, run:−6}` (negative). An Average actor with AgB 0 → `base = 0` → all movement `0`.
- canon: RT Core Table 9-16 Size (`CoreBook-201-401.pdf/markdown.md:6810,6824-6833`): "When calculating a creature's movement, apply the size modifier first, and then other modifiers from other Traits or talents. **Base movement can never be reduced below 1.**" Size Base-Movement column is AB−3 (Miniscule) … AB+3 (Massive). Also Table 9-30 Structured Time Movement (`:3098-3110`) lists the **AB 0** row as Half ½ / Full 1 / Charge 2 / Run 3 (non-zero), not 0/0/0/0.
- gap: The engine emits negative movement for small low-Agility creatures and 0 movement for any AgB-0 actor, instead of applying the RT "base movement never below 1" floor (creatures) / the Table 9-30 AB-0 row (½/1/2/3). The displayed movement panel (`movement-panel.hbs:11-23`) shows these wrong values directly.
- fix: Clamp `base` to a minimum of 1 after the size+quadruped math (`base = Math.max(1, …)`), matching the canon floor; optionally special-case AgB 0 (Average) to the Table 9-30 ½/1/2/3 row. Note the size-modifier arithmetic itself is RT-correct — only the floor is missing. · autofixable: yes (one-line `Math.max(1, …)`, but a rules call on the AB-0 ½-row → verify on rt-smoke; file for the fix loop)

### QA-077 — Unnatural Speed trait not wired into movement (doubled Agility Bonus ignored)
- area: traits
- kind: automation-gap
- severity: P1 (missing automation — affects every NPC with the trait; manual GM override needed)
- evidence: `src/module/documents/base-actor.mjs:142-143` — `_computeMovement` applies only `quadrupedMoveMultiplier(...)` to the Agility-Bonus term; there is no Unnatural-Speed handling. `roll-helpers.mjs:352,374` explicitly EXCLUDE "Unnatural Speed" from `unnaturalCharacteristicMultipliers` ("Unnatural Speed (movement only) … NOT characteristic multipliers and are skipped"), and no other code path consumes it for movement. The trait exists in `src/packs/traits/traits.yml` and is applied to live NPCs across packs (`corebook-npcs`, `starsofinequity-npcs`, `thesoulreaver-npcs`, `thekoronusbestiary-npcs`, `citadelofskulls-npcs`, `hostileacquisitions-npcs`, `lureoftheexpanse-npcs`, `npcs`).
- canon: RT Core Unnatural Speed trait (`CoreBook-201-401.pdf/markdown.md:6867`): "The creature moves with incredible speed. For the purposes of determining movement, the creature **doubles its Agility Bonus** (after modifiers from other Traits and factors, specifically size)." I.e. movement base should be `(AgB + size mod) × 2`.
- gap: Creatures with Unnatural Speed move at standard (un-doubled) rates in the engine; the trait's only mechanical effect (doubled movement) is silently dropped. Quadruped (a sibling movement multiplier) IS wired — Unnatural Speed was missed.
- fix: In `_computeMovement`, after the size modifier, double the base when an "Unnatural Speed" trait is present (canon: applies AFTER size, so `base = (AgB×quadMult + sizeMod); if unnaturalSpeed: base *= 2`). Add a `hasUnnaturalSpeed(traits)` helper mirroring `quadrupedMoveMultiplier`. Engine-applied by name (no AE — movement is fully derived). · autofixable: yes (small helper + one multiply; verify on rt-smoke)

### QA-078 — Encumbered penalty (−10 movement tests, −1 Agility Bonus) never applied
- area: rules
- kind: automation-gap
- severity: P1 (missing automation — the engine flags Encumbered but applies none of its effects)
- evidence: `src/module/documents/acolyte.mjs:765-767` sets `this.encumbrance.encumbered = true` when `value > max`, and the Carrying-Weight table (`:696-763`) is RT-correct (matches Table 9-33's Carrying column verbatim, sum SB+TB 0→20). But `encumbered` has NO consumer: a repo-wide grep finds it only set at `:691` (init) and `:766` (assignment) — no roll path reads it. `rollCharacteristic`/`rollSkill` never add an Encumbered modifier, and `_computeMovement` (`base-actor.mjs:143`) uses the full Agility Bonus with no −1 reduction.
- canon: RT Core Encumbered Characters (`CoreBook-201-401.pdf/markdown.md:3299`): "An Encumbered character takes a **−10 penalty to all movement-related tests** and **reduces his Agility Bonus by one** for the purposes of determining movement rates and Initiative." (Plus a per-TB-hours Toughness Test for Fatigue — narrative.)
- gap: Carrying more than the Carrying Weight limit visibly toggles the "Encumbered" flag on the sheet but changes nothing mechanically — movement rates, Initiative, and movement-related skill tests (Dodge, Acrobatics, Climb, etc.) are all unpenalised.
- fix: When `encumbrance.encumbered`, (a) subtract 1 from the Agility Bonus feeding `_computeMovement` and Initiative (floor per QA-076), and (b) add a `−10 'Encumbered'` modifier to movement-related tests (needs a "movement-related" skill tag, or apply to Dodge/Acrobatics/Climb/Swim + the move actions). Larger than a data edit — file for the fix loop. · autofixable: no

### QA-079 — Lifting / Pushing weights not derived (Carrying only) — minor
- area: sheet-ui
- kind: not-a-bug
- severity: P3 (nice-to-have; the modeled value is correct, the unmodeled ones are GM-narrative)
- evidence: `src/module/documents/acolyte.mjs:688-763` computes only `encumbrance.max` = Carrying Weight from the SB+TB sum; there is no Lifting Weight or Pushing Weight derivation, and no sheet field for them (`encumbrance-panel`/`movement-panel` show carry value/max only).
- canon: RT Core Table 9-33 (`CoreBook-201-401.pdf/markdown.md:3267-3289`) lists three columns — Maximum Carrying, Lifting (≈2× carry), and Pushing (≈4× carry) Weight — used for the Lift (Full Action) and Push/Throw (`:3303-3309`, throw up to ½ Lifting Weight) rules.
- gap: Players must compute Lifting/Pushing/throw limits by hand. The Carrying column the engine DOES model is RT-correct, so this is a coverage gap, not a wrong result.
- fix: Optionally derive `encumbrance.lift`/`encumbrance.push` from the same SB+TB index (add the Lifting/Pushing columns) and surface them on the encumbrance panel; leave the throw/lift action resolution narrative. · autofixable: yes (additive data, low value)

### QA-080 — No condition/status-effect layer: Stunned/Prone/Pinned/Blinded/on-fire/Blood-Loss outcomes are produced as chat text only, never applied or tracked
- area: rules
- kind: automation-gap
- severity: P1 (the engine ROLLS the outcomes — crit effects, stun, knock-down, pinning, on-fire — but tracks none of them; GM hand-applies every condition and every "Stunned target is easier to hit / can't act" downstream rule)
- evidence:
  - **No registry / no actor tracks.** A whole-`src/module/` grep for `CONFIG.statusEffects` / `toggleStatusEffect` / `toggleEffect` / per-actor condition state returns NOTHING. `src/template.json` has no `prone`/`stunned`/`pinned`/`blinded`/`bloodLoss`/`unconscious`/`conditions`/`statuses` track on any actor type — the ONLY condition-like state ever stored is `creature.fatigue.{max,value}` (`:109`, added for BUG-004). (`isOnFire` at `:1518` is a **ship-component** manual GM checkbox — `shipComponent` schema, surfaced in `voidship-components-panel.hbs:57` — NOT a character on-fire condition.)
  - **The engine emits condition outcomes as render-only text.** `addEffect(name, effect)` (`src/module/rolls/action-data.mjs:574`) just pushes `{name, effect}` to `this.effectOutput`, whose only consumers are the chat templates (`templates/chat/action-roll-chat.hbs:222`, `psychic-action-chat.hbs:27`). Nothing writes to the target actor. The combat/crit paths that produce conditions purely as this text:
    - `rules/critical-damage.mjs` (the personal Critical Hits table) imposes — by raw keyword count — **Stunned ×46, knocked Prone ×27, Useless [limb] ×14, Blood Loss ×33, Blinded ×7, Deafened ×5, catch fire ×3, fall Unconscious ×1, and the Lost Hand/Arm/Foot/Leg "conditions"** (e.g. `:8` "He is Stunned for 1 round and is knocked Prone. The arm is Useless for [[1d10]] rounds.").
    - Knock Down (`action-data.mjs:118-130`): "The target is knocked Prone and **must use a Stand action** in his turn to regain his feet!" — yet there is no Stand combat action (`grep 'Stand' rules/combat-actions.mjs` → nothing; cf. QA-070) and no Prone state to gate it on.
    - Stun Attack (`action-data.mjs:169`): "Target is stunned for N rounds and gains 1 level of fatigue" — text only (the Fatigue half isn't written either).
    - All Out Attack (`:155`): "cannot attempt Dodge or Parry Reactions" — text only; the actual Dodge/Parry gate (`acolyte.mjs`) never consults it (see QA-071).
    - Suppressing (`:200-202`): targets "must pass a … Pinning test for become Pinned" — no Pinned state; Spray (`:185`) "must pass an agility test or be hit" — no follow-through.
    - Weapon qualities in `damage-data.mjs`: Concussive (`:397`) "be Stunned for 1 round per DoF … knocked Prone", Flame (`:410`) "make an Agility test or be set on fire", Crippling (`:403`) "considered crippled", Corrosive/Hallucinogenic/Haywire — all `addEffect` text only (companion to QA-019).
  - The `createEmbeddedDocuments('ActiveEffect', …)` calls that exist (`hooks-manager.mjs:267` item-grant, sheet effect-CRUD at `actor-container-sheet*.mjs`, `item-sheet.mjs`) are for talent/cybernetic grants and manual GM effect editing — none is triggered by a combat outcome.
- canon: RT Core defines these as mechanical conditions with downstream effects, e.g. **Stunned** (`CoreBook-201-401.pdf/markdown.md:2070,2932-2934`) — "Stunned characters **cannot take Actions or Reactions** such as Dodge"; WS/BS Tests to hit a Stunned character are **Routine (+20)"; **Pinning/Pinned** (`:2470`) — Pinned characters suffer −20 BS and must stay in cover; **Blood Loss** (`:2912`); **Helpless/Unaware** "can take no actions" (`:2069,2071`); on-fire (`:243` per the crit text). These ride on a tracked target state the engine doesn't have.
- gap: The system computes RT-correct condition OUTCOMES (criticals, stun, knock-down, pinning, on-fire) but has no layer to record them on the target or to enforce their consequences. So after a hit that "Stuns" a foe, nothing makes that foe easier to hit (+20) or unable to act/Dodge; "knocked Prone" never forces a Stand or applies the prone to-hit modifiers; "Pinned" never imposes −20 BS; "on fire"/"Blood Loss" deal no recurring damage. Every condition is a GM hand-tracking burden, and several downstream automations that DO exist key off state that's never set (All Out Attack reaction-lockout QA-071, the Stand action QA-070).
- fix: Introduce a condition/status-effect layer: register RT conditions in `CONFIG.statusEffects` (Stunned/Prone/Pinned/Blinded/Deafened/On Fire/Blood Loss/Unconscious/Helpless/Unaware) at init, and have the combat resolution (`action-data`/`damage-data`/critical-damage application in `assign-damage-data.mjs`) `toggleStatusEffect` the appropriate status on the target token/actor (with the rolled duration in a flag) instead of only emitting chat text. Then gate the existing automations on it: Stunned → +20 to-hit + no Reactions; Prone → Stand action (cf. QA-070) + to-hit modifiers; Pinned → −20 BS; On Fire/Blood Loss → recurring-damage hook. Large engine subsystem — file, don't fix. Tie-in: QA-019 (weapon target-effects), QA-036/QA-071 (no state to gate on), QA-070 (Stand action), QA-038/QA-040 (psychic conditions). · autofixable: no

### QA-081 — Fear / Shock subsystem unautomated: no Fear Test, Fear (N) trait never tested, Shock RollTable orphaned
- area: rules
- kind: automation-gap
- severity: P1 (a core RT psychology mechanic; entirely GM hand-rolled)
- evidence:
  - **No Fear-test path.** A whole-`src/module/` grep for a Fear-test invocation finds NONE — `drawFromTable()` (`src/module/rolls/action-data.mjs:13`) is called only for `'Perils of the Warp'` (`:75`) and `'Psychic Phenomena'` (`:79`); it is never called for `'Fear'`. No `rollFear`/`fearRating`/Fear-Willpower-test code exists. The only Fear references in the engine are narrative compendium/chargen text (`rules/divinations.mjs:70`, `rules/backgrounds.mjs:156`, `roles.mjs:131`, `roll-helpers.mjs:608` Frenzy immunity) — none performs a test.
  - **Fear (N) trait inert.** Creatures carry a Fear rating as a trait (e.g. the Frontier-World immunity text at `src/packs/traits/traits.yml:808` references "Fear (2)/Fear (1)"; many NPC stat blocks have `Fear (N)`), but no engine code reads a creature's Fear rating to trigger a viewer's Fear Test.
  - **The Shock table exists but is never drawn.** `src/packs/tables/tables.yml:666` registers a RollTable `name: Fear` (1d100, description "If a character fails a Fear test in a combat situation, he must immediately roll on this table…") whose rows ARE the RT Shock Table outcomes — yet nothing in the engine draws it.
- canon: RT Core p.293-295 (`CoreBook-201-401.pdf/markdown.md:4458,4466,4522`): a Fear Test is a Willpower Test modified by the source's Fear Rating (Table 10-3); on a **combat** failure the character "must immediately roll on Table 10-4: The Shock Table, adding +10 to the result for each Degree of Failure" (`:4466`); a non-combat failure → −10 to concentration tests, and a fail by 30+ → +1d5 Insanity (`:4468-4470`); "if the first digit of a character's Insanity total is double or more a thing's Fear Rating … the character is unaffected" (`:4522`).
- gap: The system has the Shock-table DATA but no mechanic to (a) prompt a Fear Test when confronting a Fear (N) source, (b) draw the Shock table on a combat failure scaled by DoF, or (c) award the Insanity on a 30+ non-combat failure. Fear is 100% GM-adjudicated despite the supporting RollTable shipping in the pack. (Note: the Shock-table description's "+10 … for each degree of failure **after the first**" is a DH2-ism — RT counts every DoF (`:4466`), companion to the BUG-001 DoF-inflation family.)
- fix: Add a `rollFear(rating)` actor method: Willpower Test vs the source Fear Rating (with the Insanity-double-digit auto-pass at `:4522`); on a combat failure `drawFromTable('Fear')` with a `+10 × DoF` modifier (needs the `drawFromTable` modifier param from QA-039); on a non-combat fail-by-30 award 1d5 Insanity. Surface a "Fear Test" control or trigger it when a token with a Fear (N) trait enters/attacks. Engine subsystem — file, don't fix. Ties QA-080 (conditions), QA-039 (table modifier), QA-083 (Insanity gain). · autofixable: no

### QA-082 — Pinning subsystem unautomated: Pinning Test is description-only, no Pinned state or −20 BS / Half-Action enforcement
- area: rules
- kind: automation-gap
- severity: P1 (suppressive-fire core mechanic; GM hand-tracks every Pin)
- evidence: Pinning appears ONLY as on-card descriptive text, never as a resolved test or applied state:
  - `src/module/rolls/action-data.mjs:200-202` — Suppressing fire `addEffect('Suppressing', 'All targets within a 30/45 degree arc must pass a Difficult (-10) / Hard (-20) Pinning test for become Pinned.')` — text pushed to `effectOutput`, consumed only by the chat template (cf. QA-080).
  - `src/module/rules/combat-actions.mjs:242,285,295` — Overwatch / Semi-Auto-Suppressing / Full-Auto-Suppressing descriptions say targets "must make a … Pinning save or become pinned." No code rolls the target's Willpower, and there is no `Pinned` track (`template.json` has no `pinned`/`conditions` state — confirmed in QA-080).
  - No `Pinning Test` / `become Pinned` resolution exists anywhere in `src/module` beyond these strings; `−20 BS` and "Half Actions only" are never imposed on a target.
- canon: RT Core p.248 (`CoreBook-201-401.pdf/markdown.md:2472,2476`): when on the receiving end of suppressive fire — even if no Hit Location is struck and no damage taken — the target "must make a **Hard (–20) Pinning Test**. This is a Willpower Test." A **Pinned** character "may only take **Half Actions** … suffers a **–20 penalty to all Ballistic Skill Tests**" and must stay in / move to cover. Difficulty varies by mode (Overwatch −20, Semi −10, Full −20 per the action table at `:2108,:2187`).
- gap: The engine narrates the Pinning requirement but never rolls the defender's Willpower test, never records a Pinned condition, and never applies the −20 BS / Half-Action-only restriction. Entirely manual. Several existing automations have nothing to read it from (the conditions-layer gap, QA-080).
- fix: On a Suppressing/Overwatch resolution, prompt/roll each target's Willpower Pinning Test at the action's difficulty; on failure `toggleStatusEffect('pinned')` (needs the QA-080 condition layer) and gate BS rolls (`−20`) + action economy (Half only) on it. Engine subsystem — file, don't fix. Ties QA-080, QA-071. · autofixable: no

### QA-083 — Insanity / Corruption tracks are inert: no Trauma / Malignancy / Mutation tests on threshold, item types + tables absent
- area: rules
- kind: automation-gap
- severity: P1 (the two RT degradation tracks accumulate but trigger nothing)
- evidence:
  - **Flat integers, acolyte-only, no derivation but a dead bonus.** `system.insanity` / `system.corruption` are flat `0` ints on the **acolyte** template only (`src/template.json:1398-1399`; the `creature`/`npc` templates have neither). Getters at `acolyte.mjs:56-61`. The only thing derived from them is `insanityBonus`/`corruptionBonus` (`acolyte.mjs:395-396`, `Math.floor(x/10)`), which have ZERO consumers (already filed as QA-050).
  - **No threshold tests.** There is no code that fires a Trauma Test every 10 Insanity, a Malignancy Test every 10 Corruption, or a Mutation Test every 30 Corruption — a grep finds no Trauma/Malignancy/Mutation roll path. Crossing a threshold does nothing.
  - **Item types declared but unpopulated + unwired.** `template.json:1451-1453` registers Item types `malignancy`, `mentalDisorder`, `mutation` (+ `criticalInjury`), each an empty `itemDescription`-only schema (`:1676-1689`). No compendium pack supplies any of them (`src/system.json` registers no malignancies/mutations/disorders/mental-traumas pack — only `tables` + `psychic-powers` among rules packs), and no engine path auto-creates one.
  - **Outcome tables missing from the pack.** `tables.yml` holds only Psychic Phenomena, Perils of the Warp, Fear(=Shock), Critical Hits to Starships, Catastrophic Damage — there is NO Mental Traumas (Table 10-6), Malignancies (Table 10-8), or Mutation table. (Chargen narrative even cites the wrong-edition table numbers — `rules/homeworlds.mjs:83` "Table 8-11: Shock or Table 8-13: Mental Traumas" are DH2 numbers; RT uses 10-4 / 10-6.)
- canon: RT Core p.293-301 (`CoreBook-201-401.pdf/markdown.md:4506,4637,4696,4702`): "Each time the character gains 10 Insanity Points he must make a Trauma Test" (WP, modified by the Insanity Track Table 10-5; fail → roll Table 10-6 Mental Traumas at +10/DoF) (`:4506`); "For every 10 Corruption Points … he must Test Willpower … failed → Malignancies (Table 10-8)" (`:4696`); "for every 30 Corruption Points … Test against two Characteristics … or suffer a random Minor Mutation" (`:4702`); the Corruption Track is Table 10-7 (`:4637`).
- gap: Insanity and Corruption are bookkeeping numbers with no mechanical consequence — no Trauma/Malignancy/Mutation tests on threshold, no tables to roll on, no items to grant, and the one derived value (insanityBonus/corruptionBonus) is unused. The entire RT degradation loop (gain points → test at thresholds → acquire disorders/malignancies/mutations → those modify play) is unimplemented, and the supporting item types are dead schema.
- fix: (1) Author the Mental Traumas (10-6), Malignancies (10-8), and Mutation outcome tables into the `tables` pack (+ optional malignancies/mutations/mental-disorders compendium packs to back the existing item types). (2) Add threshold hooks: on Insanity crossing each 10 → Trauma Test (WP, Table 10-5 modifier) → draw Table 10-6 on fail; on Corruption crossing each 10 → Malignancy Test → Table 10-8; each 30 → two-Characteristic Mutation test. (3) Use `insanityBonus`/`corruptionBonus` (QA-050) for the Fear-immunity (`:4522`) and Trauma/Malignancy difficulty. Large content+engine subsystem — file, don't fix. Ties QA-050, QA-081. · autofixable: no

### QA-084 — Endeavour model diverges from RT canon: no Objective sub-structure, no excess-AP→PF conversion, themes treated as Endeavour-level types
- area: rules
- kind: automation-gap
- severity: P3 (the GM-facing Endeavour tracker works as a manual ledger; it just doesn't model the canon structure or auto-award)
- evidence: `src/module/rules/endeavours.mjs` models each Endeavour as a flat `{type, achievementPoints, target, pfReward}` record (`:12`, `:25-26` progress = `achievementPoints/target`, `:63` target default 500, `:64` GM-entered `pfReward`). `ENDEAVOUR_TYPES = ['Exploration','Trade','Military','Criminal','Creed']` (`:15`) are applied as the Endeavour's single `type`. Completion (`:142-157`) adds the hand-entered `pfReward` flat to PF — there is no Objective sub-structure, no Lesser/Greater/Grand sizing, and no excess-AP→PF conversion.
- canon: RT Core Ch.XII (`CoreBook-201-401.pdf/markdown.md`): an Endeavour's points are "divided amongst its **objectives**" (`:3717`); the five (Military/Criminal/Exploration/Trade/Creed) are **Objective themes**, not Endeavour types (`:3741-3751`); PF reward is fixed by Endeavour SIZE — Lesser +1/+2, Greater +3/+4, Grand +5 (`:3705-3709`); and at completion "for every full 100 Achievement Points they have beyond what is necessary … they gain an additional +1 to their Profit Factor" (`:3791`).
- gap: The dialog is a single-bar AP tracker; the canon model is per-Objective AP with a size-driven PF reward and an automatic excess-AP→PF bonus. The system never auto-converts surplus AP to PF (+1 per 100 over target) and conflates objective themes with a top-level type. None of this produces a WRONG result (the GM types the PF reward in by hand) — it's a coverage/fidelity gap.
- fix: Optionally (a) add an Objectives array (each with theme + AP) under each Endeavour, (b) drive the default PF reward from a Lesser/Greater/Grand size selector, and (c) on Complete, add `+pfReward + floor((achievementPoints − target)/100)` so surplus AP converts to PF per canon. Low priority. · autofixable: no (rules/UX design)

### QA-085 — Endeavour Misfortune mechanic (Table 9-41) unimplemented: no per-session PF-loss complication path
- area: rules
- kind: automation-gap
- severity: P3 (a GM-side campaign mechanic; entirely hand-rolled today)
- evidence: `src/module/rules/endeavours.mjs` implements only add / award-AP / complete / delete (`:100-165`). A grep of `src/module/` for "Misfortune" / "misfortune" returns NOTHING — there is no Misfortune roll, no Table 9-41 RollTable in `tables.yml`, and no PF-loss path tied to active Endeavours (the only PF mutation is the `+pfReward` gain on Complete, `:148-149`).
- canon: RT Core (`CoreBook-201-401.pdf/markdown.md:4054`): "The GM can use Misfortunes … as part of complications arising around an Endeavour"; Table 9-41 (`:4070-4073`) is a once-per-session d100 — 01-49 no Misfortune, 50-65 Nuisance (−1 PF), 66-90 Grim (−2 PF), 91-00 Calamitous (−1d5 PF); Explorers may recover the lost PF by addressing the Misfortune (`:4066`).
- gap: The Endeavour subsystem models only the upside (AP → PF gain). The canon downside — a per-session Misfortune roll that reduces the warband's Profit Factor while Endeavours are active, recoverable by effort — has no data table and no engine path. Purely GM hand-tracked.
- fix: Add a `Misfortunes` RollTable (Table 9-41) to the `tables` pack and a GM control ("Roll Misfortune") that draws it and decrements `RogueTraderSettings.profitFactor` by the rolled amount, posting a chat card. Low priority. · autofixable: no (content + engine)

### QA-086 — Renown is correctly absent (RT Core 1e has no Renown tracking) — not a bug
- area: rules
- kind: not-a-bug
- severity: P3 (record-only: confirms a DH2/Black-Crusade mechanic is correctly NOT ported)
- evidence: No Renown stat, track, or tally exists in the engine — `system.json`/`template.json` have no `renown` field, and `endeavours.mjs`/`rogue-trader-settings.mjs` track only Profit Factor + Endeavours. The only "Renown" strings in the repo are the **Renown** Origin-Path choice and the **Renowned Warrant** talent (compendium content), neither of which is a campaign tracker.
- canon: RT Core 1e has NO Renown tracking mechanic. "Renown" appears only as an Origin-Path option granting "your choice of the Air of Authority or the Peer (choose one) Talent" (`CoreBook-1-200.pdf/markdown.md:1318,1322`) and the Renowned Warrant talent (`:5491`). Campaign-level Renown is a Dark Heresy 2e / Black Crusade / Only War concept, not RT 1e. RT's campaign-advancement currency is **Profit Factor** (already implemented, QA-056).
- gap: None. The fix_plan QA-ENDEAVOURS task asked to audit "Renown logic"; this records that there is correctly no such logic to audit — RT 1e doesn't have the mechanic. Filing prevents a future iteration from "discovering" the absence as a gap.
- fix: None. Leave as-is. · autofixable: n/a

### QA-087 — Hit-location digit-reversal omits zero-padding: single-digit to-hit rolls (1–9) map to the WRONG location
- area: rules
- kind: automation-gap
- severity: P1 (wrong hit location in play — affects which location's armour/AP applies and which Critical table is used — but only when the to-hit roll is 1–9)
- evidence: `src/module/rules/hit-locations.mjs:1-7` `getHitLocationForRoll(roll)` does `roll.toString().split('').reverse().join('')` then `parseInt`. Called with the raw to-hit total `getHitLocationForRoll(attackData.rollData.roll.total)` (`damage-data.mjs:70`), which is a 1–100 integer with no leading zero. For a roll of `7`: `"7" → reverse "7" → 7 → Head` (table `:75` Head 0-10). RT requires `07 → 70 → Body` (Body 31-70). 2-digit rolls work (`"20"→"02"→2→Head`), only 1–9 misbehave.
- canon: RT Core "Step Three: Attacker Determines Hit Location" (`CoreBook-201-401.pdf/markdown.md:2268`): "reverse the order of the digits (e.g., a roll of 32 becomes 23, **a roll of 20 becomes 02**, and so on)" — percentile dice are explicitly two-digit, so a roll of 7 is `07` and reverses to `70`. The worked example at `:2278` ("roll of 14 … reverses … and gets 41") confirms the two-digit treatment.
- gap: ~9% of successful attack rolls (to-hit total 1–9, i.e. very-high-DoS hits) get their hit location computed as `Head` (or whatever the unreversed single digit lands in) instead of the canon `X0` location. Wrong location → wrong per-location armour AP in `assign-damage` and wrong Critical Effect table. (Edge: roll 100 → `"100"→"001"→1→Head`; canon `00→0→Head`, coincidentally same location.)
- fix: Zero-pad to two digits before reversing: `roll.toString().padStart(2, '0').split('').reverse().join('')` (or `String(roll % 100).padStart(2,'0')` to also normalise 100→`00`). Trivially safe + matches the canon example exactly, but it changes a combat-pipeline result, so verify a single-digit to-hit on rt-smoke (roll 07 → Body) rather than landing it blind in this discovery loop. · autofixable: yes (one-line padStart; verify live)

### QA-088 — `calculateAimBonus` is a dead no-op stub (aim works via `modifiers.aim` directly)
- area: rules
- kind: cosmetic
- severity: P3 (dead code; no functional impact — Aim itself works)
- evidence: `src/module/rules/aim.mjs:6-8` — `calculateAimBonus(rollData)` has a body of exactly `let actionItem = rollData.weapon ?? rollData.power;` and returns nothing; the local is never used. A grep shows it is **never called** anywhere in `src/module/` (only its own definition appears). The real Aim path is the `aimModifiers()` dropdown (`:10`, `{0:'None',10:'Half (+10)',20:'Full (+20)'}`) feeding `rollData.modifiers.aim` (`roll-data.mjs:55`), read directly by the Accurate check (`damage-data.mjs:261 modifiers.aim > 0`).
- canon: n/a — code smell. (Aim values themselves are RT-correct: Half Action Aim +10, Full Action Aim +20.)
- gap: An orphaned, incomplete helper that computes nothing and is wired to nothing — a half-finished extraction. Harmless but misleading (suggests aim is computed there when it isn't).
- fix: Delete `calculateAimBonus`, or finish it and route the aim bonus through it. Pure cleanup. · autofixable: yes (dead-code removal)

### QA-089 — Test-difficulty dropdown ladder diverges from RT 1e canon (DH2 +40 tier, wrong "-30" label, missing −50/−60 tiers)
- area: rules
- kind: dh-leftover
- severity: P2 (the +40 tier applies a non-RT modifier in play; the rest are cosmetic/completeness)
- evidence: `src/module/rules/difficulties.mjs:1-13` returns the difficulty→label map used as the GM modifier dropdown on EVERY roll prompt (`roll-data.mjs:14 difficulties = rollDifficulties()`; consumed by `simple-roll-prompt.hbs:12`, `weapon-roll-prompt.hbs:145`, `psychic-power-roll-prompt.hbs:103`, `crew-/boarding-/turrets-/ship-weapon-roll-prompt.hbs`, and rendered back on `simple-roll-chat.hbs:8`). The map's numeric KEY is the actual modifier applied. Three divergences: (a) `'40': 'Simple (+40)'` — RT 1e has no +40 difficulty step; (b) `'-30': 'Very Difficult (-30)'` — non-canon label; (c) ladder stops at `'-40': 'Arduous (-40)'`, omitting Punishing (−50) and Hellish (−60).
- canon: RT Core difficulty ladder (acquisition Table 9-35 + scattered test uses) is **Easy +30 / Routine +20 / Ordinary +10 / Challenging +0 / Difficult −10 / Hard −20 / Very Hard −30 / Arduous −40 / Punishing −50 / Hellish −60** — `CoreBook-1-200.pdf/markdown.md:5755-5765` (full ladder), and the canonical "Very Hard (−30)" name at `:5277,:5745,:5761,:6574,:8211,:8324`. RT's *top* difficulty is Easy (+30); there is no +40/+50/+60 tier. "Simple (+40)" is the **DH2** ladder's tier (DH2: Trivial +60 / Elementary +50 / Simple +40 / Easy +30 …) — a fork leftover.
- gap: (a) The dropdown offers a DH2 "Simple (+40)" step that applies a +40 bonus with no RT basis (RT tasks never go above Easy +30); (b) the −30 step is mislabelled "Very Difficult" instead of the canon "Very Hard"; (c) GMs cannot select Punishing (−50) or Hellish (−60), which RT canon defines and which appear in real RT tests (e.g. acquisition, Lost-to-the-Warp). Values +30/+20/+10/+0/−10/−20/−40 and their labels (Easy/Routine/Ordinary/Challenging/Difficult/Hard/Arduous) are all RT-correct.
- fix: Replace the map with the RT ladder — drop `'40':'Simple (+40)'`; rename `'-30'` to `'Very Hard (-30)'`; add `'-50':'Punishing (-50)'` and `'-60':'Hellish (-60)'`. Pure data edit in one small function, but it changes available GM options (removes a tier, adds two) — flagging rather than auto-fixing so it's done as one deliberate ladder correction. · autofixable: yes (one-function data edit)

### QA-090 — Five of the six standard Fate-point uses are unmodeled; the one wired (re-roll) is combat/psychic-only and doesn't gate on failure
- area: rules
- kind: automation-gap
- severity: P1 (most canon Fate spends have no engine path — players hand-track them)
- evidence: The only standard Fate spend in the engine is the **Re-roll** button (`templates/chat/action-roll-chat.hbs:282` + `psychic-action-chat.hbs:72` → `roll-control__fate-reroll`), handled by `basic-action-manager.mjs:74 _fateReroll` (checks `fate.value`, calls `acolyte.mjs:786 spendFate()` which decrements `system.fate.value`, refunds resources, re-runs `performActionAndSendToChat`). That button exists ONLY on attack + psychic chat cards — `simple-roll-chat.hbs` (the skill/characteristic test card) has no fate control (grep: zero `fate`/`reroll` hits) — and it is rendered unconditionally (no check that the original test FAILED). The remaining standard uses have no code path anywhere: a grep of `src/module/` finds no "+10 Fate", no extra-DoS spend, no Initiative-10 spend, no remove-1d5-wounds, no recover-from-Stunned. The only other fate spends are talent-specific (Eye of Vengeance `action-data.mjs:607`, Blademaster re-roll `:191`), not the generic uses.
- canon: RT Core p.279 (`CoreBook-201-401.pdf/markdown.md:1662-1672`) — "Spending one Fate Point allows for one of the following: Re-roll a failed test once; Gain a +10 bonus to a test (chosen before dice); Add an extra degree of success (after dice); Count as having rolled a 10 for Initiative; Instantly remove 1d5 Damage (not Critical Damage); Instantly recover from being Stunned." (Stunned-recovery is also restated at `:2070`; an extra-DoS spend is shown in the worked example `:3041`.) Spending is a Free Action and spent Fate is restored next session (`:1660`).
- gap: 5 of the 6 RAW Fate uses (+10 pre-roll, +1 DoS, Initiative=10, remove 1d5 wounds, recover from Stunned) are entirely GM/player hand-tracked — no button, no `spendFate`-coupled effect. The 6th (re-roll) is wired but (a) only on combat/psychic action cards, not on generic skill/characteristic test cards, and (b) offered even on a successful roll, whereas canon restricts it to a *failed* test. (Recover-from-Stunned and remove-1d5-Damage also depend on the absent condition/wound-recovery layers — QA-080, QA-WOUNDS-HEALING.)
- fix: Add a generic Fate-spend affordance to the skill/characteristic chat card (re-roll, +1 DoS post-roll) and pre-roll options (+10, Initiative=10) on the roll prompt, each calling `spendFate()`; gate the re-roll on `!rollData.success`. The wound/Stunned-removal spends should land with QA-WOUNDS-HEALING / QA-CONDITIONS-LAYER-FIX. · autofixable: no (UI + roll-pipeline work; verify on rt-smoke)

### QA-091 — Burning Fate (permanent loss / auto-survive lethal damage) is not modeled; `fate.max` vs `fate.value` not distinguished for a burn
- area: rules
- kind: automation-gap
- severity: P2 (a core survival mechanic exists only as two manually-edited number fields)
- evidence: `acolyte.mjs:786 spendFate()` mutates ONLY `system.fate.value` (`value - 1`); nothing in `src/module/` ever decrements `system.fate.max` as a burn — the only writes to `fate.max` are character-creation rolls (`acolyte-sheet-v2.mjs:157`, `acolyte-sheet.mjs:125`, `chargen/commit.mjs:218`). There is no `burnFate()` method, no burn prompt/button, and no auto-survive hook in the damage-assignment path (`assign-damage-data.mjs`). The schema (`template.json:126` `fate {max, value, rolled}`) does carry both fields, and `fate-panel.hbs:5,9` exposes Max and Value as free-text number inputs — so a burn is possible only by the player/GM hand-editing the Max field.
- canon: RT Core p.279 "Burning Fate" (`CoreBook-201-401.pdf/markdown.md:1673-1683`) — an Explorer may **burn** a Fate Point to permanently reduce his Fate Points by one and survive otherwise-lethal damage ("rendered unconscious with zero Wounds" instead of dead); a Fate Point may be burnt even if already spent this session (`:1675`); starship destruction requires every aboard Explorer to burn one collectively (`:1679`). This is a *permanent max reduction*, distinct from a spend (which restores next session).
- gap: The engine has no burn path. A burn (permanent `fate.max` decrement) and the auto-survive-a-killing-blow trigger it gates are entirely GM-adjudicated by manually editing the Max field. `spendFate()` conflates "spend" (temporary, restores) with no concept of "burn" (permanent), and the lethal-damage path never offers a burn.
- fix: Add a `burnFate()` actor method decrementing BOTH `fate.max` and `fate.value` (min 0), surfaced as a "Burn Fate" control; and on assign-damage that would reduce Wounds below the lethal threshold, prompt the target to burn a Fate Point to survive at 0 Wounds + unconscious instead. Depends on the wound/death-threshold modelling (QA-WOUNDS-HEALING) for the auto-survive trigger. · autofixable: no (engine + UI; verify on rt-smoke)

### QA-092 — No damage/wound recovery path: Wounds only ever decrease, never heal (natural healing / bed-rest / Medicae unmodeled)
- area: rules
- kind: automation-gap
- severity: P3 (downtime mechanic — GMs hand-edit the Wounds field; no in-combat impact)
- evidence: The ONLY writeback to the wound track is `src/module/rolls/assign-damage-data.mjs:226-236` (`performActionAndSendToChat`), which is monotonic-down: `wounds.value: system.wounds.value - this.damageTaken` and `wounds.critical: system.wounds.critical + this.criticalDamageTaken`. The only derived wound value is `wounds.max` (`acolyte.mjs:418` `woundsMax(...)`); nothing recomputes or restores `wounds.value`/`wounds.critical`. A grep of `src/module/` for `heal|recover|bed.?rest|wounds per (day|week)` returns ZERO recovery logic (only a Medicae skill-label comment at `acolyte.mjs:96` and the `ship-roles.mjs` Chirurgeon flavor). There is no `restDay()`/`restWeek()`/`heal()` actor method, no Medicae-Test-driven recovery, and no time-advancement hook.
- canon: RT Core p.262 "Damage and Healing" (`CoreBook-201-401.pdf/markdown.md:2975-3005`): characters "automatically remove Damage (both ordinary and Critical Damage) over time through natural healing." Rates by state — Lightly Damaged: 1 Damage/day (TB/day with a full day's bed rest); Heavily Damaged: 1 Damage/week (TB/week with a full week's complete rest); Critically Damaged: Critical Damage "does not heal on its own—it requires medical attention," then 1 Critical/week with rest+medical. Medicae Skill (p.83) provides immediate/accelerated recovery.
- gap: Wounds and Critical Damage are write-once-down counters with no recovery counterpart anywhere in the engine. Every point of healing — natural per-day/per-week, bed-rest TB lumps, Critical-Damage removal, and all Medicae-Skill medical attention — is entirely GM hand-tracked by editing the `wounds.value`/`wounds.critical` fields on the sheet. (Low severity because RT healing is narrative downtime measured in days/weeks, not an in-play per-roll mechanic — but the automation is genuinely absent.)
- fix: Add actor recovery methods — `restDay()` / `restWeek()` (remove the state-appropriate Damage), Critical-Damage-per-week removal, and a Medicae-Test-driven recovery action — plus optionally a sheet affordance. Depends on QA-093 (the Lightly/Heavily/Critically Damaged state derivation) to pick the correct rate. · autofixable: no (engine + UI; downtime-flow design)

### QA-093 — Lightly/Heavily/Critically Damaged wound-state not derived (the RT recovery-rate states are absent; fix_plan's "half wounds / gates crits" premise is DH2-confused)
- area: rules
- kind: automation-gap
- severity: P3 (a derived display/automation aid that only matters once recovery — QA-092 — exists)
- evidence: No code derives any wound state. A grep of `src/module/` for `lightlyDamaged|heavilyDamaged|criticallyDamaged|woundState|isWounded` returns nothing, and nothing branches on `wounds.value` relative to `wounds.max` (e.g. no `< max/2` test). `acolyte.mjs:419-424` derives `fatigue.fatigued/unconscious` flags but no analogous wound-state flags. The wound schema (`template.json:11-17`) carries `max/value/critical/modifier` but no state field. The engine DOES correctly apply Critical *effects* when `wounds.value <= 0` (`assign-damage-data.mjs:137-150` routes overflow to `criticalDamageTaken` → `getCriticalDamage`), i.e. it models the *consequence* of being Critically Damaged, but never names/exposes the three states.
- canon: RT Core p.262 (`CoreBook-201-401.pdf/markdown.md:2977-2997`): **Lightly Damaged** = Damage ≤ 2×Toughness Bonus; **Heavily Damaged** = Damage > 2×TB (but ≤ Wounds); **Critically Damaged** = Damage in excess of Wounds (i.e. `wounds.critical > 0`). The states key off accumulated Damage vs **twice Toughness Bonus** and vs total Wounds — and in RT 1e they govern **healing rate only**, NOT whether the character takes Critical Damage. (NOTE: the fix_plan QA-WOUNDS-HEALING task text describes "Lightly vs Heavily Wounded (≥ half wounds lost) gating Critical Damage" — that is the **Dark Heresy 2e** framing; RT uses the 2×TB thresholds above and does not gate criticals on the state. Recording the correction so a fix pass uses the right rule.)
- gap: The three RT damage states aren't derived, so a recovery implementation (QA-092) has no state to pick the per-day vs per-week rate from, and the sheet can't show the character's damage state. Derivation is a one-liner pair: `damage = wounds.max - wounds.value`; `criticallyDamaged = wounds.critical > 0`; else `heavilyDamaged = damage > 2*TB`; else `lightlyDamaged`.
- fix: Derive `wounds.state` (or `lightly/heavily/criticallyDamaged` flags) in `acolyte.prepareData` alongside the fatigue flags, from `wounds.max - wounds.value` vs `2 × toughness.bonus` and `wounds.critical`; surface on the sheet and feed the QA-092 recovery rates. · autofixable: no (couples to the recovery design; verify thresholds on rt-smoke)

### QA-094 — Degrees of Success over-counted by the DH2 `1 +` (and tens-digit method) — displayed DoS, opposed tests, and auto-fire hit counts all inflated
- area: rules
- kind: dh-leftover
- severity: P1 (every successful test displays an inflated DoS; opposed-test edge cases + auto-fire hit counts can be one hit high)
- evidence: `src/module/rolls/action-data.mjs:228` `this.rollData.dos = 1 + getDegree(this.rollData.modifiedTarget, this.rollData.roll.total)`, where `getDegree(a,b) = Math.floor(a/10) - Math.floor(b/10)` (`roll-helpers.mjs:21-23`) — the **tens-digit difference**, not `floor((a-b)/10)`. This `dos` is (a) displayed on EVERY test card — `templates/chat/simple-roll-chat.hbs:122` (skill/characteristic) + `action-roll-chat.hbs:240` (combat); (b) the opposed-test discriminator — `checkForOpposed` compares `opposedDos >= this.rollData.dos` (`action-data.mjs:95`) and `getOpposedDegrees(dos, dof, …)` (`:115`); (c) the Semi/Full-auto additional-hit count — `Math.floor((dos-1)/2)` (`:240`), `Math.floor(dos-1)` (`:248`), and Twin-Linked `dos/3`/`dos/2` (`:270,274`). The same `1 +` was REMOVED from DoF by BUG-001 (`:289`) as a DH2 over-count, but BUG-001 explicitly LEFT it on DoS ("correcting DoS is a separate combat-pass task (still open)", `BUGS.md:11`) — so this is the documented-but-deferred DoS half, now audited against canon + impact-mapped.
- canon: RT Core p.22 "Degrees of Success and Failure" (`CoreBook-201-401.pdf/markdown.md:1582-1586`): "For each full 10 points by which the Characteristic was exceeded, one degree of success is achieved." Worked example (Yolanda, Barter): roll **18** vs Fellowship **42** → "**two degrees of success** (success because her roll was 42 or less, one degree because ≤32, a second degree because ≤22)". So canon DoS = how many full 10-point bands the roll is below the target = `floor((target − roll)/10)` for a success (= **2** here). The ship example (`:1250`, roll 29 vs 58 → "two degrees of success") and the Full-Auto example (`:1965`, "two degrees of success … total of three hits") both confirm the band count. The engine yields `1 + getDegree(42,18) = 1 + (4−1) = 4` for the Yolanda roll — **4 vs canon 2**.
- gap: The engine's DoS = `1 + tens-digit-diff` over-counts canon `floor((target−roll)/10)` by **1** always (the DH2 `1 +`) **plus another 1** whenever the roll's units digit exceeds the target's units digit (tens-digit method vs band method — e.g. roll 18/target 42 over-counts by 2; roll 35/target 60 over-counts by 1). Impact: (1) **Displayed DoS is flatly wrong by 1–2 on every successful skill/characteristic/combat card** (a social Barter test that canon scores 2 DoS shows 4) — and any rule keyed to an absolute DoS threshold ("N+ degrees", Assistance "+1 DoS", per-DoS scaling) reads high. (2) **Opposed tests**: the flat `1 +` cancels in the `opposedDos >= dos` comparison (both sides inflated equally), but the units-digit term does NOT cancel (it depends on each roll's units independently), so opposed winners can flip vs canon in edge cases. (3) **Auto-fire hits**: `dos − 1` correctly strips the `1 +`, so Semi/Full-auto hit counts are right in the units-aligned case but **one hit high** when the attack roll's units digit exceeds the target's (the residual tens-digit-vs-band error) — directly inflating damage. NB: this is NOT a duplicate of BUG-001 (which fixed DoF only and deferred DoS); it is the discovery + canon-anchoring of that deferred item, with the broader display/opposed/hit-count impact BUG-001 did not enumerate.
- fix: Compute DoS the canon way — `dos = success ? Math.floor((modifiedTarget - roll.total) / 10) : 0` (drop both the `1 +` AND the tens-digit `getDegree`, which together cause the over-count). ⚠ Ripple: the combat additional-hits formulas are written against the `1 +`-tens-diff convention — Semi `floor((dos-1)/2)`, Full `dos-1`, Twin-Linked `dos/3`/`dos/2`, Accurate `floor(dos/2)` (`damage-data.mjs:184`), Lance `(dos-1)` (`damage-data.mjs:255`), Razor Sharp / Eye of Vengeance thresholds — each must be re-derived against the corrected DoS (canon "additional hit per [two] degree(s) of success" maps to plain `dos`/`floor(dos/2)` once DoS = band count). Needs a full combat-math pass + a node test reproducing the Yolanda example (18 vs 42 → 2) and the canon auto-fire example (2 DoS → 3 hits), then live verification on rt-smoke. · autofixable: no (rules judgement + cascading hit-count re-derivation; verify on rt-smoke)
