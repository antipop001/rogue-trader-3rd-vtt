// Vehicle Critical Hit Chart (Into the Storm Table 5-2). Damage past a vehicle's Structural
// Integrity accrues to `integrity.critical` and is CUMULATIVE — a vehicle that has taken N total
// critical damage suffers the row at N (capped at 10+). Parallels the personal getCriticalDamage
// lookup. Authored from ItS Ch.V — logged for RT-rules review. (QA-117 / QA-115.)
export function vehicleCriticalChart() {
    const jarring = 'Jarring Blow: the impact tosses the vehicle around. Any unsecured crew/passengers must pass an Ordinary (+10) Toughness Test or be Stunned 1d5 Rounds. All shooting from the vehicle next Round is at −20.';
    const destroyed = 'Destroyed: the hit wrecks the vehicle into a shattered hulk. Anyone inside takes 2d10 Explosive Damage and must pass a Difficult (−10) Toughness Test or be Stunned 1d10 Rounds.';
    return {
        1: jarring,
        2: jarring,
        3: 'Staggered: a direct hit on the driver\'s compartment leaves the pilot reeling. He must pass a Challenging (+0) Toughness Test or be Stunned and unable to drive/pilot for 1d5 Rounds (a ground vehicle screeches to a halt; a skimmer drifts).',
        4: 'Weapon Destroyed: a random vehicle weapon is twisted beyond repair and no longer functions; 25% chance its ammo cooks off (roll its damage vs the vehicle and any gunner at half).',
        5: 'Drive Damaged: a tread/intake/grav-housing is torn open. Reduce the vehicle\'s tactical speed by 2d10 (and cruising speed/altitude accordingly).',
        6: 'Penetrating Hit: the hit tears through the armour. Halve the vehicle\'s AP on this facing.',
        7: 'Fire: the vehicle catches fire as fuel/power ignites. Anyone inside must pass a Difficult (−10) Agility Test (to bail/extinguish) or suffer the consequences.',
        8: destroyed,
        9: destroyed,
        10: 'Explodes: a hit to ammo/fuel turns the vehicle into a fireball. Anyone inside takes 5d10 Explosive Damage; anyone within 2d10 metres takes 2d10 Explosive Damage.',
    };
}

/** The cumulative Vehicle Critical Hit result for a given total critical-damage amount. */
export function getVehicleCritical(amount) {
    const chart = vehicleCriticalChart();
    const a = amount > 10 ? 10 : (amount < 1 ? 1 : amount);
    return chart[a];
}
