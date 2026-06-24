// ENGINE-CRITDAMAGE — Crack Shot (+2 ranged) / Crippling Strike (+4 melee) add extra
// Damage only when the attack causes Critical Damage (RT Core p.96). The helper returns
// the bonus; the crit gate lives in assign-damage-data.mjs (tested via E2E).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { critDamageBonus } from '../../src/module/rolls/roll-helpers.mjs';

const crackShot = { name: 'Crack Shot', type: 'talent' };
const cripplingStrike = { name: 'Crippling Strike', type: 'talent' };

test('Crippling Strike gives +4 only on a melee attack', () => {
    assert.equal(critDamageBonus([cripplingStrike], true, false), 4);
    assert.equal(critDamageBonus([cripplingStrike], false, true), 0); // ranged attack: no melee talent benefit
});

test('Crack Shot gives +2 only on a ranged attack', () => {
    assert.equal(critDamageBonus([crackShot], false, true), 2);
    assert.equal(critDamageBonus([crackShot], true, false), 0); // melee attack: no ranged talent benefit
});

test('matching is case-insensitive and exact (no false positives)', () => {
    assert.equal(critDamageBonus([{ name: 'crippling strike' }], true, false), 4);
    assert.equal(critDamageBonus([{ name: 'CRACK SHOT' }], false, true), 2);
    // Crushing Blow / Crack-anything must not match.
    assert.equal(critDamageBonus([{ name: 'Crushing Blow' }], true, false), 0);
    assert.equal(critDamageBonus([{ name: 'Crackpot Shooter' }], false, true), 0);
});

test('both talents on the same actor only apply to their respective attack type', () => {
    assert.equal(critDamageBonus([crackShot, cripplingStrike], true, false), 4);  // melee → Crippling only
    assert.equal(critDamageBonus([crackShot, cripplingStrike], false, true), 2);  // ranged → Crack only
});

test('robust to bad input', () => {
    assert.equal(critDamageBonus(null, true, false), 0);
    assert.equal(critDamageBonus(undefined, false, true), 0);
    assert.equal(critDamageBonus([], true, true), 0);
    assert.equal(critDamageBonus([{}], true, false), 0);
});
