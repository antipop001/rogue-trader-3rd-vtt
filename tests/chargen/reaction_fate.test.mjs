import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard: a defender who Dodges/Parries from an attack card must be able to spend
// a Fate Point on that Reaction. Previously the outcome was a bare chat line, the attack
// card's Spend Fate belonged to the attacker, and re-clicking Dodge was refused (Reaction
// already spent). Source-level: these modules aren't node-importable (Foundry globals).

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('reaction outcome carries a defender-owned Spend Fate control, wired on render', () => {
    const src = read('module/actions/basic-action-manager.mjs');
    assert.match(src, /\.roll-control__reaction-fate['"]\)\.click\(/, 'reaction-fate button must be bound');
    assert.match(src, /async _reactionFate\s*\(/, '_reactionFate handler must exist');
    assert.match(src, /roll-control__reaction-fate" data-actor-uuid="\$\{actor\.uuid\}"/,
        'the control must carry the DEFENDER uuid, not the attacker');
    assert.match(src, /actor\.spendFate\(kind\)/, 'must spend (decrement) the Fate Point');
    assert.match(src, /fateUsed: true/, 'one Fate per Reaction — the re-posted outcome must not offer it again');
});

test('a Fate re-roll of a Reaction does not spend the Reaction budget again', () => {
    const src = read('module/documents/acolyte.mjs');
    assert.match(src, /async rollReaction\(type, \{ fateReroll = false \} = \{\}\)/);
    assert.match(src, /if \(!fateReroll && game\.combat\?\.started/,
        'budget/lockout gate must be skipped for a Fate re-roll');
    assert.match(read('module/actions/basic-action-manager.mjs'), /rollReaction\(type, \{ fateReroll: true \}\)/);
});
