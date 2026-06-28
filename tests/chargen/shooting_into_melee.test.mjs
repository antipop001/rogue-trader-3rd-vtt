// QA-156 — Shooting into Melee penalty (RT Core p.244).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shootingIntoMeleePenalty } from '../../src/module/rolls/roll-helpers.mjs';

test('QA-156: -20 only when target engaged + nobody waived', () => {
    assert.equal(shootingIntoMeleePenalty(false, []), 0);                         // not in melee
    assert.equal(shootingIntoMeleePenalty(false, [{waived:false}]), -20);         // engaged, no waiver
    assert.equal(shootingIntoMeleePenalty(true, [{waived:false}]), 0);            // target helpless -> waived
    assert.equal(shootingIntoMeleePenalty(false, [{waived:true}]), 0);            // meleer stunned -> waived
    assert.equal(shootingIntoMeleePenalty(false, [{waived:false},{waived:true}]), 0); // any waived
});
