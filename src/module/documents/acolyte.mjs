import { prepareSimpleRoll } from '../prompts/simple-prompt.mjs';
import { DHTargetedActionManager } from '../actions/targeted-action-manager.mjs';
import { prepareDamageRoll } from '../prompts/damage-prompt.mjs';
import { SimpleSkillData } from '../rolls/action-data.mjs';
import { RogueTraderBaseActor } from './base-actor.mjs';
import { ForceFieldData } from '../rolls/force-field-data.mjs';
import { prepareForceFieldRoll } from '../prompts/force-field-prompt.mjs';
import { DHBasicActionManager } from '../actions/basic-action-manager.mjs';
import { degreesOfSuccess, degreesOfFailure, roll1d100, initiativeCharBonus, woundsMax, reactionBudget, canSpendReaction, unnaturalCharacteristicMultipliers, rapidReloadTime, doubleReloadTime, woundDamageState, woundRecovery } from '../rolls/roll-helpers.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { reactionsLocked } from '../rules/conditions.mjs';
import { RogueTraderSettings } from '../rogue-trader-settings.mjs';

const BASIC_SKILLS = new Set([
    'awareness', 'barter', 'carouse', 'charm', 'climb', 'command',
    'concealment', 'contortionist', 'deceive', 'disguise', 'dodge',
    'evaluate', 'gamble', 'inquiry', 'intimidate', 'logic', 'parry',
    'scrutiny', 'search', 'silentMove', 'swim',
]);

// Movement-related skills that take the −10 Encumbered penalty (RT Core p.249). (QA-078.)
const MOVEMENT_SKILLS = new Set(['dodge', 'acrobatics', 'climb', 'swim', 'contortionist']);

export class RogueTraderAcolyte extends RogueTraderBaseActor {

    get backpack() {
        return this.system.backpack;
    }

    get skills() {
        return this.system.skills;
    }

    get fatigue() {
        return this.system.fatigue;
    }

    get fate() {
        return this.system.fate;
    }

    get psy() {
        return this.system.psy;
    }

    get bio() {
        return this.system.bio;
    }

    get experience() {
        return this.system.experience;
    }

    get insanity() {
        return this.system.insanity;
    }

    get corruption() {
        return this.system.corruption;
    }


    get armour() {
        return this.system.armour;
    }

    get encumbrance() {
        return this.system.encumbrance;
    }

    async prepareData() {
        this._ensureOriginPath();
        this._computeCharacteristics();
        this._computeSkills();
        this._computeExperience();
        this._computeArmour();
        this._computeMovement();
        this._computeEncumbrance();
        this._computeWeaponReload();
        await super.prepareData();
        // Active Effects apply during super.prepareData(); recompute skills
        // afterward so `skill.modifier` changes (e.g. Master Chirurgeon's
        // +10 Medicae) feed into `skill.current`.
        this._computeSkills();
    }

    /**
     * Backfill `bio.originPath` with defaults so existing acolytes (created
     * before 0.6.0) still render the Origin Path panel without throwing.
     * Also backfill `bio.shipRole` (added in 0.7.30).
     */
    _ensureOriginPath() {
        if (!this.system.bio) this.system.bio = {};
        const op = this.system.bio.originPath ?? {};
        const blank = { value: '', notes: '' };
        op.homeWorld ??= { ...blank };
        op.birthright ??= { ...blank };
        op.lureOfTheVoid ??= { ...blank };
        op.trialsAndTravails ??= { ...blank };
        op.motivation ??= { ...blank };
        op.career ??= { ...blank };
        this.system.bio.originPath = op;
        this.system.bio.shipRole ??= { ...blank };
    }

    async rollWeaponDamage(weapon) {
        if (!weapon.system.equipped) {
            ui.notifications.warn('Actor must have weapon equipped!');
            return;
        }
        await prepareDamageRoll({
            name: weapon.name,
            damage: weapon.system.damage,
            damageType: weapon.system.damageType,
            penetration: weapon.system.penetration,
            targetActor: () => {
                const targetedObjects = game.user.targets;
                if (targetedObjects && targetedObjects.size > 0) {
                    const target = targetedObjects.values().next().value;
                    return target.actor;
                }
            }
        });
    }

    async rollPsychicPowerDamage(power) {
        await prepareDamageRoll({
            psychicPower: true,
            pr: this.psy.currentRating,
            name: power.name,
            damage: power.system.damage,
            damageType: power.system.damageType,
            penetration: power.system.penetration,
        });
    }

