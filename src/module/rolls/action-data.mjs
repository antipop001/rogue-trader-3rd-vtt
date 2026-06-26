import { PsychicRollData, RollData, WeaponRollData } from './roll-data.mjs';
import { Hit, PsychicDamageData, scatterDirection, WeaponDamageData } from './damage-data.mjs';
import { attackTalentExtraHits, getDegree, getOpposedDegrees, roll1d100, sendActionDataToChat, stunDefenceBonus, uuid } from './roll-helpers.mjs';
import { refundAmmo, useAmmo } from '../rules/ammo.mjs';
import { DHBasicActionManager } from '../actions/basic-action-manager.mjs';
import { conditionMeta } from '../rules/conditions.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { RogueTraderSettings } from '../rogue-trader-settings.mjs';

/**
 * Roll the named RollTable from the system's `tables` compendium and return
 * the result text. Returns null if the table or compendium can't be located.
 */
async function drawFromTable(tableName) {
    try {
        const pack = game.packs.get(`${SYSTEM_ID}.tables`);
        if (!pack) return null;
        const index = pack.index?.size ? pack.index : await pack.getIndex();
        const entry = index.find(e => e.name === tableName);
        if (!entry) return null;
        const table = await pack.getDocument(entry._id);
        if (!table) return null;
        const draw = await table.roll();
        const results = draw?.results ?? [];
        return results.map(r => r.text ?? r.description ?? '').filter(Boolean).join(' ');
    } catch (err) {
        console.warn(`[rt] drawFromTable("${tableName}") failed:`, err);
        return null;
    }
}

export class ActionData {
    id = uuid();
    template = '';
    hasDamage = false;
    rollData;
    damageData;
    effects = [];
    effectOutput = [];

    reset() {
        this.effects = [];
        this.effectOutput = [];
        this.damageData.reset();
        this.rollData.reset();
    }

    async checkForPerils() {
        if (!this.rollData.power) return;
        const rating = this.rollData.sourceActor.psy.rating ?? 0;
        const pr = this.rollData.pr ?? 0;
        const isDoubles = /^(.)\1+$/.test(this.rollData.roll.total);
        // RT 1e: Fettered (pr < rating) never triggers Psychic Phenomena.
        if (pr < rating) return;

        // Unfettered (pr === rating): trigger on doubles.
        // Push (pr > rating): trigger on any non-doubles.
        let triggerPhenomena = false;
        let label = '';
        if (pr > rating) {
            // Push (RT Core p.157 Table 6-1): ALWAYS rolls Psychic Phenomena, doubles or
            // not. There is no "Push + doubles → Perils" rule — that was a DH2 leftover.
            // Perils is reached only via a 75+ Phenomena result, escalated below. (QA-038.)
            triggerPhenomena = true;
            label = 'Push';
        } else if (isDoubles) {
            // Unfettered (pr === rating): Phenomena on doubles.
            triggerPhenomena = true;
            label = 'Unfettered';
        }

        if (triggerPhenomena) {
            const phenom = await drawFromTable('Psychic Phenomena');
            const text = phenom ? `The warp convulses with energy! ${phenom}` : 'The warp convulses with energy! — roll Psychic Phenomena manually.';
            this.addEffect('Psychic Phenomena', text + (label ? ` (${label})` : ''));
            // A 75+ Psychic Phenomena result escalates to Perils of the Warp (RT Core
            // p.157 — the 75+ row says "roll on Table 6-3 instead").
            if (phenom && /perils of the warp/i.test(phenom)) {
                const perils = await drawFromTable('Perils of the Warp');
                if (perils) this.addEffect('Perils of the Warp', `The Perils of the Warp claim the psyker! ${perils}`);
            }
        }
    }

