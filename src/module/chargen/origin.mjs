/**
 * Chargen Stage 2 — Origin Path effects interpreter.
 *
 * JS port of RTT_MAKER `rogue_trader/origin.py` (the validated Python engine).
 * Loads origin options from the vendored rules data, applies their declarative
 * effects to a ChargenState, enforces Into the Storm legality (xp_cost hard
 * debit, requires/excludes intersections, distinct groups, Warrant & Ship
 * chart adjacency), and computes origin-dependent Starting Wounds and Fate.
 *
 * Pure module: no Foundry globals. All option lookups go through a `registry`
 * ({step: {name: option}}) built from parsed JSON, so tests can feed data from
 * disk and the wizard from data.mjs. Dice are injected (`roll(n, sides)`).
 *
 * Effects are the raw JSON objects from the data files — `{type, ...fields}` —
 * matching the Python `Effect` payload exactly.
 */

import { ABBRS, fromAbbr } from './characteristics.mjs';

/** Origin Path order (Core p.16); warrant_and_ship is the optional ItS
 *  dynasty path, sequenced after Motivation and before Career. */
export const STEP_ORDER = [
    'home_world',
    'birthright',
    'lure_of_the_void',
    'trials_and_travails',
    'motivation',
    'warrant_and_ship',
    'career',
];

/** The starting-XP pool ItS origin xp_costs are charged against (RT 500). */
export const STARTING_XP_POOL = 500;

/** RT Core p.38: every starting Explorer begins play with 5,000 xp, of which
 *  4,500 are already spent on the career (the final 500 = STARTING_XP_POOL is
 *  the free pool the player may spend during creation). */
export const TOTAL_STARTING_XP = 5000;
export const PRESPENT_STARTING_XP = TOTAL_STARTING_XP - STARTING_XP_POOL;

export class OriginError extends Error {}

/* ------------------------------------------------------------------------ */
/*  Options + registry                                                       */
/* ------------------------------------------------------------------------ */

/** Normalize one data record into an option object. */
export function optionFromJson(step, d) {
    return {
        name: d.name,
        step,
        source: d.source ?? 'Core',
        page: d.page ?? null,
        effects: d.effects ?? [],
        startingWounds: d.starting_wounds ?? null,
        startingFate: d.starting_fate ?? null,
        xpCost: d.xp_cost ?? 0,
        requires: d.requires ?? null,
        excludes: d.excludes ?? null,
        substitutesFor: d.substitutes_for ?? [],
    };
}

/**
 * Build the step registry from parsed data files.
 * @param {Object<string, object>} parsed  step -> parsed JSON ({options: [...]}
 *   for origin steps; {species: [...]} for the species file)
 * @returns {Object<string, Object<string, object>>} step -> {name: option}
 */
export function buildRegistry(parsed) {
    const reg = {};
    for (const [step, data] of Object.entries(parsed)) {
        if (step === 'species') {
            reg.species = {};
            for (const s of data.species ?? []) reg.species[s.name] = s;
            continue;
        }
        reg[step] = {};
        for (const o of data.options ?? []) reg[step][o.name] = optionFromJson(step, o);
    }
    return reg;
}

function loadOptions(reg, step) {
    const opts = reg[step];
    if (!opts) throw new Error(`no data registered for origin step '${step}'`);
    return opts;
}

/* ------------------------------------------------------------------------ */
/*  Origin XP debit                                                          */
/* ------------------------------------------------------------------------ */

function debitOriginXp(state, step, option, amount) {
    const projected = state.originXpSpent + amount;
    if (projected > STARTING_XP_POOL) {
        throw new OriginError(
            `${option}: origin XP cost ${amount} would push cumulative origin `
            + `spend to ${projected}, exceeding the ${STARTING_XP_POOL}-xp starting `
            + `pool (already spent ${state.originXpSpent})`);
    }
    state.originXpSpent += amount;
    state.originXpCharges.push({ step, option, cost: amount });
    state.log.push(`${option}: origin XP cost ${amount} (origin spend now ${state.originXpSpent})`);
}

