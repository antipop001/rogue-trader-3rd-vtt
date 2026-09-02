export function uuid() {
    const chars = '0123456789abcdef'.split('');

    let uuid = [],
        rnd = Math.random,
        r;
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4'; // version 4

    for (let i = 0; i < 36; i++) {
        if (!uuid[i]) {
            r = 0 | (rnd() * 16);

            uuid[i] = chars[i === 19 ? (r & 0x3) | 0x8 : r & 0xf];
        }
    }

    return uuid.join('');
}

export function getDegree(a, b) {
    return Math.floor(a / 10) - Math.floor(b / 10);
}

/**
 * Degrees of Success — RT Core p.22: "For each full 10 points by which the Characteristic
 * was exceeded, one degree of success is achieved." This is the BAND count
 * `floor((target − roll)/10)`, NOT the DH2 `1 + tens-digit-difference` (which over-counts by
 * 1, plus another 1 when the roll's units digit exceeds the target's). A bare success
 * (exceeded by < 10) is 0 DoS. Worked example: roll 18 vs Fellowship 42 → 2. (QA-094.)
 * @param {number} target  the modified Characteristic/skill score
 * @param {number} roll    the d100 result (assumed a success, i.e. roll ≤ target)
 * @returns {number} degrees of success (≥ 0)
 */
export function degreesOfSuccess(target, roll) {
    return Math.max(0, Math.floor((target - roll) / 10));
}

/**
 * Degrees of Failure — the symmetric band count `floor((roll − target)/10)` (RT Core p.22).
 * A bare failure (missed by < 10) is 0 DoF. (QA-094 — companion to the BUG-001 DoF fix,
 * now on the same band method as DoS.)
 * @param {number} target  the modified Characteristic/skill score
 * @param {number} roll    the d100 result (assumed a failure, i.e. roll > target)
 * @returns {number} degrees of failure (≥ 0)
 */
export function degreesOfFailure(target, roll) {
    return Math.max(0, Math.floor((roll - target) / 10));
}

/**
 * Psychic-Phenomena "doubles" detection on a Focus Power Test (RT Core p.157): doubles are
 * 11, 22, 33, 44, 55, 66, 77, 88, 99, and 00 — the latter being a d100 result of 100. A naive
 * string-identity test (`/^(.)\1+$/`) matches 11–99 but FAILS on 100 ("1","0","0" differ), so a
 * Phenomena-triggering 00 was silently missed. The matching values are exactly the two-digit
 * multiples of 11 plus 100. (BUG-Q-214.)
 * @param {number} total  the d100 Focus Power Test result (1–100)
 * @returns {boolean} true if the roll is doubles
 */
export function isPsychicDoubles(total) {
    const t = Number(total);
    if (!Number.isFinite(t)) return false;
    if (t === 100) return true;                  // 00
    return t >= 11 && t <= 99 && t % 11 === 0;   // 11, 22, … 99
}

/**
 * Astropath Transcendent Perils mitigation (RT Core p.159): "rolls an additional d10 when
 * rolling on the Perils of the Warp table and may discard any one d10 for a more favourable
 * result." Percentile dice are a tens d10 + a units d10; the extra d10 can stand in for
 * either, so there are three readings — discard the extra (tens,units), discard the tens
 * (extra fills tens), or discard the units (extra fills units). We keep the least severe
 * outcome (lowest result), where 00 reads as 100 (Destruction — the worst row, so it is
 * never chosen unless it is the only option). (BUG-Q-215.)
 * @param {number} tens   raw tens die digit, 0-9
 * @param {number} units  raw units die digit, 0-9
 * @param {number} extra  raw extra die digit, 0-9
 * @returns {number} the most-favourable Perils result, 1-100
 */
export function astropathPerilsResult(tens, units, extra) {
    const toPercent = (t, u) => {
        const v = ((Number(t) % 10) + 10) % 10 * 10 + ((Number(u) % 10) + 10) % 10;
        return v === 0 ? 100 : v;                 // 00 → 100 (Destruction)
    };
    return Math.min(
        toPercent(tens, units),  // discard the extra
        toPercent(extra, units), // discard the tens — extra fills the tens slot
        toPercent(tens, extra),  // discard the units — extra fills the units slot
    );
}

/**
 * Resolve a void-ship weapon attack as RT RAW (RT Core p.217-219): a SINGLE Ballistic Skill
 * test scores one hit plus one additional hit per Degree of Success, capped at the weapon's
 * Strength (the max hits). The shot is a Critical Hit when the DoS meets or exceeds the
 * weapon's Crit Rating. Replaces the homebrew "Strength independent 1d100 rolls" model
 * (QA-153) and the fixed "≤ target/10" crit threshold (QA-044).
 * @param {number} roll        the 1d100 result
 * @param {number} target      the modified BS target
 * @param {number} strength    weapon Strength = maximum hits
 * @param {number} critRating  weapon Crit Rating (DoS needed for a critical; 0 = never)
 * @returns {{hit:boolean, dos:number, hits:number, critical:boolean}}
 */
/**
 * "Shooting into Melee Combat" penalty (RT Core p.244): a Ballistic Skill test to hit a target
 * engaged in melee is Hard (−20). The penalty is IGNORED if any character engaged in that melee
 * (the target or an adjacent enemy) is Stunned, Helpless, or Unaware. (QA-156.)
 * @param {boolean} targetWaived           target is Stunned/Helpless/Unaware
 * @param {Array<{waived:boolean}>} adjacentEnemies  enemies of the target within melee range
 * @returns {number} the to-hit modifier (−20 or 0)
 */
export function shootingIntoMeleePenalty(targetWaived, adjacentEnemies) {
    const enemies = Array.isArray(adjacentEnemies) ? adjacentEnemies : [];
    if (enemies.length === 0) return 0;                 // target not engaged in melee
    if (targetWaived) return 0;                          // target Stunned/Helpless/Unaware
    if (enemies.some((e) => e?.waived)) return 0;        // an engaged meleer is Stunned/Helpless/Unaware
    return -20;
}

/**
 * The RT Damage state of a character (RT Core p.262). "Damage taken" is max Wounds minus
 * current Wounds; Critically Damaged means Damage IN EXCESS of Wounds — i.e. current Wounds
 * dropped below 0 (exactly 0 is damage EQUAL to Wounds, not in excess). (QA-093, BUG-Q-183.)
 * @returns {'Healthy'|'Lightly Damaged'|'Heavily Damaged'|'Critically Damaged'}
 */
export function woundDamageState(currentValue, maxValue, toughnessBonus) {
    const cur = Number(currentValue) || 0;
    const damageTaken = Math.max(0, (Number(maxValue) || 0) - cur);
    if (cur < 0) return 'Critically Damaged';
    if (damageTaken <= 0) return 'Healthy';
    if (damageTaken <= 2 * (Number(toughnessBonus) || 0)) return 'Lightly Damaged';
    return 'Heavily Damaged';
}

/**
 * Wounds removed by natural healing for a given Damage state + rest period (RT Core p.262):
 * Lightly — 1/day passively, or Toughness Bonus for a full day's bed rest. Heavily — 1/week,
 * or TB for a full week's complete rest. Critically — 1 Critical/week (needs medical care).
 * (QA-092.)
 * @param {string} state  woundDamageState() result
 * @param {number} toughnessBonus
 * @param {'day'|'week'} rest
 * @returns {number} Wounds recovered (≥ 0)
 */
export function woundRecovery(state, toughnessBonus, rest) {
    const tb = Math.max(0, Number(toughnessBonus) || 0);
    switch (state) {
        case 'Lightly Damaged': return rest === 'day' ? tb : tb * 7;    // bed-rest day = TB; a week = 7 days of bed rest
        case 'Heavily Damaged': return rest === 'week' ? tb : 0;        // heals 1/week only; a single day recovers nothing
        case 'Critically Damaged': return rest === 'week' ? 1 : 0;      // 1 Critical/week, day does nothing
        default: return 0;
    }
}

/**
 * The +mod to one side's Command Test in a void-ship boarding action (RT Core p.219-220):
 * +10 per full 10 Crew Population advantage, +10 per full 10 Hull Integrity advantage, and
 * +10 per point of that side's OWN turret rating. (QA-148.)
 * @param {{crew:number, hull:number, turrets:number}} self
 * @param {{crew:number, hull:number}} foe
 * @returns {number} the Command-Test bonus for `self`
 */
export function boardingCommandBonus(self, foe) {
    let mod = 10 * Math.max(0, Math.floor(Number(self.turrets) || 0));
    const crewAdv = (Number(self.crew) || 0) - (Number(foe.crew) || 0);
    if (crewAdv > 0) mod += 10 * Math.floor(crewAdv / 10);
    const hullAdv = (Number(self.hull) || 0) - (Number(foe.hull) || 0);
    if (hullAdv > 0) mod += 10 * Math.floor(hullAdv / 10);
    return mod;
}

