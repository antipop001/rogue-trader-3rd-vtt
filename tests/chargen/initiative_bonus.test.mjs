// ENGINE-INIT-EXTRA — Lightning Reflexes Initiative multiplier (RT Core p.110).
// initiativeCharBonus returns the governing-characteristic contribution to Initiative:
// the normal bonus by default; twice the raw Agility Bonus with the talent (×3 with
// Unnatural Agility). Wary's +1 is a plain AE on system.initiative.modifier, added on
// top of this term in acolyte.mjs (not exercised here — pure node can't run derived data).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initiativeCharBonus } from '../../src/module/rolls/roll-helpers.mjs';

test('without Lightning Reflexes the normal bonus is returned unchanged', () => {
    assert.equal(initiativeCharBonus(4, 4, false, false), 4);
    // Unnatural Agility already folded into normalBonus (raw 4 + unnatural 4 = 8).
    assert.equal(initiativeCharBonus(4, 8, false, true), 8);
});

test('Lightning Reflexes doubles the raw Agility Bonus', () => {
    assert.equal(initiativeCharBonus(4, 4, true, false), 8);
    assert.equal(initiativeCharBonus(3, 3, true, false), 6);
    assert.equal(initiativeCharBonus(0, 0, true, false), 0);
});

test('Unnatural Agility raises the Lightning Reflexes multiplier from 2 to 3', () => {
    // raw 4, normalBonus 8 (UA-doubled) — LR uses ×3 the RAW bonus, not the doubled one.
    assert.equal(initiativeCharBonus(4, 8, true, true), 12);
    assert.equal(initiativeCharBonus(5, 10, true, true), 15);
});
