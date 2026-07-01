import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unnaturalOpposedDoSBonus } from '../../src/module/rolls/roll-helpers.mjs';

// RT Core p.368: "During Opposed Characteristic Tests, on a success, the bonus multiplier is
// added to the degree of success." An Unnatural (xN) governing characteristic adds N to that
// side's DoS on a success (e.g. Feint, Knock-Down, Grapple).

test('Unnatural (x2) adds +2 to DoS on a success', () => {
    // Str 41 → rawBonus 4, Unnatural (x2) → unnatural 4, bonus 8, mult 2 → +2.
    assert.equal(unnaturalOpposedDoSBonus(8, 4, true), 2);
});

test('Unnatural (x3) adds +3 to DoS on a success', () => {
    // rawBonus 4, unnatural 8, bonus 12, mult 3 → +3.
    assert.equal(unnaturalOpposedDoSBonus(12, 8, true), 3);
});

test('no bonus on a failure regardless of Unnatural', () => {
    assert.equal(unnaturalOpposedDoSBonus(8, 4, false), 0);
});

test('no Unnatural (mult 1) adds nothing', () => {
    assert.equal(unnaturalOpposedDoSBonus(4, 0, true), 0);
});

test('tolerates a small flat cyber bonus baked into the bonus', () => {
    // Str 41, Unnatural (x2), +1 Synthetic Muscle Grafts → bonus 9, unnatural 4;
    // 9/(9-4)=1.8 rounds to mult 2 → +2.
    assert.equal(unnaturalOpposedDoSBonus(9, 4, true), 2);
});

test('degenerate/zero inputs are safe', () => {
    assert.equal(unnaturalOpposedDoSBonus(0, 0, true), 0);
    assert.equal(unnaturalOpposedDoSBonus(4, 4, true), 0); // rawBonus 0 → guard
});
