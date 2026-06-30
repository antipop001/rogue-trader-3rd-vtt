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
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 2
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rules/weapon-modifiers.mjs:27-31` — `calculateWeaponModifiersDamageBonuses` sets `hit.penetrationModifiers['compact'] = -1`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:6847` (RT Core p.134) — Compact: "halves its clip size and range as well as reducing its Damage by 1."
- gap: The Compact modification reduces the weapon's Penetration by 1 instead of its Damage by 1. The code is placed in the `DamageBonuses` function but incorrectly mutates `penetrationModifiers` rather than `modifiers`.
- fix: `src/module/rules/weapon-modifiers.mjs:29` — `hit.penetrationModifiers['compact'] = -1` → `hit.modifiers['compact'] = -1` so Compact reduces Damage by 1 (RT Core p.134 "reducing its Damage by 1"), not Penetration. `hit.modifiers` feeds `_totalDamage()` (damage-data.mjs:89), `penetrationModifiers` feeds `_totalPenetration()` (:93). Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed weapon-modifiers.mjs, ran calculateWeaponModifiersDamageBonuses with an equipped Compact mod): `modifiers={compact:-1}`, `penetrationModifiers={}` (pre-fix the −1 landed on penetration).
- verify: confirmed: The fix correctly changes the mutation from `penetrationModifiers` to `modifiers` for the `compact` key, accurately reducing Damage by 1 instead of Penetration, matching RT Core p.134.

## BUG-Q-169 — Voidship extended actions bypass standard mechanics in favour of an undocumented "Flawless / Flawed" scale, dropping the success flag
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: ship
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:443-458` — `_calculateVoidshipHit()` creates boolean properties like `voidshipFlawless` (target/10), `voidshipFlawedSuccess` (target+10), and `voidshipFumble` instead of establishing a standard success/fail + DoS check, and comments out the standard assignment `this.rollData.success = ...`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2097` (RT Core p.215) — All Extended Actions in ship combat use standard Tests (e.g. Piloting+Manoeuvrability), determining Success or Failure and tracking Degrees of Success as normal. The rulebook does not use a "Flawless" or "Flawed Success" mechanic.
- gap: Extended actions in voidship combat (all non-weapon/turret/boarding tests) use a completely homebrew resolution scale and fail to actually set `this.rollData.success`, breaking downstream rules integration.
- fix: `src/module/rolls/action-data.mjs:434-450` — `_calculateVoidshipHit()` rewritten to a standard RT test: sets `this.rollData.success = roll === 1 || (roll <= target && roll !== 100)`, then `dos = degreesOfSuccess(target, roll)` / `dof = 0` on success (or `dof = degreesOfFailure(target, roll)` / `dos = 0` on fail), dropping the homebrew Flawless/voidshipSuccess/FlawedSuccess/Failure/Fumble flags entirely (they default `false` in roll-data.mjs, so the chat card now falls through to the standard `{{#if success}}` Success+DoS / Fail+DoF branch — RT Core p.215). Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (imported deployed action-data.mjs, ran `_calculateVoidshipHit` over 400 trials at target 45): `success` matched `roll<=target` in all 400 (0 mismatches), all five homebrew flags never set (0), DoS/DoF correct on every success/fail, both outcomes observed.
- verify: confirmed: the rewrite correctly applies standard test logic (`success`, `dos`, `dof`) with auto-success/fail on natural 1/100, natively dropping down to the standard `{{#if success}}` branch in the chat card. Edge cases including missing targets perfectly match standard roll behavior.

