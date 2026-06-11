import { ChargenState } from '../chargen/state.mjs';
import {
    ABBRS,
    CHARACTERISTICS,
    GenMethod,
    ROLL_BONUS,
    rangeWarnings,
} from '../chargen/characteristics.mjs';
import { applyToActor, createActor, hasExistingCharacteristics } from '../chargen/commit.mjs';

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const METHODS = [
    { key: GenMethod.ROLL, label: 'Roll (2d10+25 each, in order)' },
    { key: GenMethod.POOL, label: 'Roll a pool, assign freely' },
    { key: GenMethod.MANUAL, label: 'Enter rolled values (physical dice)' },
    { key: GenMethod.FIXED, label: 'Fixed baseline (no luck)' },
];

const STAGES = [
    { num: 1, label: 'Characteristics' },
    { num: 2, label: 'Origin Path', locked: true },
    { num: 3, label: 'Career & XP', locked: true },
    { num: 4, label: 'Gear', locked: true },
];

/**
 * Guided character-creation wizard (Stage A: Characteristics).
 *
 * Pass `{actor}` to resume/apply onto an existing acolyte (restores a stored
 * `flags.rt.chargen` state when present); without an actor, commit creates a
 * new acolyte. Every rolled value can instead be typed in by the player —
 * physical dice at the table are first-class.
 */
