import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Maximal (plasma firing mode) grants +2 Penetration (RT Core, verbatim: "1d10 to Damage and
// +2 Pen"). 0.8.25 wrongly removed it as a "DH2 leftover" on faulty NotebookLM info; restored.
// damage-data.mjs isn't node-importable (Foundry globals), so this is a source-level invariant.
const dmg = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'module', 'rolls', 'damage-data.mjs'),
    'utf8',
);

test('Maximal grants +2 Penetration (RT Core; the 0.8.25 removal was a regression)', () => {
    assert.match(dmg, /hasAttackSpecial\('Maximal'\)\)\s*\{\s*\n\s*this\.penetrationModifiers\['maximal'\] = 2;/,
        'a ranged Maximal shot must add +2 to penetrationModifiers');
    // and it must NOT still claim Maximal has no Pen bonus
    assert.doesNotMatch(dmg, /Maximal.*but NO Penetration bonus/,
        'the incorrect "no Penetration bonus" comment must be gone');
});
