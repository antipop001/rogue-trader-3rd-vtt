import { RogueTraderBaseActor } from './base-actor.mjs';
import { DHTargetedActionManager } from '../actions/targeted-action-manager.mjs';
import { SimpleSkillData } from '../rolls/action-data.mjs';
import { prepareCrewRoll } from '../prompts/crew-prompt.mjs';
import { DHBasicActionManager } from '../actions/basic-action-manager.mjs';
import { roll1d100, degreesOfSuccess, degreesOfFailure, getOpposedDegrees, boardingCommandBonus } from '../rolls/roll-helpers.mjs';
import { shipShootingCheck } from '../rules/ship-combat.mjs';

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
        this._computeComponentBonuses();
    }

    get subtype() {
        return this.system.type;
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

    _computeComponentBonuses() {
        const bonuses = {
            maneuverability: 0, hullIntegrity: 0, morale: 0,
            armour: 0, armourProw: 0, turrets: 0,
            detection: 0, speed: 0, bsShipWeapons: 0
        };
        this.items.forEach(item => {
            if (item.type !== 'shipComponent') return;
            if (item.system.isDestroyed || item.system.isUnpowered) return;
            const b = item.system.bonuses;
            if (!b) return;
            for (const key of Object.keys(bonuses)) {
                bonuses[key] += (b[key] || 0);
            }
        });
        this.system.componentBonuses = bonuses;
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
        const cb = this.system.componentBonuses ?? {};
        switch (crewActionName){
            case "Maneuver": {
                rollData.baseTarget = rollData.baseTarget + (this.system.maneuverability || 0) + (cb.maneuverability || 0);
                break;
            }
            case "Detection": {
                rollData.baseTarget = rollData.baseTarget + (this.system.detection || 0) + (cb.detection || 0);
                break;
            }
        }
        rollData.modifiers.modifier = 0;
        rollData.modifiers.operator = operator ? operator : 0;
        await prepareCrewRoll(simpleSkillData);
    }

    async rollTurrets() {
        // Turrets are a purely DEFENSIVE rating (RT Core p.220) — they never make a
        // Ballistic/percentile to-hit roll. Each point imposes −10 on the Pilot test of any
        // Hit-and-Run Attack against this ship, and adds +10 to this ship's Command Test in a
        // boarding action. Post the rating + its effects instead of rolling bogus fire. (QA-147.)
        const rating = (this.system.turrets || 0) + (this.system.componentBonuses?.turrets || 0);
        const content = `<p><strong>Turrets — rating ${rating}</strong> (defensive only):<br/>`
            + `−${rating * 10} to the Pilot (Space Craft) test of any Hit-and-Run Attack against this ship; `
            + `+${rating * 10} to this ship's Command Test during a boarding action (RT Core p.220). `
            + `Turrets do not make attack rolls.</p>`;
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content,
        });
    }

    // RT Core p.219-220: a boarding action (initiated by a Hard −20 Pilot test, GM-gated) is
    // resolved each Strategic Turn by a SINGLE opposed Command Test between the two ships'
    // leaders, modified by Crew Population / Hull Integrity advantage and turret rating. The
    // loser takes 1d5 Crew + 1d5 Morale (or 1 Hull) per degree, then makes a Morale check to
    // keep fighting. Replaces the homebrew per-action d100 loop. (QA-148.)
    async rollBoarding(operator) {
        const target = [...(game.user?.targets ?? [])][0]?.actor;
        if (!target || target.type !== 'voidship') {
            ui.notifications?.warn('Target an enemy ship to resolve a boarding action (RT Core p.219).');
            return;
        }
        const stat = (s) => ({
            crew: s.system.crew?.value ?? 0,
            hull: s.system.hull?.value ?? 0,
            turrets: (s.system.turrets || 0) + (s.system.componentBonuses?.turrets || 0),
        });
        const aS = stat(this), dS = stat(target);
        const aMod = boardingCommandBonus(aS, dS) + (Number(operator) || 0);
        const dMod = boardingCommandBonus(dS, aS);
        const aTarget = (this.system.crewRating || 0) + aMod;
        const dTarget = (target.system.crewRating || 0) + dMod;
        const aRoll = await roll1d100(); const dRoll = await roll1d100();
        const aSucc = aRoll.total === 1 || (aRoll.total <= aTarget && aRoll.total !== 100);
        const dSucc = dRoll.total === 1 || (dRoll.total <= dTarget && dRoll.total !== 100);
        const aDoS = aSucc ? degreesOfSuccess(aTarget, aRoll.total) : 0;
        const aDoF = aSucc ? 0 : degreesOfFailure(aTarget, aRoll.total);
        const dDoS = dSucc ? degreesOfSuccess(dTarget, dRoll.total) : 0;
        const dDoF = dSucc ? 0 : degreesOfFailure(dTarget, dRoll.total);
        const net = getOpposedDegrees(aSucc, aDoS, aDoF, dSucc, dDoS, dDoF);

        let body;
        if (net === 0) {
            body = `<strong>Stalemate</strong> — neither boarding party gains the upper hand this turn.`;
        } else {
            const winner = net > 0 ? this : target;
            const loser = net > 0 ? target : this;
            const margin = Math.abs(net);
            const crewLoss = (await new Roll(`${margin}d5`).evaluate()).total;
            const moraleLoss = (await new Roll(`${margin}d5`).evaluate()).total;
            const loserMorale = loser.system.morale?.value ?? 0;
            const mRoll = await roll1d100();
            const routs = mRoll.total > loserMorale;
            body = `<strong>${winner.name} wins by ${margin} degree${margin === 1 ? '' : 's'}</strong>. `
                + `${loser.name} loses <strong>${crewLoss} Crew Population + ${moraleLoss} Morale</strong> `
                + `(or, the winner's choice, ${margin} Hull Integrity). `
                + `Morale check: ${mRoll.total} vs ${loserMorale} — ${loser.name} ${routs ? '<strong>routs or surrenders</strong>' : 'fights on'}.`;
        }
        const fmt = (n, base, mod, succ, dos, dof, roll) =>
            `${n}: Command ${base}${mod >= 0 ? '+' : ''}${mod} = ${base + mod}, rolled ${roll} → ${succ ? `${dos} DoS` : `fail (${dof} DoF)`}`;
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<p><strong>Boarding Action — opposed Command Test</strong> (RT Core p.219)<br/>`
                + `${fmt(this.name, this.system.crewRating || 0, aMod, aSucc, aDoS, aDoF, aRoll.total)}<br/>`
                + `${fmt(target.name, target.system.crewRating || 0, dMod, dSucc, dDoS, dDoF, dRoll.total)}<br/>${body}</p>`,
        });
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
                // Strategic-Round Shooting check (QA-047): firing arc + VU range band + the
                // once-per-Turn Shooting Action. Aborts an out-of-arc / out-of-range shot and
                // passes the range-band BS modifier into the attack.
                const shotCheck = await shipShootingCheck(this, item);
                if (!shotCheck?.ok) return;
                await DHTargetedActionManager.performShipWeaponAttack(this, null, item, shotCheck.modifier);
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