/**
 * Combined Hull-Integrity damage for a void-ship salvo (RT Core p.216). Macrobatteries
 * combine all hits' rolled Damage into ONE total, then subtract the target's facing Armour
 * ONCE; if the result is ≤ 0 the Armour stopped it (0 Hull lost). Lances resolve each hit
 * separately and IGNORE Armour, so the total goes straight to Hull. (QA-042 — replaces the
 * fixed 1/2/4 per-hit tier constants.)
 * @param {number[]} perHitDamages  the rolled Damage (1d10 + bonus) for each non-shielded hit
 * @param {number} armour           the target's facing Armour
 * @param {boolean} ignoreArmour    true for lances (armour bypassed)
 * @returns {number} Hull Integrity points lost (≥ 0)
 */
export function voidshipHullDamage(perHitDamages, armour, ignoreArmour = false) {
    const total = (perHitDamages ?? []).reduce((a, b) => a + (Number(b) || 0), 0);
    if (ignoreArmour) return Math.max(0, total);
    return Math.max(0, total - (Number(armour) || 0));
}

export function voidshipWeaponHits(roll, target, strength, critRating, isLance = false) {
    if (roll === 100 || roll > target) return { hit: false, dos: 0, hits: 0, critical: false };
    const dos = degreesOfSuccess(target, roll);
    const maxHits = Math.max(1, Math.floor(Number(strength) || 1));
    // RT Core p.216: a macrobattery scores 1 hit + 1 per DoS; a LANCE scores 1 hit + 1 per
    // THREE DoS. Both are capped at the weapon's Strength. (QA-154.)
    const extraHits = isLance ? Math.floor(dos / 3) : dos;
    const hits = Math.min(1 + extraHits, maxHits);
    const cr = Math.floor(Number(critRating) || 0);
    const critical = cr > 0 && dos >= cr;
    return { hit: true, dos, hits, critical };
}

/**
 * The flat bonus added to a Stun defender's 1d10 (RT Core p.250): Toughness Bonus + 1 per
 * Armour Point protecting the head, with the head Armour Points DOUBLED when the attack is
 * unarmed or the weapon is Primitive. (QA-121.)
 * @param {number} headAp           head Armour Points (worn + Natural + cybernetic)
 * @param {number} toughnessBonus   the defender's Toughness Bonus
 * @param {boolean} unarmed         the attack is unarmed
 * @param {boolean} primitive       the weapon has the Primitive quality
 * @returns {number} the defender's flat bonus
 */
export function stunDefenceBonus(headAp, toughnessBonus, unarmed = false, primitive = false) {
    const ap = Math.max(0, Math.floor(Number(headAp) || 0));
    const tb = Math.max(0, Math.floor(Number(toughnessBonus) || 0));
    return tb + ap * (unarmed || primitive ? 2 : 1);
}

/**
 * Net degrees in an opposed test = attacker margin − defender margin, where each side's
 * margin is its DoS on a success and −(DoF + 1) on a failure (RT Core p.23 — a success
 * always beats a failure; among successes, more DoS wins; the +1 keeps a bare failure,
 * DoF 0, ranked below a bare success, DoS 0). MUST take the success flags now that a bare
 * success can have 0 DoS under the canon band method (QA-094) — `dos > 0` no longer means
 * "succeeded". Positive = attacker wins; ≥ 2 = wins by two or more degrees.
 * @returns {number} net degrees (attacker positive)
 */
export function getOpposedDegrees(success, dos, dof, opposedSuccess, opposedDos, opposedDof) {
    const attacker = success ? dos : -((dof ?? 0) + 1);
    const defender = opposedSuccess ? opposedDos : -((opposedDof ?? 0) + 1);
    return attacker - defender;
}

/**
 * Net Degrees of an Opposed Test with the full RT Core p.232 tiebreak chain applied
 * (BUG-Q-218 / QA-106): "Whoever succeeds wins. If both succeed, the one with the most
 * degrees of success wins. If the degrees of success are the same, the highest
 * Characteristic Bonus wins. If the result is still a tie, the lowest dice roll wins."
 * Two failures are ALWAYS a stalemate (0, nobody wins — RT Core: "either there is a stalemate
 * and nothing happens or both parties re-roll"), checked first. Otherwise it builds on
 * {@link getOpposedDegrees} for the cross success/failure magnitude, then breaks an exact net
 * of 0 — which can now ONLY be two equal-DoS successes — by Characteristic Bonus → lower dice
 * roll (returning ±1, a bare tiebreak win). A perfect tie (equal DoS, Bonus, and dice roll)
 * defaults to the active character (the attacker).
 * @param {{success:boolean, dos:number, dof:number, bonus:number, roll:number}} a attacker
 * @param {{success:boolean, dos:number, dof:number, bonus:number, roll:number}} d defender
 * @returns {number} attacker's net degrees: >0 attacker wins, <0 defender wins, 0 stalemate
 */
export function getOpposedDegreesWithTiebreak(a, d) {
    // RT Core p.232: "Should both parties fail, one of two things occurs. Either there is a
    // stalemate and nothing happens or both parties should re-roll." A double failure is NEVER
    // a win for the "less wrong" side, so short-circuit to a stalemate BEFORE consulting the
    // signed magnitude — otherwise a fail-by-0 vs fail-by-2 would net +2 and wrongly win.
    if (!a.success && !d.success) return 0;
    const net = getOpposedDegrees(a.success, a.dos, a.dof, d.success, d.dos, d.dof);
    if (net !== 0) return net;
    // net === 0 with at least one success ⇒ two equal-DoS successes: apply the tiebreak chain.
    const aBonus = Number(a.bonus) || 0, dBonus = Number(d.bonus) || 0;
    if (aBonus !== dBonus) return aBonus > dBonus ? 1 : -1;
    const aRoll = Number(a.roll) || 0, dRoll = Number(d.roll) || 0;
    if (aRoll !== dRoll) return aRoll < dRoll ? 1 : -1;
    return 1; // perfect tie → the active character (attacker) wins
}

/**
 * Normalise a psychic-power range into a number of metres. Powers store `range`
 * as prose — "5m x Psy Rating", "1km x Psy Rating", "10m", "Self", "Gaze",
 * "1 VU x Willpower Bonus", "Personal (1m x Psy Rating)" — which Foundry's `Roll()`
 * cannot evaluate (it would throw and fall back to 0). This parses the magnitude,
 * unit, and any per-stat multiplier instead. (BUG-006.)
 *
 * @param {string|number} raw  the power's `system.range`
 * @param {{pr?: number, actor?: any}} [ctx]  effective Psy Rating + caster actor
 * @returns {number} range in metres (0 = self / no positional range)
 */
export function normalizePsychicRange(raw, ctx = {}) {
    if (raw == null || raw === '') return 0;
    if (Number.isInteger(raw)) return raw;
    const s = String(raw).toLowerCase().trim();
    const hasDigit = /\d/.test(s);
    // Self-targeted / no positional range.
    if (!hasDigit && /\b(self|personal|touch)\b/.test(s)) return 0;
    // Line-of-sight powers ("Gaze", "any person he can see") — effectively unbounded.
    if (!hasDigit && /(gaze|line of sight|can see|sight)/.test(s)) return Number.MAX_SAFE_INTEGER;
    const m = s.match(/(\d+(?:\.\d+)?)\s*(km|vu|m)?/);
    if (!m) return 0;
    let value = parseFloat(m[1]);
    if (m[2] === 'km') value *= 1000;            // 'm'/'vu' keep their magnitude
    if (/psy rating/.test(s)) value *= (ctx.pr ?? 1);
    if (/willpower bonus/.test(s)) value *= (ctx.actor?.characteristics?.willpower?.bonus ?? 1);
    return Math.floor(value);
}

/**
 * Weapon Master (and any future weapon-class conditional talent) bonus. RT Core p.73
 * (Weapon Master, Arch-militant): "Choose one (and only one) class of weapon. When
 * wielding a weapon of that chosen class in combat, the Arch-militant gains +10 to
 * hit, +2 damage, and +2 Initiative." The chosen class is stored on the talent's
 * `system.choice` (and appended to the item name, so name-exact `hasTalent('Weapon
 * Master')` does NOT match) — scan by name substring + compare `choice` to the
 * wielded weapon's `class`. (BUG-003.)
 *
 * @param {Array<{name?: string, system?: {choice?: string}}>} talents  actor talent items
 * @param {string} weaponClass  wielded weapon's `system.class` (Pistol/Basic/Heavy/Melee/Thrown)
 * @returns {{toHit: number, damage: number, initiative: number}} bonus (all 0 if no match)
 */
export function weaponMasterBonus(talents, weaponClass) {
    const out = { toHit: 0, damage: 0, initiative: 0 };
    if (!Array.isArray(talents) || !weaponClass) return out;
    const wc = String(weaponClass).toLowerCase();
    for (const t of talents) {
        if (!t?.name || !/weapon master/i.test(t.name)) continue;
        const choice = t.system?.choice;
        if (!choice || String(choice).toLowerCase() !== wc) continue;
        out.toHit += 10;
        out.damage += 2;
        out.initiative += 2;
    }
    return out;
}

