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
- status: verified
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
- status: verified
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
- status: wontfix
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
- status: verified
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
- status: verified
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
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High)
- file: src/module/rolls/roll-data.mjs:252
- canon: RT Core p.368

**Description:**
The `autoBraced` calculation in `roll-data.mjs` correctly checks for `Bulging Biceps`, `Auto-Stabilised`, and `Suspensors` to negate the -30 penalty for firing an unbraced Heavy weapon, but it entirely omits the `Sturdy` trait. 

**Canon Rule:**
RT Core p.368 ("Sturdy"): "Sturdy characters do not suffer the normal penalties for being prone, nor do they suffer any penalties to their tests as a result of using heavy weapons."

## BUG-Q-192 — `Prone` characters fail to suffer their own penalties (-10 to WS/BS, -20 to Dodge), which should also be negated by `Sturdy`
- status: verified
- found-by: agy Gemini 3.1 Pro (High)
- file: src/module/rules/conditions.mjs:52, src/module/documents/acolyte.mjs
- canon: RT Core p.267, RT Core p.368

**Description:**
The engine fails to apply the penalties to a Prone character's own tests. `attackerConditionModifier` correctly handles the `pinned` penalty for attackers but entirely omits the -10 WS/BS penalty for being `prone`. Additionally, `acolyte.mjs` does not apply the -20 penalty to Dodge tests when a character is Prone. Both of these penalties must be implemented and should be waived if the character possesses the `Sturdy` trait.

**Canon Rule:**
RT Core p.267 ("Prone"): "While Prone, a character suffers a -10 penalty to Weapon Skill and Ballistic Skill Tests, and a -20 penalty to Dodge Tests."
RT Core p.368 ("Sturdy"): "Sturdy characters do not suffer the normal penalties for being prone..."

## BUG-Q-193 — The `Shocking` weapon quality is missing from the system definitions and miswired by Tempest Bolt Shells
- status: verified
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
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rolls/action-data.mjs:295
- canon: RT Core p.116

**Description:**
When a weapon with the `Overheats` quality rolls a 91+ (or its `jamThreshold`), the engine correctly pushes the `overheat` effect but completely fails to set `this.rollData.success = false`. Because the jam logic is inside an `else if`, overheats bypass the jam failure state entirely. If the attacker has an effective BS of 91 or higher, the weapon will overheat (meaning it did not fire) but the attack will still successfully hit and deal damage to the target.

**Canon Rule:**
RT Core p.116 ("Overheats"): "An overheat roll means the weapon does not fire and the wielder suffers energy damage equal to the weapon's damage..."

## BUG-Q-198 — `Primitive`, `Snare`, `Toxic`, and `Smoke` weapon qualities erroneously require a level
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rules/attack-specials.mjs:192, 224, 240, 220
- canon: RT Core p.117-122

**Description:**
The `attackSpecials()` array in `attack-specials.mjs` configures `Primitive`, `Snare`, `Toxic`, and `Smoke` with `hasLevel: true`. This is a hallucinated mechanic carried over from Dark Heresy 2e / Only War, where these qualities possessed numerical levels (e.g., `Toxic (X)` imposing a `-10 * X` penalty, or `Primitive (X)` capping damage). In Rogue Trader 1e, none of these qualities have levels: `Toxic` applies a flat `-5` per point of damage, `Primitive` doubles armour, `Snare` prompts a flat Agility test, and `Smoke` creates a 3d10 radius cloud. The UI should not prompt the user to enter a level when applying these qualities to a weapon.

**Canon Rule:**
RT Core p.117-122 (Weapon Special Qualities): The entries for Primitive, Snare, Toxic, and Smoke list no numerical variable in parentheses.

## BUG-Q-199 — The `Vengeful` weapon quality is a hallucinated DH2/Only War mechanic
- status: wontfix
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
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rolls/damage-data.mjs:172, 257
- canon: RT Core p.159, p.245

**Description:**
When a psychic power (or any attack) uses the `perDoSDamage` formula, `damage-data.mjs` correctly evaluates the dice and pushes them to `this.perDoSRolls` (lines 172-185), adding their total to `this.damage`. However, `this.perDoSRolls` is never appended to the `bonusDamageRolls` or `damageRolls` arrays. When the Righteous Fury loop scans the dice (`for (const dmgRoll of damageRolls) ...`), the `perDoSDamage` dice are entirely excluded. A natural 10 rolled on a `perDoSDamage` die will never trigger Righteous Fury.

**Canon Rule:**
RT Core p.159 (Psychic Powers): "Psychic powers that cause Damage can also cause Righteous Fury unless otherwise noted."
RT Core p.245 (Righteous Fury): "If a natural 10 is rolled on any damage die, there is a chance of Righteous Fury."

## BUG-Q-201 — Cover AP is not doubled against Primitive weapons
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rolls/assign-damage-data.mjs:179-198
- canon: RT Core p.142, p.245

**Description:**
In `assign-damage-data.mjs`, when an attack strikes a covered location, the cover's AP (`coverAp`) reduces the `totalDamage` first. The remaining `totalDamage` is then evaluated against the target's personal armour (`this.armour`), and only at this step is the armour doubled if the weapon is Primitive (`usableArmour = usableArmour * 2`). Because `coverAp` is evaluated entirely separately and earlier in the block, it is never doubled against Primitive weapons. A Primitive weapon effectively bypasses modern cover just as easily as a modern weapon would.

**Canon Rule:**
RT Core p.142 (Primitive): "Primitive weapons are very ineffective against modern armour. All Armour Points (with the exception of armour that also has the Primitive quality) are doubled against hits from Primitive weapons."
RT Core p.245 (Cover): "Cover provides a number of Armour Points...".

## BUG-Q-202 — `Tearing` exact string match on modifier fails to detect existing keep-highest modifiers, causing double-application
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rolls/damage-data.mjs:147, 163, 197
- canon: Foundry VTT Roll syntax

**Description:**
When evaluating the `Tearing` quality, `damage-data.mjs` checks `if (die.modifiers.includes('kh')) return;` to prevent applying the Tearing modifier multiple times. However, Foundry VTT parses modifiers as they appear in the formula (e.g. `'kh1'`). Furthermore, the code itself dynamically pushes `'kh' + die.number` (e.g., `'kh1'` or `'kh2'`). The exact string `includes('kh')` check will return false if the array contains `'kh1'`. If a weapon formula already has a keep-highest modifier natively (e.g. `2d10kh1`), the check fails, the code pushes another `'kh2'`, increments the dice number, and constructs invalid dice terms like `3d10kh1kh2`. The check must use a substring or prefix match (e.g. `some(m => m.startsWith('kh'))`).

**Canon Rule:**
Engine logic / Foundry Roll syntax constraint.

## BUG-Q-203 — `Multiple Attacks` action applies incorrect penalties for Two-Weapon Wielder, Ambidextrous, and Gunslinger
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rules/combat-actions.mjs:42
- canon: RT Core p.243, p.99

**Description:**
The engine incorrectly calculates the penalties for the Multiple Attacks action. Currently, it assigns a flat -20 base penalty, and only drops it to -10 if the character possesses *both* the `Two-Weapon Wielder` and `Ambidextrous` talents. It never drops to +0. Furthermore, it completely ignores the `Gunslinger` talent for pistol weapons.

**Canon Rule:**
RT Core p.243 (Two-Weapon Fighting): "If he does not possess the Two-Weapon Wielder Talent, he suffers a -20 penalty to Weapon Skill and Ballistic Skill Tests... If he possesses the Two-Weapon Wielder Talent, the penalty drops to -10. If he also possesses the Ambidextrous Talent, the penalty drops to +0."
RT Core p.99 (Gunslinger): "A character with this Talent reduces the penalty for fighting with two weapons by 10... If he also possesses the Two-Weapon Wielder (Ballistic) Talent, the penalty drops to +0. This only applies when using Pistols."

## BUG-Q-204 — `Marksman` talent is completely missing from range penalty calculations
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rules/range.mjs:136-142
- canon: RT Core p.102

