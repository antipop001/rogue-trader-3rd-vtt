import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Follow-ups to the Maximal (0.8.42) and Compact-range (0.8.41) fixes. These classes aren't
// node-importable (Foundry globals at load), so source-level invariants + live rt-smoke verify.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('Maximal fired from a Blast-quality weapon adds +2 to the Blast radius (RT Core)', () => {
    const dmg = read('src/module/rolls/damage-data.mjs');
    const blastCase = dmg.slice(dmg.indexOf("case 'blast'"), dmg.indexOf("case 'concussive'"));
    assert.match(blastCase, /hasAttackSpecial\('Maximal'\) \? 2 : 0/, 'Blast radius +2 under Maximal');
    assert.match(blastCase, /blastRadius/, 'the effect must display the Maximal-adjusted radius');
    // Consistent with the rest of the Maximal path (Damage/Pen/range/ammo): guarded on the Maximal
    // quality, not a separate weapon-type check (Maximal is definitionally the plasma firing mode).
    assert.doesNotMatch(dmg, /toLowerCase\(\) === 'plasma'/, 'Maximal effects stay Maximal-gated, not type-gated');
});

test('Compact halves the effective clip via effectiveClipMax, rounding UP (RT Core p.163)', () => {
    const item = read('src/module/documents/item.mjs');
    assert.match(item, /get effectiveClipMax\(\)/, 'item must expose an effectiveClipMax getter');
    // Math.ceil, not floor — a clip-1 weapon must stay at 1 (floor→0 bricks it); RT rounds up.
    assert.match(item, /hasCompact \? Math\.ceil\(max \/ 2\) : max/, 'Compact halves rounding UP');
    assert.doesNotMatch(item, /Math\.floor\(max \/ 2\)/, 'must not floor (would brick a clip-1 weapon)');
    assert.match(item, /const max = Number\(this\.system\?\.clip\?\.max\)/, 'reads the stored base clip.max');
});

test('Compact clip is reflected in reload AND the ammo display', () => {
    const sheet = read('src/module/sheets/item/item-sheet.mjs');
    assert.match(sheet, /const max = Number\(this\.item\.effectiveClipMax\)/, 'reload fills to effectiveClipMax');
    const ammo = read('src/module/rules/ammo.mjs');
    assert.match(ammo, /item\.effectiveClipMax \?\? item\.system\.clip\.max/, 'ammoText shows the effective max');
});

test('reload refills to the effective (Compact-halved) capacity', () => {
    const sheet = read('src/module/sheets/item/item-sheet.mjs');
    assert.match(sheet, /const max = Number\(this\.item\.effectiveClipMax\)/,
        'the reload must fill clip.value to effectiveClipMax, not the raw clip.max');
});
