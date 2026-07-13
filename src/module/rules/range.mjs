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

    //Check Compact — RT Core p.163: the Compact upgrade halves the weapon's range (also weight,
    //clip, and Damage by 1 — handled in weapon-modifiers). (BUG-Q — loop backlog.)
    if (rollData.hasWeaponModification('Compact')) {
        range = Math.floor(range * .5);
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
        // Ship weapons get their range modifier from the Strategic-Round shipShootingCheck dialog
        // (Short +10 / Long −10, RT Core p.217), applied as modifiers['range band']. This canvas
        // pass only labels the band for display — it must NOT also add a (non-canon, DH-style)
        // +20/−20, or the to-hit double-dips the range modifier. (BUG-Q-225.)
        if (targetDistance <= short) {
            rollData.rangeName = 'Short Range';
        } else if (targetDistance <= medium) {
            rollData.rangeName = 'Medium Range';
        } else if (targetDistance <= long) {
            rollData.rangeName = 'Long Range';
        } else {
            rollData.rangeName = 'Can`t Shoot';
        }
        rollData.rangeBonus = 0;
        return;
    }

    if (targetDistance === 0) {
        rollData.rangeName = 'Self';
        rollData.rangeBonus = 0;
    } else if (targetDistance > 0 && targetDistance <= 1) {
        rollData.rangeName = 'Melee';
        rollData.rangeBonus = 0;
    }  else if (targetDistance > 1 && targetDistance <= 2) {
        // RT Core p.247: Point Blank Range is "two metres away or closer" (+30 BS). ≤1m is
        // treated as Melee above (the bonus doesn't apply when engaged in melee). (QA-097.)
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
        // Marksman (RT Core p.102): "no penalties for firing at long or extreme range" — no Aim
        // required, unlike the scopes. The talent was in the pack but mechanically inert. (BUG-Q-204.)
        if ((rollData.rangeName === 'Long Range' || rollData.rangeName === 'Extreme Range')
            && rollData.sourceActor?.hasTalent?.('Marksman')) {
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
