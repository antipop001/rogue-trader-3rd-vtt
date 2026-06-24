import { RogueTraderItem } from './documents/item.mjs';
import { DarkHeresy } from './rules/config.mjs';
import { AcolyteSheet } from './sheets/actor/acolyte-sheet.mjs';
import { AcolyteSheetV2 } from './sheets/actor/acolyte-sheet-v2.mjs';
import { DarkHeresyItemSheet } from './sheets/item/item-sheet.mjs';
import { DarkHeresyShipComponentSheet } from './sheets/item/ship-component-sheet.mjs';
import { DarkHeresyShipWeaponSheet } from './sheets/item/ship-weapon-sheet.mjs';
import { DarkHeresyWeaponSheet } from './sheets/item/weapon-sheet.mjs';
import { DarkHeresyArmourSheet } from './sheets/item/armour-sheet.mjs';
import { DarkHeresyTalentSheet } from './sheets/item/talent-sheet.mjs';
import { DarkHeresyJournalEntrySheet } from './sheets/item/journal-entry-sheet.mjs';
import { DarkHeresyPeerEnemySheet } from './sheets/item/peer-enemy-sheet.mjs';
import { DarkHeresyAttackSpecialSheet } from './sheets/item/attack-special-sheet.mjs';
import { DarkHeresyWeaponModSheet } from './sheets/item/weapon-mod-sheet.mjs';
import {
    createCharacteristicMacro,
    createItemMacro,
    createSkillMacro,
    rollCharacteristicMacro,
    rollItemMacro,
    rollSkillMacro,
} from './macros/macro-manager.mjs';
import { HandlebarManager } from './handlebars/handlebars-manager.mjs';
import { promptForChoice, labelForChoice, buildEffectForChoice } from './pickers/talent-choice.mjs';
import { DarkHeresyAmmoSheet } from './sheets/item/ammo-sheet.mjs';
import { DarkHeresyPsychicPowerSheet } from './sheets/item/psychic-power-sheet.mjs';
import { DarkHeresyStorageLocationSheet } from './sheets/item/storage-location-sheet.mjs';
import { DarkHeresyTraitSheet } from './sheets/item/trait-sheet.mjs';
import { RogueTraderActorProxy } from './documents/actor-proxy.mjs';
import { NpcSheet } from './sheets/actor/npc-sheet.mjs';
import { NpcSheetV2 } from './sheets/actor/npc-sheet-v2.mjs';
import { VehicleSheet } from './sheets/actor/vehicle-sheet.mjs';
import { VehicleSheetV2 } from './sheets/actor/vehicle-sheet-v2.mjs';
import { VoidshipSheet } from './sheets/actor/voidship-sheet.mjs';
import { VoidshipSheetV2 } from './sheets/actor/voidship-sheet-v2.mjs';
import { DarkHeresyCriticalInjurySheet } from './sheets/item/critical-injury-sheet.mjs';
import { DarkHeresyGearSheet } from './sheets/item/gear-sheet.mjs';
import { RogueTraderSettings } from './rogue-trader-settings.mjs';
import { DHTargetedActionManager } from './actions/targeted-action-manager.mjs';
import { DHBasicActionManager } from './actions/basic-action-manager.mjs';
import { DHCombatActionManager } from './actions/combat-action-manager.mjs';
import { DarkHeresyCyberneticSheet } from './sheets/item/cybernetic-sheet.mjs';
import { DarkHeresyForceFieldSheet } from './sheets/item/force-field-sheet.mjs';
import { checkAndMigrateWorld } from './rogue-trader-migrations.mjs';
import { DHTourMain } from './tours/main-tour.mjs';
import { openAcquisitionDialog } from './rules/acquisition.mjs';
import { openEndeavoursDialog } from './rules/endeavours.mjs';
import { ChargenWizard } from './applications/chargen-wizard.mjs';

import * as documents from './documents/_module.mjs'

export const SYSTEM_ID = 'rogue-trader-3rd';

