import { refundAmmo } from '../rules/ammo.mjs';
import { uuid } from '../rolls/roll-helpers.mjs';
import { AssignDamageData } from '../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../prompts/assign-damage-prompt.mjs';
import { DHTargetedActionManager } from './targeted-action-manager.mjs';
import { Hit } from '../rolls/damage-data.mjs';
import { RogueTraderSettings } from '../rogue-trader-settings.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { expireDrug, checkAllDrugExpiries } from '../rules/drugs.mjs';

export class BasicActionManager {
    // This is stored rolls for allowing re-rolls, ammo refund, etc.
    storedRolls = {};

    initializeHooks() {
        // Add show/hide support for chat messages
        Hooks.on('renderChatMessageHTML', async (message, html, data) => {
            game.rt.log('renderChatMessageHTML', { message, html, data });
            const $html = $(html);
            $html.find('.roll-control__hide-control').click(async (ev) => await this._toggleExpandChatMessage(ev));
            $html.find('.roll-control__refund').click(async (ev) => await this._refundResources(ev));
            $html.find('.roll-control__fate-reroll').click(async (ev) => await this._fateReroll(ev));
            $html.find('.roll-control__assign-damage').click(async (ev) => await this._assignDamage(ev));
            $html.find('.roll-control__apply-damage').click(async (ev) => await this._applyDamage(ev));
            $html.find('.roll-control__apply-condition').click(async (ev) => await this._applyCondition(ev));
            $html.find('.roll-control__pinning-test').click(async (ev) => await this._rollPinningTest(ev));
            $html.find('.roll-control__evade').click(async (ev) => await this._evadeAttack(ev));
            $html.find('.roll-control__roll-opposed').click(async (ev) => await this._rollOpposed(ev));
            $html.find('.roll-control__drug-expire').click(async (ev) => await this._drugExpire(ev));
        });

        // Expire elapsed drug effects when the GM advances the world clock (out-of-combat
        // wear-off, since duration.seconds AEs don't self-expire without worldTime ticking).
        // GM-only so the writes happen once. (QA-145.)
        Hooks.on('updateWorldTime', async () => {
            if (game.users?.activeGM === game.user) await checkAllDrugExpiries();
        });

        // Initialize Scene Control Buttons
        Hooks.on('getSceneControlButtons', (controls) => {
            const tokens = controls.tokens;
            if (!tokens) return;
            tokens.tools['assign-damage'] = {
                name: 'assign-damage',
                title: 'Assign Damage',
                icon: 'fas fa-shield',
                visible: true,
                button: true,
                onChange: () => DHBasicActionManager.assignDamageTool(),
            };
        });
    }

    async _toggleExpandChatMessage(event) {
        game.rt.log('roll-control-toggle');
        event.preventDefault();
        const displayToggle = $(event.currentTarget);
        $('span', displayToggle).toggleClass('active');
        const target = displayToggle.data('toggle');
        $('#' + target).toggle();
    }

    async _refundResources(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const rollId = div.data('rollId');
        const actionData = this.getActionData(rollId);

        if (!actionData) {
            ui.notifications.warn(`Action data expired. Unable to perform action.`);
            return;
        }

        Dialog.confirm({
            title: 'Confirm Refund',
            content: '<p>Are you sure you would like to refund ammo, fate, etc for this action?</p>',
            yes: async () => {
                await actionData.refundResources();
                ui.notifications.info(`Resources refunded`);
            },
            no: () => {},
            defaultYes: false,
        });
    }

    async _fateReroll(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const rollId = div.data('rollId');
        const actionData = this.getActionData(rollId);

        if (!actionData) {
            ui.notifications.warn(`Action data expired. Unable to perform action.`);
            return;
        }

        if (actionData.rollData?.sourceActor?.system?.fate?.value <= 0) {
            ui.notifications.warn(`Actor does not have enough fate points!`);
            return;
        }

        Dialog.confirm({
            title: 'Confirm Re-Roll',
            content: '<p>Are you sure you would like to use a fate point to re-roll action?</p>',
            yes: async () => {
                // Generate new ID for action data
                actionData.id = uuid();
                // Use a FP
                await actionData.rollData.sourceActor.spendFate();
                // Refund Initial Resources
                await actionData.refundResources();
                // Reset
                actionData.reset();
                // Run it back
                await actionData.performActionAndSendToChat();
            },
            no: () => {},
            defaultYes: false,
        });
    }

