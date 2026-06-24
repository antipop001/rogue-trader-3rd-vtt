// ENGINE-REACTION-ATTACK-TRIG — extra-ATTACK post-resolution triggers. Three talents
// grant an additional attack gated on a prior outcome: Counter Attack (after a successful
// Parry, Free Action at -20; RT Core p.115), Furious Assault (after an All Out Attack hit,
// spends a Reaction; RT Core p.117), WAAAGH! (after a Charge hit, spends a Reaction; ItS
// p.173). Engine-applied by name (NOT an AE — outcome-gated), so they live in the ratchet
// CODE_HANDLED list. This covers the extractable eligibility helper; the prompt/button on
// the result card + the Reaction spend are the Foundry-coupled E2E follow-up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraAttackEligibility } from '../../src/module/rolls/roll-helpers.mjs';

const counter = { name: 'Counter Attack', type: 'talent' };
const furious = { name: 'Furious Assault', type: 'talent' };
const waaagh = { name: 'WAAAGH!', type: 'talent' };

test('Counter Attack triggers only off a successful Parry (Free Action, -20)', () => {
    const r = extraAttackEligibility([counter], { parrySuccess: true });
    assert.equal(r.length, 1);
    assert.deepEqual(r[0], { talent: 'Counter Attack', trigger: 'parry', cost: 'Free Action', toHitMod: -20 });
    // No Parry success → nothing; the attack action is irrelevant to Counter Attack.
    assert.equal(extraAttackEligibility([counter], { hit: true, action: 'All Out Attack' }).length, 0);
});

test('Furious Assault triggers only on a successful All Out Attack hit (spends Reaction)', () => {
    const r = extraAttackEligibility([furious], { hit: true, action: 'All Out Attack' });
    assert.equal(r.length, 1);
    assert.deepEqual(r[0], { talent: 'Furious Assault', trigger: 'allOutAttack', cost: 'Reaction', toHitMod: 0 });
    // Wrong action, or a miss → not eligible.
    assert.equal(extraAttackEligibility([furious], { hit: true, action: 'Charge' }).length, 0);
    assert.equal(extraAttackEligibility([furious], { hit: false, action: 'All Out Attack' }).length, 0);
});

test('WAAAGH! triggers only on a successful Charge hit (spends Reaction)', () => {
    const r = extraAttackEligibility([waaagh], { hit: true, action: 'Charge' });
    assert.equal(r.length, 1);
    assert.deepEqual(r[0], { talent: 'WAAAGH!', trigger: 'charge', cost: 'Reaction', toHitMod: 0 });
    assert.equal(extraAttackEligibility([waaagh], { hit: true, action: 'All Out Attack' }).length, 0);
    assert.equal(extraAttackEligibility([waaagh], { hit: false, action: 'Charge' }).length, 0);
});

test('eligibility is empty without the relevant talent', () => {
    assert.equal(extraAttackEligibility([], { parrySuccess: true }).length, 0);
    assert.equal(extraAttackEligibility([{ name: 'Bestial', type: 'talent' }], { hit: true, action: 'Charge' }).length, 0);
});

test('multiple triggers can be eligible at once and match case-insensitively', () => {
    // A Charge that hits with both WAAAGH! and (hypothetically) Furious Assault present:
    // only the Charge-gated WAAAGH! fires (Furious Assault is All-Out-only).
    const r = extraAttackEligibility([furious, waaagh], { hit: true, action: 'Charge' });
    assert.equal(r.length, 1);
    assert.equal(r[0].talent, 'WAAAGH!');
    // Case-insensitive name match.
    assert.equal(extraAttackEligibility([{ name: 'counter attack', type: 'talent' }], { parrySuccess: true }).length, 1);
});

test('extraAttackEligibility is defensive on bad input', () => {
    assert.deepEqual(extraAttackEligibility(null, { hit: true, action: 'Charge' }), []);
    assert.deepEqual(extraAttackEligibility([waaagh]), []);
    assert.deepEqual(extraAttackEligibility([counter], {}), []);
});
