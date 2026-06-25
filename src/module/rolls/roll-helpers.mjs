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

export function getOpposedDegrees(dos, dof, opposedDos, opposedDof) {
    if(dos > 0) {
        if(opposedDos > 0) {
            return dos - opposedDos;
        } else {
            return dos + opposedDof;
        }
    } else {
        if (opposedDos > 0) {
            return -1 * (dof + opposedDos);
        } else {
            return -1 * (dof - opposedDof);
        }
    }
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
 * contribution to Initiative becomes ×2 the raw Agility Bonus (×3 with Unnatural
 * Agility), REPLACING the normal single bonus (which itself already folds in the
 * Unnatural addition — multiplying that would double-count). Without the talent the
 * normal bonus is returned unchanged. AE can't express this (it must read AgB), so it
 * is computed in acolyte.mjs by name and must NOT also be given an AE.
 *
 * @param {number} rawBonus  tens-digit characteristic bonus (Math.floor(total/10), no unnatural)
 * @param {number} normalBonus  the full characteristic bonus (raw + unnatural) used by default
 * @param {boolean} hasLightningReflexes  whether the actor has the talent
 * @param {boolean} hasUnnatural  whether the governing characteristic is Unnatural
 * @returns {number} the characteristic contribution to the Initiative bonus
 */
export function initiativeCharBonus(rawBonus, normalBonus, hasLightningReflexes, hasUnnatural) {
    if (!hasLightningReflexes) return normalBonus;
    return rawBonus * (hasUnnatural ? 3 : 2);
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
 * RT Core Unnatural Speed — the creature doubles its Agility Bonus for movement
 * (applied after size). True if any trait is "Unnatural Speed" (QA-077).
 * @param {Array<{name?: string}>} traits
 * @returns {boolean}
 */
export function hasUnnaturalSpeed(traits) {
    return Array.isArray(traits) && traits.some((t) => t?.name && /^\s*unnatural speed\b/i.test(t.name));
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
export function rapidReloadTime(reload, hasRapidReload = true) {
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
    if (halved < 0.5) return 'Free Action';
    if (halved < 1) return 'Half Action';
    const fulls = Math.floor(halved);
    return fulls === 1 ? 'Full Action' : `${fulls} Full Actions`;
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
    },
    slaught: {
        label: 'Slaught', durationText: '2d10 minutes',
        changes: [
            { key: 'system.characteristics.agility.modifier', mode: 2, value: '30' },
            { key: 'system.characteristics.perception.modifier', mode: 2, value: '30' },
        ],
        note: '+3 Agility Bonus and +3 Perception Bonus. Afterwards: Test Toughness or take −20 to Agility and Perception Tests for 1d5 hours. (RT Core p.143)',
    },
    spur: {
        label: 'Spur', durationText: '2d10 minutes', changes: [],
        note: 'Cannot be Stunned and takes no Fatigue. Afterwards: −20 to Toughness and Agility Tests for one hour, plus one Fatigue level for every two that would have been gained. (Into the Storm)',
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
    },
    'attention spanner': {
        label: 'Attention Spanner', durationText: '3d10 rounds', changes: [],
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