/**
 * Lightning Reflexes (RT Core p.110): "The character adds twice his Agility Bonus
 * when rolling for Initiative. If he has Unnatural Agility, add +1 to the multiplier
 * before factoring the bonus into the Initiative roll." So the governing-characteristic
 * contribution to Initiative becomes the raw Agility Bonus times (Unnatural multiplier +
 * 1), REPLACING the normal single bonus (which itself already folds in the Unnatural
 * addition — multiplying that would double-count). With no Unnatural the multiplier is 1,
 * so the term is ×2 the raw bonus; with Unnatural Agility (×N) it is ×(N+1) — the canon
 * "+1 to the multiplier" scales off the actual Unnatural level, NOT a fixed ×3 (BUG-Q-188).
 * A fixed ×3 under-counts for Unnatural Agility (×3)/(×4): the normal bonus is already
 * rawBonus×N, so ×3 would tie (N=3) or LOSE (N=4) — a talent must never reduce Initiative.
 * Without the talent the normal bonus is returned unchanged. AE can't express this (it must
 * read AgB), so it is computed in acolyte.mjs by name and must NOT also be given an AE.
 *
 * @param {number} rawBonus  tens-digit characteristic bonus (Math.floor(total/10), no unnatural)
 * @param {number} normalBonus  the full characteristic bonus (raw + unnatural) used by default
 * @param {boolean} hasLightningReflexes  whether the actor has the talent
 * @param {number} unnaturalMult  the Unnatural multiplier on the governing characteristic (≥2, else 1/falsy)
 * @returns {number} the characteristic contribution to the Initiative bonus
 */
export function initiativeCharBonus(rawBonus, normalBonus, hasLightningReflexes, unnaturalMult) {
    if (!hasLightningReflexes) return normalBonus;
    const mult = Number(unnaturalMult) >= 2 ? Number(unnaturalMult) : 1;
    return rawBonus * (mult + 1);
}

/**
 * Maximum Wounds = the rolled/stored base plus any additive modifier written by an
 * effect (mirror of Initiative's additive `modifier` term — BUG-002). `wounds.max` is a
 * stored value (set at chargen / by the NPC pipeline) and is NOT otherwise recomputed in
 * derived data, so folding the modifier in here is idempotent across prepareData cycles
 * (source resets each cycle; the AE only touches `wounds.modifier`). This makes Wounds
 * generally effect-addressable: Sound Constitution (+1 each instance, stackable; RT Core
 * p.111) writes `system.wounds.modifier += 1` via an ActiveEffect.
 *
 * @param {number} base  the stored/rolled wounds maximum (system.wounds.max from source)
 * @param {number} modifier  the additive effect modifier (system.wounds.modifier)
 * @returns {number} the effective maximum Wounds
 */
export function woundsMax(base, modifier) {
    return (Number(base) || 0) + (Number(modifier) || 0);
}

/**
 * Resolve the rolled/stored Wounds BASE from the actor's immutable source data.
 * Wounds Max is now fully derived (base + modifier), so `system.wounds.base` is the
 * single editable field. Actors/NPCs created before the `base` field stored the rolled
 * value in `system.wounds.max`; when `base` is absent from source, fall back to the
 * source `max` (the sheet's Base input then persists it on the next save — lazy migration).
 *
 * @param {number|string|null|undefined} srcBase  _source.system.wounds.base
 * @param {number|string|null|undefined} srcMax   _source.system.wounds.max (legacy)
 * @returns {number} the base Wounds before effect modifiers
 */
export function woundsBase(srcBase, srcMax) {
    // A character can never have 0 base Wounds, AND adding the `base` field to template.json
    // makes Foundry back-fill the default (0) into every existing actor's stored source — so a
    // stored `base` of 0 (or missing/negative) means "not yet migrated": fall back to the legacy
    // source `max` (where pre-`base` actors/NPCs kept the rolled value). Once a real base (>0) is
    // stored — by chargen or the sheet's Base input — it wins and the legacy max is ignored.
    const b = Number(srcBase) || 0;
    return b > 0 ? b : (Number(srcMax) || 0);
}

/**
 * Crack Shot / Crippling Strike crit-damage bonus (RT Core p.96). Crack Shot: "When
 * his ranged attack causes Critical Damage, add +2 to the Damage." Crippling Strike:
 * "When the character's melee attack causes Critical Damage, add +4 Damage." These are
 * context-gated on the attack actually causing Critical Damage (resolved at assign-damage
 * time against the target's Wounds/armour), so they are NOT ActiveEffects — the engine
 * applies them by name. This pure helper returns the extra crit Damage; the gate on
 * "did it crit" lives in assign-damage-data.mjs. Names carry no `system.choice`, so an
 * exact (case-insensitive) name match is correct.
 *
 * @param {Array<{name?: string}>} talents  actor talent items
 * @param {boolean} isMelee  the attack used a melee weapon
 * @param {boolean} isRanged  the attack used a ranged weapon
 * @returns {number} extra Critical Damage to add when the attack causes a crit (0 if none)
 */
export function critDamageBonus(talents, isMelee, isRanged) {
    if (!Array.isArray(talents)) return 0;
    const has = (name) => talents.some((t) => t?.name && String(t.name).toLowerCase() === name);
    let bonus = 0;
    if (isMelee && has('crippling strike')) bonus += 4;
    if (isRanged && has('crack shot')) bonus += 2;
    return bonus;
}

/**
 * Brutal Charge (trait) extra Damage (RT Core p.364): "A creature with this Trait deals
 * an extra 3 points of damage with attacks made while charging." Gated on the attack
 * using the Charge combat action (a melee Full Action), so it is NOT an ActiveEffect —
 * the engine applies it by trait name on the melee damage path. `hasTalent` only matches
 * `type==='talent'`, so the caller passes the actor's TRAIT items here. Exact
 * (case-insensitive) name match — the trait carries no `system.choice`.
 *
 * @param {Array<{name?: string}>} traits  actor trait items
 * @param {string} action  the combat action name (`attackData.rollData.action`)
 * @returns {number} extra Damage to add (3 on a Charge with the trait, else 0)
 */
export function brutalChargeBonus(traits, action) {
    if (!Array.isArray(traits) || String(action) !== 'Charge') return 0;
    const has = traits.some((t) => t?.name && String(t.name).toLowerCase() === 'brutal charge');
    return has ? 3 : 0;
}

/**
 * Swift Attack / Lightning Attack — RT 1e melee multi-attack TALENTS (not actions).
 * RT Core p.107 (Swift Attack): "As a Full Action, he may make TWO melee attacks on his
 * Turn." RT Core p.102 (Lightning Attack): "As a Full Action, the character may make
 * THREE melee attacks ... The effects of this Talent replace those of Swift Attack." So
 * the bonus is a FLAT number of additional hits — Swift = 1 extra (two total), Lightning
 * = 2 extra (three total) — NOT the DoS-scaled count the legacy DH2 action used. The
 * talents are surfaced as melee Full-Action options only when the actor owns them
 * (updateAvailableCombatActions), and the additional-hit count is applied by action name
 * on the attack hit path — so these are engine-handled (no AE; double-apply guard).
 *
 * @param {string} action  the combat action name (`rollData.action`)
 * @returns {number} flat extra melee hits (1 Swift, 2 Lightning, else 0)
 */
export function attackTalentExtraHits(action) {
    switch (String(action)) {
        case 'Swift Attack':
            return 1;
        case 'Lightning Attack':
            return 2;
        default:
            return 0;
    }
}

/**
 * Reaction budget per Round (RT Core p.244): a character gets ONE Reaction each Round
 * by default, spent on either a Dodge or a Parry. Two talents grant a SECOND, type-locked
 * Reaction — Step Aside (RT Core p.119): "He may make an additional Dodge once per Round
 * ... a second Reaction that may only be used to Dodge"; Wall of Steel (RT Core p.121):
 * "He may make one additional Parry per Round ... a second Reaction that may only be used
 * to Parry." So the per-Round MAXIMUM number of Dodges = 1 (the base Reaction, if spent
 * on Dodge) + Step Aside; the maximum Parries = 1 + Wall of Steel. The base Reaction is
 * shared (you cannot both Dodge and Parry off it in one Round) — enforcing that, and
 * tracking how many Reactions have been USED this Round (reset on the actor's turn), is
 * the combat-state half of ENGINE-REACTION-BUDGET (no per-Round tracker exists yet).
 * `hasTalent` only matches `type==='talent'`, so callers pass the actor's talent items.
 * Engine-applied by name — must NOT also be given an ActiveEffect (double-apply guard).
 *
 * @param {Array<{name?: string}>} talents  actor talent items
 * @returns {{base: number, dodge: number, parry: number}} per-Round Reaction maxima
 */
