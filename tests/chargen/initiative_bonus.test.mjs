// ENGINE-INIT-EXTRA — Lightning Reflexes Initiative multiplier (RT Core p.110).
// initiativeCharBonus returns the governing-characteristic contribution to Initiative:
// the normal bonus by default; the raw Agility Bonus times (Unnatural multiplier + 1)
// with the talent. The 4th arg is the Unnatural multiplier (≥2, else 1/falsy), NOT a
// boolean — BUG-Q-188: a fixed ×3 under-counts Unnatural Agility (×3)/(×4). Wary's +1
// is a plain AE on system.initiative.modifier, added on top of this term in acolyte.mjs
// (not exercised here — pure node can't run derived data).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initiativeCharBonus } from '../../src/module/rolls/roll-helpers.mjs';

test('without Lightning Reflexes the normal bonus is returned unchanged', () => {
    assert.equal(initiativeCharBonus(4, 4, false, 1), 4);
    // Unnatural Agility already folded into normalBonus (raw 4 + unnatural 4 = 8).
    assert.equal(initiativeCharBonus(4, 8, false, 2), 8);
});

test('Lightning Reflexes doubles the raw Agility Bonus (no Unnatural)', () => {
    assert.equal(initiativeCharBonus(4, 4, true, 1), 8);
    assert.equal(initiativeCharBonus(3, 3, true, 1), 6);
    assert.equal(initiativeCharBonus(0, 0, true, 1), 0);
});

test('Unnatural Agility raises the Lightning Reflexes multiplier from 2 to 3', () => {
    // raw 4, normalBonus 8 (UA-doubled) — LR uses ×(2+1) the RAW bonus, not the doubled one.
    assert.equal(initiativeCharBonus(4, 8, true, 2), 12);
    assert.equal(initiativeCharBonus(5, 10, true, 2), 15);
});

test('Unnatural Agility (×3)/(×4) scales the multiplier (never under-counts) — BUG-Q-188', () => {
    // ×3: normal bonus rawBonus×3 = 12; LR must exceed it → ×(3+1) = 16 (+rawBonus over normal).
    assert.equal(initiativeCharBonus(4, 12, true, 3), 16);
    // ×4: a fixed ×3 (12) would be LESS than the normal ×4 bonus (16); correct is ×(4+1) = 20.
    assert.equal(initiativeCharBonus(4, 16, true, 4), 20);
});

test('a stray falsy/low multiplier collapses to the no-Unnatural ×2 path', () => {
    assert.equal(initiativeCharBonus(4, 4, true, 0), 8);
    assert.equal(initiativeCharBonus(4, 4, true, undefined), 8);
});
