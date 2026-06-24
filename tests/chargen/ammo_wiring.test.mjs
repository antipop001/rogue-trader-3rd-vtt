// Ammo-wiring regression guard (WIRE-AMMO-NAME-SYNC).
//
// The ammo bonus path (src/module/rules/ammo.mjs) selects the loaded round via
// `weapon.items.find(i => i.isAmmunition)` (type === 'ammunition') and then branches on
// `ammo.name` in a series of switch statements. If a `case '<name>'` string drifts from
// the pack `name:` — or the pack entry is filed under the wrong `type:` (e.g.
// `weaponModification`, which is NOT `isAmmunition`) — the case silently never fires and
// the ammo effect is inert. That was the bug this guard locks down: every ammo `case`
// in ammo.mjs must resolve to a real `ammunition`-typed entry in the ammo pack.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function ammoDocs() {
    const docs = yaml.loadAll(readFileSync(path.join(ROOT, 'src/packs/ammo/ammo.yml'), 'utf8'));
    return docs.filter((d) => d && typeof d === 'object' && d.name);
}

// Pull every `case '<text>':` string out of ammo.mjs.
function ammoCaseNames() {
    const src = readFileSync(path.join(ROOT, 'src/module/rules/ammo.mjs'), 'utf8');
    const names = new Set();
    for (const m of src.matchAll(/case\s+'([^']+)'\s*:/g)) names.add(m[1]);
    return [...names];
}

test('every ammo.mjs case name resolves to an ammunition-typed pack entry', () => {
    const byName = new Map(ammoDocs().map((d) => [d.name, d]));
    for (const name of ammoCaseNames()) {
        const d = byName.get(name);
        assert.ok(d, `ammo.mjs switches on "${name}" but no ammo-pack entry has that exact name`);
        assert.equal(d.type, 'ammunition',
            `ammo.mjs handles "${name}" but the pack entry is type "${d.type}" (not 'ammunition') — isAmmunition would never match it`);
    }
});

test('the formerly-mis-typed special rounds are now ammunition-typed', () => {
    // These six shipped as type: weaponModification, so isAmmunition never selected them
    // and their already-written ammo.mjs effects were dead. They must be ammunition now.
    const byName = new Map(ammoDocs().map((d) => [d.name, d]));
    const moved = ['Amputator Shells', 'Bleeder Rounds', 'Dumdum Bullets', 'Expander Rounds',
        'Explosive Arrows and Quarrels', 'Hot-Shot Charge Pack'];
    for (const name of moved) {
        const d = byName.get(name);
        assert.ok(d, `"${name}" should now live in the ammo pack`);
        assert.equal(d.type, 'ammunition', `"${name}" must be type ammunition`);
    }
});
