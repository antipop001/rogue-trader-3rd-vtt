import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ChargenState, STARTING_XP } from '../../src/module/chargen/state.mjs';
import { GenMethod } from '../../src/module/chargen/characteristics.mjs';
import { buildActorData } from '../../src/module/chargen/commit.mjs';

function stateWithBases() {
    const s = new ChargenState();
    s.setCharacteristics({
        base: { WS: 30, BS: 31, S: 32, T: 33, Ag: 34, Int: 35, Per: 36, WP: 37, Fel: 38 },
        method: GenMethod.MANUAL,
    });
    return s;
}

test('value = base + summed modifiers; bonus follows effective value', () => {
    const s = stateWithBases();
    assert.equal(s.value('WS'), 30);
    s.addModifier('Death World', 'WS', 5);
    s.addModifier('Stub', 'WS', -10);
    assert.equal(s.value('WS'), 25);
    assert.equal(s.bonus('WS'), 2);
    assert.equal(s.value('Fel'), 38); // others untouched
});

test('hasCharacteristics requires a method and all nine finite bases', () => {
    const empty = new ChargenState();
    assert.equal(empty.hasCharacteristics, false);
    const s = stateWithBases();
    assert.equal(s.hasCharacteristics, true);
    delete s.characteristics.base.Fel;
    assert.equal(s.hasCharacteristics, false);
});

test('grantSkill: trained beats basic, never downgrades', () => {
    const s = new ChargenState();
    s.grantSkill('Awareness', 'basic', 'Test');
    assert.equal(s.skills.Awareness, 'basic');
    s.grantSkill('Awareness', 'trained', 'Test');
    assert.equal(s.skills.Awareness, 'trained');
    s.grantSkill('Awareness', 'basic', 'Test');
    assert.equal(s.skills.Awareness, 'trained'); // no downgrade
});

test('grantTalent dedupes; addTrait keeps provenance; log records all', () => {
    const s = new ChargenState();
    s.grantTalent('Jaded', 'Death World');
    s.grantTalent('Jaded', 'Elsewhere');
    assert.deepEqual(s.talents, ['Jaded']);
    s.addTrait('Charmed', 'Fate point text', 'Void Born');
    assert.equal(s.traits[0].source, 'Void Born');
    assert.equal(s.log.length, 3);
});

test('toJSON/fromJSON round-trips the full state', () => {
    const s = stateWithBases();
    s.name = 'Test Explorer';
    s.addModifier('Void Born', 'S', -5);
    s.grantSkill('Awareness', 'trained', 'Void Born');
    s.originInputs.push({ step: 'home_world', option: 'Void Born', choices: {}, rolls: {} });
    const restored = ChargenState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));
    assert.equal(restored.name, 'Test Explorer');
    assert.equal(restored.value('S'), 27);
    assert.equal(restored.skills.Awareness, 'trained');
    assert.deepEqual(restored.originInputs, s.originInputs);
    assert.equal(restored.hasCharacteristics, true);
});

test('STARTING_XP is the RT 500 pool', () => {
    assert.equal(STARTING_XP, 500);
});

test('buildActorData: rolled base to .base, origin mods summed into .modifier', () => {
    const s = stateWithBases();
    s.name = 'Sister Dominica';
    s.addModifier('Void Born', 'S', -5);
    s.addModifier('Void Born', 'WP', 5);
    s.addModifier('Stub', 'WP', 3);
    const data = buildActorData(s);
    assert.equal(data.name, 'Sister Dominica');
    assert.equal(data.system.characteristics.strength.base, 32);
    assert.equal(data.system.characteristics.strength.modifier, -5);
    assert.equal(data.system.characteristics.willpower.base, 37);
    assert.equal(data.system.characteristics.willpower.modifier, 8);
    assert.equal(data.system.characteristics.weaponSkill.modifier, 0);
    assert.equal(data.flags.rt.chargen.name, 'Sister Dominica');
});

test('buildActorData falls back to a default name', () => {
    const data = buildActorData(stateWithBases());
    assert.equal(data.name, 'New Explorer');
});