    async _assignDamage(event) {
        event.preventDefault();
        const div = $(event.currentTarget);

        const location = div.data('location');
        const totalDamage = div.data('totalDamage');
        const totalPenetration = div.data('totalPenetration');
        const totalFatigue = div.data('totalFatigue');
        const damageType = div.data('damageType');
        const criticalDamageBonus = div.data('criticalDamageBonus');

        const isHit = div.data('voidshipHitType') ? div.data('voidshipHitType') : false;
        const isCrit = div.data('voidshipCritType') ? div.data('voidshipCritType') : false;
        const penetration = div.data('voidshipPenetration');
        const overpenetration = div.data('voidshipOverpenetration');
        const voidshipHullDamage = div.data('voidshipHullDamage');   // QA-042: combined salvo Hull loss
        const voidshipCritHits = div.data('voidshipCritHits');

        const primitive = div.data('primitive');
        const hitData = new Hit();
        hitData.location = location;
        hitData.totalDamage = totalDamage;
        hitData.totalPenetration = totalPenetration;
        hitData.totalFatigue = totalFatigue;
        hitData.damageType = damageType;
        hitData.criticalDamageBonus = Number(criticalDamageBonus) || 0;
        hitData.primitive = primitive === true || primitive === 'true';
        hitData.voidshipHullDamage = Number(voidshipHullDamage) || 0;   // QA-042
        hitData.voidshipCritHits = Number(voidshipCritHits) || 0;

        if (isCrit) {
            if (overpenetration) {
                hitData.voidshipHitType = "Overpenetrating Critical Hit"
            } else if (penetration) {
                hitData.voidshipHitType = "Penetrating Critical Hit"
            } else {
                hitData.voidshipHitType = "Nonpenetrating Critical Hit"
            }
            hitData.voidshipHit = true;
            hitData.voidshipHitLocation = div.data('voidshipLocation');
        } else if (isHit) {
            if (overpenetration) {
                hitData.voidshipHitType = "Overpenetrating Hit"
            } else if (penetration) {
                hitData.voidshipHitType = "Penetrating Hit"
            }
            hitData.voidshipHit = true;
            hitData.voidshipHitLocation = div.data('voidshipLocation');
        }

        const targetUuid = div.data('targetUuid');

        // Resolve the target: the attack-time target first, else the currently-targeted token.
        // A stale uuid returns null from fromUuid — unlinked NPC token uuids are
        // `Scene.Token.Actor` and stop resolving once the token is removed or the scene changes
        // (PC `Actor.<id>` uuids don't), so guard the null and fall back instead of throwing on
        // `.actor`. That uncaught TypeError died silently in this jQuery click handler, which is
        // exactly the "assigning damage to NPCs does nothing" report. (BUG: NPC assign-damage.)
        let targetActor;
        if (targetUuid) {
            const resolved = await fromUuid(targetUuid);
            targetActor = resolved?.actor ?? resolved ?? null;
        }
        if (!targetActor) {
            const targetedObjects = game.user.targets;
            if (targetedObjects && targetedObjects.size > 0) {
                targetActor = targetedObjects.values().next().value?.actor ?? null;
            }
        }
        if (!targetActor) {
            ui.notifications.warn(`Cannot determine the target to assign hit — the original target token may no longer exist. Target the token and click Assign Damage again.`);
            return;
        }

        const assignData = new AssignDamageData(targetActor, hitData);
        await prepareAssignDamageRoll(assignData);
    }

    /**
     * Apply a combat-outcome condition (Prone / Stunned / On Fire …) to the target token
     * actor. Button-driven like Assign Damage so it runs on a client with write permission
     * to the target (GM or owner) — the attacker's client cannot mutate another actor.
     * (QA-080 increment 2.)
     */
    async _drugExpire(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const actorUuid = div.data('actor-uuid');
        const drugId = div.data('drug-id');
        let actor = actorUuid ? await fromUuid(actorUuid) : null;
        if (actor?.actor !== undefined) actor = actor.actor;
        if (!actor) { ui.notifications?.warn('Cannot find the actor to wear off the drug.'); return; }
        await expireDrug(actor, String(drugId));
    }

    async _applyCondition(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const conditionId = div.data('condition-id');
        const targetUuid = div.data('target-uuid');
        if (!conditionId) return;

        let targetActor;
        if (targetUuid) {
            targetActor = await fromUuid(targetUuid);
            if (targetActor?.actor !== undefined) targetActor = targetActor.actor;
        }
        if (!targetActor) {
            const targeted = game.user.targets;
            if (targeted && targeted.size > 0) targetActor = targeted.values().next().value.actor;
        }
        if (!targetActor) {
            ui.notifications.warn(`Cannot determine target actor to apply the condition.`);
            return;
        }
        if (!targetActor.isOwner) {
            ui.notifications.warn(`Only the GM or the token's owner can apply a condition to ${targetActor.name}.`);
            return;
        }
        // toggleStatusEffect (Foundry v12+) flips the status; force it on.
        await targetActor.toggleStatusEffect(conditionId, { active: true });
        ui.notifications.info(`Applied ${conditionId} to ${targetActor.name}.`);
    }

