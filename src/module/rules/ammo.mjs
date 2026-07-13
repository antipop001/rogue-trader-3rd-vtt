import { WeaponRollData } from '../rolls/roll-data.mjs';

export function ammoText(item) {
    game.rt.log('ammoText', item);
    if (item.usesAmmo) {
        const ammo = item.items.find((i) => i.isAmmunition);
        const name = ammo ? ammo.name : 'Standard';
        game.rt.log('ammoName', name);
        // Show the EFFECTIVE clip max (halved for a Compact weapon, RT Core p.163) so a fully-loaded
        // Compact weapon reads e.g. 15/15, not 15/30 (the stored clip.max stays the base capacity).
        const max = Number(item.effectiveClipMax ?? item.system.clip.max) || 0;
        return `${name} (${item.system.clip.value}/${max})`;
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
        case 'Tracer Shells':
            // ItS: +5 BS when firing on Full Auto. (QA-065.)
            if (rollData.action === 'Full Auto Burst') rollData.modifiers['tracer shells'] = 5;
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
        case 'Tempest Bolt Shells':
            // RT Core: the weapon gains the Shocking quality. The damage handler matches
            // 'shocking' (lowercased), so 'Shock' never fired the Stun effect. (BUG-Q-193.)
            rollData.attackSpecials.push({
                name: 'Shocking',
                level: false,
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
        case 'Tempest Bolt Shells':
            // RT Core: damage class becomes Energy; the weapon gains Shock (added in
            // calculateAmmoAttackSpecials). +3 Damage vs the Machine Trait is
            // GM-adjudicated (no target traits in the damage pipeline). (QA-063.)
            hit.damageType = 'Energy';
            hit.addEffect('Tempest Bolt Shells', 'Damage class is Energy; weapon gains Shock. +3 Damage vs targets with the Machine Trait (GM-applied).');
            break;
        case 'Acid Shells':
            // Into the Storm p.131: Energy damage; the target may be set on Fire and each
            // hit reduces the struck location\'s AP by 1. (QA-063 — the listed flat
            // 2d10/Pen 0 base-damage replacement needs a pre-roll formula hook; deferred.)
            hit.damageType = 'Energy';
            hit.addEffect('Acid Shells', 'Energy damage. Target must test or be set on Fire; each hit reduces the struck location\'s Armour Points by 1.');
            break;
        case 'Organgrinder Rounds':
            // ItS: if the round penetrates, the target makes a Toughness Test at −10 per point
            // of Damage taken (after Armour + TB) or suffers ongoing internal damage. (QA-065.)
            hit.addEffect('Organgrinder Rounds', 'If the target took Damage, it must make a Toughness Test at −10 per point of Damage taken (after Armour and Toughness) or the round twists deeper, inflicting Blood Loss.');
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
        case 'Microburst Flask':
            // ItS: −2 Damage, +2 Penetration (and no Overheating / no Maximal). (QA-064.)
            hit.modifiers['microburst flask'] = -2;
            break;
        case 'Nephium Fuel Tank':
            // ItS: +2 base Damage (targets also take −10 Agility to avoid Damage — GM-applied). (QA-064.)
            hit.modifiers['nephium fuel tank'] = 2;
            break;
        case 'Snare Shells':
            // Into the Storm p.130: Snare Shells decrease the weapon's base Damage by 2 (the Snare
            // quality itself is granted in calculateAmmoAttackSpecials). (BUG-Q — loop backlog.)
            hit.modifiers['snare shells'] = -2;
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
        case 'Microburst Flask':
            hit.penetrationModifiers['microburst flask'] = 2;   // ItS: +2 Pen (QA-064)
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

    // The weapon's firing rate caps the additional hits a burst action can score
    // (RT Core p.242, "up to the maximum firing rate of the weapon"). That is a
    // physical property of the weapon, so it applies even to ranged weapons that
    // don't track ammo (e.g. many creature ranged attacks) — without this, an
    // ammo-less weapon kept the default fireRate of 1, breaking Semi-Auto Burst
    // (cap 0) and uncapping Full Auto Burst. (BUG-Q-171.) Ammo availability lowers
    // it further below when ammo IS tracked.
    let fireRate = 1;
    if (rollData.action === 'Full Auto Burst' || rollData.action === 'Suppressing Fire') {
        fireRate = rollData.weapon.system.rateOfFire.full;
    } else if (rollData.action === 'Semi-Auto Burst') {
        fireRate = rollData.weapon.system.rateOfFire.burst;
    }
    rollData.fireRate = fireRate;

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
