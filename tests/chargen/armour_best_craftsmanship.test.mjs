import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveArmourAP } from '../../src/module/rules/armour-helpers.mjs';

// RT Core p.138: "Best Craftsmanship Armour provides an extra Armour Point."
// The comparison that picks the winning worn piece per location must use the
// post-craftsmanship (effective) AP so a Best piece isn't dropped when it ties
// a lesser-craft piece's base AP (BUG-Q-239).

test('Best craftsmanship adds +1 AP', () => {
    assert.equal(effectiveArmourAP(3, 'Best'), 4);
});

test('Common craftsmanship is unchanged', () => {
    assert.equal(effectiveArmourAP(3, 'Common'), 3);
});

test('Best AP3 beats Common AP3 on effective comparison', () => {
    assert.ok(effectiveArmourAP(3, 'Best') > effectiveArmourAP(3, 'Common'));
});

test('Best does not add AP where the piece gives no coverage', () => {
    assert.equal(effectiveArmourAP(0, 'Best'), 0);
});

test('missing/undefined base AP is treated as 0', () => {
    assert.equal(effectiveArmourAP(undefined, 'Best'), 0);
});

test('Good/Poor craftsmanship get no AP bonus', () => {
    assert.equal(effectiveArmourAP(4, 'Good'), 4);
    assert.equal(effectiveArmourAP(4, 'Poor'), 4);
});
