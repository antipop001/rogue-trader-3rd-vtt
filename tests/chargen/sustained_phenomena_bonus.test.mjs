// BUG-Q-231 — Psychic Phenomena while sustaining powers adds +10 PER additional
// power maintained (RT Core p.159), and only "while maintaining multiple active
// powers" — so a single maintained power is 0, and the bonus scales by
// (count - 1), not a flat +10 nor count*10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sustainedPhenomenaBonus } from '../../src/module/rules/psychic.mjs';

test('BUG-Q-231: no sustained powers → no bonus', () => {
    assert.equal(sustainedPhenomenaBonus(0), 0);
});

test('BUG-Q-231: a single maintained power is not "multiple" → no bonus', () => {
    // RT Core p.159: the bonus applies "while maintaining multiple active
    // powers"; one power is not multiple (parallels the 0 Psy Rating penalty).
    assert.equal(sustainedPhenomenaBonus(1), 0);
});

test('BUG-Q-231: bonus scales +10 per ADDITIONAL power maintained', () => {
    // RT Core p.159: "+10 to the result rolled on the chart per additional
    // power he is maintaining." 2 maintained = 1 additional = +10.
    assert.equal(sustainedPhenomenaBonus(2), 10);
    assert.equal(sustainedPhenomenaBonus(3), 20);
    assert.equal(sustainedPhenomenaBonus(5), 40);
});

test('BUG-Q-231: guards non-finite / missing input', () => {
    assert.equal(sustainedPhenomenaBonus(undefined), 0);
    assert.equal(sustainedPhenomenaBonus(NaN), 0);
    assert.equal(sustainedPhenomenaBonus(null), 0);
});
