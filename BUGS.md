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
- **Status: NEEDS DECISION** (RAW vs keep current). Audited 2026-06-23 at user request.
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
