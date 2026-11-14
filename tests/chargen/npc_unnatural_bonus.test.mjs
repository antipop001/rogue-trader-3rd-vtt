// NPC Unnatural Characteristic data (0.9.29). RT stat blocks print "(10) 52" — the
// parenthesised figure is the TOTAL bonus after the Unnatural multiplier (RT Core p.368).
// The pipeline stored that printed total in `characteristics.<c>.unnatural`, which the
// engine reads as the EXTRA on top of the raw bonus, so every such NPC came out at
// raw + total (Kabalite Warrior AgB/Initiative 15 instead of 10). The packs were converted
// by tools/npc_pipeline/fix_unnatural_bonus.py; these tests pin the result by running the
// engine's own bonus/initiative helpers over the shipped pack YAML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import {
    unnaturalExtra, unnaturalCharacteristicMultipliers, unnaturalMultiplierFromBaked, initiativeCharBonus,
} from '../../src/module/rolls/roll-helpers.mjs';

const LABEL = {
    weaponSkill: 'weapon skill', ballisticSkill: 'ballistic skill', strength: 'strength',
    toughness: 'toughness', agility: 'agility', intelligence: 'intelligence',
    perception: 'perception', willpower: 'willpower', fellowship: 'fellowship',
};

const actors = [];
for (const dir of fs.readdirSync('src/packs').filter((d) => d.includes('npcs'))) {
    const f = `src/packs/${dir}/${dir}.yml`;
    if (!fs.existsSync(f)) continue;
    for (const d of yaml.loadAll(fs.readFileSync(f, 'utf8'))) {
        if (d?.system?.characteristics) actors.push({ pack: dir, doc: d });
    }
}

// Mirror of acolyte._computeCharacteristics for an NPC with no advances/modifiers.
function bonuses(doc) {
    const mults = unnaturalCharacteristicMultipliers((doc.items ?? []).filter((i) => i.type === 'trait'));
    const out = {};
    for (const [k, c] of Object.entries(doc.system.characteristics)) {
        const raw = Math.floor((c.base ?? 0) / 10);
        const un = unnaturalExtra(mults[LABEL[k]], Number(c.unnatural) || 0, raw, raw);
        out[k] = { raw, unnatural: un, bonus: raw + un, traitMult: mults[LABEL[k]] };
    }
    return out;
}
function find(pack, name) {
    const a = actors.find((x) => x.pack === pack && x.doc.name === name);
    assert.ok(a, `${pack} :: ${name} present`);
    return a.doc;
}
function initiative(doc) {
    const b = bonuses(doc).agility;
    const hasLR = (doc.items ?? []).some((i) => i.type === 'talent' && i.name === 'Lightning Reflexes');
    const mult = Math.max(b.traitMult ?? 1, unnaturalMultiplierFromBaked(b.bonus, b.unnatural));
    return initiativeCharBonus(b.raw, b.bonus, hasLR, mult);
}

test('Eldar: printed Unnatural bonus is reproduced exactly (not raw + printed)', () => {
    const cases = [
        ['thesoulreaver-npcs', 'Kabalite Warrior', 'agility', 10],
        ['thesoulreaver-npcs', 'Archon Salaine Morn', 'agility', 18],
        ['thekoronusbestiary-npcs', 'Fire Dragon', 'agility', 10],
        ['thekoronusbestiary-npcs', 'Howling Banshee', 'agility', 10],
        ['thekoronusbestiary-npcs', 'Dark Reaper', 'agility', 10],
        ['thekoronusbestiary-npcs', 'Wraithguard', 'strength', 10],
        ['thekoronusbestiary-npcs', 'Wraithguard', 'toughness', 12],
        ['thekoronusbestiary-npcs', 'Wraithlord', 'strength', 16],
        ['thekoronusbestiary-npcs', 'Wraithlord', 'toughness', 16], // Errata v1.4
        ['thekoronusbestiary-npcs', 'Warp Spider', 'agility', 10],
        ['lureoftheexpanse-npcs', 'Farseer Serrenon', 'agility', 10],
        ['lureoftheexpanse-npcs', 'Farseer Serrenon', 'willpower', 10],
        ['lureoftheexpanse-npcs', 'Pathfinder', 'agility', 10],
        ['lureoftheexpanse-npcs', 'Wraithguard', 'strength', 10],
        ['lureoftheexpanse-npcs', 'Wraithguard', 'toughness', 12],
        ['lureoftheexpanse-npcs', 'Wraithguard', 'agility', 6],
        ['fallensuns-npcs', 'Farseer Caille', 'agility', 10],
        ['fallensuns-npcs', 'Farseer Caille', 'willpower', 10],
        ['fallensuns-npcs', 'Badb Ra', 'agility', 10],
        ['thenavisprimer-npcs', 'Eldar Farseer', 'willpower', 10],
        ['corebook-npcs', 'Eldar Corsair', 'agility', 10],
    ];
    for (const [pack, name, ch, want] of cases) {
        assert.equal(bonuses(find(pack, name))[ch].bonus, want, `${name} ${ch} bonus`);
    }
});

