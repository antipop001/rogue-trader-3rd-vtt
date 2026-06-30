# Antigravity QA bug queue

Cross-model bug pass. **agy** (Antigravity / Gemini) appends findings and verifies fixes;
**claude** (Opus) fixes them. One finding is processed per fix-iteration (the top-most
`status: open`). This file is the shared state — it is committed so it survives and (if the
checker runs elsewhere) syncs via git.

**Status lifecycle:** `open` → `fixing` → `fixed` → `verified` | `disputed` | `wontfix`
- `open` — filed by agy, not yet fixed.
- `fixed` — claude applied a fix (gate-green); awaiting agy verification.
- `verified` — agy independently confirmed the fix is real + canon-correct. **Done.**
- `disputed` — agy rejected the fix (wrong, incomplete, or a regression); the `verify:` note
  says why. Treat as re-opened: the next fix iteration must address the dispute.
- `wontfix` — confirmed not-a-bug on inspection; the `fix:` note says why.

**Finding format** (newest appended at the BOTTOM; fixer takes the top-most `open`):

```
## BUG-Q-NNN — <one-line title>
- status: open
- found-by: agy <model> · iter <N>
- area: rules | weapons | armour | psychic | ship | vehicle | cybernetics | talents | traits | sheet-ui | data | other
- severity: P0 (wrong result in play) | P1 (missing automation) | P2 (data/cosmetic) | P3 (nice-to-have)
- evidence: <file:line(s) actually read> — <short quote/paraphrase>
- canon: <RT-DOCS ref e.g. CoreBook-1-200.pdf/markdown.md:NNNN, or "n/a — code smell">
- gap: <does X, should do Y>
- fix: <claude fills on fix: what changed (file:line) + how verified>
- verify: <agy fills on verify: confirmed / disputed + reason>
```

---

<!-- findings below this line -->

## BUG-Q-161 — True Grit reduces Critical Damage by Toughness Bonus instead of halving it
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/assign-damage-data.mjs:231` — `this.criticalDamageTaken = this.criticalDamageTaken - this.tb < 1 ? 1 : this.criticalDamageTaken - this.tb;`
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5624` — "Whenever he suffers Critical Damage, halve the result (rounding up)."
- gap: True Grit subtracts Toughness Bonus from Critical Damage, but it should halve the Critical Damage (rounding up). This is a DH2 leftover.
- fix: `src/module/rolls/assign-damage-data.mjs:231` now `Math.ceil(this.criticalDamageTaken / 2)` (RT Core p.96 halve, rounding up) instead of `crit - TB`. Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright: TB-4 actor with True Grit + 14 raw dmg / 0 wounds → criticalDamageTaken=5 (ceil(10/2)) vs old DH2 6 (10-TB).
- verify: confirmed: Math.ceil(criticalDamageTaken / 2) correctly halves incoming critical damage and rounds up, matching RT Core p.96, and is safely guarded by criticalDamageTaken > 0.

## BUG-Q-162 — Accurate weapon bonus damage applies to ALL weapons with Accurate (Pistols, Heavy), not just Basic Weapons
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:337-347` — `if (attackData.rollData.hasAttackSpecial('Accurate') && attackData.rollData.modifiers.aim > 0)` checks for the quality but not the `Basic` weapon class.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5903` — "When firing a single shot from a single Basic Weapon with the Accurate quality benefiting from the Aim action, the attack gains an extra d10 of damage for every two degrees of success to a maximum of two extra d10."
- gap: The engine grants bonus damage to Pistols (e.g., Needle Pistol, Belasco Dueling Pistol) and Heavy weapons (e.g., Thermal Lance, Long-barrelled Lascannon) that have the Accurate quality, but the rules explicitly restrict the bonus damage to Basic weapons.
- fix: `src/module/rolls/damage-data.mjs:340` now gates the Accurate bonus-damage block on `actionItem.system.class === 'Basic'` (RT Core p.143 "a single Basic Weapon"). The +10-to-hit from Accurate (roll-data.mjs) is untouched — only the extra-d10 damage is Basic-only. Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (deployed module/, imported damage-data.mjs, ran Hit._calculateDamage with Aim+Accurate dos5): Basic → modifiers.accurate=13 (2d10), Pistol → none, Heavy → none.
- verify: confirmed: the Accurate bonus damage logic is correctly gated behind `actionItem.system.class === 'Basic'` and limited to single-shot actions (Standard Attack/Called Shot), fully matching RT Core p.143 RAW. Tests confirm Pistols/Heavy weapons no longer incorrectly receive the bonus.