/* ------------------------------------------------------------------------ */
/*  Intersections / legality (pure queries; no mutation)                     */
/* ------------------------------------------------------------------------ */

/** True if the state's (non-human) species substitutes for the Home World step. */
export function speciesReplacesHomeWorld(reg, state) {
    if (!state.species) return false;
    const spec = reg.species?.[state.species];
    return !!spec?.replaces_home_world;
}

function clauseMatches(reg, state, clause) {
    if ('species' in clause) {
        return (state.species ?? 'Human') === clause.species;
    }
    if ('career' in clause) {
        return (state.career ?? null) === clause.career;
    }
    const step = clause.step;
    const picked = step ? state.origin[step] : null;
    if ('option' in clause) return picked === clause.option;
    if ('source' in clause) {
        if (!picked) return false;
        const opt = reg[step]?.[picked];
        return !!opt && opt.source === clause.source;
    }
    return false;
}

function groupSatisfied(reg, state, group) {
    if (!group) return true;
    if (group.all_of) return group.all_of.every((c) => clauseMatches(reg, state, c));
    if (group.any_of) return group.any_of.some((c) => clauseMatches(reg, state, c));
    return true;
}

function describe(group) {
    const clauses = group.all_of ?? group.any_of ?? [];
    const parts = [];
    for (const c of clauses) {
        if ('species' in c) parts.push(`species ${c.species}`);
        else if ('option' in c) parts.push(`${c.step}='${c.option}'`);
        else if ('source' in c) parts.push(`${c.step} source '${c.source}'`);
    }
    return parts.join(group.all_of ? ' and ' : ' or ') || '(unspecified)';
}

/** Human-readable reasons `option` is illegal for `state` (empty == legal). */
export function illegalityReasons(reg, state, option) {
    const reasons = [];
    // Non-human PCs (ItS Kroot/Ork) replace the Home World step with their
    // species — no human Home World option is legal for them.
    if (option.step === 'home_world' && speciesReplacesHomeWorld(reg, state)) {
        reasons.push(
            `${option.name}: ${state.species} characters replace the Home World `
            + `step with their species (cannot pick a human Home World)`);
    }
    if (option.requires && !groupSatisfied(reg, state, option.requires)) {
        reasons.push(`${option.name} requires ${describe(option.requires)}`);
    }
    if (option.excludes) {
        const group = option.excludes;
        const matched = group.all_of
            ? group.all_of.every((c) => clauseMatches(reg, state, c))
            : (group.any_of ?? []).some((c) => clauseMatches(reg, state, c));
        if (matched) reasons.push(`${option.name} cannot be taken with ${describe(option.excludes)}`);
    }
    if (option.xpCost) {
        const projected = state.originXpSpent + option.xpCost;
        if (projected > STARTING_XP_POOL) {
            reasons.push(
                `${option.name} costs ${option.xpCost} xp; cumulative origin spend `
                + `${projected} would exceed the ${STARTING_XP_POOL}-xp starting pool `
                + `(already spent ${state.originXpSpent})`);
        }
    }
    return reasons;
}

export function isOptionLegal(reg, state, option) {
    return illegalityReasons(reg, state, option).length === 0;
}

/** All options for `step` currently legal for `state`, keyed by name. */
export function legalOptions(reg, state, step) {
    const out = {};
    for (const [name, opt] of Object.entries(loadOptions(reg, step))) {
        if (isOptionLegal(reg, state, opt)) out[name] = opt;
    }
    return out;
}

/** Record-agnostic intersection check (reused by career/ship-role gating). */
export function requirementsSatisfied(reg, state, requires = null, excludes = null) {
    if (requires && !groupSatisfied(reg, state, requires)) return false;
    if (excludes && groupSatisfied(reg, state, excludes)) return false;
    return true;
}

/* ------------------------------------------------------------------------ */
/*  "Choose N distinct" (distinct_group)                                     */
/* ------------------------------------------------------------------------ */

