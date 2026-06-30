// BUG-Q-171 regression guard: calculateAmmoInformation must set rollData.fireRate
// from the weapon's printed rate of fire for burst actions EVEN when the weapon
// doesn't track ammo (e.g. creature ranged attacks). Without this the default
// fireRate of 1 left Semi-Auto Burst capped at 0 additional hits and Full Auto
// Burst uncapped. (RT Core p.242 — additional hits cap "up to the maximum firing
// rate of the weapon", a physical property regardless of ammo tracking.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAmmoInformation } from '../../src/module/rules/ammo.mjs';

// ammoText() (called on the ammo-tracking path) logs via game.rt.log.
globalThis.game ??= { rt: { log: () => {} } };

function stubRollData(action, { usesAmmo = false, full = 10, burst = 3, clip = 0 } = {}) {
    return {
        action,
        ammoPerShot: 1,
        fireRate: 1,
        hasAttackSpecial: () => false,
        weapon: {
            usesAmmo,
            items: [],
            system: { clip: { value: clip, max: clip }, rateOfFire: { full, burst } },
        },
    };
}

test('ammo-less Full Auto / Suppressing Fire takes fireRate from rateOfFire.full', () => {
    const fa = stubRollData('Full Auto Burst', { usesAmmo: false, full: 10 });
    calculateAmmoInformation(fa);
    assert.equal(fa.fireRate, 10);

    const sf = stubRollData('Suppressing Fire', { usesAmmo: false, full: 6 });
    calculateAmmoInformation(sf);
    assert.equal(sf.fireRate, 6);
});

test('ammo-less Semi-Auto Burst takes fireRate from rateOfFire.burst (not the default 1)', () => {
    const semi = stubRollData('Semi-Auto Burst', { usesAmmo: false, burst: 3 });
    calculateAmmoInformation(semi);
    assert.equal(semi.fireRate, 3);
    // The cap (fireRate - 1) must allow additional hits, not clamp to 0.
    assert.ok(semi.fireRate - 1 > 0);
});

test('ammo-less single-shot action keeps fireRate 1', () => {
    const std = stubRollData('Standard Attack', { usesAmmo: false });
    calculateAmmoInformation(std);
    assert.equal(std.fireRate, 1);
});

test('ammo-tracking weapon still lowers fireRate to available ammo', () => {
    // 2 rounds in clip, Full Auto RoF 10 → capped at 2.
    const fa = stubRollData('Full Auto Burst', { usesAmmo: true, full: 10, clip: 2 });
    calculateAmmoInformation(fa);
    assert.equal(fa.fireRate, 2);
    assert.equal(fa.ammoUsed, 2);
});
