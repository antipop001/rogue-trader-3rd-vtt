import { roll1d100 } from '../rolls/roll-helpers.mjs';

export async function handleBleeding(actor) {
    const context = {
        template: 'systems/rogue-trader-3rd/templates/chat/bleeding-chat.hbs',
        actor: actor
    }
    await sendActiveEffectMessage(context);
}

export async function handleOnFire(actor) {
    const context = {
        template: 'systems/rogue-trader-3rd/templates/chat/burning-chat.hbs',
        actor: actor,
        roll: await roll1d100(),
        target: actor.characteristics.willpower.total
    }
    const rollTotal = context.roll.total;
    context.success = rollTotal === 1 || (rollTotal <= context.target && rollTotal !== 100);

    const damageRoll = new Roll('1d10', {});
    await damageRoll.evaluate();
    context.damage = damageRoll.total;
    // A successful Willpower test beats out the flames (RT Core p.260). Clear the On Fire
    // status so the recurring handler stops firing next Round. (QA-080 inc.3.)
    if (context.success && actor.statuses?.has('onFire') && actor.isOwner) {
        await actor.toggleStatusEffect('onFire', { active: false });
    }
    await sendActiveEffectMessage(context);
}

export async function sendActiveEffectMessage(activeContext) {
    const html = await renderTemplate(activeContext.template, activeContext);
    const actorData = activeContext.actor;
    const actor = game.actors.get(actorData._id);
    let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor}),
        rollMode: game.settings.get('core', 'rollMode'),
        content: html,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    };
    if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
        chatData.whisper = ChatMessage.getWhisperRecipients('GM');
    } else if (chatData.rollMode === 'selfroll') {
        chatData.whisper = [game.user];
    }
    ChatMessage.create(chatData);
}