export function reactionBudget(talents) {
    const base = 1;
    const has = (name) => Array.isArray(talents)
        && talents.some((t) => t?.name && String(t.name).toLowerCase() === name);
    // Generic "+1 Reaction per Round" sources (usable as EITHER Dodge or Parry) accumulate
    // in `modifier`; per-type sources bump only their own pool. (QA-160.)
    let modifier = 0;
    if (has('hyperactive nymune organ')) modifier += 1;
    return {
        base,
        modifier,
        dodge: base + (has('step aside') ? 1 : 0),
        parry: base + (has('wall of steel') ? 1 : 0),
    };
}

/**
 * Can a Dodge/Parry Reaction still be spent this Round, given the per-Round budget
 * (from {@link reactionBudget}) and how many have already been USED? RT Core p.244: a
 * character receives ONE Reaction each Round, spent on either a Dodge OR a Parry — the
 * base Reaction is SHARED. Step Aside (p.119) adds a second, Dodge-only Reaction; Wall
 * of Steel (p.121) a second, Parry-only one. So even though each type has its own cap
 * (`dodge.max` / `parry.max`), the per-Round TOTAL is capped at `dodge.max + parry.max −
 * base` (subtract the shared base once) — you cannot, e.g., both Dodge and Parry off the
 * single base Reaction. Returns false once either the overall budget OR the per-type cap
 * is exhausted. Pure helper for ENGINE-REACTION-BUDGET-TRACK; the spend/reset that
 * mutates `system.combat.reactions.<type>.value` is the Foundry-coupled half
 * (`acolyte.rollSkill` + combat-tracker reset, E2E follow-up).
 *
 * @param {{base?:number, dodge?:{max?:number,value?:number}, parry?:{max?:number,value?:number}}} reactions
 * @param {'dodge'|'parry'} type  the Reaction being attempted
 * @returns {boolean} true if a Reaction of `type` is available this Round
 */
export function canSpendReaction(reactions, type) {
    if (!reactions || (type !== 'dodge' && type !== 'parry')) return false;
    const base = reactions.base ?? 1;
    const dMax = reactions.dodge?.max ?? base;
    const pMax = reactions.parry?.max ?? base;
    const dVal = reactions.dodge?.value ?? 0;
    const pVal = reactions.parry?.value ?? 0;
    const mod = reactions.modifier ?? 0;
    // dMax/pMax each bake in `mod` (so the extra is usable as either type), so subtract it
    // once here — a "+1 Reaction" must raise the SHARED total by 1, not 2. (QA-160.)
    const totalMax = dMax + pMax - base - mod;     // shared base + modifier ⇒ counted once
    if (dVal + pVal >= totalMax) return false;      // overall per-Round budget spent
    const slotVal = type === 'dodge' ? dVal : pVal;
    const slotMax = type === 'dodge' ? dMax : pMax;
    return slotVal < slotMax;                        // type-specific cap
}

/**
 * Extra-ATTACK post-resolution triggers (ENGINE-REACTION-ATTACK-TRIG). Three talents
 * grant an ADDITIONAL attack gated on a specific prior outcome — distinct from the
 * Reaction budget ({@link reactionBudget}), these fire on the result of an action:
 *
 *  - Counter Attack (RT Core p.115): after SUCCESSFULLY Parrying an opponent's attack,
 *    "he may immediately make an attack against that opponent using the Parry weapon as
 *    a Free Action. This attack suffers a -20 penalty." (Free Action — does NOT spend a
 *    Reaction.)
 *  - Furious Assault (RT Core p.117): "If he successfully hits his target using the All
 *    Out Attack Action, he may spend his Reaction to make an additional attack using the
 *    same bonuses or penalties as the original attack." (Spends a Reaction.)
 *  - WAAAGH! (Into the Storm p.173): same as Furious Assault but on a successful Charge
 *    Action hit. (Spends a Reaction.)
 *
 * No apply point exists yet — the attack flow doesn't surface "you may make a free attack
 * now". This pure helper answers WHICH triggers are eligible given the prior outcome; the
 * Foundry-coupled half (a prompt/button on the result card that rolls the extra attack, and
 * the Reaction spend for Furious Assault/WAAAGH! via {@link canSpendReaction}) is the E2E
 * follow-up. Engine-applied by name — these talents must NOT also be given an ActiveEffect.
 * `hasTalent` matches `type==='talent'`, so callers pass the actor's talent items.
 *
 * @param {Array<{name?: string}>} talents  attacker talent items
 * @param {{action?: string, hit?: boolean, parrySuccess?: boolean}} [ctx]
 *        action = the resolved combat action name; hit = the attack succeeded;
 *        parrySuccess = a Parry Reaction just succeeded.
 * @returns {Array<{talent: string, trigger: string, cost: string, toHitMod: number}>}
 *          eligible extra-attack triggers (empty when none apply)
 */
export function extraAttackEligibility(talents, ctx = {}) {
    const out = [];
    const has = (name) => Array.isArray(talents)
        && talents.some((t) => t?.name && String(t.name).toLowerCase() === name);
    const action = String(ctx.action ?? '');
    // Counter Attack — triggers off a SUCCESSFUL Parry (a Free Action attack at -20),
    // independent of which attack action the original was.
    if (ctx.parrySuccess && has('counter attack')) {
        out.push({ talent: 'Counter Attack', trigger: 'parry', cost: 'Free Action', toHitMod: -20 });
    }
    // Furious Assault — a successful hit using the All Out Attack action; spends a Reaction.
    if (ctx.hit && action === 'All Out Attack' && has('furious assault')) {
        out.push({ talent: 'Furious Assault', trigger: 'allOutAttack', cost: 'Reaction', toHitMod: 0 });
    }
    // WAAAGH! — a successful hit using the Charge action; spends a Reaction.
    if (ctx.hit && action === 'Charge' && has('waaagh!')) {
        out.push({ talent: 'WAAAGH!', trigger: 'charge', cost: 'Reaction', toHitMod: 0 });
    }
    return out;
}

/**
 * Quadruped (RT Core p.366) movement multiplier. "To calculate their movement, double
 * their Agility Bonus. ... Creatures with more than four legs may gain this Trait, but
 * they increase the Agility Bonus by 1 multiplier for every extra set of legs (six legs
 * equals AB × 3, eight legs AB × 4, and so on)." Table 13-2 summarises it as "Movement
 * equals AB×2". So a Quadruped scales only the Agility-Bonus term of the movement formula
 * (the size modifier stays additive). The multiplier is the trait's: plain `Quadruped` →
 * ×2; an explicit `(xN)` in the name → N; an `(N legs)` count → N/2 (4 legs ×2, 6 ×3,
 * 8 ×4). Trait-gated and engine-applied by name (NOT an AE — the value scales the derived
 * Agility Bonus, which an AE can't read) so the trait must NOT also be given an AE; movement
 * is fully computed in `_computeMovement` (never baked), so this never double-counts.
 * `hasTalent` only matches talents — callers pass the actor's TRAIT items.
 *
 * @param {Array<{name?: string}>} traits  actor trait items
 * @returns {number} Agility-Bonus multiplier for movement (1 when no Quadruped trait)
 */
export function quadrupedMoveMultiplier(traits) {
    if (!Array.isArray(traits)) return 1;
    for (const t of traits) {
        const name = t?.name;
        if (!name || !/^\s*quadruped\b/i.test(name)) continue;
        const xMatch = name.match(/\(\s*[x×]\s*(\d+)\s*\)/i);
        if (xMatch) return Math.max(2, parseInt(xMatch[1], 10));
        const legMatch = name.match(/\(\s*(\d+)\s*legs?\s*\)/i);
        if (legMatch) return Math.max(2, Math.floor(parseInt(legMatch[1], 10) / 2));
        return 2;
    }
    return 1;
}

/**
 * RT Core p.364-366 movement-replacing traits. Flyer (N) and Hoverer (N) REPLACE the
 * Agility-Bonus term of movement with their listed speed N ("This number replaces your
 * agility bonus for Movement Actions"). Crawler moves at HALF the Agility Bonus. The
 * number rides in the trait NAME across a range of formats seen in the bestiary packs —
 * "Flyer (12)", "Hoverer 6", "Flyer (2) (Null gravity conditions only)", the multiplier
 * form "Flyer (AB x2)", or a bare "Hoverer"/"Crawler" with no number. Trait-gated and
 * engine-applied by name (NOT an AE — the value replaces the derived Agility Bonus, which
 * an AE can't read); movement is fully computed in `_computeMovement` so this never
 * double-counts. Flyer/Hoverer take precedence over Crawler when both are present.
 * Returns:
 *   - {mode:'flyer'|'hoverer', value:N}       — replace the Agility Bonus with N
 *   - {mode:'flyer'|'hoverer', multiplier:N}  — multiply the Agility Bonus by N ("AB x2")
 *   - {mode:'flyer'|'hoverer'}                — bare trait, no fixed speed (keep natural AgB)
 *   - {mode:'crawler'}                        — halve the Agility Bonus
 *   - {mode:null}                             — no movement-replacing trait
 * @param {Array<{name?: string}>} traits  actor trait items
 * @returns {{mode: ('flyer'|'hoverer'|'crawler'|null), value?: number, multiplier?: number}}
 */
