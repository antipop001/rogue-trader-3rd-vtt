/**
 * Chargen — commit a ChargenState onto an acolyte Actor.
 *
 * Pure planning functions (`buildActorData`, `buildSkillData`, `planItems`)
 * are node-testable; the Foundry-side wrappers (`createActor`, `applyToActor`,
 * `collectItems`) touch document APIs and compendia.
 *
 * Mapping decisions follow the validated RTT_MAKER exporter
 * (`rogue_trader/export/foundry.py`), with two deliberate upgrades:
 *  - characteristics use the real base/modifier split;
 *  - the legacy free-text `bio.homeWorld` is NEVER written — it was a DH2-fork
 *    field whose background-effects pipeline has since been removed; the Origin
 *    Path panel is the sole home-world record, so writing it serves no purpose.
 * Unmappable skills/talents are surfaced in bio notes — never silently dropped.
 */

import { ABBRS } from './characteristics.mjs';
import {
    ADVANCE,
    CAREER_LABEL,
    CHAR_KEY,
    TALENT_ALIAS,
    resolveSkill,
} from './mapping.mjs';
import { TOTAL_STARTING_XP, PRESPENT_STARTING_XP } from './origin.mjs';

const ORIGIN_STEP_KEY = {
    home_world: 'homeWorld',
    birthright: 'birthright',
    lure_of_the_void: 'lureOfTheVoid',
    trials_and_travails: 'trialsAndTravails',
    motivation: 'motivation',
    // warrant_and_ship has no originPath slot; recorded in bio notes.
};

/* ------------------------------------------------------------------------ */
/*  Pure planning                                                            */
/* ------------------------------------------------------------------------ */

/** Map engine skills onto system.skills updates. Returns gaps, never drops. */
export function buildSkillData(state) {
    const skills = {};
    const unmapped = [];
    const unresolvedSpecialities = [];
    for (const [name, level] of Object.entries(state.skills)) {
        const advance = ADVANCE[level] ?? 0;
        const r = resolveSkill(name);
        if (!r) {
            unmapped.push(name);
            continue;
        }
        if (r.speciality) {
            skills[r.key] ??= {};
            skills[r.key].specialities ??= {};
            skills[r.key].specialities[r.speciality] = { advance, taken: true };
        } else if (r.unresolvedSpeciality !== undefined) {
            unresolvedSpecialities.push({ name, speciality: r.unresolvedSpeciality });
        } else {
            skills[r.key] = { ...(skills[r.key] ?? {}), advance };
        }
    }
    return { skills, unmapped, unresolvedSpecialities };
}

const PAREN_RE = /^(.+?)\s*\(([^)]*)\)\s*$/;
const CHOOSE_RE = /^choose\b/i;

/**
 * Plan embedded Item documents for granted talents and traits.
 *
 * `talentIndex`/`traitIndex` map compendium item name -> plain doc data
 * (`doc.toObject()`); pure so tests can feed fixtures. Resolution order for a
 * talent: exact name → alias → pickable base + pre-set choice ("(choose one)"
 * stays unset so the existing createItem hook prompts) → stub item (gap).
 * Traits: exact name → stub carrying the origin rules text.
 */
