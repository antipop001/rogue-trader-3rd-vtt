import { additionalHitLocations, getHitLocationForRoll } from '../rules/hit-locations.mjs';
import { calculateAmmoDamageBonuses, calculateAmmoPenetrationBonuses, calculateAmmoSpecials } from '../rules/ammo.mjs';
import { getCriticalDamage } from '../rules/critical-damage.mjs';
import { calculateWeaponModifiersDamageBonuses, calculateWeaponModifiersPenetrationBonuses } from '../rules/weapon-modifiers.mjs';
import { weaponMasterBonus, critDamageBonus, brutalChargeBonus, unarmedDamageProfile } from './roll-helpers.mjs';
import { conditionMeta } from '../rules/conditions.mjs';

export class DamageData {
    template = '';
    sourceActor;
    targetActor;

    additionalHits = 0;
    hits = [];

    reset() {
        this.hits = [];
        this.additionalHits = 0;
    }
}

export class Hit {
    location = 'Body';

    totalFatigue = 0;

    damage = 0;
    damageRoll;
    damageType = 'Impact';
    modifiers = {};
    totalDamage = 0;

    // Crack Shot (+2 ranged) / Crippling Strike (+4 melee) extra Critical Damage,
    // precomputed at damage time (attacker talents + melee/ranged are known here) and
    // applied only if the attack causes Critical Damage in assign-damage-data. (RT Core p.96.)
    criticalDamageBonus = 0;

    dos = 0;

    penetration = 0;
    hasPenetrationRoll = false;
    penetrationRoll;
    penetrationModifiers = {};
    totalPenetration = 0;

    voidshipHitType = "Penetrating Hit";
    voidshipHitLocation = "Main";
    voidshipHit = false;
    voidshipHullDamage = 0;   // QA-042: combined salvo Hull Integrity loss (Damage − Armour once)
    voidshipCritHits = 0;     // QA-042: number of Critical Hits in the salvo

    specials = [];
    effects = [];
    righteousFury = [];
    scatter = {};
    primitive = false;

    /**
     * @param attackData
     * @param hitNumber
     * @returns {Promise<Hit>}
     */
    static async createHit(attackData, hitNumber) {
        const hit = new Hit();
        await hit._calculateDamage(attackData);
        hit._totalDamage();
        await hit._calculatePenetration(attackData);
        hit._totalPenetration();
        await hit._calculateSpecials(attackData);

        if (attackData.rollData.isCalledShot) {
            hit.location = attackData.rollData.calledShotLocation;
        } else if (attackData.rollData.hasAttackSpecial('Flame')) {
            // Flame weapons make no roll to hit, so they always strike the body
            // (RT Core p.142). (QA-131.)
            hit.location = 'Body';
        } else {
            const initialHit = getHitLocationForRoll(attackData.rollData.roll.total);
            hit.location = additionalHitLocations()[initialHit][hitNumber <= 5 ? hitNumber : 5];
        }

        // Righteous Fury (RT 1e RAW) is resolved inside _calculateDamage — confirm
        // attack + extra damage roll, not a Critical Hits table lookup. (BUG-008.)

        return hit;
    }

    _totalDamage() {
        this.totalDamage = this.damage + Object.values(this.modifiers).reduce((a, b) => a + b, 0);
    }

    _totalPenetration() {
        this.totalPenetration = this.penetration + Object.values(this.penetrationModifiers).reduce((a, b) => a + b, 0);
    }

