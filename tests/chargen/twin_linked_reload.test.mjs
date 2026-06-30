// BUG-Q-173 — Twin-Linked (RT Core p.117): "the weapon's reload time is doubled." Doubles a
// reload string in the same Full-Action unit space as rapidReloadTime, applied before the
// halving qualities in acolyte._computeWeaponReload so the two compose (Twin-Linked + Rapid
// Reload cancel). The +20-to-hit half of Twin-Linked lives in attack-specials.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doubleReloadTime, rapidReloadTime } from '../../src/module/rolls/roll-helpers.mjs';

test('doubleReloadTime doubles short-form pack reload values', () => {
    assert.equal(doubleReloadTime('Half'), 'Full Action');
    assert.equal(doubleReloadTime('Full'), '2 Full Actions');
    assert.equal(doubleReloadTime('2 Full'), '4 Full Actions');
    assert.equal(doubleReloadTime('3 Full'), '6 Full Actions');
});

test('doubleReloadTime accepts config full-form action_speeds too', () => {
    assert.equal(doubleReloadTime('Half Action'), 'Full Action');
    assert.equal(doubleReloadTime('Full Action'), '2 Full Actions');
    assert.equal(doubleReloadTime('2 Full Actions'), '4 Full Actions');
});

test('doubleReloadTime is tolerant of spacing/case', () => {
    assert.equal(doubleReloadTime('2Full'), '4 Full Actions');
    assert.equal(doubleReloadTime('full'), '2 Full Actions');
});

test('doubleReloadTime leaves non-numeric / no-reload values untouched', () => {
    assert.equal(doubleReloadTime('N/A'), 'N/A');
    assert.equal(doubleReloadTime('Special'), 'Special');
    assert.equal(doubleReloadTime(''), '');
    assert.equal(doubleReloadTime('Free'), 'Free'); // nothing to reload
});

test('doubleReloadTime is defensive on null/undefined input', () => {
    assert.equal(doubleReloadTime(null), null);
    assert.equal(doubleReloadTime(undefined), undefined);
});

test('Twin-Linked + Rapid Reload compose to cancel out (double then halve)', () => {
    // Full → (Twin-Linked) 2 Full → (Rapid Reload) Full
    assert.equal(rapidReloadTime(doubleReloadTime('Full'), true), 'Full Action');
    // 2 Full → 4 Full → 2 Full
    assert.equal(rapidReloadTime(doubleReloadTime('2 Full'), true), '2 Full Actions');
});
