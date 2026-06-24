// ENGINE-REACTION-BUDGET-TRACK — per-Round Reaction spend gate (RT Core p.244).
// canSpendReaction(reactions, type) answers "is a Dodge/Parry Reaction still available
// this Round?" given the per-Round budget (from reactionBudget) and the USED counters.
// The base Reaction is SHARED (Dodge OR Parry), so the per-Round total is capped at
// dodge.max + parry.max − base even though each type also has its own cap. Pure helper;
// the value mutation (rollSkill spend + combat-tracker reset) is Foundry-coupled (E2E).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSpendReaction } from '../../src/module/rolls/roll-helpers.mjs';

const fresh = (over = {}) => ({
    base: 1,
    dodge: { max: 1, value: 0 },
    parry: { max: 1, value: 0 },
    ...over,
});

test('default budget: a fresh actor can Dodge OR Parry', () => {
    const rc = fresh();
    assert.equal(canSpendReaction(rc, 'dodge'), true);
    assert.equal(canSpendReaction(rc, 'parry'), true);
});

test('default budget: spending the base Reaction blocks the other (shared base)', () => {
    // One Dodge already used → the single shared Reaction is gone, no Parry left.
    const rc = fresh({ dodge: { max: 1, value: 1 } });
    assert.equal(canSpendReaction(rc, 'dodge'), false); // per-type cap reached
    assert.equal(canSpendReaction(rc, 'parry'), false); // overall budget spent
});

test('Step Aside: 2 Dodges max, but only 1 Parry, total 2', () => {
    const max = { base: 1, dodge: { max: 2, value: 0 }, parry: { max: 1, value: 0 } };
    assert.equal(canSpendReaction(max, 'dodge'), true);
    assert.equal(canSpendReaction(max, 'parry'), true);
    // after one Dodge: still a Dodge left, and a Parry (total used 1 < 2)
    const used1 = { base: 1, dodge: { max: 2, value: 1 }, parry: { max: 1, value: 0 } };
    assert.equal(canSpendReaction(used1, 'dodge'), true);
    assert.equal(canSpendReaction(used1, 'parry'), true);
    // after two Dodges: per-type cap hit, and overall budget (2) spent
    const used2 = { base: 1, dodge: { max: 2, value: 2 }, parry: { max: 1, value: 0 } };
    assert.equal(canSpendReaction(used2, 'dodge'), false);
    assert.equal(canSpendReaction(used2, 'parry'), false);
    // 1 Dodge + 1 Parry already used → total 2, nothing left
    const mixed = { base: 1, dodge: { max: 2, value: 1 }, parry: { max: 1, value: 1 } };
    assert.equal(canSpendReaction(mixed, 'dodge'), false);
    assert.equal(canSpendReaction(mixed, 'parry'), false);
});

test('Wall of Steel: 2 Parries max, only 1 Dodge, total 2', () => {
    const max = { base: 1, dodge: { max: 1, value: 0 }, parry: { max: 2, value: 0 } };
    assert.equal(canSpendReaction(max, 'parry'), true);
    const used2 = { base: 1, dodge: { max: 1, value: 0 }, parry: { max: 2, value: 2 } };
    assert.equal(canSpendReaction(used2, 'parry'), false);
    assert.equal(canSpendReaction(used2, 'dodge'), false); // overall budget (2) spent
});

test('both talents: total 3 (2 Dodge + 1 Parry, or 1 Dodge + 2 Parry)', () => {
    const both = { base: 1, dodge: { max: 2, value: 0 }, parry: { max: 2, value: 0 } };
    assert.equal(canSpendReaction(both, 'dodge'), true);
    assert.equal(canSpendReaction(both, 'parry'), true);
    // 2 Dodges + nothing → one Parry still left (total 2 < 3)
    const d2 = { base: 1, dodge: { max: 2, value: 2 }, parry: { max: 2, value: 0 } };
    assert.equal(canSpendReaction(d2, 'dodge'), false); // dodge cap reached
    assert.equal(canSpendReaction(d2, 'parry'), true);  // total 2 < 3
    // 2 Dodge + 1 Parry → total 3, exhausted
    const d2p1 = { base: 1, dodge: { max: 2, value: 2 }, parry: { max: 2, value: 1 } };
    assert.equal(canSpendReaction(d2p1, 'parry'), false);
});

test('invalid input is safe (false, no throw)', () => {
    assert.equal(canSpendReaction(null, 'dodge'), false);
    assert.equal(canSpendReaction(fresh(), 'block'), false);
    assert.equal(canSpendReaction(undefined, 'parry'), false);
});

test('missing sub-objects fall back to the shared base (1 total)', () => {
    // Pre-schema NPC data with only `base` — defaults each cap to base, total 1.
    const bare = { base: 1 };
    assert.equal(canSpendReaction(bare, 'dodge'), true);
    const partial = { base: 1, dodge: { max: 1, value: 1 } };
    assert.equal(canSpendReaction(partial, 'parry'), false); // base consumed by the Dodge
});
