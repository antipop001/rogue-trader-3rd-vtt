# fix_plan — Origin-Path "Background" compendium automation

One task per iteration. The next task is the **top unchecked `[ ]`** in the active
list. Each authoring task: write the named trait items into `src/packs/traits/
traits.yml` per `specs/04-backgrounds-compendium.md` (canon text + `source:` page,
ActiveEffect/conditionalBonus/pickable where mechanical, `name:` EXACT to the data
grant), then RAISE the floor in `tests/chargen/background_coverage.test.mjs` to the
stated target, gate green (`build:check` + `npm test`), commit, append a line to
`.ralph/data-vendor-queue.md`. Canon source: `/mnt/project_data/RT/RT-DOCS/`.

Goal: every origin-granted trait resolves (TRAIT_RESOLVED_FLOOR 8 → 103) and the 7
stray talents resolve (TALENT_RESOLVED_FLOOR 72 → 79).

## Done (setup, by hand outside the loop)
- [x] BG-000 — Shelve the chargen wizard UI (disable `renderActorDirectory` hook in
  `hooks-manager.mjs` + `CHARGEN_UI_ENABLED=false` in `acolyte-sheet-v2.mjs`); code
  left intact. Seed `specs/04`, this backlog, and the coverage ratchet test.

## Active list

- [x] TAL-FIX-001 — Resolved the 7 stub talents. Renamed `Chem Geld`→`Chem-Geld`;
  authored `Pistol Weapon Training (Las)`, `Pistol Weapon Training (SP)`, `Xenos
  Weapon Training (Ork)`, a pickable `Resistance` base (resolves `Resistance
  (Interrogation)`; `Resistance (Psychic Powers)` still aliases→`(Psychic
  Techniques)`), and a pickable `Weapon Training` base (resolves `Weapon Training
  (choose one)`). TALENT_RESOLVED_FLOOR=79. (TAL-FIX)

- [x] BG-001 — Home World traits batch A (9): Accustomed to Crowds, Blessed Ignorance,
  Charmed, Constant Combat Training, Criminal, Dynastic Warrant, Etiquette, Hivebound,
  Honour Amongst One's Peers. Source: `home_worlds.json`. TRAIT_RESOLVED_FLOOR=17.
  Hivebound got an AE (-10 survival) + out-of-hab conditional; Blessed Ignorance/
  Etiquette/Criminal/Constant Combat Training/Honour are conditionalBonuses; Charmed/
  Accustomed to Crowds/Dynastic Warrant are narrative text-only. (BG-AUTHOR)

- [x] BG-002 — Home World traits batch B (8): Ill-omened, Leery of Outsiders, Officer
  on Deck, Paranoid, Ship-Bound Fighter, Sixth Sense, Stranger to the Cult, Street
  Knowledge. Source: `home_worlds.json`. TRAIT_RESOLVED_FLOOR=25. 6 conditionalBonuses;
  Ship-Bound Fighter + Sixth Sense text-only (Initiative/BS-penalty & sibling-granted
  skill/talent not expressible as a roll-prompt bonus — see vendor queue). (BG-AUTHOR)

- [x] BG-003 — Home World traits batch C (8): Survivor, Tenacious Survivalist, Tough
  as Grox-Hide, Underground Resources, Vendetta, Void Accustomed, Wary, Xenos
  Interaction. Source: `home_worlds.json`. TRAIT_RESOLVED_FLOOR=33. Survivor +10 WP
  (resist Pinning/Shock) & Xenos Interaction -5 social-vs-Imperial-Cult are
  conditionalBonuses; Tough as Grox-Hide text-only (Wound already folded into
  Starting Wounds); Wary/Tenacious Survivalist text-only (Initiative not expressible —
  no `.modifier` field); Underground Resources/Vendetta/Void Accustomed narrative. (BG-AUTHOR)

