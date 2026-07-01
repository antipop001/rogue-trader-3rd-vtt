// BUG-Q-251 — `_computeCharacteristics` runs twice per prepareData pass (pre-AE in
// acolyte.prepareData, then post-AE inside super.prepareData). The wounds-max and
// Unnatural-extra fold-ins must read their base from the IMMUTABLE source, not from the
// value they themselves derived on the first pass, or they double-count (wounds) / abort
// scaling (unnatural). These tests lock in the source-read contract.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { woundsMax, unnaturalExtra } from '../../src/module/rolls/roll-helpers.mjs';

test('BUG-Q-251: wounds.max fold is stable when driven from source base twice', () => {
    // Source has a non-zero modifier (e.g. an NPC profile). Folding from the source base on
    // BOTH passes yields the same value; folding from the live (already-folded) value doubles it.
    const srcBase = 10, mod = 2;

    // Correct pattern (fix): base always read from source.
    let m = woundsMax(srcBase, mod);
    m = woundsMax(srcBase, mod); // second pass reads source again
    assert.equal(m, 12);

    // Buggy pattern (old): base read from the live derived value → double-counts.
    let bad = woundsMax(srcBase, mod);
    bad = woundsMax(bad, mod); // second pass reads the mutated value
    assert.equal(bad, 14); // demonstrates the regression the fix prevents
});

test('BUG-Q-251: unnatural extra keeps scaling with an AE-raised bonus when fed the source baked value', () => {
    // NPC baked Unnatural (x2): source unnatural = 4 at baselineBonus 4 (Toughness 45, +5 source
    // modifier). An AE then adds +10 during super.prepareData, raising the live bonus.
    const traitMult = 1;         // no trait item — the value is baked
    const baselineBonus = 4;     // floor((45)/10)
    const srcBaked = 4;          // immutable baked extra

    // First pass (pre-AE): total 50 -> rawBonus 5.
    const firstPass = unnaturalExtra(traitMult, srcBaked, baselineBonus, 5);
    assert.equal(firstPass, 5);  // 5 x (2-1)

    // Second pass (post-AE +10): total 60 -> rawBonus 6. Fix reads srcBaked again.
    const secondPassFixed = unnaturalExtra(traitMult, srcBaked, baselineBonus, 6);
    assert.equal(secondPassFixed, 6); // rawBonus 6 -> bonus 12 (correct x2)

    // Buggy pattern: feed the first-pass output (5) as the baked value — multiplier-recovery
    // check fails (4*(2-1)=4 !== 5), scaling aborts, and it stays locked at 5 (bonus 11, wrong).
    const secondPassBuggy = unnaturalExtra(traitMult, firstPass, baselineBonus, 6);
    assert.equal(secondPassBuggy, 5);
});