## BUG-Q-163 — Overwatch and Suppressing Fire Pinning difficulty and Arc are ported from DH2 instead of RT 1e
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P1 (missing automation)
- evidence: `src/module/rolls/action-data.mjs:260-266` — implements `Suppressing Fire - Semi` (30 arc, -10 Pinning), `Suppressing Fire - Full` (-20 Pinning), and `Overwatch` (+0 Pinning).
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2108, 2185` — Overwatch: "The active character guards a specific area or target, poised to shoot at an opportune moment. ... The active character establishes a kill zone ... he can perform a Standard Attack, Semi-Auto Burst, or Full Auto Burst." Suppressing Fire: "This action requires a weapon capable of fully automatic fire... the active character establishes a kill zone (or uses one previously established, see Overwatch) ... everyone in the kill zone must take a Hard (-20) Willpower Test or become Pinned."
- gap: Overwatch incorrectly induces an Ordinary (+0) Pinning Test instead of causing NO Pinning Test. Suppressing Fire is incorrectly split into Semi and Full (with a DH2 -10 difficulty for Semi). RT RAW has only one Suppressing Fire action (requiring fully automatic fire, -20 Pinning).
- fix: NOTE — the filer's "Overwatch should cause NO Pinning Test" prescription is itself off-canon: RT Core p.241 says "targets caught in the kill zone must make a Hard (–20) Pinning Test." The real bug was the +0 difficulty + the DH2 Semi/Full split. (1) `combat-actions.mjs`: consolidated the two `Suppressing Fire - Semi/Full` actions into one `Suppressing Fire` (full-auto-required, 45° kill zone, Hard -20 Pinning, RT Core p.242); splice now removes it only when `rateOfFire.full <= 0`; Overwatch description +0→Hard -20. (2) `action-data.mjs:260-263`: Overwatch & Suppressing Fire effects both now `addEffect(..., -20)` (Hard Pinning); removed the -10/+0 branches and the split-name refs in the additional-hits block. Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed combat-actions.mjs, drove updateAvailableCombatActions): full-auto weapon → single 'Suppressing Fire' (no '- Semi'/'- Full'), non-full-auto → Suppressing Fire absent, Overwatch present.
- verify: disputed: incomplete fix. The action was correctly unified and its Pinning effect updated, but the fix missed updating `src/module/rules/ammo.mjs`. Because `ammo.mjs` only matches `Full Auto Burst` and `Semi-Auto Burst`, `Suppressing Fire` defaults to `fireRate = 1`. This leaves two critical bugs: 1) It expends only 1 ammo (instead of a full auto burst's worth, per RT Core p.242 "fires a fully automatic burst and expends the appropriate ammo"). 2) Because `fireRate` is 1, `action-data.mjs` clamps `additionalHits` to 0 (since it caps at `fireRate - 1`), making it impossible to score the extra hits granted for every two DoS. `ammo.mjs` must be updated to set `fireRate = rollData.weapon.system.rateOfFire.full` for Suppressing Fire.
- fix (dispute): `src/module/rules/ammo.mjs:270-272` now includes `'Suppressing Fire'` in the burst-action branch and resolves its `fireRate` from `rateOfFire.full` (same path as Full Auto Burst). This makes `ammoUsed = full × ammoPerShot` (RT Core p.242 "fires a fully automatic burst and expends the appropriate ammo") and lifts the `additionalHits` cap (`fireRate-1`) so the "every two DoS → extra hit" hits can be scored, bounded by full RoF per canon. Suppressing Fire was already in the per-two-DoS additional-hits branch (action-data.mjs:300-314) and the Hard (-20) Pinning effect (action-data.mjs:260-261). Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed ammo.mjs, ran calculateAmmoInformation with full=10/burst=3): Suppressing Fire → fireRate 10 / ammoUsed 10 (matches Full Auto Burst), Semi-Auto Burst → 3, Standard Attack → 1.
- verify: confirmed: setting `fireRate = rateOfFire.full` properly applies both the fully automatic ammo consumption rate (`ammoUsed = fireRate * ammoPerShot`) and accurately defines the cap (`fireRate - 1`) for additional hits scored every two DoS, matching RT Core p.242.

## BUG-Q-164 — Righteous Fury extra damage rolls drop Tearing and Proven weapon qualities
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:263-267` — the `extraRoll` in the Righteous Fury loop is constructed with `new Roll(rollFormula)` and immediately evaluated. The `Tearing` logic (lines 143-150) and `Proven` logic (lines 220-227) are never applied to this extra roll's terms, unlike the base `damageRoll` or the `helplessTarget` duplicate roll.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2298` (Righteous Fury: "add another full damage roll for the weapon") and `CoreBook-1-200.pdf/markdown.md:5971` (Tearing: "Roll one extra die for Damage"). A full damage roll for a Tearing/Proven weapon must apply its qualities to every roll.
- gap: The extra damage roll granted by Righteous Fury drops the weapon's dice-modification qualities. A Tearing weapon rolls `1d10` instead of `2d10kh1` for the extra damage; a Proven weapon ignores its minimum cap.
- fix: `src/module/rolls/damage-data.mjs:262-291` — the RF extra roll now mirrors the base/helpless rolls: Tearing's dice modification (`kh`+extra die) is applied to `extra` BEFORE evaluating, and the post-evaluate scan now accumulates Proven (`proven.level − result` per die below the level) into `this.modifiers['proven']` alongside the existing RF-threshold count. Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed damage-data.mjs, ran Hit._calculateDamage 123 trials with a Tearing+Proven(3) weapon, modifiedTarget 100 to force RF confirms): all 30 observed RF extra rolls had Tearing applied (die number=2, mods=['kh1']) — 0 without — vs the pre-fix bare 1d10; Proven contributed from the extra-roll scan in 8 trials.
- verify: confirmed: the fix correctly mirrors the base roll's dice modifications for Tearing (adding 'kh' and incrementing die count) onto the `extra` Roll before evaluation, and properly scans `extra`'s active/kept terms post-evaluation to accumulate Proven minimums into `this.modifiers['proven']`. Discarded dice are correctly ignored for both Proven and RF confirms.

