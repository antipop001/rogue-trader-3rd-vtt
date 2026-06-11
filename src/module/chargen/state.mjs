/**
 * Chargen — builder state.
 *
 * JS port of the chargen-relevant slice of RTT_MAKER
 * `rogue_trader/models.py:Character`. Plain serializable object — NOT a
 * Foundry document; it round-trips through JSON so the wizard can stash it in
 * `flags.rt.chargen` for resume/audit, and replays from stored *inputs*
 * (generation method + origin picks), the same model as RTT_MAKER's
 * persistence.
 *
 * Pure module: no Foundry globals.
 */

import { ABBRS, bonus, fromAbbr } from './characteristics.mjs';

const SKILL_RANK = { 'basic': 0, 'trained': 1, '+10': 2, '+20': 3 };

export class ChargenState {
    constructor() {
        this.name = '';
        /** @type {{method: string|null, base: Object<string,number>}} */
        this.characteristics = { method: null, base: {} };
        /** Origin/advance adjustments, displayable and undoable: {source, char, amount}. */
        this.modifiers = [];
        this.skills = {};            // skill name -> level string
        this.talents = [];           // talent names
        this.traits = [];            // {name, text, source}
        this.origin = {};            // step -> option name
        /** Replay inputs for Stage B: {step, option, choices: {}, rolls: {}}. */
        this.originInputs = [];
        /** Human-readable per-step notes (resolved sub-choices) for bio.originPath. */
        this.originNotes = {};
        this.species = null;         // null == Human
        this.career = null;          // chosen career name (selection only; XP is Stage C)
        this.profitFactor = 0;
        this.shipPointsContributed = 0; // Warrant & Ship dynasty SP contribution
        this.fateAdjustment = 0;
        this.woundBonus = 0;
        this.insanity = 0;
        this.corruption = 0;
        this.wounds = null;          // computed starting wounds (int) once rolled
        this.fate = null;            // computed starting fate (int) once rolled
        this.woundsRoll = null;      // raw bonus-dice total input (resume)
        this.fateRoll = null;        // raw d10 input (resume)
        this.originXpSpent = 0;
        this.originXpCharges = [];   // {step, option, cost}
        this.pendingChoices = [];    // {id, source, label, options}
        this.pendingRolls = [];      // {id, source, label, dice}
        this.log = [];               // human-readable trail
    }

    // --- characteristics ---------------------------------------------------

    /** Set the generated base values: {base: {abbr:int}, method}. */
    setCharacteristics({ base, method }) {
        this.characteristics = { method, base: { ...base } };
    }

    /** Effective value = base + sum of modifiers for the characteristic. */
    value(abbr) {
        const a = fromAbbr(abbr);
        let total = this.characteristics.base[a] ?? 0;
        for (const m of this.modifiers) if (m.char === a) total += m.amount;
        return total;
    }

    bonus(abbr) {
        return bonus(this.value(abbr));
    }

    addModifier(source, abbr, amount) {
        this.modifiers.push({ source, char: fromAbbr(abbr), amount });
    }

    /** Effective values keyed by abbreviation. */
    asDict() {
        const out = {};
        for (const a of ABBRS) out[a] = this.value(a);
        return out;
    }

    get hasCharacteristics() {
        return this.characteristics.method !== null
            && ABBRS.every((a) => Number.isFinite(this.characteristics.base[a]));
    }

    // --- grants (Stage B effects land here) ---------------------------------

    grantSkill(skill, level, source) {
        // Trained beats basic; never downgrade an already-held level.
        const have = this.skills[skill];
        if ((SKILL_RANK[level] ?? 0) >= (have !== undefined ? SKILL_RANK[have] : -1)) {
            this.skills[skill] = level;
        }
        this.log.push(`${source}: skill ${skill} (${level})`);
    }

    grantTalent(talent, source) {
        if (!this.talents.includes(talent)) this.talents.push(talent);
        this.log.push(`${source}: talent ${talent}`);
    }

    addTrait(name, text, source) {
        this.traits.push({ name, text, source });
        this.log.push(`${source}: trait ${name}`);
    }

    // --- serialization -------------------------------------------------------

    /** Plain-object snapshot (JSON-safe) for flags.rt.chargen. */
    toJSON() {
        return {
            version: 1,
            name: this.name,
            characteristics: this.characteristics,
            modifiers: this.modifiers,
            skills: this.skills,
            talents: this.talents,
            traits: this.traits,
            origin: this.origin,
            originInputs: this.originInputs,
            originNotes: this.originNotes,
            species: this.species,
            career: this.career,
            profitFactor: this.profitFactor,
            shipPointsContributed: this.shipPointsContributed,
            fateAdjustment: this.fateAdjustment,
            woundBonus: this.woundBonus,
            insanity: this.insanity,
            corruption: this.corruption,
            wounds: this.wounds,
            fate: this.fate,
            woundsRoll: this.woundsRoll,
            fateRoll: this.fateRoll,
            originXpSpent: this.originXpSpent,
            originXpCharges: this.originXpCharges,
            pendingChoices: this.pendingChoices,
            pendingRolls: this.pendingRolls,
            log: this.log,
        };
    }

    static fromJSON(data) {
        const s = new ChargenState();
        if (!data) return s;
        for (const key of Object.keys(s)) {
            if (data[key] !== undefined) s[key] = data[key];
        }
        return s;
    }
}

export const STARTING_XP = 500; // RT Core p.14 — Stage 3 pool (origin xp_costs debit it)