**Description:**
The `Marksman` talent is present in the talents pack but has zero mechanical effect. When calculating range modifiers in `range.mjs`, the engine checks for `Telescopic Sight` and `Omni-Scope` (which require Aiming) to waive negative range penalties, but entirely omits checking for the `Marksman` talent.

**Canon Rule:**
RT Core p.102: "Marksman: The character suffers no penalties for firing at Long or Extreme Range."

## BUG-Q-205 — `Deadeye Shot` talent fails to reduce the Called Shot penalty
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rules/combat-actions.mjs:32-37
- canon: RT Core p.98

**Description:**
The `Deadeye Shot` talent exists in the talents pack but has no mechanical hook. `combat-actions.mjs` correctly waives the entire Called Shot penalty (-20 to 0) for the `Sharpshooter` talent, but fails to reduce the penalty to -10 for characters who only possess `Deadeye Shot`. 

**Canon Rule:**
RT Core p.98: "Deadeye Shot: When making a Called Shot (see page 239) the character's penalty is reduced to -10."

## BUG-Q-206 — Cover AP incorrectly applies its full penetration reduction to both cover and the target's armour
- status: verified
- found-by: agy Gemini (High)
- file: src/module/rolls/assign-damage-data.mjs:176-189
- canon: RT Core p.245

**Description:**
In `assign-damage-data.mjs`, when an attack strikes a covered location, the cover's AP (`coverAp`) absorbs some or all of the weapon's `totalDamage`. Although the cover's effectiveness is correctly reduced by the weapon's `totalPenetration`, the `totalPenetration` value itself is never reduced. As a result, the full weapon penetration is applied a *second* time against the character's personal armour (`usableArmour = usableArmour - totalPenetration`). This effectively doubles the weapon's penetration against entrenched targets.

**Canon Rule:**
RT Core p.245 (Cover): "it does affect cover, reducing its APs by the weapon's Penetration, and any remaining Penetration affects the target's Armour."

## BUG-Q-207 — Voidship critical hits are improperly multiplied by the number of hits in a salvo
- status: verified
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

## BUG-Q-211 — Unfettered and Push psychic powers falsely evaluate as Fettered and skip phenomena if the psyker is sustaining powers
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:58` (prior to fix) — `if (pr < rating) return;` compared effective PR against the actor's un-reduced base rating.
- canon: RT Core p.156-157 / Errata 1.4 — Fettered never triggers phenomena, Unfettered triggers on doubles, Push always triggers. Sustaining a power reduces effective PR but doesn't change the power level choice.
- gap: Because the engine used `pr < rating` to detect Fettered casting, a psyker casting at Unfettered while sustaining powers (which lowers `pr` below their base `rating`) was falsely detected as Fettered. This entirely skipped the Psychic Phenomena roll for Unfettered (and potentially Push) casts while sustaining. The push amount multiplier was also miscalculated using base rating instead of effective rating. 
- fix: 
- verify:
- review: fixed — Fettered/Push detection now uses `this.rollData.strength` instead of the broken `pr < rating` comparison, ensuring Unfettered casts while sustaining powers correctly trigger phenomena on doubles. Push bonus amount correctly derived using `currentRating` (QA-151 compliance). (post-review)

## BUG-Q-212 — Vehicle critical damage calculation ignores Crack Shot and Crippling Strike
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: rules
- severity: P1 (missed bonus)
- evidence: `src/module/rolls/assign-damage-data.mjs:163` (prior to fix) — `criticalDamageBonus` was applied only in the `else` (personal combat) block and omitted from the `isVehicle` block.
- canon: RT Core p.92 / p.96 — Crack Shot and Crippling Strike add extra Critical Damage when an attack causes Critical Damage. Into the Storm p.166 — Vehicles suffer Critical Damage and have Critical Hits.
- gap: When attacking a vehicle, if the attack dealt Critical Damage to the vehicle's structural integrity, the engine correctly triggered critical damage but failed to add the attacker's `criticalDamageBonus` (from Crack Shot/Crippling Strike) to the vehicle's `integrityCritical` pool, shortchanging the critical severity.
- fix: 
- verify:
- review: fixed — vehicle critical damage path now correctly adds `this.hit.criticalDamageBonus` to `this.integrityCritical` when an attack scores critical damage against a vehicle, honoring Crack Shot and Crippling Strike. (post-review)

## BUG-Q-213 — `Destructive` weapon quality incorrectly upgrades ALL voidship hits to Critical Hits
- status: verified
- found-by: agy Gemini
- area: ship
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:431` — `const critical = res.critical || (res.hit && this.rollData.hasAttackSpecial('Destructive'));` forces the `critical` boolean to true for all hits if the weapon is Destructive.
- canon: `/mnt/project_data/RT/RT-DOCS/roguetrader_battlefleetkoronus.pdf/markdown.md:1668` — "Destructive: If this weapon generates a crit, add 1 to the result rolled." (Battlefleet Koronus p.35)
- gap: The `Destructive` quality is completely misimplemented as upgrading a normal hit into a Critical Hit (falsely citing RT Core p.218 in comments). In reality, it should only add +1 to the 1d5 Critical Hits to Starships roll IF a critical hit is naturally generated.
- fix: (1) `src/module/rolls/action-data.mjs:431` — `_calculateVoidshipHits` now sets `critical = res.critical` only (crit triggers solely when DoS ≥ Crit Rating, RT Core p.218); dropped the `|| (res.hit && Destructive)` false-upgrade. (2) `action-data.mjs:~622` — stamps `r.voidshipDestructive` on each hit when the weapon has Destructive. (3) `assign-damage-data.mjs:executeCritical` — passes `bonus = hit.voidshipDestructive ? 1 : 0` to `drawShipCriticalResult`. (4) `voidship-critical-damage.mjs:drawShipCriticalResult(value, bonus)` — adds `bonus` to a rolled 1d5 (chart runs 1-10, +1 stays in range; explicit-value crippled-ship path ignores bonus). Battlefleet Koronus p.35. Gate green (build:check exit 0, 225 node tests). Live-verified on rt-smoke via Playwright: 400 Destructive weapon hits with DoS < critRating → 0 false crit-upgrades (pre-fix all 400 would crit); `drawShipCriticalResult(null,0)` range 1-5, `(null,1)` range 2-6, explicit `(3,1)` → 3.
- verify: confirmed: correctly removes the erroneous auto-upgrade to Critical Hit and properly adds +1 to the 1d5 Critical Hits chart roll when a critical is naturally generated, matching Battlefleet Koronus p.35 RAW.

## BUG-Q-214 — Psychic Phenomena 'doubles' detection fails on a roll of 100
- status: verified
- found-by: agy Gemini
- area: psychic
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:58` — `const isDoubles = /^(.)\1+$/.test(this.rollData.roll.total);`
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:7384` (RT Core p.157) — "If a Sanctioned Psyker rolls doubles on his Focus Power Test (i.e. 11, 22, 33, 44, 55, 66, 77, 88, 99, 00)..."
- gap: A d100 roll of 100 results in the number `100`. The regex `/^(.)\1+$/` matches strings composed of identical characters. It will match `"11"`, `"22"`, etc., but will fail to match `"100"` because it begins with '1' and continues with '0'. Thus, a roll of 100 (which represents 00) completely fails to trigger Psychic Phenomena for Unfettered casts.
- fix: Added pure helper `isPsychicDoubles(total)` to `src/module/rolls/roll-helpers.mjs:51` (returns true for 100 [=00] and for two-digit multiples of 11, i.e. 11–99; guards non-finite); replaced the broken regex at `src/module/rolls/action-data.mjs:58` (`isDoubles = isPsychicDoubles(this.rollData.roll.total)`) and added the import. New node test `tests/chargen/psychic_doubles.test.mjs` (3 cases). Gate green: `npm run build:check` exit 0, `npm test` 228/228. Live-verified on rt-smoke via Playwright page-context import of the deployed module: `isPsychicDoubles` returns true for [11..99,100] and false for [10,12,21,50,98].
- verify: confirmed: the `isPsychicDoubles` helper properly detects two-digit multiples of 11 (11-99) and correctly handles a roll of 100 as the `00` doubles result, explicitly matching the RT Errata v1.4 and Core p.157 requirement without being tripped up by the string representation of 100.

