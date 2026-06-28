import { roll1d100 } from './roll-helpers.mjs';


export class ForceFieldData {

    actor;
    forceField;
    protectionRating = 0;
    overloadRating = 1;

    roll;
    success = false;
    overload = false;

    constructor(actor, forceField) {
        this.actor = actor;
        this.forceField = forceField;

        this.protectionRating = this.forceField.system.protectionRating;
        this.overloadRating = this.craftsmanshipToOverload(this.forceField.system.craftsmanship);
    }

    update() {}

    craftsmanshipToOverload(craftsmanship) {
        switch(craftsmanship) {
            case 'Poor':
                return 20;
            case 'Common':
                return 10;
            case 'Good':
                return 5;
            default:
                return 1;
        }
    }

    async finalize() {
        this.roll = await roll1d100();

        if(this.roll.total <= this.protectionRating) {
            this.success = true;
        }

        if(this.roll.total <= this.overloadRating) {
            this.overload = true;
        }
    }

    async performActionAndSendToChat() {
        game.rt.log('performActionAndSendToChat', this)

        // Update to overloaded if necessary. Must be awaited and NOT reassigned — the old
        // `this.forceField = this.forceField.update(...)` clobbered the item doc with the
        // update Promise (fire-and-forget). (QA-103, same class as BUG-005.)
        if(this.overload) {
            await this.forceField.update({ system: { overloaded: true } });
        }

        const html = await renderTemplate('systems/rogue-trader-3rd/templates/chat/force-field-roll-chat.hbs', this);
        // Use the actor reference we were handed — `game.actors.get(this.actor._id)` returns
        // the wrong document (or none) for unlinked tokens. (QA-102, same class as BUG-005.)
        const actor = this.actor;
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
}
