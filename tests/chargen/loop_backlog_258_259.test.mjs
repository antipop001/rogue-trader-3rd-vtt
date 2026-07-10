import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Loop backlog BUG-Q-258 + BUG-Q-259 (damage-data.mjs / assign-damage-data.mjs aren't
// node-importable — Foundry globals at load — so these are source-level invariants).
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dmg = readFileSync(join(root, 'src', 'module', 'rolls', 'damage-data.mjs'), 'utf8');
const asn = readFileSync(join(root, 'src', 'module', 'rolls', 'assign-damage-data.mjs'), 'utf8');

test('BUG-Q-258: a bare unarmed strike counts as Primitive (RT Core p.142)', () => {
    // Primitive must fall back to the unarmed profile, not require the explicit attack-special.
    assert.match(dmg, /hasAttackSpecial\('Primitive'\)\s*\n?\s*\|\|\s*\(unarmed && unarmed\.primitive !== false\)/,
        'this.primitive must be true for an unarmed strike whose profile is not primitive:false');
    // Unarmed Master / INW (unarmed.primitive === false) still clears it.
    assert.match(dmg, /!\(unarmed && unarmed\.primitive === false\)/,
        'Unarmed Master / Improved Natural Weapons must still clear Primitive');
});

test('BUG-Q-259: Scatter at Long/Extreme range doubles Armour automatically, not as a manual note', () => {
    assert.match(dmg, /scatterLongRange = false;/, 'Hit must carry a scatterLongRange flag');
    assert.match(dmg, /this\.scatterLongRange = true;/, 'the Scatter Long/Extreme block must set the flag');
    // All three defender armour layers double INDEPENDENTLY for Primitive and scatterLongRange
    // (two separate RT Core p.116 "doubled" rules, no "does not stack" clause → ×4 if both).
    assert.match(asn, /if \(this\.hit\.scatterLongRange\) facing \*= 2;/, 'vehicle facing armour doubles for scatterLongRange');
    assert.match(asn, /if \(this\.hit\.scatterLongRange\) effCoverAp \*= 2;/, 'cover AP doubles for scatterLongRange');
    assert.match(asn, /if \(this\.hit\.scatterLongRange\) usableArmour \*= 2;/, 'worn armour doubles for scatterLongRange');
    // Primitive worn-armour doubling keeps its Primitive-armour exception (independent of Scatter).
    assert.match(asn, /if \(this\.hit\.primitive && !this\._armourIsPrimitive\(\)\) usableArmour \*= 2;/,
        'Primitive worn-armour doubling retains the Primitive-armour exception');
});