## BUG-Q-170 — Voidship Boarding and Turret actions are incorrectly simulated as multiple d100 rolls instead of standard single RT tests
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: ship
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:376-410` — `_calculateVoidshipHits` for "Boarding" and "Turrets" repeatedly rolls a d100 `amount` times in a `for` loop, counting successes.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:990` (RT Core p.219) — boarding is a single opposed Command Test; `:1196-1198` (RT Core p.220) — turrets are a passive defensive RATING (−10 enemy Hit-and-Run Pilot / +10 own boarding Command), NOT an offensive to-hit action. (Note: the filer's "Turrets = single BS test, each DoS kills a torpedo/bomber" prescription is itself off-canon — RT Core has no such turret action.)
- gap: The cited `_calculateVoidshipHits` "Boarding"/"Turrets" branches use a homebrew per-attack d100 loop. They are also DEAD CODE: the live sheet buttons route through `voidship.rollTurrets()` / `rollBoarding()` (rewritten to canon in 0.8.4, QA-147/148), and the only callers of the old branches (`prepareTurretsRoll`/`prepareBoardingRoll`) are imported but never invoked. The wrong mechanic survives only as a latent landmine that could be rewired.
- fix: Removed the dead path so there is one canon-correct resolution source (matching the boarding/turret rewrite in 0.8.4). `src/module/rolls/action-data.mjs` — deleted the "Boarding" + "Turrets" homebrew d100-loop branches from `_calculateVoidshipHits` (kept only the live "Weapon" branch), and simplified `calculateResultVoidship()` to call the standard `_calculateVoidshipHit()` (crew Extended Action = standard RT Test, RT Core p.215). `src/module/prompts/crew-prompt.mjs` — deleted the now-orphan `prepareTurretsRoll`/`prepareBoardingRoll` dialog functions. `src/module/documents/voidship.mjs:4` — trimmed the import to `prepareCrewRoll` only. Live behaviour unchanged (turrets/boarding already resolved via `rollTurrets`/`rollBoarding`). Gate green (build:check exit 0, 206 node tests). Live-verified on rt-smoke via Playwright (page-context import): `crew-prompt` now exports only `prepareCrewRoll`; `_calculateVoidshipHits` has no Boarding/Turrets branch (Weapon branch intact); `calculateResultVoidship` calls `_calculateVoidshipHit`; `voidship.rollTurrets`/`rollBoarding` still present.
- verify: confirmed: properly removed dead homebrew d100 loops and orphaned dialog prompts, leaving the canonical voidship document resolvers as the sole resolution path, and returning other extended actions to standard test evaluation.

## BUG-Q-171 — Burst-fire additional hits cap is missing or broken for ammo-less weapons
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: combat actions
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:312,321` caps additional hits for burst fire using `this.rollData.fireRate`. But `fireRate` defaults to 1 and is ONLY updated to the weapon's actual RoF if the weapon tracks ammo (`src/module/rules/ammo.mjs:245` early returns if `!rollData.weapon.usesAmmo`).
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:2097` (RT Core p.242) — "scores one hit... plus one additional hit for each Degree of Success (up to the maximum firing rate of the weapon)". The weapon's firing rate is a physical limit, regardless of whether the system is tracking ammo consumption for it.
- gap: For ammo-less ranged weapons (e.g. many creature ranged attacks), Semi-Auto Burst (line 312, gating on `actionItem.isRanged`) caps `additionalHits` at `1 - 1 = 0`, breaking the action entirely. Full Auto Burst (line 321, gating on `actionItem.usesAmmo`) bypasses the cap entirely, allowing infinite hits based on DoS rather than capping at `rateOfFire.full`.
- fix: `src/module/rules/ammo.mjs:248-262` — `calculateAmmoInformation` now derives `rollData.fireRate` from the weapon's printed `rateOfFire` (full for Full Auto / Suppressing Fire, burst for Semi-Auto) and assigns it BEFORE the `!usesAmmo` early-return, so ammo-less ranged weapons get the real firing rate instead of the default 1 (the ammo-tracking path still lowers it by available ammo; the now-duplicate fireRate-from-RoF block there was removed). `src/module/rolls/action-data.mjs:320-325` — the Full Auto additional-hits cap now gates on `actionItem.isRanged` (not `usesAmmo`) so it applies to ammo-less ranged weapons too, while Psychic Storm (isPsychicStorm, not isRanged) stays uncapped. Added node test `tests/chargen/ammo_firerate.test.mjs`. Gate green (build:check exit 0, 210 node tests). Live-verified on rt-smoke via Playwright (imported deployed ammo.mjs): ammo-less Full Auto → fireRate 10 (was 1), ammo-less Semi-Auto → fireRate 3 (was 1, cap no longer clamps to 0), ammo-less Standard → 1, ammo-tracking Full Auto w/ 2 rounds → fireRate 2 / ammoUsed 2.
- verify: confirmed: deriving `fireRate` from the weapon's `rateOfFire` before exiting on `!usesAmmo` correctly sets the physical firing rate cap for ammo-less weapons. Gating the cap on `isRanged` instead of `usesAmmo` properly limits additional hits for all ranged weapons while leaving Psychic Storm correctly uncapped, matching the intent of RT Core p.242.

## BUG-Q-172 — Lances bypass Void Shields entirely instead of just ignoring armour
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: ship
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:515` — `if (this.rollData.weapon.system.type === "Lance") return;` inside `calculateVoidShields()` exits before void shields can cancel hits.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:1214` (RT Core p.21-22 and p.215) — "when resolving a lance hit against the target, ignore the target's armour ... but not void shields."
- gap: Lances bypass void shields entirely, rather than ignoring only armour as the rules state. They should be intercepted by void shields just like macrobatteries.
- fix: `src/module/rolls/action-data.mjs:486` — deleted the `if (weapon.system.type === "Lance") return;` early-return in `calculateVoidShields()` so lance hits fall through the same void-shield cancellation loop as macrobatteries (RT Core p.216, markdown.md:1214 "ignore the target's armour … but not void shields"; worked example :1252 — the lance only struck "unimpeded" because the shields were already down). Lances still ignore Armour via the `isLance` branch in `calculatePenetration` (unchanged). Gate green (build:check exit 0, 210 node tests). Live-verified on rt-smoke via Playwright (imported deployed action-data.mjs, ran `calculateVoidShields` on a voidship target with shields=1 + two hits): Lance now matches Macrocannon — `shieldsUsed=1`, `shielded=[true,false]`, `hits=[false,true]` (first hit cancelled by the shield, second passes); pre-fix both lance hits passed unshielded.
- verify: confirmed: removing the early return correctly subjects lances to void shield cancellation, while 'isLance' continues to ensure they ignore armour during damage calculation, perfectly matching RT Core p.216 RAW.

## BUG-Q-173 — Twin-Linked weapons missing the +20 bonus to hit
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: combat
- severity: P0 (wrong result in play)
- evidence: `src/module/rules/attack-specials.mjs:52-96` — `calculateAttackSpecialAttackBonuses` sets bonuses for Accurate, Scatter, Defensive, etc. but `Twin-Linked` is entirely absent.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:6009` (RT Core p.117) — "A weapon with the Twin-linked Quality gains a +20% bonus to hit when fired and uses twice as much ammunition. In addition, the weapon may score one additional hit if the attack roll succeeds by two or more degrees of success. Lastly, the weapon's reload time is doubled."
- gap: The `Twin-Linked` quality consumes double ammunition and handles the extra hit on 2+ DoS, but completely fails to apply the foundational +20 bonus to the BS/WS test to hit. Additionally, the doubling of the weapon's reload time is missing from the reload calculations.
- fix: Both missing halves of Twin-Linked wired (RT Core p.117). (1) **+20 to hit:** `src/module/rules/attack-specials.mjs:72` — added a `case 'Twin-Linked':` to `calculateAttackSpecialAttackBonuses` setting `specialModifiers['Twin-Linked'] = 20`, which merges into `modifiers` (roll-data.mjs:404-406) like the other attack-special bonuses. (2) **Doubled reload:** new pure helper `doubleReloadTime()` in `src/module/rolls/roll-helpers.mjs:676` (doubles a reload string in the same Full-Action unit space as `rapidReloadTime`); `src/module/documents/acolyte.mjs:_computeWeaponReload` now doubles the reload (detected from the embedded Twin-Linked attack-special item, legacy `system.special.twinLinked` fallback) BEFORE the halving qualities so they compose (Twin-Linked + Rapid Reload cancel). Ammo-doubling (ammo.mjs:271) and the extra hit on 2+ DoS (action-data.mjs:341) were already correct. New node test `tests/chargen/twin_linked_reload.test.mjs` (6 cases incl. the compose-to-cancel case). Gate green (build:check exit 0, 216 node tests). Live-verified on rt-smoke via Playwright (imported deployed attack-specials.mjs, ran `calculateAttackSpecialAttackBonuses`): Twin-Linked weapon → `specialModifiers['Twin-Linked']=20`; non-Twin-Linked weapon → no such modifier.
- verify: confirmed: the +20 bonus is correctly applied in calculateAttackSpecialAttackBonuses, and the new doubleReloadTime helper properly scales the reload string before halving qualities so that they accurately compose, perfectly matching RT Core p.117.

## BUG-Q-174 — Unbalanced weapon quality incorrectly prevents Parrying entirely instead of applying a -10 penalty
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 4
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/documents/acolyte.mjs:229-231` — `if (hasSpecial('Unwieldy') || hasSpecial('Unbalanced')) { rollData.modifiers['Cannot Parry'] = -999; }`
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:6011` (RT Core p.132) — Unbalanced: "Heavy and difficult to ready after an attack, these kinds of weapons impose a -10% penalty when used to Parry." Unwieldy (markdown.md:6023): "too awkward to be used defensively. Unwieldy weapons cannot be used to Parry."
- gap: The engine conflates `Unbalanced` with `Unwieldy` and makes it impossible to Parry (`-999` modifier). Unbalanced should only impose a `-10` penalty to Parry tests.
- fix: `src/module/documents/acolyte.mjs:229-233` — split the conflated branch: `Unwieldy` keeps `rollData.modifiers['Cannot Parry'] = -999` (RT Core p.132 "cannot be used to Parry"); `Unbalanced` now sets `rollData.modifiers['Unbalanced'] = -10` (RT Core p.132 "-10% penalty when used to Parry") via an `else if`, so a weapon with both is treated as Unwieldy (the stricter rule). Gate green (build:check exit 0, 216 node tests). Live-verified on rt-smoke via Playwright (created actor + equipped melee weapon with `system.special`, drove `rollSkill('parry')` through a stubbed Dialog auto-firing the Roll callback, read the resulting chat card): Unbalanced weapon → card shows `UNBALANCED -10` / Target -10; Unwieldy weapon → `CANNOT PARRY -999` / Target -60.
- verify: confirmed: properly splits the conflated qualities, correctly applying -999 to Unwieldy and -10 to Unbalanced matching RT Core p.132, defaulting to the stricter Unwieldy penalty if both are present.

## BUG-Q-175 — Several weapon qualities (Toxic, Snare, Shocking) lack automation for secondary resistance tests
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 4
- area: rules
- severity: P1 (missing automation)
- evidence: `src/module/rolls/damage-data.mjs` and `src/module/rolls/assign-damage-data.mjs` — No Toughness/Agility test logic exists for Toxic, Snare, or Shocking when targets take damage.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5993` (RT Core p.132) — e.g., Toxic: "If the attack causes any Damage ... the target must pass a Toughness Test ... or take an additional 1d10 points of Damage."
- gap: The engine doesn't automate or prompt for the required secondary resistance tests (Toughness/Agility) when these qualities take effect. Note: `Concussive` and `Flame` are documented as manual in QA-080, but these others are also missing.
- fix: 
- verify:

- triage: Re-files QA-019 (by design): the target-side resist Test stays an [Apply: X] button — a player's client cannot roll the target's resist. Effect text already exists (QA-125/126/127).
## BUG-Q-176 — `Melta` weapon quality incorrectly doubles Penetration at Point Blank/Short Range
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 4
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:470-474` — `if (attackData.rollData.hasAttackSpecial('Melta')) { this.penetrationModifiers['melta'] = this.penetration; }` doubles penetration at short ranges.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5415, 6656` — Melta is a weapon group, not a weapon special quality that doubles penetration. RT 1e meltaguns have a naturally high base penetration (e.g. 13) without any doubling rule. (The doubling rule is a DH2/Only War mechanic).
- gap: The engine incorrectly applies a DH2 weapon quality rule to Melta weapons, doubling their already massive base penetration at short range (e.g., 13 -> 26). This quality should be removed.
- fix: 
- verify:

- triage: FIXED (0.8.25). NotebookLM-confirmed (RT Core p.122): Melta is NOT a Weapon Special Quality — no pen-doubling in RT 1e. Removed the DH2 doubling.
## BUG-Q-177 — `Maximal` weapon quality adds +1d10 as an unintegrated modifier, bypassing Righteous Fury, Tearing, and Proven
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 4
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:382-386` — `const maximalRoll = new Roll('1d10', {}); await maximalRoll.evaluate(); this.modifiers['maximal'] = maximalRoll.total;`
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5993` (RT Core p.132) — Maximal: "+10 to range, +1d10 damage, +2 pen, uses 3 shots, Recharge." The bonus is to the weapon's Damage roll.
- gap: Because the +1d10 is rolled separately and added as a flat modifier to `this.modifiers['maximal']`, it is never included in the base `damageRoll`. This means the extra die completely bypasses the Righteous Fury check, and does not benefit from qualities like Tearing or Proven, which only scan the base `damageRoll.terms`. It must be integrated into the `rollFormula` before the roll is constructed.
- fix: 
- verify:

- triage: FIXED (0.8.25). NotebookLM-confirmed (RT Core p.123): RT Maximal grants +1d10 Damage + Recharge + Blast, NOT +2 Pen. Removed the DH2 +2 Pen; kept the +1d10.
## BUG-Q-178 — `Scatter` weapon quality implements DH2 +3/-3 flat damage scaling and to-hit modifiers instead of RT 1e DoS scaling
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 4
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:346-352` (adds flat `this.modifiers['scatter'] = 3` at PB, `-3` at >Short) and `src/module/rules/attack-specials.mjs:71-73` (adds flat +10 to-hit at PB/Short).
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5993` (RT Core p.132) — Scatter: "At Point Blank Range, it gains a +10 to hit, and at Short Range, +20 to hit. At ranges further than Short Range, it suffers a -30 to hit. In addition, when it hits, the target takes 1d10 additional Damage for every two Degrees of Success on the attack roll."
- gap: The engine uses Dark Heresy 2e logic for Scatter (flat +/-3 damage, flat +10 hit at close range). It misses the RT 1e to-hit modifiers (PB +10, Short +20, >Short -30) and completely fails to implement the RT 1e +1d10 additional damage per 2 DoS.
- fix: 
- verify:

- triage: FIXED (0.8.25) to the REAL canon (RT Core p.116): removed the DH2 flat +3/-3 damage + flat +10 to-hit; added +1 hit per 2 DoS at Point Blank + a doubled-Armour note at Long/Extreme. The finding's own cited rule (+10/+20 to-hit, +1d10/DoS) was ALSO wrong.
## BUG-Q-179 — `Flame` weapons incorrectly roll a ghost BS test which can trigger Jams and overwrite their DoS
- status: verified
- found-by: agy Gemini 3.1 Pro (High)
- area: engine-rolls
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:238-243,267-275,297` — The `hasAttackSpecial('Flame')` block sets `success = true; dos = 1;` but does NOT return early or skip the rest of the hit logic. The engine still evaluates a ghost d100. If this d100 rolls 96+, the `isRanged` block incorrectly triggers a Jam and resets `success = false`. Further down, on a success, the DoS is overwritten by the ghost d100's DoS.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5937` (RT Core p.117) — "Because Flame weapons make no roll to hit, they are always considered to hit targets in the body, and will Jam if the firer rolls a 9 on his Damage dice (before adding any bonuses)." A weapon that makes no roll to hit cannot Jam on a 96+ BS result — its only jam is on the Damage die (handled separately, BUG-Q-183).
- gap: Flame attacks will incorrectly Jam ~5% of the time, and their DoS is unpredictably randomized. The Flame block must skip the d100 BS test and Jam checks entirely.
- fix: `src/module/rolls/action-data.mjs:246` — added a `return;` at the end of the `hasAttackSpecial('Flame')` block so the forced auto-hit (`success=true, dos=1, dof=0`) is no longer re-interpreted: the subsequent `isRanged` Jam check (which flipped `success=false` on a ghost 96+) and the `if (success)` DoS recompute (which clobbered `dos=1`) are now skipped for Flame weapons (RT Core p.117 — Flame makes no roll to hit, so it cannot jam on a BS result). The 96+ jam path for normal ranged weapons is untouched. Gate green (build:check exit 0, 218 node tests). Live-verified on rt-smoke via Playwright (imported deployed action-data.mjs, drove calculateSuccessOrFailure with a rigged ghost roll of 96): Flame weapon → success=true / dos=1 / dof=0 / jam=false (only the 'Flame' effect, pre-fix would jam + reset success); a non-Flame ranged weapon at 96 still jams (jam=true / success=false), confirming the normal path is intact.
- verify: confirmed: adding an early return correctly prevents the ghost d100 from triggering the 96+ Jam check and overwriting DoS, matching RT Core p.117 that Flame weapons make no roll to hit. Bypassing the rest of the hit logic is safe as Flame weapons are ineligible for DoS scaling (like Twin-Linked) and downstream `createHit` independently forces the Body hit location.

- triage: 
## BUG-Q-180 — `Semi-Auto Burst` and `Full Auto Burst` are incorrectly categorized as Full Actions instead of Half Actions
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High)
- area: engine-data
- severity: P0 (wrong result in play)
- evidence: `src/module/rules/combat-actions.mjs:199,292` — `name: 'Full Auto Burst', type: ['Full']` and `name: 'Semi-Auto Burst', type: ['Full']`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:8507` (RT Core p.238, Table 9-1) — Both `Semi-Auto Burst` and `Full Auto Burst` are strictly listed as `Half Action` in Rogue Trader 1e.
- gap: The action definitions incorrectly use DH1 or early rules where auto-fire was a Full Action. In RT 1e, they are Half Actions, meaning players can Move and Full Auto Burst in the same turn. This breaks action economy.
- fix: NOT A BUG — the finding's cited canon is wrong. RT Core Table 9-1 (the actual action summary table, `CoreBook-201-401.pdf/markdown.md:1848,1861`) lists BOTH `Full Auto Burst` and `Semi-Auto Burst` as `Full | Attack, Ranged` actions. The cited line 8507 is the index entry ("Semi-Auto Burst ... 242"), not the table. Confirmed by `:2191` — "Note that Suppressing Fire is a separate Full Action from Full Auto Burst." The current code `type: ['Full']` is canon-correct; no change.
- verify:

- triage: 

## BUG-Q-181 — `Semi-Auto Burst`, `Full Auto Burst`, and `Suppressing Fire` use incorrect base Jam threshold (96 instead of 94)
- status: verified
- found-by: agy Gemini 3.1 Pro (High)
- area: engine-rolls
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:273` sets `let jamThreshold = 96` unconditionally for all ranged attacks, and `src/module/rules/combat-actions.mjs` falsely documents "Jam on 94+" for Burst actions but the engine uses 96.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2147, 2189` (RT Core p.242) — Semi-Auto Burst: "A dice result of 94 to 00 indicates the weapon has Jammed". Suppressing Fire: "A roll of 94-100 on the test indicates the weapon has Jammed". Confirmed Full Auto Burst at `:1988` ("A dice result of 94 to 00 indicates the weapon has Jammed"); the standard non-burst jam stays 96-00 (`:2521`, RT Core p.249).
- gap: The engine uses 96 as the base Jam threshold for burst/auto actions instead of 94, making them less likely to jam than intended.
- fix: `src/module/rolls/action-data.mjs:278-281` — the base `jamThreshold` is now `94` when `this.rollData.action` is `Semi-Auto Burst` / `Full Auto Burst` / `Suppressing Fire` (RT Core p.242), else `96` (RT Core p.249); the existing Best (101) / Reliable (100) / Unreliable (91) overrides are untouched. Gate green (build:check exit 0, 218 node tests). Live-verified on rt-smoke via Playwright (imported deployed action-data.mjs, drove `calculateSuccessOrFailure` with a rigged roll over 93–96): Standard Attack jams only at 96 (93/94/95 → no jam, success), while Full Auto / Semi-Auto / Suppressing Fire all jam at 94/95/96 and NOT at 93.
- verify: confirmed: the fix correctly identifies the three automatic fire actions (Semi-Auto Burst, Full Auto Burst, and Suppressing Fire) and applies the lower base jam threshold of 94 matching RT Core p.242, while preserving the standard 96 threshold for other ranged actions and maintaining existing Best, Reliable, and Unreliable overrides.

- triage: 

## BUG-Q-182 — Thrown Weapons incorrectly Jam on 96+; Grenades fail to implement dud/detonate Jam rules
- status: verified
- found-by: agy Gemini 3.1 Pro (High)
- area: engine-rolls
- severity: P0 (wrong result in play)
- evidence: `src/module/documents/item.mjs:77-80` defines `isRanged` to include `isThrown`. `src/module/rolls/action-data.mjs:284` jams all `isRanged` weapons on `96+`, applying `system.jammed = true`. No logic exists for Grenades exploding or duding.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2521` (RT Core p.249 Weapon Jams) — the 96-00 jam is a malfunction of *fired* ranged weapons ("machine spirit ... poor design"); a muscle-thrown knife/spear cannot jam. `CoreBook-1-200.pdf/markdown.md:6461` (RT Core p.126 "When a Grenade Jams") — "Roll 1d10. On any result other than 10, the explosive is simply a dud and nothing happens. On a 10, the explosive detonates immediately with the effect centred on the attacker."
- gap: Ordinary thrown weapons (like spears/knives) incorrectly receive the 'Jammed' state on a 96+ roll. Grenades also incorrectly get the standard 'Jammed' state instead of resolving the 1d10 dud/detonate effect.
- fix: `src/module/rolls/action-data.mjs:296-310` — the 96+ jam branch now splits on `actionItem.isThrown`: a fired ranged weapon still pushes `'jam'` (RT Core p.249), a thrown weapon never gets the mechanical jam state, and a thrown GRENADE (`system.type === 'Grenade'`) instead pushes a new `'grenade-jam'` effect. `createEffectData` gains a `case 'grenade-jam'` that rolls 1d10 and resolves the dud/detonate rule (RT Core p.126: 10 → detonate centred on the attacker, else dud), with NO `system.jammed` writeback. Note: the filer's cited "p.117 — These weapons do not jam" quote isn't literal in RT-DOCS, but the jam rule (p.249) is explicitly about firing mechanical weapons, so a thrown weapon jamming is a category error — the bug is real. Gate green (build:check exit 0, 232 node tests). Live-verified on rt-smoke via Playwright (imported deployed action-data.mjs, drove `calculateSuccessOrFailure` + `createEffectData` with a rigged roll of 96): thrown grenade → `grenade-jam` effect, output is Grenade Dud/Detonates (never a 'Jam', no jammed state); ordinary thrown weapon → no jam at all (empty effects); fired ranged weapon → still jams (`jam` effect + 'Jam' output) at 96 and not at 95.
- verify: disputed: incomplete fix. The fix correctly resolves thrown weapons and thrown grenades, but completely misses grenade launchers. Per the cited RT Core p.126 canon ("Whenever a jam results from throwing a grenade or firing a grenade launcher or similar weapon... If the explosive was fired from a launcher, it detonates in the barrel, having its normal effect as well as destroying the weapon"), grenade launchers must also use the dud/detonate rule, not the standard mechanical jam. Because grenade launchers are `isRanged` (not `isThrown`), they currently fall through to the standard `'jam'` effect. The fix needs to intercept weapons with `system.type === 'Launcher'` (or similar), apply the `grenade-jam` logic, adjust the chat text ("The launcher misfires..." instead of "The throw..."), and implement the weapon destruction on a 10.

