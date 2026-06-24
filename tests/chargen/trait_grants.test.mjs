// ENGINE-TRAIT-GRANTS — pure-JS coverage for pendingGrants (the dedup half of the
// item-grant machinery). The Foundry-coupled half — resolving each grant from its pack
// and createEmbeddedDocuments — lives in hooks-manager.applyItemGrants (E2E follow-up).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingGrants } from '../../src/module/rolls/roll-helpers.mjs';

test('returns all grants when the actor has none of them', () => {
    const grants = [
        { name: 'Mechanicus Implants', type: 'trait' },
        { name: 'True Grit', type: 'talent' },
    ];
    assert.deepEqual(pendingGrants(grants, []), grants);
});

test('filters out grants already present (case-insensitive name + type match)', () => {
    const grants = [
        { name: 'Unnatural Toughness (x2)', type: 'trait' },
        { name: 'Sturdy', type: 'trait' },
        { name: 'Iron Jaw', type: 'talent' },
        { name: 'True Grit', type: 'talent' },
    ];
    const existing = [
        { name: 'unnatural toughness (x2)', type: 'trait' }, // lower-case
        { name: 'True Grit', type: 'talent' },
    ];
    assert.deepEqual(pendingGrants(grants, existing), [
        { name: 'Sturdy', type: 'trait' },
        { name: 'Iron Jaw', type: 'talent' },
    ]);
});

test('name match requires the same type (same name, different type is not a match)', () => {
    const grants = [{ name: 'Machine', type: 'trait' }];
    // an item named "Machine" of a different type does not satisfy the trait grant
    const existing = [{ name: 'Machine', type: 'talent' }];
    assert.deepEqual(pendingGrants(grants, existing), grants);
});

test('collapses duplicate grants in the spec to one', () => {
    const grants = [
        { name: 'Machine', type: 'trait' },
        { name: 'machine', type: 'trait' },
    ];
    assert.deepEqual(pendingGrants(grants, []), [{ name: 'Machine', type: 'trait' }]);
});

test('preserves an explicit pack override on a grant', () => {
    const grants = [{ name: 'Special', type: 'trait', pack: 'special-traits' }];
    assert.deepEqual(pendingGrants(grants, []), [
        { name: 'Special', type: 'trait', pack: 'special-traits' },
    ]);
});

test('bad / empty inputs return no grants', () => {
    assert.deepEqual(pendingGrants(undefined, []), []);
    assert.deepEqual(pendingGrants([], []), []);
    assert.deepEqual(pendingGrants(null, null), []);
    // skips malformed grant entries (missing name or type)
    assert.deepEqual(pendingGrants([{ name: 'X' }, { type: 'trait' }, {}], []), []);
});