export function movementTraitOverride(traits) {
    if (!Array.isArray(traits)) return { mode: null };
    let flyer = null;
    let crawler = false;
    for (const t of traits) {
        const name = String(t?.name || '');
        if (/^\s*(flyer|hoverer)\b/i.test(name)) {
            const mode = /^\s*flyer/i.test(name) ? 'flyer' : 'hoverer';
            // "(AB x2)"/"x2" is a multiplier on the Agility Bonus; a bare number replaces it.
            const multMatch = name.match(/[x×]\s*(\d+)/i);
            const numMatch = name.match(/(\d+)/);
            if (multMatch) flyer = { mode, multiplier: Math.max(1, parseInt(multMatch[1], 10)) };
            else if (numMatch) flyer = { mode, value: Math.max(0, parseInt(numMatch[1], 10)) };
            else flyer = { mode };
        } else if (/^\s*crawler\b/i.test(name)) {
            crawler = true;
        }
    }
    if (flyer) return flyer;
    if (crawler) return { mode: 'crawler' };
    return { mode: null };
}

/**
 * Unnatural Characteristic (RT Core p.368) multipliers. "Each time this Trait is
 * gained, select a Characteristic, and double its bonus. ... one selection multiplies
 * the Characteristic Bonus by ×2, two selections by ×3, and three selections by ×4."
 * An instantiated trait carries the characteristic + multiplier in its NAME — e.g.
 * "Unnatural Toughness (x2)", "Unnatural Strength (x3)", or just "Unnatural Perception"
 * (no parens ⇒ ×2). This parses those into a map of lowercased characteristic LABEL
 * (matching `characteristic.label`, e.g. "weapon skill") → multiplier (≥2), so the
 * engine can derive `.unnatural` for actors that carry the trait but have no pre-baked
 * value. The generic "Unnatural Characteristic" (no chosen target in the data),
 * "Unnatural Speed" (movement only) and "Unnatural Senses" (sensory) are NOT
 * characteristic multipliers and are skipped. RT Core p.368 also notes movement uses
 * the UNMODIFIED Agility Bonus — the caller must not feed this into movement.
 *
 * Engine-applied by name in acolyte._computeCharacteristics (SET-when-unset only — the
 * NPC pipeline pre-bakes the additive into `.unnatural`, so deriving it from the trait
 * when a value is already present would double-apply). The matched traits must NOT also
 * be given an ActiveEffect. ENGINE-UNNATURAL-CHARS. Callers pass the actor's TRAIT items.
 *
 * @param {Array<{name?: string}>} traits  actor trait items
 * @returns {Object<string, number>} lowercased characteristic label → multiplier (≥2)
 */
export function unnaturalCharacteristicMultipliers(traits) {
    const out = {};
    if (!Array.isArray(traits)) return out;
    for (const t of traits) {
        const name = t?.name;
        if (!name) continue;
        // "Unnatural <Characteristic> (xN)" — the (xN) is optional and defaults to ×2.
        const m = String(name).match(/^\s*unnatural\s+(.+?)\s*(?:\(\s*[x×]\s*(\d+)\s*\)\s*)?$/i);
        if (!m) continue;
        const label = m[1].trim().toLowerCase();
        if (label === 'characteristic' || label === 'speed' || label === 'senses') continue;
        const mult = m[2] ? Math.max(2, parseInt(m[2], 10)) : 2;
        out[label] = Math.max(out[label] ?? 0, mult);
    }
    return out;
}

/**
 * RT Core p.368 ("Unnatural Characteristics"): an Unnatural Characteristic (xN) multiplies
 * the Characteristic Bonus by N, and — crucially — that multiplier applies to the CURRENT
 * bonus, so it scales when the Characteristic is raised (the book's example: Strength 41 with
 * Unnatural Strength (x2) → SB 8; raise to 51 → SB 10). Returns the *extra* additive Unnatural
 * bonus (i.e. `liveRawBonus × (N − 1)`) to add on top of the natural bonus.
 *
 * Two sources of the multiplier:
 *  - `traitMult` — parsed from an "Unnatural <Char> (xN)" trait item (≥2), used when no value is
 *    pre-baked (the acolyte/creature-with-trait path).
 *  - `bakedUnnatural` — the NPC pipeline pre-bakes the extra directly on the characteristic (no
 *    trait item). Recover the implied multiplier from the intrinsic (un-buffed) bonus so it too
 *    scales with live buffs, instead of staying locked to the baked figure. To guarantee zero
 *    regression on existing NPC profiles, only scale when the derived multiplier cleanly
 *    reproduces the baked extra at the intrinsic bonus; otherwise the baked figure is treated as
 *    data noise and preserved verbatim.
 *
 * @param {number} traitMult      multiplier from an Unnatural trait item (≥2), else falsy/1
 * @param {number} bakedUnnatural pre-baked additive extra on the characteristic (0 if none)
 * @param {number} baselineBonus  Characteristic Bonus at the intrinsic value = floor((base+advance*5)/10)
 * @param {number} liveRawBonus   current Characteristic Bonus = floor(total/10), incl. modifiers
 * @returns {number} extra additive Unnatural bonus to add to the natural bonus
 */
export function unnaturalExtra(traitMult, bakedUnnatural, baselineBonus, liveRawBonus) {
    if (bakedUnnatural > 0) {
        if (baselineBonus <= 0) return bakedUnnatural;
        const mult = Math.round((baselineBonus + bakedUnnatural) / baselineBonus);
        if (mult < 2 || baselineBonus * (mult - 1) !== bakedUnnatural) return bakedUnnatural;
        return liveRawBonus * (mult - 1);
    }
    const mult = traitMult >= 2 ? traitMult : 1;
    if (mult < 2) return 0;
    return liveRawBonus * (mult - 1);
}

/**
 * RT Core p.368 ("Unnatural Characteristic"): "During Opposed Characteristic Tests, on a
 * success, the bonus multiplier is added to the degree of success." So a side with an
 * Unnatural (xN) governing Characteristic adds N to its Degrees of Success when it succeeds
 * the opposed test (e.g. Feint, Knock-Down, Grapple). Returns 0 on a failure or with no
 * Unnatural (multiplier < 2). The multiplier is recovered from the computed characteristic:
 * `unnatural = rawBonus × (N − 1)` ⇒ `N = bonus / (bonus − unnatural)` (rounded — tolerant of
 * a small flat cyber bonus baked into `bonus`).
 *
 * @param {number} bonus      the full characteristic bonus (raw + unnatural)
 * @param {number} unnatural  the Unnatural additive extra (`characteristic.unnatural`)
 * @param {boolean} success   whether this side succeeded the test
 * @returns {number} DoS bonus to add (the multiplier N when Unnatural + success, else 0)
 */
export function unnaturalOpposedDoSBonus(bonus, unnatural, success) {
    if (!success) return 0;
    const un = Number(unnatural) || 0;
    const b = Number(bonus) || 0;
    if (un <= 0) return 0;
    const rawBonus = b - un;
    if (rawBonus <= 0) return 0;
    const mult = Math.round(b / rawBonus);
    return mult >= 2 ? mult : 0;
}

/**
 * Recover the Unnatural multiplier (×N) of a Characteristic from its computed values. The
 * NPC pipeline pre-bakes Unnatural into `characteristic.unnatural` (the additive extra =
 * rawBonus × (N − 1)) rather than carrying a physical "Unnatural Agility" trait item, so the
 * trait-scan (`unnaturalCharacteristicMultipliers`) misses it. Deriving from the baked
 * additive works for BOTH baked NPCs and trait-carrying PCs (whose `.unnatural` is likewise
 * folded into `.bonus`): `unnatural = rawBonus × (N − 1)` ⇒ `N = bonus / (bonus − unnatural)`
 * (rounded — tolerant of a small flat cyber bonus baked into `bonus`). Returns 1 when there
 * is no Unnatural component. (BUG-Q-249.)
 *
 * @param {number} bonus      the full characteristic bonus (raw + unnatural)
 * @param {number} unnatural  the Unnatural additive extra (`characteristic.unnatural`)
 * @returns {number} the multiplier N (≥2 when Unnatural, else 1)
 */
export function unnaturalMultiplierFromBaked(bonus, unnatural) {
    const un = Number(unnatural) || 0;
    const b = Number(bonus) || 0;
    if (un <= 0) return 1;
    const rawBonus = b - un;
    if (rawBonus <= 0) return 1;
    const mult = Math.round(b / rawBonus);
    return mult >= 2 ? mult : 1;
}