    async checkForOpposed() {
        // Psychic powers resolve their opposed test via the prompted "Roll Opposed"
        // button (BUG-007) — skip the silent auto-roll here so it isn't done twice.
        if(this.rollData.isOpposed && this.rollData.targetActor && !this.rollData.power) {
            const rollCheck = await this.rollData.targetActor.rollCheck(this.rollData.opposedTarget);
            this.rollData.opposedRoll = rollCheck.roll;
            this.rollData.opposedDos = rollCheck.dos;
            this.rollData.opposedDof = rollCheck.dof;
            if(rollCheck.success) {
                if(this.rollData.opposedDos >= this.rollData.dos) {
                    this.rollData.success = false;
                }
            }
        }

        if (this.rollData.isFeint) {
            if(!this.rollData.success) {
                this.addEffect('Feint', `The character fails to feint against the target!`);
            } else {
                if (this.rollData.targetActor) {
                    this.addEffect('Feint', `The next melee Standard Attack action against that same target during this turn cannot be Evaded!`);
                } else {
                    this.addEffect('Feint', `Compare to targets Weapon Skill check. If the character wins, his next melee Standard Attack action against that same target during this turn cannot be Evaded.`);
                }
            }
        }

        if (this.rollData.isKnockDown) {
            if(this.rollData.targetActor) {
                const opposedDegrees = getOpposedDegrees(this.rollData.dos, this.rollData.dof, this.rollData.opposedDos, this.rollData.opposedDof);
                if(opposedDegrees >= 2) {
                    const strengthBonus = this.rollData.sourceActor?.characteristics?.strength?.bonus ?? 0;
                    this.addEffect('Knock Down', `The target is knocked Prone and must use a Stand action in his turn to regain his feet! The impact deals [[1d5-3+${strengthBonus}]] (min 0) damage and one level of fatigue to the target!`, ['prone']);
                } else if (opposedDegrees > 0) {
                    this.addEffect('Knock Down', `The target is knocked Prone and must use a Stand action in his turn to regain his feet!`, ['prone']);
                } else if (opposedDegrees > -2) {
                    this.addEffect('Knock Down', `The character fails to knock down the target!`);
                } else {
                    this.addEffect('Knock Down', `The character fails to knock down the target and in the failure knocks themselves prone instead!`);
                }
            } else {
                if(this.rollData.success) {
                    this.addEffect('Knock Down', `Compare to targets Strength check. If the attacker wins, the target is knocked Prone and must use a Stand action in his turn to regain his feet. If the attacker succeeds by two or more degrees of success, he can choose to inflict 1d5–3+SB Impact damage and one level of Fatigue on the target. If the target wins the test, he keeps his footing. If the target wins by two or more degrees of success, the attacker is knocked Prone instead.`);
                } else {
                    this.addEffect('Knock Down', `The character fails to knock down the target!`);
                }
            }
        }
    }

    async _calculateHit() {
        this.rollData.roll = await roll1d100();
        let rollTotal = this.rollData.roll.total;
        const target = this.rollData.modifiedTarget;
        this.rollData.success = rollTotal === 1 || (rollTotal <= target && rollTotal !== 100);
    }

