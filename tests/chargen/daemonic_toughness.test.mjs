// BUG-Q-196 — Daemonic stacks with Unnatural Toughness ADDITIVELY, not multiplicatively.
// RT 1e (Unnatural Characteristic, RT Core p.368) establishes that repeated Toughness
// multipliers increment the multiplier by 1 per source (1/2/3 selections → ×2/×3/×4); they
// do not compound. So Unnatural Toughness (×2) + Daemonic (×2) soaks at ×3, not ×4. The soak
// path passes the post-Felling bonus, so the two compose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daemonicToughnessBonus } from '../../src/module/rolls/roll-helpers.mjs';

test('Daemonic alone (no Unnatural Toughness) doubles the base bonus', () => {
    // base TB 4, no Unnatural ⇒ bonus 4, Daemonic ×2 ⇒ 8.
    assert.equal(daemonicToughnessBonus(4, 4, 2), 8);
});

test('Unnatural Toughness (x2) + Daemonic stack additively to x3, not x4', () => {
    // base TB 4, Unnatural Toughness (x2) ⇒ bonus 8. Old code: 8 × 2 = 16 (×4). Correct: 4 × 3 = 12.
    assert.equal(daemonicToughnessBonus(8, 4, 2), 12);
});

test('Unnatural Toughness (x3) + Daemonic stack to x4', () => {
    // base TB 4, Unnatural Toughness (x3) ⇒ bonus 12. Correct: 4 × (2 + 2) = 16.
    assert.equal(daemonicToughnessBonus(12, 4, 2), 16);
});

test('post-Felling bonus composes — Felling (1) strips UT(x2), Daemonic then doubles base', () => {
    // base TB 4, UT(x2) felled back to bonus 4 (×1), Daemonic ×2 ⇒ 8.
    assert.equal(daemonicToughnessBonus(4, 4, 2), 8);
});

test('no Daemonic (multiplier 1) leaves the bonus untouched', () => {
    assert.equal(daemonicToughnessBonus(8, 4, 1), 8);
    assert.equal(daemonicToughnessBonus(12, 4, 1), 12);
});

test('base of 0 falls back to plain doubling (no division by zero)', () => {
    assert.equal(daemonicToughnessBonus(0, 0, 2), 0);
    assert.equal(daemonicToughnessBonus(5, 0, 2), 10);
});

test('non-numeric inputs are coerced, never NaN', () => {
    assert.equal(daemonicToughnessBonus('8', '4', '2'), 12);
    assert.equal(daemonicToughnessBonus(undefined, undefined, 2), 0);
    assert.equal(daemonicToughnessBonus(8, 4, undefined), 8); // undefined multiplier → 1
});
