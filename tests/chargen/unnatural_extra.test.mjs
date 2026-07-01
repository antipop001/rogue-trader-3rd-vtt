import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unnaturalExtra } from '../../src/module/rolls/roll-helpers.mjs';

// RT Core p.368: Unnatural Characteristic (xN) multiplies the CURRENT Characteristic Bonus by N,
// so the extra additive (= liveRawBonus × (N-1)) scales when the Characteristic is raised.
// The book's worked example: Strength 41, Unnatural Strength (x2) → SB 8; raise to 51 → SB 10.

test('trait-derived multiplier scales with the live bonus (no pre-baked value)', () => {
    // Str 41 (baseline bonus 4), Unnatural (x2), no baked value → extra = 4×1 = 4 → SB 8.
    assert.equal(unnaturalExtra(2, 0, 4, 4), 4);
    // Str raised to 51 (rawBonus 5) → extra = 5×1 = 5 → SB 10 (canon example).
    assert.equal(unnaturalExtra(2, 0, 4, 5), 5);
    // Unnatural (x3): Str 41 → extra 8 → SB 12; raised to 51 → extra 10 → SB 15.
    assert.equal(unnaturalExtra(3, 0, 4, 4), 8);
    assert.equal(unnaturalExtra(3, 0, 4, 5), 10);
});

test('no unnatural trait and no baked value → no extra', () => {
    assert.equal(unnaturalExtra(undefined, 0, 4, 4), 0);
    assert.equal(unnaturalExtra(1, 0, 4, 4), 0);
});

test('pre-baked NPC extra is preserved at the intrinsic value (zero regression)', () => {
    // base 40 (baseline 4), baked 4 (x2) → at rawBonus 4 the result equals the baked value.
    assert.equal(unnaturalExtra(undefined, 4, 4, 4), 4);
    // base 40, baked 8 (x3) → preserved at rawBonus 4.
    assert.equal(unnaturalExtra(undefined, 8, 4, 4), 8);
});

test('pre-baked NPC extra scales when the characteristic is buffed', () => {
    // base 40 baked 4 (x2), buffed +10 → rawBonus 5 → extra 5 (was locked at 4).
    assert.equal(unnaturalExtra(undefined, 4, 4, 5), 5);
    // base 40 baked 8 (x3), buffed +10 → rawBonus 5 → extra 10 (was locked at 8).
    assert.equal(unnaturalExtra(undefined, 8, 4, 5), 10);
});

test('noisy baked value that no clean multiplier reproduces is preserved verbatim', () => {
    // baseline 4, baked 5 → mult round(9/4)=2, 4×1=4 ≠ 5 → keep 5, do not scale.
    assert.equal(unnaturalExtra(undefined, 5, 4, 5), 5);
    assert.equal(unnaturalExtra(undefined, 5, 4, 4), 5);
});

test('baseline bonus of 0 cannot derive a multiplier → keep baked', () => {
    assert.equal(unnaturalExtra(undefined, 3, 0, 4), 3);
});