    async calculateSuccessOrFailure() {
        let actionItem = this.rollData.weapon ?? this.rollData.power;
        if (actionItem && actionItem?.isShipWeapon) {
            await this._calculateVoidshipHits("Weapon", this.rollData.voidshipShotsAmount);
        } else {
            await this._calculateHit();

            // Action Item
            if (actionItem) {

                // All Out Attack — the attacker forfeits Dodge/Parry Reactions until his next
                // turn (RT Core p.245). Flag the actor so the Reaction gate blocks them; the
                // flag clears on his turn (onCombatTurnChange). (QA-071.)
                if (this.rollData.action === 'All Out Attack') {
                    this.addEffect('All Out Attack', 'The character cannot attempt Dodge or Parry Reactions until the beginning of his next turn.');
                    if (game.combat?.started && this.rollData.sourceActor?.system?.combat) {
                        await this.rollData.sourceActor.update({ 'system.combat.allOutAttack': true });
                    }
                }

                // Guarded Attack — +10 to all Dodge and Parry Tests until his next turn
                // (RT Core p.245). Flag the actor; cleared on his turn. (QA-071.)
                if (this.rollData.action === 'Guarded Attack') {
                    this.addEffect('Guarded Attack', 'The character gains +10 to all Dodge and Parry Tests until the beginning of his next turn.');
                    if (game.combat?.started && this.rollData.sourceActor?.system?.combat) {
                        await this.rollData.sourceActor.update({ 'system.combat.guardedAttack': true });
                    }
                }

                // Stun Action (RT Core p.250): a Hard (-20) Weapon Skill Test to hit; only
                // ON A HIT does the attacker roll 1d10+SB against the defender's 1d10 + TB +
                // 1 per head Armour Point (head AP DOUBLED when unarmed or Primitive). Target
                // is Stunned for (attacker − defender) rounds + 1 Fatigue. The WS test (with
                // its −20) was already resolved at _calculateHit() above; honour it. (QA-121.)
                if (this.rollData.isStun) {
                    if (!this.rollData.success) {
                        this.addEffect('Stun Attack', `The Weapon Skill Test misses — no Stun.`);
                        return;
                    }
                    const sb = this.rollData.sourceActor.getCharacteristicFuzzy('Strength').bonus;
                    const attackRoll = new Roll(`1d10+${sb}`, {});
                    await attackRoll.evaluate();
                    this.rollData.roll = attackRoll;

                    const isPrimitive = this.rollData.hasAttackSpecial('Primitive');
                    // An unarmed strike is a Melee weapon of `type: 'Unarmed'` (ENGINE-NATWEAPONS,
                    // cf. damage-data.mjs) — NOT a null weapon, so detect it by type.
                    const isUnarmed = String(this.rollData.weapon?.system?.type ?? '').toLowerCase() === 'unarmed';
                    const doubled = isPrimitive || isUnarmed;
                    if (this.rollData.targetActor) {
                        const headArmour = this.rollData.targetActor.system.armour.head;
                        const defBonus = stunDefenceBonus(headArmour.total, headArmour.toughnessBonus, isUnarmed, isPrimitive);
                        const defenceRoll = new Roll(`1d10+${defBonus}`, {});
                        await defenceRoll.evaluate();
                        const note = doubled ? ' (head AP doubled)' : '';
                        if (attackRoll.total >= defenceRoll.total) {
                            this.rollData.success = true;
                            const rounds = attackRoll.total - defenceRoll.total;
                            this.addEffect('Stun Attack', `Hit! Stun ${attackRoll.total} (1d10+SB) vs defence ${defenceRoll.total} (1d10+TB+headAP${note}). Target is Stunned for ${rounds} round${rounds === 1 ? '' : 's'} and gains 1 level of Fatigue.`, ['stunned']);
                        } else {
                            this.rollData.success = false;
                            this.addEffect('Stun Attack', `Hit, but Stun ${attackRoll.total} (1d10+SB) vs defence ${defenceRoll.total} (1d10+TB+headAP${note}) — the target shrugs it off.`);
                        }
                    } else {
                        this.rollData.success = true;
                        this.addEffect('Stun Attack', `Hit! Stun roll ${attackRoll.total} (1d10+SB). The target rolls 1d10 + Toughness Bonus + 1 per head Armour Point${doubled ? ' (doubled — unarmed/Primitive)' : ''}; if your roll is equal or higher, he is Stunned for the difference in rounds and gains 1 level of Fatigue.`, ['stunned']);
                    }
                    return;
                }

                if (this.rollData.hasAttackSpecial('Flame')) {
                    // Flame weapons make no BS test — they auto-hit (RT Core p.142).
                    // Everyone in the 30° cone must pass an Agility Test or be struck (in
                    // the body — the location is forced to Body in createHit). (QA-131.)
                    this.rollData.success = true;
                    this.rollData.dos = 1;
                    this.rollData.dof = 0;
                    this.addEffect('Flame', 'No BS test — each creature in the 30° cone must pass an Agility Test or be hit (in the body). A struck target is set On Fire (RT Core p.142).', ['onFire'])
                }

                if (actionItem.isMelee) {
                    if (!this.rollData.success) {
                        // Re-Roll Attack for Blademaster
                        if (this.rollData.sourceActor.hasTalent('Blademaster')) {
                            this.effects.push('blademaster');
                            this.rollData.previousRolls.push(this.rollData.roll);
                            await this._calculateHit();
                        }
                    }
                } else if (actionItem.isRanged) {
                    // Suppressing Fire / Overwatch — targets in the arc make a Pinning Test
                    // (Willpower) or become Pinned (RT Core p.248). (QA-082.)
                    if (this.rollData.action === 'Suppressing Fire - Semi') {
                        this.addEffect('Suppressing', 'All targets within a 30 degree arc must pass a Difficult (-10) Pinning test or become Pinned.', null, -10)
                    } else if (this.rollData.action === 'Suppressing Fire - Full') {
                        this.addEffect('Suppressing', 'All targets within a 45 degree arc must pass a Hard (-20) Pinning test or become Pinned.', null, -20)
                    } else if (this.rollData.action === 'Overwatch') {
                        this.addEffect('Overwatch', 'Targets in the 45 degree kill zone must pass an Ordinary (+0) Pinning test or become Pinned, even if the attack did no damage.', null, 0)
                    }

                    const rollTotal = this.rollData.roll.total;
                    const isBestRanged = actionItem.isRanged && actionItem.system.craftsmanship === 'Best';
                    const isOverheats = this.rollData.hasAttackSpecial('Overheats');
                    let jamThreshold = 96;
                    if (isBestRanged) {
                        jamThreshold = 101;
                    } else if (this.rollData.hasAttackSpecial('Reliable')) {
                        jamThreshold = 100;
                    } else if (this.rollData.hasAttackSpecial('Unreliable')) {
                        jamThreshold = 91;
                    }
                    if (isOverheats) {
                        // RT Core p.116: an Overheats weapon NEVER jams — it overheats at
                        // 91+, and any roll that WOULD jam overheats instead. Best-craft
                        // ranged suppresses it. (QA-098/099.)
                        if (!isBestRanged && (rollTotal >= 91 || rollTotal >= jamThreshold)) {
                            this.effects.push('overheat');
                        }
                    } else if (rollTotal >= jamThreshold) {
                        this.effects.push('jam');
                        this.rollData.success = false;
                    }
                }
            }


            if (this.rollData.success) {
                this.rollData.dof = 0;
                this.rollData.dos = 1 + getDegree(this.rollData.modifiedTarget, this.rollData.roll.total);

                if (actionItem) {
                    if (this.rollData.action === 'Semi-Auto Burst' ||
                        actionItem.isPsychicBarrage ||
                        this.rollData.action === 'Suppressing Fire - Semi' ||
                        this.rollData.action === 'Suppressing Fire - Full') {
                        if (actionItem.isRanged && this.rollData.hasWeaponModification('Fluid Action')) {
                            this.rollData.dos += 1;
                        }

                        // Possible Semi Rate
                        this.damageData.additionalHits += Math.floor((this.rollData.dos - 1) / 2);

                        // But Max at fire rate (Ammo available / ammo per shot || rate of fire - whichever is lower)
                        if (actionItem.isRanged && this.damageData.additionalHits > this.rollData.fireRate - 1) {
                            this.damageData.additionalHits = this.rollData.fireRate - 1;
                        }
                    } else if (this.rollData.action === 'Full Auto Burst' || actionItem.isPsychicStorm) {
                        // Possible Full Rate
                        this.damageData.additionalHits += Math.floor(this.rollData.dos - 1);

                        // But Max at weapon rate
                        if (actionItem.usesAmmo && this.damageData.additionalHits > this.rollData.fireRate - 1) {
                            this.damageData.additionalHits = this.rollData.fireRate - 1;
                        }
                    }
                }

                // Swift Attack / Lightning Attack — RT 1e melee multi-attack TALENTS
                // (RT Core p.107 / p.102): a flat number of extra hits on a successful
                // WS test (Swift = 1 → two attacks, Lightning = 2 → three attacks), NOT
                // the DoS-scaled count the legacy DH2 actions used. Applied by name.
                this.damageData.additionalHits += attackTalentExtraHits(this.rollData.action);

                if (this.rollData.dos > 1 && this.rollData.hasAttackSpecial('Twin-Linked')) {
                    if ((this.rollData.action === 'Standard Attack' || this.rollData.action === 'Called Shot') && this.rollData.dos > 2)
                    {
                        this.damageData.additionalHits++;
                    }
                    if (this.rollData.action === 'Semi-Auto Burst')
                    {
                        this.damageData.additionalHits = Math.floor(this.rollData.dos / 3);
                    }
                    if (this.rollData.action === 'Full Auto Burst')
                    {
                        this.damageData.additionalHits = Math.floor(this.rollData.dos / 2);
                    }
                }

                // Storm: every hit counts as two hits (RT Core p.121)
                if (this.rollData.hasAttackSpecial('Storm')) {
                    this.damageData.additionalHits += 1 + this.damageData.additionalHits;
                }

            } else {
                this.rollData.dos = 0;
                // RT 1e: Degrees of Failure = difference in the tens digit (RT Core
                // p.22). The leading `1 +` was a DH2 carryover that over-counted by one
                // (BUG-001). NB: DoS above (line ~226) keeps its `1 +` on purpose — the
                // combat additional-hits math is written against that convention.
                this.rollData.dof = getDegree(this.rollData.roll.total, this.rollData.modifiedTarget);

                if (this.rollData.isThrown) {
                    this.addEffect('Deviation', `The attack deviates [[ 1d5 ]]m off course to the ${scatterDirection()}!`);
                }

                if (this.rollData.roll.total === 100) {
                    this.effects.push('auto-failure');
                }
            }
        }
    }