- [x] BG-004 — Trials & Travails + Motivations (11): Against All Odds, Brook No Insult,
  Common Lore Improvement, Dark Secret, Ill-starred, Jealous Freedom, Refined Tastes,
  The Face of the Enemy, Vendetta of Rivals (`trials_and_travails.json`); Heirloom
  Item, Loyalty (`motivations.json`). TRAIT_RESOLVED_FLOOR=44. Wired: Ill-starred &
  The Face of the Enemy (-5/-10 Fel conditionalBonus), Loyalty (+5 WP/Fel cond aboard
  ship), Refined Tastes (AE +5 charm); 7 text-only (Fate-reroll / Common-Lore-pick /
  narrative WP-test traits not expressible as a roll-prompt bonus). (BG-AUTHOR)

- [x] BG-005 — Lure of the Void + Birthright (7): Blessed Scars, Imperfect Bionic,
  Imperial Chauvinism, Mutant, Xenophile (`lure_of_the_void.json`); Mutation, Rival
  (Underworld) (`birthrights.json`). Note `Mutant`/`Mutation` reference Table 14-3
  (taint_tables.json). Target TRAIT floor 51. (BG-AUTHOR)

- [x] BG-006 — Ork species core traits (5): Da Boyz, Madboyz, Medicae (Ork), No
  Corruption, Unnatural Toughness (x2). Source: `species.json` (ItS pp.61-62).
  TRAIT_RESOLVED_FLOOR=56. All five text-only: Unnatural Toughness (x2) is
  multiplicative and the `.unnatural` field is a flat additive integer → no static AE
  expresses x2 for arbitrary Toughness (LIMITATION, vendor queue); Medicae (Ork) +20
  applies to the HEALER's roll not the Ork's own; Da Boyz/No Corruption/Madboyz are
  behavioural/narrative. (BG-AUTHOR)

- [x] BG-007 — Ork Klan traits (6): Klan: Bad Moons, Klan: Blood Axes, Klan: Death
  Skulls, Klan: Evil Suns, Klan: Goffs, Klan: Snakebites. Source: `careers.json` (ItS
  pp.61-62). TRAIT_RESOLVED_FLOOR=62. Wired: Goffs (AE +3 Strength), Bad Moons
  (conditionalBonus +20 Barter vs Orks). 4 text-only — skill-training choices + talent
  grants (Blood Axes/Death Skulls/Evil Suns/Snakebites) not AE-expressible. (BG-AUTHOR)

- [x] BG-008 — Ork Know-Wotz traits (6): Know-Wotz: Driva, Know-Wotz: Hunta, Know-Wotz:
  Mekboy (Oddboy), Know-Wotz: Painboy (Oddboy), Know-Wotz: Runtherd (Oddboy), Know-Wotz:
  Trappa. Source: `careers.json`. TRAIT_RESOLVED_FLOOR=68. ALL SIX TEXT-ONLY — each
  Know-Wotz's Trained-Skill grant + the Mekboy/Painboy +5 Int are applied by SIBLING
  grant_skill/char_mod effects; an AE would double-apply (confirmed in commit.mjs), so
  faithful canon text only. (BG-AUTHOR)

- [x] BG-009 — Kroot Kindred traits (5): Kindred: Bold Hunter, Kindred: Cunning Hybrid,
  Kindred: Greenskin Hybrid, Kindred: Headhunter, Kindred: Stalker. Source:
  `careers.json` (ItS pp.49-50). TRAIT_RESOLVED_FLOOR=73. Wired: Bold Hunter (AE +5
  Wrangling + cond +10 WP vs Fear/Pinning), Cunning Hybrid (AE +5 Barter/+5 Deceive).
  3 text-only — char_mod siblings (+5 BS/+10 Int/+10 T) handle the characteristic
  bumps; Headhunter auto-pass-toxin/beak-quality + Stalker free-action stealth +
  Cunning's +1 Initiative are not AE-expressible. (BG-AUTHOR)

