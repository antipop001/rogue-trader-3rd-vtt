// QA-092/093 — RT Damage states + natural healing (RT Core p.262).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { woundDamageState, woundRecovery } from '../../src/module/rolls/roll-helpers.mjs';

test('QA-093: damage states by TB thresholds', () => {
    // TB 4: Lightly when damage taken <= 8, Heavily when > 8, Critically at <=0 wounds
    assert.equal(woundDamageState(20, 20, 4), 'Healthy');       // no damage
    assert.equal(woundDamageState(15, 20, 4), 'Lightly Damaged'); // 5 taken <= 8
    assert.equal(woundDamageState(12, 20, 4), 'Lightly Damaged'); // 8 taken = 2*TB
    assert.equal(woundDamageState(11, 20, 4), 'Heavily Damaged'); // 9 taken > 8
    assert.equal(woundDamageState(0, 20, 4), 'Critically Damaged'); // at 0
    assert.equal(woundDamageState(-3, 20, 4), 'Critically Damaged'); // in excess
});

test('QA-092: recovery amounts per state + rest period', () => {
    assert.equal(woundRecovery('Lightly Damaged', 4, 'day'), 4);   // bed rest day = TB
    assert.equal(woundRecovery('Heavily Damaged', 4, 'day'), 1);   // 1/day passive
    assert.equal(woundRecovery('Heavily Damaged', 4, 'week'), 4);  // complete week = TB
    assert.equal(woundRecovery('Critically Damaged', 4, 'week'), 1); // 1 critical/week
    assert.equal(woundRecovery('Critically Damaged', 4, 'day'), 0);  // day insufficient
    assert.equal(woundRecovery('Healthy', 4, 'week'), 0);
});

import { rapidReloadTime } from '../../src/module/rolls/roll-helpers.mjs';
test('QA-018: Customised reload halves rounding UP (vs Rapid Reload rounding down)', () => {
    assert.equal(rapidReloadTime('Full', true, true), 'Half Action');      // 1 -> 0.5 -> Half
    assert.equal(rapidReloadTime('2 Full', true, true), 'Full Action');    // 2 -> 1 -> Full
    assert.equal(rapidReloadTime('3 Full', true, true), '2 Full Actions'); // 3 -> 1.5 -> ceil 2
    assert.equal(rapidReloadTime('Half', true, true), 'Half Action');      // 0.5 stays 0.5
    assert.equal(rapidReloadTime('3 Full', true, false), 'Full Action');   // round-down unchanged: floor 1
});
