# Known bugs to fix (outside the backgrounds loop)

Tracked here rather than in `fix_plan.md`: the `ralph/backgrounds` loop is scoped to
compendium content, and its gate (`build:check` + `tests/chargen`) can't verify
engine/roll fixes. Fix these directly, or in a dedicated follow-up loop.

## BUG-001 — Degrees of Failure (and Success) inflated by 1
- **Status: ✅ DoF FIXED 2026-06-23** — dropped the `1 +` at `action-data.mjs:278`
  (DoF = tens difference). Verified: 61 vs 52 → 1, 92 vs 62 → 3; build + node tests
  green. **DoS (line 226) intentionally left as `1 +`** — the combat additional-hits
  math depends on it; correcting DoS is a separate combat-pass task (still open).
- **Symptom:** a Skill/Characteristic test FAIL shows one extra Degree of Failure.
  Observed 2026-06-23 on Tech Use cards: roll **61** vs target **52** → shows DoF
  **2** (should be **1**); roll **92** vs target **62** → shows DoF **4** (should be
  **3**). Consistently +1.
- **Cause:** `src/module/rolls/action-data.mjs:278` computes
  `dof = 1 + getDegree(roll, target)`, and `:226` `dos = 1 + getDegree(target, roll)`,
  where `getDegree(a, b) = Math.floor(a/10) - Math.floor(b/10)` (`roll-helpers.mjs:21`).
  RT 1e counts degrees as the tens-digit difference only (RT Core p.22) — the leading
  `1 +` is the DH2 convention and over-counts by one.
- **Fix:** drop the `1 +` from the DoF calc (line 278) so DoF = tens difference.
- **⚠ Ripple — do NOT blindly change DoS too:** the same `1 +` is on DoS (line 226),
  and the combat code is written against that convention — additional-hits math uses
  `Math.floor((dos-1)/2)` (Semi-Auto), `dos-1` (Full-Auto) ~L239/247; Accurate uses
  `Math.floor(dos/2)` (`damage-data.mjs:184`); Lance `(dos-1)` (`damage-data.mjs:255`);
  Twin-Linked/Razor Sharp thresholds, etc. If DoS is also corrected to the tens
  difference, every one of those must be re-derived so hit/penetration counts don't
  silently shift. The **DoF-only** fix (skill/characteristic/test cards) is isolated
  and safe; the DoS correction needs a full combat-math pass.
- **Verify:** add a node test over `getDegree`-based dof/dos; confirm a skill-test
  card and an attack card on rt-smoke after the change.

## BUG-002 — Paranoia talent not adding to Initiative
- **Symptom:** the Paranoia talent gives no Initiative bonus. Reported 2026-06-23.
- **Canon:** RT Core (Paranoia) — "The character gains a **+2** bonus on Initiative
  rolls" (also a secret GM Perception test to notice hidden threats — not automated).
