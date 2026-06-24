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
  1. The Paranoia entry in `src/packs/talents/talents.yml` is bare (name + type only)
     — no `effects`/`conditionalBonuses`, so it does nothing.
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
