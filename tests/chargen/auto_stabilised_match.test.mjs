// The unbraced-Heavy -30 is cancelled by the Auto-Stabilised trait (RT Core: "always counts as
// braced when firing heavy weapons"). NPC packs carry OCR'd spellings — the Lure of the Expanse
// Wraithguard has "Auto-stabilised" with a Heavy Wraithcannon — so the match must be loose.
// roll-data.mjs isn't node-importable (Foundry globals), so this is a source-level guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../src/module/rolls/roll-data.mjs', import.meta.url), 'utf8');
const match = src.match(/\/\^auto-stabili\[sz\]ed\$\/i/);

test('autoBraced matches the Auto-Stabilised trait case- and spelling-insensitively', () => {
    assert.ok(match, 'roll-data must use a loose Auto-Stabilised trait match');
    assert.doesNotMatch(src, /i\.name === 'Auto-Stabilised'/, 'no exact-name match left');
    const re = /^auto-stabili[sz]ed$/i;
    for (const n of ['Auto-Stabilised', 'Auto-stabilised', 'Auto-stabilized', 'AUTO-STABILISED']) assert.ok(re.test(n), n);
    assert.ok(!re.test('Auto-stabilised Logis-targeter'), 'the ship component must not match');
});

test('the Lure of the Expanse Wraithguard carries the trait and a Heavy Wraithcannon', () => {
    const yml = readFileSync(new URL('../../src/packs/lureoftheexpanse-npcs/lureoftheexpanse-npcs.yml', import.meta.url), 'utf8');
    assert.match(yml, /name: Auto-stabilised/);
    assert.ok(yml.includes('Wraithcannon'));
});