    async rollSkill(skillName, specialityName) {
        let skill = this.skills[skillName];
        let label = skill.label;
        if (specialityName) {
            skill = skill.specialities[specialityName];
            label = `${label}: ${skill.label}`;
        }
        if (skill.untrained && !BASIC_SKILLS.has(skillName) && !skill.treatAsBasic) {
            ui.notifications.warn(`${label} is an Advanced Skill — cannot attempt untrained.`);
            return;
        }
        // RT 1e Reaction budget (RT Core p.244): Dodge and Parry are Reactions. While the
        // actor is part of an active, started combat, declaring one spends from the
        // per-Round budget (base 1 shared Reaction, + Step Aside Dodge-only / Wall of Steel
        // Parry-only). Block when exhausted; otherwise tick the used counter. The reset is
        // handled on the actor's turn by the combat-tracker hook. Guarded so out-of-combat
        // Dodge/Parry skill tests are unaffected. (ENGINE-REACTION-BUDGET-TRACK.)
        if ((skillName === 'dodge' || skillName === 'parry')
            && game.combat?.started
            && game.combat.combatants?.some((c) => c.actorId === this.id)) {
            // Stunned / Helpless / Unconscious creatures can take no Reactions at all,
            // regardless of the budget (RT Core p.244, 247). (QA-080 increment 4.)
            if (reactionsLocked(this.statuses)) {
                ui.notifications.warn(`This character cannot take Reactions while Stunned, Helpless, or Unconscious (RT Core p.244).`);
                return;
            }
            // All Out Attack forfeits Dodge/Parry until the actor's next turn (RT Core p.245,
            // QA-071). The flag is set when the action resolves and cleared on his turn.
            if (this.system.combat?.allOutAttack) {
                ui.notifications.warn(`This character went All Out Attack and cannot Dodge or Parry until his next turn (RT Core p.245).`);
                return;
            }
            const rc = this.system.combat?.reactions;
            if (rc?.[skillName]) {
                if (!canSpendReaction(rc, skillName)) {
                    ui.notifications.warn(`No ${skillName === 'dodge' ? 'Dodge' : 'Parry'} Reaction remaining this Round (RT Core p.244).`);
                    return;
                }
                await this.update({ [`system.combat.reactions.${skillName}.value`]: (rc[skillName].value ?? 0) + 1 });
            }
        }
        const simpleSkillData = new SimpleSkillData();
        const rollData = simpleSkillData.rollData;
        rollData.actor = this;
        rollData.nameOverride = label;
        rollData.type = 'Skill';
        rollData.baseTarget = skill.current;
        rollData.modifiers.modifier = 0;
        // RT 1e: any level of Fatigue imposes -10 to all Tests (BUG-004).
        if (this.system.fatigue?.value >= 1) {
            rollData.modifiers['Fatigued'] = -10;
        }
        // Encumbered: -10 to movement-related tests (RT Core p.249). (QA-078.)
        if (this.encumbrance?.encumbered && MOVEMENT_SKILLS.has(skillName)) {
            rollData.modifiers['Encumbered'] = -10;
        }
        // Manoeuvrability (ItS Ch.V): the active vehicle's Manoeuvrability modifies every Drive
        // or Pilot Test made while operating it. (QA-116.)
        if (skillName === 'drive' || skillName === 'pilot') {
            const vid = this.system.combat?.activeVehicleId;
            const vehicle = vid ? game.actors?.get(vid) : null;
            const man = Number(vehicle?.system?.manoeuverability) || 0;
            if (man !== 0) rollData.modifiers['Manoeuvrability'] = man;
        }
        // Guarded Attack: +10 to Dodge/Parry until the actor's next turn (RT Core p.245,
        // QA-071). Flag set when the action resolves; cleared on his turn.
        if ((skillName === 'dodge' || skillName === 'parry') && this.system.combat?.guardedAttack) {
            rollData.modifiers['Guarded Attack'] = 10;
        }
        // Surface talents whose `flags.rt.conditionalBonuses` apply to this
        // skill or its driving characteristic, so the prompt can offer them
        // as optional checkboxes.
        rollData.optionalBonuses = this.collectOptionalBonuses({
            skill: skillName,
            characteristic: skill.characteristic,
        });

        // Parry modifiers from equipped melee weapon — RT Core pp.116, 142-145
        if (skillName === 'parry') {
            const meleeWeapon = this.items.find(i => i.type === 'weapon' && i.isMelee && i.system.equipped);
            if (meleeWeapon) {
                const hasSpecial = (name) => {
                    const key = name[0].toLowerCase() + name.slice(1);
                    return meleeWeapon.items?.find(i => i.isAttackSpecial && i.name === name)
                        || meleeWeapon.system.special?.[key];
                };
                if (hasSpecial('Balanced')) {
                    rollData.modifiers['Balanced'] = 10;
                }
                if (hasSpecial('Defensive')) {
                    rollData.modifiers['Defensive'] = 15;
                }
                if (hasSpecial('Unwieldy')) {
                    rollData.modifiers['Cannot Parry'] = -999;
                } else if (hasSpecial('Unbalanced')) {
                    rollData.modifiers['Unbalanced'] = -10;
                }

                const parryBonus = Number(meleeWeapon.system.parryBonus) || 0;
                if (parryBonus !== 0) {
                    rollData.modifiers['Weapon Parry Bonus'] = parryBonus;
                }
            }
        }

        await prepareSimpleRoll(simpleSkillData);
    }

