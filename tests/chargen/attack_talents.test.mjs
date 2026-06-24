// ENGINE-ATTACK-TALENTS — Swift Attack / Lightning Attack melee multi-attack talents.
// Pure-JS coverage of the flat extra-hit count helper (attackTalentExtraHits). RT Core
// p.107 (Swift Attack: two melee attacks) / p.102 (Lightning Attack: three melee
// attacks). The dropdown-gating (only show when the actor owns the talent) and the
// additional-hits application are Foundry-coupled → E2E follow-up (E2E-ATTACK-TALENTS).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attackTalentExtraHits } from '../../src/module/rolls/roll-helpers.mjs';

test('Swift Attack grants exactly one flat extra melee hit (two attacks)', () => {
    assert.equal(attackTalentExtraHits('Swift Attack'), 1);
});

test('Lightning Attack grants exactly two flat extra melee hits (three attacks)', () => {
    assert.equal(attackTalentExtraHits('Lightning Attack'), 2);
});

test('non-talent actions get no extra hits', () => {
    assert.equal(attackTalentExtraHits('Standard Attack'), 0);
    assert.equal(attackTalentExtraHits('Full Auto Burst'), 0);
    assert.equal(attackTalentExtraHits('Charge'), 0);
    assert.equal(attackTalentExtraHits(''), 0);
});

test('the count is flat — not scaled by degrees of success', () => {
    // The helper takes only the action name: there is no DoS input, so the count
    // cannot vary with the roll (RT canon is a fixed 2/3 attacks, not DH2 DoS-scaling).
    assert.equal(attackTalentExtraHits('Swift Attack'), attackTalentExtraHits('Swift Attack'));
    assert.equal(attackTalentExtraHits.length, 1);
});

test('bad input is handled (undefined / null / non-string)', () => {
    assert.equal(attackTalentExtraHits(undefined), 0);
    assert.equal(attackTalentExtraHits(null), 0);
    assert.equal(attackTalentExtraHits(42), 0);
});