- [x] BG-010 — Warrant: Acquisition (7): Acquisition: Administratum Trade Mandate,
  Blackmail, Exile, Intrigue, Ministorum Bequest, Prize of War, Reward. Source:
  `warrant_and_ship.json`. TRAIT_RESOLVED_FLOOR=80. All 7 text-only narrative chart
  outcomes (ItS pp.38-39); PF/SP already applied by sibling profit_factor/ship_points
  effects → no AE, no double-grant. (BG-AUTHOR)

- [x] BG-011 — Warrant: Contacts (5): Contacts: Adeptus Mechanicus, Battlefleet,
  Merchant House, Missionaria Galaxia, Pirates. Source: `warrant_and_ship.json`.
  TRAIT_RESOLVED_FLOOR=85. All 5 text-only narrative chart outcomes (ItS pp.43-44);
  PF/SP already applied by sibling profit_factor/ship_points effects → no AE, no
  double-grant. (BG-AUTHOR)

- [x] BG-012 — Warrant: Fortune & Fate (5): Fortune & Fate: Ascending, Fallen from
  Grace, Rising Star, Stable, Struggling. Source: `warrant_and_ship.json`.
  TRAIT_RESOLVED_FLOOR=90. All 5 narrative Warrant-chart outcomes (ItS p.37); PF/SP
  already applied by sibling profit_factor/ship_points effects → text-only, no AE,
  no double-grant. (BG-AUTHOR)

- [x] BG-013 — Warrant: Sanction (5): Sanction: Age of Plunder, Angevin Crusade, Fall
  of the Tellurian Combine, Halo Artefacts, The Meritech Wars. Source:
  `warrant_and_ship.json`. TRAIT_RESOLVED_FLOOR=95. All 5 text-only narrative House-
  history chart outcomes (ItS pp.40-41); PF/SP already applied by sibling
  profit_factor/ship_points effects → no AE, no double-grant. (BG-AUTHOR)

- [x] BG-014 — Warrant: Age + Renown (8): Warrant Age: Age of Apostasy, Age of
  Redemption, The Age of Rebirth, The Forging, The Waning; Warrant Renown: Famous,
  Infamous, Unknown. Source: `warrant_and_ship.json`. TRAIT_RESOLVED_FLOOR=103 (GOAL
  REACHED — all 103 granted traits resolve). All 8 text-only narrative Warrant-chart
  outcomes (ItS pp.35-36 Age, p.44 Renown); PF/SP already applied by sibling
  profit_factor/ship_points effects → no AE, no double-grant. (BG-AUTHOR)

- [ ] BG-FIX-001 — `Klan: Goffs` (BG-007) carries an AE +3 Strength, but careers.json
  grants Goffs a SIBLING `char_mod S+3` in the same option → committing via chargen
  double-applies (+6 Str). Remove the Goffs AE (text-only, like the Know-Wotz) OR
  confirm commit.mjs dedupes; cite the do-not-double-apply rule. (BG-AUTHOR)

- [ ] BG-015 — Final verify (BG-VERIFY): confirm both ratchets at goal (TRAIT 103,
  TALENT 95); add a node test asserting `commit.mjs` embeds a REAL item with its AE
  (not a stub) for `Mutant` + `Void Accustomed`; regenerate the data-vendor-queue
  summary of all authored items + canon cites.

## Notes / decisions
- Items live in the EXISTING `traits` pack (not a new pack) so `commit.mjs` resolves
  them from one index. Tag each with `flags.rt.category: 'Background'` + `originStep`.
- ActiveEffect convention: mode 2 on `system.{characteristics.<k>|skills.<k>}.modifier`,
  matching the talents pack. Situational → `conditionalBonuses`. "(choose one)" →
  `pickable`. See `specs/04`.
- Canon correctness is NOT gate-checked → every task logs to `.ralph/data-vendor-queue.md`.

## Out of scope (do NOT seed)
- The chargen wizard (shelved on `ralph/chargen`) — no wizard UI work here.
- Re-vendoring `src/module/chargen/data/*.json` (read-only worklist).
- A separate backgrounds pack; export/derived-stat/item-effect-engine work.
