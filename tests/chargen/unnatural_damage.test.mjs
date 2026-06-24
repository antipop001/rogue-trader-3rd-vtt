// ENGINE-UNNATURAL-DAMAGE — the damage/psychic-path Unnatural-style multipliers that
// can't be a characteristic AE:
//  - Daemonic (RT Core p.364): a Daemonic target soaks all damage with ×2 its Toughness
//    Bonus. Engine-applied by trait name in assign-damage-data.update (doubles the
//    per-location TB used for damage reduction + True Grit). NOT an AE → ratchet CODE_HANDLED.
//  - Bastion of Iron Will (RT Core p.94): doubles the defender's defensive Psy Rating on an
//    Opposed Test (Psyniscience / Psychic Techniques). Helper supplies the ×2; the
//    opposed-resist apply point is the Foundry-coupled follow-up. NOT an AE → CODE_HANDLED.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daemonicToughnessMultiplier, bastionPsyMultiplier } from '../../src/module/rolls/roll-helpers.mjs';

const trait = (name) => ({ name, type: 'trait' });
const talent = (name) => ({ name, type: 'talent' });

test('Daemonic doubles the Toughness-Bonus soak multiplier', () => {
    assert.equal(daemonicToughnessMultiplier([trait('Daemonic')]), 2);
});

test('Daemonic matches case-insensitively', () => {
    assert.equal(daemonicToughnessMultiplier([trait('daemonic')]), 2);
    assert.equal(daemonicToughnessMultiplier([trait('DAEMONIC')]), 2);
});

test('no Daemonic trait leaves the soak multiplier at 1', () => {
    assert.equal(daemonicToughnessMultiplier([]), 1);
    assert.equal(daemonicToughnessMultiplier([trait('Bestial'), trait('From Beyond')]), 1);
});

test('daemonicToughnessMultiplier is defensive on bad input', () => {
    assert.equal(daemonicToughnessMultiplier(null), 1);
    assert.equal(daemonicToughnessMultiplier(undefined), 1);
});

test('Bastion of Iron Will doubles the defensive Psy Rating multiplier', () => {
    assert.equal(bastionPsyMultiplier([talent('Bastion of Iron Will')]), 2);
});

test('Bastion matches case-insensitively', () => {
    assert.equal(bastionPsyMultiplier([talent('bastion of iron will')]), 2);
});

test('no Bastion talent leaves the Psy multiplier at 1', () => {
    assert.equal(bastionPsyMultiplier([]), 1);
    assert.equal(bastionPsyMultiplier([talent('Strong Minded'), talent('Psy Rating')]), 1);
});

test('bastionPsyMultiplier is defensive on bad input', () => {
    assert.equal(bastionPsyMultiplier(null), 1);
    assert.equal(bastionPsyMultiplier(undefined), 1);
});
