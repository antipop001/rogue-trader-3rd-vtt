// QA-081 Fear / Shock subsystem — pure helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fearTestModifier, fearAutoImmune, shockRollModifier } from '../../src/module/rules/fear.mjs';

test('QA-081: fearTestModifier matches RT Table 10-3', () => {
    assert.equal(fearTestModifier(1), 0);     // Disturbing
    assert.equal(fearTestModifier(2), -10);   // Frightening
    assert.equal(fearTestModifier(3), -20);   // Horrifying
    assert.equal(fearTestModifier(4), -30);   // Terrifying
    assert.equal(fearTestModifier(0), 0);     // clamps up to 1
    assert.equal(fearTestModifier(9), -30);   // clamps down to 4
});

test('QA-081: fearAutoImmune — tens-digit of Insanity >= 2x Fear Rating', () => {
    // Fear (2) needs first digit >= 4 → Insanity >= 40
    assert.equal(fearAutoImmune(40, 2), true);
    assert.equal(fearAutoImmune(39, 2), false);
    assert.equal(fearAutoImmune(0, 2), false);
    // Fear (1) needs first digit >= 2 → Insanity >= 20
    assert.equal(fearAutoImmune(20, 1), true);
    assert.equal(fearAutoImmune(19, 1), false);
    // Fear (4) needs first digit >= 8 → Insanity >= 80
    assert.equal(fearAutoImmune(80, 4), true);
    assert.equal(fearAutoImmune(79, 4), false);
    // rating 0 = nothing frightening → always immune
    assert.equal(fearAutoImmune(0, 0), true);
});

test('QA-081: shockRollModifier is +10 per DoF (every degree, not after-the-first)', () => {
    assert.equal(shockRollModifier(1), 10);
    assert.equal(shockRollModifier(3), 30);
    assert.equal(shockRollModifier(0), 0);
    assert.equal(shockRollModifier(-2), 0);   // guarded
});
