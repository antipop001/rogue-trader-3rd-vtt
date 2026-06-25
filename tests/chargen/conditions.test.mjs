// QA-080 condition layer — to-hit modifier helper.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conditionToHitModifier, RT_CONDITIONS } from '../../src/module/rules/conditions.mjs';

test('QA-080: RT_CONDITIONS registers the expected condition ids', () => {
    const ids = RT_CONDITIONS.map((c) => c.id);
    for (const id of ['stunned', 'prone', 'pinned', 'blinded', 'onFire', 'bloodLoss', 'unconscious', 'helpless', 'unaware']) {
        assert.ok(ids.includes(id), `missing condition ${id}`);
    }
    assert.ok(RT_CONDITIONS.every((c) => c.id && c.name && c.img));
});

test('QA-080: conditionToHitModifier applies the RT to-hit steps', () => {
    assert.equal(conditionToHitModifier([]), 0);
    assert.equal(conditionToHitModifier(['stunned']), 20);
    assert.equal(conditionToHitModifier(['unaware']), 30);
    assert.equal(conditionToHitModifier(['helpless']), 30);
    assert.equal(conditionToHitModifier(['stunned', 'unaware']), 30);   // larger step, not stacked
    assert.equal(conditionToHitModifier(['prone'], true), 10);           // prone easier in melee
    assert.equal(conditionToHitModifier(['prone'], false), -10);         // harder at range
    assert.equal(conditionToHitModifier(['stunned', 'prone'], true), 30); // 20 + 10
    assert.equal(conditionToHitModifier(new Set(['stunned'])), 20);      // Set input
    assert.equal(conditionToHitModifier(null), 0);                       // safe
});
