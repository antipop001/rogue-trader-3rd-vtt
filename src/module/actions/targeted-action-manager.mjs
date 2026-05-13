import { prepareWeaponRoll } from '../prompts/weapon-prompt.mjs';
import { preparePsychicPowerRoll } from '../prompts/psychic-power-prompt.mjs';
import { PsychicActionData, WeaponActionData } from '../rolls/action-data.mjs';
import { RogueTraderSettings } from '../rogue-trader-settings.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { prepareShipWeaponRoll } from '../prompts/ship-weapon-prompt.mjs';

export class TargetedActionManager {

    initializeHooks() {
        // Initialize Scene Control Buttons
        Hooks.on('getSceneControlButtons', (controls) => {
            const tokens = controls.tokens;
            if (!tokens) return;
            try {
                if (!game.settings.get(SYSTEM_ID, RogueTraderSettings.SETTINGS.simpleAttackRolls)) {
                    tokens.tools['attack'] = {
                        name: 'attack',
                        title: 'Attack',
                        icon: 'fas fa-swords',
                        visible: true,
                        button: true,
                        onChange: () => DHTargetedActionManager.performWeaponAttack(),
                    };
                }
            } catch (error) {
                game.rt.log('Unable to add game bar icon.', error)
            }
        });
    }

    truncateTo1Decimal(num) {
        return Math.trunc(num * 10) / 10;
    }

    tokenDistance(token1, token2) {
        if (!token1 || !token2) return 0;

        let distance = canvas.grid.measurePath([token1, token2]);
        if (token1.document && token2.document) {
            if (token1.document.elevation !== token2.document.elevation) {
                let h_diff =
                    token2.document.elevation > token1.document.elevation
                        ? token2.document.elevation - token1.document.elevation
                        : token1.document.elevation - token2.document.elevation;

                return this.truncateTo1Decimal(Math.sqrt(Math.pow(h_diff, 2) + Math.pow(distance.distance, 2)));
            } else {
                return this.truncateTo1Decimal(distance.distance);
            }
        } else {
            return 0;
        }
    }

    getSourceToken(source) {
        game.rt.log('getSourceToken', source);
        let sourceToken;

        if (source) {
            if (source instanceof Token) {
                sourceToken = source;
            } else if (source.token instanceof TokenDocument) {
                sourceToken = source.token.object; // get canvas Token
            } else if (typeof source.getActiveTokens === 'function') {
                sourceToken = source.getActiveTokens()[0]; // from Actor
            }
        } else {
            const controlledTokens = canvas.tokens.controlled;
            if (!controlledTokens.length) {
                ui.notifications.warn('You need to control a token!');
                return;
            }
            if (controlledTokens.length > 1) {
                ui.notifications.warn('You need to control a single token! Multi-token support is not yet added.');
                return;
            }
            sourceToken = controlledTokens[0];
        }

        if (!sourceToken?.actor) {
            ui.notifications.warn('Token must be associated with an actor!');
            return;
        }

        return sourceToken;
    }

    getTargetToken(target) {
        game.rt.log('getTargetToken', target);
        let targetToken;

        if (target) {
            if (target instanceof Token) {
                targetToken = target;
            } else if (target.token instanceof TokenDocument) {
                targetToken = target.token.object; // Actor from token
            } else if (typeof target.getActiveTokens === 'function') {
                targetToken = target.getActiveTokens()[0]; // Actor
            }
        } else {
            const targetedTokens = [...game.user.targets];
            if (!targetedTokens.length) return;
            if (targetedTokens.length > 1) {
                ui.notifications.warn('You need to target a single token! Multi-token targeting is not yet added.');
                return;
            }
            targetToken = targetedTokens[0];
        }

        if (!targetToken?.actor) {
            ui.notifications.warn('Target token must be associated with an actor!');
            return;
        }

        return targetToken;
    }

    createSourceAndTargetData(source, target) {
        game.rt.log('createSourceAndTargetData', { source, target });

        // Source
        const sourceToken = this.getSourceToken(source);
        const sourceActorData = sourceToken ? sourceToken.actor : source;
        if(!sourceActorData) return;

        // Target
        const targetToken = this.getTargetToken(target);
        const targetActorData = targetToken ? targetToken.actor : target;

        // Distance
        const targetDistance = sourceToken && targetToken ? this.tokenDistance(sourceToken, targetToken) : 0;

        return {
            actor: sourceActorData,
            target: targetActorData,
            distance: targetDistance,
        };
    }

    async performShipWeaponAttack(source = null, target = null, weapon = null) {
        game.rt.log('performShipWeaponAttack', { source, target, weapon });
        const rollData = this.createSourceAndTargetData(source, target);
        if (!rollData) return;

        const weapons = weapon ? [weapon] : rollData.actor.items.filter((item) => item.type === 'weapon').filter((item) => item.system.equipped);
        if (!weapons || weapons.length === 0) {
            ui.notifications.warn('Actor must have an equipped weapon!');
            return;
        }

        const weaponAttack = new WeaponActionData();
        const weaponRollData = weaponAttack.rollData;
        weaponRollData.weapons = weapons;
        weaponRollData.sourceActor = rollData.actor;
        weaponRollData.targetActor = rollData.target;
        weaponRollData.distance = rollData.distance;
        await prepareShipWeaponRoll(weaponAttack);
    }

    async performWeaponAttack(source = null, target = null, weapon = null) {
        game.rt.log('performWeaponAttack', { source, target, weapon });
        const rollData = this.createSourceAndTargetData(source, target);
        if (!rollData) return;

        // Weapon
        const weapons = weapon ? [weapon] : rollData.actor.items.filter((item) => item.type === 'weapon').filter((item) => item.system.equipped);
        if (!weapons || weapons.length === 0) {
            ui.notifications.warn('Actor must have an equipped weapon!');
            return;
        }

        const weaponAttack = new WeaponActionData();
        const weaponRollData = weaponAttack.rollData;
        weaponRollData.weapons = weapons;
        weaponRollData.sourceActor = rollData.actor;
        weaponRollData.targetActor = rollData.target;
        weaponRollData.distance = rollData.distance;
        await prepareWeaponRoll(weaponAttack);
    }

    async performPsychicAttack(source = null, target = null, psychicPower = null) {
        game.rt.log('performPsychicAttack');
        const rollData = this.createSourceAndTargetData(source, target);
        if (!rollData) return;

        // Powers
        const powers = psychicPower ? [psychicPower] : rollData.actor.items.filter((item) => item.type === 'psychicPower');
        if (!powers || powers.length === 0) {
            ui.notifications.warn('Actor must have psychic power!');
            return;
        }

        const psychicAttack = new PsychicActionData();
        const psychicRollData = psychicAttack.rollData;
        psychicRollData.psychicPowers = powers;
        psychicRollData.sourceActor = rollData.actor;
        psychicRollData.targetActor = rollData.target;
        psychicRollData.distance = rollData.distance;
        await preparePsychicPowerRoll(psychicAttack);
    }
}

export const DHTargetedActionManager = new TargetedActionManager();
