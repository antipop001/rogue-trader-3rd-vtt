// BUG-Q-253 — movement-replacing traits (RT Core p.364-366). Flyer (N)/Hoverer (N)
// REPLACE the Agility-Bonus term of movement with their listed speed ("This number
// replaces your agility bonus for Movement Actions"); Crawler moves at HALF the Agility
// Bonus. Engine-applied by trait name in base-actor._computeMovement (NOT an AE — it
// replaces the derived Agility Bonus an AE can't read).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movementTraitOverride } from '../../src/module/rolls/roll-helpers.mjs';

const trait = (name) => ({ name, type: 'trait' });

test('Flyer (N) replaces the Agility Bonus with N', () => {
    assert.deepEqual(movementTraitOverride([trait('Flyer (12)')]), { mode: 'flyer', value: 12 });
    assert.deepEqual(movementTraitOverride([trait('Flyer (6)')]), { mode: 'flyer', value: 6 });
});

test('bare-number Flyer/Hoverer forms parse (e.g. "Flyer 8", "Hoverer 6")', () => {
    assert.deepEqual(movementTraitOverride([trait('Flyer 8')]), { mode: 'flyer', value: 8 });
    assert.deepEqual(movementTraitOverride([trait('Hoverer (4)')]), { mode: 'hoverer', value: 4 });
});

test('conditional-note Flyer keeps the leading speed number', () => {
    assert.deepEqual(
        movementTraitOverride([trait('Flyer (2) (Null gravity conditions only)')]),
        { mode: 'flyer', value: 2 },
    );
    assert.deepEqual(
        movementTraitOverride([trait('Flyer 3 (null-gravity only)')]),
        { mode: 'flyer', value: 3 },
    );
});

test('"AB x2" multiplier form is a multiplier, not a replacement', () => {
    assert.deepEqual(movementTraitOverride([trait('Flyer (AB x2)')]), { mode: 'flyer', multiplier: 2 });
});

test('bare Flyer/Hoverer with no number carries no fixed speed', () => {
    assert.deepEqual(movementTraitOverride([trait('Hoverer')]), { mode: 'hoverer' });
    assert.deepEqual(movementTraitOverride([trait('Flyer')]), { mode: 'flyer' });
});

test('Crawler reports the crawler mode', () => {
    assert.deepEqual(movementTraitOverride([trait('Crawler')]), { mode: 'crawler' });
});

test('Flyer/Hoverer take precedence over Crawler when both present', () => {
    assert.deepEqual(
        movementTraitOverride([trait('Crawler'), trait('Flyer (12)')]),
        { mode: 'flyer', value: 12 },
    );
});

test('no movement-replacing trait returns mode null', () => {
    assert.deepEqual(movementTraitOverride([trait('Bestial'), trait('Natural Weapons')]), { mode: null });
    assert.deepEqual(movementTraitOverride([]), { mode: null });
});

test('is defensive on bad input', () => {
    assert.deepEqual(movementTraitOverride(null), { mode: null });
    assert.deepEqual(movementTraitOverride(undefined), { mode: null });
});
