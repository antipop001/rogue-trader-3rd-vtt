import { ActorContainerSheet } from './actor-container-sheet.mjs';
import { DHTargetedActionManager } from '../../actions/targeted-action-manager.mjs';
import { Hit } from '../../rolls/damage-data.mjs';
import { AssignDamageData } from '../../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../../prompts/assign-damage-prompt.mjs';

export class VoidshipSheet extends ActorContainerSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 1000,
            height: 750,
            resizable: true,
            tabs: [{ navSelector: '.rt-navigation', contentSelector: '.rt-body', initial: 'main' }],
        });
    }

    get template() {
        return `systems/rogue-trader-3rd/templates/actor/actor-voidship-sheet.hbs`;
    }

    getData() {
        const context = super.getData();
        context.rt = CONFIG.rt;
        const items = this.actor.items;
        const sortedItems = Array.from(items).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        context.items = sortedItems;
        return context;
    }

    async _onItemDamage(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        game.rt.warn('Not Implemented for Vehicles Yet');
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find("[name^='items.']").on("change", async (event) => {
            const input = event.currentTarget;
            const name = input.name; // e.g. items.abc123.system.isOnFire
            const itemId = name.split(".")[1];
            const path = name.split(".").slice(2).join("."); // system.isOnFire, system.hitPoints, etc.
            const dtype = input.dataset.dtype || "String";

            const item = this.actor.items.get(itemId);
            if (!item) return;

            let value;
            if (input.type === "checkbox") {
                value = input.checked;
            } else if (dtype === "Number") {
                value = parseFloat(input.value) || 0;
            } else if (dtype === "Boolean") {
                value = input.checked;
            } else {
                value = input.value;
            }

            await item.update({ [path]: value });
        });
        html.find('.combat-control').click(async (ev) => await this._combatControls(ev));
    }

    async _combatControls(event) {
        event.preventDefault();
        const target = event.currentTarget;

        switch(target.dataset.action) {
            case 'turrets':
                await this.actor.rollTurrets();
                break;
            case 'movement':
                console.log(this.actor);
                await this.actor.rollCrew("Maneuver", this.actor.system.operator.helm);
                break;
            case 'boarding':
                await this.actor.rollBoarding(this.actor.system.operator.boarding);
                break;
            case 'detection':
                await this.actor.rollCrew("Detection", this.actor.system.operator.augurs);
                break;
            case 'crew':
                await this.actor.rollCrew("Crew", 0);
                break;
            case 'initiative':
                await game.rt.shipInitiative();
                break;
            case 'manoeuvre':
                await game.rt.shipManoeuvre(this.actor, 'full', 0);
                break;
        }
    }
}