test('Eldar: OCR-dropped characteristics restored (base no longer the bonus figure)', () => {
    assert.equal(find('lureoftheexpanse-npcs', 'Farseer Serrenon').system.characteristics.agility.base, 57);
    assert.equal(find('lureoftheexpanse-npcs', 'Farseer Serrenon').system.characteristics.willpower.base, 59);
    assert.equal(find('lureoftheexpanse-npcs', 'Wraithguard').system.characteristics.strength.base, 50);
    assert.equal(find('thekoronusbestiary-npcs', 'Wraithguard').system.characteristics.toughness.base, 60);
    assert.equal(find('thekoronusbestiary-npcs', 'Dark Reaper').system.characteristics.agility.base, 50);
});

test('Initiative bonus off the corrected AgB (with and without Lightning Reflexes)', () => {
    // No Lightning Reflexes: Initiative bonus = printed AgB.
    assert.equal(initiative(find('lureoftheexpanse-npcs', 'Farseer Serrenon')), 10);
    assert.equal(initiative(find('thekoronusbestiary-npcs', 'Fire Dragon')), 10);
    // Lightning Reflexes on Unnatural Agility (xN) = raw AgB × (N+1) (BUG-Q-188 reading):
    // Kabalite 5×3 = 15 (was 20 when the printed total was read as an extra → ×3+1),
    // Archon (x3) 6×4 = 24 (was 30).
    assert.equal(initiative(find('thesoulreaver-npcs', 'Kabalite Warrior')), 15);
    assert.equal(initiative(find('thesoulreaver-npcs', 'Archon Salaine Morn')), 24);
});

test('every NPC with an Unnatural (xN) trait and a pre-baked extra matches raw × N', () => {
    // A double-applied conversion or an unfixed OCR fragment surfaces here. Allowlisted:
    // book-printed bonuses that genuinely differ from raw × N (printed verbatim on purpose).
    const PRINTED_MISPRINT = new Set([
        'starsofinequity-npcs :: Gretchin Headhunter toughness', // printed "T (8) 19"
        'fallensuns-npcs :: Chaos Space Marine strength', // printed "S (12) 55" (power armour)
        'thekoronusbestiary-npcs :: Kaptin strength', // printed "S (13) 60"
    ]);
    const bad = [];
    for (const { pack, doc } of actors) {
        for (const [k, b] of Object.entries(bonuses(doc))) {
            const baked = Number(doc.system.characteristics[k].unnatural) || 0;
            if (!b.traitMult || baked <= 0 || b.raw <= 0) continue;
            if (PRINTED_MISPRINT.has(`${pack} :: ${doc.name} ${k}`)) continue;
            if (b.bonus !== b.raw * b.traitMult) bad.push(`${pack} :: ${doc.name} ${k} bonus ${b.bonus} ≠ ${b.raw}×${b.traitMult}`);
        }
    }
    assert.deepEqual(bad, []);
});

test('no NPC characteristic is outside 0..100 (OCR concatenation guard, e.g. Ag 1052)', () => {
    const bad = [];
    for (const { pack, doc } of actors) {
        for (const [k, c] of Object.entries(doc.system.characteristics)) {
            if (!(c.base >= 0 && c.base <= 100)) bad.push(`${pack} :: ${doc.name} ${k} ${c.base}`);
        }
    }
    assert.deepEqual(bad, []);
});

test('Daemonic NPCs without Unnatural Toughness carry no baked toughness extra (no double soak)', () => {
    // RT Core p.364: Daemonic doubles TB "against all damage" — applied by the engine at soak
    // (daemonicToughnessMultiplier). Stat blocks print that doubled soak TB as "(8)" above T,
    // so a baked extra would double it twice (Flesh Hound TB 16, should be 8).
    const daemonic = (n) => /^\s*daemonic\s*(\(|$)/i.test(n);
    const bad = [];
    for (const { pack, doc } of actors) {
        const traits = (doc.items ?? []).filter((i) => i.type === 'trait').map((i) => i.name);
        if (!traits.some(daemonic) || traits.some((n) => /^\s*unnatural\s+toughness\b/i.test(n))) continue;
        if ((Number(doc.system.characteristics.toughness?.unnatural) || 0) > 0) bad.push(`${pack} :: ${doc.name}`);
    }
    assert.deepEqual(bad, []);
    // Spot check: Flesh Hound of Khorne T 40 → TB 4 (doubled to 8 at soak by the engine).
    // (The Koronus copy has no trait items at all — extraction lost its Traits line — so it
    // keeps the baked TB 8 and soaks correctly without Daemonic; tracked separately.)
    const fh = bonuses(find('citadelofskulls-npcs', 'Flesh Hound of Khorne'));
    assert.equal(fh.toughness.bonus, 4);
});
