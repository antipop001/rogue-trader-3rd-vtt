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

test('voidship._computeComponentBonuses sums macrobatteryDamage', () => {
    const src = read('src/module/documents/voidship.mjs');
    assert.match(src, /macrobatteryDamage:\s*0/,
        'the componentBonuses accumulator must initialize macrobatteryDamage so it is summed from components');
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