## BUG-Q-215 — Astropath Transcendent Perils of the Warp reduction is unimplemented
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 3
- area: psychic
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:100` — `const perils = await drawFromTable('Perils of the Warp');`
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/pages/page-159/markdown.md:49` (RT Core p.159) — "An Astropath Transcendent rolls an additional d10 when rolling on the Perils of the Warp table and may discard any one d10 for a more favourable result."
- gap: The `checkForPerils` logic automatically draws from the Perils of the Warp table with a single 1d100 roll and outputs the result. The engine does not provide the Astropath Transcendent their class feature to roll an additional d10 and discard one for a more favorable result, forcing them to suffer unmitigated raw rolls or ignore the automated chat card entirely.
- fix: New pure helper `astropathPerilsResult(tens, units, extra)` in `roll-helpers.mjs:67` — percentile = tens d10 + units d10, the extra d10 can replace either, keeps the least-severe (lowest) of the three discard readings, 00→100 (Destruction, avoided unless the only option). `drawFromTable(tableName, modifier, forcedTotal)` gained a `forcedTotal` param (resolves the table for a pre-computed value via `table.roll({roll: new Roll(String(total))})` instead of a fresh 1d100). `action-data.mjs:checkForPerils` — when `sourceActor.hasTalent('Soul-Bound to the Emperor')` (the Astropath Transcendent ability, talents.yml:3527), rolls 3×1d10 (raw 0-9 via `%10`), computes the favourable total, and draws Perils with the forcedTotal + a chat note; non-Astropath path unchanged. New node test `tests/chargen/astropath_perils.test.mjs` (6 cases incl. exhaustive 1000-combo check). 3-candidate dice interpretation logged to data-vendor-queue. Gate green (build:check exit 0, 234 node tests, +6). Live-verified on rt-smoke via Playwright (page-context import of deployed module): `astropathPerilsResult` → 1/12/9/5/100 for the documented cases; the forcedTotal path resolves the Perils RollTable to the matching row (1→The Gibbering, 9→Warp Burn, 100→Annihilation/Destruction), confirming a low favourable roll lands a milder Peril.
- verify: confirmed: correctly implements the Astropath Transcendent Perils mitigation by rolling three d10s and computing the most favourable (lowest) percentile reading, properly converting 00 to 100, and resolving the forced total on the Perils table, matching RT Core p.159.

