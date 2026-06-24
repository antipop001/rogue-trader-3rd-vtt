// ENGINE-UNNATURAL-CHARS — unnaturalCharacteristicMultipliers (RT Core p.368).
// Pure-JS coverage of the trait-name → characteristic-multiplier parse that
// acolyte._computeCharacteristics uses (SET-when-unset) to derive `.unnatural`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unnaturalCharacteristicMultipliers } from '../../src/module/rolls/roll-helpers.mjs';

test('non-array / empty input → empty map', () => {
    assert.deepEqual(unnaturalCharacteristicMultipliers(undefined), {});
    assert.deepEqual(unnaturalCharacteristicMultipliers(null), {});
    assert.deepEqual(unnaturalCharacteristicMultipliers([]), {});
    assert.deepEqual(unnaturalCharacteristicMultipliers([{ name: '' }, {}]), {});
});

test('explicit (xN) multiplier parsed, keyed by lowercased label', () => {
    assert.deepEqual(
        unnaturalCharacteristicMultipliers([{ name: 'Unnatural Toughness (x2)' }]),
        { toughness: 2 },
    );
    assert.deepEqual(
        unnaturalCharacteristicMultipliers([{ name: 'Unnatural Strength (x3)' }]),
        { strength: 3 },
    );
});

test('two-word characteristic labels keep their space', () => {
    assert.deepEqual(
        unnaturalCharacteristicMultipliers([{ name: 'Unnatural Weapon Skill (x2)' }]),
        { 'weapon skill': 2 },
    );
});

test('no parens defaults to ×2', () => {
    assert.deepEqual(
        unnaturalCharacteristicMultipliers([{ name: 'Unnatural Perception' }]),
        { perception: 2 },
    );
});

test('× (unicode) and case-insensitivity', () => {
    assert.deepEqual(
        unnaturalCharacteristicMultipliers([{ name: 'unnatural agility (X4)' }]),
        { agility: 4 },
    );
    assert.deepEqual(
        unnaturalCharacteristicMultipliers([{ name: 'Unnatural Fellowship (×2)' }]),
        { fellowship: 2 },
    );
});

test('generic / non-characteristic Unnatural traits are skipped', () => {
    assert.deepEqual(unnaturalCharacteristicMultipliers([{ name: 'Unnatural Characteristic' }]), {});
    assert.deepEqual(unnaturalCharacteristicMultipliers([{ name: 'Unnatural Speed' }]), {});
    assert.deepEqual(unnaturalCharacteristicMultipliers([{ name: 'Unnatural Senses' }]), {});
});

test('non-Unnatural traits ignored; multiple traits combine (max wins)', () => {
    const traits = [
        { name: 'Quadruped' },
        { name: 'Unnatural Toughness (x2)' },
        { name: 'Unnatural Toughness (x3)' },
        { name: 'Unnatural Strength' },
    ];
    assert.deepEqual(unnaturalCharacteristicMultipliers(traits), {
        toughness: 3,
        strength: 2,
    });
});

test('multiplier below 2 clamps to 2 (never reduces a bonus)', () => {
    assert.deepEqual(
        unnaturalCharacteristicMultipliers([{ name: 'Unnatural Toughness (x1)' }]),
        { toughness: 2 },
    );
});
