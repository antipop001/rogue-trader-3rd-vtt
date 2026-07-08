import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard for the ship-component combat-bonus wiring (Munitorium's Ordinatus Extremus:
// every macrobattery on the ship gains +1 to its listed Damage). The three sites must stay in
// sync or the bonus silently stops applying. action-data/voidship/damage-data aren't node-importable
// (Foundry globals at load), so these are source-level invariants.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('shipComponent bonuses schema declares macrobatteryDamage', () => {
    const t = JSON.parse(read('src/template.json'));
    const bonuses = t.Item.templates.shipComponent.bonuses;
    assert.equal(bonuses.macrobatteryDamage, 0, 'template.json shipComponent.bonuses must include macrobatteryDamage');
});

test('voidship._computeComponentBonuses sums macrobatteryDamage / crewRating / boarding', () => {
    const src = read('src/module/documents/voidship.mjs');
    for (const key of ['macrobatteryDamage', 'crewRating', 'boardingAttack', 'boardingDefend']) {
        assert.match(src, new RegExp(`${key}:\\s*0`),
            `the componentBonuses accumulator must initialize ${key} so it is summed from components`);
    }
});

test('shipComponent bonuses schema declares crewRating + boarding fields', () => {
    const b = JSON.parse(read('src/template.json')).Item.templates.shipComponent.bonuses;
    assert.equal(b.crewRating, 0);
    assert.equal(b.boardingAttack, 0);
    assert.equal(b.boardingDefend, 0);
});

test('rollCrew folds crewRating bonus into the base target; rollBoarding folds crewRating + boarding attack/defend', () => {
    const src = read('src/module/documents/voidship.mjs');
    // crewRating improves every crew Test
    assert.match(src, /baseTarget\s*=\s*\(this\.system\.crewRating\s*\|\|\s*0\)\s*\+\s*\(cb\.crewRating\s*\|\|\s*0\)/,
        'rollCrew must add cb.crewRating to the base target');
    // attacker (this) gets boardingAttack; defender (target) gets boardingDefend
    assert.match(src, /aCB\.boardingAttack/, 'boarding initiator must receive boardingAttack');
    assert.match(src, /dCB\.boardingDefend/, 'boarding defender must receive boardingDefend');
    assert.match(src, /aCB\.crewRating/, 'boarding must fold the initiator crewRating bonus');
    assert.match(src, /dCB\.crewRating/, 'boarding must fold the defender crewRating bonus');
});

test('pack: crewRating + boarding components carry their bonuses', () => {
    const pack = read('src/packs/ship-components/ship-components.yml');
    const around = (name, span = 380) => {
        const i = pack.indexOf('name: ' + name);
        return i < 0 ? '' : pack.slice(Math.max(0, i - span), i);
    };
    assert.match(around('Cogitator Interlink'), /crewRating:\s*5/, 'Cogitator Interlink +5 Crew Rating');
    const barracks = around('Barracks');
    assert.match(barracks, /boardingAttack:\s*20/, 'Barracks +20 boarding (attack)');
    assert.match(barracks, /boardingDefend:\s*20/, 'Barracks +20 boarding (defend)');
    assert.match(around('Tenebro-Maze'), /boardingDefend:\s*10/, 'Tenebro-Maze +10 defend');
    assert.match(around('Clan-kin Quarters'), /boardingDefend:\s*5/, 'Clan-kin Quarters +5 defend');
    assert.match(around('Murder-Servitors'), /boardingAttack:\s*20/, 'Murder-Servitors +20 attack (hit-and-run)');
    assert.match(around('Teleportarium'), /boardingAttack:\s*20/, 'Teleportarium +20 attack (hit-and-run)');
});

test('ship-weapon damage adds the ship macrobatteryDamage bonus (macrobatteries only, not lances)', () => {
    const src = read('src/module/rolls/damage-data.mjs');
    assert.match(src, /componentBonuses\?\.\s*macrobatteryDamage/,
        'the ship-weapon damage branch must read sourceActor.system.componentBonuses.macrobatteryDamage');
    // guard the lance exclusion so lances never receive the macrobattery bonus
    const branch = src.slice(src.indexOf("actionItem.type === 'shipWeapon'"), src.indexOf("actionItem.type === 'shipWeapon'") + 700);
    assert.match(branch, /isLance/, 'macrobattery damage must be gated to exclude lances');
});

test('Munitorium carries macrobatteryDamage:1 and Bridge/Augur carry their bonuses in the pack', () => {
    const pack = read('src/packs/ship-components/ship-components.yml');
    // crude per-item slices keyed on the (post-block) name line
    const around = (name, span = 320) => {
        const i = pack.indexOf('name: ' + name);
        return i < 0 ? '' : pack.slice(Math.max(0, i - span), i);
    };
    assert.match(around('Munitorium'), /macrobatteryDamage:\s*1/, 'Munitorium must set macrobatteryDamage: 1');
    assert.match(around('Bridge of Antiquity'), /maneuverability:\s*5/, 'Bridge of Antiquity must set maneuverability: 5');
    assert.match(around('Deep Void Augur Array'), /detection:\s*10/, 'Deep Void Augur Array must set detection: 10');
});

test('ship-component-bonus audit: canon-corrected values hold', () => {
    const pack = read('src/packs/ship-components/ship-components.yml');
    const around = (name, span = 340) => {
        const i = pack.indexOf('name: ' + name);
        return i < 0 ? '' : pack.slice(Math.max(0, i - span), i);
    };
    // M-201.b Sensitive +5 Detection; R-50 Stellar Detection -2 Detection (RT Core p.202)
    assert.match(around('M-201.b Augur Array'), /detection:\s*5/, 'M-201.b Sensitive: +5 Detection');
    assert.match(around('R-50 Auspex Multi-band'), /detection:\s*-2/, 'R-50 Stellar Detection: -2 Detection');
    // Micro Laser "Wall of Light" is +2 turret rating (was wired 1)
    assert.match(around('Micro Laser Defence Grid'), /turrets:\s*2/, 'Micro Laser Defence Grid: +2 turrets');
    // Auto-stabilised Logis-targeter has BOTH Image of the Void (+5 Det) and Targeting Matrix (+5 BS)
    const logis = around('Auto-stabilised Logis-targeter');
    assert.match(logis, /detection:\s*5/, 'Logis-targeter Image of the Void: +5 Detection');
    assert.match(logis, /bsShipWeapons:\s*5/, 'Logis-targeter Targeting Matrix: +5 BS');
    // Gravity Sails: +1 Speed AND +5 Manoeuvrability
    const grav = around('Gravity Sails');
    assert.match(grav, /speed:\s*1/, 'Gravity Sails: +1 Speed');
    assert.match(grav, /maneuverability:\s*5/, 'Gravity Sails: +5 Manoeuvrability');
    // Gyro-stabilisation Matrix is a difficulty-tier effect (ItS) — NOT a flat +5 Manoeuvrability
    assert.match(around('Gyro-stabilisation Matrix'), /maneuverability:\s*0/, 'Gyro-stabilisation Matrix must NOT wire a flat +Manoeuvrability');
});
