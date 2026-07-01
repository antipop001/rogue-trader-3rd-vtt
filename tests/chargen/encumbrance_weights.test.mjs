import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carryingWeight, liftingWeight, pushingWeight } from '../../src/module/rules/encumbrance-helpers.mjs';

// RT Core p.268 Table 9-33 (Carrying, Lifting & Pushing Weights), verbatim.
const TABLE_9_33 = [
    // [sum, carrying, lifting, pushing]
    [0, 0.9, 2.25, 4.5],
    [1, 2.25, 4.5, 9],
    [2, 4.5, 9, 18],
    [3, 9, 18, 36],
    [4, 18, 36, 72],
    [5, 27, 54, 108],
    [6, 36, 72, 144],
    [7, 45, 90, 180],
    [8, 56, 112, 225],
    [9, 67, 135, 270],
    [10, 78, 157, 315],
    [11, 90, 180, 360],
    [12, 112, 225, 450],
    [13, 225, 450, 900],
    [14, 337, 675, 1350],
    [15, 450, 900, 1800],
    [16, 675, 1350, 2700],
    [17, 900, 1800, 3600],
    [18, 1350, 2700, 5400],
    [19, 1800, 3600, 7200],
    [20, 2250, 4500, 9000],
];

test('carrying/lifting/pushing weights match RT Core Table 9-33 exactly', () => {
    for (const [sum, carry, lift, push] of TABLE_9_33) {
        assert.equal(carryingWeight(sum), carry, `carrying @ sum ${sum}`);
        assert.equal(liftingWeight(sum), lift, `lifting @ sum ${sum}`);
        assert.equal(pushingWeight(sum), push, `pushing @ sum ${sum}`);
    }
});

test('rows where lifting/pushing deviate from the old 2x/4x derivation are canon-correct', () => {
    // These are precisely the rows the old max*2 / max*4 shortcut got wrong.
    assert.equal(liftingWeight(10), 157); // not 156 (78*2)
    assert.equal(pushingWeight(10), 315); // not 312 (78*4)
    assert.equal(liftingWeight(14), 675); // not 674 (337*2)
    assert.equal(pushingWeight(14), 1350); // not 1348 (337*4)
    assert.equal(liftingWeight(0), 2.25); // not 1.8 (0.9*2)
    assert.equal(liftingWeight(8), 112); // not 112? 56*2=112 ok, push differs
    assert.equal(pushingWeight(8), 225); // not 224 (56*4)
    assert.equal(liftingWeight(9), 135); // not 134 (67*2)
    assert.equal(liftingWeight(12), 225); // not 224 (112*2)
});

test('SB+TB sum clamps to the [0, 20] table range', () => {
    assert.equal(carryingWeight(25), 2250);
    assert.equal(liftingWeight(30), 4500);
    assert.equal(pushingWeight(-5), 4.5);
});
