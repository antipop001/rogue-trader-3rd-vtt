// QA-094 — canon Degrees of Success/Failure (band method) + opposed degrees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degreesOfSuccess, degreesOfFailure, getOpposedDegrees } from '../../src/module/rolls/roll-helpers.mjs';

test('QA-094: degreesOfSuccess = floor((target-roll)/10), canon band count', () => {
    assert.equal(degreesOfSuccess(42, 18), 2);   // RT Core p.22 Yolanda example
    assert.equal(degreesOfSuccess(58, 29), 2);   // RT ship example
    assert.equal(degreesOfSuccess(42, 40), 0);   // bare success (<10 under) = 0 DoS
    assert.equal(degreesOfSuccess(42, 42), 0);   // exactly on target
    assert.equal(degreesOfSuccess(99, 1), 9);    // max
    // NOT the DH2 1+tens-diff (which gave 1+(4-1)=4 for 18 vs 42)
    assert.notEqual(degreesOfSuccess(42, 18), 4);
});

test('QA-094: degreesOfFailure = floor((roll-target)/10), canon band count', () => {
    assert.equal(degreesOfFailure(42, 55), 1);   // missed by 13 -> 1 DoF
    assert.equal(degreesOfFailure(42, 43), 0);   // bare failure (<10 over) = 0 DoF
    assert.equal(degreesOfFailure(42, 72), 3);   // missed by 30 -> 3 DoF
});

test('QA-094: getOpposedDegrees is success-aware (a bare 0-DoS success still beats a failure)', () => {
    // both succeed: net = attacker DoS - defender DoS
    assert.equal(getOpposedDegrees(true, 3, 0, true, 1, 0), 2);
    assert.equal(getOpposedDegrees(true, 1, 0, true, 1, 0), 0);   // tie
    // attacker bare success (0 DoS) vs defender failure -> attacker wins (>0)
    assert.ok(getOpposedDegrees(true, 0, 0, false, 0, 0) > 0);
    // attacker fail vs defender success -> negative
    assert.ok(getOpposedDegrees(false, 0, 0, true, 0, 0) < 0);
    // attacker big success vs defender bare failure
    assert.equal(getOpposedDegrees(true, 2, 0, false, 0, 0), 3);  // 2 - (-(0+1))
});
