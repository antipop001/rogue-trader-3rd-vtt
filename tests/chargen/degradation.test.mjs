// QA-083 Insanity / Corruption degradation — pure track/threshold helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insanityTrack, corruptionTrack, thresholdsCrossed, disordersGained } from '../../src/module/rules/degradation.mjs';

test('QA-083: insanityTrack matches RT Table 10-5', () => {
    assert.deepEqual(insanityTrack(0), { degree: 'Stable', traumaModifier: 0, retired: false });
    assert.equal(insanityTrack(15).degree, 'Unsettled');
    assert.equal(insanityTrack(15).traumaModifier, 10);
    assert.equal(insanityTrack(45).degree, 'Disturbed');
    assert.equal(insanityTrack(45).traumaModifier, 0);
    assert.equal(insanityTrack(65).degree, 'Unhinged');
    assert.equal(insanityTrack(65).traumaModifier, -10);
    assert.equal(insanityTrack(85).degree, 'Deranged');
    assert.equal(insanityTrack(85).traumaModifier, -20);
    assert.equal(insanityTrack(100).retired, true);
});

test('QA-083: corruptionTrack matches RT Table 10-7', () => {
    assert.deepEqual(corruptionTrack(10), { degree: 'Tainted', malignancyModifier: 0, mutationTier: 0, damned: false });
    assert.equal(corruptionTrack(35).degree, 'Soiled');
    assert.equal(corruptionTrack(35).malignancyModifier, -10);
    assert.equal(corruptionTrack(35).mutationTier, 1);
    assert.equal(corruptionTrack(70).degree, 'Debased');
    assert.equal(corruptionTrack(70).malignancyModifier, -20);
    assert.equal(corruptionTrack(95).degree, 'Profane');
    assert.equal(corruptionTrack(95).malignancyModifier, -30);
    assert.equal(corruptionTrack(100).damned, true);
});

test('QA-083: thresholdsCrossed lists boundary multiples crossed on a rise', () => {
    assert.deepEqual(thresholdsCrossed(8, 23, 10), [10, 20]);
    assert.deepEqual(thresholdsCrossed(0, 10, 10), [10]);
    assert.deepEqual(thresholdsCrossed(40, 40, 10), []);      // no rise
    assert.deepEqual(thresholdsCrossed(45, 30, 10), []);      // decrease
    assert.deepEqual(thresholdsCrossed(0, 90, 30), [30, 60, 90]);   // mutation every 30
    assert.deepEqual(thresholdsCrossed(31, 59, 30), []);      // no 30-boundary crossed
});

test('QA-083: disordersGained fires at Insanity 40 / 60 / 80', () => {
    assert.deepEqual(disordersGained(39, 40), ['Minor']);
    assert.deepEqual(disordersGained(0, 65), ['Minor', 'Severe']);
    assert.deepEqual(disordersGained(0, 100), ['Minor', 'Severe', 'Acute']);
    assert.deepEqual(disordersGained(40, 55), []);            // none newly crossed
});