function distinctGroups(option) {
    const groups = {};
    for (const eff of option.effects) {
        if (eff.type === 'choice' && eff.distinct_group) {
            (groups[eff.distinct_group] ??= []).push(eff);
        }
    }
    return groups;
}

function checkDistinctGroups(option, choices) {
    for (const [grp, effs] of Object.entries(distinctGroups(option))) {
        const seen = {};
        for (const eff of effs) {
            const sel = choices[eff.id];
            if (sel === undefined || sel === null) continue;
            if (sel in seen) {
                throw new OriginError(
                    `${option.name}: distinct group '${grp}' cannot pick '${sel}' `
                    + `twice (chosen for both '${seen[sel]}' and '${eff.id}')`);
            }
            seen[sel] = eff.id;
        }
    }
}

/**
 * The labels still selectable for `choiceId` given prior picks (UI query):
 * excludes labels taken by sibling choices in the same distinct group, and
 * restricts Warrant & Ship category choices to chart-adjacent cells.
 */
export function availableChoiceOptions(reg, state, choiceId, choices = {}, { step, option } = {}) {
    const opt = option ?? findOptionForChoice(reg, state, choiceId, step);
    if (!opt) throw new Error(`no option found owning choice '${choiceId}'`);
    const target = opt.effects.find((e) => e.type === 'choice' && e.id === choiceId);
    if (!target) throw new Error(`option '${opt.name}' has no choice '${choiceId}'`);
    let labels = target.options.map((o) => o.label);

    const adj = warrantAllowedNext(opt, choiceId, choices);
    if (adj !== null) labels = labels.filter((lbl) => adj.has(lbl));

    const grp = target.distinct_group;
    if (grp) {
        const taken = new Set(opt.effects
            .filter((e) => e.type === 'choice' && e.distinct_group === grp
                && e.id !== choiceId && choices[e.id] !== undefined)
            .map((e) => choices[e.id]));
        labels = labels.filter((lbl) => !taken.has(lbl));
    }
    return labels;
}

function findOptionForChoice(reg, state, choiceId, step) {
    const steps = step ? [step] : Object.keys(state.origin);
    for (const s of steps) {
        const picked = state.origin[s];
        if (!picked) continue;
        const opt = reg[s]?.[picked];
        if (opt?.effects.some((e) => e.type === 'choice' && e.id === choiceId)) return opt;
    }
    for (const s of Object.keys(reg)) {
        if (s === 'species') continue;
        for (const opt of Object.values(reg[s])) {
            if (opt.effects?.some((e) => e.type === 'choice' && e.id === choiceId)) return opt;
        }
    }
    return null;
}

/* ------------------------------------------------------------------------ */
/*  Warrant & Ship chart adjacency (ItS pp.34-35)                            */
/*                                                                           */
/*  Rows are printed left-to-right column positions (NOT an SP ordering —    */
/*  SP direction differs between rows). Equal-width transitions use the      */
/*  {i-1, i, i+1} clamp; the three width-changing transitions use explicit   */
/*  maps so no cell is orphaned (see RTT_MAKER origin.py for the full        */
/*  rules-qa derivation, incl. the p.34 "Exile and Reward funnel" example).  */
/* ------------------------------------------------------------------------ */

const WS_ROWS = {
    warrant_age: [
        'The Waning', 'Age of Redemption', 'Age of Apostasy',
        'The Forging', 'The Age of Rebirth',
    ],
    fortune_and_fate: [
        'Rising Star', 'Ascending', 'Stable', 'Struggling', 'Fallen from Grace',
    ],
    acquisition: [
        'Exile', 'Blackmail', 'Prize of War', 'Ministorum Bequest',
        'Administratum Trade Mandate', 'Intrigue', 'Reward',
    ],
    sanction: [
        'Halo Artefacts', 'Fall of the Tellurian Combine', 'The Meritech Wars',
        'Angevin Crusade', 'Age of Plunder',
    ],
    contacts: [
        'Pirates', 'Merchant House', 'Missionaria Galaxia',
        'Adeptus Mechanicus', 'Battlefleet',
    ],
    warrant_renown: ['Infamous', 'Unknown', 'Famous'],
};

