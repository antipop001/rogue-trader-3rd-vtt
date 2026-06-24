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
