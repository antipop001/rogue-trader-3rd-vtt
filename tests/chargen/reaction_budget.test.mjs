// ENGINE-REACTION-BUDGET — per-Round Reaction budget (RT Core p.244).
// reactionBudget(talents) returns the per-Round MAX Dodges/Parries: base 1 Reaction
// (Dodge or Parry), + Step Aside (p.119) a second Dodge-only Reaction, + Wall of Steel
// (p.121) a second Parry-only Reaction. Pure helper; the used-this-Round tracker + reset
// is the Foundry-coupled half (E2E follow-up). These talents are engine-applied by name
// and must NOT also be ActiveEffects (double-apply guard in effect_wiring_audit.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reactionBudget } from '../../src/module/rolls/roll-helpers.mjs';

test('no talents → one base Reaction, one Dodge, one Parry', () => {
    const b = reactionBudget([]);
    assert.deepEqual(b, { base: 1, modifier: 0, dodge: 1, parry: 1 });
});

test('Step Aside grants a second Dodge only', () => {
    const b = reactionBudget([{ name: 'Step Aside' }]);
    assert.equal(b.dodge, 2);
    assert.equal(b.parry, 1);
    assert.equal(b.base, 1);
});

test('Wall of Steel grants a second Parry only', () => {
    const b = reactionBudget([{ name: 'Wall of Steel' }]);
    assert.equal(b.parry, 2);
    assert.equal(b.dodge, 1);
});

test('both talents stack independently per type', () => {
    const b = reactionBudget([{ name: 'Step Aside' }, { name: 'Wall of Steel' }]);
    assert.equal(b.dodge, 2);
    assert.equal(b.parry, 2);
});

test('match is case-insensitive and ignores unrelated talents', () => {
    const b = reactionBudget([{ name: 'STEP ASIDE' }, { name: 'Quick Draw' }]);
    assert.equal(b.dodge, 2);
    assert.equal(b.parry, 1);
});

test('null / non-array input is safe', () => {
    assert.deepEqual(reactionBudget(null), { base: 1, modifier: 0, dodge: 1, parry: 1 });
    assert.deepEqual(reactionBudget(undefined), { base: 1, modifier: 0, dodge: 1, parry: 1 });
});
