// RT Core p.368 (Size trait): "When calculating a creature's movement, apply the size
// modifier first, and then other modifiers from other Traits or talents. Base movement can
// never be reduced below 1." BUG-Q-241: the Quadruped multiplier used to scale the Agility
// Bonus BEFORE the size modifier was added, mis-scaling every Quadruped-with-Size creature.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseHalfMove } from '../../src/module/rolls/roll-helpers.mjs';

test('Average-size biped: Half Move equals the Agility Bonus', () => {
    assert.equal(baseHalfMove(3, 4, 1, false), 3);
    assert.equal(baseHalfMove(5, 4, 1, false), 5);
});

test('size modifier is additive at multiplier ×1', () => {
    assert.equal(baseHalfMove(3, 5, 1, false), 4); // Hulking +1
    assert.equal(baseHalfMove(3, 6, 1, false), 5); // Enormous +2
    assert.equal(baseHalfMove(3, 3, 1, false), 2); // Scrawny -1
});

test('size modifier is applied BEFORE the Quadruped multiplier (BUG-Q-241)', () => {
    // Quadruped (×2) Hulking (+1), AB 3 → (3 + 1) × 2 = 8, NOT 3×2 + 1 = 7
    assert.equal(baseHalfMove(3, 5, 2, false), 8);
    // Quadruped (×2) Average, AB 4 → (4 + 0) × 2 = 8
    assert.equal(baseHalfMove(4, 4, 2, false), 8);
    // Quadruped (×3) Enormous (+2), AB 2 → (2 + 2) × 3 = 12
    assert.equal(baseHalfMove(2, 6, 3, false), 12);
});

test('Unnatural Speed doubles the whole post-size base', () => {
    // Average, AB 3, Unnatural Speed → 3 × 2 = 6
    assert.equal(baseHalfMove(3, 4, 1, true), 6);
    // Quadruped (×2) Hulking (+1), AB 3, Unnatural Speed → ((3+1)×2)×2 = 16
    assert.equal(baseHalfMove(3, 5, 2, true), 16);
});

test('Half Move floored at 1 for small / low-Agility actors', () => {
    assert.equal(baseHalfMove(1, 1, 1, false), 1); // Minuscule AB 1 → 1 + (-3) = -2 → 1
    assert.equal(baseHalfMove(0, 4, 1, false), 1); // AB 0 Average → 0 → 1
});

test('a missing/malformed size falls back to Average, never NaN (BUG-Q-244)', () => {
    // Undefined or NaN size (uninitialised actor) must not zero out movement.
    assert.equal(baseHalfMove(3, NaN, 1, false), 3); // treated as Average → AB 3
    assert.equal(baseHalfMove(3, undefined, 1, false), 3);
    assert.equal(baseHalfMove(5, undefined, 1, false), 5);
});