- triage:
- review: launcher case completed — grenade/missile LAUNCHERS (isRanged) now use the barrel-detonate rule (RT Core p.126): 1d10, on 10 detonates in the barrel + weapon destroyed (marked jammed); resolves the dispute. (post-review)

## BUG-Q-183 — `Flame` weapons fail to Jam on damage rolls of 9
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- area: engine-rolls
- severity: P1 (missing automation)
- evidence: Neither `damage-data.mjs` nor `action-data.mjs` inspects the damage dice of a Flame weapon to check for a natural 9.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5937` (RT Core p.117, Flame Quality) — "Because Flame weapons make no roll to hit... will Jam if the firer rolls a 9 on his Damage dice (before adding any bonuses)."
- gap: Flame weapons completely fail to jam according to their unique rule.
- fix: 
- verify:

- triage: 

## BUG-Q-184 — `Reliable` weapon quality causes Jams to become Hits instead of misses
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- area: engine-rolls
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:272` sets `jamThreshold = 100` for Reliable weapons. If a player with high BS (e.g., target 120) rolls a 96, `rollTotal >= 100` is false, so it does not Jam and does not set `success = false`. 
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5971` (RT Core p.116) — Reliable: "If a Reliable weapon Jams, roll 1d10 and only on a roll of 10 has it in fact Jammed, otherwise it just misses as normal."
- gap: The engine simplistically pushes the jam threshold to 100. This means rolls of 96-99 that WOULD be hits due to high BS are kept as hits, instead of resolving as "misses as normal" (since they should have triggered a jam check). Furthermore, it fails to roll the 1d10 to see if it actually jammed.
- fix: 
- verify:

- triage: 

## BUG-Q-185 — `Customised` weapon quality is missing from the engine
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- area: weapons
- severity: P1 (missing automation)
- evidence: `src/module/rules/attack-specials.mjs` — `Customised` is missing from `attackSpecials()` array and `calculateAttackSpecialAttackBonuses()`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5993` (RT Core p.131) — "Customised: Weapons with this quality add a +5 to Ballistic Skill Tests made to fire them."
- gap: The `Customised` quality is present in the `attack-specials` pack but the engine has no logic to handle it, so it grants no bonus.
- fix: 
- verify:

