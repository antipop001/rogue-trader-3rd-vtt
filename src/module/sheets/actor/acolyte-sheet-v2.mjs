import { ActorContainerSheetV2 } from './actor-container-sheet-v2.mjs';
import { DHBasicActionManager } from '../../actions/basic-action-manager.mjs';
import { DHTargetedActionManager } from '../../actions/targeted-action-manager.mjs';
import { Hit } from '../../rolls/damage-data.mjs';
import { AssignDamageData } from '../../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../../prompts/assign-damage-prompt.mjs';
import { prepareCreateSpecialistSkillPrompt } from '../../prompts/simple-prompt.mjs';
import { ChargenWizard } from '../../applications/chargen-wizard.mjs';

export class AcolyteSheetV2 extends ActorContainerSheetV2 {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'sheet', 'actor', 'acolyte'],
        actions: {
            rollCharacteristic: AcolyteSheetV2._onRollCharacteristic,
            rollSkill: AcolyteSheetV2._onRollSkill,
            attack: AcolyteSheetV2._onCombatAttack,
            'assign-damage': AcolyteSheetV2._onAssignDamage,
            dodge: AcolyteSheetV2._onDodge,
            parry: AcolyteSheetV2._onParry,
            addSkill: AcolyteSheetV2._onAddSkill,
            openChargen: AcolyteSheetV2._onOpenChargen,
            fearTest: AcolyteSheetV2._onFearTest,
            grapple: AcolyteSheetV2._onGrapple,
            takeCover: AcolyteSheetV2._onTakeCover,
            operateVehicle: AcolyteSheetV2._onOperateVehicle,
            restDay: AcolyteSheetV2._onRestDay,
            restWeek: AcolyteSheetV2._onRestWeek,
            spendFate: AcolyteSheetV2._onSpendFate,
            burnFate: AcolyteSheetV2._onBurnFate,
        },
    };

    /**
     * Append a Character Creation control (opens/resumes the chargen wizard).
     * CHARGEN BUILDER SHELVED (2026-06-23): the control is not exposed while the
     * in-Foundry wizard is parked (see ralph/chargen) and kept out of releases.
     * Re-enable by flipping CHARGEN_UI_ENABLED + the renderActorDirectory hook in
     * hooks-manager.mjs. The handler and wizard code are left intact.
     */
    static CHARGEN_UI_ENABLED = false;

    _getHeaderControls() {
        const controls = super._getHeaderControls();
        if (AcolyteSheetV2.CHARGEN_UI_ENABLED && this.isEditable) {
            controls.push({
                icon: 'fa-solid fa-hat-wizard',
                label: 'Character Creation',
                action: 'openChargen',
            });
        }
        // Fear Test control (QA-081) — opens a dialog to roll a Willpower Fear Test
        // against a source's Fear Rating; combat failures draw the Shock Table.
        if (this.isEditable) {
            controls.push({
                icon: 'fa-solid fa-ghost',
                label: 'Fear Test',
                action: 'fearTest',
            });
            // Grapple control (QA-122) — opposed Strength Test vs the targeted opponent.
            controls.push({
                icon: 'fa-solid fa-hand-fist',
                label: 'Grapple',
                action: 'grapple',
            });
            // Take Cover control (QA-111) — set/clear the character's cover Armour Points.
            controls.push({
                icon: 'fa-solid fa-shield-halved',
                label: 'Take Cover',
                action: 'takeCover',
            });
            // Operate Vehicle control (QA-116) — link an active vehicle so its Manoeuvrability
            // modifies Drive/Pilot Tests.
            controls.push({
                icon: 'fa-solid fa-car-side',
                label: 'Operate Vehicle',
                action: 'operateVehicle',
            });
        }
        return controls;
    }

    static _onOpenChargen() {
        new ChargenWizard({ actor: this.actor }).render(true);
    }

    static _onFearTest() {
        game.rt.fearTest(this.actor);
    }

    static _onGrapple() {
        game.rt.grapple(this.actor);
    }

    static _onTakeCover() {
        game.rt.takeCover(this.actor);
    }

    static _onOperateVehicle() {
        game.rt.operateVehicle(this.actor);
    }

    static async _onRestDay() {
        await this.actor.applyRest('day');
    }

    static async _onRestWeek() {
        await this.actor.applyRest('week');
    }

    static async _onSpendFate(event, target) {
        await this.actor.spendFate(target.dataset.fateKind);
    }

    static async _onBurnFate() {
        await this.actor.burnFate();
    }

    static PARTS = {
        body: {
            template: 'systems/rogue-trader-3rd/templates/actor/actor-acolyte-sheet.hbs',
            root: true,
            scrollable: ['.rt-body'],
        },
    };

    tabGroups = { primary: 'character' };

    async _prepareContext(options) {
        const isObserver = this.actor.testUserPermission(game.user, 'OBSERVER');
        const isOwner = this.actor.testUserPermission(game.user, 'OWNER');
        if (!isObserver && !isOwner) {
            return {
                actor: { name: this.actor.name, img: this.actor.img },
                limited: true,
            };
        }

        const context = await super._prepareContext(options);
        context.tabs = this.tabGroups;
        return context;
    }

    /** Activate the initial tab on first render and wire the homeworld-change prompt. */
    async _onRender(context, options) {
        await super._onRender(context, options);

        // V2's tab framework only activates tabs on click; first render needs an explicit pass.
        const initial = this.tabGroups.primary ?? 'main';
        this.changeTab(initial, 'primary', { force: true, updatePosition: false });

        this._wireSkillFilter();
    }

    /**
     * Client-side filter for the merged Skills panel: a search box + type chips
     * (All / Trained / Basic / Advanced / Specialist) show/hide skill rows without
     * a re-render. Re-wired every render (the DOM is rebuilt). No-op on sheets
     * without the merged panel (e.g. the NPC template).
     */
    _wireSkillFilter() {
        const root = this.element;
        const search = root?.querySelector('.rt-skill-search');
        const chips = root ? Array.from(root.querySelectorAll('.rt-skill-chip')) : [];
        const columns = root?.querySelector('.rt-skill-columns');
        if (!columns || !chips.length) return;

        const rows = Array.from(columns.querySelectorAll('.rt-skill-item'));
        const groups = Array.from(columns.querySelectorAll('.rt-skill-group'));
        const cols = Array.from(columns.querySelectorAll('.rt-skill-col'));
        let type = 'all';

        const apply = () => {
            const q = (search?.value || '').trim().toLowerCase();
            for (const r of rows) {
                const nm = (r.querySelector('.roll-skill')?.textContent || '').toLowerCase();
                const okType = type === 'all'
                    || (type === 'trained' ? r.dataset.skillTrained === '1' : r.dataset.skillCol === type);
                r.style.display = (okType && (!q || nm.includes(q))) ? '' : 'none';
            }
            // The specialist "pick specialities" group rows only make sense unfiltered.
            const showGroups = (type === 'all' || type === 'specialist') && !q;
            for (const g of groups) g.style.display = showGroups ? '' : 'none';
            // Collapse to only the relevant column(s) when a single type is chosen.
            let shown = 0;
            for (const c of cols) {
                const key = c.dataset.skillCol;
                const visible = type === 'all' || type === 'trained' || type === key;
                c.style.display = visible ? '' : 'none';
                if (visible) shown++;
            }
            columns.style.gridTemplateColumns = `repeat(${shown || 1}, 1fr)`;
        };

        search?.addEventListener('input', apply);
        for (const c of chips) {
            c.addEventListener('click', () => {
                type = c.dataset.filter;
                chips.forEach((x) => x.classList.toggle('is-active', x === c));
                apply();
            });
        }
        apply();
    }

    /* --------------------------------------------------------- */
    /*  Acolyte-specific action handlers                         */
    /* --------------------------------------------------------- */

    static async _onRollCharacteristic(event, target) {
        await this.actor.rollCharacteristic(target.dataset.characteristic);
    }

    static async _onRollSkill(event, target) {
        await this.actor.rollSkill(target.dataset.skill, target.dataset.specialty);
    }

    static async _onCombatAttack(event, target) {
        await DHTargetedActionManager.performWeaponAttack(this.actor);
    }

    static async _onAssignDamage(event, target) {
        const hitData = new Hit();
        const assignData = new AssignDamageData(this.actor, hitData);
        await prepareAssignDamageRoll(assignData);
    }

    static async _onDodge(event, target) { await this.actor.rollSkill('dodge'); }
    static async _onParry(event, target) { await this.actor.rollSkill('parry'); }

    static async _onAddSkill(event, target) {
        const skillName = target.dataset.skill;
        const skill = this.actor.system.skills[skillName];
        if (!skill) {
            ui.notifications.warn('Skill not specified -- unexpected error.');
            return;
        }
        await prepareCreateSpecialistSkillPrompt({ actor: this.actor, skill, skillName });
    }
}