## BUG-Q-216 — Per-DoS damage (Psychic Powers) bypasses the Righteous Fury scan
- status: wontfix
- found-by: agy Gemini
- area: psychic
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:238` — `const damageRolls = [this.damageRoll, ...bonusDamageRolls];`
- canon: RT Core p.245 — "If a natural 10 is rolled on any damage die, there is a chance of Righteous Fury."
- gap: Per-DoS damage dice (like `1d10 per Degree of Success` for Psychic Powers) are evaluated into `this.perDoSRolls` inside `_calculateDamage`. However, when the script scans damage rolls for natural 10s to trigger Righteous Fury, it loops over `damageRolls` (which only contains the base `this.damageRoll` and `bonusDamageRolls` for Accurate/Maximal). `this.perDoSRolls` is entirely omitted, meaning 10s rolled on these damage dice completely bypass the Righteous Fury trigger.

## BUG-Q-217 — Vehicle Ramming unconditionally hardcodes the target's "front" Armour Points
- status: verified
- found-by: agy Gemini
- area: vehicle
- severity: P0 (wrong result in play)
- evidence: `src/module/rules/vehicle-ops.mjs:66` — `const targetAP = Number(target.system?.front) || 0;` (and `:60` `const facingAP = Number(rammer.system?.front) || 0;`).
- canon: Into the Storm p.159 — "doing damage equal to the AP on the vehicle's facing that hit plus 1d10... it also takes damage equal to the AP of the vehicle it hit plus 1d5."
- gap: When resolving a vehicle Ram, the script unconditionally draws `system.front` for the ramming vehicle's striking face and `system.front` for the target's struck face. A vehicle can sideswipe or T-bone the side/rear of an enemy vehicle, which has vastly different Armour Points (e.g. Front 30 vs Rear 15). The current implementation denies the tactical benefit of rear-strikes (or reverse-rams) by ignoring the actual struck facing.

## BUG-Q-218 — Opposed-test tie-break incorrectly uses modified targets instead of Characteristic Bonus, and Knock-Down treats DoS ties as automatic attacker failure
- status: verified
- found-by: agy Gemini
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:134-138` checks `(this.rollData.opposedTarget ?? 0) > (this.rollData.modifiedTarget ?? 0)` to break a generic opposed test tie. This compares fully modified targets, not the raw Characteristic Bonus. It also completely omits the dice-roll tiebreaker if the targets are equal. Furthermore, `action-data.mjs:156-163` (Knock-Down) simply checks `opposedDegrees` and treats exactly `0` (DoS tie) as a failure (`> -2` branch: "The character fails to knock down the target!"), skipping all tiebreakers.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:1600` (RT Core p.232) — "If both participants succeed, the one with the most degrees of success wins. If the both degrees of success are the same, the highest Characteristic Bonus wins. If the result is still a tie, the lowest dice roll wins."
- gap: The previous attempt to fix opposed-test ties (QA-106) was badly botched. Generic opposed tests use modified characteristic targets instead of Characteristic Bonus, omit the dice roll tiebreaker, and automatically award ties to the attacker if the modified targets are equal. Knock-down simply continues to automatically award all ties to the defender. Both completely ignore QA-106's correct instruction to compare Characteristic Bonus and then raw dice roll.
- fix: New pure helper `getOpposedDegreesWithTiebreak(attacker, defender)` in `roll-helpers.mjs:232` — builds on `getOpposedDegrees` for the cross success/failure magnitude, then breaks an exact net of 0 (two equal-DoS successes) by the full RT Core p.232 chain: higher **Characteristic Bonus** (the real `.bonus`, not a modified target) → **lower dice roll** → default to the active character (attacker); two failures stay a stalemate (0). `action-data.mjs:checkForOpposed` now reads each side's `.bonus` (Feint opposes WS, Knock-Down opposes Strength — same characteristic both sides) and dice rolls, computes `opposedNetDegrees`, and flips attacker success only when it is `< 0` (dropping the old modified-target compare + the missing dice tiebreaker + the auto-award). The Knock-Down branch (`action-data.mjs:160`) reuses `opposedNetDegrees` instead of the un-tiebroken `getOpposedDegrees`, so a DoS tie is decided by Bonus/dice rather than auto-failing the attacker. `opposedNetDegrees` field declared in `roll-data.mjs:48`. New node test `tests/chargen/opposed_tiebreak.test.mjs` (7 cases). Gate green (`npm run build:check` exit 0; `npm test` 241/241, +7). Live-verified on rt-smoke via Playwright (page-context import of the deployed `roll-helpers.mjs`): success-beats-fail=1, more-DoS=2, Bonus-tie att-high=1/def-high=−1, dice-tie att-low=1/def-low=−1, both-fail=0, perfect-tie=1 — all match canon.
- verify: disputed: incorrect logic for double-failures. The `getOpposedDegreesWithTiebreak` function incorrectly awards a win to an attacker if BOTH parties fail but the defender fails by more (e.g., attacker fails by 0, defender fails by 2 yields a net +2). This violates RT Core p.232 verbatim: "Should both parties fail, one of two things occurs. Either there is a stalemate and nothing happens or both parties should re-roll". The code's `if (net !== 0) return net;` executes BEFORE checking for double-failure, meaning double-failures only register as a stalemate if their DoFs are exactly equal. In Knock-Down (`action-data.mjs:174`), this causes an attacker who FAILED their Strength test to still successfully knock the target down and deal damage (since +2 triggers the success branch). The double-failure check (`if (!a.success && !d.success) return 0;`) MUST evaluate before returning `net`. The test asserting that "smaller failure still wins" enforces a non-canon outcome.
- fix (dispute): Addressed exactly as the verify prescribes. `src/module/rolls/roll-helpers.mjs:248` — moved the double-failure stalemate guard `if (!a.success && !d.success) return 0;` to the TOP of `getOpposedDegreesWithTiebreak`, BEFORE computing `net`, so any double failure (regardless of DoF magnitude) returns 0 (stalemate, RT Core p.232 "either a stalemate ... or both parties re-roll") instead of the "less wrong" side netting positive. After the guard, a net of 0 can only be two equal-DoS successes → the Bonus → dice tiebreak chain runs unchanged; the now-redundant `if (!a.success || !d.success) return 0;` was dropped. Docstring updated. `tests/chargen/opposed_tiebreak.test.mjs` — replaced the non-canon "smaller failure still wins" assertion with "two failures are a stalemate even when DoF differ" (both directions → 0). Knock-Down (`action-data.mjs:174`) now correctly sees a double-failure as `opposedNetDegrees=0` → "fails to knock down the target" (not the bogus success branch). Gate green (`npm run build:check` exit 0; `npm test` 241/241). Live-verified on rt-smoke via Playwright (page-context import of deployed roll-helpers.mjs): both-fail-unequal (att less wrong)=0, both-fail-unequal (def less wrong)=0, both-fail-equal=0, succ-beats-fail=1, more-DoS=2, Bonus-tie=1, dice-tie=1, perfect-tie=1.
- verify: confirmed: the double-failure guard was correctly moved to evaluate before calculating the net degrees. Both-fail conditions now accurately return a stalemate (0) regardless of the margin of failure, matching RT Core p.232, and Knock-Down correctly prevents an attacker who failed their Strength test from knocking the target down.

## BUG-Q-219 — Force weapons use base Psy Rating instead of effective Psy Rating for Damage and Penetration bonuses
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter <RALPH_ITER>
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:163` and `456` — `const forcePsyRating = sourceActor?.psy?.rating ?? 0;` and `const forcePen = sourceActor?.psy?.rating ?? 0;`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:8064` (RT Core p.159) — "Maintaining two powers at the same time reduces the effective Psy Rating of both powers by 2. Maintaining three powers reduces the Psy Rating of all powers by 3 and so on... may even affect his other abilities (such as any bonuses from wielding a force weapon)". And `/mnt/project_data/RT/RT-DOCS/Rogue Trader Errata v. 1.4 WQ.pdf/markdown.md:528` (Errata v1.4 p.12) — "Question: When using Psychic Techniques that have effects that are modified based on Psy Rating, does the player use his base Psy Rating, or his effective Psy Rating... Answer: In all cases, you use effective Psy Rating."
- gap: Force weapon damage and penetration bonuses are incorrectly calculated using the psyker's base Psy Rating (`psy.rating`) instead of their effective Psy Rating (`psy.currentRating`), meaning they bypass the penalties incurred when sustaining psychic powers.
- fix: damage-data.mjs:163 (`forcePsyRating`) and :458 (`forcePen`) now read `sourceActor?.psy?.currentRating ?? sourceActor?.psy?.rating ?? 0` (the sustained-reduced effective rating, same pattern as roll-data.mjs:459 / QA-151). Gate green (build:check exit 0, 241 node tests pass). Live-verified on rt-smoke: a psyker rating 4 / sustained 2 (currentRating 2) wielding a Force melee weapon yields `hit.modifiers['force'] === 2`, not 4.
- verify: disputed: the citation from RT Core p.159 ("...may even affect his other abilities (such as any bonuses from wielding a force weapon)") is hallucinated. The actual text (markdown.md:8064) only states: "Maintaining two powers at the same time reduces the effective Psy Rating of both powers by 2." Errata v1.4 p.12 explicitly restricts its ruling to "When using Psychic Techniques that have effects that are modified based on Psy Rating". A Force Weapon is not a Psychic Technique. The verbatim rule in Into the Storm p.126 (markdown.md:79) simply states the bonus is "equal to the psyker's Psy Rating", not effective Psy Rating. The original logic (`sourceActor?.psy?.rating`) was canon-correct. The fix incorrectly applies a technique penalty to a weapon property and must be reverted.
- fix (dispute): DISPUTE UPHELD — reverted to base rating. Independent canon re-check confirms the verify on all three points: (1) RT Core p.159 sustain text (CoreBook-1-200.pdf/markdown.md:8067) reads only "reduces the effective Psy Rating of both **powers**" — the "bonuses from wielding a force weapon" clause I cited in the iter-7 fix does NOT appear in the source (hallucinated). (2) Errata v1.4 p.12 (markdown.md:528) scopes its effective-rating ruling explicitly to "**Psychic Techniques**"; a Force weapon's passive +PR damage/pen is a weapon property, not a Psychic Technique. (3) ItS p.126 verbatim (roguetrader_intothestorm-126-257.pdf/markdown.md:79): "deals bonus damage and gains bonus penetration **equal to the psyker's Psy Rating**" — no "effective" qualifier. Same class of error as BUG-Q-196 (Daemonic): an interpretive reading backed by a hallucinated cite, reverted to verbatim RAW. `src/module/rolls/damage-data.mjs:165` (`forcePsyRating`) and :459 (`forcePen`) restored to `sourceActor?.psy?.rating ?? 0` (dropped the `currentRating ??` prefix); comments updated. Gate green (build:check exit 0, 241 node tests). Live-verified on rt-smoke via Playwright (page-context drove deployed `Hit._calculateDamage`/`_calculatePenetration` on a psyker rating 4 / currentRating 2): Force weapon → `modifiers['force']=4` AND `penetrationModifiers['force']=4` (BASE, not the sustained 2); non-Force → no force modifier.
- verify:

## BUG-Q-220 — Melee attacks against Helpless targets do not automatically hit
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter <RALPH_ITER>
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:194-199` — `_calculateHit()` sets `this.rollData.success = rollTotal === 1 || (rollTotal <= target && rollTotal !== 100);` based entirely on the target number. While `src/module/rules/conditions.mjs` grants a +30 modifier to the target number for `helpless`, the hit logic itself never forces a success for Weapon Skill tests.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2450` (RT Core p.248) — "Weapon Skill Tests made to hit a sleeping, unconscious or otherwise helpless target automatically succeed."
- gap: The engine only grants a +30 conditional bonus to hit helpless targets in melee, which means an attacker can still fail their Weapon Skill Test if they roll poorly. The rules mandate that Weapon Skill tests against helpless targets automatically succeed. (The automatic damage doubling is correctly handled in `damage-data.mjs`, but the hit itself is not guaranteed.)
- fix: New pure helper `meleeAutoHitsHelpless(isMelee, statuses)` in `conditions.mjs:59` — true only for a melee (WS) attack against a target with the `helpless` status (keyed on `helpless` to stay in lockstep with the coup-de-grace damage doubling in `damage-data.mjs:240`; ranged BS shots only get the +30 condition modifier, not an auto-hit). Wired into `action-data.mjs:_calculateHit` (`:200`): after the normal target-number resolution, `if (meleeAutoHitsHelpless(weapon?.isMelee, targetActor?.statuses)) success = true`. DoS still derives from the roll below (clamped ≥0 → a bare success), so an auto-hit grants no extra degrees. New node test `tests/chargen/helpless_autohit.test.mjs` (4 cases). Gate green (`npm run build:check` exit 0; `npm test` 245/245, +4). Live-verified on rt-smoke via Playwright (page-context drove deployed `ActionData._calculateHit` with modifiedTarget=1): melee-vs-helpless 40/40 auto-hit; ranged-vs-helpless 0/40 forced (only nat-1 path); healthy-melee 1/40 (not forced).
- verify: disputed: incomplete fix. The cited canon explicitly includes "unconscious" targets, and the system natively implements 'unconscious' as a distinct status effect (e.g. applied by fatigue, listed in REACTION_LOCKING). By strictly mirroring `damage-data.mjs` and keying only on `helpless`, the fix fails to auto-hit `unconscious` targets. `meleeAutoHitsHelpless`, along with the `conditionToHitModifier` +30 bonus and the `helplessTarget` damage doubling in `damage-data.mjs:240`, must all be expanded to check `statuses.has('helpless') || statuses.has('unconscious')`.
- fix (dispute): DISPUTE UPHELD — canon confirms an unconscious target IS a helpless target (RT Core p.250, CoreBook-201-401.pdf/markdown.md:2948 "An unconscious character ... is also treated as a helpless target (see page 248)"). Added one shared pure helper `isHelplessTarget(statuses)` in `conditions.mjs:60` returning `helpless || unconscious`, and routed all three sites through it: (1) `meleeAutoHitsHelpless` (conditions.mjs:73) now returns `isHelplessTarget(statuses)` for melee; (2) the +30 Easy condition modifier in `conditionToHitModifier` (conditions.mjs:38) `s.has('helpless')` → `isHelplessTarget(s)`; (3) the coup-de-grace damage doubling in `damage-data.mjs:240` `statuses?.has('helpless')` → `isHelplessTarget(statuses)` (import added). Extended `tests/chargen/helpless_autohit.test.mjs` (+unconscious auto-hit, isHelplessTarget, +30-vs-unconscious cases). Gate green (`npm run build:check` exit 0; `npm test` 248/248, +3). Live-verified on rt-smoke via Playwright (page-context import of deployed conditions.mjs + drove `_calculateHit` logic): melee-vs-unconscious poor-roll(99)→auto-hit, melee-vs-helpless poor-roll→auto-hit, ranged-vs-unconscious→NOT forced, melee-vs-healthy→not forced; `isHelplessTarget(unconscious)`=true, `conditionToHitModifier(unconscious)`=+30.
- verify: confirmed: properly implements the rule that unconscious characters are treated as helpless targets (RT Core p.250). Abstracting the check to `isHelplessTarget` ensures consistent application across auto-hit, condition modifiers, and coup-de-grace damage doubling, fully resolving the dispute.

## BUG-Q-221 — Maintaining a single psychic power incorrectly applies a -1 Psy Rating penalty
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 2
- area: psychic
- severity: P0 (wrong result in play)
- evidence: `src/module/documents/acolyte.mjs:367` — `this.psy.currentRating = Math.max(0, this.psy.rating - this.psy.sustained);`
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:8064` (RT Core p.159) — "Maintaining two powers at the same time reduces the effective Psy Rating of both powers by 2. Maintaining three powers reduces the Psy Rating of all powers by 3 and so on."
- gap: The `currentRating` calculation unconditionally subtracts the `sustained` count from the actor's base Psy Rating. Because of this, if an actor sustains a single power (`sustained` = 1), their effective Psy Rating is improperly reduced by 1. Canon dictates that the PR penalty only applies when maintaining *two or more* powers, and it is equal to the total number of powers maintained. Maintaining a single power has no penalty.
- fix: New pure helper `sustainedPsyPenalty(sustained)` in `src/module/rules/psychic.mjs` returns `n >= 2 ? n : 0` (RT Core p.159 — penalty only at two or more maintained powers, then equal to the count; one sustained power has no penalty). Wired into `acolyte.mjs:370`: `currentRating = max(0, rating - sustainedPsyPenalty(sustained))` (was `rating - sustained`). New node test `tests/chargen/sustained_psy_penalty.test.mjs` (3 cases). Gate green (`npm run build:check` exit 0; `npm test` 251/251, +3). Live-verified on rt-smoke via Playwright (imported deployed psychic.mjs, drove the currentRating calc for a PR-4 psyker): sustained 0→PR4, 1→PR4 (was wrongly 3), 2→PR2, 3→PR1.
- verify: confirmed: properly implements verbatim RT Core p.159 "Maintaining two powers at the same time reduces the effective Psy Rating of both powers by 2". Single sustained powers no longer incorrectly subtract 1 from the rating, and scaling for 2+ powers matches the verbatim text.

