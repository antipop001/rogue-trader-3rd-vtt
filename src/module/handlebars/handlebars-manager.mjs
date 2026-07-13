import { registerHandlebarsHelpers } from './handlebars-helpers.mjs';

export class HandlebarManager {
    static async loadTemplates() {
        await this.preloadHandlebarsTemplates();
    }

    static registerHelpers() {
        registerHandlebarsHelpers();
    }

    static preloadHandlebarsTemplates() {
        return loadTemplates([
            // Actor partials.
            'systems/rogue-trader-3rd/templates/actor/panel/active-effects-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/armour-display-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/armour-paperdoll-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/armour-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/backpack-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/skills-advanced-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/skills-merged-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/characteristic-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/characteristic-roller-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/combat-controls-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/corruption-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/cybernetic-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/encumbrance-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/enemy-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/experience-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/fate-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/fatigue-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/force-field-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/gear-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/initiative-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/insanity-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/journal-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/movement-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/peer-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/psychic-powers-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/psy-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/skills-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/skills-specialist-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/storage-location-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/talent-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/trait-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/weapon-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/wounds-panel.hbs',

            'systems/rogue-trader-3rd/templates/actor/panel/vehicle-armour-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/vehicle-integrity-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/vehicle-movement-panel.hbs',

            'systems/rogue-trader-3rd/templates/actor/panel/voidship-boarding-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-crew-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-defense-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-detection-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-movement-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-utility-panel.hbs',

            'systems/rogue-trader-3rd/templates/actor/panel/voidship-weapon-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-weapon-slots-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-components-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/voidship-traits-panel.hbs',

            'systems/rogue-trader-3rd/templates/actor/panel/origin-path-panel.hbs',
            'systems/rogue-trader-3rd/templates/actor/panel/ship-role-panel.hbs',

            'systems/rogue-trader-3rd/templates/actor/partial/character-field.hbs',
            'systems/rogue-trader-3rd/templates/actor/partial/display-toggle.hbs',
            'systems/rogue-trader-3rd/templates/actor/partial/origin-path-row.hbs',
            'systems/rogue-trader-3rd/templates/actor/partial/trait-toggle.hbs',

            // Item Panels
            'systems/rogue-trader-3rd/templates/item/panel/active-effects-panel.hbs',
        ]);
    }
}
