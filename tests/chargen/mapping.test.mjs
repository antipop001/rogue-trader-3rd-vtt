import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    ADVANCE,
    CAREER_KEY,
    CHAR_KEY,
    ORIGIN_STEP,
    SKILL_KEY,
    resolveSkill,
} from '../../src/module/chargen/mapping.mjs';

test('characteristic keys cover all nine', () => {
    assert.equal(Object.keys(CHAR_KEY).length, 9);
    assert.equal(CHAR_KEY.WS, 'weaponSkill');
    assert.equal(CHAR_KEY.Fel, 'fellowship');
});

test('advance levels: Untrained 0 / Trained 1 / +10 2 / +20 3', () => {
    assert.deepEqual(ADVANCE, { 'basic': 0, 'trained': 1, '+10': 2, '+20': 3 });
});

test('resolveSkill: plain skills', () => {
    assert.deepEqual(resolveSkill('Awareness'), { key: 'awareness' });
    assert.deepEqual(resolveSkill('Chem-Use'), { key: 'chemUse' });
    assert.deepEqual(resolveSkill('Sleight of Hand'), { key: 'sleightOfHand' });
});

test('resolveSkill: specialist skills with specialities', () => {
    assert.deepEqual(resolveSkill('Common Lore (Koronus Expanse)'),
        { key: 'commonLore', speciality: 'koronusExpanse' });
    assert.deepEqual(resolveSkill('Speak Language (Low Gothic)'),
        { key: 'speakLanguage', speciality: 'lowGothic' });
    assert.deepEqual(resolveSkill('Pilot (Spacecraft)'),
        { key: 'pilot', speciality: 'spaceCraft' });
});

test('resolveSkill: per-parent override disambiguates Warp', () => {
    // Navigation (Warp) -> navigate.warp, NOT Forbidden Lore's theWarp
    assert.deepEqual(resolveSkill('Navigation (Warp)'),
        { key: 'navigate', speciality: 'warp' });
    assert.deepEqual(resolveSkill('Forbidden Lore (The Warp)'),
        { key: 'forbiddenLore', speciality: 'theWarp' });
});

test('resolveSkill: unresolved speciality reports the gap, keeps the parent', () => {
    const r = resolveSkill('Common Lore (choose one)');
    assert.equal(r.key, 'commonLore');
    assert.equal(r.speciality, undefined);
    assert.equal(r.unresolvedSpeciality, 'choose one');
});

test('resolveSkill: unknown skill returns null (caller records a gap)', () => {
    assert.equal(resolveSkill('Underwater Basket Weaving'), null);
});

test('origin step and career keys match the system conventions', () => {
    assert.equal(ORIGIN_STEP.lure_of_the_void, 'lureOfTheVoid');
    assert.equal(CAREER_KEY['Void-master'], 'voidMaster');
    assert.equal(Object.keys(CAREER_KEY).length, 10);
    assert.equal(SKILL_KEY['Tech-Use'], 'techUse');
});