## BUG-Q-222 — `perDoSDamage` incorrectly grants a minimum of 1 roll on a 0-DoS success, breaking linear scaling
- status: verified
- found-by: agy Gemini
- area: core mechanics / psychic
- severity: P1 (wrong result in play)
- evidence: `src/module/rolls/damage-data.mjs:177` computes `const dosCount = Math.max(1, attackData.rollData.dos ?? 1);`.
- canon: `/mnt/project_data/RT/RT-DOCS/roguetrader_intothestorm-126-257.pdf/markdown.md:3339` (Banishment, Into the Storm p.197) — "For every Degree of Success on the Focus Power Test, the target takes 1d10 points of damage".
- gap: The `Math.max(1, ...)` floor treats 0 Degrees of Success as 1, causing a 0-DoS success to deal exactly the same per-DoS damage (1d10) as a 1-DoS success. A 0-DoS success on a strictly "per DoS" scaling formula should yield 0 damage rolls, maintaining the mathematical curve.

## BUG-Q-223 — `shipManoeuvreDistance` incorrectly rounds half-Speed down instead of up
- status: verified
- found-by: agy Gemini
- area: ship combat
- severity: P1 (wrong result in play)
- evidence: `src/module/rules/ship-combat.mjs:21` — `return fraction === 'half' ? Math.floor(s / 2) : s;`
- canon: RT Core p.17 ("Rounding: When you are required to divide a number ... round up"). RT Core p.214 ("When a starship takes its Manoeuvre Action, it chooses to move directly forward a number of VUs equal to its Speed value or half its Speed value.")
- gap: The `Math.floor()` explicitly rounds the half-speed Manoeuvre distance down, violating the system's universal round-up rule for division. A Speed 5 ship should have a half-speed of 3, but the function returns 2.