export class ChargenWizard extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'rt-chargen-app'],
        position: { width: 780, height: 620 },
        window: {
            title: 'Character Creation — Rogue Trader',
            icon: 'fa-solid fa-hat-wizard',
            resizable: true,
            contentClasses: ['rt-chargen'],
        },
        actions: {
            rollAll: ChargenWizard._onRollAll,
            rollOne: ChargenWizard._onRollOne,
            rollPool: ChargenWizard._onRollPool,
            assignPool: ChargenWizard._onAssignPool,
            fillFixed: ChargenWizard._onFillFixed,
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
        const stored = this.actor?.getFlag('rt', 'chargen');
        this.chargenState = ChargenState.fromJSON(stored);
        if (this.actor && !this.chargenState.name) this.chargenState.name = this.actor.name;
        this.method = this.chargenState.characteristics.method ?? GenMethod.ROLL;
        this.pool = null;          // rolled pool values (POOL method)
        this.assignments = {};     // abbr -> pool index
    }

    /* --------------------------------------------------------- */
    /*  Rendering                                                */
    /* --------------------------------------------------------- */

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const base = this.chargenState.characteristics.base;
        const isPool = this.method === GenMethod.POOL;

        context.stages = STAGES.map((s) => ({ ...s, active: s.num === 1 }));
        context.name = this.chargenState.name;
        context.methods = METHODS.map((m) => ({ ...m, selected: m.key === this.method }));
        context.isRoll = this.method === GenMethod.ROLL;
        context.isPool = isPool;
        context.isManual = this.method === GenMethod.MANUAL;
        context.isFixed = this.method === GenMethod.FIXED;

        context.pool = this.pool?.map((value, idx) => ({
            value,
            used: Object.values(this.assignments).includes(idx),
        })) ?? null;

        context.rows = CHARACTERISTICS.map((c) => {
            const v = base[c.abbr];
            const row = {
                abbr: c.abbr,
                full: c.full,
                base: Number.isFinite(v) ? v : '',
                bonus: Number.isFinite(v) ? this.chargenState.bonus(c.abbr) : '—',
            };
            if (isPool && this.pool) {
                const own = this.assignments[c.abbr];
                row.poolOptions = this.pool.map((value, idx) => ({
                    idx,
                    value,
                    selected: own === idx,
                    disabled: own !== idx && Object.values(this.assignments).includes(idx),
                }));
            }
            return row;
        });

        context.warnings = rangeWarnings(base);
        context.canCommit = this.chargenState.hasCharacteristics;
        context.commitLabel = this.actor ? `Apply to ${this.actor.name}` : 'Create Character';
        return context;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const el = this.element;

        el.querySelector('input[name="charname"]')?.addEventListener('change', (ev) => {
            this.chargenState.name = ev.currentTarget.value.trim();
        });

        el.querySelector('select[name="method"]')?.addEventListener('change', (ev) => {
            this.method = ev.currentTarget.value;
            this.render();
        });

        // Direct edits are player-entered values — record the set as MANUAL.
        for (const input of el.querySelectorAll('input[data-abbr]')) {
            input.addEventListener('change', (ev) => {
                const v = parseInt(ev.currentTarget.value, 10);
                const abbr = ev.currentTarget.dataset.abbr;
                if (Number.isFinite(v)) this.chargenState.characteristics.base[abbr] = v;
                else delete this.chargenState.characteristics.base[abbr];
                this.chargenState.characteristics.method = GenMethod.MANUAL;
                this.render();
            });
        }

        for (const select of el.querySelectorAll('select[data-abbr]')) {
            select.addEventListener('change', (ev) => {
                const abbr = ev.currentTarget.dataset.abbr;
                const idx = ev.currentTarget.value;
                if (idx === '') delete this.assignments[abbr];
                else this.assignments[abbr] = parseInt(idx, 10);
                this.#applyAssignments();
                this.render();
            });
        }
    }

    #applyAssignments() {
        const base = {};
        for (const [abbr, idx] of Object.entries(this.assignments)) base[abbr] = this.pool[idx];
        this.chargenState.characteristics = { method: GenMethod.POOL, base };
    }

    /* --------------------------------------------------------- */
    /*  Dice (chat-visible; manual entry always available)       */
    /* --------------------------------------------------------- */

    async #rollMany(count) {
        const rolls = [];
        for (let i = 0; i < count; i++) {
            const r = new Roll(`2d10 + ${ROLL_BONUS}`);
            await r.evaluate();
            rolls.push(r);
        }
        return rolls;
    }

    async #postRolls(flavor, lines, rolls) {
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            flavor,
            content: `<p>${lines.join('<br>')}</p>`,
            rolls,
            sound: CONFIG.sounds.dice,
        });
    }

    static async _onRollAll() {
        const rolls = await this.#rollMany(ABBRS.length);
        const base = {};
        ABBRS.forEach((a, i) => { base[a] = rolls[i].total; });
        this.chargenState.setCharacteristics({ base, method: GenMethod.ROLL });
        await this.#postRolls(
            'Characteristics — 2d10+25 in order',
            ABBRS.map((a, i) => `<strong>${a}</strong>: ${rolls[i].total}`),
            rolls,
        );
        this.render();
    }

    static async _onRollOne(event, target) {
        const abbr = target.dataset.abbr;
        const [roll] = await this.#rollMany(1);
        this.chargenState.characteristics.base[abbr] = roll.total;
        this.chargenState.characteristics.method ??= GenMethod.ROLL;
        await roll.toMessage({ flavor: `${abbr} — 2d10+25` });
        this.render();
    }

    static async _onRollPool() {
        const rolls = await this.#rollMany(ABBRS.length);
        this.pool = rolls.map((r) => r.total);
        this.assignments = {};
        this.chargenState.characteristics = { method: GenMethod.POOL, base: {} };
        await this.#postRolls(
            'Characteristics pool — nine 2d10+25, assign freely',
            [this.pool.join(', ')],
            rolls,
        );
        this.render();
    }

    /** Assign the rolled pool to the nine characteristics in sheet order. */
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
        this.chargenState.setCharacteristics({ base, method: GenMethod.FIXED });
        this.render();
    }

    /* --------------------------------------------------------- */
    /*  Commit                                                   */
    /* --------------------------------------------------------- */

    static async _onCommit() {
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
            ui.notifications.info(`Characteristics applied to ${this.actor.name}.`);
            this.actor.sheet.render(true);
        } else {
            const actor = await createActor(this.chargenState);
            ui.notifications.info(`${actor.name} created.`);
            actor.sheet.render(true);
        }
        this.close();
    }
}
