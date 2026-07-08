import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard: a damage formula stored as a bare NUMBER must not crash the roll.
// Foundry v13's `new Roll()` rejects a non-string formula; the psychic power "Held in My Gaze"
// carries damage 1 (a number), and a successful cast threw `The dice roll formula "1" is not a
// string` before Hit._calculateDamage stringified it. Found by the runtime exerciser
// (tools/runtime_exerciser/). damage-data.mjs isn't node-importable (Foundry globals at load),
// so this is a source-level invariant: rollFormula is coerced to a string before `new Roll`.
const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'module', 'rolls', 'damage-data.mjs'),
    'utf8',
);

test('_calculateDamage coerces the damage formula to a string before new Roll (numeric-formula guard)', () => {
    // the coercion must appear...
    const coerceIdx = src.indexOf('rollFormula = String(rollFormula)');
    assert.ok(coerceIdx > -1, 'rollFormula must be coerced to a string (String(rollFormula))');
    // ...before the main damage-roll construction
    const rollIdx = src.indexOf('this.damageRoll = new Roll(rollFormula');
    assert.ok(rollIdx > -1, 'the damage roll is constructed from rollFormula');
    assert.ok(coerceIdx < rollIdx, 'the String() coercion must run before `new Roll(rollFormula)`');
});
