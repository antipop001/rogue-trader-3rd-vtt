// Psychic Strength is decided by the PR actually used in the cast dialog (RT Core p.157 Table
// 6-1), not the sticky sheet select — a psyker left on "Push" who cast at normal PR was getting
// Psychic Phenomena on every roll instead of only on doubles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { psychicStrengthFromPr } from '../../src/module/rolls/roll-helpers.mjs';

test('PR above / equal / below the rating = Push / Unfettered / Fettered', () => {
    assert.equal(psychicStrengthFromPr(7, 4), 'push');
    assert.equal(psychicStrengthFromPr(4, 4), 'unfettered');
    assert.equal(psychicStrengthFromPr(2, 4), 'fettered');
});

test('the sheet select does not override the PR actually used', () => {
    assert.equal(psychicStrengthFromPr(4, 4, 'push'), 'unfettered', 'sheet on Push, cast at normal PR');
    assert.equal(psychicStrengthFromPr(4, 4, 'fettered'), 'unfettered', 'sheet on Fettered, cast at full PR');
    assert.equal(psychicStrengthFromPr(6, 4, 'fettered'), 'push');
});

test('rating-1 Fettered (PR 1 = rating) is resolved by the sheet choice', () => {
    assert.equal(psychicStrengthFromPr(1, 1, 'fettered'), 'fettered');
    assert.equal(psychicStrengthFromPr(1, 1, 'unfettered'), 'unfettered');
    assert.equal(psychicStrengthFromPr(2, 2, 'fettered'), 'unfettered', 'rating 2 Fettered is PR 1, so PR 2 is Unfettered');
});

test('PsychicRollData derives strength from the PR at update and finalize', () => {
    const src = readFileSync(new URL('../../src/module/rolls/roll-data.mjs', import.meta.url), 'utf8');
    assert.match(src, /this\.strength = psychicStrengthFromPr\(this\.pr, rating, this\.sourceActor\.psy\.strength\)/);
    assert.equal((src.match(/this\.updateStrength\(\);/g) ?? []).length, 2, 'called from update() and finalize()');
});
