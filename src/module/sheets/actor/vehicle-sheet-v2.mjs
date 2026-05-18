import { ActorContainerSheetV2 } from './actor-container-sheet-v2.mjs';

export class VehicleSheetV2 extends ActorContainerSheetV2 {

    static DEFAULT_OPTIONS = {
        classes: ['rogue-trader-3rd', 'sheet', 'actor', 'vehicle'],
    };

    static PARTS = {
        body: {
            template: 'systems/rogue-trader-3rd/templates/actor/actor-vehicle-sheet.hbs',
            root: true,
            scrollable: ['.rt-body'],
        },
    };

    static async _onItemDamage(event, target) {
        game.rt.warn('Not Implemented for Vehicles Yet');
    }
}
