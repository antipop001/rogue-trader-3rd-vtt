import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard: when a Perils of the Warp roll is triggered, its dice roll must be shown
// in chat (not just the outcome text). `drawFromTable` rolls the table silently via
// `table.roll()`; a `showRoll` option posts the evaluated Roll to chat (Roll#toMessage, which
// also drives Dice So Nice). Both Perils draws in checkForPerils must pass `showRoll: true`.
//
// action-data.mjs can't be imported under node (Foundry globals at load), so this is a
// source-level invariant.

const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'module', 'rolls', 'action-data.mjs'),
    'utf8',
);

test('drawFromTable accepts a showRoll option and posts the evaluated roll to chat', () => {
    assert.match(src, /async function drawFromTable\([^)]*\{\s*showRoll\s*=\s*false[^)]*\)/,
        'drawFromTable must accept a { showRoll } option');
    assert.match(src, /if\s*\(\s*showRoll[^)]*\)\s*\{[\s\S]*?draw\.roll\.toMessage\(/,
        'when showRoll is set, drawFromTable must post draw.roll via toMessage so the dice are shown');
});

test('both Perils of the Warp draws request showRoll (the dice must be visible)', () => {
    const perilsCalls = [...src.matchAll(/drawFromTable\(\s*['"]Perils of the Warp['"][\s\S]*?\)/g)]
        .map(m => m[0]);
    assert.ok(perilsCalls.length >= 2,
        `expected at least 2 Perils draws (normal + Astropath), found ${perilsCalls.length}`);
    for (const call of perilsCalls) {
        assert.match(call, /showRoll:\s*true/,
            `every Perils of the Warp draw must pass showRoll: true — offending call: ${call}`);
    }
});
