import { WeaponRollData } from '../rolls/roll-data.mjs';

export function ammoText(item) {
    game.rt.log('ammoText', item);
    if (item.usesAmmo) {
        const ammo = item.items.find((i) => i.isAmmunition);
        const name = ammo ? ammo.name : 'Standard';
        game.rt.log('ammoName', name);
        return `${name} (${item.system.clip.value}/${item.system.clip.max})`;
    }
}

export async function useAmmo(actionData) {
    let actionItem = actionData.rollData.weapon ?? actionData.rollData.power;
    if (!actionItem) return;
    if (actionItem.usesAmmo) {
        let newValue = actionItem.system.clip.value -= actionData.rollData.ammoUsed;
        // Reset to 0 if there was a problem
        if (newValue < 0) {
            newValue = 0;
        }

        await actionItem.update({
            system: {
                clip: {
                    value: newValue
                }
            }
        });

        if (actionItem.system.clip.value === 0) {
            ui.notifications.warn(`Clip is now empty. Ammo should be removed or reloaded.`);
        }
    }
}

export async function refundAmmo(actionData) {
    let actionItem = actionData.rollData.weapon ?? actionData.rollData.power;
    if (actionItem.usesAmmo) {
        await actionItem.update({
            system: {
                clip: {
                    value: actionItem.system.clip.value += actionData.rollData.ammoUsed
                }
            }
        });
    }
}

/**
 * @param rollData {WeaponRollData}
 */
export async function calculateAmmoAttackBonuses(rollData) {
    const weapon = rollData.weapon;
    const ammo = weapon.items.find((i) => i.isAmmunition);
    if (!ammo) return;

    switch (ammo.name) {
        case 'Explosive Arrows and Quarrels':
            rollData.specialModifiers['explosive arrows'] = -10;
            break;
    }
}

export async function calculateAmmoAttackSpecials(rollData) {
    const weapon = rollData.weapon;
    const ammo = weapon.items.find((i) => i.isAmmunition);
    if (!ammo) return;

    game.rt.log('calculateAmmoAttackSpecials', ammo.name);
    switch (ammo.name) {
        case 'Explosive Arrows and Quarrels':
            // RT Core p.137: Damage becomes Explosive (set in calculateAmmoSpecials),
            // weapon loses the Primitive quality, -10 to hit. No Blast is granted.
            rollData.attackSpecials.findSplice((i) => i.name === 'Primitive');
            break;
        case 'Hot-Shot Charge Pack':
            // RT Core p.137: loses Reliable; "rolls two dice for Damage and picks the
            // highest" is expressed as Tearing (drop-lowest) for the 1d10 las weapons it
            // is used with.
            rollData.attackSpecials.findSplice((i) => i.name === 'Reliable');
            rollData.attackSpecials.push({
                name: 'Tearing',
                level: true,
            });
            break;
        case 'Inferno Shells':
            rollData.attackSpecials.push({
                name: 'Flame',
                level: true,
            });
            break;
        case 'Toxic Shot':
            // Into the Storm p.131: weapon gains the Toxic quality.
            rollData.attackSpecials.push({
                name: 'Toxic',
                level: 1,
            });
            break;
        case 'Snare Shells':
            // Into the Storm p.131: weapon gains the Snare quality (base Challenging
            // +0 immobilise test — level 0 → no test penalty). The -2 base damage
            // stays narrative.
            rollData.attackSpecials.push({
                name: 'Snare',
                level: 0,
            });
            break;
        case 'Airtorch Canister':
            // Into the Storm p.131: the melta blast escapes in a wide swath — the
            // weapon gains the Scatter quality and suffers the Overheating quality.
            // The halved Range stays narrative.
            rollData.attackSpecials.push({
                name: 'Scatter',
                level: true,
            });
            rollData.attackSpecials.push({
                name: 'Overheats',
                level: true,
            });
            break;
    }
}