export class HooksManager {
    static registerHooks() {
        console.log('Dark Heresy 2nd Edition | Registering system hooks');

        Hooks.once('init', HooksManager.init);
        Hooks.on('ready', HooksManager.ready);
        Hooks.on('hotbarDrop', HooksManager.hotbarDrop);
        Hooks.on('createItem', HooksManager.onCreateItem);
        // RT 1e Reaction budget (RT Core p.244): a character's single Reaction (plus any
        // type-locked extra from Step Aside / Wall of Steel) refreshes each Round, at the
        // start of their turn. Reset the per-Round USED counters when it becomes the
        // actor's turn. (ENGINE-REACTION-BUDGET-TRACK.)
        Hooks.on('combatTurnChange', HooksManager.onCombatTurnChange);
        // CHARGEN BUILDER SHELVED (2026-06-23): the in-Foundry character-creation
        // wizard is parked (advanced work lives on branch ralph/chargen) and kept
        // out of releases. Re-enable by uncommenting this hook + the AcolyteSheetV2
        // header control. The wizard code itself is intentionally left intact.
        // Hooks.on('renderActorDirectory', HooksManager.onRenderActorDirectory);

        DHTargetedActionManager.initializeHooks();
        DHBasicActionManager.initializeHooks();
        DHCombatActionManager.initializeHooks();
    }

