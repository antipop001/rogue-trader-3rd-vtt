import { ChargenState } from '../chargen/state.mjs';
import {
    ABBRS,
    CHARACTERISTICS,
    GenMethod,
    ROLL_BONUS,
    parseRoll,
    rangeWarnings,
} from '../chargen/characteristics.mjs';
import {
    OriginError,
    STARTING_XP_POOL,
    applyOption,
    availableChoiceOptions,
    buildRegistry,
    computeStartingFate,
    computeStartingWounds,
    legalOptions,
    optionFromJson,
    speciesReplacesHomeWorld,
} from '../chargen/origin.mjs';
import { loadAllSteps } from '../chargen/data.mjs';
import {
    applyProfitFactorToWorld,
    applyToActor,
    createActor,
    hasExistingCharacteristics,
} from '../chargen/commit.mjs';

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const METHODS = [
    { key: GenMethod.ROLL, label: 'Roll (2d10+25 each, in order)' },
    { key: GenMethod.POOL, label: 'Roll a pool, assign freely' },
    { key: GenMethod.MANUAL, label: 'Enter rolled values (physical dice)' },
    { key: GenMethod.FIXED, label: 'Fixed baseline (no luck)' },
];

const ORIGIN_STEPS = [
    'home_world', 'birthright', 'lure_of_the_void',
    'trials_and_travails', 'motivation', 'warrant_and_ship',
];

const PAGES = [
    { key: 'characteristics', label: 'Characteristics' },
    { key: 'species', label: 'Species', optional: true },
    { key: 'home_world', label: 'Home World' },
    { key: 'birthright', label: 'Birthright' },
    { key: 'lure_of_the_void', label: 'Lure of the Void' },
    { key: 'trials_and_travails', label: 'Trials and Travails' },
    { key: 'motivation', label: 'Motivation' },
    { key: 'warrant_and_ship', label: 'Warrant & Ship', optional: true },
    { key: 'career', label: 'Career' },
    { key: 'finish', label: 'Wounds, Fate & Finish' },
];

// The eight Core careers + the two ItS alien careers (selection only — the
// rank-1 advance tables are Stage C).
const CAREERS = {
    Human: ['Rogue Trader', 'Arch-militant', 'Astropath Transcendent', 'Explorator',
        'Missionary', 'Navigator', 'Seneschal', 'Void-master'],
    Kroot: ['Kroot Mercenary'],
    Ork: ['Ork Freebooter'],
};

/**
 * Guided character-creation wizard (Stages A+B: Characteristics + Origin Path).
 *
 * Replay model: every player decision lives in `this.inputs`; the ChargenState
 * is rebuilt from scratch on each change, so editing an earlier step
 * automatically invalidates downstream effects (same model as RTT_MAKER's
 * persistence). Every rolled value can be typed in instead — physical dice at
 * the table are first-class.
 *
 * NOTE: ApplicationV2 reserves `state` (read-only render-state getter); the
 * builder state is `this.chargenState` (gotcha #13).
 */
