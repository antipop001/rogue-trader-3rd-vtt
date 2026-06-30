import { hitDropdown } from '../rules/hit-locations.mjs';
import { getCriticalDamage } from '../rules/critical-damage.mjs';
import { getVehicleCritical } from '../rules/vehicle-critical-damage.mjs';
import { damageTypeDropdown } from '../rules/damage-type.mjs';
import { voidshipHitTypeDropdown } from '../rules/hit-type.mjs';
import { voidshipHitLocationDropdown } from '../rules/voidship-hit-locations.mjs';
import { drawShipCriticalResult } from '../rules/voidship-critical-damage.mjs';
import { conditionsFromCriticalText } from '../rules/conditions.mjs';
import { daemonicToughnessMultiplier, fellingToughnessBonus } from './roll-helpers.mjs';

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

    // Vehicle damage (QA-115): facing Armour by arc → Structural Integrity, no TB.
    isVehicle = false;
    facing = 'front';
    facingDropdown = { front: 'Front', side: 'Side', rear: 'Rear' };
    facingArmour = 0;
    integrityDamage = 0;
    integrityCritical = 0;

    constructor(actor, hit) {
        this.actor = actor;
        this.hit = hit;
        this.isVehicle = actor?.type === 'vehicle';
    }

    async update() {
        this.armour = 0;
        this.tb = 0;
        // Vehicles have no per-location `system.armour` map — entering the creature loop below
        // would `Object.entries(undefined)` and throw (QA-115). Read the selected facing's
        // Armour Points instead (front/side/rear, stored as strings).
        if (this.isVehicle) {
            const apStr = this.actor.system?.[this.facing] ?? this.actor.system?.front ?? '0';
            this.facingArmour = Number.parseInt(apStr) || 0;
            return;
        }
        const location = this.hit?.location;
        if(location) {
            for(const [name, locationArmour] of Object.entries(this.actor.system.armour)) {
                if(location.replace(/\s/g, "").toUpperCase() === name.toUpperCase()) {
                    // `total` = worn + Natural-Armour + cybernetic AP (BUG-005); `value`
                    // would be worn-only and silently ignore creature/cybernetic armour.
                    this.armour = locationArmour.total;
                    this.tb = locationArmour.toughnessBonus;
                }
            }
        }
        // Daemonic (RT Core p.364): a Daemonic target soaks all damage with DOUBLE its
        // Toughness Bonus. Applied here so the boosted TB flows through both the main
        // damage reduction and the True Grit crit reduction in finalize(). The canon
        // exceptions (force weapons / psychic powers / holy attacks / other Daemonic
        // creatures) are not surfaced in the assign-damage hitData — GM-adjudicated.
        // Felling (X) (RT p.131): the attack ignores X levels of the target's Unnatural
        // Toughness, reducing the soak TB toward its base before any Daemonic doubling.
        // (BUG-Q-195 — was a cosmetic-only chat note.)
        const fellingLevel = Number(this.hit?.fellingLevel) || 0;
        if (fellingLevel > 0) {
            const unnatural = Number(this.actor?.system?.characteristics?.toughness?.unnatural) || 0;
            this.tb = fellingToughnessBonus(this.tb, unnatural, fellingLevel);
        }
        const traits = this.actor?.items?.filter?.((i) => i.type === 'trait') ?? [];
        this.tb *= daemonicToughnessMultiplier(traits);
    }

    /** True if the struck location's worn armour is itself Primitive — RT Core p.142:
     *  Primitive armour is NOT doubled against Primitive weapons (BUG-013). */
    _armourIsPrimitive() {
        const norm = this.hit?.location?.replace(/\s/g, '').toUpperCase();
        const key = ['head', 'leftArm', 'rightArm', 'body', 'leftLeg', 'rightLeg']
            .find((k) => k.toUpperCase() === norm);
        if (!key) return false;
        return (this.actor?.items ?? []).some((i) => i.type === 'armour' && i.system?.equipped
            && String(i.system?.type ?? '').toLowerCase() === 'primitive'
            && Number(i.system?.armourPoints?.[key] ?? 0) > 0);
    }

    async finalize() {
        if(this.hit.voidshipHit) {
            this.voidshipHit = true;
            const voidshipHitLocation = this.hit.voidshipHitLocation;

            const targetedComponents = [];
            this.actor.items.forEach ((item) => {
                if ((item.type === 'shipWeapon' || item.type === 'shipComponent') && (item.system.location === voidshipHitLocation) &&
                    (item.system.hitPoints > 0 && !item.system.isDestroyed)) {
                    targetedComponents.push(item);
                }
            })
            if (targetedComponents.length < 1) {
                this.actor.items.forEach ((item) => {
                    if ((item.type === 'shipWeapon' || item.type === 'shipComponent') && (item.system.location === "Main") &&
                        (item.system.hitPoints > 0 && !item.system.isDestroyed)) {
                        targetedComponents.push(item);
                    }
                })
            }
            // RT Core p.216: Hull Integrity lost = the salvo's combined rolled Damage minus
            // the facing Armour once (macro) / ignoring Armour (lance), computed at attack
            // resolution and carried on the hit. A Critical Hit that did 0 Hull still inflicts
            // 1 automatic point, then rolls 1d5 on the canonical chart (per critical hit).
            // (QA-042 — replaces the fixed 1/2/4 tier constants.)
            this.voidshipHullDamage = Math.max(0, Number(this.hit.voidshipHullDamage) || 0);
            const critHits = Math.max(0, Number(this.hit.voidshipCritHits) || 0)
                || (/Critical/.test(this.hit.voidshipHitType || '') ? 1 : 0);
            if (critHits > 0 && this.voidshipHullDamage <= 0) {
                this.voidshipHullDamage = 1;
            }
            for (let i = 0; i < critHits; i++) {
                const component = targetedComponents[Math.floor(Math.random() * targetedComponents.length)];
                await this.executeCritical(component);
            }
        } else if (this.isVehicle) {
            // Vehicle damage (ItS Ch.V, QA-115): the struck facing's Armour reduces the hit
            // (Penetration applies, as for personal armour; NO Toughness Bonus), and the result
            // is applied to Structural Integrity. Overflow past current integrity accrues as
            // integrity.critical (the producer the field previously lacked) and triggers the
            // Vehicle Critical Hit chart (QA-117).
            const totalDamage = Number.parseInt(this.hit.totalDamage);
            const totalPenetration = Number.parseInt(this.hit.totalPenetration);
            let armour = this.ignoreArmour ? 0 : Math.max(0, this.facingArmour - totalPenetration);
            const reduced = totalDamage - armour;
            if (reduced > 0) {
                const intVal = Number(this.actor.system.integrity?.value) || 0;
                if (intVal >= reduced) {
                    this.integrityDamage = reduced;
                } else {
                    this.integrityDamage = intVal;
                    this.integrityCritical = reduced - intVal;
                    this.hasCriticalDamage = true;
                }
                this.damageTaken = this.integrityDamage;
                this.hasDamage = this.integrityDamage > 0;
            }
            if (this.integrityCritical > 0) {
                // Cumulative chart (ItS Table 5-2): index by the vehicle's TOTAL critical damage.
                const cumulative = (Number(this.actor.system.integrity?.critical) || 0) + this.integrityCritical;
                this.criticalEffect = getVehicleCritical(cumulative);
            }
        } else {

            let totalDamage = Number.parseInt(this.hit.totalDamage);
            let totalPenetration = Number.parseInt(this.hit.totalPenetration);

            // Cover (RT Core p.245): if the struck location is concealed behind cover, the
            // cover's Armour Points absorb the hit FIRST (Penetration does reduce cover AP),
            // and only the excess reaches the target — then resolved against the target's own
            // armour + TB as normal. Each hit that gets any excess damage through erodes the
            // cover's AP by 1. General rule: a character firing around/over cover has body and
            // legs concealed, so only Body/Leg hits are intercepted. (QA-111.)
            const coverAp = Number(this.actor.system?.combat?.cover?.ap) || 0;
            const struckLoc = String(this.hit?.location ?? '').replace(/\s/g, '').toUpperCase();
            if (coverAp > 0 && ['BODY', 'LEFTLEG', 'RIGHTLEG'].includes(struckLoc)) {
                const effectiveCover = Math.max(0, coverAp - totalPenetration);
                const excess = Math.max(0, totalDamage - effectiveCover);
                this.coverApplied = true;
                this.coverAp = coverAp;
                this.coverAbsorbed = totalDamage - excess;
                this.coverDegraded = excess > 0;
                this.coverApAfter = excess > 0 ? Math.max(0, coverAp - 1) : coverAp;
                totalDamage = excess;
            }

            // RT Core p.142: a Primitive weapon doubles the target's Armour Points
            // (before penetration is applied), unless the struck location's armour is
            // ALSO Primitive (BUG-013).
            let usableArmour = this.armour;
            if (this.hit.primitive && !this._armourIsPrimitive()) {
                usableArmour = usableArmour * 2;
            }
            // Reduce Armour by Penetration
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

            // Crack Shot (+2 ranged) / Crippling Strike (+4 melee) add extra Critical
            // Damage ONLY when the attack actually causes Critical Damage (RT Core p.96).
            // The bonus was precomputed on the Hit at damage time (attacker talents +
            // melee/ranged known there). Applied before True Grit so the talent's TB
            // reduction and the Critical Hits table lookup use the boosted total.
            if (this.hasCriticalDamage && Number(this.hit?.criticalDamageBonus) > 0) {
                this.criticalDamageTaken += Number(this.hit.criticalDamageBonus);
            }

            if (this.criticalDamageTaken > 0) {

                // Handle True Grit Talent
                if (this.actor.hasTalent('True Grit')) {
                    // RT Core p.96: halve the Critical Damage (rounding up). (Was a DH2 TB-subtract.)
                    this.criticalDamageTaken = Math.ceil(this.criticalDamageTaken / 2);
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

    // Apply ONE Critical Hit from the canonical RT Table 8-12 (RT Core p.232) — a 1d5 draw
    // on the `Critical Hits to Starships` RollTable, not the homebrew penetration×component
    // matrix (QA-043). The struck component (if any) loses a hit point as engine tracking.
    async executeCritical(component) {
        const result = await drawShipCriticalResult();
        const label = component?.name ? `${component.name}: ` : '';
        this.criticalEffect = this.criticalEffect
            ? `${this.criticalEffect}\n${label}${result}`
            : `${label}${result}`;
        if (component) {
            await component.update({ system: { hitPoints: component.system.hitPoints - 1 } });
        }
    }

    async performActionAndSendToChat() {
        // Assign Damage
        if (this.voidshipHit) {
            await this.actor.update({
                system: {
                    hull: {
                        value: this.actor.system.hull.value - this.voidshipHullDamage
                    },
                    crew: {
                        value: this.actor.system.crew.value - this.voidshipHullDamage
                    },
                    morale: {
                        value: this.actor.system.morale.value - this.voidshipHullDamage
                    }
                }
            });
        } else if (this.isVehicle) {
            // Vehicle writeback (QA-115): Structural Integrity, with overflow accruing to
            // integrity.critical (the cumulative Vehicle Critical Hit total).
            await this.actor.update({
                system: {
                    integrity: {
                        value: (Number(this.actor.system.integrity?.value) || 0) - this.integrityDamage,
                        critical: (Number(this.actor.system.integrity?.critical) || 0) + this.integrityCritical,
                    }
                }
            });
        } else {
            await this.actor.update({
                system: {
                    wounds: {
                        value: this.actor.system.wounds.value - this.damageTaken,
                        critical: this.actor.system.wounds.critical + this.criticalDamageTaken,
                    },
                    fatigue: {
                        value: this.actor.system.fatigue.value + this.fatigueTaken
                    },
                    // Persist cover degradation (QA-111): a hit that got excess damage through
                    // erodes the cover's AP by 1.
                    ...(this.coverApplied ? { combat: { cover: { ap: this.coverApAfter } } } : {})
                }
            });
        }

        // QA-080 inc.2: Critical effects are deterministic (no test to pass), and this runs
        // GM-side on the live target with write permission, so auto-apply the conditions the
        // crit text inflicts (Blood Loss, Stunned, Prone, Blinded, On Fire …). Use this.actor
        // directly — never re-fetch by id (BUG-005). Non-voidship targets only.
        if (!this.voidshipHit && !this.isVehicle && this.criticalEffect && this.actor?.isOwner) {
            for (const id of conditionsFromCriticalText(this.criticalEffect)) {
                if (!this.actor.statuses?.has(id)) {
                    await this.actor.toggleStatusEffect(id, { active: true });
                }
            }
        }
        game.rt.log('performActionAndSendToChat', this)

        const html = await renderTemplate('systems/rogue-trader-3rd/templates/chat/assign-damage-chat.hbs', this);
        // Use the live target document directly (do NOT re-fetch via game.actors by id —
        // that returns the wrong document for unlinked token actors, and the previous
        // `this.actor = await this.actor.update()` could clobber this.actor with the
        // update() return value and crash the chat step — BUG-005).
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
