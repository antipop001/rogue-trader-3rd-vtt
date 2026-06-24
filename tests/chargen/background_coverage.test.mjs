// Background-automation coverage RATCHET (BG initiative).
//
// The Origin-Path data (src/module/chargen/data/*.json) grants traits and talents
// by name. Each one should resolve to a REAL compendium item so it commits as a
// proper, automated item instead of a name-only stub (see specs/04). This test
// counts how many granted names resolve against the packs and asserts the count
// never drops below a floor. The Ralph loop BUMPS the floor as it authors each
// group — the floor encodes progress and makes regressions a red gate.
//
// Goal state: TRAIT_RESOLVED_FLOOR === total granted traits, likewise talents.
//
// >>> When you author a background group, raise the matching *_RESOLVED_FLOOR by
// >>> exactly the number of names your group newly resolves. Do not lower a floor.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA_DIR = path.join(ROOT, 'src/module/chargen/data');

// --- RATCHET FLOORS (the loop raises these) ---------------------------------
const TRAIT_RESOLVED_FLOOR = 17;   // of 103 granted; goal 103
const TALENT_RESOLVED_FLOOR = 79;  // of 79 granted;  goal 79
// ----------------------------------------------------------------------------

/** Strip a trailing "(...)" so e.g. "Peer (Underworld)" matches a pickable base "Peer". */
const baseName = (n) => n.replace(/\s*\([^()]*\)\s*$/, '').trim();

function packNames(rel) {
    const docs = yaml.loadAll(readFileSync(path.join(ROOT, rel), 'utf8'));
    return new Set(docs.filter(Boolean).map((d) => d.name).filter(Boolean));
}

/** Collect granted names of a given effect kind across every origin data file. */
function grantedNames({ type, key }) {
    const names = new Set();
    const walk = (o) => {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === 'object') {
            if (o.type === type && o[key]) names.add(o[key]);
            Object.values(o).forEach(walk);
        }
    };
    for (const f of readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) {
        walk(JSON.parse(readFileSync(path.join(DATA_DIR, f), 'utf8')));
    }
    return names;
}

function resolved(granted, pack) {
    const hit = [], miss = [];
    for (const n of granted) {
        (pack.has(n) || pack.has(baseName(n)) ? hit : miss).push(n);
    }
    return { hit, miss };
}

test('background traits resolve to the traits compendium (ratchet)', () => {
    const granted = grantedNames({ type: 'trait', key: 'name' });
    const { hit, miss } = resolved(granted, packNames('src/packs/traits/traits.yml'));
    if (miss.length) console.log(`traits still stubbing (${miss.length}):\n  ` + miss.sort().join('\n  '));
    assert.ok(
        hit.length >= TRAIT_RESOLVED_FLOOR,
        `resolved trait count ${hit.length} dropped below floor ${TRAIT_RESOLVED_FLOOR}`,
    );
});

test('granted talents resolve to the talents compendium (ratchet)', () => {
    const granted = grantedNames({ type: 'grant_talent', key: 'talent' });
    const { hit, miss } = resolved(granted, packNames('src/packs/talents/talents.yml'));
    if (miss.length) console.log(`talents still stubbing (${miss.length}):\n  ` + miss.sort().join('\n  '));
    assert.ok(
        hit.length >= TALENT_RESOLVED_FLOOR,
        `resolved talent count ${hit.length} dropped below floor ${TALENT_RESOLVED_FLOOR}`,
    );
});
