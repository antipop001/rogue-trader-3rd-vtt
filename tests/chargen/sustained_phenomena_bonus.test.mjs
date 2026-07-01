// BUG-Q-231 — Psychic Phenomena while sustaining powers adds +10 PER additional
// power maintained (RT Core p.159), not a flat +10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sustainedPhenomenaBonus } from '../../src/module/rules/psychic.mjs';

test('BUG-Q-231: no sustained powers → no bonus', () => {
    assert.equal(sustainedPhenomenaBonus(0), 0);
});

test('BUG-Q-231: bonus scales +10 per power maintained', () => {
    // RT Core p.159: "+10 to the result rolled on the chart per additional
    // power he is maintaining."
    assert.equal(sustainedPhenomenaBonus(1), 10);
    assert.equal(sustainedPhenomenaBonus(2), 20);
    assert.equal(sustainedPhenomenaBonus(3), 30);
    assert.equal(sustainedPhenomenaBonus(5), 50);
});

test('BUG-Q-231: guards non-finite / missing input', () => {
    assert.equal(sustainedPhenomenaBonus(undefined), 0);
    assert.equal(sustainedPhenomenaBonus(NaN), 0);
    assert.equal(sustainedPhenomenaBonus(null), 0);
});
