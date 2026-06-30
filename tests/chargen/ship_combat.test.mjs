// QA-047 — Strategic Round / VU void-ship combat pure helpers (RT Core pp.213-220).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    shipInitiativeBonus,
    shipManoeuvreDistance,
    shipMaxTurn,
    shipRangeBand,
    firingArcAllows,
    shipShootingResolution,
    shipRamDice,
} from '../../src/module/rules/ship-combat.mjs';

test('QA-047: initiative bonus = tens digit of Detection', () => {
    assert.equal(shipInitiativeBonus(47), 4);
    assert.equal(shipInitiativeBonus(8), 0);
    assert.equal(shipInitiativeBonus(50), 5);
    assert.equal(shipInitiativeBonus(undefined), 0);
});

test('QA-047: manoeuvre distance is full or half Speed (rounded down)', () => {
    assert.equal(shipManoeuvreDistance(7, 'full'), 7);
    assert.equal(shipManoeuvreDistance(7, 'half'), 3);
    assert.equal(shipManoeuvreDistance(0, 'full'), 0);
});

test('QA-047: max turn is 90 for frigate-or-smaller, 45 otherwise', () => {
    assert.equal(shipMaxTurn('Sword-class Frigate'), 90);
    assert.equal(shipMaxTurn('Viper-class Raider'), 90);
    assert.equal(shipMaxTurn('Jericho-class Transport'), 90);
    assert.equal(shipMaxTurn('Lunar-class Cruiser'), 45);
    assert.equal(shipMaxTurn(''), 45);
});

test('QA-047: range band — Short (+10) at <=half range, Long (-10) beyond, Out past range', () => {
    assert.deepEqual(shipRangeBand(3, 10), { band: 'Short', canFire: true, modifier: 10 });
    assert.deepEqual(shipRangeBand(5, 10), { band: 'Short', canFire: true, modifier: 10 });
    assert.deepEqual(shipRangeBand(8, 10), { band: 'Long', canFire: true, modifier: -10 });
    assert.deepEqual(shipRangeBand(11, 10), { band: 'Out of range', canFire: false, modifier: 0 });
});

test('QA-047: firing arc — prow=fore, beam weapons own arc, dorsal/keel any-but-aft, special any', () => {
    assert.equal(firingArcAllows('prow', 'fore'), true);
    assert.equal(firingArcAllows('prow', 'port'), false);
    assert.equal(firingArcAllows('port', 'port'), true);
    assert.equal(firingArcAllows('starboard', 'fore'), false);
    assert.equal(firingArcAllows('dorsal', 'fore'), true);
    assert.equal(firingArcAllows('dorsal', 'aft'), false);
    assert.equal(firingArcAllows('keel', 'starboard'), true);
    assert.equal(firingArcAllows('special', 'aft'), true);
});

test('BUG-Q-228: ram dice by hull — cruisers and larger inflict 2d10', () => {
    assert.equal(shipRamDice('Jericho-class Transport'), '1d5');
    assert.equal(shipRamDice('Hazeroth-class Raider'), '1d5');
    assert.equal(shipRamDice('Sword-class Frigate'), '1d10');
    assert.equal(shipRamDice('Dauntless-class Light Cruiser'), '2d5');
    assert.equal(shipRamDice('Lunar-class Cruiser'), '2d10');
    assert.equal(shipRamDice('Grand Cruiser'), '2d10');
    // Battleships are larger than cruisers — must not fall through to the transport/raider 1d5.
    assert.equal(shipRamDice('Retribution-class Battleship'), '2d10');
    assert.equal(shipRamDice(''), '1d5');
});

test('QA-047: shooting resolution combines arc eligibility + range band', () => {
    // prow weapon, target fore, 3 VU of 10 range -> Short +10
    assert.deepEqual(
        shipShootingResolution({ distanceVU: 3, weaponRangeVU: 10, slot: 'prow', targetArc: 'fore' }),
        { canFire: true, modifier: 10, band: 'Short', reason: '' },
    );
    // port weapon vs a fore target -> arc blocks it
    const blocked = shipShootingResolution({ distanceVU: 3, weaponRangeVU: 10, slot: 'port', targetArc: 'fore' });
    assert.equal(blocked.canFire, false);
    // in arc but out of range
    const far = shipShootingResolution({ distanceVU: 20, weaponRangeVU: 10, slot: 'prow', targetArc: 'fore' });
    assert.equal(far.canFire, false);
    assert.equal(far.band, 'Out of range');
});