    async rollItem(itemId) {
        game.rt.log('RollItem', itemId);
        const item = this.items.get(itemId);
        switch (item.type) {
            case 'weapon':
                if (!item.system.equipped) {
                    ui.notifications.warn('Actor must have weapon equipped!');
                    return;
                }
                if(game.settings.get(SYSTEM_ID, RogueTraderSettings.SETTINGS.simpleAttackRolls)) {
                    if(item.isRanged) {
                        await this.rollCharacteristic('ballisticSkill', item.name);
                    } else {
                        await this.rollCharacteristic('weaponSkill',  item.name);
                    }
                } else {
                    await DHTargetedActionManager.performWeaponAttack(this, null, item);
                }
                return;
            case 'psychicPower':
                if(game.settings.get(SYSTEM_ID, RogueTraderSettings.SETTINGS.simplePsychicRolls)) {
                    await this.rollCharacteristic('willpower',  item.name)
                } else {
                    await DHTargetedActionManager.performPsychicAttack(this, null, item);
                }
                await this._promptOpposed(item);
                return;
            case 'forceField':
                if (!item.system.equipped || !item.system.activated) {
                    ui.notifications.warn('Actor must have force field equipped and activated!');
                    return;
                }
                await prepareForceFieldRoll(new ForceFieldData(this, item));
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

    /**
     * If a power calls for an Opposed test (`system.target.isOpposed`), post a chat
     * card with a "Roll Opposed" button so the defender's resisting test is prompted
     * — works in both simple- and full-cast modes, with or without a pre-selected
     * target (the handler falls back to the current target / selected token). BUG-007.
     */
    async _promptOpposed(item) {
        const target = item?.system?.target;
        if (!target?.isOpposed) return;
        const isSkill = !!target.useOpposedSkill;
        const oppKey = isSkill ? target.opposedSkill : target.opposed;
        if (!oppKey || oppKey === 'None') return;
        const label = isSkill
            ? (this.skills?.[oppKey]?.label ?? oppKey)
            : (this.characteristics?.[oppKey]?.label ?? oppKey);
        const targetUuid = Array.from(game.user.targets ?? [])[0]?.actor?.uuid ?? '';
        const html = await renderTemplate(
            'systems/rogue-trader-3rd/templates/chat/opposed-prompt-chat.hbs',
            { powerName: item.name, opposedChar: oppKey, opposedLabel: label, isSkill, targetUuid },
        );
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: html,
        });
    }

    async damageItem(itemId) {
        const item = this.items.get(itemId);
        switch (item.type) {
            case 'weapon':
                await this.rollWeaponDamage(item);
                return;
            case 'psychicPower':
                await this.rollPsychicPowerDamage(item);
                return;
            default:
                return ui.notifications.warn(`No actions implemented for item type: ${item.type}`);
        }
    }

