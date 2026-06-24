// Effect-wiring audit RATCHET (copy to tests/chargen/ at launch).
//
// Backpressure for the effect-wiring loop: validates the SHAPE of every
// ActiveEffect / conditionalBonus the loop authors (a malformed AE here = red gate),
// and asserts each entry the loop claims to have wired actually carries wiring.
//
// As the loop wires an entry it adds the name to WIRED_EXPECTED (with `kind`), or to
// CODE_HANDLED / NARRATIVE when the entry is intentionally NOT given an AE. The lists
// only grow — they encode progress and make regressions a red gate. Correctness of
// the VALUE (and that it reaches the live roll) is canon review + E2E, not this test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PACKS = ['talents', 'traits', 'cybernetics'];

// --- RATCHET LISTS (the loop appends; never remove) -------------------------
// Entries the loop has wired with an AE ('ae') or a conditionalBonus ('cond').
const WIRED_EXPECTED = [
    // { name: 'Paranoia', kind: 'ae' },
    { name: 'Heightened Senses (Sight)', kind: 'cond' },
    { name: 'Heightened Senses (Smell)', kind: 'cond' },
    { name: 'Heightened Senses (Sound)', kind: 'cond' },
    { name: 'Heightened Senses (Taste)', kind: 'cond' },
    { name: 'Heightened Senses (Touch)', kind: 'cond' },
];
// Already applied by name in src/module/rolls/* — must NOT also be AE'd.
const CODE_HANDLED = [
    'Crushing Blow', 'Mighty Shot', 'Blademaster', 'Eye of Vengeance',
    'Hammer Blow', 'Concussive', 'True Grit', 'Deathdealer',
];
// Intentionally text-only (narrative / per-DoS / PF / GM-adjudicated).
const NARRATIVE = [
    // 'Bloodtracker',
];
// ----------------------------------------------------------------------------

function docsOf(pack) {
    const docs = yaml.loadAll(readFileSync(path.join(ROOT, `src/packs/${pack}/${pack}.yml`), 'utf8'));
    return docs.filter((d) => d && typeof d === 'object' && d.name);
}
const ALL = PACKS.flatMap(docsOf);
const byName = new Map(ALL.map((d) => [d.name, d]));

function aeChangeOk(c) {
    return c && typeof c.key === 'string' && c.key.startsWith('system.')
        && Number.isInteger(c.mode) && c.mode >= 0 && c.mode <= 5
        && typeof c.value === 'string';
}
function validateEffects(d, hard) {
    const issues = [];
    for (const e of d.effects ?? []) {
        if (e._id != null && !/^[A-Za-z0-9]{16}$/.test(e._id)) issues.push(`${d.name}: effect _id not 16-char alnum`);
        if (!Array.isArray(e.changes)) { issues.push(`${d.name}: effect.changes not an array`); continue; }
        for (const c of e.changes) if (!aeChangeOk(c)) issues.push(`${d.name}: bad AE change ${JSON.stringify(c)}`);
    }
    const cbs = d.flags?.rt?.conditionalBonuses;
    if (cbs !== undefined) {
        if (!Array.isArray(cbs)) issues.push(`${d.name}: conditionalBonuses not an array`);
        else for (const b of cbs) {
            if (!b.applies || !Array.isArray(b.applies.skills) || !Array.isArray(b.applies.characteristics))
                issues.push(`${d.name}: conditionalBonus.applies malformed`);
            if (typeof b.value !== 'number') issues.push(`${d.name}: conditionalBonus.value not a number`);
        }
    }
    return issues;
}

test('every entry this loop wired actually carries valid wiring', () => {
    for (const { name, kind } of WIRED_EXPECTED) {
        const d = byName.get(name);
        assert.ok(d, `WIRED_EXPECTED "${name}" not found in any pack`);
        const hasAe = (d.effects ?? []).length > 0;
        const hasCond = (d.flags?.rt?.conditionalBonuses ?? []).length > 0;
        assert.ok(hasAe || hasCond, `"${name}" claimed wired but has no effects/conditionalBonuses`);
        if (kind === 'ae') assert.ok(hasAe, `"${name}" expected an ActiveEffect`);
        if (kind === 'cond') assert.ok(hasCond, `"${name}" expected a conditionalBonus`);
        const issues = validateEffects(d, true);
        assert.equal(issues.length, 0, issues.join('\n'));
    }
});

test('no code-handled talent was given an AE/conditionalBonus (double-apply guard)', () => {
    for (const name of CODE_HANDLED) {
        const d = byName.get(name);
        if (!d) continue;
        const hasAe = (d.effects ?? []).length > 0;
        const hasCond = (d.flags?.rt?.conditionalBonuses ?? []).length > 0;
        assert.ok(!hasAe && !hasCond, `code-handled "${name}" must not also be wired (double-apply risk)`);
    }
});

test('all pack effects/conditionalBonuses are well-formed (soft — warns)', () => {
    const all = ALL.flatMap((d) => validateEffects(d, false));
    if (all.length) console.log(`effect-shape warnings (${all.length}):\n  ` + all.join('\n  '));
});
