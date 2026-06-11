// Tests for the origin-path effects interpreter, run against the REAL vendored
// rules data (src/module/chargen/data/*.json) plus synthetic options for
// mechanics the data exercises only in nested positions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
    OriginError,
    STARTING_XP_POOL,
    applyOption,
    availableChoiceOptions,
    buildRegistry,
    computeStartingFate,
    computeStartingWounds,
    illegalityReasons,
    legalOptions,
    optionFromJson,
    speciesReplacesHomeWorld,
    warrantLegalNext,
} from '../../src/module/chargen/origin.mjs';
import { ChargenState } from '../../src/module/chargen/state.mjs';
import { fixedSet } from '../../src/module/chargen/characteristics.mjs';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)),
    '../../src/module/chargen/data');

function loadData(name) {
    return JSON.parse(readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

const REG = buildRegistry({
    home_world: loadData('home_worlds.json'),
    birthright: loadData('birthrights.json'),
    lure_of_the_void: loadData('lure_of_the_void.json'),
    trials_and_travails: loadData('trials_and_travails.json'),
    motivation: loadData('motivations.json'),
    warrant_and_ship: loadData('warrant_and_ship.json'),
    species: loadData('species.json'),
});

function freshState() {
    const s = new ChargenState();
    s.setCharacteristics(fixedSet());
    return s;
}

/* --- basic application ---------------------------------------------------- */

test('Void Born applies char mods, skills, and traits with provenance', () => {
    const s = freshState();
    const pending = applyOption(REG, s, REG.home_world['Void Born']);
    assert.equal(pending.length, 0);
    assert.equal(s.value('S'), 31);   // 36 - 5
    assert.equal(s.value('WP'), 41);  // 36 + 5
    assert.equal(s.skills['Speak Language (Ship Dialect)'], 'trained');
    assert.equal(s.skills['Navigation (Stellar)'], 'basic');
    assert.deepEqual(s.traits.map((t) => t.name).sort(),
        ['Charmed', 'Ill-omened', 'Void Accustomed']);
    assert.equal(s.origin.home_world, 'Void Born');
});

test('char_mod_choice: unresolved -> pending; resolved -> modifier; bad pick throws', () => {
    const s = freshState();
    const scavenger = REG.birthright.Scavenger;
    const pending = applyOption(REG, s, scavenger);
    const cmc = pending.find((p) => p.kind === 'characteristic');
    assert.ok(cmc, 'expected a pending characteristic choice');
    assert.equal(cmc.id, 'scavenger_bonus');

    const s2 = freshState();
    applyOption(REG, s2, scavenger, { scavenger_bonus: cmc.options[0] });
    assert.notEqual(s2.value(cmc.options[0]), 36); // modifier landed

    const s3 = freshState();
    assert.throws(() => applyOption(REG, s3, scavenger, { scavenger_bonus: 'XX' }), /not in/);
});

test('rolled insanity: unresolved -> pendingRoll; resolved roll adds total + bonus', () => {
    const s = freshState();
    applyOption(REG, s, REG.trials_and_travails['Dark Voyage']);
    const pr = s.pendingRolls.find((r) => r.id === 'dark_voyage_insanity');
    assert.ok(pr, 'expected pending insanity roll');
    assert.equal(pr.kind, 'insanity');
    assert.equal(s.insanity, 0);

    const s2 = freshState();
    applyOption(REG, s2, REG.trials_and_travails['Dark Voyage'], {}, { dark_voyage_insanity: 4 });
    assert.equal(s2.insanity, 4 + (pr.bonus ?? 0));
    assert.equal(s2.pendingRolls.length, 0);
});

/* --- ItS legality --------------------------------------------------------- */

test('ItS xp_cost: debited against the 500 pool; overspend is illegal and throws', () => {
    const s = freshState();
    const opt = REG.lure_of_the_void['Crusade — Warrior']; // xp_cost 250
    assert.equal(opt.xpCost, 250);
    applyOption(REG, s, opt);
    assert.equal(s.originXpSpent, 250);
    assert.deepEqual(s.originXpCharges[0],
        { step: 'lure_of_the_void', option: 'Crusade — Warrior', cost: 250 });

    // A second 300-cost pick would project 550 > 500: reported and blocked.
    const expensive = REG.motivation['Knowledge — Knowledge is Power']; // 300
    const reasons = illegalityReasons(REG, s, expensive);
    assert.ok(reasons.some((r) => /exceed/.test(r)), reasons.join('; '));
    assert.throws(() => applyOption(REG, s, expensive), OriginError);
    assert.equal(s.originXpSpent, 250); // unchanged after the failed apply
});

test('requires {species: Human}: ItS home worlds are illegal for Kroot', () => {
    const s = freshState();
    s.species = 'Kroot';
    assert.equal(speciesReplacesHomeWorld(REG, s), true);
    // Kroot replace the Home World step entirely — no home world is legal.
    assert.deepEqual(legalOptions(REG, s, 'home_world'), {});
    // Human (default) sees both Core and ItS home worlds.
    const human = freshState();
    const legal = legalOptions(REG, human, 'home_world');
    assert.ok(legal['Void Born']);
    assert.ok(legal['Frontier World']);
});

test('distinct_group: picking the same label twice throws', () => {
    const s = freshState();
    const opt = REG.trials_and_travails['Lost Worlds — Beyond the Pale'];
    const groups = opt.effects.filter((e) => e.type === 'choice' && e.distinct_group);
    assert.ok(groups.length >= 2, 'fixture expects a 2+ choice distinct group');
    const [a, b] = groups;
    const label = a.options.map((o) => o.label).find((l) => b.options.some((o) => o.label === l));
    assert.ok(label, 'expected overlapping labels');
    assert.throws(
        () => applyOption(REG, s, opt, { [a.id]: label, [b.id]: label },
            { beyond_the_pale_insanity: 3, beyond_the_pale_corruption: 3 }),
        /distinct group/);
});

test('availableChoiceOptions excludes labels taken by distinct siblings', () => {
    const s = freshState();
    const opt = REG.trials_and_travails['Lost Worlds — Beyond the Pale'];
    const [a, b] = opt.effects.filter((e) => e.type === 'choice' && e.distinct_group);
    const label = a.options[0].label;
    const remaining = availableChoiceOptions(REG, s, b.id, { [a.id]: label }, { option: opt });
    assert.ok(!remaining.includes(label));
});

/* --- Warrant & Ship chart ------------------------------------------------- */

test('warrant adjacency: top row open, clamp rows, funnel extremes', () => {
    assert.equal(warrantLegalNext(REG, {}, 'warrant_age'), null);
    // Equal-width clamp from col 0:
    assert.deepEqual(
        warrantLegalNext(REG, { warrant_age: 'The Waning' }, 'fortune_and_fate'),
        ['Ascending', 'Rising Star']);
    // Funnel: Exile -> single sanction child (ItS p.34 worked example).
    assert.deepEqual(
        warrantLegalNext(REG, { acquisition: 'Exile' }, 'sanction'),
        ['Halo Artefacts']);
    // Funnel: Battlefleet -> Famous only.
    assert.deepEqual(
        warrantLegalNext(REG, { contacts: 'Battlefleet' }, 'warrant_renown'),
        ['Famous']);
    // Expansion: Fallen from Grace reaches Reward.
    assert.ok(warrantLegalNext(REG, { fortune_and_fate: 'Fallen from Grace' }, 'acquisition')
        .includes('Reward'));
});

test('warrant path applies PF + SP from resolved category picks; off-chart pick throws', () => {
    const s = freshState();
    const opt = REG.warrant_and_ship['The Ship and Warrant Path'];
    const choices = {
        warrant_age: 'The Age of Rebirth',     // PF 10, SP 12
        fortune_and_fate: 'Fallen from Grace', // adjacent to col 4
    };
    applyOption(REG, s, opt, choices);
    assert.ok(s.profitFactor > 0);
    assert.ok(s.shipPointsContributed > 0);
    // 4 unresolved category rows remain pending.
    assert.equal(s.pendingChoices.length, 4);

    const s2 = freshState();
    assert.throws(
        () => applyOption(REG, s2, opt,
            { warrant_age: 'The Waning', fortune_and_fate: 'Fallen from Grace' }),
        /chart-adjacent/);
});

/* --- synthetic options: condition, substitute, origin_xp_cost ------------- */

test('grant_talent condition gates on current characteristic value', () => {
    const opt = optionFromJson('motivation', {
        name: 'Synthetic Devotion',
        effects: [
            { type: 'char_mod', char: 'WP', amount: 5 },
            { type: 'grant_talent', talent: 'Armour of Contempt', condition: { char: 'WP', min: 40 } },
        ],
    });
    const s = freshState(); // WP 36 -> +5 = 41 >= 40: granted
    applyOption(REG, s, opt);
    assert.ok(s.talents.includes('Armour of Contempt'));

    const s2 = freshState();
    s2.characteristics.base.WP = 30; // 30 + 5 = 35 < 40: not granted, logged
    applyOption(REG, s2, opt);
    assert.ok(!s2.talents.includes('Armour of Contempt'));
    assert.ok(s2.log.some((l) => /not granted/.test(l)));
});

test('substitute removes an earlier grant and applies the replacement', () => {
    const s = freshState();
    s.grantSkill('Awareness', 'trained', 'Earlier Step');
    const opt = optionFromJson('trials_and_travails', {
        name: 'Synthetic Swap',
        effects: [{
            type: 'substitute',
            target: { kind: 'skill', name: 'Awareness' },
            replacement: { type: 'grant_skill', skill: 'Scrutiny', level: 'trained' },
        }],
    });
    applyOption(REG, s, opt);
    assert.ok(!('Awareness' in s.skills));
    assert.equal(s.skills.Scrutiny, 'trained');

    // Absent target is a logged no-op, replacement still applies.
    const s2 = freshState();
    applyOption(REG, s2, opt);
    assert.ok(s2.log.some((l) => /no-op/.test(l)));
    assert.equal(s2.skills.Scrutiny, 'trained');
});

test('origin_xp_cost add-on nested in a choice debits the pool and blocks overspend', () => {
    const opt = optionFromJson('birthright', {
        name: 'Synthetic Add-on',
        effects: [{
            type: 'choice',
            id: 'addon',
            options: [
                { label: 'Take it', effects: [{ type: 'origin_xp_cost', amount: 200 }] },
                { label: 'Skip', effects: [] },
            ],
        }],
    });
    const s = freshState();
    applyOption(REG, s, opt, { addon: 'Take it' });
    assert.equal(s.originXpSpent, 200);

    const s2 = freshState();
    s2.originXpSpent = STARTING_XP_POOL - 100;
    assert.throws(() => applyOption(REG, s2, opt, { addon: 'Take it' }), OriginError);
});

/* --- wounds / fate -------------------------------------------------------- */

test('computeStartingWounds: TB×mult + dice + flat, manual roll wins', () => {
    const voidBorn = REG.home_world['Void Born'];
    // TB 3, mult 2, manual 1d5 roll of 4, flat 0 -> 10
    assert.equal(computeStartingWounds(voidBorn.startingWounds, 3, { roll: 4 }), 10);
    // App roll via injected dice
    assert.equal(computeStartingWounds(voidBorn.startingWounds, 3, { dice: () => [5] }), 11);
    // Kroot species record has flat 3
    const kroot = REG.species.Kroot;
    assert.equal(computeStartingWounds(kroot.starting_wounds, 4, { roll: 2 }), 13);
});

test('computeStartingFate: d10 threshold table, manual roll wins', () => {
    const table = REG.home_world['Void Born'].startingFate; // [[5,3],[10,4]]
    assert.equal(computeStartingFate(table, { roll: 5 }), 3);
    assert.equal(computeStartingFate(table, { roll: 6 }), 4);
    assert.equal(computeStartingFate(table, { dice: () => [1] }), 3);
});

/* --- replay determinism ---------------------------------------------------- */

test('same inputs replay to an identical state (persistence model)', () => {
    const build = () => {
        const s = freshState();
        applyOption(REG, s, REG.home_world['Void Born']);
        applyOption(REG, s, REG.birthright.Stubjack,
            { stubjack_bonus: 'WS' }, { stubjack_insanity: 3 });
        return s.toJSON();
    };
    assert.deepEqual(build(), build());
});
