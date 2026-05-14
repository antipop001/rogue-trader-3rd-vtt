import { SYSTEM_ID } from './hooks-manager.mjs';

export class RogueTraderSettings {

    static SETTINGS = {
        worldVersion: 'world-version',
        simpleAttackRolls: 'simple-attack-rolls',
        simplePsychicRolls: 'simple-psychic-rolls',
        processActiveEffectsDuringCombat: 'active-effects-during-combat',
        profitFactor: 'profit-factor',
    }

    static registerSettings() {
        game.settings.register(SYSTEM_ID, RogueTraderSettings.SETTINGS.worldVersion, {
            name: 'World Version',
            hint: 'Used to handle data migration during system upgrades.',
            scope: 'world',
            config: true,
            requiresReload: true,
            default: 0,
            type: Number,
        });
        game.settings.register(SYSTEM_ID, RogueTraderSettings.SETTINGS.processActiveEffectsDuringCombat, {
            name: 'Active Effect Processing',
            hint: 'Process effects like Fire or Blood Loss on combat turn change.',
            scope: 'world',
            config: true,
            requiresReload: true,
            default: true,
            type: Boolean,
        });
        game.settings.register(SYSTEM_ID, RogueTraderSettings.SETTINGS.simpleAttackRolls, {
            name: 'Simple Attack Rolls',
            hint: 'Changes the default weapon automation behavior to disabled. Attack rolls will trigger a WeaponSkill or BallisticSkill roll as needed.',
            scope: 'client',
            config: true,
            requiresReload: true,
            default: false,
            type: Boolean,
        });
        game.settings.register(SYSTEM_ID, RogueTraderSettings.SETTINGS.simplePsychicRolls, {
            name: 'Simple Psychic Rolls',
            hint: 'Changes the default psychic power automation behavior to disabled. Psychic rolls will trigger a simple WillPower roll.',
            scope: 'client',
            config: true,
            requiresReload: true,
            default: false,
            type: Boolean,
        });
        game.settings.register(SYSTEM_ID, RogueTraderSettings.SETTINGS.profitFactor, {
            name: 'Profit Factor',
            hint: 'The group-wide Profit Factor used for Acquisition Tests (RT corebook p.270).',
            scope: 'world',
            config: true,
            requiresReload: false,
            default: 30,
            type: Number,
        });
    }

    static getProfitFactor() {
        return game.settings.get(SYSTEM_ID, RogueTraderSettings.SETTINGS.profitFactor) ?? 30;
    }

    static async setProfitFactor(value) {
        return game.settings.set(SYSTEM_ID, RogueTraderSettings.SETTINGS.profitFactor, Number(value) || 0);
    }
}
