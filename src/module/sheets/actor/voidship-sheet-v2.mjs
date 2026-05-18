import { ActorContainerSheetV2 } from './actor-container-sheet-v2.mjs';

export class VoidshipSheetV2 extends ActorContainerSheetV2 {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'sheet', 'actor', 'voidship'],
        actions: {
            // Combat-control roll buttons in the panel headers (turrets/movement/etc.).
            turrets: VoidshipSheetV2._onCombatTurrets,
            movement: VoidshipSheetV2._onCombatMovement,
            boarding: VoidshipSheetV2._onCombatBoarding,
            detection: VoidshipSheetV2._onCombatDetection,
            crew: VoidshipSheetV2._onCombatCrew,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/rogue-trader-3rd/templates/actor/actor-voidship-sheet.hbs',
            root: true,
            scrollable: ['.rt-body'],
        },
    };

    static async _onItemDamage(event, target) {
        game.rt.warn('Not Implemented for Voidships Yet');
    }

    /**
     * The voidship sheet has scattered inputs named `items.<id>.system.<path>` that update
     * embedded items inline (e.g. component on-fire checkboxes). V2's automatic form
     * submission would try to write these to the actor itself, so we intercept here:
     * group them by item, apply via updateEmbeddedDocuments, then forward only the
     * actor-level fields to the parent submit handler.
     */
    async _processSubmitData(event, form, submitData) {
        const itemUpdates = new Map();
        const actorData = {};

        for (const [key, value] of Object.entries(submitData)) {
            const m = key.match(/^items\.([^.]+)\.(.+)$/);
            if (m) {
                const [, itemId, path] = m;
                if (!itemUpdates.has(itemId)) itemUpdates.set(itemId, { _id: itemId });
                foundry.utils.setProperty(itemUpdates.get(itemId), path, value);
            } else {
                actorData[key] = value;
            }
        }

        if (itemUpdates.size > 0) {
            await this.actor.updateEmbeddedDocuments('Item', Array.from(itemUpdates.values()));
        }

        return super._processSubmitData(event, form, actorData);
    }

    /* --------------------------------------------------------- */
    /*  Combat-control action handlers                           */
    /* --------------------------------------------------------- */

    static async _onCombatTurrets(event, target) {
        await this.actor.rollTurrets();
    }

    static async _onCombatMovement(event, target) {
        await this.actor.rollCrew('Maneuver', this.actor.system.operator.helm);
    }

    static async _onCombatBoarding(event, target) {
        await this.actor.rollBoarding(this.actor.system.operator.boarding);
    }

    static async _onCombatDetection(event, target) {
        await this.actor.rollCrew('Detection', this.actor.system.operator.augurs);
    }

    static async _onCombatCrew(event, target) {
        await this.actor.rollCrew('Crew', 0);
    }
}