export function planItems(state, { talentIndex = {}, traitIndex = {} } = {}) {
    const items = [];
    const gaps = { talents: [], traits: [] };

    for (const name of state.talents) {
        const resolvedName = TALENT_ALIAS[name] ?? name;
        const exact = talentIndex[resolvedName];
        if (exact) {
            items.push(foundryClone(exact));
            continue;
        }
        const m = PAREN_RE.exec(resolvedName);
        const base = m ? talentIndex[m[1].trim()] : null;
        const pickable = base?.flags?.rt?.pickable;
        if (base && pickable) {
            const doc = foundryClone(base);
            const spec = m[2].trim();
            if (!CHOOSE_RE.test(spec)) {
                // Concrete pick from the origin data: stamp it like the
                // createItem hook would, so the user isn't re-prompted.
                doc.name = `${base.name} (${spec})`;
                doc.system = { ...(doc.system ?? {}), choice: spec };
            }
            items.push(doc);
            continue;
        }
        gaps.talents.push(name);
        items.push({
            name,
            type: 'talent',
            img: 'systems/rogue-trader-3rd/icons/talents/blue/b_18.png',
            system: {
                benefit: 'Granted by the origin path (no compendium entry — see source).',
                source: 'Chargen',
                cost: 0,
                tier: '1',
                aptitudes: '',
                prerequisites: '',
            },
        });
    }

    for (const trait of state.traits) {
        const exact = traitIndex[trait.name];
        if (exact) {
            items.push(foundryClone(exact));
            continue;
        }
        gaps.traits.push(trait.name);
        items.push({
            name: trait.name,
            type: 'trait',
            img: 'icons/svg/item-bag.svg',
            system: {
                description: trait.text ?? '',
                source: trait.source ?? '',
                level: 0,
                hasLevel: false,
            },
        });
    }
    return { items, gaps };
}

function foundryClone(docData) {
    const c = JSON.parse(JSON.stringify(docData));
    delete c._id;
    return c;
}

/**
 * Build the `system` + top-level update data for an actor from the state.
 * @param {object} opts.originLabels  optional {originPathKey: [labels]} from
 *   CONFIG.rt.originPath, used to align stored values with the sheet dropdowns.
 * @param {object} opts.itemGaps  gaps from planItems, folded into bio notes.
 */
export function buildActorData(state, { originLabels = null, itemGaps = null } = {}) {
    const system = { characteristics: {} };
    for (const abbr of ABBRS) {
        const key = CHAR_KEY[abbr];
        let modifier = 0;
        for (const m of state.modifiers) if (m.char === abbr) modifier += m.amount;
        system.characteristics[key] = {
            base: state.characteristics.base[abbr] ?? 0,
            modifier,
        };
    }

    const notesExtra = [];

    // Skills (+ gaps).
    const skillData = buildSkillData(state);
    if (Object.keys(skillData.skills).length) system.skills = skillData.skills;
    for (const name of skillData.unmapped) {
        notesExtra.push(`Unmapped skill: ${name}`);
    }
    for (const u of skillData.unresolvedSpecialities) {
        notesExtra.push(`Skill speciality to resolve: ${u.name}`);
    }

    // Origin path -> bio.originPath (labels; legacy bio.homeWorld deliberately untouched).
    const originPath = {};
    for (const [step, subKey] of Object.entries(ORIGIN_STEP_KEY)) {
        const value = state.origin[step];
        if (!value) continue;
        originPath[subKey] = {
            value: alignLabel(value, originLabels?.[subKey]),
            notes: state.originNotes[step] ?? '',
        };
    }
    if (state.career) {
        originPath.career = {
            value: CAREER_LABEL[state.career] ?? state.career,
            notes: state.originNotes.career ?? '',
        };
    }
    if (Object.keys(originPath).length) {
        system.bio = { originPath };
    }

    if (state.origin.warrant_and_ship) {
        const picks = state.originNotes.warrant_and_ship;
        notesExtra.push(`Warrant & Ship: ${picks || state.origin.warrant_and_ship}`);
    }
    if (state.species) notesExtra.push(`Species: ${state.species}`);
    if (state.profitFactor) notesExtra.push(`Profit Factor contribution (dynasty): ${state.profitFactor}`);
    if (state.shipPointsContributed) notesExtra.push(`Ship Points contribution (dynasty): ${state.shipPointsContributed}`);
    if (itemGaps?.talents?.length) notesExtra.push(`Talents without compendium entry: ${itemGaps.talents.join(', ')}`);

    if (notesExtra.length) {
        system.bio = system.bio ?? {};
        system.bio.notes = notesExtra.join('\n');
    }

    // Wounds / Fate: the wizard stores FINAL totals (incl. Endurance wound
    // bonus and fate adjustment) once rolled/entered. Wounds go to `base` (the
    // rolled starting value); Max is derived = base + talent/effect modifiers.
    if (state.wounds !== null && state.wounds !== undefined) {
        system.wounds = { base: state.wounds, value: state.wounds, rolled: true };
    }
    if (state.fate !== null && state.fate !== undefined) {
        system.fate = { max: state.fate, value: state.fate, rolled: true };
    }

    if (state.insanity) system.insanity = state.insanity;
    if (state.corruption) system.corruption = state.corruption;

    // RT Core p.38: 5,000 total xp, 4,500 already spent on the career; the
    // remaining 500-xp pool has any ItS origin costs already debited on top.
    if (Object.keys(state.origin).length) {
        system.experience = {
            total: TOTAL_STARTING_XP,
            used: PRESPENT_STARTING_XP + state.originXpSpent,
        };
    }

    return {
        name: state.name || 'New Explorer',
        system,
        flags: { rt: { chargen: state.toJSON() } },
    };
}

