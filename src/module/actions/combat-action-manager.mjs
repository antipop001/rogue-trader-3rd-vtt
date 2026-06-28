import { handleBleeding, handleOnFire } from '../rules/active-effects.mjs';

export class CombatActionManager {
    combatTurnHook;
    combatRoundHook;

    initializeHooks() {
        // Initialize Combat Hooks
        this.combatTurnHook = Hooks.on('combatTurn', async (combat, data) => await this.updateCombat(combat, data));
        this.combatRoundHook = Hooks.on('combatRound', async (combat, data) => await this.updateCombat(combat, data));
    }

    disableHooks() {
        game.rt.log('Disabling Hooks', {'cth': this.combatTurnHook, 'crh': this.combatRoundHook})
        Hooks.off('combatTurn', this.combatTurnHook);
        Hooks.off('combatRound', this.combatRoundHook);
    }

    async updateCombat(combat, data) {
        // Only Run on the first GM -- so it will only run once
        if(game.userId === this.getFirstGM()) {
            game.rt.log('updateCombat - this should only be running on first GM');
            this.processCombatActiveEffects(combat, data);
        }
    }

    async processCombatActiveEffects(combat, data) {
        const currentCombatant = combat.turns[data.turn];
        game.rt.log('processCombatActiveEffects', currentCombatant);

        if (currentCombatant) {
            // Recurring-damage conditions (QA-080 inc.3 / QA-095). Key on the RT condition
            // layer's status ids (`actor.statuses`, set by the token HUD or the "Apply: On
            // Fire" outcome button) rather than the legacy 'Burning'/'Bleeding' ActiveEffect
            // names that nothing in the engine ever created. Legacy names kept as a fallback
            // so any hand-made effects on existing actors still fire.
            const actor = currentCombatant.actor;
            if (actor) {
                // Recharge weapons (RT Core p.143): a weapon that fired in round N spends N+1
                // recharging and can fire again in N+2. Clear the flag once the combat has
                // advanced two Rounds past the shot. (QA-016.)
                const round = combat.round ?? 0;
                for (const w of actor.items ?? []) {
                    if (w.type === 'weapon' && w.system?.recharging && round >= (w.system.rechargedRound ?? 0) + 2) {
                        await w.update({ 'system.recharging': false });
                    }
                }
                const statuses = actor.statuses ?? new Set();
                const hasLegacy = (name) => actor.effects?.some((e) => e.name === name);
                if (statuses.has('onFire') || hasLegacy('Burning')) {
                    await handleOnFire(actor);
                }
                if (statuses.has('bloodLoss') || hasLegacy('Bleeding')) {
                    await handleBleeding(actor);
                }
            }
        }
    }

    getFirstGM() {
        for(const user of game.users.contents) {
            if (user.active && user.isGM) return user.id;
        }
    }
}



export const DHCombatActionManager = new CombatActionManager();
