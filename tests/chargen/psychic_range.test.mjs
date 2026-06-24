// BUG-006 — psychic power range prose normalises to metres.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePsychicRange } from '../../src/module/rolls/roll-helpers.mjs';

const ctx = { pr: 4, actor: { characteristics: { willpower: { bonus: 3 } } } };

test('normalizePsychicRange handles the psychic-powers pack prose', () => {
    assert.equal(normalizePsychicRange('5m x Psy Rating', ctx), 20);   // Compel @ PR4
    assert.equal(normalizePsychicRange('1m x Psy Rating', ctx), 4);
    assert.equal(normalizePsychicRange('1km x Psy Rating', ctx), 4000);
    assert.equal(normalizePsychicRange('5km x Psy Rating', ctx), 20000);
    assert.equal(normalizePsychicRange('10m', ctx), 10);
    assert.equal(normalizePsychicRange('100m', ctx), 100);
    assert.equal(normalizePsychicRange('1m x Psy Rating radius', ctx), 4);
    assert.equal(normalizePsychicRange('Personal (1m x Psy Rating)', ctx), 4);
    assert.equal(normalizePsychicRange('1 VU x Willpower Bonus', ctx), 3);
    assert.equal(normalizePsychicRange('Self', ctx), 0);
    assert.equal(normalizePsychicRange('Personal', ctx), 0);
    assert.equal(normalizePsychicRange('', ctx), 0);
    assert.equal(normalizePsychicRange(15, ctx), 15);
    assert.ok(normalizePsychicRange('Gaze', ctx) > 1_000_000);
    assert.ok(normalizePsychicRange('any person he can see', ctx) > 1_000_000);
    // No ctx → Psy Rating multiplier defaults to 1 (graceful, no throw).
    assert.equal(normalizePsychicRange('5m x Psy Rating'), 5);
});
