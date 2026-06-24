// ENGINE-CONSUMABLE-ACTIVATE — pure-JS tests for the drug-activation helpers.
// `parseConsumableDuration` turns a prose duration ("1d10 minutes", "3d10 Rounds",
// "1d5 hours") into a dice formula + AE-duration mapping; `consumableActivation`
// returns the per-drug timed-effect spec (or null for non-activated consumables).
// The Foundry-coupled apply point (the Use button → createEmbeddedDocuments) is
// covered by the E2E follow-up. Canon: RT Core p.142-143 / Into the Storm Ch.III.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConsumableDuration, consumableActivation } from '../../src/module/rolls/roll-helpers.mjs';

test('parseConsumableDuration maps rounds to AE rounds (secondsPer 1)', () => {
    assert.deepEqual(parseConsumableDuration('3d10 Rounds'),
        { formula: '3d10', unit: 'rounds', durationKey: 'rounds', secondsPer: 1 });
});

test('parseConsumableDuration maps minutes/hours to AE seconds', () => {
    assert.deepEqual(parseConsumableDuration('1d10 minutes'),
        { formula: '1d10', unit: 'minutes', durationKey: 'seconds', secondsPer: 60 });
    assert.deepEqual(parseConsumableDuration('1d5 hours'),
        { formula: '1d5', unit: 'hours', durationKey: 'seconds', secondsPer: 3600 });
});

test('parseConsumableDuration ignores a "per dose" suffix and accepts plain integers', () => {
    assert.equal(parseConsumableDuration('3d10 rounds per dose').formula, '3d10');
    assert.equal(parseConsumableDuration('5 rounds').formula, '5');
});

test('parseConsumableDuration returns null when no duration is present', () => {
    assert.equal(parseConsumableDuration('no duration here'), null);
    assert.equal(parseConsumableDuration(''), null);
    assert.equal(parseConsumableDuration(undefined), null);
});

test('consumableActivation returns null for non-activated consumables', () => {
    assert.equal(consumableActivation('Recaf'), null);
    assert.equal(consumableActivation('Medikit'), null);
    assert.equal(consumableActivation(''), null);
    assert.equal(consumableActivation(undefined), null);
});

test('consumableActivation matches names with or without the "(drug)" suffix', () => {
    assert.ok(consumableActivation('Frenzon (drug)'));
    assert.ok(consumableActivation('frenzon'));
    assert.ok(consumableActivation('Slaught'));      // no suffix in the pack
    assert.ok(consumableActivation('Cold Fire'));
});

test('White Void carries a clean +20 Willpower AE change', () => {
    const spec = consumableActivation('White Void');
    assert.deepEqual(spec.changes, [
        { key: 'system.characteristics.willpower.modifier', mode: 2, value: '20' },
    ]);
    const dur = parseConsumableDuration(spec.durationText);
    assert.equal(dur.unit, 'minutes');
});

test('Slaught expresses +3 Ag/Per Bonus as +30 on the characteristic modifiers', () => {
    // bonus = floor(value/10), so +30 to the modifier == exactly +3 to the Bonus.
    const spec = consumableActivation('Slaught');
    const keys = spec.changes.map((c) => c.key);
    assert.deepEqual(keys, [
        'system.characteristics.agility.modifier',
        'system.characteristics.perception.modifier',
    ]);
    assert.ok(spec.changes.every((c) => c.value === '30' && c.mode === 2));
});

test('talent-granting drugs flag the talent and carry no AE change', () => {
    assert.equal(consumableActivation('Frenzon')?.grantsTalent, 'Frenzy');
    assert.equal(consumableActivation('Cold Fire')?.grantsTalent, 'Battle Rage');
    assert.deepEqual(consumableActivation('Frenzon').changes, []);
});

test('narrative-only drugs have no AE change but always carry a note', () => {
    for (const name of ['Stimm', 'Spur', 'Wideawake', 'Attention Spanner']) {
        const spec = consumableActivation(name);
        assert.deepEqual(spec.changes, [], `${name} should carry no AE change`);
        assert.ok(spec.note && spec.note.length > 0, `${name} should carry a note`);
    }
});

test('consumableActivation returns a fresh copy (no shared-table mutation)', () => {
    const a = consumableActivation('White Void');
    a.changes[0].value = '999';
    const b = consumableActivation('White Void');
    assert.equal(b.changes[0].value, '20');
});