    async _calculateVoidshipHits(type, amount) {
        if (type === "Boarding") {
            for (let i = 0; i < amount; i++) {
                this.rollData.roll = await roll1d100();
                let rollTotal = this.rollData.roll.total;
                this.rollData.voidshipResults.push(rollTotal);
                const target = this.rollData.modifiedTarget;
                if (rollTotal <= target / 10 && rollTotal !== 100) {
                    this.rollData.boardingSuccess++;
                    this.rollData.boardingSuccess++;
                } else if (rollTotal <= target && rollTotal !== 100) {
                    this.rollData.boardingSuccess++;
                }
            }
            if (this.rollData.boardingSuccess > 0) {
                this.rollData.success = true;
            }
        }
        if (type === "Turrets") {
            for (let i = 0; i < amount; i++) {
                this.rollData.roll = await roll1d100();
                let rollTotal = this.rollData.roll.total;
                this.rollData.voidshipResults.push(rollTotal);
                const target = this.rollData.modifiedTarget;
                if (rollTotal <= target / 10 && rollTotal !== 100) {
                    this.rollData.turretsHit++;
                    this.rollData.turretsHit++;
                } else if (rollTotal <= target && rollTotal !== 100) {
                    this.rollData.turretsHit++;
                }
            }
            if (this.rollData.turretsHit > 0) {
                this.rollData.success = true;
            }
        }
        if (type === "Weapon") {
            for (let i = 0; i < amount; i++) {
                let result = {
                    isCritical: false,
                    isHit: false,
                    isMiss: false,
                    isFumble: false,
                    penetration: false,
                    overpenetration: false,
                    roll: 0,
                    location: ""
                };
                this.rollData.roll = await roll1d100();
                let rollTotal = this.rollData.roll.total;
                const target = this.rollData.modifiedTarget;
                if (rollTotal <= target / 10 && rollTotal !== 100) {
                    result.isCritical = true;
                } else if (rollTotal <= target && rollTotal !== 100) {
                    result.isHit = true;
                } else if (rollTotal <= (100 - (10 - target/10)) && rollTotal !== 100) {
                    result.isMiss = true;
                } else {
                    result.isFumble = true;
                }
                if (this.rollData.hasAttackSpecial('Destructive') && result.isHit) {
                    result.isCritical = true;
                    result.isHit = false;
                }
                result.roll = rollTotal;
                this.rollData.voidshipResults.push(result);
            }
        }
    }