    _computeCharacteristics() {
        // RT 1e Unnatural Characteristic (RT Core p.368): an "Unnatural <Char> (xN)"
        // trait multiplies that Characteristic Bonus by N. The instantiated trait carries
        // the characteristic + multiplier in its name; map them here by label.
        const unnaturalMults = unnaturalCharacteristicMultipliers(this.items.filter((i) => i.type === 'trait'));
        // Synthetic Muscle Grafts (RT Core): +1 to the Strength Bonus (NOT +10 raw Strength).
        // Applied by cybernetic name into the bonus formula — same pattern as Unnatural, which
        // an AE can't express without inflating the raw characteristic. (QA-027.)
        const cyberStrengthBonus = this.items.some((i) => i.type === 'cybernetic' && i.name === 'Synthetic Muscle Grafts') ? 1 : 0;
        for (const [name, characteristic] of Object.entries(this.characteristics)) {
            characteristic.total = characteristic.base + characteristic.advance * 5 + characteristic.modifier;
            const rawBonus = Math.floor(characteristic.total / 10);
            // Derive `.unnatural` (the extra additive = rawBonus×(N−1)) from the trait, but
            // SET-when-unset only: the NPC pipeline pre-bakes `.unnatural`, so recomputing
            // it from the trait when a value is already present would double-apply
            // (ENGINE-UNNATURAL-CHARS). Trait-gated/engine-applied by name — the matched
            // trait must NOT also be given an AE. (Movement uses the unmodified AgB per
            // RT Core p.368 — handled in _computeMovement, not here.)
            if (!(characteristic.unnatural > 0)) {
                const mult = unnaturalMults[String(characteristic.label ?? '').toLowerCase()];
                if (mult >= 2) characteristic.unnatural = rawBonus * (mult - 1);
            }
            characteristic.bonus = rawBonus + characteristic.unnatural + (name === 'strength' ? cyberStrengthBonus : 0);

            // RT 1e: Fatigue does NOT halve characteristics (that was a DH carryover —
            // BUG-004). Any level of Fatigue instead imposes a flat -10 to all Tests,
            // applied as a roll modifier in rollCharacteristic / rollSkill.
        }

        // Effective Psy Rating can't drop below 0 (a power sustaining beyond the rating ends
        // rather than yielding a negative PR; RT Core p.156). (QA-152.)
        this.psy.currentRating = Math.max(0, this.psy.rating - this.psy.sustained);
        // RT 1e: Initiative bonus = governing characteristic bonus + any additive
        // modifier (effect-addressable via system.initiative.modifier so talents/gear
        // like Paranoia "+2 Initiative" / Wary "+1" survive derived-data recompute).
        // BUG-002. Lightning Reflexes (RT Core p.110) replaces the single AgB term with
        // the raw Agility Bonus times (Unnatural multiplier + 1) — handled here by name
        // since an AE can't read AgB; do NOT also give that talent an AE. ENGINE-INIT-EXTRA.
        // BUG-Q-188: the multiplier scales off the actual Unnatural Agility level (×N → ×N+1),
        // not a fixed ×3 — so it never under-counts an Unnatural Agility (×3)/(×4) creature.
        const initChar = this.characteristics[this.initiative.characteristic];
        const initUnnaturalMult = unnaturalMults[String(initChar.label ?? '').toLowerCase()] ?? 1;
        // Encumbered: reduce the Agility Bonus by 1 for Initiative (RT Core p.249). Applied
        // to the AgB INPUT so Lightning Reflexes doubles the already-reduced bonus. (QA-078.)
        const initEncPenalty = this.encumbrance?.encumbered ? 1 : 0;
        this.initiative.bonus =
            initiativeCharBonus(
                Math.max(0, Math.floor(initChar.total / 10) - initEncPenalty),
                Math.max(0, initChar.bonus - initEncPenalty),
                this.hasTalent('Lightning Reflexes'),
                initUnnaturalMult,
            )
            + (this.system.initiative.modifier ?? 0);
        // RT 1e: maximum Wounds = the rolled/stored base plus any additive effect
        // modifier (effect-addressable via system.wounds.modifier, mirroring Initiative —
        // ENGINE-WOUNDS-MOD). wounds.max is a stored value (chargen/NPC-pipeline) and is
        // not otherwise recomputed, so this fold-in is idempotent. Sound Constitution
        // (RT Core p.111) writes system.wounds.modifier += 1 via an AE (stackable).
        this.system.wounds.max = woundsMax(this.system.wounds.max, this.system.wounds.modifier);
        // RT Damage state (RT Core p.262) — drives the natural-healing rate. Any Critical
        // Damage makes the character Critically Damaged regardless of remaining Wounds. (QA-093.)
        this.system.wounds.state = (this.system.wounds.critical > 0)
            ? 'Critically Damaged'
            : woundDamageState(this.system.wounds.value, this.system.wounds.max, this.characteristics.toughness.bonus);
        // RT 1e (RT Core p.251): a character functions with up to Toughness Bonus
        // levels of Fatigue; exceeding TB collapses him unconscious. (Was TB+WB — a DH2
        // threshold, BUG-004.) Any level (>=1) imposes -10 to all Tests.
        this.fatigue.max = this.characteristics.toughness.bonus;
        this.fatigue.fatigued = this.fatigue.value >= 1;
        this.fatigue.unconscious = this.fatigue.value > this.fatigue.max;

        // RT 1e Reaction budget (RT Core p.244): one Reaction per Round by default
        // (Dodge or Parry). Step Aside (p.119) grants a second, Dodge-only Reaction;
        // Wall of Steel (p.121) a second, Parry-only one. Expose the per-Round MAX
        // Dodges/Parries here; tracking how many are USED this Round + resetting on the
        // actor's turn is the combat-state follow-up (ENGINE-REACTION-BUDGET). Computed
        // by talent name (engine-applied) — these talents must NOT also be AE'd.
        const reactions = reactionBudget(this.items.filter((i) => i.type === 'talent'));
        const rc = this.system.combat?.reactions;
        if (rc) {
            rc.base = reactions.base;
            // Additive +Reaction modifier (talent-derived: Hyperactive Nymune Organ). Baked
            // into BOTH pools so the extra Reaction is usable as either Dodge or Parry; the
            // shared total is de-double-counted in canSpendReaction. Assigned (not summed)
            // from the deterministic reactionBudget value so it stays idempotent across the
            // repeated derived-data passes. (QA-160. AE-addressability on this field is a
            // follow-up — the derived pass would need to isolate the AE contribution.)
            rc.modifier = reactions.modifier;
            if (rc.dodge) rc.dodge.max = reactions.dodge + reactions.modifier;
            if (rc.parry) rc.parry.max = reactions.parry + reactions.modifier;
        }
    }

    _computeSkills() {
        for (const [name, skill] of Object.entries(this.skills)) {
            // Orphan skill keys (e.g. pre-0.7.17 `athletics`/`stealth`/`linguistics`/`operate`
            // left behind on NPCs after the skill split) carry no `characteristic` or
            // `characteristics`. Skip them so the rest of prepareData doesn't abort.
            if (!skill.characteristic && (!Array.isArray(skill.characteristics) || skill.characteristics.length === 0)) {
                continue;
            }
            let short = !skill.characteristic || skill.characteristic === '' ? skill.characteristics[0] : skill.characteristic;
            let characteristic = this._findCharacteristic(short);
            const mod = skill.modifier || 0;
            const adv = 1 * skill.advance;
            const isBasic = BASIC_SKILLS.has(name);

            skill.isBasic = isBasic;
            // Parry is an RT 1e Reaction (full WS), not a trained skill —
            // untrained still tests at full characteristic.
            if (name === 'parry' && adv === 0) {
                skill.current = characteristic.total + mod;
                skill.untrained = false;
                skill.treatAsBasic = false;
            } else if (adv === -1 && !isBasic) {
                skill.current = Math.floor(characteristic.total / 2) + mod;
                skill.untrained = true;
                skill.treatAsBasic = true;
            } else if (adv === 0 && isBasic) {
                skill.current = Math.floor(characteristic.total / 2) + mod;
                skill.untrained = true;
                skill.treatAsBasic = false;
            } else if (adv === 0) {
                skill.current = 0;
                skill.untrained = true;
                skill.treatAsBasic = false;
            } else {
                skill.current = characteristic.total + this._skillAdvanceToValue(adv) + mod;
                skill.untrained = false;
                skill.treatAsBasic = false;
            }

            if (skill.isSpecialist) {
                for (let speciality of Object.values(skill.specialities)) {
                    const sAdv = 1 * speciality.advance;
                    if (sAdv === -1) {
                        speciality.current = Math.floor(characteristic.total / 2) + mod;
                        speciality.untrained = true;
                        speciality.treatAsBasic = true;
                    } else if (sAdv === 0 && name === 'speakLanguage' && this.hasTalent('Polyglot')) {
                        // Polyglot (RT Core p.130): may attempt any Speak Language untrained,
                        // testing at half the governing Characteristic with a −10 penalty. (QA-035.)
                        speciality.current = Math.floor(characteristic.total / 2) + mod - 10;
                        speciality.untrained = true;
                        speciality.treatAsBasic = true;
                    } else if (sAdv === 0) {
                        speciality.current = 0;
                        speciality.untrained = true;
                        speciality.treatAsBasic = false;
                    } else {
                        speciality.current = characteristic.total + this._skillAdvanceToValue(sAdv) + mod;
                        speciality.untrained = false;
                        speciality.treatAsBasic = false;
                    }
                }
            }
        }
    }

