import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

// Compendium gear QA gate — structural/data invariants across the item packs, so that content
// imports (0.9.13+ supplement gear) and future edits can't silently ship broken data. The richer,
// informational report (unwired qualities, placeholder descriptions, soft warnings) lives in
// tools/compendium_qa/gear_qa.py; this test enforces only the HARD invariants that would break the
// sheet or the acquisition/damage engine.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ICONS = new Set(readdirSync(join(ROOT, 'src/icons/items/buckets')));
const AVAIL = new Set(['ubiquitous', 'abundant', 'plentiful', 'common', 'average', 'scarce', 'rare',
    'very rare', 'extremely rare', 'near unique', 'unique']);
const DTYPES = new Set(['energy', 'impact', 'explosive', 'rending', '']);

const load = (pack) => yaml.loadAll(readFileSync(join(ROOT, `src/packs/${pack}/${pack}.yml`), 'utf8'))
    .filter(Boolean);

const PACKS = ['weapons', 'armour', 'ammo', 'weapon-mods', 'tools', 'consumables', 'cybernetics'];

test('every gear item has a name and a document type', () => {
    for (const pk of PACKS) for (const d of load(pk)) {
        assert.ok(d.name && String(d.name).trim(), `${pk}: an item is missing a name`);
        assert.ok(d.type, `${pk}/${d.name}: missing document type`);
    }
});

test('every gear item icon resolves to a real bucket icon', () => {
    for (const pk of PACKS) for (const d of load(pk)) {
        const fn = String(d.img ?? '').split('/').pop();
        if (!fn) continue;
        assert.ok(ICONS.has(fn), `${pk}/${d.name}: img "${fn}" not found in src/icons/items/buckets`);
    }
});

test('every gear item has a valid Availability tier (drives the Acquisition Test)', () => {
    for (const pk of PACKS) for (const d of load(pk)) {
        const av = String(d.data?.availability ?? '').toLowerCase();
        if (!av) continue;
        assert.ok(AVAIL.has(av), `${pk}/${d.name}: invalid availability "${d.data.availability}"`);
    }
});

test('every weapon has a valid damageType and numeric penetration/weight', () => {
    for (const d of load('weapons')) {
        assert.ok(DTYPES.has(String(d.data?.damageType ?? '').toLowerCase()),
            `weapons/${d.name}: invalid damageType "${d.data?.damageType}"`);
        assert.equal(typeof d.data?.penetration, 'number', `weapons/${d.name}: penetration not numeric`);
        assert.equal(typeof d.data?.weight, 'number', `weapons/${d.name}: weight not numeric`);
    }
});

test('every armour item has numeric AP for all six locations in range 0-20', () => {
    const LOCS = ['head', 'leftArm', 'rightArm', 'body', 'leftLeg', 'rightLeg'];
    for (const d of load('armour')) {
        const ap = d.data?.armourPoints ?? {};
        for (const loc of LOCS) {
            const v = ap[loc];
            assert.ok(typeof v === 'number' && v >= 0 && v <= 20,
                `armour/${d.name}: AP ${loc}=${v} out of range`);
        }
    }
});
