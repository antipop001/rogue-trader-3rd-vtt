// QA-153/044 — void-ship weapon: single BS test, 1+DoS hits capped at Strength, crit on Crit Rating.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voidshipWeaponHits } from '../../src/module/rolls/roll-helpers.mjs';

test('QA-153: 1 + DoS hits, capped at Strength', () => {
    // RT Core p.217 worked example: BS target 58, roll 29 -> 2 DoS -> 3 hits (<= Strength 4)
    assert.deepEqual(voidshipWeaponHits(29, 58, 4, 4), { hit: true, dos: 2, hits: 3, critical: false });
    // bare success: 0 DoS -> 1 hit
    assert.equal(voidshipWeaponHits(56, 58, 4, 4).hits, 1);
    // big DoS capped at Strength: roll 5 vs 58 -> 5 DoS -> 6 capped to 4
    assert.equal(voidshipWeaponHits(5, 58, 4, 4).hits, 4);
    // Strength 1 lance: always 1 hit max
    assert.equal(voidshipWeaponHits(5, 58, 1, 3).hits, 1);
    // miss / fumble -> 0 hits
    assert.equal(voidshipWeaponHits(59, 58, 4, 4).hits, 0);
    assert.equal(voidshipWeaponHits(100, 58, 4, 4).hits, 0);
});

test('QA-044: critical when DoS >= Crit Rating', () => {
    assert.equal(voidshipWeaponHits(29, 58, 4, 4).critical, false);  // 2 DoS < CR 4
    assert.equal(voidshipWeaponHits(5, 58, 4, 4).critical, true);    // 5 DoS >= CR 4
    // lance CR 3: 11 vs 58 -> 4 DoS -> crit (matches the canon lance example)
    assert.equal(voidshipWeaponHits(11, 58, 1, 3).critical, true);
    assert.equal(voidshipWeaponHits(11, 58, 1, 3).dos, 4);
    assert.equal(voidshipWeaponHits(29, 58, 4, 0).critical, false);  // CR 0 -> never
});

import { voidshipHullDamage } from '../../src/module/rolls/roll-helpers.mjs';
test('QA-042: macrobattery combines hits then subtracts Armour once; lance ignores Armour', () => {
    // macro: 3 hits 8+9+7=24, armour 10 -> 14 hull
    assert.equal(voidshipHullDamage([8,9,7], 10, false), 14);
    // armour stops it -> 0
    assert.equal(voidshipHullDamage([4], 10, false), 0);
    assert.equal(voidshipHullDamage([3,4], 10, false), 0);
    // lance: ignore armour, straight to hull
    assert.equal(voidshipHullDamage([12], 10, true), 12);
    assert.equal(voidshipHullDamage([9,9], 20, true), 18);
    assert.equal(voidshipHullDamage([], 5, false), 0);
});
