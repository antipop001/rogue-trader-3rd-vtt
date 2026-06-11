/**
 * Chargen Stage 1 — Characteristics.
 *
 * JS port of RTT_MAKER `rogue_trader/characteristics.py`. The nine Rogue
 * Trader characteristics, their bonuses, and the generation methods (Core
 * Rulebook p.14: 2d10+25 each; plus pool-assign / manual / fixed so the
 * builder never forces app-side randomness — player-entered physical-dice
 * results are first-class).
 *
 * Pure module: no Foundry globals. Dice are injected as a function
 * `roll(n, sides) -> int[]` so the wizard can back it with a chat-visible
 * Foundry Roll and tests can stub it.
 */

export const ROLL_BONUS = 25;
export const ROLL_MIN = 2 + ROLL_BONUS;   // 27
export const ROLL_MAX = 20 + ROLL_BONUS;  // 45

/** How a starting characteristic set was produced. */
export const GenMethod = Object.freeze({
    ROLL: 'roll',      // app rolls 2d10+25 per characteristic
    POOL: 'pool',      // app rolls nine values, player assigns them
    MANUAL: 'manual',  // player enters their own values
    FIXED: 'fixed',    // deterministic baseline (no luck)
});

/** The nine characteristics in canonical sheet order: {abbr, full}. */
export const CHARACTERISTICS = Object.freeze([
    { abbr: 'WS', full: 'Weapon Skill' },
    { abbr: 'BS', full: 'Ballistic Skill' },
    { abbr: 'S', full: 'Strength' },
    { abbr: 'T', full: 'Toughness' },
    { abbr: 'Ag', full: 'Agility' },
    { abbr: 'Int', full: 'Intelligence' },
    { abbr: 'Per', full: 'Perception' },
    { abbr: 'WP', full: 'Willpower' },
    { abbr: 'Fel', full: 'Fellowship' },
]);

export const ABBRS = CHARACTERISTICS.map((c) => c.abbr);

/** Case-insensitive abbreviation lookup -> canonical abbr. Throws on unknown. */
export function fromAbbr(abbr) {
    const hit = CHARACTERISTICS.find((c) => c.abbr.toLowerCase() === String(abbr).toLowerCase());
    if (!hit) throw new Error(`unknown characteristic abbreviation: '${abbr}'`);
    return hit.abbr;
}

/** Characteristic Bonus = the tens digit of the value (clamped at 0). */
export function bonus(value) {
    return Math.floor(Math.max(0, value) / 10);
}

function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

function require9(values) {
    const parsed = {};
    for (const [k, v] of Object.entries(values)) parsed[fromAbbr(k)] = Math.trunc(Number(v));
    const missing = ABBRS.filter((a) => !(a in parsed));
    if (missing.length) throw new Error(`missing characteristic value(s): ${missing.join(', ')}`);
    return parsed;
}

// --- generation methods ------------------------------------------------------
// Each returns {base: {abbr: int}, method} — the shape ChargenState stores.

/** Core method: roll 2d10+25 once per characteristic, in order. */
export function rollSet(roll) {
    const base = {};
    for (const a of ABBRS) base[a] = sum(roll(2, 10)) + ROLL_BONUS;
    return { base, method: GenMethod.ROLL };
}

/** Roll nine 2d10+25 values to be assigned to characteristics by the player. */
export function rollPool(roll) {
    return ABBRS.map(() => sum(roll(2, 10)) + ROLL_BONUS);
}

/** Build a set by assigning nine values to the nine characteristics in order. */
export function fromPool(values) {
    if (values.length !== ABBRS.length) {
        throw new Error(`need ${ABBRS.length} values, got ${values.length}`);
    }
    const base = {};
    ABBRS.forEach((a, i) => { base[a] = Math.trunc(Number(values[i])); });
    return { base, method: GenMethod.POOL };
}

/**
 * Build a set from player-entered values (physical dice / another tool).
 * Requires all nine; NOT clamped — use rangeWarnings() to surface
 * out-of-range entries without blocking them.
 */
export function manualSet(values) {
    return { base: require9(values), method: GenMethod.MANUAL };
}

/** Deterministic set, every characteristic at `value` (36 = average 2d10+25). */
export function fixedSet(value = 36) {
    const base = {};
    for (const a of ABBRS) base[a] = value;
    return { base, method: GenMethod.FIXED };
}

/** Non-blocking warnings for base values outside the 2d10+25 range (27–45). */
export function rangeWarnings(base) {
    const warnings = [];
    for (const a of ABBRS) {
        const v = base[a];
        if (v === undefined || v === null) continue;
        if (v < ROLL_MIN || v > ROLL_MAX) {
            warnings.push(`${a} = ${v} is outside the normal 2d10+25 range (${ROLL_MIN}–${ROLL_MAX})`);
        }
    }
    return warnings;
}

// --- species (non-human) generation ------------------------------------------
// Kroot/Ork PCs (Into the Storm) roll 2d10 + a species base, or take a fixed
// value, per data/species.json `char_profile` entries: {"roll": "NdS+M"} or
// {"fixed": V}. Used in Stage B (species step); ported now with the rest.

const ROLL_RE = /^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$/i;

/** Parse an "NdS+M" dice spec into {n, sides, mod}. */
export function parseRoll(spec) {
    const m = ROLL_RE.exec(spec);
    if (!m) throw new Error(`unparseable roll spec: '${spec}'`);
    return {
        n: parseInt(m[1], 10),
        sides: parseInt(m[2], 10),
        mod: m[3] ? parseInt(m[3].replace(/\s/g, ''), 10) : 0,
    };
}

/**
 * The flat additive base for a characteristic in a species char_profile
 * (the species analogue of the human +25). Defaults to ROLL_BONUS when the
 * profile omits the characteristic.
 */
export function speciesBase(profile, abbr) {
    const entry = profile[fromAbbr(abbr)];
    if (!entry) return ROLL_BONUS;
    if ('fixed' in entry) return Math.trunc(Number(entry.fixed));
    return parseRoll(entry.roll).mod;
}

/**
 * Build a characteristic set from a species char_profile. Pass `values` for a
 * player-entered (manual-dice) set, or `roll` to app-roll each characteristic
 * with its species-specific spec. Manual entries are NOT clamped.
 */
export function speciesSet(profile, { roll, values } = {}) {
    if (values) return { base: require9(values), method: GenMethod.MANUAL };
    const base = {};
    for (const a of ABBRS) {
        const entry = profile[a];
        if (!entry) {
            base[a] = sum(roll(2, 10)) + ROLL_BONUS;
        } else if ('fixed' in entry) {
            base[a] = Math.trunc(Number(entry.fixed));
        } else {
            const { n, sides, mod } = parseRoll(entry.roll);
            base[a] = sum(roll(n, sides)) + mod;
        }
    }
    return { base, method: GenMethod.ROLL };
}