## BUG-Q-165 — Mighty Shot and Crushing Blow use DH2 half-bonus scaling instead of RT flat +2
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:371-375` and `432-436` — computes `Math.ceil(bsBonus / 2)` and `Math.ceil(strBonus / 2)`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:4682, 5136` (Table 4-1) — Mighty Shot: "Deal +2 damage with ranged attacks." Crushing Blow: "Deal +2 Damage with melee weapons."
- gap: The code uses Dark Heresy 2e logic (halving the characteristic bonus) to determine the damage bonus. In Rogue Trader 1e, both talents grant a flat +2 damage bonus.
- fix: `src/module/rolls/damage-data.mjs` — Crushing Blow (~L326) and Mighty Shot (~L388) now set `modifiers['crushing blow']`/`modifiers['mighty shot'] = 2` (flat +2, RT Core Crushing Blow p. "adding +2 to damage inflicted in melee" / Mighty Shot "adds +2 to Damage with a ranged weapon"), dropping the DH2 `Math.ceil(WSB/2)` / `Math.ceil(BSB/2)` scaling and the now-unused characteristic lookups. Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed damage-data.mjs, ran Hit._calculateDamage with a stub actor at characteristic bonus 8 — where DH2 would yield 4): Mighty Shot → modifiers['mighty shot']=2, Crushing Blow → modifiers['crushing blow']=2.
- verify: confirmed: Mighty Shot and Crushing Blow correctly grant a flat +2 damage bonus, applied conditionally within isMelee and isRanged blocks matching RT Core p.149 and p.151.

## BUG-Q-166 — Razor Sharp weapon quality fails to apply due to typo "Razer Sharp"
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 2
- area: weapons
- severity: P1 (missing automation)
- evidence: `src/module/rolls/damage-data.mjs:445` — `if (attackData.rollData.dos > 2 && attackData.rollData.hasAttackSpecial('Razer Sharp'))`
- canon: `/mnt/project_data/RT/RT-DOCS/roguetrader_thekoronusbestiary (1).pdf/markdown.md:4962` (and Into the Storm p.114) — Razor Sharp: "If the wielder scores three or more Degrees of Success when rolling to hit with this weapon, double the weapon's Penetration when resolving the hit."
- gap: The code checks for the typo `Razer Sharp`, but the weapon quality catalog in `src/module/rules/attack-specials.mjs:193` correctly defines it as `Razor Sharp`. Because of this mismatch, the weapon quality is never matched on the roll and penetration is never doubled.
- fix: `src/module/rolls/damage-data.mjs:462` — corrected the typo `hasAttackSpecial('Razer Sharp')` → `hasAttackSpecial('Razor Sharp')` to match the catalog name in `attack-specials.mjs:193` (RT Core/ItS p.114 Razor Sharp: 3+ DoS doubles Penetration). Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed damage-data.mjs, ran `Hit._calculatePenetration` on a pen-5 weapon): Razor Sharp + dos 3 → `penetrationModifiers['razor sharp']=5` (doubles 5→10); Razor Sharp + dos 2 → none; no-quality + dos 3 → none. Pre-fix the typo meant the block never matched.
- verify: confirmed: fixing the typo correctly enables the block to match the attack special catalog. `dos > 2` properly handles 3+ DoS, and assigning `this.penetration` to `penetrationModifiers` correctly doubles the base penetration via the engine's sum, which is consistent with how other multipliers (like Melta) work.

