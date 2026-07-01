// BUG-Q-221 — Maintaining a single psychic power must NOT reduce effective Psy Rating.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sustainedPsyPenalty } from '../../src/module/rules/psychic.mjs';

test('BUG-Q-221: zero or one sustained power has no penalty', () => {
    assert.equal(sustainedPsyPenalty(0), 0);
    assert.equal(sustainedPsyPenalty(1), 0);
});

test('BUG-Q-221: two or more sustained powers reduce PR by the total count', () => {
    // RT Core p.159: two powers → −2, three → −3, and so on.
    assert.equal(sustainedPsyPenalty(2), 2);
    assert.equal(sustainedPsyPenalty(3), 3);
    assert.equal(sustainedPsyPenalty(5), 5);
});

test('BUG-Q-221: guards non-finite / missing input', () => {
    assert.equal(sustainedPsyPenalty(undefined), 0);
    assert.equal(sustainedPsyPenalty(NaN), 0);
    assert.equal(sustainedPsyPenalty(null), 0);
});
