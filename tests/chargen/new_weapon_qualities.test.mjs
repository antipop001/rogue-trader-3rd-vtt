import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Regression guard for the supplement weapon qualities wired in 0.9.19. The roll classes aren't
// node-importable (Foundry globals at load), so these are source-level invariants; the behaviour
// itself is live-verified on rt-smoke. These camelCase `system.special` flags don't survive the
// capitalize()->attack-specials-pack match in item._getAttackSpecials, so they're read directly.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dmg = readFileSync(join(ROOT, 'src/module/rolls/damage-data.mjs'), 'utf8');
const roll = readFileSync(join(ROOT, 'src/module/rolls/roll-data.mjs'), 'utf8');

test('Cleansing Fire is wired (Willpower test -> on fire, +1d10 with Flame)', () => {
    assert.match(dmg, /wSpecial\.cleansingFire/, 'must read the cleansingFire flag directly');
    assert.match(dmg, /Cleansing Fire[\s\S]{0,120}Willpower Test/, 'must post the WP-test-or-catch-fire effect');
    assert.match(dmg, /wSpecial\.flame[\s\S]{0,160}1d10 Energy Damage/, 'Flame rider adds +1d10 ignoring armour/TB');
    assert.match(dmg, /addEffect\('Cleansing Fire'[\s\S]{0,220}\['onFire'\]/, 'applies the On Fire condition button');
});

test('Stun quality is wired (Toughness test -> Stunned)', () => {
    assert.match(dmg, /wSpecial\.stun/, 'must read the stun flag directly');
    assert.match(dmg, /addEffect\('Stun'[\s\S]{0,160}\['stunned'\]/, 'applies the Stunned condition button');
});

test('Overcharge (X) is surfaced (+X damage, gains Overheats — optional per shot)', () => {
    assert.match(dmg, /wSpecial\.overcharge/, 'must read the overcharge flag');
    assert.match(dmg, /Overcharge[\s\S]{0,160}Overheats Quality/, 'must note the +X / Overheats trade-off');
});

test('Gyro-Stabilised reduces the unbraced-Heavy penalty to -20', () => {
    assert.match(roll, /system\?\.special\?\.gyroStabilised/, 'must read the gyroStabilised flag');
    assert.match(roll, /gyroStabilised\s*\?\s*-20\s*:\s*-30/, 'unbraced Heavy penalty is -20 with gyro, else -30');
});