    getSkillFuzzy(skillName) {
        for (const [name, skill] of Object.entries(this.skills)) {
            if (skillName.toUpperCase() === name.toUpperCase()) {
                return skill;
            }
        }
    }

    _skillAdvanceToValue(adv) {
        let advance = 1 * adv;
        if (advance >= 3) return 20;
        if (advance === 2) return 10;
        if (advance === 1) return 0;
        return 0;
    }

    _computeExperience() {
        if(!this.experience) return;
        // Sum the real XP spend per category for the Experience panel breakdown (QA-049).
        // Every term is guarded with `|| 0` so a missing/blank cost never poisons the
        // displayed total with NaN. NOTE: talent/power cost lives at `item.system.cost`
        // (the Item document has no `.cost` getter — reading `item.cost` yielded NaN).
        const num = (v) => parseInt(v, 10) || 0;
        this.experience.spentCharacteristics = 0;
        this.experience.spentSkills = 0;
        this.experience.spentTalents = 0;
        this.experience.spentPsychicPowers = num(this.psy?.cost);
        for (let characteristic of Object.values(this.characteristics)) {
            this.experience.spentCharacteristics += num(characteristic.cost);
        }
        for (let skill of Object.values(this.skills)) {
            if (skill.isSpecialist) {
                for (let speciality of Object.values(skill.specialities)) {
                    this.experience.spentSkills += num(speciality.cost);
                }
            } else {
                this.experience.spentSkills += num(skill.cost);
            }
        }
        for (let item of this.items) {
            if (item.isTalent) {
                this.experience.spentTalents += num(item.system?.cost);
            } else if (item.isPsychicPower) {
                this.experience.spentPsychicPowers += num(item.system?.cost);
            }
        }
        this.experience.calculatedTotal =
            this.experience.spentCharacteristics + this.experience.spentSkills + this.experience.spentTalents + this.experience.spentPsychicPowers;
        this.experience.available = this.experience.total - this.experience.used;
    }

