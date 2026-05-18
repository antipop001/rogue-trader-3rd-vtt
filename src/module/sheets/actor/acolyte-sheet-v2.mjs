import { ActorContainerSheetV2 } from './actor-container-sheet-v2.mjs';
import { DHBasicActionManager } from '../../actions/basic-action-manager.mjs';
import { DHTargetedActionManager } from '../../actions/targeted-action-manager.mjs';
import { Hit } from '../../rolls/damage-data.mjs';
import { AssignDamageData } from '../../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../../prompts/assign-damage-prompt.mjs';
import { prepareCreateSpecialistSkillPrompt } from '../../prompts/simple-prompt.mjs';

export class AcolyteSheetV2 extends ActorContainerSheetV2 {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'sheet', 'actor', 'acolyte'],
        actions: {
            rollCharacteristic: AcolyteSheetV2._onRollCharacteristic,
            rollSkill: AcolyteSheetV2._onRollSkill,
            bonusVocalize: AcolyteSheetV2._onBonusVocalize,
            attack: AcolyteSheetV2._onCombatAttack,
            'assign-damage': AcolyteSheetV2._onAssignDamage,
            dodge: AcolyteSheetV2._onDodge,
            parry: AcolyteSheetV2._onParry,
            addSkill: AcolyteSheetV2._onAddSkill,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/rogue-trader-3rd/templates/actor/actor-acolyte-sheet.hbs',
            root: true,
            scrollable: ['.rt-body'],
        },
    };

    tabGroups = { primary: 'main' };

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

        if (!this.isEditable) return;

        const hw = this.element.querySelector('select.acolyte-homeWorld');
        if (hw) hw.addEventListener('change', (ev) => this._onHomeworldChange(ev));
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

    static async _onBonusVocalize(event, target) {
        const bonus = this.actor.backgroundEffects?.abilities?.find(a => a.name === target.dataset.bonusName);
        if (!bonus) return;
        await DHBasicActionManager.sendItemVocalizeChat({
            actor: this.actor.name,
            name: bonus.name,
            type: bonus.source,
            description: bonus.benefit,
        });
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

    /* --------------------------------------------------------- */
    /*  Homeworld-change prompt                                  */
    /* --------------------------------------------------------- */

    _onHomeworldChange(event) {
        event.preventDefault();
        foundry.applications.api.DialogV2.confirm({
            window: { title: 'Roll Characteristics?' },
            content: '<p>Would you like to roll Wounds and Fate for this homeworld?</p>',
            modal: true,
        }).then(async (yes) => {
            if (!yes) return;
            if (!this.actor.backgroundEffects?.homeworld) return;

            const woundRoll = new Roll(this.actor.backgroundEffects.homeworld.wounds);
            await woundRoll.evaluate();
            this.actor.wounds.max = woundRoll.total;

            const fateRoll = new Roll('1d10');
            await fateRoll.evaluate();
            this.actor.fate.max =
                parseInt(this.actor.backgroundEffects.homeworld.fate_threshold) +
                (fateRoll.total >= this.actor.backgroundEffects.homeworld.emperors_blessing ? 1 : 0);
            this.render(true);
        });
    }
}
