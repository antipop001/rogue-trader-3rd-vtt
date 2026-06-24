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
