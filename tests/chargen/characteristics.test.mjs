// node --test tests/chargen/ — pure-module tests for the chargen engine port.
// Cases mirror RTT_MAKER's pytest suite (rogue_trader/tests) so the JS port
// keeps the Python engine's semantics.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    ABBRS,
    GenMethod,
    ROLL_MAX,
    ROLL_MIN,
    bonus,
    fixedSet,
    fromAbbr,
    fromPool,
    manualSet,
    parseRoll,
    rangeWarnings,
    rollPool,
    rollSet,
    speciesBase,
    speciesSet,
} from '../../src/module/chargen/characteristics.mjs';

/** Deterministic dice stub: always rolls `value` on every die. */
const always = (value) => (n, _sides) => Array(n).fill(value);

test('nine characteristics in canonical sheet order', () => {
    assert.deepEqual(ABBRS, ['WS', 'BS', 'S', 'T', 'Ag', 'Int', 'Per', 'WP', 'Fel']);
});

test('fromAbbr is case-insensitive and throws on unknown', () => {
    assert.equal(fromAbbr('ws'), 'WS');
    assert.equal(fromAbbr('Fel'), 'Fel');
    assert.throws(() => fromAbbr('XX'));
});

test('bonus is the tens digit, clamped at zero', () => {
    assert.equal(bonus(36), 3);
    assert.equal(bonus(45), 4);
    assert.equal(bonus(9), 0);
    assert.equal(bonus(0), 0);
    assert.equal(bonus(-10), 0);
});

test('rollSet: 2d10+25 per characteristic, method roll', () => {
    const { base, method } = rollSet(always(10));
    assert.equal(method, GenMethod.ROLL);
    for (const a of ABBRS) assert.equal(base[a], 45);
    const low = rollSet(always(1)).base;
    for (const a of ABBRS) assert.equal(low[a], 27);
});

test('rollPool returns nine values in the 2d10+25 range', () => {
    const pool = rollPool(always(5));
    assert.equal(pool.length, 9);
    for (const v of pool) assert.equal(v, 35);
});

test('fromPool assigns in order and validates count', () => {
    const { base, method } = fromPool([27, 28, 29, 30, 31, 32, 33, 34, 35]);
    assert.equal(method, GenMethod.POOL);
    assert.equal(base.WS, 27);
    assert.equal(base.Fel, 35);
    assert.throws(() => fromPool([1, 2, 3]));
});

test('manualSet requires all nine, accepts case-insensitive keys, no clamping', () => {
    const values = { ws: 30, bs: 31, s: 32, t: 33, ag: 34, int: 35, per: 36, wp: 37, fel: 99 };
    const { base, method } = manualSet(values);
    assert.equal(method, GenMethod.MANUAL);
    assert.equal(base.WS, 30);
    assert.equal(base.Fel, 99); // not clamped — house rules allowed
    assert.throws(() => manualSet({ WS: 30 }), /missing characteristic/);
});

test('fixedSet defaults to the no-luck baseline 36', () => {
    const { base, method } = fixedSet();
    assert.equal(method, GenMethod.FIXED);
    for (const a of ABBRS) assert.equal(base[a], 36);
});

test('rangeWarnings flags only values outside 27–45, never blocks', () => {
    assert.equal(ROLL_MIN, 27);
    assert.equal(ROLL_MAX, 45);
    const base = fixedSet().base;
    assert.deepEqual(rangeWarnings(base), []);
    base.WS = 26;
    base.Fel = 46;
    const warnings = rangeWarnings(base);
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /WS = 26/);
    assert.match(warnings[1], /Fel = 46/);
    // partial sets warn only on present values
    assert.deepEqual(rangeWarnings({ WS: 30 }), []);
});

test('parseRoll handles NdS+M specs', () => {
    assert.deepEqual(parseRoll('2d10+35'), { n: 2, sides: 10, mod: 35 });
    assert.deepEqual(parseRoll('1d5'), { n: 1, sides: 5, mod: 0 });
    assert.deepEqual(parseRoll('2d10 - 5'), { n: 2, sides: 10, mod: -5 });
    assert.throws(() => parseRoll('garbage'));
});

// Mirrors the shape of data/species.json char_profile entries (Ork-style).
const ORK_LIKE_PROFILE = {
    WS: { roll: '2d10+35' },
    BS: { roll: '2d10+15' },
    T: { fixed: 40 },
    // others absent -> human 2d10+25
};

test('speciesBase: roll modifier, fixed value, human fallback', () => {
    assert.equal(speciesBase(ORK_LIKE_PROFILE, 'WS'), 35);
    assert.equal(speciesBase(ORK_LIKE_PROFILE, 'T'), 40);
    assert.equal(speciesBase(ORK_LIKE_PROFILE, 'Fel'), 25);
});

test('speciesSet: app-roll uses per-characteristic specs; manual values win', () => {
    const { base } = speciesSet(ORK_LIKE_PROFILE, { roll: always(10) });
    assert.equal(base.WS, 55);  // 2x10 + 35
    assert.equal(base.BS, 35);  // 2x10 + 15
    assert.equal(base.T, 40);   // fixed
    assert.equal(base.Fel, 45); // human fallback 2x10 + 25

    const manualValues = { WS: 50, BS: 30, S: 30, T: 40, Ag: 30, Int: 30, Per: 30, WP: 30, Fel: 20 };
    const manual = speciesSet(ORK_LIKE_PROFILE, { values: manualValues });
    assert.equal(manual.method, GenMethod.MANUAL);
    assert.equal(manual.base.WS, 50);
});