## BUG-Q-167 — Twin-Linked reduces additional hits for auto-fire instead of increasing them
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 2
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:336-349` — for Twin-Linked Semi-Auto Burst, the code sets `this.damageData.additionalHits = Math.floor(this.rollData.dos / 3)`, overwriting the previously computed base hits of `Math.floor(this.rollData.dos / 2)` (line 309).
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:6007` ("# TWIN-LINKED") — "the weapon may score one additional hit if the attack roll succeeds by two or more degrees of success." (RT prints NO fire-mode DoS scaling; the +20 to-hit / double-ammo / double-reload are handled elsewhere.)
- gap: By using `=` instead of `+=` (and using worse denominators than the base fire modes), the Twin-Linked quality actively *reduces* the number of additional hits scored. For Semi-Auto, 2 DoS drops from 1 additional hit down to 0; 4 DoS drops from 2 down to 1. For Full-Auto, 2 DoS drops from 2 down to 1.
- fix: `src/module/rolls/action-data.mjs:333-340` — replaced the three per-action `=` formulas (the DH2-homebrew `floor(dos/3)`/`floor(dos/2)` and the `> 2` gate on Standard) with a single flat `this.damageData.additionalHits++`, guarded by the existing `dos > 1` (2+ DoS), for ALL actions per RT Core p.121 RAW. The finding's prescribed `+=` with `dos/3`,`dos/2` denominators is itself off-canon (RT has no fire-mode scaling); the flat +1 is the canon-correct minimal fix and stacks on top of the base fire-mode hits without overwriting them. Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed action-data.mjs, drove `ActionData.calculateSuccessOrFailure` with deterministic dos): Twin-Linked adds exactly +1 over plain in every case — Semi dos2 1→2, Semi dos4 2→3, Full dos2 2→3, Full dos4 4→5, Standard dos2 0→1, Standard dos4 0→1 — never reducing hits.
- verify: confirmed: changing to `this.damageData.additionalHits++` properly stacks the single additional hit granted by Twin-Linked on 2+ DoS on top of the base hits for all fire modes, no longer overwriting them. Order of operations is correct (evaluated after RoF caps and before Storm multiplier).

## BUG-Q-168 — Compact weapon modification reduces Penetration instead of Damage
- status: open
- found-by: agy Gemini 3.1 Pro (High) · iter 2
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rules/weapon-modifiers.mjs:27-31` — `calculateWeaponModifiersDamageBonuses` sets `hit.penetrationModifiers['compact'] = -1`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:6847` (RT Core p.134) — Compact: "halves its clip size and range as well as reducing its Damage by 1."
- gap: The Compact modification reduces the weapon's Penetration by 1 instead of its Damage by 1. The code is placed in the `DamageBonuses` function but incorrectly mutates `penetrationModifiers` rather than `modifiers`.
- fix: 
- verify:

## BUG-Q-169 — Voidship extended actions bypass standard mechanics in favour of an undocumented "Flawless / Flawed" scale, dropping the success flag
- status: open
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: ship
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:443-458` — `_calculateVoidshipHit()` creates boolean properties like `voidshipFlawless` (target/10), `voidshipFlawedSuccess` (target+10), and `voidshipFumble` instead of establishing a standard success/fail + DoS check, and comments out the standard assignment `this.rollData.success = ...`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2097` (RT Core p.215) — All Extended Actions in ship combat use standard Tests (e.g. Piloting+Manoeuvrability), determining Success or Failure and tracking Degrees of Success as normal. The rulebook does not use a "Flawless" or "Flawed Success" mechanic.
- gap: Extended actions in voidship combat (all non-weapon/turret/boarding tests) use a completely homebrew resolution scale and fail to actually set `this.rollData.success`, breaking downstream rules integration.
- fix: 
- verify:

## BUG-Q-170 — Voidship Boarding and Turret actions are incorrectly simulated as multiple d100 rolls instead of standard single RT tests
- status: open
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: ship
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:376-410` — `_calculateVoidshipHits` for "Boarding" and "Turrets" repeatedly rolls a d100 `amount` times in a `for` loop, counting successes.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2145` (RT Core p.219-220) — "Boarding Action" is a single Opposed Command Test. "Turrets" is a single Ballistic Skill Test where every Degree of Success destroys one torpedo or bomber.
- gap: Boarding and Turret actions roll 1d100 repeatedly (equal to the number of turrets or "boarding attacks") instead of using the canon single-test mechanic driven by Degrees of Success.
- fix: 
- verify:
