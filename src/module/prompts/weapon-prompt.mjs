import { recursiveUpdate } from '../rolls/roll-helpers.mjs';
import { WeaponActionData } from '../rolls/action-data.mjs';

export class WeaponAttackDialog extends FormApplication {
    /**
     * @param weaponActionData {WeaponActionData}
     * @param options
     */
    constructor(weaponActionData = {}, options = {}) {
        super(weaponActionData, options);
        this.weaponAttackData = weaponActionData;
        this.data = weaponActionData.rollData;
        this.initialized = false;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: 'Weapon Attack',
            id: 'rt-weapon-attack-dialog',
            template: 'systems/rogue-trader-3rd/templates/prompt/weapon-roll-prompt.hbs',
            width: 500,
            closeOnSubmit: false,
            submitOnChange: true,
            classes: ['dialog'],
        });
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.weapon-select').change(async (ev) => await this._updateWeapon(ev));
        html.find('#attack-roll').click(async (ev) => await this._rollAttack(ev));
        html.find('#attack-cancel').click(async (ev) => await this._cancelAttack(ev));
    }

    async _updateWeapon(event) {
        this.data.selectWeapon(event.target.name);
        await this.data.update();
        this.render(true);
    }

    async getData() {
        // Initial Values
        if (!this.initialized) {
            this.data.initialize();
            this.initialized = true;
        }
        await this.data.update();
        return this.data;
    }

    async _updateObject(event, formData) {
        game.rt.log('_updateObject', { event, formData });
        recursiveUpdate(this.data, formData);
        game.rt.log('_updateObject complete', { 'data': this.data, formData });
        await this.data.update();
        this.render(true);
    }

    async _cancelAttack(event) {
        await this.close();
    }

    async _rollAttack(event) {
        if(this.data.fireRate === 0) {
            ui.notifications.warn(`Not enough ammo to perform action. Do you need to reload?`);
            return;
        }

        await this.data.finalize();
        await this.weaponAttackData.performActionAndSendToChat();
        await this.close();
    }
}

/**
 *
 * @param weaponAttackData {WeaponActionData}
 */
export async function prepareWeaponRoll(weaponAttackData) {
    // RT Core p.238: a jammed weapon can't be fired until cleared. Block the attack dialog
    // for the selected weapon while it's jammed. (QA-105.)
    const weapon = weaponAttackData?.rollData?.weapon;
    if (weapon?.system?.jammed) {
        ui.notifications?.warn(`${weapon.name} is jammed — use "Clear Jam" on the weapon sheet (a Full Action Ballistic Skill Test) before firing again.`);
        return;
    }
    const prompt = new WeaponAttackDialog(weaponAttackData);
    prompt.render(true);
}
