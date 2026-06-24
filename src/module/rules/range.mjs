import { PsychicRollData, RollData, WeaponRollData } from '../rolls/roll-data.mjs';
import { normalizePsychicRange } from '../rolls/roll-helpers.mjs';

/**
 * @param rollData {WeaponRollData}
 */
async function calculateWeaponMaxRange(rollData) {
    const weapon = rollData.weapon;
    if (!weapon) {
        rollData.maxRange = 0;
        return;
    }

    if (weapon.isMelee) {
        rollData.maxRange = 1;
        return;
    }

    let range;
    if (Number.isInteger(weapon.system.range)) {
        range = weapon.system.range;
    } else if (weapon.system.range === '' || weapon.system.range === 'N/A') {
        range = 0;
    } else {
        try {
            const rangeCalculation = new Roll(weapon.system.range, rollData);
            rangeCalculation.evaluateSync();
            range = rangeCalculation.total ?? 0;
        } catch (error) {
            ui.notifications.warn('Range formula failed - setting to 0');
            range = 0;
        }
    }

    // Check Maximal
    if (rollData.hasAttackSpecial('Maximal')) {
        range += 10;
    }

    //Check Forearm Mounting
    if (rollData.hasWeaponModification('Forearm Weapon Mounting')) {
        range = Math.floor(range * .66);
    }

    //Check Pistol Grip
    if (rollData.hasWeaponModification('Pistol Grip')) {
        range = Math.floor(range * .5);
    }

    rollData.maxRange = range;
}

/**
 * @param rollData {PsychicRollData}
 */
async function calculatePsychicAbilityMaxRange(rollData) {
    if (!rollData.power) {
        rollData.maxRange = 0;
        return;
    }
    // Power ranges are stored as prose ("5m x Psy Rating", "Gaze", "Self", ...) which
    // Foundry's Roll() can't evaluate — normalise to metres instead (BUG-006). `pr` is
    // the effective Psy Rating; `actor` supplies Willpower Bonus for the few WB ranges.
    rollData.maxRange = normalizePsychicRange(rollData.power.system.range, rollData);
}

/**
 * @param rollData {RollData}
 */
function calculateRangeNameAndBonus(rollData) {
    if(rollData.weapon && rollData.weapon.isMelee) {
        rollData.rangeName = 'Melee';
        rollData.rangeBonus = 0;
        return;
    }

    const targetDistance = rollData.distance ?? 0;
    const maxRange = rollData.maxRange ?? 0;

    if(rollData.weapon && rollData.weapon.isShipWeapon) {
        let ranges = rollData.weapon.shipWeaponRanges;
        let short = ranges.short || Math.floor(ranges.long / 3);
        let medium = ranges.medium || Math.floor(ranges.long * 2 / 3);
        let long = ranges.long;
        if (targetDistance <= short) {
            rollData.rangeName = 'Short Range';
            rollData.rangeBonus = 20;
        } else if (targetDistance <= medium) {
            rollData.rangeName = 'Medium Range';
            rollData.rangeBonus = 0;
        } else if (targetDistance <= long) {
            rollData.rangeName = 'Long Range';
            rollData.rangeBonus = -20;
        } else {
            rollData.rangeName = 'Can`t Shoot';
            rollData.rangeBonus = 0;
        }
        return;
    }

    if (targetDistance === 0) {
        rollData.rangeName = 'Self';
        rollData.rangeBonus = 0;
    } else if (targetDistance > 0 && targetDistance <= 1) {
        rollData.rangeName = 'Melee';
        rollData.rangeBonus = 0;
    }  else if (targetDistance > 1 && targetDistance <= 3) {
        rollData.rangeName = 'Point Blank';
        rollData.rangeBonus = 30;
    } else if (targetDistance <= maxRange / 2) {
        rollData.rangeName = 'Short Range';
        rollData.rangeBonus = 10;
    } else if (targetDistance <= maxRange * 2) {
        rollData.rangeName = 'Normal Range';
        rollData.rangeBonus = 0;
    } else if (targetDistance <= maxRange * 3) {
        rollData.rangeName = 'Long Range';
        rollData.rangeBonus = -10;
    } else {
        rollData.rangeName = 'Extreme Range';
        rollData.rangeBonus = -30;
    }
}

/**
 * @param rollData {WeaponRollData}
 */
export async function calculateWeaponRange(rollData) {
    if (!rollData.weapon.isShipWeapon) {
        await calculateWeaponMaxRange(rollData);
    }
    calculateRangeNameAndBonus(rollData);

    // Ignore Negative Range Bonus for certain modifications
    if (rollData.rangeBonus < 0) {
        const aiming = rollData.modifiers['aim'] > 0;
        if (aiming && (rollData.hasWeaponModification('Telescopic Sight') || rollData.hasWeaponModification('Omni-Scope'))) {
            rollData.rangeBonus = 0;
        }
    }
}

/**
 * @param rollData {PsychicRollData}
 */
export async function calculatePsychicPowerRange(rollData) {
    await calculatePsychicAbilityMaxRange(rollData);
    calculateRangeNameAndBonus(rollData);
    // Ignore Bonus for Psychic Powers
    rollData.rangeBonus = 0;
}