/** Align an engine option name with a sheet dropdown label list (exact match,
 *  else prefix match for the ItS suffixed labels, else the raw name). */
function alignLabel(name, labels) {
    if (!labels) return name;
    if (labels.includes(name)) return name;
    return labels.find((l) => l.startsWith(`${name} (`)) ?? name;
}

/* ------------------------------------------------------------------------ */
/*  Foundry-side                                                             */
/* ------------------------------------------------------------------------ */

/** Load talent/trait compendium indexes and plan embedded items. */
export async function collectItems(state) {
    const indexes = { talentIndex: {}, traitIndex: {} };
    for (const [packName, key] of [['talents', 'talentIndex'], ['traits', 'traitIndex']]) {
        const pack = game.packs.get(`rogue-trader-3rd.${packName}`);
        if (!pack) continue;
        for (const doc of await pack.getDocuments()) {
            indexes[key][doc.name] = doc.toObject();
        }
    }
    return planItems(state, indexes);
}

function wizardBuildData(state, plan) {
    return buildActorData(state, {
        originLabels: CONFIG.rt?.originPath ?? null,
        itemGaps: plan?.gaps ?? null,
    });
}

/** True if the actor already has non-default characteristic bases. */
export function hasExistingCharacteristics(actor) {
    return Object.values(actor.system.characteristics ?? {})
        .some((c) => (c?.base ?? 0) !== 0);
}

/** Create a new acolyte from the state (with embedded origin items). */
export async function createActor(state) {
    const plan = await collectItems(state);
    const data = wizardBuildData(state, plan);
    const actor = await Actor.create({ ...data, type: 'acolyte' });
    if (plan.items.length) {
        await actor.createEmbeddedDocuments('Item', plan.items);
    }
    return actor;
}

/** Apply the state to an existing acolyte. Caller confirms overwrite first. */
export async function applyToActor(actor, state) {
    const plan = await collectItems(state);
    const data = wizardBuildData(state, plan);
    await actor.update(data);
    if (plan.items.length) {
        // Don't duplicate items a previous apply already created.
        const have = new Set(actor.items.map((i) => `${i.type}:${i.name}`));
        const fresh = plan.items.filter((i) => !have.has(`${i.type}:${i.name}`));
        if (fresh.length) await actor.createEmbeddedDocuments('Item', fresh);
    }
    return actor;
}

/** GM helper: add the dynasty PF contribution to the world Profit Factor setting. */
export async function applyProfitFactorToWorld(state) {
    if (!state.profitFactor || !game.user.isGM) return false;
    const { RogueTraderSettings } = await import('../rogue-trader-settings.mjs');
    const current = RogueTraderSettings.getProfitFactor();
    await RogueTraderSettings.setProfitFactor(Number(current ?? 0) + state.profitFactor);
    return true;
}
