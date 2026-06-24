// BUG-003 — Weapon Master applies +10 hit / +2 dmg / +2 init when the wielded
// weapon's class matches the talent's chosen class.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weaponMasterBonus } from '../../src/module/rolls/roll-helpers.mjs';

const wm = (choice) => ({ name: `Weapon Master (${choice})`, type: 'talent', system: { choice } });

test('weaponMasterBonus matches the chosen weapon class (case-insensitive)', () => {
    assert.deepEqual(weaponMasterBonus([wm('Basic')], 'Basic'), { toHit: 10, damage: 2, initiative: 2 });
    assert.deepEqual(weaponMasterBonus([wm('Basic')], 'basic'), { toHit: 10, damage: 2, initiative: 2 });
    assert.deepEqual(weaponMasterBonus([wm('Melee')], 'Melee'), { toHit: 10, damage: 2, initiative: 2 });
});

test('weaponMasterBonus gives nothing when the class differs or talent is absent', () => {
    const none = { toHit: 0, damage: 0, initiative: 0 };
    assert.deepEqual(weaponMasterBonus([wm('Basic')], 'Pistol'), none);
    assert.deepEqual(weaponMasterBonus([], 'Basic'), none);
    assert.deepEqual(weaponMasterBonus([{ name: 'Crushing Blow', system: {} }], 'Melee'), none);
    // Un-chosen Weapon Master (no system.choice) applies nothing.
    assert.deepEqual(weaponMasterBonus([{ name: 'Weapon Master', system: {} }], 'Basic'), none);
});

test('weaponMasterBonus is robust to bad input', () => {
    const none = { toHit: 0, damage: 0, initiative: 0 };
    assert.deepEqual(weaponMasterBonus(null, 'Basic'), none);
    assert.deepEqual(weaponMasterBonus([wm('Basic')], ''), none);
    assert.deepEqual(weaponMasterBonus([wm('Basic')], undefined), none);
});

test('weaponMasterBonus stacks multiple matching talents (RAW edge — normally one)', () => {
    assert.deepEqual(weaponMasterBonus([wm('Basic'), wm('Basic')], 'Basic'),
        { toHit: 20, damage: 4, initiative: 4 });
});