    /**
     * @param attackData {AttackData}
     * @returns {Promise<void>}
     */
    async _calculateDamage(attackData) {
        let actionItem = attackData.rollData.weapon ?? attackData.rollData.power;
        if (!actionItem) return;
        const sourceActor = attackData.rollData.sourceActor;

        let righteousFuryThreshold = 10;
        if (attackData.rollData.hasAttackSpecial('Vengeful')) {
            righteousFuryThreshold = attackData.rollData.getAttackSpecial('Vengeful').level ?? 10;
            game.rt.log('_calculateDamage has vengeful: ', righteousFuryThreshold);
        }

        let rollFormula = actionItem.system.damage;
        if(!rollFormula || rollFormula === '') {
            rollFormula = 0;
        }
        // Ship weapons store damage as a numeric modifier; each hit rolls 1d10 + that value (RT corebook p.215, lances p.216).
        if (actionItem.type === 'shipWeapon') {
            const bonus = Number(rollFormula) || 0;
            rollFormula = bonus >= 0 ? `1d10+${bonus}` : `1d10${bonus}`;
        }

        // Unarmed / natural-weapon damage override (ENGINE-NATWEAPONS, RT Core p.122/p.241/
        // p.367). An unarmed strike is a Melee-class weapon of `type: 'Unarmed'`; the dice
        // (and whether the strike counts as Primitive) come from the attacker's best
        // applicable talent/trait, not the item. The Strength Bonus is still added by the
        // melee block below, so the override formula is the dice only.
        let unarmed = null;
        if (actionItem.type === 'weapon' && String(actionItem.system.type ?? '').toLowerCase() === 'unarmed') {
            const talents = sourceActor?.items?.filter((i) => i.type === 'talent') ?? [];
            const traits = sourceActor?.items?.filter((i) => i.type === 'trait') ?? [];
            unarmed = unarmedDamageProfile(talents, traits);
            rollFormula = unarmed.formula;
        }

        this.damageRoll = new Roll(rollFormula, attackData.rollData);

        if (attackData.rollData.hasAttackSpecial('Tearing')) {
            game.rt.log('Modifying dice due to tearing');
            this.damageRoll.terms.filter(term => term instanceof foundry.dice.terms.Die).forEach(die => {
                if (die.modifiers.includes('kh')) return;
                die.modifiers.push('kh' + die.number);
                die.number += 1;
            });
        }

        await this.damageRoll.evaluate();
        game.rt.log('Damage Roll', this.damageRoll);

        this.damage = this.damageRoll.total;

        // Count natural 10s (or the Vengeful threshold) — Righteous Fury is resolved
        // after the loop with a confirming attack + extra damage roll (RT 1e RAW).
        let rfCount = 0;

        for (const term of this.damageRoll.terms) {
            if (!term.results) continue;
            for (const result of term.results) {
                game.rt.log('_calculateDamage result:', result);
                if (result.discarded || !result.active) continue;
                if (result.result >= righteousFuryThreshold) {
                    rfCount += 1;
                }

                if (attackData.rollData.hasAttackSpecial('Proven')) {
                    const proven = attackData.rollData.getAttackSpecial('Proven');
                    if (result.result < proven.level) {
                        // Accumulate across dice — a multi-die weapon bumps EACH die below the
                        // Proven value, so the bonus must sum, not overwrite per die. (QA-137.)
                        this.modifiers['proven'] = (this.modifiers['proven'] || 0) + (proven.level - result.result);
                    }
                }
            }
        }

        // RT 1e Primitive (RT Core p.142) is a DEFENDER-side rule — the target's armour
        // is doubled in assign-damage (BUG-013), NOT a per-die damage cap (that DH2 cap
        // is removed). Flag the hit; Unarmed Master / Improved Natural Weapons clear the
        // Primitive quality from unarmed strikes (`unarmed.primitive === false`).
        this.primitive = attackData.rollData.hasAttackSpecial('Primitive')
            && !(unarmed && unarmed.primitive === false);

        // Righteous Fury (RT 1e RAW, RT Core p.250): each natural 10 (or the Vengeful
        // threshold) on a damage die grants a CONFIRMING attack roll; on a hit, add
        // another full weapon damage roll to the total. Extra rolls chain (their own
        // 10s grant further confirms). Melee extras include the Strength Bonus; other
        // per-hit talent bonuses (Crushing Blow, Mighty Shot, …) are not re-applied to
        // the extra roll — a minor undercount, noted for follow-up. (BUG-008.)
        const rfToHit = attackData.rollData.modifiedTarget ?? 0;
        const rfStrengthHit = actionItem.isMelee
            || (actionItem.isThrown && actionItem.system?.type !== 'Grenade');
        const rfMeleeBonus = rfStrengthHit
            ? (sourceActor.getCharacteristicFuzzy('Strength')?.bonus ?? 0) : 0;
        let rfPending = rfCount;
        let rfGuard = 20; // safety cap against runaway chains
        while (rfPending > 0 && rfGuard-- > 0) {
            rfPending -= 1;
            const confirm = new Roll('1d100', {});
            await confirm.evaluate();
            const confirmHit = confirm.total !== 100 && confirm.total <= rfToHit;
            const entry = { confirmRoll: confirm, confirmTarget: rfToHit, hit: confirmHit, extra: 0, extraRoll: null };
            if (confirmHit) {
                const extra = new Roll(rollFormula, attackData.rollData);
                await extra.evaluate();
                entry.extraRoll = extra;
                entry.extra = extra.total + rfMeleeBonus;
                this.damage += entry.extra;
                for (const t of extra.terms) {
                    if (!t.results) continue;
                    for (const r of t.results) {
                        if (r.discarded || !r.active) continue;
                        if (r.result >= righteousFuryThreshold) rfPending += 1;
                    }
                }
            }
            this.righteousFury.push(entry);
        }

        // Weapon Master (BUG-003): +2 damage when the wielded weapon's class matches
        // the talent's chosen class (RT Core p.73, Weapon Master). Applies to any class,
        // so it sits outside the melee/ranged split. To-hit +10 is in roll-data.mjs.
        if (actionItem.type === 'weapon') {
            const talents = sourceActor?.items?.filter((i) => i.type === 'talent') ?? [];
            const wm = weaponMasterBonus(talents, actionItem.system.class);
            if (wm.damage) this.modifiers['weapon master'] = wm.damage;
        }

        // Crack Shot / Crippling Strike: stash the crit-only Damage bonus on the Hit.
        // It is added to the critical Damage in assign-damage-data ONLY when the attack
        // causes Critical Damage (RT Core p.96) — NOT added to normal Damage here.
        {
            const talents = sourceActor?.items?.filter((i) => i.type === 'talent') ?? [];
            this.criticalDamageBonus = critDamageBonus(talents, actionItem.isMelee, actionItem.isRanged);
        }

        // Thrown muscle-powered weapons add Strength Bonus to damage (RT Core p.117),
        // except grenades/explosives which carry system.type 'Grenade' (QA-158).
        if (actionItem.isThrown && actionItem.system?.type !== 'Grenade') {
            this.modifiers['strength bonus'] = sourceActor.getCharacteristicFuzzy('Strength').bonus;
        }

        if (actionItem.isMelee) {
            this.modifiers['strength bonus'] = sourceActor.getCharacteristicFuzzy('Strength').bonus;

            if (actionItem.system.craftsmanship === 'Best') {
                this.modifiers['best craftsmanship'] = 1;
            }

            // Crushing Blow
            if (sourceActor.hasTalent('Crushing Blow')) {
                const wsBonus = sourceActor.getCharacteristicFuzzy('WeaponSkill').bonus;
                this.modifiers['crushing blow'] = Math.ceil(wsBonus / 2);
            }

            // Deathdealer
            if (sourceActor.hasTalentFuzzyWords(['Deathdealer', 'Melee'])) {
                const perBonus = sourceActor.getCharacteristicFuzzy('Perception').bonus;
                this.modifiers['deathdealer melee'] = Math.ceil(perBonus / 2);
            }

            // Brutal Charge (trait): +3 damage on a Charge (RT Core p.364). `hasTalent`
            // only matches talents, so check the actor's trait items by name.
            const traits = sourceActor?.items?.filter((i) => i.type === 'trait') ?? [];
            const bc = brutalChargeBonus(traits, attackData.rollData.action);
            if (bc) this.modifiers['brutal charge'] = bc;

        } else if (actionItem.isRanged) {
            // Scatter
            if (attackData.rollData.hasAttackSpecial('Scatter')) {
                if (attackData.rollData.rangeName === 'Point Blank') {
                    this.modifiers['scatter'] = 3;
                } else if (attackData.rollData.rangeName !== 'Short Range') {
                    this.modifiers['scatter'] = -3;
                }
            }

            // Add Accurate — RT corebook p.143: +1d10 per 2 DoS when Aimed, max +2d10
            if (attackData.rollData.action === 'Standard Attack' || attackData.rollData.action === 'Called Shot') {
                if (attackData.rollData.hasAttackSpecial('Accurate') && attackData.rollData.modifiers.aim > 0) {
                    const dice = Math.min(Math.floor(attackData.rollData.dos / 2), 2);
                    if (dice > 0) {
                        const accurateRoll = new Roll(`${dice}d10`, {});
                        await accurateRoll.evaluate();
                        this.modifiers['accurate'] = accurateRoll.total;
                    }
                }
            }

            // Eye of Vengeance
            if (attackData.rollData.eyeOfVengeance) {
                this.modifiers['eye of vengeance'] = attackData.rollData.dos;
            }

            // Las Modes
            if (attackData.rollData.hasAttackSpecial('Overcharge')) {
                this.modifiers['overcharge'] = 1;
            } else if (attackData.rollData.hasAttackSpecial('Overload')) {
                this.modifiers['overload'] = 2;
            }

            // Maximal
            if (attackData.rollData.hasAttackSpecial('Maximal')) {
                const maximalRoll = new Roll('1d10', {});
                await maximalRoll.evaluate();
                this.modifiers['maximal'] = maximalRoll.total;
            }

            // Mighty Shot
            if (sourceActor.hasTalent('Mighty Shot')) {
                const bsBonus = sourceActor.getCharacteristicFuzzy('ballisticSkill').bonus;
                this.modifiers['mighty shot'] = Math.ceil(bsBonus / 2);
            }

            // Deathdealer
            if (sourceActor.hasTalentFuzzyWords(['Deathdealer', 'Ranged'])) {
                const perBonus = sourceActor.getCharacteristicFuzzy('Perception').bonus;
                this.modifiers['deathdealer ranged'] = Math.ceil(perBonus / 2);
            }

            // Ammo
            await calculateAmmoDamageBonuses(attackData, this);
        }

        await calculateWeaponModifiersDamageBonuses(attackData, this);
    }