export const WS_ROW_ORDER = [
    'warrant_age', 'fortune_and_fate', 'acquisition',
    'sanction', 'contacts', 'warrant_renown',
];

const WS_FORTUNE_TO_ACQUISITION = {
    0: [0, 1], 1: [1, 2], 2: [2, 3, 4], 3: [3, 4], 4: [4, 5, 6],
};
const WS_ACQUISITION_TO_SANCTION = {
    0: [0], 1: [0, 1], 2: [1, 2], 3: [2, 3], 4: [3, 4], 5: [3, 4], 6: [4],
};
const WS_CONTACTS_TO_RENOWN = {
    0: [0], 1: [0, 1], 2: [1, 2], 3: [2], 4: [2],
};

function warrantAllowedNext(option, choiceId, choices) {
    if (option.step !== 'warrant_and_ship' || !WS_ROW_ORDER.includes(choiceId)) return null;
    const idx = WS_ROW_ORDER.indexOf(choiceId);
    if (idx === 0) return null; // top row fully open
    const parentId = WS_ROW_ORDER[idx - 1];
    const parentPick = choices[parentId];
    if (parentPick === undefined || parentPick === null) return null; // permissive
    const parentRow = WS_ROWS[parentId];
    const childRow = WS_ROWS[choiceId];
    const pcol = parentRow.indexOf(parentPick);
    if (pcol === -1) return null; // unknown parent label (defensive)
    let childCols;
    if (parentId === 'fortune_and_fate' && choiceId === 'acquisition') {
        childCols = WS_FORTUNE_TO_ACQUISITION[pcol] ?? [];
    } else if (parentId === 'acquisition' && choiceId === 'sanction') {
        childCols = WS_ACQUISITION_TO_SANCTION[pcol] ?? [];
    } else if (parentId === 'contacts' && choiceId === 'warrant_renown') {
        childCols = WS_CONTACTS_TO_RENOWN[pcol] ?? [];
    } else {
        childCols = [pcol - 1, pcol, pcol + 1];
    }
    return new Set(childCols.filter((c) => c >= 0 && c < childRow.length).map((c) => childRow[c]));
}

function checkWarrantAdjacency(option, choices) {
    if (option.step !== 'warrant_and_ship') return;
    for (const choiceId of WS_ROW_ORDER) {
        const sel = choices[choiceId];
        if (sel === undefined || sel === null) continue;
        const allowed = warrantAllowedNext(option, choiceId, choices);
        if (allowed !== null && !allowed.has(sel)) {
            const parent = WS_ROW_ORDER[WS_ROW_ORDER.indexOf(choiceId) - 1];
            throw new OriginError(
                `Warrant & Ship: '${sel}' (${choiceId}) is not chart-adjacent to `
                + `'${choices[parent]}' (${parent}); legal next picks: `
                + `${[...allowed].sort().join(', ')}`);
        }
    }
}

/** UI query: chart-legal labels for `choiceId` given prior-row picks; null if
 *  unconstrained (top row, or previous row unresolved). */
export function warrantLegalNext(reg, choices, choiceId) {
    const opt = reg.warrant_and_ship?.['The Ship and Warrant Path'];
    if (!opt) throw new Error('warrant_and_ship data not loaded');
    const allowed = warrantAllowedNext(opt, choiceId, choices);
    return allowed === null ? null : [...allowed].sort();
}

/* ------------------------------------------------------------------------ */
/*  Apply                                                                    */
/* ------------------------------------------------------------------------ */

function choiceLabel(source, eff) {
    let title = eff.title;
    if (!title) {
        let slug = eff.id ?? '';
        const srcSlug = source.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (srcSlug && slug.startsWith(srcSlug + '_')) slug = slug.slice(srcSlug.length + 1);
        title = slug.replace(/_/g, ' ').trim()
            .replace(/\b\w/g, (ch) => ch.toUpperCase()) || 'choose';
    }
    return `${source} — ${title}`;
}