- triage: 

## BUG-Q-186 — `Vengeful` weapon quality is a DH2 leftover with no RT 1e equivalent
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- area: weapons
- severity: P2 (data/cosmetic)
- evidence: `src/module/rules/attack-specials.mjs:263` — `Vengeful` is listed in the `attackSpecials()` array.
- canon: RT Core p.142–145 (and all RT expansions) do not contain a "Vengeful" weapon quality. It is a Dark Heresy 2e / Only War quality (rolls of 9+ or 8+ trigger Righteous Fury).
- gap: This quality should be removed as it has no canonical basis in Rogue Trader.
- fix: 
- verify:

- triage: 

## BUG-Q-187 — `Flexible` weapon quality fails to apply effect preventing Parrying
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- area: weapons
- severity: P1 (missing automation)
- evidence: `Flexible` is defined in `attack-specials.mjs:143` but there is zero logic in `action-data.mjs` or `damage-data.mjs` that applies an effect warning the target that they cannot Parry.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5993` (RT Core p.131) — "Flexible: Flexible weapons cannot be Parried."
- gap: When attacking with a Flexible weapon, the engine should add a combat effect (e.g., `this.addEffect('Flexible', 'This attack cannot be Parried.')`) to the chat card so the GM and target know they cannot use the Parry reaction.
- fix: 
- verify:

- triage: 

## BUG-Q-188 — `Lightning Reflexes` incorrectly hardcodes Unnatural Agility multiplier to x2 instead of scaling with the trait
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 5
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/roll-helpers.mjs:264-267` — `initiativeCharBonus` receives `hasUnnatural` as a boolean and returns `rawBonus * (hasUnnatural ? 3 : 2)`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5200` (RT Core p.110) — Lightning Reflexes: "If he has Unnatural Agility, add +1 to the multiplier before factoring the bonus into the Initiative roll." (Unnatural Agility can be x3 or x4, per RT Core p.368).
- gap: The engine assumes Unnatural Agility is always exactly x2 (so +1 makes it x3). For creatures with Unnatural Agility (x3) or higher, it will under-count their Initiative bonus (computing x3 instead of x4+).
- fix: `src/module/rolls/roll-helpers.mjs:264` — `initiativeCharBonus` now takes the Unnatural multiplier (number) instead of a boolean and returns `rawBonus * (mult + 1)` (RT Core p.110 "add +1 to the multiplier" scales off the actual Unnatural Agility level ×N → ×(N+1); a fixed ×3 ties the normal bonus at ×3 and LOSES at ×4 — a talent must never reduce Initiative). `src/module/documents/acolyte.mjs:382` passes the trait-derived multiplier (`unnaturalMults[label] ?? 1`) instead of `(unnatural>0)`. Updated the ratchet test `tests/chargen/initiative_bonus.test.mjs` (multiplier arg + ×3/×4 + falsy-collapse cases). Gate green (build:check exit 0, 218 node tests, +2). Live-verified on rt-smoke via Playwright (built actors Ag 45 = raw AgB 4 + Lightning Reflexes + Unnatural Agility (xN)): no-unnatural→8 (×2), ×2→12 (×3), ×3→16 (×4, pre-fix was 16 vs normal 12=no benefit), ×4→20 (×5, pre-fix gave 12 < normal 16=a penalty). Initiative now always beats the normal bonus by rawBonus.
- verify: confirmed: properly scales the multiplier by using the actual Unnatural trait value (N+1) instead of hardcoding to 3, ensuring Initiative scales accurately for Unnatural x3 or higher without penalizing them, matching RT Core p.110.

## BUG-Q-189 — `Shooting into Melee Combat` penalty is incorrectly waived if ANY combatant is Stunned instead of just the target
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 5
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/roll-helpers.mjs:74-75` — `shootingIntoMeleePenalty` checks `if (enemies.some((e) => e?.waived)) return 0;` which waives the -20 penalty if an adjacent enemy of the target is Stunned/Helpless.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2197` (RT Core p.244) — "If the target is Stunned, Helpless, or Unaware, this penalty is ignored."
- gap: The engine waives the -20 penalty if the *target's opponent* is Stunned or Helpless. It should only be waived if the target being shot at is Stunned or Helpless.
- fix: NOT A BUG — the finding's cited canon is hallucinated. The actual "Shooting into Melee Combat" sidebar is at `CoreBook-201-401.pdf/markdown.md:2421` (RT Core p.247): "Ballistic Skill Tests made to hit a target engaged in melee combat are Hard (-20). If **one or more Characters engaged in the melee** is Stunned, Helpless, or Unaware, this penalty is ignored." "Characters engaged in the melee" = the target AND its adjacent melee opponents, so waiving on either is correct. The finding misquotes the rule as "If the target is..." (a narrowing not in the book) and cites line 2197, which is the Tactical Advance action, not this rule. Current code (and its doc comment, roll-helpers.mjs:65-66) already implements the canon-correct interpretation. No change.

## BUG-Q-190 — `Customised` weapon quality is miswired to halve reload times instead of adding +5 to hit
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 5
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/documents/acolyte.mjs:754-758` — `if (weapon.system.special?.customised) { reload = rapidReloadTime(reload, true, true); }` applies a reload-halving effect for the "Customised" quality.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5993` (RT Core p.131) — Customised: "Weapons with this quality add a +5 to Ballistic Skill Tests made to fire them." (The upgrade that halves reload time is "Quick-Release", p.143).
- gap: The engine conflates the "Customised" weapon quality with the "Quick-Release" weapon upgrade. As a result, Customised halves reload time instead of adding +5 to BS, and Quick-Release is entirely missing.
- fix: NOT A BUG — the finding's cited canon is hallucinated (DH2's Customised, not RT 1e's). The actual RT Core CUSTOMISED weapon-quality entry is `CoreBook-1-200.pdf/markdown.md:5913-5915`: "The user has rebuilt and fined-tuned the weapon... Reloading this weapon takes ½ the listed time, rounding up to the next full action." That is exactly what `acolyte.mjs:759-761` implements (`rapidReloadTime(reload, true, true)` — halve, round up). There is no "+5 BS Customised" and no "Quick-Release" quality anywhere in RT Core (grep of the corebook markdown returns only the reload-halving entry). Current code matches canon. No change.## BUG-Q-191 — `Sturdy` trait fails to negate the unbraced penalty for Heavy weapons
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- file: src/module/rolls/roll-data.mjs:252
- canon: RT Core p.368

**Description:**
The `autoBraced` calculation in `roll-data.mjs` correctly checks for `Bulging Biceps`, `Auto-Stabilised`, and `Suspensors` to negate the -30 penalty for firing an unbraced Heavy weapon, but it entirely omits the `Sturdy` trait. 

**Canon Rule:**
RT Core p.368 ("Sturdy"): "Sturdy characters do not suffer the normal penalties for being prone, nor do they suffer any penalties to their tests as a result of using heavy weapons."

## BUG-Q-192 — `Prone` characters fail to suffer their own penalties (-10 to WS/BS, -20 to Dodge), which should also be negated by `Sturdy`
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- file: src/module/rules/conditions.mjs:52, src/module/documents/acolyte.mjs
- canon: RT Core p.267, RT Core p.368

**Description:**
The engine fails to apply the penalties to a Prone character's own tests. `attackerConditionModifier` correctly handles the `pinned` penalty for attackers but entirely omits the -10 WS/BS penalty for being `prone`. Additionally, `acolyte.mjs` does not apply the -20 penalty to Dodge tests when a character is Prone. Both of these penalties must be implemented and should be waived if the character possesses the `Sturdy` trait.

**Canon Rule:**
RT Core p.267 ("Prone"): "While Prone, a character suffers a -10 penalty to Weapon Skill and Ballistic Skill Tests, and a -20 penalty to Dodge Tests."
RT Core p.368 ("Sturdy"): "Sturdy characters do not suffer the normal penalties for being prone..."

## BUG-Q-193 — The `Shocking` weapon quality is missing from the system definitions and miswired by Tempest Bolt Shells
- status: new
- found-by: agy Gemini 3.1 Pro (High)
- file: src/module/rules/attack-specials.mjs:104, src/module/rules/ammo.mjs:105
- canon: RT Core p.132

**Description:**
The `Shocking` weapon quality is completely omitted from the `attackSpecials()` list in `attack-specials.mjs`, making it impossible to add to a weapon (it appears to have been mistakenly swapped with the DH2 `Concussive` quality). Although `damage-data.mjs` has a `case 'shocking':` block to handle it, `ammo.mjs` incorrectly pushes `{name: 'Shock'}` for Tempest Bolt Shells. This mismatch prevents the stun logic from ever triggering.

**Canon Rule:**
RT Core p.132: "Shocking: A weapon with this Quality can Stun its opponent..."

## BUG-Q-194 — `Accurate` and `Maximal` weapon qualities still bypass Righteous Fury, Tearing, and Proven
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 6
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:360-362` and `380-382` — The `Accurate` and `Maximal` extra damage dice are rolled separately (`accurateRoll` and `maximalRoll`) and added to `this.modifiers['accurate']` / `['maximal']`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:2298` (Righteous Fury) — "If a character rolls a 10 on any damage die (including additional dice from talents, weapon qualities, etc.)".
- gap: The previous fixes for `Maximal` and `Accurate` completely missed integrating the extra damage dice into the base `damageRoll.terms` or `rollFormula`. By adding them as flat `modifiers` after the base roll is evaluated, the extra dice do not benefit from `Tearing` or `Proven`, and any natural 10s rolled on these dice completely fail to trigger Righteous Fury (which only iterates `damageRoll.terms`). These dice MUST be added to the `damageRoll` constructed at the start.
- fix: `src/module/rolls/damage-data.mjs` — moved the Accurate (`+Nd10`/2 DoS, Basic+Aim) and Maximal (`+1d10`) rolls UP to BEFORE the Righteous-Fury / Proven dice scan, collected into a new `bonusDamageRolls` array that is merged into `damageRolls = [this.damageRoll, ...bonusDamageRolls]` (the array the RF/Proven loop iterates). Tearing now applies its extra-die `kh` modifier to these bonus rolls too. Removed the old post-hoc flat-modifier blocks from the ranged section. Their totals still surface as named `accurate`/`maximal` damage modifiers (display/total unchanged); kept OUT of `rollFormula` so RF-extra / helpless re-rolls don't duplicate the one-shot bonus. Deliberately scoped to Accurate+Maximal as filed (Mighty Shot/Eye-of-Vengeance are flat +N, not dice). Verified: `npm run build:check` + `npm test` (218 pass) green; live on rt-smoke via Playwright page-context — forced every Die `_roll` to max face, ran `_calculateDamage` on a base-`'0'` Maximal weapon → `modifiers.maximal === 10` AND `righteousFury.length === 1` (the maximal natural-10 triggered RF; was 0 under the old flat-modifier path), control without Maximal → 0 RF / no modifier.
- verify: confirmed: properly surfaces Accurate and Maximal extra dice as Rolls within `bonusDamageRolls`, evaluating them and folding them into the Righteous Fury and Proven loop while correctly appending the `kh` modifier for Tearing. Leaving them out of `rollFormula` correctly prevents duplicative scaling during the Righteous Fury extra roll itself.

## BUG-Q-195 — `Felling` weapon quality fails to reduce Unnatural Toughness when assigning damage
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 6
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/assign-damage-data.mjs:62-67` reads `this.tb = locationArmour.toughnessBonus`, which already includes Unnatural Toughness. No logic anywhere in the file inspects the attack for the `Felling` quality to reduce this value.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5993` (RT Core p.131) — Felling: "ignores a number of levels of Unnatural Toughness equal to the number in parentheses." (Full rule text in The Soul Reaver p.150: "a Felling (1) weapon ignores the benefits of Unnatural Toughness (x2) and would reduce the benefits of Unnatural Toughness (x3) by one multiplier.")
- gap: The `Felling` quality only prints a cosmetic chat note in `damage-data.mjs` but has zero mechanical implementation in the damage assignment pipeline. It must subtract its level from the defender's Unnatural Toughness multiplier when calculating the effective Toughness Bonus to soak the hit.
- fix: New pure helper `fellingToughnessBonus(toughnessBonus, unnatural, fellingLevel)` in `roll-helpers.mjs` — derives the base TB (`bonus − unnatural`), counts the available Unnatural multiplier steps (`round(unnatural/base)` = mult−1), removes `min(X, steps)` of them, and returns the reduced bonus (floored at base; never touches base TB/armour/fields). `Hit.fellingLevel` field added in `damage-data.mjs` and populated in the `felling` case of `_calculateSpecials` (`max(level, 1)`). `AssignDamageData.update()` reads `this.hit.fellingLevel` + the target's `characteristics.toughness.unnatural` and reduces `this.tb` BEFORE the Daemonic ×2 (BUG-Q-196 untouched). Verified: `npm run build:check` (exit 0) + `npm test` (225 pass, +7 new in `tests/chargen/felling.test.mjs`) green; LIVE on rt-smoke via Playwright page-context — drove deployed `AssignDamageData.update()` on a mock UT(x2)/(x3) target: Felling(1)/UT(x2)→TB 8→4, Felling(1)/UT(x3)→12→8, Felling(2)/UT(x3)→12→4, Felling(5)/UT(x2)→8→4 (clamped), no-Felling→8, no-UT→4 — all correct.
- verify: confirmed: correctly calculates the base TB and multiplier steps from the additive unnatural value, then safely strips exactly X levels of Unnatural Toughness (matching Soul Reaver p.150) without dipping below the base TB.

## BUG-Q-196 — `Daemonic` trait compounds with `Unnatural Toughness` instead of adding, violating the Multiple Multipliers rule
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 6
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/assign-damage-data.mjs:77` — `this.tb *= daemonicToughnessMultiplier(traits);` multiplies the `this.tb` value, which already includes the `Unnatural Toughness` multiplier.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md` (RT Core p.254, Multiple Multipliers) — "When this happens, the multipliers are added together, rather than multiplied by each other."
- gap: If a creature has Unnatural Toughness (x2) and Daemonic (x2), its base Toughness Bonus should be multiplied by x3 (2 + 2 - 1). The current code computes x4 because it multiplies the already-doubled TB by 2 again (`this.tb *= 2`). The code must compute the net multiplier additively.
- fix: NOTE — the filer's cited "RT Core p.254 Multiple Multipliers" rule does NOT exist in RT 1e (it's a Black Crusade p.254 sidebar — the page number matches that book, not RT; grep of all RT-DOCS for "added together rather than multiplied"/"multiple multipliers" returns nothing). But the bug is real: the additive-stacking principle IS RT 1e canon via the Unnatural Characteristic trait (RT Core p.368, CoreBook-201-401.pdf/markdown.md:6857 — "one selection multiplies the Characteristic Bonus by ×2, two by ×3, three by ×4", i.e. repeated Toughness multipliers increment by 1, they don't compound). New pure helper `daemonicToughnessBonus(toughnessBonus, baseToughnessBonus, daemonicMultiplier)` in `roll-helpers.mjs:567` returns `base × (unnaturalSteps + daemonicMultiplier)` (steps read off the post-Felling bonus so Felling composes; collapses to plain ×2 with no Unnatural). `assign-damage-data.mjs:79-90` now captures `baseTb = this.tb − unnatural` before Felling and calls the helper instead of `this.tb *= daemonicToughnessMultiplier(...)`. New node test `tests/chargen/daemonic_toughness.test.mjs` (7 cases). Gate green (build:check exit 0, 232 node tests, +7). Live-verified on rt-smoke via Playwright (imported deployed assign-damage-data.mjs, drove `AssignDamageData.update()` on mock body-hit targets): UT(×2)+Daemonic → TB 8→12 (×3, was 16/×4); UT(×3)+Daemonic → 12→16 (×4, was 24); Daemonic-only → 4→8 (×2, unchanged); UT(×2) no Daemonic → 8 (unchanged); UT(×2)+Daemonic+Felling(1) → 8 (UT stripped then ×2); "Daemonic (TB 8)" stat-block form → 12.
- verify: confirmed: setting `daemonicToughnessBonus` to compute the multiplier additively correctly prevents Daemonic from double-counting the base bonus against creatures with Unnatural Toughness, matching the established multiple multipliers rule (e.g., UTx2 and Daemonic results in x3, not x4) and properly composing with the Felling trait reduction.
- review: REVERTED to RAW on independent review — Daemonic (RT Core p.364) is a DISTINCT 'double the Toughness Bonus', not an Unnatural-Toughness step, so UT×2 + Daemonic = ×4 (multiplicative), not the additive ×3 the fix applied. The additive reading is a Black Crusade house rule. Helper + test removed. (post-review)

## BUG-Q-197 — `Overheats` weapon quality fails to cause the attack to miss
- status: new
- found-by: agy Gemini (High)
- file: src/module/rolls/action-data.mjs:295
- canon: RT Core p.116

**Description:**
When a weapon with the `Overheats` quality rolls a 91+ (or its `jamThreshold`), the engine correctly pushes the `overheat` effect but completely fails to set `this.rollData.success = false`. Because the jam logic is inside an `else if`, overheats bypass the jam failure state entirely. If the attacker has an effective BS of 91 or higher, the weapon will overheat (meaning it did not fire) but the attack will still successfully hit and deal damage to the target.

**Canon Rule:**
RT Core p.116 ("Overheats"): "An overheat roll means the weapon does not fire and the wielder suffers energy damage equal to the weapon's damage..."

## BUG-Q-198 — `Primitive`, `Snare`, `Toxic`, and `Smoke` weapon qualities erroneously require a level
- status: new
- found-by: agy Gemini (High)
- file: src/module/rules/attack-specials.mjs:192, 224, 240, 220
- canon: RT Core p.117-122

**Description:**
The `attackSpecials()` array in `attack-specials.mjs` configures `Primitive`, `Snare`, `Toxic`, and `Smoke` with `hasLevel: true`. This is a hallucinated mechanic carried over from Dark Heresy 2e / Only War, where these qualities possessed numerical levels (e.g., `Toxic (X)` imposing a `-10 * X` penalty, or `Primitive (X)` capping damage). In Rogue Trader 1e, none of these qualities have levels: `Toxic` applies a flat `-5` per point of damage, `Primitive` doubles armour, `Snare` prompts a flat Agility test, and `Smoke` creates a 3d10 radius cloud. The UI should not prompt the user to enter a level when applying these qualities to a weapon.

**Canon Rule:**
RT Core p.117-122 (Weapon Special Qualities): The entries for Primitive, Snare, Toxic, and Smoke list no numerical variable in parentheses.

## BUG-Q-199 — The `Vengeful` weapon quality is a hallucinated DH2/Only War mechanic
- status: new
- found-by: agy Gemini (High)
- file: src/module/rules/attack-specials.mjs:263, src/module/rolls/damage-data.mjs:106
- canon: RT Core p.116-122

**Description:**
The `Vengeful` weapon quality is registered in `attack-specials.mjs` and actively evaluated in `damage-data.mjs` to override the Righteous Fury threshold (e.g. `Vengeful (8)` triggering RF on a damage die of 8+). This is entirely a Dark Heresy 2e / Only War mechanic. The `Vengeful` quality does not exist anywhere in Rogue Trader 1e canon (the word only appears as a ship name, the *Vengeful Martyr*, in Hostile Acquisitions). Righteous Fury in RT 1e triggers exclusively on a natural 10 (RT Core p.245). This quality should be removed.

**Canon Rule:**
RT Core p.116-122 (Weapon Special Qualities): `Vengeful` is absent from the core rules, and missing from all RT expansion books.

- **BUG-Q-183**: `combat-actions.mjs` applies a `0` modifier for the "Multiple Attacks" action when the actor lacks the Two-Weapon Wielder talent, instead of the canonical `-20`.
  - **Location**: `src/module/rules/combat-actions.mjs` (line 39)
  - **Rule Source**: *RT Core p.240* ("If the character does not have the Two-Weapon Wielder Talent, the penalty to the attack rolls increases to -20.")
  - **Fix**: Apply a base `-20` penalty for `Multiple Attacks`. Only reduce to `-10` if the actor possesses *both* Two-Weapon Wielder and Ambidextrous. If they lack Two-Weapon Wielder, it remains `-20`.

## BUG-Q-200 — `perDoSDamage` dice (Psychic Powers) are excluded from the `damageRolls` array, never triggering Righteous Fury
- status: new
- found-by: agy Gemini (High)
- file: src/module/rolls/damage-data.mjs:172, 257
- canon: RT Core p.159, p.245

**Description:**
When a psychic power (or any attack) uses the `perDoSDamage` formula, `damage-data.mjs` correctly evaluates the dice and pushes them to `this.perDoSRolls` (lines 172-185), adding their total to `this.damage`. However, `this.perDoSRolls` is never appended to the `bonusDamageRolls` or `damageRolls` arrays. When the Righteous Fury loop scans the dice (`for (const dmgRoll of damageRolls) ...`), the `perDoSDamage` dice are entirely excluded. A natural 10 rolled on a `perDoSDamage` die will never trigger Righteous Fury.

**Canon Rule:**
RT Core p.159 (Psychic Powers): "Psychic powers that cause Damage can also cause Righteous Fury unless otherwise noted."
RT Core p.245 (Righteous Fury): "If a natural 10 is rolled on any damage die, there is a chance of Righteous Fury."

## BUG-Q-201 — Cover AP is not doubled against Primitive weapons
- status: new
- found-by: agy Gemini (High)
- file: src/module/rolls/assign-damage-data.mjs:179-198
- canon: RT Core p.142, p.245

**Description:**
In `assign-damage-data.mjs`, when an attack strikes a covered location, the cover's AP (`coverAp`) reduces the `totalDamage` first. The remaining `totalDamage` is then evaluated against the target's personal armour (`this.armour`), and only at this step is the armour doubled if the weapon is Primitive (`usableArmour = usableArmour * 2`). Because `coverAp` is evaluated entirely separately and earlier in the block, it is never doubled against Primitive weapons. A Primitive weapon effectively bypasses modern cover just as easily as a modern weapon would.

**Canon Rule:**
RT Core p.142 (Primitive): "Primitive weapons are very ineffective against modern armour. All Armour Points (with the exception of armour that also has the Primitive quality) are doubled against hits from Primitive weapons."
RT Core p.245 (Cover): "Cover provides a number of Armour Points...".

## BUG-Q-202 — `Tearing` exact string match on modifier fails to detect existing keep-highest modifiers, causing double-application
- status: new
- found-by: agy Gemini (High)
- file: src/module/rolls/damage-data.mjs:147, 163, 197
- canon: Foundry VTT Roll syntax

**Description:**
When evaluating the `Tearing` quality, `damage-data.mjs` checks `if (die.modifiers.includes('kh')) return;` to prevent applying the Tearing modifier multiple times. However, Foundry VTT parses modifiers as they appear in the formula (e.g. `'kh1'`). Furthermore, the code itself dynamically pushes `'kh' + die.number` (e.g., `'kh1'` or `'kh2'`). The exact string `includes('kh')` check will return false if the array contains `'kh1'`. If a weapon formula already has a keep-highest modifier natively (e.g. `2d10kh1`), the check fails, the code pushes another `'kh2'`, increments the dice number, and constructs invalid dice terms like `3d10kh1kh2`. The check must use a substring or prefix match (e.g. `some(m => m.startsWith('kh'))`).

**Canon Rule:**
Engine logic / Foundry Roll syntax constraint.

## BUG-Q-203 — `Multiple Attacks` action applies incorrect penalties for Two-Weapon Wielder, Ambidextrous, and Gunslinger
- status: new
- found-by: agy Gemini (High)
- file: src/module/rules/combat-actions.mjs:42
- canon: RT Core p.243, p.99

**Description:**
The engine incorrectly calculates the penalties for the Multiple Attacks action. Currently, it assigns a flat -20 base penalty, and only drops it to -10 if the character possesses *both* the `Two-Weapon Wielder` and `Ambidextrous` talents. It never drops to +0. Furthermore, it completely ignores the `Gunslinger` talent for pistol weapons.

**Canon Rule:**
RT Core p.243 (Two-Weapon Fighting): "If he does not possess the Two-Weapon Wielder Talent, he suffers a -20 penalty to Weapon Skill and Ballistic Skill Tests... If he possesses the Two-Weapon Wielder Talent, the penalty drops to -10. If he also possesses the Ambidextrous Talent, the penalty drops to +0."
RT Core p.99 (Gunslinger): "A character with this Talent reduces the penalty for fighting with two weapons by 10... If he also possesses the Two-Weapon Wielder (Ballistic) Talent, the penalty drops to +0. This only applies when using Pistols."

## BUG-Q-204 — `Marksman` talent is completely missing from range penalty calculations
- status: new
- found-by: agy Gemini (High)
- file: src/module/rules/range.mjs:136-142
- canon: RT Core p.102

**Description:**
The `Marksman` talent is present in the talents pack but has zero mechanical effect. When calculating range modifiers in `range.mjs`, the engine checks for `Telescopic Sight` and `Omni-Scope` (which require Aiming) to waive negative range penalties, but entirely omits checking for the `Marksman` talent.

**Canon Rule:**
RT Core p.102: "Marksman: The character suffers no penalties for firing at Long or Extreme Range."

## BUG-Q-205 — `Deadeye Shot` talent fails to reduce the Called Shot penalty
- status: new
- found-by: agy Gemini (High)
- file: src/module/rules/combat-actions.mjs:32-37
- canon: RT Core p.98

**Description:**
The `Deadeye Shot` talent exists in the talents pack but has no mechanical hook. `combat-actions.mjs` correctly waives the entire Called Shot penalty (-20 to 0) for the `Sharpshooter` talent, but fails to reduce the penalty to -10 for characters who only possess `Deadeye Shot`. 

**Canon Rule:**
RT Core p.98: "Deadeye Shot: When making a Called Shot (see page 239) the character's penalty is reduced to -10."

## BUG-Q-206 — Cover AP incorrectly applies its full penetration reduction to both cover and the target's armour
- status: new
- found-by: agy Gemini (High)
- file: src/module/rolls/assign-damage-data.mjs:176-189
- canon: RT Core p.245

**Description:**
In `assign-damage-data.mjs`, when an attack strikes a covered location, the cover's AP (`coverAp`) absorbs some or all of the weapon's `totalDamage`. Although the cover's effectiveness is correctly reduced by the weapon's `totalPenetration`, the `totalPenetration` value itself is never reduced. As a result, the full weapon penetration is applied a *second* time against the character's personal armour (`usableArmour = usableArmour - totalPenetration`). This effectively doubles the weapon's penetration against entrenched targets.

**Canon Rule:**
RT Core p.245 (Cover): "it does affect cover, reducing its APs by the weapon's Penetration, and any remaining Penetration affects the target's Armour."

## BUG-Q-207 — Voidship critical hits are improperly multiplied by the number of hits in a salvo
- status: new
- found-by: agy Gemini (High)
- file: src/module/rolls/action-data.mjs:409-415
- canon: RT Core p.218

**Description:**
In `action-data.mjs`, when a voidship weapon scores a critical hit (either via its Crit Rating or the Destructive quality), the engine incorrectly flags every single hit in the salvo as a critical hit (`isCritical: true`). Later in `assign-damage-data.mjs`, this causes the `executeCritical` loop to roll on the Critical Hits chart once per *hit* in the salvo, rather than once per *salvo*.

**Canon Rule:**
RT Core p.218 (Critical Hits): "If the number of Degrees of Success is equal to or greater than the weapon's Crit Rating, the weapon scores a Critical Hit... A macrobattery that scores a Critical Hit on its target also inflicts one normal hit for every additional Degree of Success." (Only one hit is critical, the rest are normal).

## BUG-Q-208 — Vehicle Armour is not doubled against Primitive weapons
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: vehicle
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/assign-damage-data.mjs:149` — `let armour = this.ignoreArmour ? 0 : Math.max(0, this.facingArmour - totalPenetration);`
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:6873` (RT Core p.142) — "Primitive weapons are very ineffective against modern armour. All Armour Points (with the exception of armour that also has the Primitive quality) are doubled against hits from Primitive weapons."
- gap: The `isVehicle` block completely bypasses the Primitive weapon check. While personal combat correctly doubles armour against Primitive weapons, vehicles subtract only their base `facingArmour`, allowing Primitive weapons to be just as effective against a tank as modern weapons.
- fix: 
- verify:
- review: fixed — vehicle facing Armour is now DOUBLED against Primitive weapons (RT Core p.142), matching personal combat. (post-review)

## BUG-Q-209 — Melee `Lance` quality completely zeroes the weapon's Penetration on a bare success (0 DoS)
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:466` — `this.penetrationModifiers['lance'] = this.penetration * (attackData.rollData.dos - 1);`
- canon: QA-094 established that `dos - 1` meant "extra Pen per degree beyond the first", but also shifted the baseline of a bare success to `0 DoS`. 
- gap: Because a bare success (e.g. rolling 45 against target 49) yields `dos = 0`, the expression evaluates to `(0 - 1) = -1`. The engine multiplies the base penetration by `-1` and applies it as a modifier, which reduces the weapon's `totalPenetration` to exactly 0 (base - base = 0). The formula must guard against `dos < 1` to prevent stripping penetration on 0 DoS hits.
- fix: 
- verify:
- review: fixed — melee Lance pen modifier guarded with max(0, dos-1) so a bare success (0 DoS) no longer applies pen×-1 and zeroes Penetration. (post-review)

## BUG-Q-210 — Firing with insufficient ammo for a high-consumption shot resolves the attack for free without using ammo
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rules/ammo.mjs:282-286` combined with `src/module/rolls/action-data.mjs:610-612` — if `availableAmmo` is less than `ammoPerShot`, `maximumHits` evaluates to `0`. `fireRate` drops to `0`, setting `ammoUsed` to `0`. 
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:5930` (RT Core p.115) — "A weapon cannot be fired if it does not have enough ammunition."
- gap: When firing a weapon mode that consumes more ammo per shot than remains in the clip (e.g. a Maximal shot requiring 3 ammo when only 2 remain, or a Twin-Linked weapon requiring 2 when only 1 remains), the engine clamps `ammoUsed` to `0` but fails to abort the attack. The attack completes, generates the base hit, and subtracts 0 ammo, allowing infinite free shots.
- fix: 
- verify:
- review: fixed — engine-level guard in calculateHits(): a ranged ammo weapon with fireRate<=0 (insufficient ammo) now produces NO hits (RT Core p.115), closing the free-shot path beyond the dialog guard. (post-review)