    async _calculatePenetration(attackData) {
        let actionItem = attackData.rollData.weapon ?? attackData.rollData.power;
        if (!actionItem) return;
        const sourceActor = attackData.rollData.sourceActor;

        const rollFormula = actionItem.system.penetration;
        if (Number.isInteger(rollFormula)) {
            this.penetration = rollFormula;
        } else if (rollFormula === '') {
            this.penetration = 0;
        }  else {
            this.hasPenetrationRoll = true;
            try {
                this.penetrationRoll = new Roll(rollFormula, attackData.rollData);
                await this.penetrationRoll.evaluate();
                this.penetration = this.penetrationRoll.total;
            } catch (error) {
                ui.notifications.warn('Penetration formula failed - setting to 0');
                this.penetration = 0;
            }
        }

        if (actionItem.isMelee) {
            // Melee "Lance" has no canon RT DoS rule (Lance is a starship quality); the
            // existing per-degree penetration scaling is kept and now consumes the corrected
            // canon DoS — `(dos - 1)` reads as "extra Pen per degree beyond the first". (QA-094.)
            if (this.penetration && attackData.rollData.hasAttackSpecial('Lance')) {
                this.penetrationModifiers['lance'] = this.penetration * (attackData.rollData.dos - 1);
            }

            if (attackData.rollData.action === 'All Out Attack' && sourceActor.hasTalent('Hammer Blow')) {
                const strBonus = sourceActor.getCharacteristicFuzzy('strength').bonus;
                this.penetrationModifiers['hammer blow'] = Math.ceil(strBonus / 2);
            }
        } else if (actionItem.isRanged) {
            if (attackData.rollData.hasAttackSpecial('Maximal')) {
                this.penetrationModifiers['maximal'] = 2;
            }

            // Las Modes
            if (attackData.rollData.hasAttackSpecial('Overload')) {
                this.penetrationModifiers['overload'] = 2;
            }

            // Ammo
            await calculateAmmoPenetrationBonuses(attackData, this);
        }

        if (attackData.rollData.dos > 2 && attackData.rollData.hasAttackSpecial('Razer Sharp')) {
            this.penetrationModifiers['razor sharp'] = this.penetration;
        }

        if (attackData.rollData.eyeOfVengeance) {
            this.penetrationModifiers['eye of vengeance'] = attackData.rollData.dos;
        }

        if (attackData.rollData.rangeName === 'Short Range' || attackData.rollData.rangeName === 'Point Blank') {
            if (attackData.rollData.hasAttackSpecial('Melta')) {
                this.penetrationModifiers['melta'] = this.penetration;
            }
        }

        await calculateWeaponModifiersPenetrationBonuses(attackData, this);
    }

