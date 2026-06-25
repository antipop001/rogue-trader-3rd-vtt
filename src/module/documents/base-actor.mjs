import { prepareSimpleRoll } from '../prompts/simple-prompt.mjs';
import { SimpleSkillData } from '../rolls/action-data.mjs';
import { toCamelCase } from '../handlebars/handlebars-helpers.mjs';
import { quadrupedMoveMultiplier, hasUnnaturalSpeed } from '../rolls/roll-helpers.mjs';

export class RogueTraderBaseActor extends Actor {

    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);
        let initData = {
            'prototypeToken.bar1': { 'attribute': 'wounds' },
            'prototypeToken.bar2': { 'attribute': 'fate' },
            'prototypeToken.displayName': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            'prototypeToken.displayBars': CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
            'prototypeToken.disposition': CONST.TOKEN_DISPOSITIONS.NEUTRAL,
            'prototypeToken.name': data.name,
        };
        if (data.type === 'vehicle') {
            initData['prototypeToken.bar1'] = { 'attribute': 'integrity' };
            initData['prototypeToken.bar2'] = { 'attribute': '' };
        }
        if (data.type === 'voidship') {
            initData['prototypeToken.bar1'] = { 'attribute': 'hull' };
            initData['prototypeToken.bar2'] = { 'attribute': '' };
        }
        if (data.type === 'acolyte') {
            initData['prototypeToken.sight.enabled'] = true;
            initData['prototypeToken.actorLink'] = true;
        }
        this.updateSource(initData);
    }

    get characteristics() {
        return this.system.characteristics;
    }

    get initiative() {
        return this.system.initiative;
    }

    get wounds() {
        return this.system.wounds;
    }

    get size() {
        return Number.parseInt(this.system.size);
    }

    get movement() {
        return this.system.movement;
    }

    async prepareData() {
        await super.prepareData();
        this._computeCharacteristics();
        this._computeMovement();
    }

    async rollCharacteristic(characteristicName, override) {
        const characteristic = this.characteristics[characteristicName];

        const simpleSkillData = new SimpleSkillData();
        const rollData = simpleSkillData.rollData;
        rollData.actor = this;
        rollData.nameOverride = characteristic.label;
        rollData.type = override ? override : 'Characteristic';
        rollData.baseTarget = characteristic.total;
        rollData.modifiers.modifier = 0;
        // RT 1e: any level of Fatigue imposes -10 to all Tests (BUG-004). Covers WS/BS
        // attacks too, which route through rollCharacteristic. Guarded for actor types
        // (vehicle/voidship) that have no fatigue track.
        if (this.system.fatigue?.value >= 1) {
            rollData.modifiers['Fatigued'] = -10;
        }
        rollData.optionalBonuses = this.collectOptionalBonuses({ characteristic: characteristicName });
        await prepareSimpleRoll(simpleSkillData);
    }

    /**
     * Scan owned items for talents with `flags.rt.conditionalBonuses` that
     * could apply to the current roll. Returned items become checkboxes in
     * the roll-modifier prompt.
     *
     * @param {{skill?: string, characteristic?: string}} context
     * @returns {Array<{id: string, label: string, value: number}>}
     */
    collectOptionalBonuses(context) {
        const out = [];
        for (const item of this.items) {
            const bonuses = foundry.utils.getProperty(item, 'flags.rt.conditionalBonuses');
            if (!Array.isArray(bonuses)) continue;
            for (let i = 0; i < bonuses.length; i++) {
                const b = bonuses[i];
                const a = b?.applies || {};
                const skillMatch = context.skill && Array.isArray(a.skills)
                    && a.skills.includes(context.skill);
                const charMatch = context.characteristic && Array.isArray(a.characteristics)
                    && a.characteristics.includes(context.characteristic);
                if (!skillMatch && !charMatch) continue;
                const v = b.value || 0;
                out.push({
                    id: `${item.id}-${i}`,
                    label: `${item.name}${b.label ? ` — ${b.label}` : ''}`,
                    value: v,
                    valueSigned: v > 0 ? `+${v}` : `${v}`,
                });
            }
        }
        return out;
    }

    getCharacteristicFuzzy(char) {
        // This tries to account for case sensitivity and abbreviations
        for (const [name, characteristic] of Object.entries(this.characteristics)) {
            if (char.toUpperCase() === name.toUpperCase() || char.toLocaleString() === characteristic.short.toUpperCase()) {
                return characteristic;
            }
        }
    }

    _computeCharacteristics() {
        for (const [name, characteristic] of Object.entries(this.characteristics)) {
            characteristic.total = characteristic.base + characteristic.advance * 5 + characteristic.modifier;
            characteristic.bonus = Math.floor(characteristic.total / 10) + characteristic.unnatural;
        }

        // Additive modifier (system.initiative.modifier) lets effects like Paranoia
        // "+2 Initiative" contribute; ?? 0 keeps NPCs without the field safe. BUG-002.
        this.initiative.bonus =
            this.characteristics[this.initiative.characteristic].bonus
            + (this.system.initiative.modifier ?? 0);
    }

    _computeMovement() {
        let agility = this.characteristics.agility;
        let size = this.size;
        // Quadruped (RT Core p.366) scales the Agility-Bonus term of movement (×2 base,
        // ×3 six legs, ×4 eight legs); the size modifier stays additive. Trait-gated and
        // applied by name (NOT an AE — it scales the derived AgB, which an AE can't read),
        // so it never double-counts (movement is fully computed here, never baked).
        // ENGINE-UNNATURAL slice.
        const moveMult = quadrupedMoveMultiplier(this.items.filter((i) => i.type === 'trait'));
        // Encumbered: reduce the Agility Bonus by 1 for movement rates (RT Core p.249,
        // "Encumbered Characters"). `encumbrance` is computed before the final movement pass
        // (acolyte prepareData); undefined for actors without a carry track. (QA-078.)
        const encPenalty = this.encumbrance?.encumbered ? 1 : 0;
        const agBonus = Math.max(0, agility.bonus - encPenalty);
        let base = agBonus * moveMult + size - 4;
        // Unnatural Speed (RT Core p.366): double the Agility Bonus for movement, applied
        // AFTER the size modifier — so double the whole base. (QA-077.)
        if (hasUnnaturalSpeed(this.items.filter((i) => i.type === 'trait'))) base *= 2;
        this.system.movement = {
            half: base,
            full: base * 2,
            charge: base * 3,
            run: base * 6,
        };
    }

    _findCharacteristic(short) {
        for (let characteristic of Object.values(this.characteristics)) {
            if (characteristic.short === short) {
                return characteristic;
            }
        }
        return { total: 0 };
    }

    async addSpecialitySkill(skill, speciality) {
        const parent = this.system.skills[skill];
        const specialityKey = toCamelCase(speciality);

        if(parent.specialities[specialityKey]) {
            ui.notifications.warn(`Speciality already exists. Unable to create.`);
            return;
        }

        await this.update({
            system: {
                skills: {
                    [skill]: {
                        specialities:{
                            [specialityKey]: {
                                label: speciality,
                                advance: 0,
                                cost: 0,
                                taken: true,
                                custom: true
                            }
                        }
                    }
                }
            }
        });
    }

}
