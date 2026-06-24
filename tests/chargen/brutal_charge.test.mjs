// ENGINE-EXTRA-DEFENCE (Brutal Charge slice) — the Brutal Charge trait adds +3 melee
// damage on a Charge (RT Core p.364). Engine-applied by trait name in damage-data.mjs
// (NOT an AE — gated on the Charge action), so it lives in the ratchet CODE_HANDLED list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brutalChargeBonus } from '../../src/module/rolls/roll-helpers.mjs';

const bc = { name: 'Brutal Charge', type: 'trait' };

test('brutalChargeBonus grants +3 only on a Charge with the trait', () => {
    assert.equal(brutalChargeBonus([bc], 'Charge'), 3);
    assert.equal(brutalChargeBonus([bc], 'Standard Attack'), 0);
    assert.equal(brutalChargeBonus([bc], 'All Out Attack'), 0);
});

test('brutalChargeBonus is 0 without the trait', () => {
    assert.equal(brutalChargeBonus([], 'Charge'), 0);
    assert.equal(brutalChargeBonus([{ name: 'Bestial', type: 'trait' }], 'Charge'), 0);
});

test('brutalChargeBonus matches the trait name case-insensitively', () => {
    assert.equal(brutalChargeBonus([{ name: 'brutal charge', type: 'trait' }], 'Charge'), 3);
});

test('brutalChargeBonus is defensive on bad input', () => {
    assert.equal(brutalChargeBonus(null, 'Charge'), 0);
    assert.equal(brutalChargeBonus([bc], undefined), 0);
});
