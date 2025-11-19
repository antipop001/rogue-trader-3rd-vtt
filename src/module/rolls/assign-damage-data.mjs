import { hitDropdown } from '../rules/hit-locations.mjs';
import { getCriticalDamage } from '../rules/critical-damage.mjs';
import { damageTypeDropdown } from '../rules/damage-type.mjs';
import { voidshipHitTypeDropdown } from '../rules/hit-type.mjs';
import { voidshipHitLocationDropdown } from '../rules/voidship-hit-locations.mjs';
import { getVoidshipCriticalDamage } from '../rules/voidship-critical-damage.mjs';

export class AssignDamageData {
    locations = hitDropdown();
    actor;
    hit;
    damageType = damageTypeDropdown();
    ignoreArmour = false;

    armour = 0;
    tb = 0;

    hasFatigueDamage = false;
    fatigueTaken = 0;

    hasDamage = false;
    damageTaken = 0;
    hasCriticalDamage = false;
    criticalDamageTaken = 0;
    criticalEffect = '';

    voidshipHitType = voidshipHitTypeDropdown();
    voidshipHitLocation = voidshipHitLocationDropdown();
    voidshipHit = false;
    voidshipHullDamage = 0;

    constructor(actor, hit) {
        this.actor = actor;
        this.hit = hit;
    }

    async update() {
        this.armour = 0;
        this.tb = 0;
        const location = this.hit?.location;
        if(location) {
            for(const [name, locationArmour] of Object.entries(this.actor.system.armour)) {
                if(location.replace(/\s/g, "").toUpperCase() === name.toUpperCase()) {
                    this.armour = locationArmour.value;
                    this.tb = locationArmour.toughnessBonus;
                }
            }
        }
    }

    async finalize() {
        if(this.hit.voidshipHit) {
            this.voidshipHit = true;
            const voidshipHitLocation = this.hit.voidshipHitLocation;

            const targetedComponents = [];
            this.actor.items.forEach ((item) => {
                if ((item.type === 'shipWeapon' || item.type === 'shipComponent') && (item.system.location === voidshipHitLocation)) {
                    targetedComponents.push(item);
                }
            })
            if (targetedComponents.length < 1) {
                this.actor.items.forEach ((item) => {
                    if ((item.type === 'shipWeapon' || item.type === 'shipComponent') && (item.system.location === "Main")) {
                        targetedComponents.push(item);
                    }
                })
            }
            switch (this.hit.voidshipHitType) {
                case 'Overpenetrating Hit': {
                    this.voidshipHullDamage = 2;
                    let component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                    this.executeCritical("Penetrating", component);
                    component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                    this.executeCritical("Penetrating", component);
                    break;
                }
                case 'Penetrating Hit': {
                    this.voidshipHullDamage = 1;
                    let component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                    this.executeCritical("Penetrating", component);
                    break;
                }
                case 'Overpenetrating Critical Hit': {
                    this.voidshipHullDamage = 4;
                    let component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                    this.executeCritical("Critical", component);
                    component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                    this.executeCritical("Critical", component);
                    break;
                }
                case 'Penetrating Critical Hit': {
                    this.voidshipHullDamage = 2;
                    let component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                    this.executeCritical("Critical", component);
                    break;
                }
                case 'Nonpenetrating Critical Hit': {
                    this.voidshipHullDamage = 1;
                    let component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                    this.executeCritical("Nonpenetrating", component);
                    break;
                }
            }
        } else {

            let totalDamage = Number.parseInt(this.hit.totalDamage);
            let totalPenetration = Number.parseInt(this.hit.totalPenetration);

            // Reduce Armour by Penetration
            let usableArmour = this.armour;
            usableArmour = usableArmour - totalPenetration;
            if (usableArmour < 0) {
                usableArmour = 0;
            }
            if (this.ignoreArmour) {
                usableArmour = 0;
            }

            const reduction = usableArmour + this.tb;
            const reducedDamage = totalDamage - reduction;
            // We have damage to process
            if (reducedDamage > 0) {
                // No Wounds Available
                if (this.actor.system.wounds.value <= 0) {
                    // All applied as critical
                    this.hasCriticalDamage = true;
                    this.criticalDamageTaken = reducedDamage;
                } else {
                    //Reduce Wounds First
                    if (this.actor.system.wounds.value >= reducedDamage) {
                        // Only Wound Damage
                        this.damageTaken = reducedDamage;
                    } else {
                        // Wound and Critical
                        this.damageTaken = this.actor.system.wounds.value;
                        this.hasCriticalDamage = true;
                        this.criticalDamageTaken = reducedDamage - this.damageTaken;
                    }
                }
            }

            if (this.criticalDamageTaken > 0) {

                // Handle True Grit Talent
                if (this.actor.hasTalent('True Grit')) {
                    // Reduces by Toughness Bonus to minimum of 1
                    this.criticalDamageTaken = this.criticalDamageTaken - this.tb < 1 ? 1 : this.criticalDamageTaken - this.tb;
                }

                this.criticalEffect = getCriticalDamage(this.hit.damageType, this.hit.location, this.actor.system.wounds.critical + this.criticalDamageTaken);
            }

            if (this.hit.totalFatigue > 0) {
                this.hasFatigueDamage = true;
                this.fatigueTaken = this.hit.totalFatigue;
            }

            if (this.damageTaken > 0) {
                this.hasDamage = true;
            }
        }
    }

    executeCritical(type, component) {
        if(component.type === 'shipWeapon') {
            if (this.criticalEffect === '') {
                this.criticalEffect = component.name + ': ' + getVoidshipCriticalDamage(type, "Weapon");
            }
            else {
                this.criticalEffect = this.criticalEffect + '\n' + component.name + ': ' + getVoidshipCriticalDamage(type, "Weapon");
            }
        } else {
            if (this.criticalEffect === '') {
                this.criticalEffect = component.name + ': ' + getVoidshipCriticalDamage(type, component.system.componentType);
            }
            else {
                this.criticalEffect = this.criticalEffect + '\n' + component.name + ': ' + getVoidshipCriticalDamage(type, component.system.componentType);
            }
        }
    }

    async performActionAndSendToChat() {
        // Assign Damage
        if (this.voidshipHit) {
            this.actor = await this.actor.update({
                system: {
                    hull: {
                        value: this.actor.system.hull.value - this.voidshipHullDamage
                    }
                }
            });
        } else {
            this.actor = await this.actor.update({
                system: {
                    wounds: {
                        value: this.actor.system.wounds.value - this.damageTaken,
                        critical: this.actor.system.wounds.critical + this.criticalDamageTaken,
                    },
                    fatigue: {
                        value: this.actor.system.fatigue.value + this.fatigueTaken
                    }
                }
            });
        }
        game.rt.log('performActionAndSendToChat', this)

        const html = await renderTemplate('systems/rogue-trader-3rd/templates/chat/assign-damage-chat.hbs', this);
        const actorData = this.rollData.actor;
        const actor = game.actors.get(actorData._id);
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor}),
            rollMode: game.settings.get('core', 'rollMode'),
            content: html,
            type: CONST.CHAT_MESSAGE_STYLES.OTHER,
        };
        if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
            chatData.whisper = ChatMessage.getWhisperRecipients('GM');
        } else if (chatData.rollMode === 'selfroll') {
            chatData.whisper = [game.user];
        }
        ChatMessage.create(chatData);
    }
}
