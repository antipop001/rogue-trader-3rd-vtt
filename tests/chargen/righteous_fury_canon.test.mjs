import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Righteous Fury must follow RT 1e consolidated with Errata v1.4 p.277: the extra is ONE plain
// exploding 1d10 (not "another full weapon damage roll"), it does NOT carry Tearing/Proven/Strength
// Bonus, vs vehicles it rolls 1d5 on the Vehicle Crit Chart instead, it does not apply to ship
// weapons, and an unarmed triggering-10 counts as 5 toward base damage. damage-data.mjs isn't
// node-importable (Foundry globals at load), so these are source-level invariants over the RF block.
const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'module', 'rolls', 'damage-data.mjs'),
    'utf8',
);
// Isolate the Righteous Fury resolution block so assertions don't match the base-damage code.
const rfBlock = src.slice(src.indexOf('const rfToHit ='), src.indexOf('// Weapon Master'));
assert.ok(rfBlock.length > 0, 'RF resolution block not found');

test('RF extra is a raw exploding 1d10 (not the weapon damage formula / per-DoS formula)', () => {
    assert.match(rfBlock, /new Roll\('1d10x10',\s*\{\}\)/, 'the creature RF extra must be a raw exploding 1d10');
    assert.doesNotMatch(rfBlock, /rfFormula/, 'the old rfFormula (full-weapon / per-DoS) extra must be gone');
    assert.doesNotMatch(rfBlock, /rfMeleeBonus/, 'the Strength Bonus must not be added to the RF extra');
});

test('RF extra does not carry Tearing or Proven (it is a raw die)', () => {
    assert.doesNotMatch(rfBlock, /Tearing/, 'RF extra must not apply Tearing');
    assert.doesNotMatch(rfBlock, /Proven/, 'RF extra must not apply Proven');
});

test('RF extra explodes on a natural 10 WITHOUT a new confirmation roll (exploding die)', () => {
    // The cascade (another 10 on the extra die) adds more dice with no further confirm — RT Core p.245.
    // Resolved as one exploding roll, so the extra must NOT feed rfPending back through the confirm loop.
    assert.match(rfBlock, /new Roll\('1d10x10',\s*\{\}\)/, 'the creature RF extra must be an exploding 1d10 (1d10x10)');
    assert.doesNotMatch(rfBlock, /rfPending\s*\+=\s*1/, 'a cascading 10 must NOT trigger another confirmation roll');
});

test('RF vs a vehicle rolls 1d5 on the Vehicle Critical Hit Chart instead of +1d10, only if it damages', () => {
    assert.match(rfBlock, /targetIsVehicle/, 'the vehicle branch must be present');
    assert.match(rfBlock, /new Roll\('1d5',\s*\{\}\)/, 'vehicle RF rolls 1d5');
    assert.match(rfBlock, /getVehicleCritical/, 'vehicle RF looks up the Vehicle Critical Hit Chart');
    // Errata v1.4: RF applies to a vehicle only if the attack damages it — surfaced in the effect text.
    assert.match(rfBlock, /only if this attack actually damages the vehicle/i,
        'the vehicle RF note must state the "only if it damages the vehicle" condition');
});

test('unarmed RF extra die counts each rolled 10 as 5 (across the exploded cascade)', () => {
    // Only a VALUE of 10 is capped (=== 10), not "whatever triggered RF" — a lowered threshold, were
    // one ever added, must not dock a 9.
    assert.match(rfBlock, /r\.result === 10\)\s*contribution -= 5/,
        'each active 10 in the unarmed RF exploding roll must dock 5 (count as 5, not 10)');
});

test('RF confirmation auto-succeeds for no-attack-roll attacks (Flame)', () => {
    assert.match(rfBlock, /rfNoAttackRoll/, 'Flame (no to-hit roll) must auto-confirm RF');
});

test('RF is one event per attack, not one per natural 10 (helpless double-10 → single automatic RF)', () => {
    // Multiple 10s on the base roll must NOT generate multiple RFs — the count only decides auto-vs-confirm.
    assert.match(rfBlock, /let rfPending = rfCount > 0 \? 1 : 0/,
        'rfPending must be capped at 1 (one RF per attack), not initialised to the number of 10s');
});

test('RF does not apply to ship weapons; unarmed triggering-10 counts as 5', () => {
    const scan = src.slice(src.indexOf('const rfApplies'), src.indexOf('const rfToHit ='));
    assert.match(scan, /rfApplies\s*=\s*actionItem\.type\s*!==\s*'shipWeapon'/, 'ship weapons are RF-exempt');
    assert.match(scan, /unarmed\s*&&\s*result\.result === 10\)\s*this\.damage\s*-=\s*5/, 'unarmed damage-die 10 counts as 5 toward base damage');
});
