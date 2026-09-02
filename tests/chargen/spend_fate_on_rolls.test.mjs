import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard: every roll type that belongs to a Fate-bearing actor must offer a
// "Spend Fate" control on its chat card, and the handler must spend a Fate Point (subtract
// from current Fate via actor.spendFate). action-data / sheet code isn't node-importable
// (Foundry globals at load), so these are source-level invariants.

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('the spend-fate chat control is bound and handled in basic-action-manager', () => {
    const src = read('module/actions/basic-action-manager.mjs');
    assert.match(src, /\.roll-control__spend-fate['"]\)\.click\(/,
        'the .roll-control__spend-fate button must be wired up on chat render');
    assert.match(src, /async _spendFate\s*\(/, '_spendFate handler must exist');
    assert.match(src, /actor\.spendFate\(/,
        '_spendFate must route to actor.spendFate (which subtracts 1 from current Fate)');
});

test('every roll-type card renders a Spend Fate button, guarded to Fate-bearing actors', () => {
    const cards = [
        'templates/chat/simple-roll-chat.hbs',      // skills + characteristics
        'templates/chat/force-field-roll-chat.hbs', // force fields
        'templates/chat/action-roll-chat.hbs',      // weapon attacks (alongside auto Re-roll)
        'templates/chat/psychic-action-chat.hbs',   // psychic powers (alongside auto Re-roll)
    ];
    for (const tpl of cards) {
        const html = read(tpl);
        assert.match(html, /roll-control__spend-fate/, `${tpl} must include the Spend Fate control`);
        assert.match(html, /data-actor-uuid=/, `${tpl} Spend Fate control must carry the actor uuid`);
        assert.match(html, /\{\{#if\s+[^}]*system\.fate\}\}/,
            `${tpl} must only show Spend Fate for Fate-bearing actors`);
    }
});

test('spendFate always decrements current Fate by 1 (the load-bearing behavior)', () => {
    const acolyte = read('module/documents/acolyte.mjs');
    const block = acolyte.slice(acolyte.indexOf('async spendFate('), acolyte.indexOf('async burnFate('));
    assert.ok(block.length > 0, 'spendFate block not found');
    assert.match(block, /'system\.fate\.value'\s*:\s*this\.system\.fate\.value\s*-\s*1/,
        'spendFate must subtract 1 from system.fate.value');
});