export class ChargenWizard extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'rt-chargen-app'],
        position: { width: 860, height: 680 },
        window: {
            title: 'Character Creation — Rogue Trader',
            icon: 'fa-solid fa-hat-wizard',
            resizable: true,
            contentClasses: ['rt-chargen'],
        },
        actions: {
            navPage: ChargenWizard._onNavPage,
            rollAll: ChargenWizard._onRollAll,
            rollOne: ChargenWizard._onRollOne,
            rollPool: ChargenWizard._onRollPool,
            assignPool: ChargenWizard._onAssignPool,
            fillFixed: ChargenWizard._onFillFixed,
            rollPending: ChargenWizard._onRollPending,
            skipStep: ChargenWizard._onSkipStep,
            rollWounds: ChargenWizard._onRollWounds,
            rollFate: ChargenWizard._onRollFate,
            applyPfWorld: ChargenWizard._onApplyPfWorld,
            commit: ChargenWizard._onCommit,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/rogue-trader-3rd/templates/chargen/chargen-wizard.hbs',
            scrollable: ['.rt-chargen__pane'],
        },
    };

    constructor(options = {}) {
        super(options);
        this.actor = options.actor ?? null;
        this.registry = null;       // built async on first render
        this.page = 'characteristics';
        this.method = GenMethod.ROLL;
        this.pool = null;
        this.assignments = {};
        this.showIts = true;        // Into the Storm options visible
        this.stepErrors = [];       // OriginError messages from the last rebuild

        // All player decisions; the single source of truth (replayed on change).
        this.inputs = {
            name: '',
            characteristics: { method: null, base: {} },
            species: null,          // null == Human
            steps: {},              // step -> {option, choices: {}, rolls: {}}
            career: null,
            woundsRoll: null,       // entered/rolled bonus-dice total
            fateRoll: null,         // entered/rolled d10
        };
        this.#restoreFromFlags();
        this.chargenState = new ChargenState();
    }

    #restoreFromFlags() {
        const stored = this.actor?.getFlag('rt', 'chargen');
        if (!stored) {
            if (this.actor) this.inputs.name = this.actor.name;
            return;
        }
        this.inputs.name = stored.name ?? this.actor.name;
        this.inputs.characteristics = stored.characteristics ?? { method: null, base: {} };
        this.inputs.species = stored.species ?? null;
        this.inputs.career = stored.career ?? null;
        for (const inp of stored.originInputs ?? []) {
            this.inputs.steps[inp.step] = {
                option: inp.option,
                choices: inp.choices ?? {},
                rolls: inp.rolls ?? {},
            };
        }
        this.inputs.woundsRoll = stored.woundsRoll ?? null;
        this.inputs.fateRoll = stored.fateRoll ?? null;
        this.method = this.inputs.characteristics.method ?? GenMethod.ROLL;
    }

    /* --------------------------------------------------------- */
    /*  Replay: inputs -> ChargenState                           */
    /* --------------------------------------------------------- */

    #rebuild() {
        const reg = this.registry;
        const s = new ChargenState();
        const inp = this.inputs;
        this.stepErrors = [];
        s.name = inp.name;
        if (inp.characteristics.method) s.setCharacteristics(inp.characteristics);
        s.species = inp.species;

        // Species effects (Kroot/Ork traits etc.) apply as a pseudo-option.
        if (inp.species && reg?.species?.[inp.species]) {
            const spec = reg.species[inp.species];
            applyOption(reg, s, optionFromJson('species', {
                name: spec.name, source: spec.source, effects: spec.effects ?? [],
            }), {}, {}, { force: true });
        }

        for (const step of ORIGIN_STEPS) {
            const pick = inp.steps[step];
            if (!pick?.option || !reg?.[step]) continue;
            const option = reg[step][pick.option];
            if (!option) continue;
            try {
                applyOption(reg, s, option, pick.choices, pick.rolls);
                s.originNotes[step] = this.#composeNotes(pick);
                s.originInputs.push({
                    step, option: pick.option,
                    choices: pick.choices, rolls: pick.rolls,
                });
            } catch (err) {
                if (err instanceof OriginError) {
                    // The pick became illegal (an earlier step changed): drop it.
                    this.stepErrors.push(`${PAGES.find((p) => p.key === step)?.label}: ${err.message}`);
                    delete inp.steps[step];
                } else {
                    throw err;
                }
            }
        }

        s.career = inp.career;

        // Wounds / Fate from the home world (or species) record.
        const spec = this.#woundsFateSource();
        if (spec?.wounds && inp.woundsRoll !== null) {
            s.wounds = computeStartingWounds(spec.wounds, s.bonus('T'), { roll: inp.woundsRoll })
                + s.woundBonus;
        }
        if (spec?.fate && inp.fateRoll !== null) {
            s.fate = computeStartingFate(spec.fate, { roll: inp.fateRoll }) + s.fateAdjustment;
        }
        // Raw roll inputs persist on the state for resume.
        s.woundsRoll = inp.woundsRoll;
        s.fateRoll = inp.fateRoll;

        this.chargenState = s;
    }

    #composeNotes(pick) {
        const parts = Object.values(pick.choices ?? {});
        for (const [id, v] of Object.entries(pick.rolls ?? {})) parts.push(`${id}: ${v}`);
        return parts.join('; ');
    }

    /** Where starting wounds/fate come from: species record (Kroot/Ork) or home world. */
    #woundsFateSource() {
        const reg = this.registry;
        if (!reg) return null;
        if (this.inputs.species && reg.species?.[this.inputs.species]?.replaces_home_world) {
            const sp = reg.species[this.inputs.species];
            return { wounds: sp.starting_wounds, fate: sp.starting_fate, name: sp.name };
        }
        const hw = this.inputs.steps.home_world?.option;
        const opt = hw ? reg.home_world?.[hw] : null;
        return opt ? { wounds: opt.startingWounds, fate: opt.startingFate, name: opt.name } : null;
    }

    /** State with only the steps BEFORE `step` applied (for legality queries). */
    #stateBefore(step) {
        const saved = { ...this.inputs.steps };
        const idx = ORIGIN_STEPS.indexOf(step);
        for (const s of ORIGIN_STEPS.slice(idx)) delete this.inputs.steps[s];
        this.#rebuild();
        const partial = this.chargenState;
        this.inputs.steps = saved;
        this.#rebuild();
        return partial;
    }

    /* --------------------------------------------------------- */
    /*  Rendering                                                */
    /* --------------------------------------------------------- */

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        if (!this.registry) {
            this.registry = buildRegistry(await loadAllSteps());
        }
        this.#rebuild();
        const s = this.chargenState;

        context.page = this.page;
        context.pages = PAGES.map((p, i) => ({
            ...p,
            num: i + 1,
            active: p.key === this.page,
            done: this.#pageDone(p.key),
        }));
        context.name = this.inputs.name;
        context.stepErrors = this.stepErrors;
        context.originXpSpent = s.originXpSpent;
        context.originXpPool = STARTING_XP_POOL;
        context.showIts = this.showIts;

        switch (this.page) {
            case 'characteristics': this.#ctxCharacteristics(context); break;
            case 'species': this.#ctxSpecies(context); break;
            case 'career': this.#ctxCareer(context); break;
            case 'finish': this.#ctxFinish(context); break;
            default: this.#ctxOriginStep(context, this.page);
        }
        return context;
    }

    #pageDone(key) {
        if (key === 'characteristics') return this.chargenState.hasCharacteristics;
        if (key === 'species') return this.inputs.species !== null;
        if (key === 'career') return !!this.inputs.career;
        if (key === 'finish') return false;
        return !!this.inputs.steps[key]?.option;
    }

    #ctxCharacteristics(context) {
        const base = this.inputs.characteristics.base;
        const isPool = this.method === GenMethod.POOL;
        const profile = this.#speciesProfile();
        context.isCharacteristics = true;
        context.methods = METHODS.map((m) => ({ ...m, selected: m.key === this.method }));
        context.isRoll = this.method === GenMethod.ROLL;
        context.isPool = isPool;
        context.isManual = this.method === GenMethod.MANUAL;
        context.isFixed = this.method === GenMethod.FIXED;
        context.speciesNote = profile
            ? `${this.inputs.species} characteristics roll species-specific dice (shown per row).`
            : null;
        context.pool = this.pool?.map((value, idx) => ({
            value, used: Object.values(this.assignments).includes(idx),
        })) ?? null;
        context.rows = CHARACTERISTICS.map((c) => {
            const v = base[c.abbr];
            const row = {
                abbr: c.abbr,
                full: c.full,
                base: Number.isFinite(v) ? v : '',
                bonus: Number.isFinite(v) ? this.chargenState.bonus(c.abbr) : '—',
                formula: this.#formulaFor(c.abbr),
            };
            if (isPool && this.pool) {
                const own = this.assignments[c.abbr];
                row.poolOptions = this.pool.map((value, idx) => ({
                    idx, value,
                    selected: own === idx,
                    disabled: own !== idx && Object.values(this.assignments).includes(idx),
                }));
            }
            return row;
        });
        context.warnings = rangeWarnings(base);
    }

    #speciesProfile() {
        const sp = this.inputs.species;
        return sp ? this.registry?.species?.[sp]?.char_profile ?? null : null;
    }

    #formulaFor(abbr) {
        const profile = this.#speciesProfile();
        const entry = profile?.[abbr];
        if (!entry) return `2d10+${ROLL_BONUS}`;
        if ('fixed' in entry) return `${entry.fixed} (fixed)`;
        return entry.roll;
    }

    #ctxSpecies(context) {
        context.isSpecies = true;
        const species = Object.values(this.registry.species ?? {});
        context.speciesOptions = [
            { name: '', label: 'Human (default)', selected: !this.inputs.species },
            ...species.map((sp) => ({
                name: sp.name,
                label: `${sp.name} (${sp.source})`,
                selected: this.inputs.species === sp.name,
            })),
        ];
        const sel = this.inputs.species ? this.registry.species[this.inputs.species] : null;
        if (sel) {
            context.speciesDetail = {
                name: sel.name,
                source: `${sel.source} p.${sel.page ?? '?'}`,
                replacesHomeWorld: !!sel.replaces_home_world,
                effects: describeEffects(sel.effects ?? []),
            };
        }
    }

    #ctxOriginStep(context, step) {
        const pageDef = PAGES.find((p) => p.key === step);
        context.isOriginStep = true;
        context.stepKey = step;
        context.stepLabel = pageDef.label;
        context.stepOptional = !!pageDef.optional;

        if (step === 'home_world' && speciesReplacesHomeWorld(this.registry, this.chargenState)) {
            context.stepBlocked =
                `${this.inputs.species} characters replace the Home World step with their species.`;
            return;
        }

        const before = this.#stateBefore(step);
        const legal = legalOptions(this.registry, before, step);
        const pick = this.inputs.steps[step];
        context.options = Object.values(legal)
            .filter((o) => this.showIts || o.source === 'Core')
            .map((o) => ({
                name: o.name,
                label: o.xpCost ? `${o.name} — ${o.xpCost} xp (${o.source})` : o.name,
                selected: pick?.option === o.name,
            }));

        const option = pick?.option ? this.registry[step][pick.option] : null;
        if (option) {
            context.selected = {
                name: option.name,
                source: `${option.source}${option.page ? ` p.${option.page}` : ''}`,
                xpCost: option.xpCost || null,
                substitutesFor: option.substitutesFor.length
                    ? option.substitutesFor.join(', ') : null,
                effects: describeEffects(option.effects),
            };
            // Pending choices/rolls raised by THIS option (source-prefixed).
            const mine = (p) => p.source === option.name || p.source.startsWith(`${option.name} (`);
            context.pendingChoices = this.chargenState.pendingChoices.filter(mine).map((p) => ({
                id: p.id,
                label: p.kind === 'characteristic'
                    ? `${p.source} — ${p.amount >= 0 ? '+' : ''}${p.amount} to one characteristic`
                    : (p.label ?? `${p.source} — choose`),
                // char_mod_choice pendings carry their own abbr pool; generic
                // choices query the interpreter (distinct groups + adjacency).
                options: p.kind === 'characteristic'
                    ? p.options
                    : availableChoiceOptions(this.registry, this.chargenState, p.id,
                        pick.choices, { option }),
            }));
            context.resolvedChoices = Object.entries(pick.choices).map(([id, sel]) => ({ id, sel }));
            context.pendingRolls = this.chargenState.pendingRolls.filter(mine).map((p) => ({
                id: p.id,
                label: `${p.source}: ${p.kind} ${p.dice[0]}d${p.dice[1]}${p.bonus ? `+${p.bonus}` : ''}`,
                dice: `${p.dice[0]}d${p.dice[1]}`,
            }));
            context.resolvedRolls = Object.entries(pick.rolls).map(([id, v]) => ({ id, v }));
        }
    }

    #ctxCareer(context) {
        context.isCareer = true;
        const speciesKey = this.inputs.species ?? 'Human';
        const careers = CAREERS[speciesKey] ?? CAREERS.Human;
        context.careerOptions = careers.map((c) => ({
            name: c, selected: this.inputs.career === c,
        }));
        context.careerNote = speciesKey === 'Human'
            ? 'Career advance tables (Stage 3 XP spend) arrive in a later release — this records the selection.'
            : `${speciesKey} characters must take the ${careers[0]} career (Into the Storm).`;
    }

    #ctxFinish(context) {
        const s = this.chargenState;
        context.isFinish = true;
        const src = this.#woundsFateSource();
        if (src) {
            context.woundsSpec = {
                from: src.name,
                formula: `TB×${src.wounds.tb_multiplier} + ${src.wounds.dice[0]}d${src.wounds.dice[1]}`
                    + (src.wounds.flat ? ` + ${src.wounds.flat}` : ''),
                dice: `${src.wounds.dice[0]}d${src.wounds.dice[1]}`,
                roll: this.inputs.woundsRoll,
                total: s.wounds,
                bonus: s.woundBonus || null,
            };
            context.fateSpec = {
                roll: this.inputs.fateRoll,
                total: s.fate,
                adjustment: s.fateAdjustment || null,
            };
        }
        context.summary = {
            name: s.name || 'New Explorer',
            species: s.species ?? 'Human',
            career: s.career,
            characteristics: ABBRS.map((a) => ({ abbr: a, value: s.value(a), bonus: s.bonus(a) })),
            origin: ORIGIN_STEPS.filter((st) => s.origin[st]).map((st) => ({
                label: PAGES.find((p) => p.key === st).label,
                value: s.origin[st],
                notes: s.originNotes[st] || null,
            })),
            skills: Object.entries(s.skills).map(([n, l]) => `${n} (${l})`).sort(),
            talents: [...s.talents].sort(),
            traits: s.traits.map((t) => t.name).sort(),
            insanity: s.insanity,
            corruption: s.corruption,
            profitFactor: s.profitFactor,
            shipPoints: s.shipPointsContributed,
            xpSpent: s.originXpSpent,
            pendingCount: s.pendingChoices.length + s.pendingRolls.length,
        };
        context.incomplete = [];
        if (!s.hasCharacteristics) context.incomplete.push('Characteristics are not complete.');
        for (const st of ['home_world', 'birthright', 'lure_of_the_void', 'trials_and_travails', 'motivation']) {
            if (st === 'home_world' && speciesReplacesHomeWorld(this.registry, s)) continue;
            if (!s.origin[st]) context.incomplete.push(`No ${PAGES.find((p) => p.key === st).label} selected.`);
        }
        if (s.pendingChoices.length || s.pendingRolls.length) {
            context.incomplete.push('Unresolved choices/rolls remain on earlier steps.');
        }
        if (src && s.wounds === null) context.incomplete.push('Starting Wounds not rolled/entered.');
        if (src && s.fate === null) context.incomplete.push('Starting Fate not rolled/entered.');
        context.canCommit = s.hasCharacteristics;
        context.isGM = game.user.isGM;
        context.commitLabel = this.actor ? `Apply to ${this.actor.name}` : 'Create Character';
    }

    /* --------------------------------------------------------- */
    /*  Listeners                                                */
    /* --------------------------------------------------------- */

    async _onRender(context, options) {
        await super._onRender(context, options);
        const el = this.element;
        const on = (selector, handler) => {
            for (const node of el.querySelectorAll(selector)) {
                node.addEventListener('change', handler);
            }
        };

        on('input[name="charname"]', (ev) => {
            this.inputs.name = ev.currentTarget.value.trim();
        });
        on('select[name="method"]', (ev) => { this.method = ev.currentTarget.value; this.render(); });
        on('input[name="show-its"]', (ev) => { this.showIts = ev.currentTarget.checked; this.render(); });

        on('input[data-abbr]', (ev) => {
            const v = parseInt(ev.currentTarget.value, 10);
            const abbr = ev.currentTarget.dataset.abbr;
            if (Number.isFinite(v)) this.inputs.characteristics.base[abbr] = v;
            else delete this.inputs.characteristics.base[abbr];
            this.inputs.characteristics.method = GenMethod.MANUAL;
            this.render();
        });
        on('select[data-abbr]', (ev) => {
            const abbr = ev.currentTarget.dataset.abbr;
            const idx = ev.currentTarget.value;
            if (idx === '') delete this.assignments[abbr];
            else this.assignments[abbr] = parseInt(idx, 10);
            this.#applyAssignments();
            this.render();
        });

        on('select[name="species"]', (ev) => {
            this.inputs.species = ev.currentTarget.value || null;
            this.render();
        });
        on('select[name="career"]', (ev) => {
            this.inputs.career = ev.currentTarget.value || null;
            this.render();
        });
        on('select[data-step-option]', (ev) => {
            const step = ev.currentTarget.dataset.stepOption;
            const name = ev.currentTarget.value;
            if (!name) delete this.inputs.steps[step];
            else this.inputs.steps[step] = { option: name, choices: {}, rolls: {} };
            this.render();
        });
        on('select[data-choice-id]', (ev) => {
            const step = ev.currentTarget.dataset.choiceStep;
            const id = ev.currentTarget.dataset.choiceId;
            const pick = this.inputs.steps[step];
            if (!pick) return;
            if (ev.currentTarget.value) pick.choices[id] = ev.currentTarget.value;
            else delete pick.choices[id];
            this.render();
        });
        on('input[data-roll-id]', (ev) => {
            const step = ev.currentTarget.dataset.rollStep;
            const id = ev.currentTarget.dataset.rollId;
            const pick = this.inputs.steps[step];
            if (!pick) return;
            const v = parseInt(ev.currentTarget.value, 10);
            if (Number.isFinite(v)) pick.rolls[id] = v;
            else delete pick.rolls[id];
            this.render();
        });
        on('input[name="wounds-roll"]', (ev) => {
            const v = parseInt(ev.currentTarget.value, 10);
            this.inputs.woundsRoll = Number.isFinite(v) ? v : null;
            this.render();
        });
        on('input[name="fate-roll"]', (ev) => {
            const v = parseInt(ev.currentTarget.value, 10);
            this.inputs.fateRoll = Number.isFinite(v) ? v : null;
            this.render();
        });
    }

    #applyAssignments() {
        const base = {};
        for (const [abbr, idx] of Object.entries(this.assignments)) base[abbr] = this.pool[idx];
        this.inputs.characteristics = { method: GenMethod.POOL, base };
    }

    /* --------------------------------------------------------- */
    /*  Dice (chat-visible; manual entry always available)       */
    /* --------------------------------------------------------- */

    async #chatRoll(formula, flavor) {
        const r = new Roll(formula);
        await r.evaluate();
        await r.toMessage({ flavor });
        return r;
    }

    static _onNavPage(event, target) {
        this.page = target.dataset.page;
        this.render();
    }

    static async _onRollAll() {
        const base = {};
        const rolls = [];
        for (const c of CHARACTERISTICS) {
            const formula = this.#formulaFor(c.abbr);
            if (formula.endsWith('(fixed)')) {
                base[c.abbr] = parseInt(formula, 10);
                continue;
            }
            const r = new Roll(formula.replace('+', ' + '));
            await r.evaluate();
            base[c.abbr] = r.total;
            rolls.push(`<strong>${c.abbr}</strong>: ${r.total}`);
        }
        this.inputs.characteristics = { base, method: GenMethod.ROLL };
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            flavor: `Characteristics — ${this.inputs.species ?? 'Human'} generation`,
            content: `<p>${rolls.join('<br>')}</p>`,
            sound: CONFIG.sounds.dice,
        });
        this.render();
    }

    static async _onRollOne(event, target) {
        const abbr = target.dataset.abbr;
        const formula = this.#formulaFor(abbr);
        if (formula.endsWith('(fixed)')) {
            this.inputs.characteristics.base[abbr] = parseInt(formula, 10);
        } else {
            const r = await this.#chatRoll(formula.replace('+', ' + '), `${abbr} — ${formula}`);
            this.inputs.characteristics.base[abbr] = r.total;
        }
        this.inputs.characteristics.method ??= GenMethod.ROLL;
        this.render();
    }

    static async _onRollPool() {
        const rolls = [];
        for (const _ of ABBRS) {
            const r = new Roll(`2d10 + ${ROLL_BONUS}`);
            await r.evaluate();
            rolls.push(r.total);
        }
        this.pool = rolls;
        this.assignments = {};
        this.inputs.characteristics = { method: GenMethod.POOL, base: {} };
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            flavor: 'Characteristics pool — nine 2d10+25, assign freely',
            content: `<p>${rolls.join(', ')}</p>`,
            sound: CONFIG.sounds.dice,
        });
        this.render();
    }

    static async _onAssignPool() {
        if (!this.pool) return;
        this.assignments = {};
        ABBRS.forEach((a, i) => { this.assignments[a] = i; });
        this.#applyAssignments();
        this.render();
    }

    static async _onFillFixed() {
        const base = {};
        for (const a of ABBRS) base[a] = 36;
        this.inputs.characteristics = { base, method: GenMethod.FIXED };
        this.render();
    }

    static async _onRollPending(event, target) {
        const { rollStep: step, rollId: id, rollDice: dice } = target.dataset;
        const pick = this.inputs.steps[step];
        if (!pick) return;
        const r = await this.#chatRoll(dice, `${id} — ${dice}`);
        pick.rolls[id] = r.total;
        this.render();
    }

    static async _onSkipStep(event, target) {
        delete this.inputs.steps[target.dataset.step];
        this.render();
    }

    static async _onRollWounds() {
        const src = this.#woundsFateSource();
        if (!src) return;
        const [n, sides] = src.wounds.dice;
        const r = await this.#chatRoll(`${n}d${sides}`, `Starting Wounds dice (${src.name})`);
        this.inputs.woundsRoll = r.total;
        this.render();
    }

    static async _onRollFate() {
        const src = this.#woundsFateSource();
        if (!src) return;
        const r = await this.#chatRoll('1d10', `Starting Fate (${src.name})`);
        this.inputs.fateRoll = r.total;
        this.render();
    }

    static async _onApplyPfWorld() {
        const ok = await applyProfitFactorToWorld(this.chargenState);
        if (ok) {
            ui.notifications.info(
                `World Profit Factor increased by ${this.chargenState.profitFactor}.`);
        }
    }

    /* --------------------------------------------------------- */
    /*  Commit                                                   */
    /* --------------------------------------------------------- */

    static async _onCommit() {
        this.#rebuild();
        if (!this.chargenState.hasCharacteristics) {
            ui.notifications.warn('All nine characteristics need a value first.');
            return;
        }
        if (this.actor) {
            if (hasExistingCharacteristics(this.actor)) {
                const ok = await DialogV2.confirm({
                    window: { title: 'Overwrite characteristics?' },
                    content: `<p><strong>${this.actor.name}</strong> already has characteristic values. Overwrite them with the wizard's?</p>`,
                    modal: true,
                });
                if (!ok) return;
            }
            await applyToActor(this.actor, this.chargenState);
            ui.notifications.info(`Chargen applied to ${this.actor.name}.`);
            this.actor.sheet.render(true);
        } else {
            const actor = await createActor(this.chargenState);
            ui.notifications.info(`${actor.name} created.`);
            actor.sheet.render(true);
        }
        this.close();
    }
}