function conditionMet(state, cond) {
    const value = state.value(cond.char);
    if ('min' in cond && value < cond.min) return false;
    if ('max' in cond && value > cond.max) return false;
    return true;
}

/**
 * Apply an origin option's effects to `state`.
 *
 * `choices` resolves player decisions by effect id (characteristic abbr for
 * char_mod_choice, option label for generic choices); `rolls` resolves rolled
 * amounts (insanity/corruption dice totals) by effect id. Anything unresolved
 * is recorded on the state (pendingChoices/pendingRolls) for the UI to prompt.
 * Returns the new pending choices.
 *
 * Throws OriginError if the option is illegal (unmet intersection, distinct
 * duplicate, chart-illegal warrant pick, or xp_cost overspend) unless `force`.
 */
export function applyOption(reg, state, option, choices = {}, rolls = {}, { force = false } = {}) {
    if (!force) {
        const reasons = illegalityReasons(reg, state, option);
        if (reasons.length) throw new OriginError(reasons.join('; '));
        checkDistinctGroups(option, choices);
        checkWarrantAdjacency(option, choices);
    }
    state.origin[option.step] = option.name;
    const pendingChoices = [];
    const pendingRolls = [];

    for (const eff of option.effects) {
        applyEffect(state, option.name, eff, choices, rolls, pendingChoices, pendingRolls);
    }

    state.pendingChoices.push(...pendingChoices);
    state.pendingRolls.push(...pendingRolls);

    if (option.xpCost) {
        if (force) {
            state.originXpSpent += option.xpCost;
            state.originXpCharges.push({ step: option.step, option: option.name, cost: option.xpCost });
            state.log.push(`${option.name}: origin XP cost ${option.xpCost} `
                + `(origin spend now ${state.originXpSpent})`);
        } else {
            debitOriginXp(state, option.step, option.name, option.xpCost);
        }
    }
    return pendingChoices;
}