    async _calculateVoidshipHit() {
        this.rollData.roll = await roll1d100();
        let rollTotal = this.rollData.roll.total;
        const target = this.rollData.modifiedTarget;
        // this.rollData.success = rollTotal === 1 || (rollTotal <= target && rollTotal !== 100);
        if (rollTotal <= target/10 && rollTotal !== 100) {
            this.rollData.voidshipFlawless = true;
        } else if (rollTotal <= target && rollTotal !== 100) {
            this.rollData.voidshipSuccess = true;
        } else if (rollTotal <= (target + 10) && rollTotal !== 100) {
            this.rollData.voidshipFlawedSuccess = true;
        } else if (rollTotal <= (100 - (10 - target/10)) && rollTotal !== 100) {
            this.rollData.voidshipFailure = true;
        } else {
            this.rollData.voidshipFumble = true;
        }
    }

    async calculateResultVoidship() {
        if (this.rollData.name === "Turrets") {
            await this._calculateVoidshipHits(this.rollData.name, this.rollData.turretsShot);
        } else if (this.rollData.name === "Boarding") {
            await this._calculateVoidshipHits(this.rollData.name, this.rollData.boardingAttacks);
        } else {
            await this._calculateVoidshipHit();
        }
    }

    reverseD100(roll) {
        return parseInt(roll.toString().padStart(2, '0').split('').reverse().join(''));
    }

