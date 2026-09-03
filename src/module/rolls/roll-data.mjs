import { rollDifficulties } from '../rules/difficulties.mjs';
import { aimModifiers } from '../rules/aim.mjs';
import { calculatePsychicPowerRange, calculateWeaponRange } from '../rules/range.mjs';
import { calculateCombatActionModifier, updateAvailableCombatActions } from '../rules/combat-actions.mjs';
import { calculateAttackSpecialAttackBonuses, updateAttackSpecials } from '../rules/attack-specials.mjs';
import { calculateAmmoAttackBonuses, calculateAmmoInformation } from '../rules/ammo.mjs';
import { calculateWeaponModifiersAttackBonuses, updateWeaponModifiers } from '../rules/weapon-modifiers.mjs';
import { hitDropdown } from '../rules/hit-locations.mjs';
import { DarkHeresy } from '../rules/config.mjs';
import { shipFacings } from '../rules/ship-facings.mjs';
import { weaponMasterBonus, weaponUntrainedPenalty, shootingIntoMeleePenalty } from './roll-helpers.mjs';
import { conditionToHitModifier, attackerConditionModifier } from '../rules/conditions.mjs';

export class RollData {
    difficulties = rollDifficulties();
    aims = aimModifiers();
    shipFacings = shipFacings();
    locations = hitDropdown();

    // Chat Controls
    ignoreDegrees = false;
    ignoreSuccess = false;
    ignoreControls = false;
    ignoreDamage = false;

    sourceActor;
    targetActor;

    maxRange = 0;
    distance = 0;
    rangeName = '';
    rangeBonus = 0;

    combatActionInformation = {};
    actions = {};
    action = '';

    baseTarget = 0;
    baseChar = '';

    isOpposed = false;
    opposedTarget = 0;
    opposedChar = '';
    opposedSuccess = false;
    opposedDof = 0;
    opposedDos = 0;
    opposedRoll;
    opposedNetDegrees = 0;

    baseAim = 0;
    modifiers = {
        difficulty: 0,
        modifier: 0,
        operator: 0,
        aim: 0,
    };
    specialModifiers = {};
    modifierTotal = 0;
    hasEyeOfVengeanceAvailable = false;
    eyeOfVengeance = false;

    attackSpecials = [];
    roll;
    render;
    previousRolls = [];
    automatic = false;
    success = false;
    turretsShot = 0;
    turretsHit = 0;
    boardingAttacks = 0;
    boardingDamage = 0;
    boardingSuccess = 0;
    voidshipAttack = false;
    voidshipShotsAmount = 0;
    voidshipDamage = 0;
    voidshipFacing = 0;
    voidshipResults = [];
    voidshipTurrets = false;
    voidshipBoarding = false;
    voidshipFlawless = false;
    voidshipSuccess = false;
    voidshipFlawedSuccess = false;
    voidshipFailure = false;
    voidshipFumble = false;
    voidshipTarget = false;
    voidshipShieldsUsed = 0;
    dos = 0;
    dof = 0;

    get showDamage() {
        return this.success || this.isThrown;
    }

    reset() {
        this.automatic = false;
        this.success = false;
        this.opposedSuccess = false;
    }

    nameOverride;
    get name() {
        if(this.nameOverride) return this.nameOverride;

        let actionItem = this.weapon ?? this.power;
        if (actionItem) return actionItem.name;

        return '';
    }

    get effectString() {
        let actionItem = this.weapon ?? this.power;
        if(!actionItem) return '';

        const str = [];

        const ammo = actionItem.items.find((i) => i.isAmmunition);
        if (ammo) {
            str.push(ammo.name)
        }

        const specials = this.attackSpecials.map(s => s.name).join(',')
        if(specials) {
            str.push(specials);
        }

        if(this.hasWeaponModification) {
            const mods = this.weaponModifications.map(m => m.name).join(',');
            if(mods) {
                str.push(mods);
            }
        }
        return str.join(' | ');
    }

    get modifiedTarget() {
        return this.baseTarget + this.modifierTotal;
    }

    get activeModifiers() {
        const modifiers = {};
        for (const m of Object.keys(this.modifiers)) {
            try {
                const value = Number.parseInt(this.modifiers[m]);
                if (value !== 0) {
                    modifiers[m.toUpperCase()] = value;
                }
            } catch (err) {
                game.rt.error('Error while calculate roll data modifiers:', err);
            }
        }
        return modifiers;
    }

