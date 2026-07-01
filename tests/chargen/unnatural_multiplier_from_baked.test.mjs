import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unnaturalMultiplierFromBaked, initiativeCharBonus } from '../../src/module/rolls/roll-helpers.mjs';

// BUG-Q-249: NPCs pre-bake Unnatural into `characteristic.unnatural` (no trait item), so the
// multiplier must be recoverable from the baked additive: N = bonus / (bonus - unnatural).

test('Unnatural (x2) recovered from baked characteristic', () => {
    // Ag 41 → rawBonus 4, Unnatural (x2) → unnatural 4, bonus 8 → mult 2.
    assert.equal(unnaturalMultiplierFromBaked(8, 4), 2);
});

test('Unnatural (x3) recovered from baked characteristic', () => {
    // rawBonus 4, unnatural 8, bonus 12 → mult 3.
    assert.equal(unnaturalMultiplierFromBaked(12, 8), 3);
});

test('no Unnatural component returns 1', () => {
    assert.equal(unnaturalMultiplierFromBaked(4, 0), 1);
});

test('tolerates a small flat cyber bonus baked into the bonus', () => {
    // bonus 9, unnatural 4 → 9/5 = 1.8 rounds to 2.
    assert.equal(unnaturalMultiplierFromBaked(9, 4), 2);
});

test('degenerate/zero inputs are safe', () => {
    assert.equal(unnaturalMultiplierFromBaked(0, 0), 1);
    assert.equal(unnaturalMultiplierFromBaked(4, 4), 1); // rawBonus 0 → guard
});

test('feeds Lightning Reflexes: baked Unnatural Agility (x2) NPC → x3 Initiative multiplier', () => {
    // Ag 41: rawBonus 4, baked unnatural 4, bonus 8. NPC has Lightning Reflexes + no trait item.
    const mult = unnaturalMultiplierFromBaked(8, 4); // 2
    // Lightning Reflexes: rawBonus * (mult + 1) = 4 * 3 = 12 (vs the buggy 4 * (1+1) = 8).
    assert.equal(initiativeCharBonus(4, 8, true, mult), 12);
});
