// NPC skill-advance SCALE regression guard.
//
// The character/NPC sheet stores skill training as a LEVEL INDEX, not a bonus magnitude:
//   0 = Untrained, 1 = Trained (+0), 2 = +10, 3 = +20   (chargen mapping.mjs ADVANCE;
//   the advance <select> in skills-panel.hbs offers exactly "0"/"1"/"2"/"3";
//   acolyte.mjs _skillAdvanceToValue maps 1->+0, 2->+10, 3->+20).
//
// The NPC extraction pipeline originally wrote the raw bonus MAGNITUDE (10/20/30). A value
// the dropdown can't match renders as the first option — "Untrained" — so every trained
// NPC skill looked untrained (and a "+10"/10 skill mis-computed as +20). This guard locks
// every NPC pack skill/speciality `advance` onto the 0..3 index scale so the magnitude
// scale can never creep back in. (build_npcs.py parse_skills now emits indices.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PACKS = path.join(ROOT, 'src/packs');

// Every NPC pack: dirs ending in "-npcs" plus the base "npcs" pack.
function npcPackFiles() {
    return readdirSync(PACKS, { withFileTypes: true })
        .filter((d) => d.isDirectory() && (d.name === 'npcs' || d.name.endsWith('-npcs')))
        .map((d) => path.join(PACKS, d.name, `${d.name}.yml`));
}

const VALID = new Set([-1, 0, 1, 2, 3]); // -1 = treat-as-basic

function collectAdvances(skills) {
    const out = [];
    if (!skills || typeof skills !== 'object') return out;
    for (const [name, skill] of Object.entries(skills)) {
        if (skill && typeof skill === 'object') {
            if ('advance' in skill) out.push([name, skill.advance]);
            if (skill.specialities && typeof skill.specialities === 'object') {
                for (const [spec, s] of Object.entries(skill.specialities)) {
                    if (s && typeof s === 'object' && 'advance' in s) out.push([`${name}.${spec}`, s.advance]);
                }
            }
        }
    }
    return out;
}

test('every NPC pack skill advance is on the 0..3 index scale (never a 10/20/30 magnitude)', () => {
    const offenders = [];
    for (const file of npcPackFiles()) {
        const docs = yaml.loadAll(readFileSync(file, 'utf8'));
        for (const doc of docs) {
            if (!doc || doc.type !== 'npc') continue;
            for (const [skill, adv] of collectAdvances(doc.system?.skills)) {
                if (!VALID.has(adv)) offenders.push(`${path.basename(file)} :: ${doc.name} :: ${skill} = ${adv}`);
            }
        }
    }
    assert.equal(offenders.length, 0,
        `NPC skill advances off the 0..3 index scale:\n  ${offenders.slice(0, 20).join('\n  ')}`
        + (offenders.length > 20 ? `\n  …and ${offenders.length - 20} more` : ''));
});
