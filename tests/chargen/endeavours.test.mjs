// QA-084 / QA-085 — Endeavour canon model (RT Core Ch.XII + Table 9-41).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    endeavourSizeReward,
    endeavourTotals,
    endeavourCompletionPF,
    misfortuneResult,
} from '../../src/module/rules/endeavours-helpers.mjs';

test('QA-084: PF reward by Endeavour size (Lesser +1, Greater +3, Grand +5)', () => {
    assert.equal(endeavourSizeReward('Lesser'), 1);
    assert.equal(endeavourSizeReward('Greater'), 3);
    assert.equal(endeavourSizeReward('Grand'), 5);
    assert.equal(endeavourSizeReward('nonsense'), 1);
});

test('QA-084: objectives sum to the Endeavour totals', () => {
    const objs = [
        { theme: 'Exploration', achievementPoints: 120, target: 150 },
        { theme: 'Trade', achievementPoints: 80, target: 100 },
        { theme: 'Military', achievementPoints: 40, target: 50 },
    ];
    assert.deepEqual(endeavourTotals(objs), { ap: 240, target: 300 });
    assert.deepEqual(endeavourTotals([]), { ap: 0, target: 0 });
});

test('QA-084: completion PF = size reward + 1 per full 100 AP over target', () => {
    assert.equal(endeavourCompletionPF(3, 300, 300), 3);      // exactly on target
    assert.equal(endeavourCompletionPF(3, 250, 300), 3);      // under target → no excess
    assert.equal(endeavourCompletionPF(3, 540, 300), 5);      // 240 excess → +2
    assert.equal(endeavourCompletionPF(5, 705, 300), 9);      // 405 excess → +4
    assert.equal(endeavourCompletionPF(1, 399, 300), 1);      // 99 excess → +0 (not a full 100)
});

test('QA-085: Misfortune by d100 (Table 9-41)', () => {
    assert.deepEqual(misfortuneResult(1), { tier: 'None', loss: 0 });
    assert.deepEqual(misfortuneResult(49), { tier: 'None', loss: 0 });
    assert.deepEqual(misfortuneResult(50), { tier: 'Nuisance', loss: 1 });
    assert.deepEqual(misfortuneResult(65), { tier: 'Nuisance', loss: 1 });
    assert.deepEqual(misfortuneResult(66), { tier: 'Grim', loss: 2 });
    assert.deepEqual(misfortuneResult(90), { tier: 'Grim', loss: 2 });
    assert.deepEqual(misfortuneResult(91, 4), { tier: 'Calamitous', loss: 4 }); // 1d5 = 4
    assert.deepEqual(misfortuneResult(100, 1), { tier: 'Calamitous', loss: 1 });
});
