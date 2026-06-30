// BUG-Q-218 — Opposed-test tiebreak (RT Core p.232): whoever succeeds wins; among two
// successes more Degrees of Success wins; on an equal-DoS tie the higher Characteristic
// Bonus wins; if STILL tied the lower dice roll wins. Two failures are a stalemate (0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOpposedDegreesWithTiebreak } from '../../src/module/rolls/roll-helpers.mjs';

const A = (o) => ({ success: true, dos: 0, dof: 0, bonus: 0, roll: 50, ...o });

test('a success beats a failure regardless of bonus/roll', () => {
    assert.ok(getOpposedDegreesWithTiebreak(A({ success: true }), A({ success: false, dof: 0 })) > 0);
    assert.ok(getOpposedDegreesWithTiebreak(A({ success: false, dof: 0 }), A({ success: true })) < 0);
});

test('among two successes, more Degrees of Success wins', () => {
    assert.equal(getOpposedDegreesWithTiebreak(A({ dos: 3 }), A({ dos: 1 })), 2);
    assert.equal(getOpposedDegreesWithTiebreak(A({ dos: 1 }), A({ dos: 4 })), -3);
});

test('equal DoS → higher Characteristic Bonus wins (a bare ±1)', () => {
    assert.equal(getOpposedDegreesWithTiebreak(A({ dos: 2, bonus: 5 }), A({ dos: 2, bonus: 4 })), 1);
    assert.equal(getOpposedDegreesWithTiebreak(A({ dos: 2, bonus: 3 }), A({ dos: 2, bonus: 4 })), -1);
});

test('equal DoS and equal Bonus → the LOWER dice roll wins', () => {
    assert.equal(getOpposedDegreesWithTiebreak(A({ dos: 1, bonus: 4, roll: 21 }), A({ dos: 1, bonus: 4, roll: 38 })), 1);
    assert.equal(getOpposedDegreesWithTiebreak(A({ dos: 1, bonus: 4, roll: 55 }), A({ dos: 1, bonus: 4, roll: 12 })), -1);
});

test('a perfect tie (equal DoS, Bonus, roll) defaults to the active character (attacker)', () => {
    assert.equal(getOpposedDegreesWithTiebreak(A({ dos: 1, bonus: 4, roll: 30 }), A({ dos: 1, bonus: 4, roll: 30 })), 1);
});

test('two failures are a stalemate — neither side wins', () => {
    assert.equal(getOpposedDegreesWithTiebreak(A({ success: false, dof: 1 }), A({ success: false, dof: 1 })), 0);
});

test('among two failures, the smaller failure still wins via getOpposedDegrees magnitude', () => {
    // attacker fails by 0, defender fails by 2 → attacker is "less wrong" → positive net.
    assert.ok(getOpposedDegreesWithTiebreak(A({ success: false, dof: 0 }), A({ success: false, dof: 2 })) > 0);
});
