// ENGINE-WOUNDS-MOD — pure-JS test for the additive Wounds-maximum helper.
// Mirrors Initiative's additive `modifier` term (BUG-002): maximum Wounds = the stored/
// rolled base plus any effect-written modifier. Sound Constitution (RT Core p.111) adds
// +1 via an AE on system.wounds.modifier; multiple instances stack.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { woundsMax, woundsBase, resolveWoundsBase } from '../../src/module/rolls/roll-helpers.mjs';

test('woundsMax adds the modifier to the base', () => {
    assert.equal(woundsMax(12, 1), 13);   // one Sound Constitution
    assert.equal(woundsMax(12, 3), 15);   // Sound Constitution x3 (stacked AEs)
    assert.equal(woundsMax(8, 0), 8);     // no effect → unchanged
});

test('woundsMax is robust to missing/undefined inputs', () => {
    assert.equal(woundsMax(10, undefined), 10);
    assert.equal(woundsMax(10, null), 10);
    assert.equal(woundsMax(undefined, 2), 2);   // pre-schema NPC with no stored max
    assert.equal(woundsMax(undefined, undefined), 0);
});

test('woundsMax coerces string values (AE values are strings)', () => {
    assert.equal(woundsMax('12', '1'), 13);
    assert.equal(woundsMax(12, '2'), 14);
});

test('woundsMax is idempotent across recompute (base never includes the modifier)', () => {
    // In derived data the base is reset from source each cycle, so applying the helper
    // twice with the same base+modifier yields the same result — no accumulation.
    const base = 12, mod = 2;
    assert.equal(woundsMax(base, mod), woundsMax(base, mod));
    assert.equal(woundsMax(base, mod), 14);
});

test('woundsBase prefers a real (positive) base over the legacy max', () => {
    assert.equal(woundsBase(12, 0), 12);
    assert.equal(woundsBase(12, 99), 12);   // legacy max ignored once a real base is set
    assert.equal(woundsBase('15', null), 15);
});

test('woundsBase treats a non-positive base as unmigrated and uses the legacy max', () => {
    // Adding the `base` field back-fills the template default 0 into existing actors' source,
    // so a stored base of 0 means "not migrated yet" — recover the rolled value from `max`.
    assert.equal(woundsBase(0, 21), 21);        // the Isshan Jahan regression: base 0, max 21
    assert.equal(woundsBase(undefined, 12), 12);
    assert.equal(woundsBase(null, 12), 12);
    assert.equal(woundsBase(null, '18'), 18);
    assert.equal(woundsBase(0, 0), 0);          // brand-new empty actor — nothing to recover
    assert.equal(woundsBase(undefined, undefined), 0);
});

test('woundsBase + woundsMax: Sound Constitution stacks on both new and legacy actors', () => {
    // New actor (base=12) with two Sound Constitution AEs (modifier=2).
    assert.equal(woundsMax(woundsBase(12, null), 2), 14);
    // Legacy actor (only source max=12) with the same two AEs — same result, no double-count.
    assert.equal(woundsMax(woundsBase(null, 12), 2), 14);
});

test('resolveWoundsBase: origin model = 2×startingTB + roll', () => {
    // RT Core pp.18-26: base Wounds = 2 × starting Toughness Bonus + Home-World roll.
    assert.equal(resolveWoundsBase(3, 5, 0, 0), 11);   // TB 3, roll 5 -> 6 + 5
    assert.equal(resolveWoundsBase(4, 3, 0, 0), 11);   // TB 4, roll 3 -> 8 + 3
    assert.equal(resolveWoundsBase(3, 0, 0, 0), 6);    // roll 0 still counts once TB is set
    assert.equal(resolveWoundsBase('3', '5', null, null), 11);
});

test('resolveWoundsBase: Toughness advances do NOT change Wounds (startingTB is frozen)', () => {
    // The origin field holds the STARTING TB; a later Toughness advance never feeds this.
    const roll = 5;
    assert.equal(resolveWoundsBase(3, roll, 0, 0), 11);   // startingTB 3 at creation
    // Same character after raising Toughness — startingTB field is still 3, so base is unchanged.
    assert.equal(resolveWoundsBase(3, roll, 0, 0), 11);
});

test('resolveWoundsBase: falls back to legacy base/max until startingTB is entered', () => {
    // startingTB 0 (not yet filled on Chronicle) -> use the legacy stored base/max chain.
    assert.equal(resolveWoundsBase(0, 0, 21, 0), 21);    // 0.9.5/0.9.6 stored base
    assert.equal(resolveWoundsBase(0, 0, 0, 21), 21);    // pre-0.9.5 legacy source max (Isshan)
    assert.equal(resolveWoundsBase(0, 99, 0, 21), 21);   // stray roll ignored while startingTB 0
    assert.equal(resolveWoundsBase(0, 0, 0, 0), 0);
});