    hasAttackSpecial(special) {
        return !!this.attackSpecials.find((s) => s.name === special);
    }

    getAttackSpecial(special) {
        return this.attackSpecials.find((s) => s.name === special);
    }

    async calculateTotalModifiers() {
        let total = 0;
        for (const value of Object.values(this.modifiers)) {
            const n = Number(value);
            if (Number.isFinite(n)) total += n;
        }
        if (total > 60) total = 60;
        else if (total < -60) total = -60;
        this.modifierTotal = total;
    }
}

export class WeaponRollData extends RollData {
    weapons = [];
    weapon;
    weaponSelect = false;
    targetSurprised = false;   // QA-118 — +30 WS/BS vs a Surprised/Unaware target
    braced = false;            // QA-128 — Heavy weapons take -30 unless braced

    weaponModifications = [];
    isCalledShot = false;
    calledShotLocation;
    usesAmmo = false;
    ammoText = '';
    ammoPerShot = 1;
    fireRate = 1;
    ammoUsed = 0;
    weaponModifiers = {};

    canAim = true;
    isKnockDown = false;
    isFeint = false;
    isStun = false;
    isThrown = false;
    isSpray = false;
    isLasWeapon = false;

    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
    }

    hasWeaponModification(special) {
        return !!this.weaponModifications.find((s) => s.name === special);
    }

    getWeaponModification(special) {
        return this.weaponModifications.find((s) => s.name === special);
    }

    async update() {
        if(this.weapon.system.attackBonus) {
            this.modifiers['weapon'] = this.weapon.system.attackBonus;
        }
        // Surprised / Unaware target: +30 WS/BS (RT Core p.235/246). Manual prompt toggle
        // for when no token is targeted. (QA-118.)
        this.modifiers['surprise'] = this.targetSurprised ? 30 : 0;
        // Condition layer (QA-080): read the TARGET's tracked conditions and apply the RT
        // to-hit modifier (Stunned +20, Unaware/Helpless +30, Prone ±10). Reads
        // `actor.statuses`; 0 when there is no target.
        this.modifiers['target condition'] = conditionToHitModifier(this.targetActor?.statuses, this.weapon?.isMelee);
        // A Pinned shooter takes −20 to all BS Tests (RT Core p.248). Reads the ATTACKER's
        // own conditions; ranged only. (QA-082.)
        this.modifiers['pinned'] = attackerConditionModifier(this.sourceActor?.statuses, this.weapon?.isRanged);
        // Shooting into Melee (RT Core p.244): −20 to a ranged shot at a target engaged in
        // melee (auto-detected — an opposite-disposition token adjacent to the target token),
        // waived if any engaged character is Stunned/Helpless/Unaware. 0 off-canvas. (QA-156.)
        this.modifiers['into-melee'] = 0;
        if (this.weapon?.isRanged && this.targetActor && globalThis.canvas?.tokens?.placeables?.length) {
            const targetToken = this.targetActor.getActiveTokens?.()?.[0];
            if (targetToken) {
                const gs = canvas.grid?.size || 100;
                const isWaived = (s) => !!(s?.has?.('stunned') || s?.has?.('helpless') || s?.has?.('unaware'));
                const tc = targetToken.center;
                const tDisp = targetToken.document.disposition;
                const adjacentEnemies = canvas.tokens.placeables
                    .filter((t) => t.id !== targetToken.id && t.document.disposition !== tDisp)
                    .filter((t) => {
                        const c = t.center;
                        const gridDist = Math.max(Math.abs(c.x - tc.x), Math.abs(c.y - tc.y)) / gs;
                        return gridDist <= 1.5;   // adjacent (token size + diagonals)
                    })
                    .map((t) => ({ waived: isWaived(t.actor?.statuses) }));
                this.modifiers['into-melee'] = shootingIntoMeleePenalty(isWaived(this.targetActor.statuses), adjacentEnemies);
            }
        }
        // Heavy weapons fired unbraced take -30 to hit (RT Core p.116). `braced` is a
        // per-attack toggle (the Brace Heavy Weapon action / prompt checkbox). (QA-128.)
        this.isHeavyWeapon = this.weapon?.system?.class === 'Heavy';
        // Auto-counts-as-braced (RT Core p.116/123): the Auto-Stabilised trait, the Bulging
        // Biceps talent, or a Suspensor-equipped weapon cancel the unbraced -30. (QA-130.)
        const autoBraced = !!(
            this.sourceActor?.hasTalent?.('Bulging Biceps')
            || this.sourceActor?.items?.some?.((i) => i.type === 'trait' && i.name === 'Auto-Stabilised')
            || this.weapon?.items?.some?.((i) => i.isWeaponModification && i.name === 'Suspensors' && (i.system?.equipped || i.system?.enabled))
        );
        // Gyro-Stabilised (Tau Character Guide): a Heavy weapon with this Quality reduces the
        // unbraced penalty from -30 to -20 (it also "never counts its target as further than
        // Long Range" — a range-band note, GM-applied since personal range bands aren't auto-scored).
        const gyroStabilised = !!this.weapon?.system?.special?.gyroStabilised;
        this.modifiers['unbraced'] = (this.isHeavyWeapon && !this.braced && !autoBraced)
            ? (gyroStabilised ? -20 : -30) : 0;
        // Vehicle move-then-shoot (ItS Ch.V): firing from a vehicle that moved its tactical speed
        // this turn is at −10 BS, twice its tactical speed −20. Read from the operator's active
        // vehicle (set via the Operate Vehicle dialog). (QA-117 follow-up.)
        if (this.weapon?.isRanged && this.sourceActor) {
            const vid = this.sourceActor.system?.combat?.activeVehicleId;
            const vehicle = vid ? game.actors?.get(vid) : null;
            const moved = Number(vehicle?.system?.combat?.movedThisTurn) || 0;
            this.modifiers['vehicle movement'] = moved >= 2 ? -20 : (moved === 1 ? -10 : 0);
        }
        // Ship VU range-band BS modifier (QA-047): set on the rollData by the Strategic-Round
        // Shooting check; re-applied here so it survives the dialog's repeated update() passes.
        if (this.shipRangeModifier) this.modifiers['range band'] = Number(this.shipRangeModifier) || 0;
        // Weapon Training: −20 WS/BS for a weapon the character isn't trained with (RT
        // Core p.142). PCs only — NPCs are assumed proficient with their listed weapons.
        // (QA-124.)
        if (this.sourceActor?.type === 'acolyte') {
            const talents = this.sourceActor?.items?.filter((i) => i.type === 'talent') ?? [];
            this.modifiers['untrained'] = weaponUntrainedPenalty(talents, this.weapon?.system?.class, this.weapon?.system?.type);
        }
        this.canAim = this.action !== 'All Out Attack';
        this.isLasWeapon = this.weapon.system.type === 'Las';
        // Flame weapons auto-hit the cone with no BS test (RT Core p.142). RT 1e has no
        // "Spray" quality — the flag keys on Flame. (QA-131.)
        this.isSpray = this.hasAttackSpecial('Flame');
        this.isStun = this.action === 'Stun';
        this.isFeint = this.action === 'Feint';
        this.isKnockDown = this.action === 'Knock Down';

        // QA-123: ignoreModifiers was assigned here but never read anywhere — removed.
        this.ignoreDegrees = this.isSpray || this.isStun;
        this.ignoreSuccess = this.isSpray;
        this.ignoreControls = this.isFeint || this.isStun || this.isKnockDown;
        this.ignoreDamage = this.isStun || this.isFeint || this.isKnockDown;
        this.isThrown = this.weapon.isThrown;

        this.isOpposed = this.isKnockDown || this.isFeint;
        if(this.isOpposed && this.targetActor) {
            if(this.isFeint) {
                this.opposedTarget = this.targetActor?.characteristics?.weaponSkill?.total ?? 0;
                this.opposedChar = 'WS';
            } else if (this.isKnockDown) {
                this.opposedTarget = this.targetActor?.characteristics?.strength?.total ?? 0;
                this.opposedChar = 'S';
            }
        }

        await updateWeaponModifiers(this);
        await updateAttackSpecials(this);
        updateAvailableCombatActions(this);
        calculateCombatActionModifier(this);
        if (this.weapon.usesAmmo) {
            this.usesAmmo = true;
            calculateAmmoInformation(this);
        } else {
            this.usesAmmo = false;
        }
        await calculateWeaponRange(this);
        this.updateBaseTarget();
        if (this.weapon.isShipWeapon) {
            this.updateOperatorBonus();
            this.updateShotsAmount();
            this.modifiers['attack'] = 0;
        } else {
            // Weapon Master (BUG-003): +10 to hit when the wielded weapon's class
            // matches the talent's chosen class (RT Core p.73, Weapon Master). Damage +2 is
            // applied in damage-data.mjs; +2 Initiative is situational (no weapon
            // context at Initiative-roll time) and left for E2E follow-up.
            const talents = this.sourceActor?.items?.filter((i) => i.type === 'talent') ?? [];
            const wm = weaponMasterBonus(talents, this.weapon.system.class);
            if (wm.toHit) this.modifiers['weapon master'] = wm.toHit;
        }
    }

    initialize() {
        this.baseTarget = 0;
        this.modifiers['attack'] = 0;
        this.modifiers['difficulty'] = 0;
        this.modifiers['aim'] = 0;
        this.modifiers['operator'] = 0;
        this.modifiers['modifier'] = 0;

        // Target Size to-hit modifier — RANGED attacks only (RT Core p.247: the Size table
        // modifies Ballistic Skill; melee to-hit is unaffected by target Size). (QA-109.)
        if(this.targetActor && this.targetActor.system.size && this.weapon?.isRanged) {
            try {
                const size = Number.parseInt(this.targetActor.system.size);
                this.modifiers['target-size'] = (size - 4) * 10;
            } catch (error) {
                ui.notifications.warn('Target size is not a number. Unexpected error.');
            }
        }

        // Talents
        if(this.sourceActor.hasTalent('Eye of Vengeance') && this.sourceActor.system.fate.value > 0) {
            this.hasEyeOfVengeanceAvailable = true;
        }

        this.weaponSelect = this.weapons.length > 1;
        this.weapon = this.weapons[0];
        this.weapon.isSelected = true;
    }

    selectWeapon(weaponName) {
        // Unselect All
        this.weapons.filter((weapon) => weapon.id !== weaponName).forEach((weapon) => (weapon.isSelected = false));
        this.weapon = this.weapons.find((weapon) => weapon.id === weaponName);
        this.weapon.isSelected = true;
    }

    updateOperatorBonus() {
        this.modifiers.operator = this.sourceActor?.operators.weapons ?? 0;
        const bsBonus = this.sourceActor?.system?.componentBonuses?.bsShipWeapons ?? 0;
        if (bsBonus) this.modifiers['bridge'] = bsBonus;
    }

    updateBaseTarget() {
        if (this.weapon.isShipWeapon) {
            this.baseTarget = this.sourceActor?.crewRating ?? 0;
        } else if (this.weapon.isRanged) {
            this.baseTarget = this.sourceActor?.characteristics?.ballisticSkill?.total ?? 0;
            this.baseChar = 'BS';
        } else {
            this.baseTarget = this.sourceActor?.characteristics?.weaponSkill?.total ?? 0;
            this.baseChar = 'WS';
        }

        if (this.action === 'Knock Down') {
            this.baseTarget = this.sourceActor?.characteristics?.strength?.total ?? 0;
            this.baseChar = 'S';
        }
    }

    updateShotsAmount() {
        this.voidshipShotsAmount = this.weapon.system.strength;
    }

    async finalize() {
        // Remove Aim Modifier for All out attack in the case
        // where aim was selected and then the attack changed
        if(this.action === 'All Out Attack') {
            this.modifiers['aim'] = 0;
        }

        await calculateAmmoAttackBonuses(this);
        await calculateAttackSpecialAttackBonuses(this);
        await calculateWeaponModifiersAttackBonuses(this);
        this.modifiers = {
            ...this.modifiers,
            ...this.specialModifiers,
            ...this.weaponModifiers,
            range: this.rangeBonus,
        };

        // Unselect Weapon -- UI issues if it's selected on start
        this.weapon.isSelected = false;

        // Suppressing Fire ignores other modifiers
        if (this.action.includes('Suppressing Fire')) {
            this.modifiers = {
                'attack': -20
            }
        }

        await this.calculateTotalModifiers();
    }
}

