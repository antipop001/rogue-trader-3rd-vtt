// QA P1 pure-helper fixes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daemonicToughnessMultiplier, hasUnnaturalSpeed, weaponUntrainedPenalty, reactionBudget, canSpendReaction } from '../../src/module/rolls/roll-helpers.mjs';

test('QA-142: Daemonic TB-doubling matches "Daemonic" + "Daemonic (TB X)", not "Daemonic Presence"', () => {
    assert.equal(daemonicToughnessMultiplier([{ name: 'Daemonic' }]), 2);
    assert.equal(daemonicToughnessMultiplier([{ name: 'Daemonic (TB 8)' }]), 2);
    assert.equal(daemonicToughnessMultiplier([{ name: 'Daemonic Presence' }]), 1);
    assert.equal(daemonicToughnessMultiplier([{ name: 'Bestial' }]), 1);
    assert.equal(daemonicToughnessMultiplier([]), 1);
});

test('QA-077: hasUnnaturalSpeed matches the Unnatural Speed trait only', () => {
    assert.equal(hasUnnaturalSpeed([{ name: 'Unnatural Speed' }]), true);
    assert.equal(hasUnnaturalSpeed([{ name: 'Unnatural Speed (x2)' }]), true);
    assert.equal(hasUnnaturalSpeed([{ name: 'Quadruped' }]), false);
    assert.equal(hasUnnaturalSpeed([]), false);
});

test('QA-124: weaponUntrainedPenalty enforces Weapon Training (Universal + groups)', () => {
    assert.equal(weaponUntrainedPenalty([{ name: 'Basic Weapon Training (Bolt)' }], 'Basic', 'Bolt'), 0);
    assert.equal(weaponUntrainedPenalty([{ name: 'Basic Weapon Training (Universal)' }], 'Basic', 'Las'), 0);
    assert.equal(weaponUntrainedPenalty([], 'Basic', 'Bolt'), -20);
    assert.equal(weaponUntrainedPenalty([{ name: 'Pistol Weapon Training (SP)' }], 'Basic', 'SP'), -20); // wrong class
    assert.equal(weaponUntrainedPenalty([{ name: 'Thrown Weapon Training' }], 'Thrown', 'Primitive'), 0);
    assert.equal(weaponUntrainedPenalty([], 'Thrown', 'Primitive'), -20);
    assert.equal(weaponUntrainedPenalty([{ name: 'Exotic Weapon Training' }], 'Basic', 'Exotic'), 0);
    assert.equal(weaponUntrainedPenalty([{ name: 'Flame Weapon Training (Universal)' }], 'Pistol', 'Flame'), 0);
    assert.equal(weaponUntrainedPenalty([], '', 'Bolt'), 0); // unknown class → no penalty
});

test('QA-160: reactionBudget + canSpendReaction grant exactly one extra Reaction', () => {
    const none = reactionBudget([]);
    assert.equal(none.modifier, 0);
    const nymune = reactionBudget([{ name: 'Hyperactive Nymune Organ' }]);
    assert.equal(nymune.modifier, 1);
    // Mirror the acolyte derivation: maxima bake in the modifier.
    const rc = { base: 1, modifier: nymune.modifier, dodge: { max: nymune.dodge + nymune.modifier, value: 0 }, parry: { max: nymune.parry + nymune.modifier, value: 0 } };
    // Two reactions total (base 1 + modifier 1), usable as either type — not four.
    assert.equal(canSpendReaction(rc, 'dodge'), true);
    rc.dodge.value = 1;
    assert.equal(canSpendReaction(rc, 'parry'), true);   // 2nd reaction (as a parry) still allowed
    rc.parry.value = 1;
    assert.equal(canSpendReaction(rc, 'dodge'), false);  // shared total of 2 now spent
});