/**
 * Daemonic (RT Core p.364) Toughness-Bonus multiplier for soaking damage. "Creatures
 * with this Trait double their Toughness Bonus against all damage, except for damage
 * inflicted by force weapons, psychic powers, holy attacks, or other creatures with this
 * Trait." So a Daemonic target reduces incoming damage with ×2 its Toughness Bonus.
 * Engine-applied by trait name on the assign-damage reduction path (NOT an AE — it scales
 * the per-location TB used to soak a specific hit, which an AE on a characteristic cannot
 * express), so the trait must NOT also be given an AE (double-apply guard). The four canon
 * exceptions (force weapons / psychic powers / holy attacks / other Daemonic creatures) are
 * not surfaced in the assign-damage hitData → the GM adjudicates them via the existing flow
 * (e.g. assign with the raw figures); documented as a known limitation, not invented here.
 * `hasTalent` only matches talents — callers pass the actor's TRAIT items.
 *
 * @param {Array<{name?: string}>} traits  target actor trait items
 * @returns {number} Toughness-Bonus multiplier for damage soak (2 with Daemonic, else 1)
 */
export function daemonicToughnessMultiplier(traits) {
    if (!Array.isArray(traits)) return 1;
    // Match "Daemonic" and the canonical "Daemonic (TB X)" stat-block form, but NOT
    // "Daemonic Presence" (QA-142) — like the quadruped/unnatural helpers tolerate "(xN)".
    const has = traits.some((t) => t?.name && /^\s*daemonic\s*(\(|$)/i.test(t.name));
    return has ? 2 : 1;
}

/**
 * Felling (X) (RT, p.131 / The Soul Reaver p.150): "If the weapon hits, it ignores a
 * number of levels of Unnatural Toughness possessed by the target equal to the number in
 * parenthesis. For instance, a Felling (1) weapon ignores the benefits of Unnatural
 * Toughness (x2) and would reduce the benefits of Unnatural Toughness (x3) by one
 * multiplier." So Felling reduces the target's Toughness-Bonus MULTIPLIER by X (floored at
 * the base ×1), discarding the per-step Unnatural extra — it does NOT touch the base
 * Toughness Bonus, force fields, or armour. Engine-applied on the assign-damage soak path
 * (BUG-Q-195): the cosmetic chat note in damage-data.mjs had no mechanical effect.
 *
 * `unnatural` is the additive Unnatural extra the actor bakes (= rawBonus × (mult − 1), so
 * the base bonus is `toughnessBonus − unnatural` and each multiplier step is worth that
 * base). Removing X steps subtracts min(X, steps-available) × base from the bonus.
 *
 * @param {number} toughnessBonus  the target's full Toughness Bonus (incl. Unnatural extra)
 * @param {number} unnatural       the Unnatural-Toughness additive (characteristic.unnatural)
 * @param {number} fellingLevel    the weapon's Felling level (X)
 * @returns {number} the Toughness Bonus after Felling (≥ the base bonus)
 */
export function fellingToughnessBonus(toughnessBonus, unnatural, fellingLevel) {
    const tb = Number(toughnessBonus) || 0;
    const un = Number(unnatural) || 0;
    const x = Math.max(0, Math.floor(Number(fellingLevel) || 0));
    if (x === 0 || un <= 0) return tb;
    const base = tb - un;                       // base Toughness Bonus (no Unnatural)
    if (base <= 0) return tb;                    // can't derive multiplier steps
    const steps = Math.round(un / base);         // = multiplier − 1
    const removed = Math.min(x, steps);
    return tb - removed * base;
}

/**
 * RT Core Unnatural Speed — the creature doubles its Agility Bonus for movement
 * (applied after size). True if any trait is "Unnatural Speed" (QA-077).
 * @param {Array<{name?: string}>} traits
 * @returns {boolean}
 */
export function hasUnnaturalSpeed(traits) {
    return Array.isArray(traits) && traits.some((t) => t?.name && /^\s*unnatural speed\b/i.test(t.name));
}

/**
 * RT Core p.368 Half Move. The Size trait is explicit about ordering: "When calculating a
 * creature's movement, apply the size modifier first, and then other modifiers from other
 * Traits or talents. Base movement can never be reduced below 1." So the size modifier
 * (`size − 4`, Average = 4 ⇒ +0) is added to the Agility Bonus FIRST, and only then do the
 * trait multipliers scale that adjusted total — Quadruped (×2/×3/×4) then Unnatural Speed (×2).
 * Applying the multiplier before the size add (as the code did pre-BUG-Q-241) mis-scaled every
 * Quadruped-with-Size creature. Floored at 1. (QA-076/077/141, BUG-Q-241.)
 * @param {number} agBonus     movement Agility Bonus (already encumbrance/Unnatural-adjusted)
 * @param {number} size        Size-trait value (Average = 4)
 * @param {number} moveMult    Quadruped multiplier (1 when not a Quadruped)
 * @param {boolean} unnaturalSpeed  doubles the whole base after the size add
 * @returns {number} Half Move in metres (≥ 1)
 */
export function baseHalfMove(agBonus, size, moveMult = 1, unnaturalSpeed = false) {
    // Guard a missing/malformed size against propagating NaN into every movement rate;
    // treat an unparseable size as Average (4 → +0 modifier). (BUG-Q-244.)
    if (!Number.isFinite(size)) size = 4;
    let base = (agBonus + (size - 4)) * moveMult;
    if (unnaturalSpeed) base *= 2;
    return Math.max(1, base);
}

/**
 * RT Core p.142 Weapon Training — using a weapon without the matching Weapon Training
 * talent is a −20 WS/BS penalty. Returns −20 (untrained) or 0. Honours the "(Universal)"
 * wildcard and the Flame/Exotic/Thrown groups; permissive (no penalty on unknown class).
 * Apply to player characters only — NPCs are assumed proficient with their listed weapons.
 * (QA-124.)
 * @param {Array<{name?: string}>} talents
 * @param {string} weaponClass  Pistol/Basic/Heavy/Melee/Thrown
 * @param {string} weaponType   Bolt/Las/SP/.../Flame/Exotic/Primitive
 * @returns {number} -20 or 0
 */
export function weaponUntrainedPenalty(talents, weaponClass, weaponType) {
    const names = (talents || []).map((t) => String(t?.name || '').toLowerCase());
    const cls = String(weaponClass || '').toLowerCase();
    const type = String(weaponType || '').toLowerCase();
    if (!cls) return 0;
    const has = (pred) => names.some(pred);
    if (cls === 'thrown') {
        return has((n) => n.startsWith('thrown weapon training')) ? 0 : -20;
    }
    if (type === 'exotic') {
        return has((n) => n.startsWith('exotic weapon training') || n.startsWith('xenos weapon training')) ? 0 : -20;
    }
    const group = `${cls} weapon training`;
    const trained = has((n) => n.startsWith(group) && (n.includes(`(${type})`) || n.includes('(universal)')))
        || (type === 'flame' && has((n) => n.startsWith('flame weapon training')));
    return trained ? 0 : -20;
}

/**
 * Bastion of Iron Will (RT Core p.94) defensive Psy Rating multiplier. "He doubles his
 * defensive Psy Rating on any Opposed Test involving the Psyniscience Skill or Psychic
 * Techniques." So when this character resists a psychic effect via such an Opposed Test,
 * the defensive Psy Rating he contributes is doubled. Engine-applied by talent name on the
 * opposed-psychic-resist path (NOT an AE — it scales a context-gated opposed-test
 * contribution, only on a Psyniscience/Psychic-Technique opposition), so it must NOT also
 * be given an AE (double-apply guard). NOTE: the base mechanic — adding the defensive Psy
 * Rating to the opposed test at all — has no apply point in the engine today
 * (`ActionData.checkForOpposed` rolls a plain characteristic check). This helper supplies
 * the doubling; wiring the base contribution + this multiplier into the opposed flow is the
 * Foundry-coupled follow-up. `hasTalent` matches talents — callers pass the actor's TALENT
 * items.
 *
 * @param {Array<{name?: string}>} talents  defender talent items
 * @returns {number} defensive-Psy-Rating multiplier (2 with the talent, else 1)
 */
export function bastionPsyMultiplier(talents) {
    if (!Array.isArray(talents)) return 1;
    const has = talents.some((t) => t?.name && String(t.name).toLowerCase() === 'bastion of iron will');
    return has ? 2 : 1;
}

/**
 * Rapid Reload (RT Core p.110): "The Explorer halves all reload times, rounding down.
 * Thus, a Half Action reload becomes a Free Action, a Full Action reload becomes a Half
 * Action, and so on." Reload is a free-text field on the weapon (`system.reload`), holding
 * either pack short-forms ('Half', 'Full', '2 Full') or config full-forms ('Half Action',
 * 'Full Action', '2 Full Actions') — no engine consumed it before, so this is the
 * extractable apply point: it converts the reload string to a quantity of Full-Actions
 * (Half = 0.5, Full = 1, "N Full" = N), halves it, then rounds DOWN to the nearest
 * representable step {Free(0), Half(0.5), 1+ Full}. Returns config-style full-form strings.
 * Non-numeric reloads (N/A, '', Special) and the un-talented path pass through unchanged.
 *
 * Mapping: Half→Free, Full→Half, 2 Full→Full, 3 Full→Full (1.5↓1), 4 Full→2 Full,
 * 5 Full→2 Full (2.5↓2). NOT an AE (it rewrites a free-text field by talent name) —
 * the actor applies it by name on owned ranged weapons (double-apply guard: CODE_HANDLED).
 *
 * @param {string} reload  the weapon's `system.reload`
 * @param {boolean} [hasRapidReload=true]  whether the owner has the Rapid Reload talent
 * @returns {string} the (possibly halved) reload time
 */
export function rapidReloadTime(reload, hasRapidReload = true, roundUp = false) {
    const raw = String(reload ?? '').trim();
    if (!hasRapidReload || raw === '') return reload;
    const norm = raw.toLowerCase();
    // Non-numeric / no-reload values pass through untouched.
    if (norm === 'n/a' || norm === 'special') return reload;

    let actions; // quantity in Full-Action units
    if (norm === 'free' || norm === 'free action') actions = 0;
    else if (norm === 'half' || norm === 'half action') actions = 0.5;
    else if (norm === 'full' || norm === 'full action') actions = 1;
    else {
        const m = norm.match(/^(\d+)\s*full/);
        if (!m) return reload; // unrecognised — leave as-is
        actions = Number(m[1]);
    }

    const halved = actions / 2;
    if (roundUp) {
        // Customised (RT Core p.143): halve, rounding UP to the next Full Action — except a
        // ½ Action stays a ½ Action (so Full→Half, 2 Full→Full, 3 Full→2 Full). (QA-018.)
        if (halved === 0) return 'Free Action';
        if (halved <= 0.5) return 'Half Action';
        const fullsUp = Math.ceil(halved);
        return fullsUp === 1 ? 'Full Action' : `${fullsUp} Full Actions`;
    }
    if (halved < 0.5) return 'Free Action';
    if (halved < 1) return 'Half Action';
    const fulls = Math.floor(halved);
    return fulls === 1 ? 'Full Action' : `${fulls} Full Actions`;
}

/**
 * Twin-Linked (RT Core p.117): "the weapon's reload time is doubled." Doubles a reload
 * string in the same Full-Action unit space as `rapidReloadTime` (Half→Full, Full→2 Full,
 * 2 Full→4 Full). Composes with Rapid Reload / Customised (apply this first, then halve).
 * Non-numeric reloads (N/A, Special, '', Free) and unrecognised forms pass through unchanged.
 *
 * @param {string} reload  the weapon's `system.reload`
 * @returns {string} the doubled reload time
 */
export function doubleReloadTime(reload) {
    const raw = String(reload ?? '').trim();
    if (raw === '') return reload;
    const norm = raw.toLowerCase();
    if (norm === 'n/a' || norm === 'special' || norm === 'free' || norm === 'free action') return reload;

    let actions; // quantity in Full-Action units
    if (norm === 'half' || norm === 'half action') actions = 0.5;
    else if (norm === 'full' || norm === 'full action') actions = 1;
    else {
        const m = norm.match(/^(\d+)\s*full/);
        if (!m) return reload; // unrecognised — leave as-is
        actions = Number(m[1]);
    }

    const doubled = actions * 2;
    if (doubled < 1) return 'Half Action';
    return doubled === 1 ? 'Full Action' : `${doubled} Full Actions`;
}

/**
 * Item-grant machinery (ENGINE-TRAIT-GRANTS). Some talents/traits GRANT other
 * compendium items: Explorator Implants → Mechanicus Implants (RT Core); The Flesh is
 * Weak / Physical Perfection → Machine (RT Core / ItS); 'Ard → Unnatural Toughness (x2)
 * + Sturdy + Iron Jaw + True Grit (ItS). The granting entry carries `flags.rt.grants`
 * = an array of `{name, type}` describing the items to auto-embed on the actor when the
 * granting item is first added. This pure helper computes which grants are NOT already
 * on the actor (so re-adding the granting item, or an NPC that already bakes the granted
 * items, does not double-grant) — the Foundry-coupled half (resolving each from its pack
 * and `createEmbeddedDocuments`) lives in `hooks-manager.onCreateItem`.
 *
 * Match is by exact (case-insensitive) name AND type — granted names like
 * "Unnatural Toughness (x2)" are the literal pack names (parens are part of the name,
 * NOT a pickable choice), so no paren-stripping. Duplicate grants in the spec collapse
 * to one. Non-array / empty inputs return [] (no grants).
 *
 * A grant may carry a `choice` (WIRE-SIXTH-SENSE: Sixth Sense → Rival (Inquisition)) —
 * a pre-chosen pickable talent. The embedded item is renamed "Rival (Inquisition)", so
 * a re-add would otherwise not match the bare grant name; for choice grants the dedup
 * compares against the existing item's BASE name (trailing parenthetical stripped).
 *
 * @param {Array<{name?: string, type?: string, pack?: string, choice?: string}>} grants  flags.rt.grants
 * @param {Array<{name?: string, type?: string}>} existingItems  actor's current items
 * @returns {Array<{name: string, type: string, pack?: string, choice?: string}>} grants still to embed
 */
export function pendingGrants(grants, existingItems) {
    if (!Array.isArray(grants) || grants.length === 0) return [];
    const items = (Array.isArray(existingItems) ? existingItems : []).filter((i) => i?.name && i?.type);
    const haveFull = new Set(items.map((i) => `${i.type}::${String(i.name).toLowerCase()}`));
    const haveBase = new Set(items.map((i) => `${i.type}::${String(i.name).replace(/\s*\(.*\)\s*$/, '').toLowerCase()}`));
    const out = [];
    const seen = new Set();
    for (const g of grants) {
        if (!g?.name || !g?.type) continue;
        const key = `${g.type}::${String(g.name).toLowerCase()}`;
        // Choice grants match an existing item by base name (the embed carries the
        // choice in parens); plain grants match the full name verbatim.
        const have = g.choice ? haveBase : haveFull;
        if (have.has(key) || seen.has(key)) continue;
        seen.add(key);
        const entry = { name: g.name, type: g.type };
        if (g.pack) entry.pack = g.pack;
        if (g.choice) entry.choice = g.choice;
        out.push(entry);
    }
    return out;
}

/**
 * Unarmed / natural-weapon damage profile (ENGINE-NATWEAPONS). RT 1e overrides the
 * dice (and the Primitive quality) of an unarmed strike based on the attacker's
 * talents/traits — the Strength Bonus is added separately by the melee damage path,
 * so the returned `formula` is the DICE ONLY (no +SB):
 *
 *  - Unarmed (default, RT Core p.241): "1d5–3 plus Strength Bonus ... counts as
 *    Primitive."  → 1d5-3, Primitive.
 *  - Unarmed Warrior (talent, RT Core p.122): "unarmed attacks do 1d10–3 (+SB) Damage
 *    instead of the standard 1d5–3 ... still count as having the Primitive quality."
 *    → 1d10-3, Primitive.
 *  - Unarmed Master (talent, RT Core p.122): "unarmed combat attacks do 1d10+SB (I)
 *    Damage and his attacks no longer have the Primitive quality." → 1d10, not Primitive.
 *  - Natural Weapons (trait, RT Core p.367): "attacks deal 1d10 points of damage plus
 *    its Strength Bonus ... always count as Primitive." → 1d10, Primitive.
 *  - Improved Natural Weapons (trait, ItS): "deal 1d10 plus Strength Bonus ... but
 *    unlike standard Natural Weapons these attacks do not count as Primitive." → 1d10,
 *    not Primitive.
 *
 * Resolution picks the single best applicable profile: a non-Primitive 1d10 (Unarmed
 * Master / Improved Natural Weapons) > a Primitive 1d10 (Natural Weapons) > 1d10-3
 * Primitive (Unarmed Warrior) > the 1d5-3 Primitive baseline. Engine-applied by name on
 * the unarmed-attack damage path (damage-data.mjs) — these talents/traits must NOT also
 * be given an AE (double-apply guard). `hasTalent` only matches talents, so the caller
 * passes the actor's talent items and trait items separately.
 *
 * @param {Array<{name?: string}>} talents  actor talent items
 * @param {Array<{name?: string}>} traits   actor trait items
 * @returns {{formula: string, primitive: boolean, source: string}} damage dice + Primitive flag
 */
export function unarmedDamageProfile(talents, traits) {
    const tset = new Set((Array.isArray(talents) ? talents : [])
        .map((t) => t?.name && String(t.name).toLowerCase()).filter(Boolean));
    const trset = new Set((Array.isArray(traits) ? traits : [])
        .map((t) => t?.name && String(t.name).toLowerCase()).filter(Boolean));
    // Best: a non-Primitive 1d10.
    if (tset.has('unarmed master'))
        return { formula: '1d10', primitive: false, source: 'Unarmed Master' };
    if (trset.has('improved natural weapons'))
        return { formula: '1d10', primitive: false, source: 'Improved Natural Weapons' };
    // Primitive 1d10.
    if (trset.has('natural weapons'))
        return { formula: '1d10', primitive: true, source: 'Natural Weapons' };
    // Primitive 1d10-3.
    if (tset.has('unarmed warrior'))
        return { formula: '1d10-3', primitive: true, source: 'Unarmed Warrior' };
    // Baseline unarmed strike.
    return { formula: '1d5-3', primitive: true, source: 'Unarmed' };
}

/**
 * Parse a consumable's duration phrase (ENGINE-CONSUMABLE-ACTIVATE) into a dice
 * formula + unit so the activation action can roll it and build the ActiveEffect
 * `duration`. RT drug durations are prose — "1d10 minutes", "3d10 Rounds", "1d5 hours",
 * "3d10 rounds per dose". Returns the first `<formula> <unit>` it finds (a plain integer
 * is accepted too) and how to map it onto Foundry's AE duration:
 *  - rounds → `duration.rounds = value`            (durationKey 'rounds', secondsPer 1)
 *  - minutes → `duration.seconds = value * 60`     (durationKey 'seconds', secondsPer 60)
 *  - hours → `duration.seconds = value * 3600`     (durationKey 'seconds', secondsPer 3600)
 * No recognised duration → null (the action falls back to an unbounded effect).
 *
 * @param {string} text  a duration phrase (e.g. spec.durationText, or a description)
 * @returns {{formula: string, unit: string, durationKey: string, secondsPer: number}|null}
 */
export function parseConsumableDuration(text) {
    const raw = String(text ?? '').toLowerCase();
    const m = raw.match(/(\d+d\d+|\d+)\s*(round|minute|hour)s?/);
    if (!m) return null;
    const formula = m[1];
    const word = m[2];
    if (word === 'round') return { formula, unit: 'rounds', durationKey: 'rounds', secondsPer: 1 };
    if (word === 'minute') return { formula, unit: 'minutes', durationKey: 'seconds', secondsPer: 60 };
    return { formula, unit: 'hours', durationKey: 'seconds', secondsPer: 3600 };
}

/**
 * Activation specs for the ~8 activated combat drugs (ENGINE-CONSUMABLE-ACTIVATE).
 * Each describes the timed effect a single dose applies. `changes` are AE changes
 * (mode 2 = ADD) for the cleanly-mechanical, non-narrative bonuses ONLY — a +3
 * Characteristic Bonus is expressed as +30 on `system.characteristics.<k>.modifier`
 * (bonus = floor(value/10), so adding 30 always adds exactly 3 to the bonus). Effects
 * that grant a Talent, confer immunities, or carry an after-effect penalty are NOT
 * inventable as AE changes — they ride in `note` (surfaced on the effect + chat card)
 * for the GM/player to apply, plus an optional `grantsTalent` flag for the two
 * talent-granting drugs. Keyed by the pack name lowercased with a trailing "(drug)"
 * stripped. Canon: RT Core p.142-143 (Frenzon/Stimm/Slaught); Into the Storm Ch.III
 * (Spur/Cold Fire/White Void/Wideawake/Attention Spanner).
 */
const CONSUMABLE_ACTIVATIONS = {
    frenzon: {
        label: 'Frenzon', durationText: '1d10 minutes', grantsTalent: 'Frenzy', changes: [],
        note: 'Gains the Frenzy talent and immunity to Fear for the duration. (RT Core p.142)',
    },
    stimm: {
        label: 'Stimm', durationText: '3d10 rounds', changes: [],
        note: 'Ignores negative Characteristic effects from Damage/Critical Damage and cannot be Stunned. When it wears off: −20 to Strength, Toughness and Agility Tests for one hour. (RT Core p.142)',
        comedown: {
            note: 'Stimm wears off: −20 to Strength, Toughness and Agility Tests for one hour.',
            durationText: '1 hour',
            changes: [
                { key: 'system.characteristics.strength.modifier', mode: 2, value: '-20' },
                { key: 'system.characteristics.toughness.modifier', mode: 2, value: '-20' },
                { key: 'system.characteristics.agility.modifier', mode: 2, value: '-20' },
            ],
        },
    },
    slaught: {
        label: 'Slaught', durationText: '2d10 minutes',
        changes: [
            { key: 'system.characteristics.agility.modifier', mode: 2, value: '30' },
            { key: 'system.characteristics.perception.modifier', mode: 2, value: '30' },
        ],
        note: '+3 Agility Bonus and +3 Perception Bonus. Afterwards: Test Toughness or take −20 to Agility and Perception Tests for 1d5 hours. (RT Core p.143)',
        comedown: {
            // The −20 is gated on a Toughness Test the engine doesn't auto-roll, so the comedown
            // is surfaced as a note for the GM rather than an auto-applied AE.
            note: 'Slaught wears off: Test Toughness or take −20 to Agility and Perception Tests for 1d5 hours.',
        },
    },
    spur: {
        label: 'Spur', durationText: '2d10 minutes', changes: [],
        note: 'Cannot be Stunned and takes no Fatigue. Afterwards: −20 to Toughness and Agility Tests for one hour, plus one Fatigue level for every two that would have been gained. (Into the Storm)',
        comedown: {
            note: 'Spur wears off: −20 to Toughness and Agility Tests for one hour, plus one Fatigue level for every two that would have been gained.',
            durationText: '1 hour',
            changes: [
                { key: 'system.characteristics.toughness.modifier', mode: 2, value: '-20' },
                { key: 'system.characteristics.agility.modifier', mode: 2, value: '-20' },
            ],
        },
    },
    'cold fire': {
        label: 'Cold Fire', durationText: '3d10 rounds', grantsTalent: 'Battle Rage', changes: [],
        note: 'Gains the Battle Rage talent for the duration. (Into the Storm)',
    },
    'white void': {
        label: 'White Void', durationText: '1d10 minutes',
        changes: [{ key: 'system.characteristics.willpower.modifier', mode: 2, value: '20' }],
        note: '+20 Willpower for the duration. (Into the Storm)',
    },
    wideawake: {
        label: 'Wideawake', durationText: '1d5 hours', changes: [],
        note: 'Ignores one level of Fatigue for the duration; additional doses prolong it but never counter more than one level. After it wears off: suffer an additional level of Fatigue. (Into the Storm)',
        comedown: {
            note: 'Wideawake wears off: suffer an additional level of Fatigue.',
            fatigue: 1,
        },
    },
    'attention spanner': {
        label: 'Attention Spanner', durationText: '3d10 rounds', changes: [], focusTest: true,
        note: 'On a successful focus: +30 to all Intelligence-based Tests for the duration. On a failure: −20 to all Tests for the same period. (Into the Storm)',
    },
};

/**
 * Look up the activation spec for a consumable by name (ENGINE-CONSUMABLE-ACTIVATE).
 * Returns null for non-activated consumables (food, medikits, Recaf, etc.) so the
 * "Use" action only surfaces on the drugs that actually apply a timed effect. The
 * name match strips a trailing "(drug)" suffix some pack entries carry and is
 * case-insensitive. The returned object is a fresh shallow copy (callers must not
 * mutate the shared table).
 *
 * @param {string} name  the consumable item name
 * @returns {{label: string, durationText: string, changes: Array, note: string, grantsTalent?: string}|null}
 */
export function consumableActivation(name) {
    const key = String(name ?? '').toLowerCase().replace(/\s*\(drug\)\s*$/, '').trim();
    const spec = CONSUMABLE_ACTIVATIONS[key];
    if (!spec) return null;
    return { ...spec, changes: (spec.changes ?? []).map((c) => ({ ...c })) };
}

export async function roll1d100() {
    let formula = '1d100';
    const roll = new Roll(formula, {});
    await roll.evaluate();
    return roll;
}

export async function sendActionDataToChat(actionData) {
    const html = await renderTemplate(actionData.template, actionData);
    const actorData = actionData.rollData.actor ? actionData.rollData.actor : actionData.rollData.sourceActor;
    const actor = game.actors.get(actorData._id);
    let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor}),
        rollMode: game.settings.get('core', 'rollMode'),
        content: html,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    };
    if (actionData.rollData.roll) {
        chatData.roll = actionData.rollData.roll;
    }
    if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
        chatData.whisper = ChatMessage.getWhisperRecipients('GM');
    } else if (chatData.rollMode === 'selfroll') {
        chatData.whisper = [game.user];
    }
    ChatMessage.create(chatData);
}

export function recursiveUpdate(targetObject, updateObject) {
    for (const key of Object.keys(updateObject)) {
        handleDotNotationUpdate(targetObject, key, updateObject[key]);
    }
}

export function handleDotNotationUpdate(targetObject, key, value) {
    if (typeof key == 'string') {
        // Key Starts as string and we split across dots
        handleDotNotationUpdate(targetObject, key.split('.'), value);
    } else if (key.length === 1) {
        // Final Key -- either delete or set parent field
        if (value === undefined || value === null) {
            delete targetObject[key[0]];
        } else if ('object' === typeof value && !Array.isArray(value)) {
            recursiveUpdate(targetObject[key[0]], value);
        } else {
            // Coerce numbers
            if ('number' === typeof targetObject[key[0]]) {
                targetObject[key[0]] = Number(value);
            } else {
                targetObject[key[0]] = value;
            }
        }
    } else {
        // Go a layer deeper into object
        handleDotNotationUpdate(targetObject[key[0]], key.slice(1), value);
    }
}
