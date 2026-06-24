// ENGINE-RAPID-RELOAD — the Rapid Reload talent (RT Core p.110) halves all reload times,
// rounding down (Half→Free, Full→Half, and so on). `system.reload` is a free-text field
// no engine consumed before; rapidReloadTime() is the extractable apply point, surfaced as
// the derived `system.effectiveReload` on owned ranged weapons (acolyte._computeWeaponReload).
// Applied by talent name → NOT an AE (double-apply guard: ratchet CODE_HANDLED).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rapidReloadTime } from '../../src/module/rolls/roll-helpers.mjs';

test('rapidReloadTime halves short-form pack reload values, rounding down', () => {
    assert.equal(rapidReloadTime('Half'), 'Free Action');
    assert.equal(rapidReloadTime('Full'), 'Half Action');
    assert.equal(rapidReloadTime('2 Full'), 'Full Action');
    assert.equal(rapidReloadTime('3 Full'), 'Full Action');   // 1.5 ↓ 1
    assert.equal(rapidReloadTime('4 Full'), '2 Full Actions');
    assert.equal(rapidReloadTime('5 Full'), '2 Full Actions'); // 2.5 ↓ 2
});

test('rapidReloadTime accepts config full-form action_speeds too', () => {
    assert.equal(rapidReloadTime('Half Action'), 'Free Action');
    assert.equal(rapidReloadTime('Full Action'), 'Half Action');
    assert.equal(rapidReloadTime('2 Full Actions'), 'Full Action');
    assert.equal(rapidReloadTime('Free Action'), 'Free Action');
});

test('rapidReloadTime is tolerant of spacing/case (e.g. "2Full")', () => {
    assert.equal(rapidReloadTime('2Full'), 'Full Action');
    assert.equal(rapidReloadTime('full'), 'Half Action');
});

test('rapidReloadTime leaves non-numeric / no-reload values untouched', () => {
    assert.equal(rapidReloadTime('N/A'), 'N/A');
    assert.equal(rapidReloadTime('Special'), 'Special');
    assert.equal(rapidReloadTime(''), '');
    assert.equal(rapidReloadTime('Free'), 'Free Action'); // Free already ½ → stays Free
});

test('rapidReloadTime passes the value through unchanged without the talent', () => {
    assert.equal(rapidReloadTime('Full', false), 'Full');
    assert.equal(rapidReloadTime('2 Full', false), '2 Full');
    assert.equal(rapidReloadTime('Half', false), 'Half');
});

test('rapidReloadTime is defensive on null/undefined input', () => {
    assert.equal(rapidReloadTime(null), null);
    assert.equal(rapidReloadTime(undefined), undefined);
});