    /**
     * Defender Reaction (QA-113): roll the target's Dodge or Parry to negate the incoming
     * hit (RT Core p.246 — "if the Dodge or Parry is successful, the attack is negated and
     * no damage is dealt"). Driven from the attacker's result card so the Reaction is tied
     * to an actual attack and spends the per-Round budget; on success the assign-damage
     * button(s) for the negated hit(s) are disabled (Dodge negates 1 + DoS hits vs auto-fire
     * per RT Core p.238; Parry negates 1). Owner/GM clicked, like Assign Damage.
     */
    async _evadeAttack(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const type = div.data('reaction-type');
        const targetUuid = div.data('target-uuid');
        let actor = targetUuid ? await fromUuid(targetUuid) : null;
        if (actor?.actor !== undefined) actor = actor.actor;
        if (!actor) {
            const targeted = game.user.targets;
            if (targeted && targeted.size > 0) actor = targeted.values().next().value.actor;
        }
        if (!actor) { ui.notifications.warn(`Cannot determine the defender to react.`); return; }
        if (!actor.isOwner) { ui.notifications.warn(`Only ${actor.name}'s owner or the GM can react.`); return; }
        if (typeof actor.rollReaction !== 'function') { ui.notifications.warn(`${actor.name} cannot take Reactions.`); return; }

        const label = type === 'parry' ? 'Parry' : 'Dodge';
        const res = await actor.rollReaction(type);
        if (res.blocked || !res.attempted) {
            const why = {
                locked: 'is Stunned, Helpless, or Unconscious',
                'all-out': 'went All Out Attack this Round',
                'no-reaction': 'has no Reaction left this Round',
                'no-skill': `has no ${label} skill`,
            }[res.reason] ?? `cannot ${label}`;
            ui.notifications.warn(`${actor.name} ${why}.`);
            return;
        }

        let negated = 0;
        if (res.success) {
            const perHit = type === 'parry' ? 1 : (1 + (res.dos ?? 0));
            const card = div.closest('.chat-message');
            const assignBtns = card.find('.roll-control__assign-damage');
            negated = assignBtns.length ? Math.min(perHit, assignBtns.length) : perHit;
            assignBtns.slice(0, negated).each(function () {
                $(this).css({ opacity: 0.4, 'pointer-events': 'none' });
                $(this).find('.rt-control-button__label').text('Negated');
            });
        }
        const outcome = res.success
            ? `<strong>${label} SUCCESS</strong> (${res.roll} vs ${res.target}${res.dos ? `, ${res.dos} DoS` : ''}) — the attack is negated${negated > 1 ? ` (${negated} hits)` : ''}; do not assign that damage.`
            : `<strong>${label} FAILED</strong> (${res.roll} vs ${res.target}) — the hit stands.`;
        await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<p>${outcome}</p>` });
    }

    /**
     * Roll a target's Pinning Test (a Willpower Test at the suppressing action's difficulty)
     * and apply the Pinned condition on a failure (RT Core p.248). Button-driven so it runs
     * on a client with write permission to the target (GM/owner). (QA-082.)
     */
    async _rollPinningTest(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const targetUuid = div.data('target-uuid');
        const difficulty = Number(div.data('difficulty')) || 0;

        let targetActor;
        if (targetUuid) {
            targetActor = await fromUuid(targetUuid);
            if (targetActor?.actor !== undefined) targetActor = targetActor.actor;
        }
        if (!targetActor) {
            const targeted = game.user.targets;
            if (targeted && targeted.size > 0) targetActor = targeted.values().next().value.actor;
        }
        if (!targetActor) {
            ui.notifications.warn(`Cannot determine target actor for the Pinning Test.`);
            return;
        }
        if (!targetActor.isOwner) {
            ui.notifications.warn(`Only the GM or the token's owner can roll ${targetActor.name}'s Pinning Test.`);
            return;
        }

        const wp = targetActor.characteristics?.willpower?.total ?? 0;
        const target = wp + difficulty;
        const roll = new Roll('1d100', {});
        await roll.evaluate();
        // RT: a roll of 1 always succeeds, 100 always fails; otherwise <= target succeeds.
        const success = roll.total === 1 || (roll.total <= target && roll.total !== 100);
        if (!success) {
            await targetActor.toggleStatusEffect('pinned', { active: true });
        }
        const verdict = success
            ? `<strong>passes</strong> — acts normally.`
            : `<strong>fails</strong> — is now <strong>Pinned</strong> (Half Actions only, −20 BS).`;
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: targetActor }),
            content: `<p><strong>Pinning Test</strong> (Willpower ${wp}${difficulty >= 0 ? '+' : ''}${difficulty} = ${target}): rolled <strong>${roll.total}</strong>. ${targetActor.name} ${verdict}</p>`,
            rolls: [roll],
        });
    }

    async _applyDamage(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const uuid = div.data('uuid');
        const damageType = div.data('type');
        const ignoreArmour = div.data('ignoreArmour');
        const location = div.data('location');
        const damage = div.data('damage');
        const penetration = div.data('penetration');
        const fatigue = div.data('fatigue');

        // Guard a stale/unresolvable uuid (null from fromUuid) and fall back to the current
        // target — same NPC-token-uuid staleness class as _assignDamage (BUG: NPC assign-damage).
        const resolved = uuid ? await fromUuid(uuid) : null;
        let actor = resolved?.actor ?? resolved ?? null;
        if (!actor) {
            const targeted = game.user.targets;
            if (targeted && targeted.size > 0) actor = targeted.values().next().value?.actor ?? null;
        }
        if (!actor) {
            ui.notifications.warn(`Cannot determine actor to assign hit.`);
            return;
        }
        for(const field of [damage, penetration, fatigue]) {
            if(field && !Number.isInteger(field)) {
                ui.notifications.warn(`Unable to determine damage/penetration/fatigue to assign.`);
                return;
            }
        }

        const assignDamageData = new AssignDamageData();
        assignDamageData.actor = actor;
        if(ignoreArmour || "true" === ignoreArmour || "TRUE" === ignoreArmour) {
            assignDamageData.ignoreArmour = true;
        }

        const hit = new Hit();
        if(location) {
            hit.location = location;
        }
        if(damage) {
            hit.totalDamage = Number.parseInt(damage);
        }
        if(penetration) {
            hit.totalPenetration = Number.parseInt(penetration);
        }
        if(fatigue) {
            hit.totalFatigue = Number.parseInt(fatigue);
        }
        if(damageType) {
            hit.damageType = damageType;
        }

        assignDamageData.hit = hit;

        await assignDamageData.update();
        await assignDamageData.finalize();
        await assignDamageData.performActionAndSendToChat();
    }

    async _rollOpposed(event) {
        event.preventDefault();
        const div = $(event.currentTarget);
        const char = div.data('opposedChar');
        const isSkill = div.data('opposedIsSkill') === true || div.data('opposedIsSkill') === 'true';
        const powerName = div.data('powerName');
        const targetUuid = div.data('targetUuid');

        // Resolve the defender: the cast-time target, else the current target, else the
        // selected token.
        let defender;
        if (targetUuid) {
            const d = await fromUuid(targetUuid);
            defender = d?.actor ?? d;
        }
        if (!defender) {
            defender = Array.from(game.user.targets ?? [])[0]?.actor;
        }
        if (!defender) {
            defender = canvas.tokens?.controlled?.[0]?.actor;
        }
        if (!defender) {
            ui.notifications.warn('Target or select the defending token, then click Roll Opposed.');
            return;
        }

        if (isSkill) {
            await defender.rollSkill(char);
        } else {
            await defender.rollCharacteristic(char, `Opposed: ${powerName}`);
        }
    }

    async assignDamageTool() {
        const sourceToken = DHTargetedActionManager.getSourceToken();
        const sourceActorData = sourceToken ? sourceToken.actor : source;
        if(!sourceActorData) return;

        const hitData = new Hit();
        const assignData = new AssignDamageData(sourceActorData, hitData);
        await prepareAssignDamageRoll(assignData);
    }

    getActionData(id) {
        return this.storedRolls[id];
    }

    storeActionData(actionData) {
        //TODO: Cleanup all rolls older than ? minutes
        this.storedRolls[actionData.id] = actionData;
    }

    /**
     * Data Expected to vocalize item:
     * actor, name, type description
     * @param data
     * @returns {Promise<void>}
     */
    async sendItemVocalizeChat(data) {
        const html = await renderTemplate('systems/rogue-trader-3rd/templates/chat/item-vocalize-chat.hbs', data);
        const actorData = data.actor;
        const actor = game.actors.get(actorData._id);
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor}),
            content: html,
            rollMode: game.settings.get('core', 'rollMode'),
            style: CONST.CHAT_MESSAGE_STYLES.IC,
        };
        if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
            chatData.whisper = ChatMessage.getWhisperRecipients('GM');
        } else if (chatData.rollMode === 'selfroll') {
            chatData.whisper = [game.user];
        }
        ChatMessage.create(chatData);
    }
}

export const DHBasicActionManager = new BasicActionManager();