    async calculateHitLocations() {
        this.rollData.voidshipResults.forEach((result) => {
            if (result.isCritical || result.isHit ) {
                let hitRoll = this.reverseD100(result.roll);
                switch (this.rollData.voidshipFacing) {
                    case 0: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 50) {
                        result.location = "Prow";
                    } else if (hitRoll <= 90) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                    case 1: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 25) {
                        result.location = "Prow";
                    } else if (hitRoll <= 85) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                    case 2: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 25) {
                        result.location = "Prow";
                    } else if (hitRoll <= 85) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                    case 3: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 20) {
                        result.location = "Prow";
                    } else if (hitRoll <= 50) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                }
            }
        })
    }

    async calculateVoidShields() {
        if (!this.rollData.targetActor || this.rollData.targetActor.type !== "voidship") return;
        if (this.rollData.weapon.system.type === "Lance") return;

        let shields = this.rollData.targetActor.system.shields;
        if (shields <= 0) return;

        for (const result of this.rollData.voidshipResults) {
            if (shields <= 0) break;
            if (result.isCritical || result.isHit) {
                result.isShielded = true;
                result.isCritical = false;
                result.isHit = false;
                shields--;
                this.rollData.voidshipShieldsUsed++;
            }
        }

        await this.rollData.targetActor.update({
            system: { shields: shields }
        });
    }

    async calculatePenetration() {
        let damage = this.rollData.weapon.system.damage;

        if (this.rollData.weapon.system.type === "Lance") {
            this.rollData.voidshipDamage = damage;
            if (this.rollData.targetActor && this.rollData.targetActor.type === "voidship") {
                this.rollData.voidshipTarget = true;
                this.rollData.voidshipResults.forEach((result) => {
                    if (result.isCritical || result.isHit) {
                        result.penetration = true;
                    }
                });
            }
            return;
        }

        if (this.rollData.weapon.system.type === "Macrocannon") {
            if (this.rollData.hasAttackSpecial('Scattershot')) {
                switch (this.rollData.rangeName) {
                    case "Short Range" :
                        damage = damage + 3;
                        break;
                    case "Long Range" :
                        damage = damage - 3;
                        break;
                }
            } else if (this.rollData.hasAttackSpecial('Self Propelled Warhead')) {
                switch (this.rollData.rangeName) {
                    case "Short Range" :
                        damage = damage + 2;
                        break;
                }
            } else {
                switch (this.rollData.rangeName) {
                    case "Short Range" :
                        damage = damage + 2;
                        break;
                    case "Long Range" :
                        damage = damage - 2;
                        break;
                }
            }
        }
        this.rollData.voidshipDamage = damage;
        if (this.rollData.targetActor && this.rollData.targetActor.type === "voidship") {
            this.rollData.voidshipTarget = true;
            const baseArmour = this.rollData.targetActor.system.armour;
            const cb = this.rollData.targetActor.system.componentBonuses ?? {};
            const armour = {
                prow: (baseArmour.prow || 0) + (cb.armour || 0) + (cb.armourProw || 0),
                side: (baseArmour.side || 0) + (cb.armour || 0),
                rear: (baseArmour.rear || 0) + (cb.armour || 0)
            };
            this.rollData.voidshipResults.forEach((result) => {
                if (result.isCritical || result.isHit ) {
                    switch (this.rollData.voidshipFacing) {
                        case 0:
                            if (damage >= (armour.prow+3)){
                                result.overpenetration = true;
                            } else if (damage >= armour.prow) {
                                result.penetration = true;
                            }
                            break;
                        case 1:
                            if (damage >= (armour.side+3)){
                                result.overpenetration = true;
                            } else if (damage >= armour.side) {
                                result.penetration = true;
                            }
                            break;
                        case 2:
                            if (damage >= (armour.side+3)){
                                result.overpenetration = true;
                            } else if (damage >= armour.side) {
                                result.penetration = true;
                            }
                            break;
                        case 3:
                            if (damage >= (armour.rear+3)){
                                result.overpenetration = true;
                            } else if (damage >= armour.rear) {
                                result.penetration = true;
                            }
                            break;
                    }
                }
            })
        }
    }

    async calculateHits() {
        if (this.rollData.success || this.rollData.isThrown) {
            let hit = await Hit.createHit(this, 0);
            this.damageData.hits.push(hit);

            for (let i = 0; i < this.damageData.additionalHits; i++) {
                hit = await Hit.createHit(this, i + 1);
                this.damageData.hits.push(hit);
            }
        }
    }

    addEffect(name, effect, conditions = null, pinning = null) {
        this.effectOutput.push({
            name: name,
            effect: effect,
            // QA-080 inc.2: optional condition ids this outcome lets the GM apply to the
            // target (rendered as "Apply: <name>" buttons on the chat card). Resolved to
            // {id, name} metadata here so the template stays logic-free.
            conditions: (conditions ?? [])
                .map((id) => conditionMeta(id))
                .filter(Boolean),
            // QA-082: when set, the card shows a "Roll Pinning Test" button at this WP-test
            // difficulty; on failure the target becomes Pinned. `pinning` is the modifier
            // (e.g. -10 Difficult, -20 Hard, 0 Ordinary).
            pinning: (pinning === null || pinning === undefined) ? null : { difficulty: pinning },
        })
    }

    async createEffectData() {
        for (const effect of this.effects) {
            switch(effect){
                case 'auto-failure':
                    this.addEffect('Auto Failure', `The roll resulted in an automatic failure!`);
                    break;
                case 'blademaster':
                    this.addEffect('Blademaster', `Original roll of ${this.rollData.previousRolls[0].total} rerolled.`);
                    break;
                case 'overheat': {
                    // RT Core p.116: the wielder suffers energy damage equal to the weapon's
                    // damage at Penetration 0 to an arm, OR may drop the weapon (a Free
                    // Action) to avoid it; the weapon then cools down and cannot be fired
                    // until the round after next. (QA-100. Auto-assigning the arm hit and the
                    // per-weapon cooldown round-state are deferred — they need the round-state
                    // machinery; here we roll the damage number and state the choice.)
                    const overheatFormula = this.rollData.weapon?.system?.damage;
                    let overheatDmg = '';
                    if (overheatFormula) {
                        try {
                            const r = new Roll(String(overheatFormula), {});
                            await r.evaluate();
                            overheatDmg = ` (${r.total} Energy damage, Pen 0, to an arm)`;
                        } catch (e) { /* unparseable formula — describe without a number */ }
                    }
                    this.addEffect('Overheats', `The weapon overheats! The wielder suffers energy damage equal to the weapon's damage at Penetration 0 to an arm${overheatDmg}, or may drop the weapon (a Free Action) to avoid the damage. The weapon must cool down and cannot be fired again until the round after next.`);
                    break;
                }
                case 'jam':
                    this.addEffect('Jam', `The weapon jams!`);
                    break;
            }
        }
    }

    async descriptionText() {}

    async useResources() {
        // Expend Ammo
        await useAmmo(this);

        // Use a Fate for Eye of Vengeance
        if(this.rollData.eyeOfVengeance) {
            await this.rollData.sourceActor.spendFate();
        }
    }

    async refundResources() {
        // Refund Ammo
        await refundAmmo(this);

        // Use a Fate for Eye of Vengeance
        if(this.rollData.eyeOfVengeance) {
            await this.rollData.sourceActor.update({
                system: {
                    fate: {
                        value: this.rollData.sourceActor.system.fate.value + 1
                    }
                }
            });
        }
    }

    async performActionAndSendToChat() {
        // Store Roll Information
        DHBasicActionManager.storeActionData(this);

        // Finalize Modifiers
        await this.rollData.calculateTotalModifiers();

        // Determine Success/Hits
        await this.calculateSuccessOrFailure();
        if (this.rollData.weapon && this.rollData.weapon.isShipWeapon) {
            this.rollData.voidshipAttack = true;
            await this.calculateVoidShields();
            await this.calculateHitLocations();
            await this.calculatePenetration();
        }

        if (this.rollData.action !== 'Stun') {
            await this.checkForOpposed();
            await this.checkForPerils();

            // Calculate Hits
            await this.calculateHits();

            // Create Specials
            await this.createEffectData();

            game.rt.log('Perform Action', this);

            // Description Text
            await this.descriptionText();

            // Use Resources
            await this.useResources();
        }

        // Render Attack Roll
        this.rollData.render = await this.rollData.roll.render();
        this.template = this.rollData.template;

        // Send to Chat
        await sendActionDataToChat(this);
    }
}

export class WeaponActionData extends ActionData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
        this.hasDamage = true;
        this.rollData = new WeaponRollData();
        this.damageData = new WeaponDamageData();
    }
}

export class PsychicActionData extends ActionData {
    psychicEffect = '';

    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
        this.hasDamage = true;
        this.rollData = new PsychicRollData();
        this.damageData = new PsychicDamageData();
    }

    async performActionAndSendToChat() {
        if(!this.rollData.hasDamage) {
            this.rollData.template = 'systems/rogue-trader-3rd/templates/chat/psychic-action-chat.hbs';
            this.template = 'systems/rogue-trader-3rd/templates/chat/psychic-action-chat.hbs';
        }
        await super.performActionAndSendToChat();
    }

    async descriptionText() {
        if(this.rollData.power) {
            this.psychicEffect = await TextEditor.enrichHTML(this.rollData.power.system.description, {rollData: this.rollData});
        }
    }
}

export class PsychicSkillData extends ActionData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
        this.hasDamage = false;
        this.rollData = new PsychicRollData();
    }
}

export class SimpleSkillData extends ActionData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/simple-roll-chat.hbs';
        this.hasDamage = false;
        this.rollData = new RollData();
    }
}