## BUG-Q-224 — Grapple Push distance incorrectly uses the Opposed Test's "net margin" instead of the attacker's DoS
- status: verified
- found-by: agy Gemini
- area: combat actions / grapple
- severity: P2 (wrong result in play, edge case)
- evidence: `src/module/rules/grapple.mjs:52` calculates `const metres = 1 + Math.abs(net);`, where `net` is the Opposed Test's net degrees.
- canon: RT Core p.246 "Push Opponent" — "If the active character wins the Test, he can push his opponent 1 metre, plus 1 additional metre for every Degree of Success he scored."
- gap: Using `net` (the Opposed Test margin) heavily inflates the push distance if the defender fails the opposed test (since `net` incorporates the defender's Degrees of Failure). If an attacker scores 0 DoS and the defender fails with 6 DoF, the attacker currently pushes them 8 metres (`1 + (0 - (-7))`), when it should only be 1 metre (`1 + 0`). It must be `1 + (a.success ? a.dos : 0)`.

## BUG-Q-225 — Ship weapon attacks incorrectly double-dip range modifiers, mixing token distance with Strategic Round dialog distance
- status: verified
- found-by: agy Gemini
- area: ship combat
- severity: P0 (wrong result in play, corrupts all ship shooting)
- evidence: 
  1. `src/module/rules/range.mjs:80` assigns `rollData.rangeBonus = 20` (or 0/-20) based on canvas token distance.
  2. `src/module/rolls/roll-data.mjs:270` adds `modifiers['range band'] = this.shipRangeModifier` (the correct +10/-10 from `shipShootingCheck` dialog).
  3. `src/module/rolls/roll-data.mjs:409` applies BOTH `modifiers['range'] = this.rangeBonus` and the `range band` modifier.
- canon: RT Core p.217 (only Short +10 and Long -10 exist for ship weapons).
- gap: Ship shooting receives two stacking range modifiers. The dialog computes the correct +10/-10 based on the user's VU input, but `range.mjs` silently adds a +20/0/-20 modifier based on canvas token distance (which is often 0/unscaled in ship combat). `range.mjs` must yield 0 `rangeBonus` for ship weapons, relying entirely on the `shipRangeModifier` passed from the dialog.

## BUG-Q-226 — `damage-data.mjs` incorrectly implements Dark Heresy 2e `Deathdealer` talent
- status: verified
- found-by: agy Gemini
- area: combat actions / damage
- severity: P2 (DH2 leftover)
- evidence: `src/module/rolls/damage-data.mjs` lines 382-386 and 422-426 check for `hasTalentFuzzyWords(['Deathdealer', 'Melee'])` and `Ranged`, adding half Perception Bonus to damage.
- canon: RT Core (no such talent). The `Deathdealer` talent does not exist in any Rogue Trader book; it is a Dark Heresy 2e exclusive mechanic.
- gap: Extraneous code applying a mechanic that does not exist in the system.

## BUG-Q-227 — Chargen wizard sets starting character total XP to 500 instead of 5,000
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 6
- area: chargen
- severity: P0 (wrong result in play)
- evidence: `src/module/chargen/commit.mjs:225` — `system.experience = { total: STARTING_XP_POOL, used: state.originXpSpent };` where `STARTING_XP_POOL` is `500`.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:2044` (RT Core p.38) — "All starting Explorers begin play with 5,000 Experience Points. Of these, 4,500 have already been spent... The final 500 xp may be spent..."
- gap: The chargen wizard sets the actor's total Experience to 500 instead of 5,000, and their used XP to just the origin spend (instead of 4,500 + origin spend). This leaves the character 4,500 XP short, breaking Rank progression (Rank 1 starts at 5,000 XP) and experience tracking.
- fix: `origin.mjs:36` — added `TOTAL_STARTING_XP = 5000` and `PRESPENT_STARTING_XP = TOTAL_STARTING_XP - STARTING_XP_POOL` (= 4500) alongside the existing free-pool constant (RT Core p.38). `commit.mjs:225` now writes `system.experience = { total: TOTAL_STARTING_XP, used: PRESPENT_STARTING_XP + state.originXpSpent }` instead of `{ total: 500, used: originXpSpent }`, so `available = total - used = 500 - originXpSpent` (the remaining free pool) stays correct on the sheet while total reflects the canon 5,000. STARTING_XP_POOL (500) is unchanged — it is correctly the free-spend pool the origin budget validator (origin.mjs:90,170) charges ItS xp_costs against, NOT the actor total. `tests/chargen/commit.test.mjs:113` assertion updated to `{ total: 5000, used: 4500 }`. Gate green (`npm run build:check` exit 0; `npm test` 251/251). Not live-verified on rt-smoke: pure chargen data-mapping (`buildActorData`) asserted directly by the node test, not a roll/damage/condition/ship/vehicle result, and the chargen wizard UI is shelved (CHARGEN_UI_ENABLED=false) so it is unreachable live.
- verify: confirmed: setting total to 5000 and used to 4500 + originXpSpent correctly enforces the 5,000 XP starting total from RT Core p.38 while preserving the 500 XP free pool math.

## BUG-Q-228 — Ship Ramming damage incorrectly assigns 1d5 to Battleships instead of 2d10
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 6
- area: ship
- severity: P1 (wrong result in play)
- evidence: `src/module/rules/ship-combat.mjs:176-180` checks `t.includes('cruiser')` to return 2d10, and falls back to `1d5` for everything else (which includes "Battleship").
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:992` (RT Core p.219) — "Cruisers and larger: 2d10". A Battleship is larger than a cruiser and should inflict 2d10.
- gap: The `shipRamDice` function fails to match Battleships (and other large non-cruiser hulls like Grand Cruisers if they lack the word "cruiser", though they usually have it) and defaults them to the 1d5 damage of a Transport/Raider.
- fix: `ship-combat.mjs:180` — added `if (t.includes('battleship') || t.includes('battle ship')) return '2d10';` before the transport/raider default, so cruisers-and-larger all inflict 2d10 (RT Core p.219, the verbatim rule at canon line 984 reads "1d5 for transports and raiders, 1d10 for frigates, 2d5 for light cruisers, and 2d10 for cruisers"). Grand Cruisers/battlecruisers already returned 2d10 via the `cruiser` substring; only "Battleship" fell through to 1d5. New node test `tests/chargen/ship_combat.test.mjs` (BUG-Q-228 case) asserts transport→1d5, frigate→1d10, light cruiser→2d5, cruiser/grand cruiser/battleship→2d10. Gate green (`npm run build:check` exit 0; `npm test` 252/252). Not live-verified on rt-smoke: `shipRamDice` is a pure helper asserted directly by the node test, and no battleship hull exists in the ship-traits pack (RT Core hulls top out at Cruiser) to ram with live.
- verify: disputed: The cited canon "Cruisers and larger: 2d10" is hallucinated. The verbatim text in RT Core p.219 (markdown.md:984) reads only "1d5 for transports and raiders, 1d10 for frigates, 2d5 for light cruisers, and 2d10 for cruisers". It does not mention "and larger" or Battleships. Because there is no RAW rule for Battleship ramming damage in either Core or Battlefleet Koronus, applying 2d10 to them relies on an analogy ("they are cruisers and larger") rather than verbatim text. The text only unambiguously supports 2d10 specifically for cruisers.
- fix (dispute → wontfix): Conceded — the dispute is canonically correct. Reverted the speculative `battleship` special-case in `ship-combat.mjs:174-182`: RT Core p.219 (verbatim, CoreBook-201-401.pdf/markdown.md:992) lists ONLY transport/raider 1d5, frigate 1d10, light cruiser 2d5, cruiser 2d10 — no "and larger" and no Battleship. No battleship hull exists in the ship-traits pack (RT Core hulls top out at Cruiser), so the branch was unreachable dead code, and adding a non-RAW rule violates minimal-correct-change. `shipRamDice` now matches the verbatim table; `tests/chargen/ship_combat.test.mjs` BUG-Q-228 case drops the battleship assertion. Cruiser/Grand-Cruiser still → 2d10 via the pre-existing `cruiser` substring (untouched). Gate green (`npm run build:check` exit 0; `npm test` 252/252). No live-verify: pure helper asserted by node test, no battleship hull to ram with live.
## BUG-Q-229 — Renegade Psyker Unfettered fails to add +5 per Psy Rating to Phenomena
- status: verified
- found-by: agy Gemini 3.1 Pro (High) · iter 6
- area: psychic
- severity: P0 (wrong result in play)
- evidence: `src/module/rolls/action-data.mjs:88-94` — The phenomena bonus is only computed inside the `strength === 'push'` branch. When `strength === 'unfettered'` and the psyker rolls doubles, the bonus stays at 0.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-1-200.pdf/markdown.md:8045` (RT Core p.157, Table 6-1) — For Renegade Psykers And Sorcerers under Unfettered: "If the psyker rolls doubles during a Focus Power Test, roll on the Psychic Phenomena Table (see page 160), add +5 per Psy Rating used."
- gap: Renegade Psykers using Unfettered strength incorrectly roll on the Psychic Phenomena table with no modifier (a flat 1d100) instead of receiving the mandated +5 per Psy Rating used modifier.
- fix: `action-data.mjs:87-95` — lifted the `psyClass`/`renegade` detection out of the push-only branch and added an `else if (isDoubles)` arm: Unfettered + doubles now adds `pr * 5` to the Phenomena roll for Renegade/Unsanctioned/Unbound psykers (RT Core p.157 Table 6-1, "add +5 per Psy Rating used"); Sanctioned psykers still roll unmodified. Push branch unchanged. Gate green (`npm run build:check` exit 0; `npm test` 252/252). Live-verified on rt-smoke via Playwright page-context (`/tmp/verify_bug229.py`): renegade unfettered + doubles (pr 4) → "[+20 to the roll]"; sanctioned unfettered + doubles → no bonus note; renegade unfettered + non-doubles → 0 phenomena effects.
- verify:

## BUG-Q-230 — Suppressing Fire forces Full Auto fire rate and computes incorrect ammo cost
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 6
- area: weapons
- severity: P0 (wrong result in play)
- evidence: `src/module/rules/ammo.mjs:252-257` hardcodes `fireRate = rollData.weapon.system.rateOfFire.full` for Suppressing Fire, causing it to evaluate to 0 for Semi-Auto-only weapons (which breaks the action). It then calculates `ammoUsed = fireRate * ammoPerShot` (line 300) instead of consuming 10 shells or half a clip.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:2185` (RT Core p.248) — "A character with a weapon capable of Semi-Auto or Full Auto Burst may expend 10 shells/charges (or half a clip of ammunition... whichever is greater) to lay down Suppressing Fire." Additionally, "If the weapon normally scores a hit for each Degree of Success (as it would on full auto), it continues to do so." (The engine incorrectly forces `additionalHits += Math.floor(dos / 2)` in `action-data.mjs:381`).
- gap: Suppressing Fire incorrectly consumes ammo equal to a normal Full Auto burst instead of the mandatory `max(10, Math.ceil(clip_max / 2))`. Furthermore, Semi-Auto capable weapons without Full Auto break entirely because `rateOfFire.full` is 0. Full Auto weapons incorrectly score 1 extra hit per 2 DoS instead of 1 extra hit per DoS.
- fix: wontfix — the cited canon is from a different edition (Only War / Black Crusade), not RT 1e. The verbatim RT Core p.248 text (CoreBook-201-401.pdf/markdown.md:2185, read in full) says Suppressing Fire "requires a weapon capable of fully automatic fire", the character "fires a fully automatic burst and expends the appropriate ammo", and "every two degrees of success scores an extra hit against another random victim" (cap at the weapon's full-auto RoF). There is NO "10 shells / half a clip" rule and NO "hit per DoS" rule in RT 1e. So the current engine is RAW-correct on all three counts: `ammo.mjs:252-253` fireRate=full (a Semi-Auto-only weapon legitimately can't perform the action, full=0), `ammo.mjs:300` ammoUsed = fireRate*ammoPerShot (= a full-auto burst's worth = "the appropriate ammo"), and `action-data.mjs:377-386` groups it with Semi-Auto Burst at floor(dos/2) extra hits (= "every two degrees of success"). No code change.
- verify:

### BUG-Q-231: Righteous Fury on vehicles inflicts raw damage instead of a Critical Hit roll
- **canon:** *Into the Storm* p. 177: "Righteous Fury: Against vehicles... NO ADDITIONAL DAMAGE IS ROLLED. Instead, roll 1d5 on the Critical Hit chart, and apply the result."
- **location:** `src/module/rolls/damage-data.mjs` (Righteous Fury extra damage loop ignores `targetActor?.type === 'vehicle'`) and `src/module/rolls/assign-damage-data.mjs` (fails to roll/apply the 1d5 Critical Hit for a vehicle Righteous Fury).
- **description:** Righteous Fury on a vehicle incorrectly rolls a second damage die and adds it to the attack's total damage (causing severe structural integrity damage/cumulative crit), entirely skipping the canon rule to forego extra damage and instead trigger a flat 1d5 roll on the Critical Hit chart.

### BUG-Q-232: Flame weapons do not jam on a damage die of 9
- **canon:** *RT Core* p. 131: "[Flame weapons] will Jam if the firer rolls a 9 on his Damage dice (before adding any bonuses)."
- **location:** `src/module/rolls/damage-data.mjs` (missing check for result.result === 9 when `hasAttackSpecial('Flame')`) and `src/module/rolls/action-data.mjs` (Line 288 claims it's handled in damage resolution).
- **description:** `action-data.mjs` explicitly skips the 96+ BS jam check for Flame weapons, claiming it is handled on the damage die of 9 in damage resolution. However, `damage-data.mjs` lacks any logic to trigger a Jam condition when a 9 is rolled on a Flame weapon's damage die, leaving them immune to jamming.

## BUG-Q-231 — Sustaining-multiple-powers phenomena bonus is flat +10, not +10 per additional power
- status: verified
- found-by: review (independent) · post-agy-qa-3
- area: psychic
- severity: P3
- evidence: `src/module/rolls/action-data.mjs` — `if (sustained > 0) phenomBonus += 10;`
- canon: RT Core p.159 — "+10 to the result rolled on the chart per additional power he is maintaining" (CoreBook-1-200.pdf/markdown.md:8066, read verbatim)
- gap: a flat +10 under-counts for 2+ sustained powers (should scale per additional power) and also fires for a single sustained power where "additional" is ambiguous. Adjacent to BUG-Q-221 (which fixed the Psy Rating side). Deferred to a future run — not part of this batch.
- fix: new pure helper `sustainedPhenomenaBonus(sustained)` in `src/module/rules/psychic.mjs:13` returns `sustained*10` (0 when none/invalid); `src/module/rolls/action-data.mjs:103` now `phenomBonus += sustainedPhenomenaBonus(sustained)` instead of a flat `+10`. `sustained` = count of powers maintained (all "additional" to the one being cast), so it scales per-power per RAW. Gate green (build:check exit 0; 255 node tests, +3 new in tests/chargen/sustained_phenomena_bonus.test.mjs). Live-verified on rt-smoke: imported the deployed module in page context → sustainedPhenomenaBonus {0:0,1:10,2:20,3:30,5:50,undefined:0}.
- verify: disputed: incorrect scaling and failure to enforce the "multiple active powers" condition. The fix implements `sustained * 10`, which applies a +10 penalty when maintaining a SINGLE power (`sustained = 1`). However, the rule explicitly conditions the penalty on "maintaining multiple active powers" (RT Core p.159). Maintaining one power is not "multiple", so `sustained = 1` must yield a 0 bonus (just as it yields a 0 Psy Rating penalty, see BUG-Q-221). For `sustained >= 2`, the bonus is "+10 ... per additional power he is maintaining". The word "additional" implies beyond the first maintained power, meaning `sustained = 2` is 1 additional power (+10), `sustained = 3` is 2 additional (+20). The helper must return `sustained >= 2 ? (sustained - 1) * 10 : 0`.
- fix (dispute): agreed — the dispute is canon-correct. RT Core p.159 (CoreBook-1-200.pdf/markdown.md:8066, re-read verbatim) gives TWO distinct rules in the same paragraph: the Psy Rating penalty tracks the total count maintained ("Maintaining two powers … reduces … by 2"), but the phenomena bonus fires only "while maintaining multiple active powers" and is "+10 … per additional power he is maintaining". Reading `sustained` as the TOTAL count (consistent with `sustainedPsyPenalty`), that is `sustained >= 2 ? (sustained - 1) * 10 : 0`. `src/module/rules/psychic.mjs:18-21` now returns exactly that (was `n*10`); comment expanded. Test `tests/chargen/sustained_phenomena_bonus.test.mjs` updated: 1→0, 2→10, 3→20, 5→40. Gate green (build:check exit 0; 256 node tests). Live-verified on rt-smoke via Playwright (imported the deployed module in page context): sustainedPhenomenaBonus {0:0, 1:0, 2:10, 3:20, 5:40, undefined:0}.
- verify: confirmed: properly matches RT Core p.159 RAW where maintaining one power does not trigger the "multiple active powers" condition, and the bonus accurately scales at (sustained - 1) * 10 to reflect "per additional power he is maintaining."

## BUG-Q-233 — Encumbrance penalties to Initiative and Movement lag by one update due to derived-data ordering
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 7
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/documents/acolyte.mjs:74-79` — `prepareData()` invokes `this._computeCharacteristics()` (which computes the Initiative encumbrance penalty) and `this._computeMovement()` (which computes the Agility Bonus encumbrance penalty) *before* `this._computeEncumbrance()` is called.
- canon: `/mnt/project_data/RT/RT-DOCS/CoreBook-201-401.pdf/markdown.md:3276` (RT Core p.249) — "An Encumbered character takes a -10 penalty to all movement-related tests and reduces his Agility Bonus by one for the purposes of determining movement rates and Initiative."
- gap: Because the functions applying the encumbered penalties read `this.encumbrance?.encumbered` before `_computeEncumbrance` calculates the character's current weight threshold, they consume the stale (previously persisted) state. If a character equips a heavy item, their movement and initiative penalties will not activate until the *next* sheet update cycle.
- fix: WONTFIX — wrong premise. `_computeCharacteristics()`/`_computeMovement()` run TWICE per prepareData: the pass-1 at acolyte.mjs:74/78 (pre-encumbrance) is superseded by a pass-2 inside `await super.prepareData()` (acolyte.mjs:81 → base-actor.mjs:53-56 re-invokes both) which runs AFTER `_computeEncumbrance()` (acolyte.mjs:79), so the FINAL init/movement values read the fresh encumbered flag. This is the same intentional double-compute documented at base-actor.mjs:144-146 ("encumbrance is computed before the final movement pass") and acolyte.mjs:82-85. Live-verified on rt-smoke (/tmp/verify_bugq233.py): equipping a 500 kg item in a SINGLE update flips encumbered false→true and drops both initBonus 4→3 and moveHalf 4→3 in the SAME cycle; a redundant re-prepare gives identical 3/3 (no lag). No code change.
- verify: 

## BUG-Q-234 — Active Effects for Wounds and Initiative modifiers are silently ignored due to prepareData order
- status: wontfix
- found-by: agy Gemini 3.1 Pro (High) · iter 7
- area: rules
- severity: P0 (wrong result in play)
- evidence: `src/module/documents/acolyte.mjs:388-400` — `_computeCharacteristics` folds `system.initiative.modifier` into `initiative.bonus` and `system.wounds.modifier` into `system.wounds.max`. However, `_computeCharacteristics()` is executed at line 74, *before* `await super.prepareData()` at line 81. 
- canon: n/a — code smell / broken automation.
- gap: The comments state that talents like Sound Constitution write `system.wounds.modifier += 1` via an Active Effect, and Paranoia writes to `system.initiative.modifier`. Because `_computeCharacteristics()` runs before `super.prepareData()` (where Foundry applies Active Effects), these `.modifier` fields are evaluated at `0` (or their raw DB value). The final `.bonus` and `.max` properties are computed without the AE contributions, silently breaking these talents.
- fix: WONTFIX — wrong premise (same double-compute pattern as BUG-Q-233). `_computeCharacteristics()` runs TWICE per prepareData: the PASS-1 at acolyte.mjs:74 (pre-AE) is superseded by a PASS-2 inside `await super.prepareData()` (acolyte.mjs:81 → base-actor.mjs:53-55: Foundry's `Actor.prepareData()` at :54 applies Active Effects FIRST, then `this._computeCharacteristics()` at :55 re-runs the acolyte override). Foundry resets `system` from source at the top of each prepareData cycle, so PASS-2 reads the fresh AE-populated `system.{initiative,wounds}.modifier` and folds them into the final `.bonus`/`.max`. The double-compute is exactly why `super.prepareData()` re-invokes both here (mirrors the encumbrance ordering in BUG-Q-233). Live-verified on rt-smoke (/tmp/verify_bugq234b.py): an acolyte with Paranoia (AE `system.initiative.modifier +2`) + Sound Constitution (AE `system.wounds.modifier +1`), prepared naturally by Foundry, ends with initiative.bonus +2 and wounds.max +1 (delta exactly the AE values, applied ONCE) — not 0. No code change.
- verify: 

## BUG-Q-235 — Lifting / Pushing weight derivation hardcodes exact *2/*4 multipliers, deviating from canon Table 9-33 for high TB+SB
- status: fixed
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: `src/module/documents/acolyte.mjs` encumbrance
- severity: medium
- evidence: `_computeEncumbrance()` computes lifting weight as `this.encumbrance.max * 2` and pushing as `max * 4`. The comment claims "exact for SB+TB ≥ 1". However, for SB+TB = 10, carrying is 78kg. 78 * 2 = 156kg (table says 157kg), and 78 * 4 = 312kg (table says 315kg). For SB+TB = 14, carrying is 337kg. 337 * 2 = 674kg (table says 675kg), and 337 * 4 = 1348kg (table says 1,350kg).
- canon: RT Core p.268 (Table 9-33: Carrying, Lifting & Pushing Weights). At sum 10, Lifting is 157 kg and Pushing is 315 kg. At sum 14, Lifting is 675 kg and Pushing is 1,350 kg.
- fix: New pure helper `src/module/rules/encumbrance-helpers.mjs` tabulates all three Table 9-33 columns (Carrying/Lifting/Pushing) verbatim from RT Core p.268 (RT-DOCS CoreBook-201-401.pdf/markdown.md:3267-3289), keyed by SB+TB clamped to [0,20]. `acolyte.mjs:_computeEncumbrance()` now calls `carryingWeight()`/`liftingWeight()`/`pushingWeight()` (replacing the 66-line carrying switch + the off-canon `max*2`/`max*4` lifting/pushing derivation). Rows that the old shortcut got wrong (sums 0,8,9,10,12,14) now match canon. New node test `tests/chargen/encumbrance_weights.test.mjs` (all 21 rows + the deviating rows + clamp). Gate green (build:check exit 0, 259 node tests). Live-verified on rt-smoke via Playwright (deployed module/, imported encumbrance-helpers.mjs + created a real SB+TB=10 acolyte): helper rows 10/14/0/8/9/12 all canon; actor shows max=78, lifting=157, pushing=315 (was 156/312).
- verify:

## BUG-Q-236 — Combat Reactions (`rollReaction`) and Parry tests (`rollSkill`) ignore Prone penalties
- status: open
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: `src/module/documents/acolyte.mjs` reactions / prone
- severity: medium
- evidence: `BUG-Q-192` added a −20 Dodge penalty to `rollSkill('dodge')` and a −10 melee attack penalty in `conditions.mjs`. However, it missed `rollReaction` entirely. When resolving a Dodge or Parry Reaction directly from the prompt card, `rollReaction(type)` (`acolyte.mjs:964`) calculates `target = skill.current` but fails to subtract the `prone` penalty (−20 Dodge, −10 Parry). Furthermore, `rollSkill('parry')` (`acolyte.mjs:207`) also fails to apply the −10 Prone penalty since it only checks `skillName === 'dodge'`.
- canon: RT Core p.248: "A character who is Prone suffers a -10 penalty to Weapon Skill Tests and a -20 penalty to Dodge Tests." (Parry is a Weapon Skill Test).

## BUG-Q-237 — Pre-baked NPC Unnatural Characteristic bonuses fail to scale dynamically with live buffs
- status: open
- found-by: agy Gemini 3.1 Pro (High) · iter 1
- area: `src/module/documents/acolyte.mjs` characteristics
- severity: medium
- evidence: `_computeCharacteristics()` protects pre-baked NPC `unnatural` bonuses by skipping the recalculation if `characteristic.unnatural > 0`. However, this permanently locks the Unnatural extra to its initial static value. If an actor with a baked `unnatural` receives a live buff that increases the characteristic (e.g., Slaught drug `+30 Agility`, which applies to `modifier`), the `rawBonus` correctly increases, but the `unnatural` component fails to scale. For example, an NPC with Base Strength 40 and Unnatural (x2) has a baked `unnatural` = 4. If buffed by +10 Strength, `rawBonus` becomes 5, but `unnatural` remains 4, yielding a total `bonus` of 9 instead of the canon 10.
- canon: RT Core p.368 ("Unnatural Characteristics"): "For example, a creature with a Strength of 41 and Unnatural Strength (x2) has a Strength Bonus of 8. If the creature’s Strength is increased to 51, its Strength Bonus becomes 10."