/* ------------------------------------------------------------------------ */
/*  Effect descriptions (UI summaries of declarative effects)                */
/* ------------------------------------------------------------------------ */

function describeEffects(effects) {
    const out = [];
    for (const e of effects) {
        switch (e.type) {
            case 'char_mod':
                out.push(`${e.amount >= 0 ? '+' : ''}${e.amount} ${e.char}`); break;
            case 'char_mod_choice': {
                const pool = e.pool === 'any' || !e.pool ? 'any characteristic' : e.pool.join('/');
                out.push(`${e.amount >= 0 ? '+' : ''}${e.amount} to one of ${pool} (your choice)`); break;
            }
            case 'grant_skill': out.push(`Skill: ${e.skill} (${e.level})`); break;
            case 'grant_talent':
                out.push(`Talent: ${e.talent}${e.condition
                    ? ` (if ${e.condition.char} ≥ ${e.condition.min})` : ''}`); break;
            case 'trait': out.push(`Trait: ${e.name}`); break;
            case 'profit_factor': out.push(`Profit Factor ${e.amount >= 0 ? '+' : ''}${e.amount}`); break;
            case 'ship_points': out.push(`Ship Points ${e.amount >= 0 ? '+' : ''}${e.amount}`); break;
            case 'fate': out.push(`Fate ${e.amount >= 0 ? '+' : ''}${e.amount}`); break;
            case 'wounds': out.push(`Wounds ${e.amount >= 0 ? '+' : ''}${e.amount}`); break;
            case 'insanity':
            case 'corruption':
                out.push(e.amount !== undefined && e.amount !== null
                    ? `${e.type} +${e.amount}`
                    : `${e.type} +${e.dice[0]}d${e.dice[1]}${e.bonus ? `+${e.bonus}` : ''} (roll)`); break;
            case 'origin_xp_cost': out.push(`Costs ${e.amount} xp from the starting pool`); break;
            case 'choice':
                out.push(`Choice: ${e.options.map((o) => o.label).join(' / ')}`); break;
            case 'substitute':
                out.push(`Replaces ${e.target.kind} ${e.target.name}`); break;
            default: out.push(e.type);
        }
    }
    return out;
}
