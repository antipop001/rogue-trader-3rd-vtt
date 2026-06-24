// ENGINE-UNNATURAL (Quadruped slice) — the Quadruped trait scales the Agility-Bonus
// term of movement (RT Core p.366: "Movement equals AB×2"; ×3 six legs, ×4 eight legs).
// Engine-applied by trait name in base-actor._computeMovement (NOT an AE — it scales the
// derived Agility Bonus an AE can't read), so it lives in the ratchet CODE_HANDLED list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quadrupedMoveMultiplier } from '../../src/module/rolls/roll-helpers.mjs';

const trait = (name) => ({ name, type: 'trait' });

test('plain Quadruped is ×2', () => {
    assert.equal(quadrupedMoveMultiplier([trait('Quadruped')]), 2);
});

test('explicit (xN) multiplier wins', () => {
    assert.equal(quadrupedMoveMultiplier([trait('Quadruped (x3)')]), 3);
    assert.equal(quadrupedMoveMultiplier([trait('Quadruped (X4)')]), 4);
});

test('(N legs) count maps to N/2 multiplier (6→3, 8→4)', () => {
    assert.equal(quadrupedMoveMultiplier([trait('Quadruped (8 legs)')]), 4);
    assert.equal(quadrupedMoveMultiplier([trait('Quadruped (6 legs)')]), 3);
});

test('no Quadruped trait leaves the multiplier at 1', () => {
    assert.equal(quadrupedMoveMultiplier([]), 1);
    assert.equal(quadrupedMoveMultiplier([trait('Bestial'), trait('Natural Weapons')]), 1);
});

test('matches case-insensitively and tolerates the choice-appended name form', () => {
    assert.equal(quadrupedMoveMultiplier([trait('quadruped')]), 2);
    assert.equal(quadrupedMoveMultiplier([trait('QUADRUPED (x3)')]), 3);
});

test('never returns below ×2 for a Quadruped (guards malformed leg counts)', () => {
    assert.equal(quadrupedMoveMultiplier([trait('Quadruped (2 legs)')]), 2);
    assert.equal(quadrupedMoveMultiplier([trait('Quadruped (x1)')]), 2);
});

test('is defensive on bad input', () => {
    assert.equal(quadrupedMoveMultiplier(null), 1);
    assert.equal(quadrupedMoveMultiplier(undefined), 1);
});
