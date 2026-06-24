# Known bugs to fix (outside the backgrounds loop)

Tracked here rather than in `fix_plan.md`: the `ralph/backgrounds` loop is scoped to
compendium content, and its gate (`build:check` + `tests/chargen`) can't verify
engine/roll fixes. Fix these directly, or in a dedicated follow-up loop.

## BUG-001 — Degrees of Failure (and Success) inflated by 1
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
