import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Loop-backlog warm-ups: Snare Shells −2 Damage, Compact halves range, Scatter applies within the
// whole ≤2m Point-Blank band ('Melee' + 'Point Blank'). ammo.mjs/range.mjs pull in Foundry globals
// transitively and action-data.mjs isn't node-importable, so these are source-level invariants.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('Snare Shells decrease base Damage by 2 (ItS p.130; Snare quality granted separately)', () => {
    const ammo = read('src/module/rules/ammo.mjs');
    assert.match(ammo, /case 'Snare Shells':[\s\S]*?hit\.modifiers\['snare shells'\] = -2;/,
        "the Snare Shells damage case must set a -2 Damage modifier");
});

test('Compact halves the weapon range (RT Core p.163)', () => {
    const range = read('src/module/rules/range.mjs');
    assert.match(range, /hasWeaponModification\('Compact'\)[\s\S]*?range = Math\.floor\(range \* \.5\)/,
        'the Compact upgrade must halve range');
});

test("Scatter multiple-hits applies at 'Melee' as well as 'Point Blank' (≤2m is Point Blank range)", () => {
    const ad = read('src/module/rolls/action-data.mjs');
    assert.match(ad, /hasAttackSpecial\('Scatter'\)[\s\S]*?rangeName === 'Point Blank' \|\| this\.rollData\.rangeName === 'Melee'/,
        "Scatter's +1 hit / 2 DoS must fire at 'Melee' (≤1m) too, not only 'Point Blank' (1-2m)");
});