    async _calculateSpecials(attackData) {
        let actionItem = attackData.rollData.weapon ?? attackData.rollData.power;
        if (!actionItem) return;
        const sourceActor = attackData.rollData.sourceActor;

        this.damageType = actionItem.system.damageType;

        // QA-140: removed a dead All-Out-Attack + Hammer Blow → inject Concussive block —
        // 'Hammer Blow' is a DH2 talent absent from the RT pack and 'Concussive' is not an RT
        // weapon quality (neither exists), so the branch could never fire.

        if (actionItem.isRanged) {
            await calculateAmmoSpecials(attackData, this);
        }

        for (const special of attackData.rollData.attackSpecials) {
            switch(special.name.toLowerCase()) {
                case 'blast':
                    this.addEffect(special.name, `Everyone within ${special.level}m of the location is hit!`);
                    break;
                case 'concussive':
                    this.addEffect(special.name, `Target must pass Toughness test with ${special.level * -10} or be Stunned for 1 round per DoF. If the attack did more damage than the targets Strength Bonus, it is knocked Prone!`, ['stunned', 'prone']);
                    break;
                case 'corrosive':
                    this.addEffect(special.name, `The targets armor melts with [[1d10]] of armour being destroyed! Additional damage is dealt as wounds and not reduced by toughness.`);
                    break;
                case 'crippling':
                    this.addEffect(special.name, `If the target suffers a wound it is considered crippled. If they take more than a half action on a turn, they suffer ${special.level} damage not reduced by Armour or Toughness!`);
                    break;
                case 'felling':
                    this.addEffect(special.name, `The targets unnatural toughness is reduced by ${special.level} while calculating wounds!`);
                    break;
                case 'flame':
                    this.addEffect(special.name, `The target must make an Agility test or be set on fire!`, ['onFire']);
                    break;
                case 'graviton':
                    this.addEffect(special.name, `This attack deals additional damage equal to the targets Armour points on the struck location!`);
                    break;
                case 'hallucinogenic':
                    this.addEffect(special.name, `A creature stuck by this much make a toughness test with ${special.level * -10} or suffer a delusion!`);
                    break;
                case 'haywire':
                    this.addEffect(special.name, `Everything within ${special.level * -10}m suffers the Haywire Field at strength [[1d10]]!`);
                    break;
                case 'indirect':
                    const bs = sourceActor.getCharacteristicFuzzy('ballisticSkill').bonus;
                    this.addEffect(special.name, `The attack deviates [[ 1d10 - ${bs}]]m (minimum of 0m) off course to the ${scatterDirection()}!`);
                    break;
                case 'shocking':
                    // RT Core p.145: if the target took ≥1 Damage (after Armour + TB), it makes
                    // a Toughness Test (+10 per Armour point on the hit location) or is Stunned
                    // for rounds = half the Damage suffered. (QA-125 — was DH2 text.)
                    this.addEffect(special.name, `If the target took Damage, it must make a Toughness Test (+10 per Armour point on the hit location) or be Stunned for a number of Rounds equal to half the Damage suffered.`, ['stunned']);
                    break;
                case 'snare':
                    // RT Core p.145: on a hit, the target makes an Agility Test or is immobilised
                    // — it can take no action except to escape (a Strength Test to burst the bonds
                    // or an Agility Test to wriggle free) and is Helpless until it does. (QA-127.)
                    this.addEffect(special.name, `The target must make an Agility Test or be immobilised: it can take no actions except to escape — a Strength Test to burst the bonds or an Agility Test to wriggle free — and is Helpless until it escapes.`, ['helpless']);
                    break;
                case 'toxic':
                    // RT Core p.145: the target makes a Toughness Test at −5 per point of Damage
                    // taken (after Armour + TB); failure → an immediate 1d10 Impact Damage that
                    // ignores Armour and Toughness. (QA-126 — was the `level*-10` "with 0" text.)
                    this.addEffect(special.name, `The target must make a Toughness Test at −5 per point of Damage taken (after Armour and Toughness) or suffer an immediate [[1d10]] Impact Damage, ignoring Armour and Toughness.`);
                    break;
                case 'warp':
                    this.addEffect(special.name, `Ignores mundane armor and cover! Holy armor negates this.`);
                    break;

            }
        }
    }

    addEffect(name, effect, conditions = null) {
        this.effects.push({
            name: name,
            effect: effect,
            // QA-080 inc.2 (damage-card path): optional condition ids the GM may apply to the
            // target once they adjudicate the special's test (e.g. Concussive → Stunned on a
            // failed Toughness test). Rendered as "Apply: <name>" buttons on the hit's card.
            conditions: (conditions ?? [])
                .map((id) => conditionMeta(id))
                .filter(Boolean),
        })
    }
}

export class WeaponDamageData extends DamageData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/weapon-roll-chat.hbs';
    }
}

export class PsychicDamageData extends DamageData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/weapon-roll-chat.hbs';
    }
}

export function scatterDirection() {
    let direction = '';
    const directionInt = Math.floor(Math.random() * 10) + 1;
    if (directionInt === 1) direction = 'north west';
    if (directionInt === 2) direction = 'north';
    if (directionInt === 3) direction = 'north east';
    if (directionInt === 4) direction = 'west';
    if (directionInt === 5) direction = 'east';
    if (directionInt === 6 || directionInt === 7) direction = 'south west';
    if (directionInt === 8) direction = 'south';
    if (directionInt === 9 || directionInt === 10) direction = 'south east';
    return direction;
}