    /**
     * Natural healing for a period of rest (RT Core p.262). Lightly/Heavily Damaged restore
     * Wounds; Critically Damaged removes Critical Damage (medical care assumed). Posts a chat
     * card with the result. (QA-092.)
     * @param {'day'|'week'} period
     */
    async applyRest(period) {
        const tb = this.characteristics.toughness.bonus;
        const state = this.system.wounds.state;
        const amount = woundRecovery(state, tb, period);
        const label = period === 'week' ? "a week's complete rest" : "a day's bed rest";
        let text;
        if (amount <= 0) {
            text = `${this.name} takes ${label} but is ${state} — no Damage is recovered (a longer rest or medical care is needed).`;
        } else if (state === 'Critically Damaged') {
            const newCrit = Math.max(0, (this.system.wounds.critical || 0) - amount);
            await this.update({ 'system.wounds.critical': newCrit });
            text = `${this.name} takes ${label} and removes ${amount} Critical Damage (now ${newCrit}).`;
        } else {
            const newValue = Math.min(this.system.wounds.max, this.system.wounds.value + amount);
            const healed = newValue - this.system.wounds.value;
            await this.update({ 'system.wounds.value': newValue });
            text = `${this.name} takes ${label} (${state}) and recovers ${healed} Wounds (now ${newValue}/${this.system.wounds.max}).`;
        }
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<p><strong>Rest &amp; Recovery</strong> — ${text}</p>`,
        });
    }

    /**
     * Spend a Fate Point (RT Core p.233). Mechanical spends (recover Wounds, remove Fatigue)
     * apply automatically; roll-coupled spends (re-roll, +10, +1 Degree, act-first) post a
     * note for the player to apply to their roll. Always costs 1 Fate. (QA-090.)
     * @param {'reroll'|'plus10'|'degree'|'wounds'|'fatigue'|'initiative'} kind
     */
    async spendFate(kind) {
        if ((this.system.fate?.value ?? 0) <= 0) {
            ui.notifications?.warn(`${this.name} has no Fate Points to spend.`);
            return;
        }
        const updates = { 'system.fate.value': this.system.fate.value - 1 };
        let effect;
        switch (kind) {
            case 'reroll': effect = 're-roll a failed Test (must accept the new result)'; break;
            case 'plus10': effect = 'add +10 to a Test'; break;
            case 'degree': effect = 'add one Degree of Success to a successful Test'; break;
            case 'initiative': effect = 'count Initiative as a 10 — act first this Round'; break;
            case 'fatigue':
                updates['system.fatigue.value'] = 0;
                effect = 'remove all Fatigue';
                break;
            case 'wounds': {
                const r = await new Roll('1d5').evaluate();
                const healed = Math.min(this.system.wounds.max - this.system.wounds.value, r.total);
                updates['system.wounds.value'] = this.system.wounds.value + healed;
                effect = `instantly recover ${healed} Wounds (rolled ${r.total})`;
                break;
            }
            default: effect = null;   // no-arg / unknown (existing re-roll & Eye of Vengeance callers post their own message)
        }
        await this.update(updates);
        if (effect) {
            await ChatMessage.create({
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor: this }),
                content: `<p><strong>Fate Point spent</strong> — ${this.name} spends a Fate Point to ${effect}. (${updates['system.fate.value']}/${this.system.fate.max} Fate remaining)</p>`,
            });
        }
    }

    /**
     * Burn a Fate Point (RT Core p.233): permanently reduce maximum Fate by 1 to cheat death —
     * survive an otherwise-fatal injury (alive but incapacitated, at the GM's discretion). (QA-091.)
     */
    async burnFate() {
        if ((this.system.fate?.max ?? 0) <= 0) {
            ui.notifications?.warn(`${this.name} has no Fate Points to burn.`);
            return;
        }
        const newMax = this.system.fate.max - 1;
        const newValue = Math.min(this.system.fate.value, newMax);
        await this.update({ 'system.fate.max': newMax, 'system.fate.value': newValue });
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `<p><strong>Fate Point BURNED</strong> — ${this.name} permanently sacrifices a Fate Point (maximum Fate is now ${newMax}) to be snatched from the jaws of death — surviving an otherwise-fatal injury (alive but incapacitated, GM's discretion).</p>`,
        });
    }

    _computeArmour() {
        let locations = [
            'body',
            'head',
            'leftArm',
            'rightArm',
            'leftLeg',
            'rightLeg'
        ]
        let toughness = this.characteristics.toughness;
        let traitBonus = 0;

        // Compute Top Trait Bonus
        const traits = this.items.filter((item) => item.type === 'trait');
        for (const trait of traits) {
            switch(trait.name) {
                case 'Machine':
                    if(trait.system.level > traitBonus) {
                        traitBonus = trait.system.level;
                    }
                    break;
                case 'Natural Armor':
                case 'Natural Armour':
                    if(trait.system.level > traitBonus) {
                        traitBonus = trait.system.level;
                    }
                    break;
            }
        }

        // Create Basic Armour Point Object
        this.system.armour = locations.reduce(
            (accumulator, location) =>
                Object.assign(accumulator, {
                    [location]: {
                        total: traitBonus,
                        toughnessBonus: toughness.bonus,
                        traitBonus: traitBonus,
                        value: 0,
                    },
                }),
            {},
        );

        // Add Cybernetics -- these are cumulative?
        this.items
            .filter((item) => item.type === 'cybernetic' )
            .filter((item) => item.system.equipped)
            .filter((item) => item.system.hasArmourPoints)
            .forEach((cybernetic) => {
                locations.forEach((location) => {
                    let armourVal = cybernetic.system.armourPoints[location] || 0;
                    this.armour[location].total += Number(armourVal);
                });
            });

        // object for storing the max armour and its craftsmanship per location
        let maxArmour = locations.reduce((acc, location) => Object.assign(acc, { [location]: 0 }), {});
        let maxArmourCraft = locations.reduce((acc, location) => Object.assign(acc, { [location]: 'Common' }), {});

        // for each item, find the maximum armour val per location
        this.items
            .filter((item) => item.type === 'armour' )
            .filter((item) => item.system.equipped)
            .reduce((acc, armour) => {
                locations.forEach((location) => {
                    let armourVal = armour.system.armourPoints[location] || 0;
                    armourVal = Number(armourVal);
                    if (armourVal > acc[location]) {
                        acc[location] = armourVal;
                        maxArmourCraft[location] = armour.system.craftsmanship || 'Common';
                    }
                });
                return acc;
            }, maxArmour);

        // Best craftsmanship armour: +1 AP — RT Core p.138
        locations.forEach((location) => {
            if (maxArmour[location] > 0 && maxArmourCraft[location] === 'Best') {
                maxArmour[location] += 1;
            }
        });

        // `value` = worn armour AP (also the Best-craftsmanship reference). `total`
        // already holds traitBonus + cybernetic AP; the per-location `total += value`
        // lines below fold in the worn armour, so `total` = the COMPLETE armour at the
        // location (worn + Natural Armour + cybernetic). Assign-damage reads `total`
        // (BUG-005 fix in assign-damage-data.mjs) instead of worn-only `value`.
        locations.forEach((location) => {
            this.armour[location].value = maxArmour[location];
        });

        this.armour.head.total += this.armour.head.value;
        this.armour.leftArm.total += this.armour.leftArm.value;
        this.armour.rightArm.total += this.armour.rightArm.value;
        this.armour.body.total += this.armour.body.value;
        this.armour.leftLeg.total += this.armour.leftLeg.value;
        this.armour.rightLeg.total += this.armour.rightLeg.value;
    }

    _computeWeaponReload() {
        // Rapid Reload (RT Core p.110) halves all reload times. There is no live reload
        // action in the engine — `system.reload` is a free-text reference field — so the
        // talent's effect is surfaced as a derived `system.effectiveReload` on every owned
        // ranged weapon (transient, not persisted). When the owner lacks the talent it
        // equals `system.reload`; with it, the value is halved (rounding down) by
        // `rapidReloadTime`. Applied by talent name → NOT an AE (double-apply guard).
        const hasRapidReload = this.hasTalent('Rapid Reload');
        this.items
            .filter((item) => item.type === 'weapon' && item.isRanged)
            .forEach((weapon) => {
                let reload = weapon.system.reload;
                // Twin-Linked (RT Core p.117): "the weapon's reload time is doubled." Applied
                // before the halving qualities so it composes (e.g. Twin-Linked + Rapid Reload
                // cancel out). Detected from the embedded attack-special items (the legacy
                // `system.special` flag is nulled out post-migration). (BUG-Q-173.)
                if (weapon.items?.some?.((i) => i.isAttackSpecial && i.name === 'Twin-Linked')
                    || weapon.system.special?.twinLinked) {
                    reload = doubleReloadTime(reload);
                }
                // Customised quality (RT Core p.143): reload takes ½ the listed time, rounding
                // UP. Composes with Rapid Reload (which then halves again, rounding down). (QA-018.)
                if (weapon.system.special?.customised) {
                    reload = rapidReloadTime(reload, true, true);
                }
                weapon.system.effectiveReload = rapidReloadTime(reload, hasRapidReload);
            });
    }

    _computeEncumbrance() {
        // Current Weight
        let currentWeight = 0;

        // Backpack
        let backpackCurrentWeight = 0;
        let backpackMaxWeight = 0;
        if (this.backpack.hasBackpack) {
            backpackMaxWeight = this.backpack.weight.max;
            this.items.filter((item) => !item.isStorageLocation).forEach((item) => {
                if (item.system.backpack?.inBackpack) {
                    backpackCurrentWeight += item.totalWeight;
                } else {
                    currentWeight += item.totalWeight;
                }
            });

            if (this.backpack.isCombatVest) {
                currentWeight += backpackCurrentWeight;
            }
        } else {
            // No backpack -- add everything
            this.items.filter((item) => !item.isStorageLocation).forEach((item) => (currentWeight += item.totalWeight));
        }

        const attributeBonus = this.characteristics.strength.bonus + this.characteristics.toughness.bonus;
        this.system.encumbrance = {
            max: 0,
            value: currentWeight,
            encumbered: false,
            backpack_max: backpackMaxWeight,
            backpack_value: backpackCurrentWeight,
            backpack_encumbered: false,
        };
        switch (attributeBonus) {
            case 0:
                this.encumbrance.max = 0.9;
                break;
            case 1:
                this.encumbrance.max = 2.25;
                break;
            case 2:
                this.encumbrance.max = 4.5;
                break;
            case 3:
                this.encumbrance.max = 9;
                break;
            case 4:
                this.encumbrance.max = 18;
                break;
            case 5:
                this.encumbrance.max = 27;
                break;
            case 6:
                this.encumbrance.max = 36;
                break;
            case 7:
                this.encumbrance.max = 45;
                break;
            case 8:
                this.encumbrance.max = 56;
                break;
            case 9:
                this.encumbrance.max = 67;
                break;
            case 10:
                this.encumbrance.max = 78;
                break;
            case 11:
                this.encumbrance.max = 90;
                break;
            case 12:
                this.encumbrance.max = 112;
                break;
            case 13:
                this.encumbrance.max = 225;
                break;
            case 14:
                this.encumbrance.max = 337;
                break;
            case 15:
                this.encumbrance.max = 450;
                break;
            case 16:
                this.encumbrance.max = 675;
                break;
            case 17:
                this.encumbrance.max = 900;
                break;
            case 18:
                this.encumbrance.max = 1350;
                break;
            case 19:
                this.encumbrance.max = 1800;
                break;
            case 20:
                this.encumbrance.max = 2250;
                break;
            default:
                this.encumbrance.max = 2250;
                break;
        }

        // RT Core Table 9-33: Lifting Weight = 2× and Pushing Weight = 4× the Carrying
        // Weight (the table is built on doubling; exact for SB+TB ≥ 1). (QA-079.)
        this.encumbrance.lifting = this.encumbrance.max * 2;
        this.encumbrance.pushing = this.encumbrance.max * 4;

        if (this.encumbrance.value > this.encumbrance.max) {
            this.encumbrance.encumbered = true;
        }
        if (this.encumbrance.backpack_value > this.encumbrance.backpack_max) {
            this.encumbrance.backpack_encumbered = true;
        }
    }

    hasTalent(talent) {
        return !!this.items.filter((i) => i.type === 'talent').find((t) => t.name === talent);
    }

    hasTalentFuzzyWords(words) {
        return !!this.items.filter((i) => i.type === 'talent').find((t) => {
            for(const word of words) {
                if (!t.name.includes(word)) return false;
            }
            return true;
        });
    }

    async rollCharacteristicCheck(characteristic) {
        const char = this.getCharacteristicFuzzy(characteristic);
        if(!char) {
            game.rt.error('Unable to perform characteristic test. Could now find provided characteristic.', char);
            return null;
        }
        return await this.rollCheck(char.total);
    }

    async opposedCharacteristicTest(targetActor, characteristic) {
        const sourceRoll = await this.rollCharacteristicCheck(characteristic);
        const targetRoll = targetActor ? await targetActor.rollCharacteristicCheck(characteristic) : null;
        return await this.opposedTest(sourceRoll, targetRoll);
    }

    async rollCheck(targetNumber) {
        const roll = await roll1d100();
        const success = roll.total === 1 || (roll.total <= targetNumber && roll.total !== 100);
        let dos = 0;
        let dof = 0;

        // Canon band-method DoS/DoF (RT Core p.22) — matches the attacker side so opposed
        // tests compare like with like. Was the DH2 `1 + tens-diff`. (QA-094.)
        if(success) {
            dos = degreesOfSuccess(targetNumber, roll.total);
        } else {
            dof = degreesOfFailure(targetNumber, roll.total);
        }

        return {
            roll: roll,
            target: targetNumber,
            success: success,
            dos: dos,
            dof: dof
        }
    }

    /**
     * Roll a Dodge or Parry Reaction to negate an incoming hit (RT Core p.238/242/246),
     * driven from the attacker's result card (QA-113). Applies the per-Round Reaction budget
     * + the lockouts (Stunned/Helpless, All Out Attack) the same way `rollSkill` does, then
     * rolls the skill directly (no prompt). Returns the outcome for the card handler.
     * NOTE: the quick-reaction Parry uses the flat skill value — weapon Parry modifiers
     * (Balanced/Defensive) only apply via the full sheet Parry control.
     * @param {'dodge'|'parry'} type
     * @returns {Promise<{attempted:boolean, blocked?:boolean, reason?:string, success?:boolean, dos?:number, roll?:number, target?:number}>}
     */
    async rollReaction(type) {
        if (type !== 'dodge' && type !== 'parry') return { attempted: false, blocked: true, reason: 'bad-type' };
        const skill = this.system.skills?.[type];
        if (!skill) return { attempted: false, blocked: true, reason: 'no-skill' };
        if (game.combat?.started && game.combat.combatants?.some((c) => c.actorId === this.id)) {
            if (reactionsLocked(this.statuses)) return { attempted: false, blocked: true, reason: 'locked' };
            if (this.system.combat?.allOutAttack) return { attempted: false, blocked: true, reason: 'all-out' };
            const rc = this.system.combat?.reactions;
            if (rc?.[type]) {
                if (!canSpendReaction(rc, type)) return { attempted: false, blocked: true, reason: 'no-reaction' };
                await this.update({ [`system.combat.reactions.${type}.value`]: (rc[type].value ?? 0) + 1 });
            }
        }
        let target = skill.current ?? 0;
        if (this.system.combat?.guardedAttack) target += 10;   // Guarded Attack +10 (QA-071)
        const result = await this.rollCheck(target);

        // Power Field (RT Core p.142): on a successful Parry with a Power-Field weapon, there is
        // a 75% chance to destroy the attacker's weapon — unless that weapon also has a power
        // field (the GM confirms that from the attacker's gear). Resolve the 75% and post a
        // note; the parry result itself is unchanged. (QA-017.)
        let powerFieldDestroy = null;
        if (type === 'parry' && result.success) {
            const meleeWeapon = this.items.find(i => i.type === 'weapon' && i.isMelee && i.system.equipped);
            const hasPowerField = meleeWeapon && (
                meleeWeapon.items?.some(it => it.isAttackSpecial && it.name === 'Power Field')
                || meleeWeapon.system.special?.powerField
            );
            if (hasPowerField) {
                powerFieldDestroy = (await new Roll('1d100').evaluate()).total <= 75;
                await ChatMessage.create({
                    speaker: ChatMessage.getSpeaker({ actor: this }),
                    content: `<p><strong>${meleeWeapon.name}</strong> (Power Field) parries — `
                        + `${powerFieldDestroy ? "<strong>destroys the attacker's weapon</strong>" : "the attacker's weapon survives"} `
                        + `(75% to destroy, unless that weapon also has a power field).</p>`,
                });
            }
        }
        return { attempted: true, success: result.success, dos: result.dos, roll: result.roll.total, target, powerFieldDestroy };
    }

    async opposedTest(rollCheckSource, rollCheckTarget) {
        if(!rollCheckSource) {
            return null;
        }
        if(rollCheckTarget) {
            let success = false;
            if(rollCheckSource.success) {
                if(!rollCheckTarget.success) {
                    success = true;
                } else {
                    success = rollCheckSource.dos >= rollCheckTarget.dos;
                }
            }
            return {
                source: rollCheckSource,
                target: rollCheckTarget,
                success: success
            }
        } else {
            return {
                source: rollCheckSource,
                success: true
            };
        }
    }
}
