// ENGINE-WOUNDS-MOD — pure-JS test for the additive Wounds-maximum helper.
// Mirrors Initiative's additive `modifier` term (BUG-002): maximum Wounds = the stored/
// rolled base plus any effect-written modifier. Sound Constitution (RT Core p.111) adds
// +1 via an AE on system.wounds.modifier; multiple instances stack.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { woundsMax, woundsBase } from '../../src/module/rolls/roll-helpers.mjs';

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

test('woundsBase prefers the explicit base field', () => {
    assert.equal(woundsBase(12, 0), 12);
    assert.equal(woundsBase(12, 99), 12);   // legacy max ignored once base is set
    assert.equal(woundsBase('15', null), 15);
    assert.equal(woundsBase(0, 12), 0);     // an explicit 0 base is honoured, not overridden
});

test('woundsBase falls back to the legacy source max when base is absent', () => {
    // Actors/NPCs created before the `base` field: rolled value lives in source `max`.
    assert.equal(woundsBase(undefined, 12), 12);
    assert.equal(woundsBase(null, 12), 12);
    assert.equal(woundsBase(null, '18'), 18);
    assert.equal(woundsBase(undefined, undefined), 0);
});

test('woundsBase + woundsMax: Sound Constitution stacks on both new and legacy actors', () => {
    // New actor (base=12) with two Sound Constitution AEs (modifier=2).
    assert.equal(woundsMax(woundsBase(12, null), 2), 14);
    // Legacy actor (only source max=12) with the same two AEs — same result, no double-count.
    assert.equal(woundsMax(woundsBase(null, 12), 2), 14);
});
