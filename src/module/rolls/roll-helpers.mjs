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
    return {
        base,
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
    const totalMax = dMax + pMax - base;           // shared base ⇒ counted once
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
    const has = traits.some((t) => t?.name && String(t.name).toLowerCase() === 'daemonic');
    return has ? 2 : 1;
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