function applyEffect(state, source, eff, choices, rolls, pendingChoices, pendingRolls) {
    switch (eff.type) {
        case 'char_mod':
            state.addModifier(source, fromAbbr(eff.char), eff.amount);
            break;

        case 'char_mod_choice': {
            const pool = eff.pool ?? 'any';
            const options = pool === 'any' ? [...ABBRS] : [...pool];
            const sel = choices[eff.id];
            if (sel) {
                if (!options.includes(sel)) {
                    throw new Error(`choice ${eff.id}: '${sel}' not in [${options.join(', ')}]`);
                }
                state.addModifier(`${source} (choice)`, fromAbbr(sel), eff.amount);
            } else {
                pendingChoices.push({
                    id: eff.id, kind: 'characteristic', source,
                    options, amount: eff.amount,
                });
            }
            break;
        }

        case 'grant_skill':
            state.grantSkill(eff.skill, eff.level, source);
            break;

        case 'grant_talent': {
            // Optional condition gates on a characteristic threshold, evaluated
            // against the CURRENT value (earlier effects in this option count).
            const cond = eff.condition;
            if (cond && !conditionMet(state, cond)) {
                const ref = cond.char ?? '?';
                const value = cond.char ? state.value(cond.char) : '?';
                const bound = cond.min ?? cond.max;
                state.log.push(`${source}: ${eff.talent} not granted (${ref} ${value} < ${bound})`);
            } else {
                state.grantTalent(eff.talent, source);
            }
            break;
        }

        case 'trait':
            state.addTrait(eff.name, eff.text, source);
            break;

        case 'profit_factor':
            state.profitFactor += eff.amount;
            state.log.push(`${source}: Profit Factor ${eff.amount >= 0 ? '+' : ''}${eff.amount}`);
            break;

        case 'ship_points':
            state.shipPointsContributed += eff.amount;
            state.log.push(`${source}: Ship Points ${eff.amount >= 0 ? '+' : ''}${eff.amount}`);
            break;

        case 'fate':
            state.fateAdjustment += eff.amount;
            state.log.push(`${source}: Fate ${eff.amount >= 0 ? '+' : ''}${eff.amount}`);
            break;

        case 'wounds':
            state.woundBonus += eff.amount;
            state.log.push(`${source}: Wounds ${eff.amount >= 0 ? '+' : ''}${eff.amount}`);
            break;

        case 'insanity':
        case 'corruption': {
            let amount = eff.amount;
            if (amount === undefined || amount === null) { // rolled
                const [n, sides] = eff.dice;
                const bonus = eff.bonus ?? 0;
                if (eff.id in rolls) {
                    amount = rolls[eff.id] + bonus;
                } else {
                    pendingRolls.push({
                        id: eff.id, kind: eff.type, source,
                        dice: [n, sides], bonus,
                    });
                    return;
                }
            }
            if (eff.type === 'insanity') state.insanity += amount;
            else state.corruption += amount;
            state.log.push(`${source}: ${eff.type} +${amount}`);
            break;
        }

        case 'origin_xp_cost': {
            // Optional extra-XP add-on nested inside a "take it" choice option;
            // hard-debits the starting pool like option-level xp_cost.
            const step = Object.entries(state.origin)
                .find(([, name]) => source.startsWith(name))?.[0] ?? 'origin';
            debitOriginXp(state, step, source, eff.amount);
            break;
        }

        case 'choice': {
            const sel = choices[eff.id];
            const labels = eff.options.map((o) => o.label);
            if (sel) {
                const chosen = eff.options.find((o) => o.label === sel);
                if (!chosen) throw new Error(`choice ${eff.id}: '${sel}' not in [${labels.join(', ')}]`);
                for (const sub of chosen.effects) {
                    applyEffect(state, `${source} (${sel})`, sub, choices, rolls,
                        pendingChoices, pendingRolls);
                }
            } else {
                pendingChoices.push({
                    id: eff.id, kind: 'choice', source, options: labels,
                    label: choiceLabel(source, eff),
                });
            }
            break;
        }

        case 'substitute': {
            // Cross-step swap: remove a skill/talent granted by an earlier step,
            // then optionally apply a replacement effect. No-op if absent.
            const { kind, name } = eff.target;
            let removed = false;
            if (kind === 'skill') {
                if (name in state.skills) { delete state.skills[name]; removed = true; }
            } else if (kind === 'talent') {
                const i = state.talents.indexOf(name);
                if (i !== -1) { state.talents.splice(i, 1); removed = true; }
            } else {
                throw new Error(`substitute: unsupported target kind '${kind}'`);
            }
            state.log.push(removed
                ? `${source}: removed ${kind} ${name} (substitution)`
                : `${source}: substitution target ${kind} ${name} not present (no-op)`);
            if (eff.replacement) {
                applyEffect(state, `${source} (substitute)`, eff.replacement,
                    choices, rolls, pendingChoices, pendingRolls);
            }
            break;
        }

        default:
            throw new Error(`unknown effect type: '${eff.type}'`);
    }
}

/* ------------------------------------------------------------------------ */
/*  Starting Wounds / Fate                                                   */
/* ------------------------------------------------------------------------ */

/**
 * Starting Wounds = TB×multiplier + bonus-dice + flat (Home World / species
 * record). Pass `roll` (player-entered dice total) or `dice` to app-roll.
 * The Motivation "Endurance" wounds bonus (state.woundBonus) is NOT included —
 * add it on top when showing final Wounds.
 */
export function computeStartingWounds(spec, toughnessBonus, { roll = null, dice = null } = {}) {
    if (!spec) throw new Error('no starting_wounds data');
    const [n, sides] = spec.dice;
    const total = roll ?? dice(n, sides).reduce((a, b) => a + b, 0);
    return spec.tb_multiplier * toughnessBonus + total + (spec.flat ?? 0);
}

/** Starting Fate Points from the origin's 1d10 threshold table. */
export function computeStartingFate(table, { roll = null, dice = null } = {}) {
    if (!table) throw new Error('no starting_fate data');
    const d10 = roll ?? dice(1, 10)[0];
    for (const [threshold, fate] of table) {
        if (d10 <= threshold) return fate;
    }
    return table[table.length - 1][1];
}
