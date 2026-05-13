import { RogueTraderBaseActor } from './base-actor.mjs';
import { DHTargetedActionManager } from '../actions/targeted-action-manager.mjs';
import { SimpleSkillData } from '../rolls/action-data.mjs';
import { prepareCrewRoll, prepareTurretsRoll, prepareBoardingRoll} from '../prompts/crew-prompt.mjs';
import { DHBasicActionManager } from '../actions/basic-action-manager.mjs';

export class RogueTraderVoidship extends RogueTraderBaseActor {

    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);
        let initData = {
            "prototypeToken.bar1": { "attribute": "hull" },
            "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            "prototypeToken.displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.NEUTRAL,
            "prototypeToken.name": data.name
        }
        this.updateSource(initData)
    }

    async prepareData() {
        await super.prepareData();
        this._computeSpace();
        this._computePower();
    }

    get faction() {
        return this.system.faction;
    }
    get subfaction() {
        return this.system.subfaction;
    }
    get subtype() {
        return this.system.type;
    }
    get threatLevel() {
        return this.system.threatLevel;
    }

    get crewRating() {
        return this.system.crewRating;
    }

    get spaceValue() {
        return this.system.spaceValue;
    }

    get powerValue() {
        return this.system.powerValue;
    }

    get operators() {
        return {
            weapons: this.system.operator.weapons,
            helm: this.system.operator.helm,
            boarding: this.system.operator.boarding,
            augurs: this.system.operator.augurs
        }
    }

    _computeSpace() {
        let spaceValue = 0;
        this.items.forEach(item => {
            if (item.type === 'shipWeapon' || item.type === 'shipComponent') {
                spaceValue = spaceValue + item.system.space;
            }
        })
        this.system.spaceValue = spaceValue;
    }

    _computePower() {
        let powerValue = 0;
        this.items.forEach(item => {
            if (item.type === 'shipWeapon' || item.type === 'shipComponent') {
                powerValue = powerValue + item.system.power;
            }
        })
        this.system.powerValue = powerValue;
    }

    hasTalent(talent) {
        return !!this.items.filter((i) => i.type === 'talent').find((t) => t.name === talent);
    }

    async rollCrew(crewActionName, operator) {
        const simpleSkillData = new SimpleSkillData();
        const rollData = simpleSkillData.rollData;
        rollData.actor = this;
        rollData.nameOverride = crewActionName;
        rollData.type = 'Check';
        rollData.baseTarget = this.system.crewRating;
        switch (crewActionName){
            case "Maneuver": {
                rollData.baseTarget = rollData.baseTarget + (this.system.maneuverability ? this.system.maneuverability : 0);
                break;
            }
            case "Detection": {
                rollData.baseTarget = rollData.baseTarget + (this.system.detection ? this.system.detection : 0);
                break;
            }
        }
        rollData.modifiers.modifier = 0;
        rollData.modifiers.operator = operator ? operator : 0;
        await prepareCrewRoll(simpleSkillData);
    }

    async rollTurrets() {
        const simpleSkillData = new SimpleSkillData();
        const rollData = simpleSkillData.rollData;
        rollData.actor = this;
        rollData.nameOverride = "Turrets";
        rollData.voidshipTurrets = true;
        rollData.type = 'Check';
        rollData.baseTarget = this.system.crewRating;
        rollData.turretsShot = this.system.turrets;
        rollData.modifiers.modifier = 0;
        await prepareTurretsRoll(simpleSkillData);
    }

    async rollBoarding(operator) {
        const simpleSkillData = new SimpleSkillData();
        const rollData = simpleSkillData.rollData;
        rollData.actor = this;
        rollData.nameOverride = "Boarding";
        rollData.voidshipBoarding = true;
        rollData.type = 'Check';
        rollData.baseTarget = this.system.crewRating;
        rollData.boardingAttacks = this.system.boarding.actions;
        rollData.boardingDamage = this.system.boarding.damage;
        rollData.modifiers.modifier = 0;
        rollData.modifiers.operator = operator ? operator : 0;
        await prepareBoardingRoll(simpleSkillData);
    }

    async rollItem(itemId) {
        game.rt.log('RollItem', itemId);
        const item = this.items.get(itemId);
        switch (item.type) {
            case 'shipWeapon':
                if (item.system.isDestroyed) {
                    ui.notifications.warn('Weapon is Destroyed and cannot shoot!');
                    return;
                }
                await DHTargetedActionManager.performShipWeaponAttack(this, null, item);
                return;
            default:
                await DHBasicActionManager.sendItemVocalizeChat({
                    actor: this.name,
                    name: item.name,
                    type: item.type?.toUpperCase(),
                    description: await TextEditor.enrichHTML(item.system.benefit ?? item.system.description, {
                        rollData: {
                            actor: this,
                            item: item,
                            pr: this.psy.rating
                        }
                    }),
                });
        }
    }
}