export class PsychicRollData extends RollData {
    psychicPowers = [];
    power;
    powerSelect = false;
    hasFocus = false;

    hasDamage = false;

    maxPr = 0;
    pr = 0;
    strength = 'unfettered';

    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
    }

    /**
     * Maximum push points beyond Psy Rating, per the psyker's class.
     * RT 1e: Sanctioned +3, Unsanctioned +4.
     */
    get pushCap() {
        const cls = (this.sourceActor?.psy?.class ?? 'sanctioned').toLowerCase();
        // DH2 "bound"/"unbound" aliased to Sanctioned/Unsanctioned for migration.
        return (cls === 'unsanctioned' || cls === 'unbound') ? 4 : 3;
    }

    initialize() {
        this.baseTarget = 0;
        this.modifiers['difficulty'] = 0;
        this.modifiers['modifier'] = 0;
        // Use the sustained-reduced effective rating (currentRating = rating − sustained,
        // floored at 0) so casting while sustaining other powers uses the lowered PR. (QA-151.)
        const rating = this.sourceActor.psy.currentRating ?? this.sourceActor.psy.rating ?? 0;
        this.strength = (this.sourceActor.psy.strength ?? 'unfettered').toLowerCase();
        if (this.strength === 'fettered') {
            this.pr = Math.max(1, Math.ceil(rating / 2));
        } else if (this.strength === 'push') {
            this.pr = rating + this.pushCap;
        } else {
            this.pr = rating;
        }
        this.hasFocus = !!this.sourceActor.psy.hasFocus;

        this.powerSelect = this.psychicPowers.length > 1;
        this.power = this.psychicPowers[0];
        this.power.isSelected = true;
        this.hasDamage = this.power.system.subtype.includes('Attack');
    }

    selectPower(powerName) {
        this.psychicPowers.filter((power) => power.id !== powerName).forEach((power) => (power.isSelected = false));
        this.power = this.psychicPowers.find((power) => power.id === powerName);
        this.power.isSelected = true;
    }

    async update() {
        // RT Core p.157: a Focus Power Test adds +5 to the score for EACH level of Psy
        // Rating (WP 45 + PR 5×5 = 70). `this.pr` is the effective rating (Fettered/
        // Unfettered/Push already applied). Replaces the non-canon flat `hasFocus`+10
        // (BUG-011 / QA-037 — there is no inherent +10 for focusing in RT 1e).
        this.modifiers['psy rating'] = 5 * this.pr;
        this.modifiers['power'] = this.power.system.target.bonus ?? 0;
        this.hasDamage = this.power.system.subtype.includes('Attack');
        await updateAttackSpecials(this);
        this.updateBaseTarget();
        await calculatePsychicPowerRange(this);
    }

    updateBaseTarget() {
        const target = this.power.system.target;
        if(!target) return;

        if(target.useSkill) {
            const skill = target.skill;
            const actorSkill = this.sourceActor.getSkillFuzzy(skill);
            this.baseTarget = actorSkill.current;
            this.baseChar = actorSkill.label;
        } else {
            const characteristic = target.characteristic;
            const actorCharacteristic = this.sourceActor.getCharacteristicFuzzy(characteristic);
            this.baseTarget = actorCharacteristic.total;
            this.baseChar = actorCharacteristic.short;
        }

        if(target.isOpposed && this.targetActor) {
            this.isOpposed = true;

            if(target.useOpposedSkill) {
                const skill = target.opposedSkill;
                const actorSkill = this.targetActor.getSkillFuzzy(skill);
                this.opposedTarget = actorSkill.current;
                this.opposedChar = actorSkill.label;
            } else {
                const characteristic = target.opposed;
                const actorCharacteristic = this.targetActor.getCharacteristicFuzzy(characteristic);
                this.opposedTarget = actorCharacteristic.total;
                this.opposedChar = actorCharacteristic.short;
            }
        }
    }

    async finalize() {
        await calculateAttackSpecialAttackBonuses(this);
        this.modifiers = { ...this.modifiers, ...this.specialModifiers };
        await this.calculateTotalModifiers();
    }
}
