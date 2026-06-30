// BUG-Q-214 — Psychic Phenomena 'doubles' detection must include 00 (a d100 roll of 100).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPsychicDoubles } from '../../src/module/rolls/roll-helpers.mjs';

test('BUG-Q-214: the canon doubles 11,22,…,99,00 all trigger', () => {
    // RT Core p.157: "doubles (i.e. 11, 22, 33, 44, 55, 66, 77, 88, 99, 00)"
    for (const t of [11, 22, 33, 44, 55, 66, 77, 88, 99]) {
        assert.equal(isPsychicDoubles(t), true, `${t} should be doubles`);
    }
    // 100 is the d100 representation of 00 — the regression this fix closes.
    assert.equal(isPsychicDoubles(100), true);
});

test('BUG-Q-214: non-doubles do not trigger', () => {
    for (const t of [1, 10, 12, 21, 50, 65, 98, 1]) {
        assert.equal(isPsychicDoubles(t), false, `${t} should not be doubles`);
    }
});

test('BUG-Q-214: guards against non-finite input', () => {
    assert.equal(isPsychicDoubles(undefined), false);
    assert.equal(isPsychicDoubles(NaN), false);
    assert.equal(isPsychicDoubles(null), false);
});
