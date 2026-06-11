// Tests for the pure commit-planning functions (Stage B mapping).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { ChargenState } from '../../src/module/chargen/state.mjs';
import { fixedSet } from '../../src/module/chargen/characteristics.mjs';
import { applyOption, buildRegistry } from '../../src/module/chargen/origin.mjs';
import { buildActorData, buildSkillData, planItems } from '../../src/module/chargen/commit.mjs';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)),
    '../../src/module/chargen/data');
const REG = buildRegistry({
    home_world: JSON.parse(readFileSync(path.join(DATA_DIR, 'home_worlds.json'), 'utf8')),
    species: JSON.parse(readFileSync(path.join(DATA_DIR, 'species.json'), 'utf8')),
});

function voidBornState() {
    const s = new ChargenState();
    s.name = 'Test Explorer';
    s.setCharacteristics(fixedSet());
    applyOption(REG, s, REG.home_world['Void Born']);
    return s;
}

test('buildSkillData: plain, specialist, unresolved, and unmapped skills', () => {
    const s = new ChargenState();
    s.grantSkill('Awareness', 'trained', 'T');
    s.grantSkill('Common Lore (Koronus Expanse)', 'basic', 'T');
    s.grantSkill('Navigation (Stellar)', 'basic', 'T');
    s.grantSkill('Common Lore (choose one)', 'trained', 'T');
    s.grantSkill('Totally Unknown Skill', 'trained', 'T');
    const r = buildSkillData(s);
    assert.equal(r.skills.awareness.advance, 1);
    assert.deepEqual(r.skills.commonLore.specialities.koronusExpanse, { advance: 0, taken: true });
    assert.deepEqual(r.skills.navigate.specialities.stellar, { advance: 0, taken: true });
    assert.deepEqual(r.unresolvedSpecialities, [{ name: 'Common Lore (choose one)', speciality: 'choose one' }]);
    assert.deepEqual(r.unmapped, ['Totally Unknown Skill']);
});

test('planItems: exact talent clones the compendium doc without _id', () => {
    const s = new ChargenState();
    s.grantTalent('Air of Authority', 'T');
    const { items, gaps } = planItems(s, {
        talentIndex: { 'Air of Authority': { _id: 'x', name: 'Air of Authority', type: 'talent', system: { benefit: 'B' } } },
    });
    assert.equal(items.length, 1);
    assert.equal(items[0]._id, undefined);
    assert.equal(items[0].system.benefit, 'B');
    assert.deepEqual(gaps.talents, []);
});

test('planItems: pickable base gets the concrete choice pre-set; "choose one" stays unset', () => {
    const peerBase = {
        name: 'Peer', type: 'talent', system: { benefit: 'B' },
        flags: { rt: { pickable: { kind: 'group', options: ['Astropaths', 'Workers'] } } },
    };
    const s = new ChargenState();
    s.grantTalent('Peer (Astropaths)', 'T');
    s.grantTalent('Peer (choose one)', 'T');
    const { items, gaps } = planItems(s, { talentIndex: { Peer: peerBase } });
    assert.equal(items[0].name, 'Peer (Astropaths)');
    assert.equal(items[0].system.choice, 'Astropaths');
    assert.equal(items[1].name, 'Peer');                 // hook will prompt
    assert.equal(items[1].system.choice, undefined);
    assert.deepEqual(gaps.talents, []);
});

test('planItems: alias resolves; unknown talent becomes a stub and a gap', () => {
    const s = new ChargenState();
    s.grantTalent('Resistance (Psychic Powers)', 'T');
    s.grantTalent('Chem-Geld', 'T');
    const { items, gaps } = planItems(s, {
        talentIndex: { 'Resistance (Psychic Techniques)': { name: 'Resistance (Psychic Techniques)', type: 'talent', system: {} } },
    });
    assert.equal(items[0].name, 'Resistance (Psychic Techniques)');
    assert.equal(items[1].name, 'Chem-Geld');
    assert.equal(items[1].type, 'talent');
    assert.deepEqual(gaps.talents, ['Chem-Geld']);
});

test('planItems: origin traits become stub trait items carrying the rules text', () => {
    const s = voidBornState();
    const { items, gaps } = planItems(s, {});
    const charmed = items.find((i) => i.name === 'Charmed');
    assert.equal(charmed.type, 'trait');
    assert.match(charmed.system.description, /Fate Point/);
    assert.equal(gaps.traits.length, 3); // none of the three are in the (empty) index
});

test('buildActorData: skills, originPath labels, notes, xp, no legacy homeWorld', () => {
    const s = voidBornState();
    s.species = null;
    s.career = 'Arch-militant';
    const data = buildActorData(s, {
        originLabels: { homeWorld: ['Death World', 'Void Born'] },
    });
    // Characteristics: S 36 base with -5 modifier from Void Born.
    assert.equal(data.system.characteristics.strength.base, 36);
    assert.equal(data.system.characteristics.strength.modifier, -5);
    // Skills landed.
    assert.deepEqual(data.system.skills.navigate.specialities.stellar, { advance: 0, taken: true });
    // originPath label match; career label casing corrected.
    assert.equal(data.system.bio.originPath.homeWorld.value, 'Void Born');
    assert.equal(data.system.bio.originPath.career.value, 'Arch-Militant');
    // CRITICAL: legacy DH2 field must never be written (Forge/Hive World collide).
    assert.equal(data.system.bio.homeWorld, undefined);
    // XP pool recorded once origin picks exist.
    assert.deepEqual(data.system.experience, { total: 500, used: 0 });
    assert.equal(data.flags.rt.chargen.origin.home_world, 'Void Born');
});

test('buildActorData: ItS label prefix-match, wounds/fate, insanity, PF note', () => {
    const s = voidBornState();
    s.origin.home_world = 'Frontier World';
    s.wounds = 11;
    s.fate = 3;
    s.insanity = 5;
    s.profitFactor = 20;
    const data = buildActorData(s, {
        originLabels: { homeWorld: ['Death World', 'Frontier World (ItS — replaces Death World)'] },
    });
    assert.equal(data.system.bio.originPath.homeWorld.value,
        'Frontier World (ItS — replaces Death World)');
    assert.deepEqual(data.system.wounds, { max: 11, value: 11, rolled: true });
    assert.deepEqual(data.system.fate, { max: 3, value: 3, rolled: true });
    assert.equal(data.system.insanity, 5);
    assert.match(data.system.bio.notes, /Profit Factor contribution \(dynasty\): 20/);
});

test('buildActorData: unmapped skills and item gaps surface in bio notes', () => {
    const s = voidBornState();
    s.grantSkill('Totally Unknown Skill', 'trained', 'T');
    const data = buildActorData(s, { itemGaps: { talents: ['Chem-Geld'], traits: [] } });
    assert.match(data.system.bio.notes, /Unmapped skill: Totally Unknown Skill/);
    assert.match(data.system.bio.notes, /Talents without compendium entry: Chem-Geld/);
});
