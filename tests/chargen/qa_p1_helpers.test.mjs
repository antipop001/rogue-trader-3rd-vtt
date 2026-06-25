// QA P1 pure-helper fixes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daemonicToughnessMultiplier, hasUnnaturalSpeed } from '../../src/module/rolls/roll-helpers.mjs';

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