    static init() {
        console.log(`Loading Dark Heresy 2nd Edition System
______________  _________ 
___  __ \__  / / /_|__  /
__  / / /_  /_/ /____/ /
_  /_/ /_  __  / _  __/ 
/_____/ /_/ /_/  /____/ 

"Only in death does duty end"
Enable Debug with: game.rt.debug = true           
`);

        const consolePrefix = 'Dark Heresy | ';
        game.rt = {
            debug: false,
            log: (s, o) => (!!game.rt.debug ? console.log(`${consolePrefix}${s}`, o) : undefined),
            warn: (s, o) => console.warn(`${consolePrefix}${s}`, o),
            error: (s, o) => console.error(`${consolePrefix}${s}`, o),
            rollItemMacro,
            rollSkillMacro,
            rollCharacteristicMacro,
            acquisition: openAcquisitionDialog,
            endeavours: openEndeavoursDialog,
        };

        //CONFIG.debug.hooks = true;

        // Add custom constants for configuration.
        CONFIG.rt = DarkHeresy;
        CONFIG.Combat.initiative = { formula: '@initiative.base + @initiative.bonus', decimals: 0 };

        // Define custom Document classes
        CONFIG.Actor.documentClass = RogueTraderActorProxy;
        CONFIG.Actor.documentClasses = {
            acolyte: documents.RogueTraderAcolyte,
            npc: documents.RogueTraderNPC,
            vehicle: documents.RogueTraderVehicle,
            voidship: documents.RogueTraderVoidship,

        };
        CONFIG.Item.documentClass = RogueTraderItem;

        // Register sheet application classes
        Actors.unregisterSheet('core', ActorSheet);
        Actors.registerSheet(SYSTEM_ID, AcolyteSheetV2, {types: ["acolyte"], makeDefault: true, label: 'Acolyte (v2)' });
        Actors.registerSheet(SYSTEM_ID, NpcSheetV2, {types: ['npc'], makeDefault: true, label: 'NPC (v2)' });
        Actors.registerSheet(SYSTEM_ID, VehicleSheetV2, {types: ['vehicle'], makeDefault: true, label: 'Vehicle (v2)' });
        Actors.registerSheet(SYSTEM_ID, VoidshipSheetV2, {types: ['voidship'], makeDefault: true, label: 'Voidship (v2)' });

        Items.unregisterSheet('core', ItemSheet);
        Items.registerSheet(SYSTEM_ID, DarkHeresyItemSheet, { makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyAmmoSheet, { types: ['ammunition'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyArmourSheet, { types: ['armour'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyAttackSpecialSheet, { types: ['attackSpecial'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyCriticalInjurySheet, { types: ['criticalInjury'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyCyberneticSheet, { types: ['cybernetic'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyJournalEntrySheet, { types: ['journalEntry'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyForceFieldSheet, { types: ['forceField'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyGearSheet, { types: ['consumable', 'gear', 'drug', 'tool'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyPeerEnemySheet, { types: ['peer', 'enemy'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyPsychicPowerSheet, { types: ['psychicPower'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyStorageLocationSheet, {types: ['storageLocation'],makeDefault: true,});
        Items.registerSheet(SYSTEM_ID, DarkHeresyTalentSheet, { types: ['talent'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyTraitSheet, {types: ['trait'],makeDefault: true,});
        Items.registerSheet(SYSTEM_ID, DarkHeresyWeaponModSheet, {types: ['weaponModification'],makeDefault: true,});
        Items.registerSheet(SYSTEM_ID, DarkHeresyWeaponSheet, { types: ['weapon'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyShipComponentSheet, { types: ['shipComponent'], makeDefault: true });
        Items.registerSheet(SYSTEM_ID, DarkHeresyShipWeaponSheet, { types: ['shipWeapon'], makeDefault: true });

        RogueTraderSettings.registerSettings();
        HandlebarManager.loadTemplates();
    }

    static async ready() {
        console.log(`DH2e Loaded!`);
        await checkAndMigrateWorld();

        game.tours.register(SYSTEM_ID, "main-tour", new DHTourMain());

        console.log('Initializing with:', game.settings.get(SYSTEM_ID, RogueTraderSettings.SETTINGS.processActiveEffectsDuringCombat));
        if (!game.settings.get(SYSTEM_ID, RogueTraderSettings.SETTINGS.processActiveEffectsDuringCombat)) {
            DHCombatActionManager.disableHooks();
        }
    }

    /**
     * Reset an RT actor's per-Round Reaction USED counters when it becomes their turn
     * (RT Core p.244 — Reactions refresh each Round). Only the active GM processes the
     * update (single writer; players may not own the combatant). No-ops for non-RT actors
     * and when nothing has been spent. (ENGINE-REACTION-BUDGET-TRACK.)
     */
    static async onCombatTurnChange(combat, _prior, current) {
        if (game.user !== game.users?.activeGM) return;
        const combatant = combat?.combatants?.get(current?.combatantId);
        const rc = combatant?.actor?.system?.combat?.reactions;
        if (!rc?.dodge || !rc?.parry) return;
        if ((rc.dodge.value ?? 0) === 0 && (rc.parry.value ?? 0) === 0) return;
        await combatant.actor.update({
            'system.combat.reactions.dodge.value': 0,
            'system.combat.reactions.parry.value': 0,
        });
    }

    /**
     * Add a "Character Creation" button to the Actors directory for users who
     * can create actors. Opens the chargen wizard (Stage 1: Characteristics).
     */
    static onRenderActorDirectory(app, html) {
        if (!game.user.can('ACTOR_CREATE')) return;
        const el = html instanceof HTMLElement ? html : html[0];
        if (!el || el.querySelector('.rt-chargen-open')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rt-chargen-open';
        btn.innerHTML = '<i class="fa-solid fa-hat-wizard"></i> Character Creation';
        btn.addEventListener('click', () => new ChargenWizard().render(true));
        const anchor = el.querySelector('.header-actions') ?? el.querySelector('.directory-footer');
        (anchor ?? el).append(btn);
    }

    static hotbarDrop(bar, data, slot) {
        game.rt.log('Hotbar Drop:', data);
        switch (data.type) {
            case 'characteristic':
                createCharacteristicMacro(data, slot);
                return false;
            case 'item':
            case 'Item':
                createItemMacro(data, slot);
                return false;
            case 'skill':
                createSkillMacro(data, slot);
                return false;
            default:
                return;
        }
    }

    /**
     * Fires after an Item document has been created. If the item is a
     * pickable talent (`flags.rt.pickable` present) on an Actor, prompt the
     * user for the option, stamp it onto `system.choice`, append it to the
     * item name as "Talent (Choice)", and — for kind=`skill` — build an
     * ActiveEffect targeting `system.skills.<choice>.modifier`.
     */
    static async onCreateItem(item, _options, userId) {
        if (userId !== game.user.id) return;            // only the creator prompts
        if (!item.parent || !item.parent.documentName === 'Actor') return;
        if (item.type !== 'talent') return;
        const spec = foundry.utils.getProperty(item, 'flags.rt.pickable');
        if (!spec || !spec.kind) return;
        // Don't re-prompt if a choice is already set (e.g. duplicated item).
        if (item.system?.choice) return;

        const choice = await promptForChoice(item);
        if (!choice) return;

        const baseName = item.name.replace(/\s*\(.*\)\s*$/, '');
        const updates = {
            name: `${baseName} (${labelForChoice(spec.kind, choice)})`,
            'system.choice': choice,
        };
        await item.update(updates);

        const effectData = buildEffectForChoice(item, spec.kind, choice);
        if (effectData) {
            await item.createEmbeddedDocuments('ActiveEffect', [effectData]);
        }
    }
}