- **Cause (two parts):**
  1. The Paranoia entry in `src/packs/talents/talents.yml` has benefit text ("+2
     bonus on Initiative rolls") but no `effects`/`conditionalBonuses`, so nothing
     applies the bonus.
  2. Even with an effect, `acolyte.mjs:333` (and `base-actor.mjs:120`) compute
     `this.initiative.bonus = this.characteristics[initiative.characteristic].bonus`
     — an OVERWRITE, run in derived data AFTER ActiveEffects apply. There is no
     additive `system.initiative.modifier` field, so an AE on `system.initiative.bonus`
     would be clobbered.
- **Fix:** add a `modifier` field to `system.initiative` in `template.json`; change the
  two compute lines to `bonus = char.bonus + (this.system.initiative.modifier ?? 0)`
  so effect-written modifiers survive; give Paranoia an ActiveEffect
  `{key: 'system.initiative.modifier', mode: 1 (add), value: '2'}`. This also makes
  Initiative generally effect-addressable for other talents/gear.
- **Verify:** Paranoia on an actor raises displayed Initiative by 2; node test on the
  initiative compute; check the sheet on rt-smoke.

## BUG-003 — Weapon Master (Arch-militant) bonus never applies
- **Symptom:** Weapon Master gives no bonus when wielding the chosen weapon class.
  Reported 2026-06-23.
- **Canon:** RT Core (Weapon Master): "Choose one class of weapon. When wielding a
  weapon of that chosen class in combat, the Arch-militant gains **+10 to hit, +2
  damage, and +2 Initiative**."
- **Cause:** the entry in `talents.yml` IS half-wired — it has `flags.rt.pickable
  {kind: weaponClass}` so the player picks the class (choice stamped on
  `system.choice`), but there is NO mechanism that APPLIES the +10/+2/+2 when an
  attack uses a weapon of that class. `conditionalBonuses`/`collectOptionalBonuses`
  only key on skills/characteristics — they can't express a "weapon of class X"
  condition, and the attack/damage/initiative paths don't consult the talent.
- **Fix (design):** extend the conditional-bonus machinery (or attack-specials) with
  a weapon-class condition, and wire Weapon Master to add +10 to-hit + +2 damage in
  the attack/damage flow when the equipped/used weapon's `class` matches
  `system.choice`, plus +2 Initiative (depends on BUG-002's additive initiative).
  Larger than a data edit — needs engine support.
- **Verify:** Arch-militant with Weapon Master (Basic) gets +10/+2 on a basic-weapon
  attack card and +2 Initiative; no bonus with other weapon classes.

## BUG-004 — Fatigue rule wrong (threshold + penalty) vs RT 1e
- **Status: ✅ FIXED 2026-06-23, verified live on rt-smoke (Playwright).** `acolyte.mjs`:
  `fatigue.max = toughness.bonus`; removed the characteristic-halving; `fatigued`/
  `unconscious` derived flags. `rollCharacteristic`/`rollSkill` add a `-10` 'Fatigued'
  modifier when `fatigue.value >= 1`. Sheet panel shows "Fatigued (−10)" / "Unconscious".
- **Symptom:** Fatigue does ~nothing in play. Reported 2026-06-23.
- **Canon (RT Core p.251):** a character functions with up to **Toughness Bonus**
  levels of Fatigue; **any** level (≥1) imposes a flat **−10 to ALL Tests** (no
  further penalty for more levels); exceeding TB → unconscious for 10−TB minutes, then
  Fatigue reverts to TB. Recovery: 1 level/hour rest, all in 8 hours.
- **Causes (`src/module/documents/acolyte.mjs`):**
  1. **L334** `fatigue.max = toughness.bonus + willpower.bonus` — that's the **DH2**
     threshold. RT 1e threshold is **Toughness Bonus only**.
  2. **L324-327** halves a characteristic when `fatigue.value > characteristic.bonus`
     — not an RT 1e mechanic. It rarely triggers (needs Fatigue above a stat's bonus)
     and applies the wrong effect (halve one stat) instead of −10 to everything.
  3. The **−10 penalty is never applied to rolls** — `rollCharacteristic`/`rollSkill`
     (~L149+) add no fatigue modifier (they use `rollData.modifiers[...]`); attacks go
     through `rollCharacteristic`, so they're un-penalised too. No unconscious handling.
- **Fix:**
  1. `fatigue.max = this.characteristics.toughness.bonus` (Outcast "+2 TB for Fatigue"
     per `rules/backgrounds.mjs:88` should bump this if present).
  2. Remove the L324-327 halving block.
  3. In `rollCharacteristic` + `rollSkill`, when `this.fatigue.value >= 1` add
     `rollData.modifiers['Fatigued'] = -10` (covers WS/BS attacks via rollCharacteristic).
  4. Sheet (`templates/actor/panel/fatigue-panel.hbs`, used by acolyte + NPC): show Max
     as TB; show "Fatigued (−10 all Tests)" when value ≥ 1; show "Unconscious" when
     value > max.
- **⚠ Foundry-coupled** (rolls + sheet) — the node gate can't exercise it; verify on
  rt-smoke (fatigued actor shows −10 on a skill/characteristic/attack card; Max = TB).

## BUG-005 — Assign Damage: armour ignored + crash before wounds applied
- **Status: ✅ FIXED 2026-06-23, verified live on rt-smoke (Playwright):** 10 dmg / pen 2
  to a Body with worn AP 4 + Natural Armour 2 + TB 4 → armour 6, reduction (6−2)+4 = 8,
  Wounds 10 → 8 on the sheet; chat card posts.
- **Symptom:** assigning damage didn't account for armour/TB/penetration and didn't
  remove Wounds from the sheet. Reported 2026-06-23.
- **Real cause A — assign-damage read worn-only armour.** `_computeArmour` `.total` is
  ALREADY the complete AP (it accumulates traitBonus + cybernetic, then per-location
  `total += value` folds in worn — the sheet shows `.total` correctly). But
  `assign-damage-data.mjs:44` read `.value` (worn only), so Natural-Armour/cybernetic
  AP were ignored when reducing damage. **Fix:** assign-damage now reads `.total`.
  (Initial guess that `.total` omitted worn was wrong — the per-location `total += value`
  lines already handle it; a Playwright check caught an accidental double-add.)
- **Real cause B — crash before/around the wound write.** `performActionAndSendToChat`
  did `this.actor = await this.actor.update(...)` then `game.actors.get(this.actor._id)`.
  `update()`'s return clobbered `this.actor` (→ undefined in testing) so the chat step
  threw `Cannot read '_id'`; and `game.actors.get(id)` is the wrong document for an
  unlinked token. **Fix:** don't reassign `this.actor`; use the live target doc directly
  for the chat speaker. Confirmed live: wounds now persist to the sheet.

## BUG-006 — Psychic power ranges are prose, not Roll formulas (Compel + most powers)
- **Status: ✅ FIXED 2026-06-23, verified live on rt-smoke (Playwright).** Added
  `normalizePsychicRange()` (pure, in `roll-helpers.mjs`) and used it in
  `calculatePsychicAbilityMaxRange` instead of `Roll()`. Node test
  `tests/chargen/psychic_range.test.mjs`. Live: Compel's `5m x Psy Rating` → maxRange 20
  at PR 4 (1km×PR3→3000, Self→0, 10m→10); no more "Range formula failed" warning.
- **Symptom:** Compel has range issues. Reported 2026-06-23.
- **Cause:** `src/packs/psychic-powers/psychic-powers.yml` stores `range` as human text —
  Compel = `5m x Psy Rating` (canon: RT Core "Range: 5m × Psy Rating"). But
  `calculatePsychicAbilityMaxRange` (`src/module/rules/range.mjs` ~L55-75) only handles a
  plain integer or '' and otherwise feeds the string to Foundry's `Roll(...).evaluate()`
  → `"5m x Psy Rating"` isn't a valid formula → catch → "Range formula failed - setting
  to 0" → range 0.
- **Systemic:** nearly all pack ranges are prose — `1km x Psy Rating`, `10m`, `100m`,
  `Personal`, `Self`, `Gaze`, `1m x Psy Rating radius`, `1 VU x Willpower Bonus`,
  `any person he can see` — so most ranged powers parse to 0 (even plain `10m` fails: the
  `m` makes it an invalid Roll).
- **Fix (preferred): a normaliser in `range.mjs`** that converts the prose to a number
  before/instead of `Roll()`: strip `m`; `km`→×1000; `Psy Rating`→`@pr`; `Willpower
  Bonus`→willpower bonus; `VU`→VU distance; `Self`/`Personal`/`Gaze`/"can see"→0 or a
  sentinel. One code change covers all ~79 powers. (Alternative: rewrite every `range:`
  to a real Roll formula like `5 * @pr` — more entries, but data stays declarative.)
- **⚠ Foundry-coupled** (Roll + rollData) — verify on rt-smoke (Compel PR 4 → 20m).

## BUG-007 — Opposed powers don't prompt for the opposed check
- **Status: ✅ FIXED 2026-06-23 (option a), verified live on rt-smoke (Playwright).**
  Casting a power with `target.isOpposed` now posts a "Roll Opposed (X)" card
  (`acolyte._promptOpposed` + `templates/chat/opposed-prompt-chat.hbs`), wired into BOTH
  cast modes via `rollItem`. The button (`basic-action-manager._rollOpposed`) resolves
  the defender (cast-time target → current target → selected token) and rolls their
  opposed characteristic/skill test (prompted). The silent auto-roll in
  `checkForOpposed` is now suppressed for psychic powers (`&& !this.rollData.power`) so
  it isn't resolved twice. Live: Compel posts the WP button; non-opposed power posts
  nothing.
- **Symptom:** a power that calls for an Opposed test (e.g. Compel — "Opposed
  Willpower") should prompt for / resolve the opposed check; it doesn't. Reported
  2026-06-23.
- **Findings:** the data + engine partly support it — power `target` carries
  `isOpposed: true` + `opposed: willpower`; `PsychicRollData` (`roll-data.mjs` ~L431-444)
  sets `isOpposed`/`opposedTarget` *when a target token is selected*; and
  `ActionData.checkForOpposed` (`action-data.mjs` L85-97) rolls the target's resist test
  and compares DoS. Gaps:
  1. **Simple-cast bypass:** with the `simplePsychicRolls` setting on, `rollItem` casts
     via `rollCharacteristic('willpower', name)` (`acolyte.mjs` ~L224), a plain Focus
     test that never calls `checkForOpposed` — so opposed powers ignore the opposition
     entirely. Only the full `performPsychicAttack` path resolves it.
  2. **Needs a target:** `isOpposed` only engages when `this.targetActor` is set (a
     targeted token); otherwise nothing happens.
  3. **No prompt:** even when engaged, `checkForOpposed` *auto-rolls* the defender's test
     silently (`targetActor.rollCheck(opposedTarget)`) — the user wants a prompt for the
     check (let the defender/GM roll, apply modifiers).
- **Fix (design):** when casting a power whose `target.isOpposed` is true, surface the
  opposed test as a prompt/roll rather than skipping or silently auto-rolling — and make
  it fire in the simple-cast path too (route opposed powers through the opposed flow, or
  add an opposed-roll prompt/chat-card button so the defender rolls). Decide the UX:
  (a) dialog at cast time, (b) a "Roll Opposed (WP)" button on the result card for the
  defender/GM, or (c) keep the auto-roll but always show it. Needs a target or a
  manual-entry fallback.
- **⚠ Foundry-coupled** (cast pipeline + a new prompt) — verify on rt-smoke.

## BUG-008 — Righteous Fury uses DH2-style crit-table effect, not RT 1e RAW
- **Status: ✅ FIXED 2026-06-23 (RAW, user's call), verified live on rt-smoke
  (Playwright, 80-trial statistical check).** `damage-data.mjs`: a natural 10 (or
  Vengeful threshold) on a damage die now makes a **confirming attack roll**
  (`1d100 ≤ modifiedTarget`); on a hit it adds **another full weapon damage roll** to
  `this.damage` (melee extras include Strength Bonus) and **chains** on further 10s;
  the 1d5 Critical-Hits-table lookup is gone. Chat card shows the confirm roll + bonus
  damage (or "missed"). Known minor undercount: per-hit talent bonuses (Crushing Blow/
  Mighty Shot) aren't re-applied to the extra roll — follow-up. Live: 6/6 natural-10s
  confirmed + added damage; non-RF rolls unchanged.
- **Current behaviour** (`src/module/rolls/damage-data.mjs:93-134` + RF block in
  `action-roll-chat.hbs`): any active damage die ≥ 10 (the `Vengeful` quality lowers the
  threshold) AUTO-triggers RF → rolls `1d5` → looks up the Critical Hits table
  (`getCriticalDamage(damageType, location, 1d5)`) and shows "Righteous fury hits for a
  level X critical effect." No confirmation to-hit roll; no extra damage added to the
  total (only a crit *effect* is attached).
- **RT 1e canon** (RT Core p.250): a natural 10 on a damage die → attacker makes a
  **second, identical attack roll (WS/BS test)**; only **if it hits** does RF apply, and
  RF = **roll another full damage roll and add it** to the total (chains on further 10s).
  RT 1e RF does NOT roll the Critical Hits table. Edge rules: unarmed 10s count as 5s;
  helpless target rolls damage twice, two 10s = automatic RF.
- **Deviation:** DH2 carryover — auto crit-table effect with no confirm and no bonus
  damage, vs RT 1e's confirm-to-hit + extra damage roll.
- **Fix (if RAW wanted):** on a natural 10, make a confirming attack roll (reuse the
  attack BS/WS); on a hit, add another full weapon damage roll to `this.damage` and
  re-check the new dice for chained RF; drop the 1d5 crit-table lookup. Unarmed 10→5.
  ⚠ Foundry-coupled (damage pipeline) — verify on rt-smoke. ⚠ Touches `damage-data.mjs`,
  which the running effects-audit loop may also edit (Weapon Master) — do when idle.

## BUG-009 — Item-grant machinery (`flags.rt.grants`) never embeds the granted item
- **Status: ✅ FIXED 2026-06-24 — confirmed in the live UI** (Bionic Heart → Sprint
  talent appears). The earlier batch-test flakiness was a Playwright-harness artifact
  (rapid create/check/delete churn), not a real race. The deferred+retry fix below is
  correct for real usage. (Optional follow-up: cache the talents pack index instead of
  reloading via `getDocuments()` per grant to drop the ~1.5s landing delay.)
- **Fix applied (`hooks-manager.mjs` `onCreateItem`):** schedule `applyItemGrants` off
  the create-hook turn at 0ms AND ~750ms (idempotent via `pendingGrants` dedup), so the
  embed lands after the originating create's items writeback instead of being clobbered.
  Applied a deferred + retry fix in `onCreateItem` (`hooks-manager.mjs`): schedule
  `applyItemGrants` off the create-hook turn at 0ms AND ~750ms (idempotent via
  `pendingGrants` dedup), to land the embed after the originating create's items
  writeback. **Direct observation confirms it works** — an instrumented single-actor
  timeline showed the granted Sprint talent CREATE (no DELETE) and persist from ~1.5s
  through 6s. **But automated batch tests (rapid create/wait/check/delete loops) remain
  inconsistent** (mixed/false), indicating a residual race I could not fully close on
  the live box. Needs a **real in-UI confirmation** (add a Bionic Heart cybernetic to
  an actor, confirm a Sprint talent appears within ~2s) and likely a proper
  concurrency-safe rework (apply grants from a post-operation queue, or bake granted
  items in at actor/item creation rather than via a post-create hook). The ~1.5s delay
  also comes from `applyItemGrants` reloading the full talents pack via `getDocuments()`
  on every grant — cache the pack index instead.
- **Diagnosis (verified live):** the `createItem` hook fires correctly (userId match,
  parent Actor, `flags.rt.grants` present); `pendingGrants` returns the grant; the pack
  resolves the talent; the embed even SUCCEEDS in-memory ("items now: [Bionic Heart,
  Sprint]") — but when initiated *during* the originating create flow it is dropped from
  the persisted items on writeback. Deferring helps but does not fully eliminate the race.
- **Was found by the 2026-06-24 verification sweep (Playwright).** The
  effects-audit loop's ENGINE-TRAIT-GRANTS feature (iters 42–44: Bionic Heart→Sprint,
  Memorance→Total Recall, Vitae→Autosanguine, Blackbone→Bulging Biceps+Iron Jaw, Sixth
  Sense→Rival(Inquisition)) does not actually grant anything.
- **Evidence (all preconditions verified live, yet no embed):**
  - `createItem` hook is registered; fires for Bionic Heart with `userId === game.user.id`,
    `item.parent.documentName === 'Actor'`, and `flags.rt.grants = [{name:Sprint,type:talent}]`
    present on both source and embedded item.
  - `pendingGrants(...)` would return `[Sprint]` (actor has no Sprint).
  - The talents pack resolves Sprint (`type:talent`, name match) and a manual
    `createEmbeddedDocuments` of it succeeds.
  - But after adding Bionic Heart, no Sprint talent appears — and **no exception, no
    `console.error`, no `game.rt.warn`** is emitted. So `applyItemGrants`
    (`hooks-manager.mjs:264`) reaches neither its `!pack`/`!src` warns nor a throw, yet
    its final `await actor.createEmbeddedDocuments('Item', toCreate)` has no effect.
- **Likely cause (to confirm with one logging line):** the embed is initiated from
  inside the `createItem` hook callback (Hooks.callAll does not await it), so the nested
  `createEmbeddedDocuments` on the same parent is being dropped/swallowed by Foundry's
  create flow even though `await pack.getDocuments()` yields first. Candidate fix: defer
  the grant embed off the hook turn (e.g. resolve grants and `createEmbeddedDocuments`
  from a `queueMicrotask`/`setTimeout(…,0)` or a later hook), and/or have
  `applyItemGrants` log the `toCreate` length so the exact branch is visible.
- **Verify:** add Bionic Heart to an actor → a Sprint talent auto-embeds. (Live test:
  `scratchpad/dbg_grant4.py`.) Foundry-coupled — verify on rt-smoke.

## BUG-010 — Choice-grants (`flags.rt.grants` with a `choice`) don't embed
- **Status: ✅ FIXED 2026-06-24 — root cause found.** The deferred grant embedded on the
  actor reference *captured when the createItem hook fired* (`item.parent`). When the
  granting item carries an **ActiveEffect** (Sixth Sense's Psyniscience upgrade), creating
  it re-prepares the actor, leaving that captured ref **stale/detached** — and
  `createEmbeddedDocuments` on a stale actor doc **hangs** (its own createItem hook never
  fires). Bionic Heart (no AE) didn't re-prepare → its ref stayed valid → Sprint worked,
  which is why it looked talent-specific. **Fix:** `applyItemGrants` now embeds on a
  freshly-fetched live actor (`game.actors.get(actor.id) ?? actor`). Choice-grant path
  re-enabled. **This also fixed BUG-009's flakiness** (same stale-ref root cause), so the
  two-pass 0+750ms retry was dropped for a single deferred pass — no more double-create.
  Verified (single-actor polled): Sixth Sense → `Rival (Inquisition)` lands ~2s, exactly
  once, persists, Psyniscience upgrade applies; Bionic Heart → `Sprint` likewise (one
  CREATE, persists). 166 node tests pass.
- **Found by the 2026-06-24 verification sweep.** Plain item-grants work
  (verified live: Explorator Implants→Mechanicus Implants, Bionic Heart→Sprint), but a
  grant carrying a `choice` does not embed. Repro: Sixth Sense trait
  (`flags.rt.grants: [{name:Rival, type:talent, choice:Inquisition}]`) — its
  Psyniscience skill-upgrade AE applies (advance 0→1 ✓), but no `Rival (Inquisition)`
  talent appears on the actor. A talent named exactly `Rival` exists (talents.yml:2832),
  so resolution should succeed; `applyItemGrants` even has a `g.choice` branch (stamps
  `system.choice` + renames). Likely the same defer/clobber race as BUG-009 hitting the
  choice path specifically, or the rename/`system.choice` stamp interacting with the
  pickable `Rival`'s `onCreateItem` early-return. Needs the same instrument-and-defer
  debugging BUG-009 got. Verify: add Sixth Sense → a `Rival (Inquisition)` talent
  appears within ~2s.

## BUG-011 — Focus Power Test missing the +5 × Psy Rating bonus (every psychic test too low)
- **Status: ✅ FIXED 2026-06-24, verified live on rt-smoke.** `roll-data.mjs`
  `PsychicRollData.update()` now sets `modifiers['psy rating'] = 5 * this.pr` (effective
  PR handles Fettered/Unfettered/Push); removed the non-canon flat `hasFocus`+10 and its
  dead "Has Focus" prompt checkbox. Live: WP 45 / PR 5 Unfettered → modifiedTarget **70**
  (45 + 25), matching the RT Core p.157 example. (From QA-037.)
- **Symptom:** every Focus Power Test rolls 15-25 points too hard, so psykers' powers
  fail far more than RAW across the whole psychic subsystem.
- **Cause:** `roll-data.mjs:415` — the Focus Power target gets NO Psy-Rating bonus; the
  only PR-adjacent modifier is a homebrew flat `focus` +10 toggled by `psy.hasFocus`.
  Effective PR (`:392-400`) feeds damage/range/phenomena but is never added to the test
  target. 0.7.12 correctly removed the DH2 "±10 per PR-difference" term but never added
  RT 1e's distinct **+5 per Psy Rating level** (CLAUDE.md §H's "preserved correct PR
  bonus" claim is false).
- **Canon:** RT Core p.157 — "the Psyker adds **+5 to his Focus Power score for each
  level of Psy Rating**." Example: WP 45 + PR 5×5 = **70**.
- **Fix:** in `PsychicRollData.update()` add `this.modifiers['psy rating'] = 5 * this.pr`
  (effective PR already handles Fettered/Unfettered/Push); remove or re-justify the flat
  `focus` +10. ⚠ Foundry-coupled — verify on rt-smoke (PR 5 Unfettered, WP 45 → target 70).

## BUG-012 — Acquisition modifier tables wrong vs RT Core Table 9-35 (availability + scale)
- **Status: ✅ FIXED 2026-06-24, verified live on rt-smoke.** `acquisition.mjs`
  `AVAILABILITY_MODS`/`SCALE_MODS` replaced with the verbatim Table 9-35 values
  (added `abundant: 50`; un-swapped `negligible: 30` / `trivial: 20`). Live import
  confirmed: ubiquitous 70, abundant 50, rare −10, near-unique −50, unique −70;
  negligible 30, trivial 20. (From QA-052 + QA-053.)
- **Symptom:** almost every Acquisition Test rolls against the wrong target — systematically
  much harder than RAW; the Herodor worked example can't be reproduced.
- **Cause:** `rules/acquisition.mjs` — `AVAILABILITY_MODS` (:9-20) is shifted ~20-40 points
  harsher than canon and is **missing the Abundant (+50) tier** (falls through to `?? 0`);
  `SCALE_MODS` (:29-37) has **Negligible/Trivial swapped** (Negligible+20/Trivial+30 vs
  canon +30/+20). The header comment + CLAUDE.md §G wrongly claim "verbatim p.270".
- **Canon (Table 9-35):** Availability — Ubiquitous +70, Abundant +50, Plentiful +30,
  Common +20, Average +10, Scarce +0, Rare −10, Very Rare −20, Extremely Rare −30, Near
  Unique −50, Unique −70. Scale — Negligible +30, Trivial +20, Minor +10, Standard 0,
  Major −10, Significant −20, Vast −30.
- **Fix:** replace both tables with the Table 9-35 values (add `abundant: 50`; set
  `negligible: 30, trivial: 20`). Related: QA-054 (Commerce Acquisition bonus is +10/DoS,
  RT is **+2/DoS** — P1, in QA_FINDINGS.md).

## BUG-013 — Primitive weapons deal 0 damage dice (DH2 die-cap resolves to 0) + wrong RT rule
- **Status: ✅ FIXED 2026-06-24, verified live on rt-smoke.** (1) Removed the DH2 per-die
  cap in `damage-data.mjs` — primitive weapons now deal full dice (verified: `1d10+2` rolls
  8-12, was a flat ~2). (2) Implemented the RT 1e defender-side rule: a `Hit.primitive` flag
  (set in `_calculateDamage`, threaded via the chat card's `data-primitive` →
  `_assignDamage`) makes `assign-damage-data.finalize()` **double the struck location's AP
  before penetration** (`_armourIsPrimitive()` exempts Primitive-type armour). Verified:
  20 dmg vs body AP 4 → 13 taken normal, **9 taken primitive** (AP doubled to 8). (From
  QA-136; QA-137 multi-die Primitive/Proven overwrite remains a separate P1.)
- **Symptom:** all 29 Primitive-quality weapons deal NO dice damage — only their flat
  bonus / Strength Bonus survives (a Flintlock Pistol `1d10+2` does a flat 2).
- **Cause:** `damage-data.mjs:155-162` implements Primitive as a DH2 per-die value cap;
  the cap level comes from the pack attack-special which is `hasLevel:false, level:0`, so
  `result > 0` is true for every die → `modifiers['primitive'] = 0 − dieValue`, negating
  the whole die (no min-clamp in `_totalDamage`). Config/pack also disagree on `hasLevel`
  (config `true` vs pack `false`).
- **Canon:** RT Core p.142 — Primitive is a **defender-side** rule: the target's Armour
  Points are **doubled** against Primitive weapons (unless the armour is also Primitive).
  It does NOT cap or reduce the weapon's dice. The "Primitive (X) caps dice" mechanic is
  DH2 / Black Crusade.
- **Fix:** delete the die-cap block in `damage-data.mjs`; implement RT Primitive in
  `assign-damage-data.mjs` (double the struck location's AP before penetration when the
  attacking weapon is Primitive and that armour piece isn't — the defender-side companion
  to QA-025). Reconcile `hasLevel` (Primitive is unleveled in RT). Related: QA-137
  (multi-die Primitive/Proven overwrite + dead Proven path, P1). ⚠ live-verify on
  rt-smoke (Flintlock rolls full `1d10+2`; armour doubled vs it).

## QA-audit P1 backlog — missing automation / correctness (promoted 2026-06-24)

42 verified P1 findings from the QA-audit loop (25 open, 17 fixed —
3 auto + QA-054/077/087/142/158 + QA-038/099/118/128 + QA-131/063 + QA-124/100/160).
QA-153 + ship cluster (042-045/147/153/154) deferred to a focused ship pass.
QA-100 auto-assign/cooldown-state + QA-160 AE-addressability are noted follow-ups. Full detail (file:line + canon) per entry in `QA_FINDINGS.md`. These are
real automation/correctness gaps to fix deliberately. P0s = BUG-011 / 012 (fixed) /
013 above. The 114 P2/P3 findings stay in `QA_FINDINGS.md`.

**rules** (18)
- QA-071 — Combat-action SIDE-EFFECTS unautomated: only the actor's own to-hit modifier is applied
- QA-078 — Encumbered penalty (−10 movement tests, −1 Agility Bonus) never applied
- 🔨 QA-080 (foundation landed 2026-06-25) — No condition/status-effect layer: Stunned/Prone/Pinned/Blinded/on-fire/Blood-Loss outcomes are produced as chat text only,…
- QA-081 — Fear / Shock subsystem unautomated: no Fear Test, Fear (N) trait never tested, Shock RollTable orphaned
- QA-082 — Pinning subsystem unautomated: Pinning Test is description-only, no Pinned state or −20 BS / Half-Action enforcement
- QA-083 — Insanity / Corruption tracks are inert: no Trauma / Malignancy / Mutation tests on threshold, item types + tables absent
- ✅ QA-087 (fixed 2026-06-25) — Hit-location digit-reversal omits zero-padding: single-digit to-hit rolls (1–9) map to the WRONG location
- QA-090 — Five of the six standard Fate-point uses are unmodeled; the one wired (re-roll) is combat/psychic-only and doesn't gate on…
- QA-094 — Degrees of Success over-counted by the DH2 `1 +` (and tens-digit method) — displayed DoS, opposed tests, and auto-fire hit…
- QA-095 — Combat recurring-damage handler (On Fire / Blood Loss) is an orphaned consumer: nothing in the engine ever creates the `Bu…
- QA-101 — Force-field protection roll is a standalone manual sheet action, never integrated into damage resolution; overloaded field…
- QA-111 — Cover is entirely unmodelled — no cover-AP damage interception, no cover degradation
- QA-113 — Dodge/Parry Reactions are not part of attack resolution — a successful Dodge/Parry never negates the incoming hit
- QA-115 — Vehicle damage is unwired: facing Armour + Structural Integrity ignored; the personal-creature path reads a non-existent `…
- ✅ QA-118 (fixed 2026-06-25) — Surprise / Unaware-target +30 to-hit bonus (and the Surprise Round) is unwired
- QA-121 — Stun action bypasses the WS-to-hit gate and uses a static (DH2) defence instead of the defender's 1d10 roll
- ✅ QA-124 (fixed 2026-06-25) — Weapon Training proficiency penalty (−20 WS/BS for untrained weapons) is never enforced
- ✅ QA-160 (fixed 2026-06-25) — "Gain an additional Reaction" effects (Defensive Stance, Hyperactive Nymune Organ) are unexpressible — only Step Aside / W…

**ship** (7)
- QA-042 — Voidship hull-damage model is homebrew (fixed 1–4 by penetration tier) instead of RT's Damage − Armour → Hull Integrity
- QA-043 — Voidship critical-damage results use a homebrew Nonpen/Pen/Crit × component × d10 matrix, not RT Table 8-12 (the canonical…
- QA-044 — Voidship critical-hit TRIGGER uses a fixed roll ≤ target/10 (≈10 DoS), not the weapon's Crit Rating; `shipWeapon` has no `…
- QA-045 — Void shields are permanently decremented and never restored per Strategic Round (or between attackers in a Round)
- QA-147 — Voidship turret resolution is invented offensive fire, not RT's defensive modifier
- QA-148 — Boarding-action resolution is a homebrew per-action d100 loop, not RT's single opposed Command Test
- QA-153 — Ship-weapon to-hit rolls Strength *independent* BS tests; RT is one test scoring `1 + DoS` hits capped at Strength

**weapons** (7)
- ✅ QA-063 (fixed 2026-06-25) — Damage-class/quality-changing ammo unwired (Tempest Bolt Shells, Acid Shells)
- ✅ QA-099 (fixed 2026-06-25) — Overheats weapons still Jam; canon says an Overheats weapon never jams (and any would-be jam becomes an overheat)
- ✅ QA-100 (fixed 2026-06-25) — Overheat result deals no self-damage to the wielder, frames the drop as forced (canon: it's a choice), and skips the coold…
- QA-104 — No Reload action: clip is never refilled by the engine; `effectiveReload` time is computed/displayed but purely cosmetic
- ✅ QA-128 (fixed 2026-06-25) — Unbraced Heavy weapon −30 BS penalty never applied (no braced state in the engine)
- ✅ QA-131 (fixed 2026-06-25) — Flame weapons require a Ballistic Skill test; the no-BS-test cone is keyed on the non-RT "Spray" quality (dead code)
- ✅ QA-158 (fixed 2026-06-25) — Thrown muscle-powered weapons get no Strength Bonus to damage (only class='melee' does)

**data-quality** (3)
- QA-057 — 27 NPCs have `wounds.max: 0` (no wound track; many are real combatants, not swarms)
- QA-058 — 3 NPCs have an all-zero characteristic block (every stat base 0 → unrollable)
- QA-059 — 289 NPC-embedded weapon items have empty `damage`; 76 weapon "items" are OCR description-blobs mis-parsed as weapons

**schema** (2)
- QA-010 ✅ fixed — `commerce` skill governed by Intelligence; RT canon says Fellowship
- QA-011 ✅ fixed — `survival` skill governed by Perception; RT canon says Intelligence

**traits** (2)
- ✅ QA-077 (fixed 2026-06-25) — Unnatural Speed trait not wired into movement (doubled Agility Bonus ignored)
- ✅ QA-142 (fixed 2026-06-25) — Daemonic TB-doubling silently fails on the canonical "Daemonic (TB X)" trait name (exact-match, not prefix) — 15 NPC entri…

**armour** (1)
- QA-021 ✅ fixed — Force-field Poor-craftsmanship overload chance is 15; canon Table 3-10 says 20

**psychic** (1)
- ✅ QA-038 (fixed 2026-06-25) — Push psychic-phenomena logic wrong: Push+doubles diverted to Perils (no such RT rule); Push must ALWAYS roll Phenomena

**acquisition** (1)
- ✅ QA-054 (fixed 2026-06-25) — Commerce skill bonus to Acquisition applied as +10/DoS instead of RT's +2/DoS

## SWEEP — talents/traits with described bonuses that aren't wired
Paranoia / Weapon Master are instances of a systemic gap: many compendium entries
describe a numeric bonus in text but carry no `effects`/`conditionalBonuses`/
`pickable` wiring, so the bonus never applies. **First-pass audit** (reproduce:
`python3` scan of `talents.yml`+`traits.yml` for `+N` in benefit/description with no
wiring) found **37 talents + 10 traits** as candidates:

- talents: Ancestral Blessing, Binary Chatter, Blood of the Stalker, Bloodtracker,
  Concealed Cavity, Crack Shot, Crippling Strike, Decadence, Dual Shot, Dual Strike,
  Electrical Succour, Electro Graft Use, Exceptional Leader, Foresight, Hard Bargain,
  Heightened Senses (Sight/Smell/Sound/Taste/Touch), Hyperactive Nymune Organ,
  Inspire Wrath, Into the Jaws of Hell, Last Man Standing, Lightning Reflexes,
  Luminen Charge, Luminen Shock, Master & Commander, Master Enginseer, Mimic,
  Paranoia, Psy Rating, Renowned Warrant, Warp Conduit, Whispers
- traits: 'Ard, Dynastic Warrant, Fieldcraft, Incorporeal, Instinctual Understanding,
  Mechanicus Implants, Mob Rule, Multiple Arms, Sturdy, Wary

**⚠ Triage required before fixing — do NOT blanket-AE the list:**
- **Already handled in code (by name) — would DOUBLE-APPLY if also AE'd:** Crushing
  Blow, Mighty Shot, Blademaster, Eye of Vengeance, Hammer Blow, Concussive, True
  Grit, Deathdealer (see `damage-data.mjs`). EXCLUDE these (the audit caught Crushing
  Blow/Mighty Shot as false positives).
- Many are **conditional** ("when …", "vs …") → `conditionalBonuses`, not always-on AEs.
- Some are **narrative / situational / per-DoS / PF** (Bloodtracker +100 PF, Last Man
  Standing, Mimic) → text-only, no AE.
- Weapon-class / per-context bonuses (Weapon Master, Crack Shot) need the engine
  extension from BUG-003.
- The audit only catches a literal `+N`; entries phrased "doubles", "halves", "one
  additional Reaction", "ignores", etc. are NOT in this list — a deeper pass is needed.

**Recommended approach:** after the backgrounds loop finishes, run a dedicated
talent/trait effect-wiring audit+fix pass (good ralph-loop candidate) — per entry:
triage (code-handled? conditional? narrative?), then wire via AE or conditionalBonus,
with a node test asserting the bonus actually reaches the roll (and does NOT stack
with a code path). Track each as its own BUG-/WIRE- item.