export async function calculateAmmoSpecials(actionData, hit) {
    const weapon = actionData.rollData.weapon;
    const ammo = weapon.items.find((i) => i.isAmmunition);
    if (!ammo) return;

    switch (ammo.name) {
        case 'Bleeder Rounds':
            // RT Core p.137: +3 Damage vs living 'biological' targets only — Daemonic /
            // Machine targets take no extra Damage (GM-adjudicated; the damage pipeline
            // has no target traits at this point). The +3 is applied in
            // calculateAmmoDamageBonuses.
            hit.addEffect('Bleeder Rounds', '+3 Damage against living biological targets (no bonus vs Daemonic or Machine).');
            break;
        case 'Dumdum Bullets':
            hit.addEffect('Dumdum Bullets', 'Armour points count double against this hit.');
            break;
        case 'Explosive Arrows and Quarrels':
            hit.damageType = 'Explosive';
            break;
    }
}

/**
 * @param actionData {WeaponAttackData}
 * @param hit {Hit}
 */
export async function calculateAmmoDamageBonuses(actionData, hit) {
    const weapon = actionData.rollData.weapon;
    const ammo = weapon.items.find((i) => i.isAmmunition);
    if (!ammo) return;

    switch (ammo.name) {
        case 'Amputator Shells':
            hit.modifiers['amputator shells'] = 2;
            break;
        case 'Bleeder Rounds':
            hit.modifiers['bleeder rounds'] = 3;
            break;
        case 'Dumdum Bullets':
            hit.modifiers['dumdum bullets'] = 2;
            break;
        case 'Expander Rounds':
            hit.modifiers['expander rounds'] = 1;
            break;
        case 'Hot-Shot Charge Pack':
            hit.modifiers['hot-shot charge pack'] = 1;
            break;
    }
}

/**
 * @param actionData {actionData}
 * @param hit {Hit}
 */
export async function calculateAmmoPenetrationBonuses(actionData, hit) {
    const weapon = actionData.rollData.weapon;
    const ammo = weapon.items.find((i) => i.isAmmunition);
    if (!ammo) return;

    switch (ammo.name) {
        case 'Expander Rounds':
            hit.penetrationModifiers['expander rounds'] = 1;
            break;
        case 'Hot-Shot Charge Pack':
            hit.penetrationModifiers['hot-shot charge pack'] = 4;
            break;
        case 'Man-Stopper Bullets':
            hit.penetrationModifiers['man-stopper bullets'] = 3;
            break;
    }
}

/**
 * @param rollData {WeaponRollData}
 */
export function calculateAmmoInformation(rollData) {
    const availableAmmo = rollData.weapon.system.clip.value;

    if(!rollData.weapon.usesAmmo) {
        return;
    }

    // Calculate Ammo *PER* shot
    let ammoPerShot = 1;
    if (rollData.hasAttackSpecial('Overcharge')) {
        ammoPerShot = 2;
    } else if (rollData.hasAttackSpecial('Overload')) {
        ammoPerShot = 4;
    }

    if (rollData.hasAttackSpecial('Twin-Linked')) {
        ammoPerShot *= 2;
    }
    if (rollData.hasAttackSpecial('Storm')) {
        ammoPerShot *= 2;
    }
    if (rollData.hasAttackSpecial('Maximal')) {
        ammoPerShot *= 3;
    }

    // Max hits with available ammo
    const maximumHits = Math.floor(availableAmmo / ammoPerShot);
    let fireRate = 1;

    if (rollData.action === 'Full Auto Burst' || rollData.action === 'Semi-Auto Burst') {
        if (rollData.action === 'Full Auto Burst') {
            fireRate = rollData.weapon.system.rateOfFire.full;
        } else if (rollData.action === 'Semi-Auto Burst') {
            fireRate = rollData.weapon.system.rateOfFire.burst;
        }
    }

    // Not enough ammo available -- lower to max hits
    if (maximumHits < fireRate) {
        fireRate = maximumHits;
    }

    // Ammunition Modification
    const ammunition = rollData.weapon.items.find((i) => i.isAmmunition);
    if (ammunition) {
        switch (ammunition.name) {
            case 'Hot-Shot Charge Pack':
                fireRate = 1;
        }
    }

    rollData.ammoPerShot = ammoPerShot;
    rollData.fireRate = fireRate;
    rollData.ammoUsed = fireRate * ammoPerShot;
    rollData.ammoText = ammoText(rollData.weapon);
}
