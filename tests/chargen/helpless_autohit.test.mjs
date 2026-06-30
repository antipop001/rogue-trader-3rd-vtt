// BUG-Q-220 — Helpless targets (RT Core p.248): "Weapon Skill Tests made to hit a sleeping,
// unconscious or otherwise helpless target automatically succeed." Melee (WS) auto-hits a
// helpless target; ranged (BS) shots do not (they only gain the +30 condition modifier).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meleeAutoHitsHelpless } from '../../src/module/rules/conditions.mjs';

test('a melee attack against a helpless target auto-hits', () => {
    assert.equal(meleeAutoHitsHelpless(true, new Set(['helpless'])), true);
});

test('a ranged attack against a helpless target does NOT auto-hit', () => {
    assert.equal(meleeAutoHitsHelpless(false, new Set(['helpless'])), false);
});

test('a melee attack against a non-helpless target does not auto-hit', () => {
    assert.equal(meleeAutoHitsHelpless(true, new Set(['stunned', 'prone'])), false);
    assert.equal(meleeAutoHitsHelpless(true, new Set()), false);
});

test('tolerates a plain array or missing statuses', () => {
    assert.equal(meleeAutoHitsHelpless(true, ['helpless']), true);
    assert.equal(meleeAutoHitsHelpless(true, undefined), false);
    assert.equal(meleeAutoHitsHelpless(true, null), false);
});
