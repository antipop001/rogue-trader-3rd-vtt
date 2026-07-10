import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard for BUG-Q-247 / BUG-Q-249 — Tearing applied to split-roll damage effects.
//
// Tearing (RT Core p.144): "Tearing weapons roll one extra die for damage, and the lowest
// roll is discarded." That is ONE extra die per attack. The engine rolls the Accurate and
// Maximal bonus dice as SEPARATE Roll objects; applying the Tearing die-add/keep-highest block
// to each of those bonus rolls independently added an extra die + drop to EVERY sub-roll —
// a 1d10 Maximal Tearing weapon rolled base 2d10kh1 + maximal 2d10kh1 (4 dice, drop 2) instead
// of the correct 3 dice, drop 1. The fix keeps the Tearing die-modification ONLY on the base
// weapon damageRoll (and the "another full damage roll" cases: Righteous Fury extras + the
// Helpless coup-de-grace second roll), so the attack gains exactly one extra die + one drop.
//
// damage-data.mjs can't be imported under node (Foundry globals at load), so this is a
// source-level invariant on _calculateDamage's Accurate/Maximal bonus-roll blocks.

const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'module', 'rolls', 'damage-data.mjs'),
    'utf8',
);

// Slice out just the bonus-damage-roll block (the `bonusDamageRolls` region: Accurate + Maximal).
const start = src.indexOf('const bonusDamageRolls = [];');
const end = src.indexOf('// QA-157 — Helpless target');
const bonusBlock = src.slice(start, end);

test('Accurate/Maximal bonus-roll block was located in _calculateDamage', () => {
    assert.ok(start >= 0 && end > start, 'could not slice the bonusDamageRolls block');
    assert.match(bonusBlock, /accurateRoll/, 'expected the Accurate bonus roll in the block');
    assert.match(bonusBlock, /maximalRoll/, 'expected the Maximal bonus roll in the block');
});

test('Tearing is NOT re-applied to the Accurate/Maximal bonus rolls (one extra die per attack)', () => {
    assert.doesNotMatch(bonusBlock, /hasAttackSpecial\(['"]Tearing['"]\)/,
        'Tearing must not be re-applied inside the Accurate/Maximal bonus-roll block — it is a '
        + 'single extra die per attack, applied only to the base weapon damageRoll (BUG-Q-247/249)');
    assert.doesNotMatch(bonusBlock, /die\.number\s*\+=\s*1/,
        'no die-add/keep-highest Tearing modification should remain in the bonus-roll block');
});

test('Tearing is still applied to the base weapon damageRoll', () => {
    // The base-roll Tearing block sits just before the bonus block; confirm it survives.
    const baseRegion = src.slice(src.indexOf('this.damageRoll = new Roll('), start);
    assert.match(baseRegion, /hasAttackSpecial\(['"]Tearing['"]\)/,
        'Tearing must still be applied to the base weapon damageRoll');
    assert.match(baseRegion, /die\.number\s*\+=\s*1/,
        'the base damageRoll must still gain the Tearing extra die');
});
