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
import { pendingGrants } from './rolls/roll-helpers.mjs';
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
import { openFearDialog } from './rules/fear.mjs';
import { openGrappleDialog } from './rules/grapple.mjs';
import { openCoverDialog } from './rules/cover.mjs';
import { processDegradation } from './rules/degradation.mjs';
import { RT_CONDITIONS } from './rules/conditions.mjs';
import { ChargenWizard } from './applications/chargen-wizard.mjs';

import * as documents from './documents/_module.mjs'

export const SYSTEM_ID = 'rogue-trader-3rd';

export class HooksManager {
    static registerHooks() {
        console.log('Rogue Trader 3rd Edition | Registering system hooks');

        Hooks.once('init', HooksManager.init);
        Hooks.on('ready', HooksManager.ready);
        Hooks.on('hotbarDrop', HooksManager.hotbarDrop);
        Hooks.on('createItem', HooksManager.onCreateItem);
        // RT 1e Reaction budget (RT Core p.244): a character's single Reaction (plus any
        // type-locked extra from Step Aside / Wall of Steel) refreshes each Round, at the
        // start of their turn. Reset the per-Round USED counters when it becomes the
        // actor's turn. (ENGINE-REACTION-BUDGET-TRACK.)
        Hooks.on('combatTurnChange', HooksManager.onCombatTurnChange);
        // RT 1e Insanity / Corruption degradation (RT Core p.296-301): crossing a point
        // threshold forces a Trauma / Malignancy / Mutation test. Capture the pre-update
        // totals, then fire the tests post-update (first-GM only). (QA-083.)
        Hooks.on('preUpdateActor', HooksManager.onPreUpdateActorDegradation);
        Hooks.on('updateActor', HooksManager.onUpdateActorDegradation);
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
        console.log(`Loading Rogue Trader 3rd Edition System
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
            fearTest: openFearDialog,
            grapple: openGrappleDialog,
            takeCover: openCoverDialog,
        };

        //CONFIG.debug.hooks = true;

        // Add custom constants for configuration.
        CONFIG.rt = DarkHeresy;
        CONFIG.Combat.initiative = { formula: '@initiative.base + @initiative.bonus', decimals: 0 };

        // RT 1e condition layer (QA-080): replace the generic Foundry status effects with
        // the RT condition set so they are clickable on the token HUD and tracked on
        // `actor.statuses` for the combat engine to read.
        CONFIG.statusEffects = RT_CONDITIONS;
        CONFIG.specialStatusEffects.DEFEATED = 'unconscious';

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
        console.log(`Rogue Trader 3rd Edition Loaded!`);
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
        const cb = combatant?.actor?.system?.combat;
        const rc = cb?.reactions;
        if (!rc?.dodge || !rc?.parry) return;
        const update = {};
        // Refresh the per-Round Reaction budget at the start of the actor's turn.
        if ((rc.dodge.value ?? 0) !== 0) update['system.combat.reactions.dodge.value'] = 0;
        if ((rc.parry.value ?? 0) !== 0) update['system.combat.reactions.parry.value'] = 0;
        // Clear the "until your next turn" action riders (All Out / Guarded Attack). (QA-071.)
        if (cb.allOutAttack) update['system.combat.allOutAttack'] = false;
        if (cb.guardedAttack) update['system.combat.guardedAttack'] = false;
        if (Object.keys(update).length === 0) return;
        await combatant.actor.update(update);
    }

    /**
     * Stash the pre-update Insanity/Corruption totals on the update `options` so the
     * post-update hook can detect a threshold crossing. (QA-083.)
     */
    static onPreUpdateActorDegradation(actor, changed, options) {
        const sys = changed?.system;
        if (!sys || (sys.insanity === undefined && sys.corruption === undefined)) return;
        options.rtDegradation = {
            oldInsanity: actor.system?.insanity ?? 0,
            oldCorruption: actor.system?.corruption ?? 0,
        };
    }

    /**
     * After an Insanity/Corruption change, fire the Trauma/Malignancy/Mutation tests for any
     * threshold crossed. First-GM only (single writer; players may not own the actor and the
     * tests must run once). (QA-083.)
     */
    static async onUpdateActorDegradation(actor, _changed, options) {
        const prev = options?.rtDegradation;
        if (!prev) return;
        if (game.user !== game.users?.activeGM) return;
        await processDegradation(actor, prev);
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
        if (!item.parent || item.parent.documentName !== 'Actor') return;

        // ENGINE-TRAIT-GRANTS: a talent/trait that GRANTS other compendium items
        // (flags.rt.grants) auto-embeds the missing ones on the actor. DEFER off the
        // create-hook turn — embedding *during* the originating create flow gets
        // clobbered when the operation writes back the parent's items (BUG-009). Run
        // two passes SEQUENTIALLY (await the first before the second), NOT as two
        // concurrent timers: concurrent createEmbeddedDocuments of the same grant
        // deadlocks for slower pickable grants like Rival (BUG-010). The second pass
        // recovers from the writeback clobber; pendingGrants dedups so it's a no-op
        // when the first stuck.
        const grantParent = item.parent;
        // Defer the grant off the create-hook turn (embedding *during* the originating
        // create flow gets clobbered by its items writeback — BUG-009), and embed on a
        // freshly-fetched live actor (the captured ref goes stale when an AE re-prepares
        // the actor, which hung the create — BUG-010). A SINGLE pass: with the live-actor
        // fetch the embed is reliable, so no retry is needed (a retry would double-embed
        // because the slow pack load makes it race the first pass's dedup).
        setTimeout(() => {
            HooksManager.applyItemGrants(item, grantParent)
                .catch((e) => console.error('Dark Heresy | applyItemGrants failed', e));
        }, 0);

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

    /**
     * Auto-embed the compendium items a granting talent/trait declares in
     * `flags.rt.grants` (ENGINE-TRAIT-GRANTS). Resolves each grant from its pack by
     * exact (case-insensitive) name + type, copies it onto the actor, and tags it
     * `flags.rt.grantedBy` with the granting item's id. `pendingGrants` filters out
     * grants the actor already has, so re-adding the talent or loading an NPC that
     * already bakes the granted items does not double-grant. Granted items carry no
     * further `flags.rt.grants`, so this does not recurse.
     */
    static async applyItemGrants(item, actor) {
        // Use a freshly-fetched actor doc, not the reference captured when the create
        // hook fired — a granting item with an ActiveEffect (e.g. Sixth Sense's
        // Psyniscience upgrade) re-prepares the actor, leaving that captured ref
        // stale/detached, and createEmbeddedDocuments on a stale actor HANGS (BUG-010).
        // Falls back to the passed ref for unlinked token actors (not in game.actors).
        const liveActor = (actor?.id && game.actors?.get(actor.id)) || actor;
        const grants = foundry.utils.getProperty(item, 'flags.rt.grants');
        const pending = pendingGrants(grants, liveActor.items.map((i) => ({ name: i.name, type: i.type })));
        if (!pending.length) return;
        const PACK_BY_TYPE = { trait: 'traits', talent: 'talents' };
        const toCreate = [];
        for (const g of pending) {
            const packName = g.pack ?? PACK_BY_TYPE[g.type];
            const pack = packName ? game.packs.get(`${SYSTEM_ID}.${packName}`) : null;
            if (!pack) { game.rt?.warn?.(`Item grant "${g.name}": no pack for type ${g.type}`); continue; }
            const docs = await pack.getDocuments();
            const src = docs.find((d) => d.type === g.type && d.name?.toLowerCase() === String(g.name).toLowerCase());
            if (!src) { game.rt?.warn?.(`Item grant "${g.name}" not found in pack ${packName}`); continue; }
            const data = src.toObject();
            delete data._id;
            // Pre-chosen pickable grant (e.g. Rival (Inquisition)): stamp the choice and
            // append it to the name so onCreateItem skips the picker prompt.
            if (g.choice) {
                foundry.utils.setProperty(data, 'system.choice', g.choice);
                const base = String(data.name ?? '').replace(/\s*\(.*\)\s*$/, '');
                data.name = `${base} (${g.choice})`;
            }
            foundry.utils.setProperty(data, 'flags.rt.grantedBy', item.id);
            toCreate.push(data);
        }
        if (toCreate.length) await liveActor.createEmbeddedDocuments('Item', toCreate);
    }
}
