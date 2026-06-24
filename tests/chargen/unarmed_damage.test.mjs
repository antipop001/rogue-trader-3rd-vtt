// ENGINE-NATWEAPONS — unarmed / natural-weapon damage-formula override. RT 1e sets the
// dice (and Primitive quality) of an unarmed strike from the attacker's best applicable
// talent/trait (RT Core p.122 Unarmed Master/Warrior, p.367 Natural Weapons, ItS Improved
// Natural Weapons). Engine-applied by name in damage-data.mjs (NOT an AE — it rewrites the
// damage formula), so the four entries live in the ratchet CODE_HANDLED list. The Strength
// Bonus is added separately by the melee damage path, so the formula is the dice only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unarmedDamageProfile } from '../../src/module/rolls/roll-helpers.mjs';

const talent = (name) => ({ name, type: 'talent' });
const trait = (name) => ({ name, type: 'trait' });

test('baseline unarmed strike is 1d5-3, Primitive', () => {
    const p = unarmedDamageProfile([], []);
    assert.equal(p.formula, '1d5-3');
    assert.equal(p.primitive, true);
    assert.equal(p.source, 'Unarmed');
});

test('Unarmed Warrior → 1d10-3, still Primitive', () => {
    const p = unarmedDamageProfile([talent('Unarmed Warrior')], []);
    assert.equal(p.formula, '1d10-3');
    assert.equal(p.primitive, true);
    assert.equal(p.source, 'Unarmed Warrior');
});

test('Unarmed Master → 1d10, no Primitive (and beats Unarmed Warrior)', () => {
    const p = unarmedDamageProfile([talent('Unarmed Warrior'), talent('Unarmed Master')], []);
    assert.equal(p.formula, '1d10');
    assert.equal(p.primitive, false);
    assert.equal(p.source, 'Unarmed Master');
});

test('Natural Weapons → 1d10, Primitive', () => {
    const p = unarmedDamageProfile([], [trait('Natural Weapons')]);
    assert.equal(p.formula, '1d10');
    assert.equal(p.primitive, true);
    assert.equal(p.source, 'Natural Weapons');
});

test('Improved Natural Weapons → 1d10, no Primitive', () => {
    const p = unarmedDamageProfile([], [trait('Improved Natural Weapons')]);
    assert.equal(p.formula, '1d10');
    assert.equal(p.primitive, false);
    assert.equal(p.source, 'Improved Natural Weapons');
});

test('best profile wins: non-Primitive 1d10 over a Primitive 1d10', () => {
    // Natural Weapons (1d10 Primitive) + Improved Natural Weapons (1d10 non-Primitive).
    const p = unarmedDamageProfile([], [trait('Natural Weapons'), trait('Improved Natural Weapons')]);
    assert.equal(p.formula, '1d10');
    assert.equal(p.primitive, false);
});

test('Natural Weapons (1d10 Primitive) beats Unarmed Warrior (1d10-3)', () => {
    const p = unarmedDamageProfile([talent('Unarmed Warrior')], [trait('Natural Weapons')]);
    assert.equal(p.formula, '1d10');
    assert.equal(p.primitive, true);
    assert.equal(p.source, 'Natural Weapons');
});

test('case-insensitive name match; bad input is safe', () => {
    assert.equal(unarmedDamageProfile([talent('UNARMED MASTER')], []).formula, '1d10');
    assert.equal(unarmedDamageProfile(null, undefined).formula, '1d5-3');
    assert.equal(unarmedDamageProfile([{}], [{ name: null }]).formula, '1d5-3');
});
