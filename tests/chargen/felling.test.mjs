// BUG-Q-195 — Felling (X) ignores X levels of the target's Unnatural Toughness when
// soaking damage (RT p.131 / Soul Reaver p.150). The reduction lowers the soak Toughness
// Bonus toward its base, discarding the per-step Unnatural extra; Felling never touches the
// base TB, force fields, or armour. Engine-applied on the assign-damage soak path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fellingToughnessBonus } from '../../src/module/rolls/roll-helpers.mjs';

test('Felling (1) ignores the benefit of Unnatural Toughness (x2)', () => {
    // base TB 4, Unnatural Toughness (x2) ⇒ unnatural extra 4, full bonus 8.
    assert.equal(fellingToughnessBonus(8, 4, 1), 4); // back to the base ×1
});

test('Felling (1) reduces Unnatural Toughness (x3) by one multiplier', () => {
    // base TB 4, Unnatural Toughness (x3) ⇒ unnatural extra 8, full bonus 12.
    assert.equal(fellingToughnessBonus(12, 8, 1), 8); // (x3) → (x2)
});

test('Felling (2) reduces Unnatural Toughness (x3) all the way to base', () => {
    assert.equal(fellingToughnessBonus(12, 8, 2), 4);
});

test('Felling cannot reduce below the base Toughness Bonus', () => {
    // Felling (5) vs Unnatural Toughness (x2): only one step to remove.
    assert.equal(fellingToughnessBonus(8, 4, 5), 4);
});

test('Felling does nothing without Unnatural Toughness', () => {
    assert.equal(fellingToughnessBonus(4, 0, 2), 4);
});

test('Felling (0) / no Felling leaves the bonus untouched', () => {
    assert.equal(fellingToughnessBonus(8, 4, 0), 8);
});

test('non-numeric inputs are coerced, never NaN', () => {
    assert.equal(fellingToughnessBonus('8', '4', '1'), 4);
    assert.equal(fellingToughnessBonus(undefined, undefined, 1), 0);
});
