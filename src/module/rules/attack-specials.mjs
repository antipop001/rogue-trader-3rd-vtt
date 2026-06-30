import { RollData } from '../rolls/roll-data.mjs';
import { calculateAmmoAttackSpecials } from './ammo.mjs';
import { calculateWeaponModifiersAttackSpecials } from './weapon-modifiers.mjs';

export async function updateAttackSpecials(rollData) {
    rollData.attackSpecials = [];
    let actionItem = rollData.weapon ?? rollData.power;
    if (!actionItem) return;
    for (const i of actionItem.items) {
        if (i.isAttackSpecial && (i.system.equipped || i.system.enabled)) {
            rollData.attackSpecials.push({
                name: i.name,
                level: i.system.level,
            });
        }
    }

    // QA-135: the DH2/Only War per-shot "Las Firing Mode" (Standard/Overcharge/Overload
    // toggle) has no RT 1e Core basis and was removed. The Overcharge weapon quality is still
    // honoured when granted innately or by the Overcharge Pack weapon modification.

    if (actionItem.isRanged) {
        await calculateAmmoAttackSpecials(rollData);
    }

    await calculateWeaponModifiersAttackSpecials(rollData);

    // Weapon Craftsmanship — RT Core p.116
    const craftsmanship = actionItem.system.craftsmanship;
    if (craftsmanship === 'Poor' && actionItem.isRanged) {
        if (!rollData.attackSpecials.find(s => s.name === 'Unreliable')) {
            const hasReliable = rollData.attackSpecials.findIndex(s => s.name === 'Reliable');
            if (hasReliable >= 0) {
                rollData.attackSpecials.splice(hasReliable, 1);
            } else {
                rollData.attackSpecials.push({ name: 'Unreliable', level: true });
            }
        }
    } else if (craftsmanship === 'Good' && actionItem.isRanged) {
        const hasUnreliable = rollData.attackSpecials.findIndex(s => s.name === 'Unreliable');
        if (hasUnreliable >= 0) {
            rollData.attackSpecials.splice(hasUnreliable, 1);
        } else if (!rollData.attackSpecials.find(s => s.name === 'Reliable')) {
            rollData.attackSpecials.push({ name: 'Reliable', level: true });
        }
    }
}

/**
 * @param rollData {RollData}
 */
export async function calculateAttackSpecialAttackBonuses(rollData) {
    // Reset Attack Specials
    rollData.specialModifiers = {};
    let actionItem = rollData.weapon ?? rollData.power;
    if (!actionItem) return;

    for (const item of actionItem.items) {
        if (!item.isAttackSpecial) continue;
        switch (item.name) {
            case 'Scatter':
                // BUG-Q-178: RT 1e Scatter has NO flat to-hit modifier (the DH2 +10 was removed).
                // Its effect is extra HITS per 2 DoS at Point Blank + doubled target Armour at
                // Long/Extreme range — handled in action-data / damage-data, not as a to-hit mod.
                break;
            case 'Indirect':
                rollData.specialModifiers['Indirect'] = 10;
                break;
            case 'Defensive':
                rollData.specialModifiers['Defensive'] = -10;
                break;
            case 'Twin-Linked':
                // RT Core p.117: "gains a +20% bonus to hit when fired". (The doubled ammo,
                // extra hit on 2+ DoS, and doubled reload are handled in ammo.mjs /
                // action-data.mjs / _computeWeaponReload respectively.)
                rollData.specialModifiers['Twin-Linked'] = 20;
                break;
            case 'Accurate':
                if (rollData.modifiers['aim'] > 0) {
                    rollData.specialModifiers['Accurate'] = 10;
                }
                break;
            case 'Inaccurate':
                if (rollData.modifiers['aim'] > 0) {
                    rollData.specialModifiers['Inaccurate'] = -1 * rollData.modifiers['aim'];
                }
                break;
        }
    }

    // Weapon Craftsmanship attack bonuses — RT Core p.116
    const craftsmanship = actionItem.system.craftsmanship;
    if (actionItem.isMelee) {
        if (craftsmanship === 'Poor') {
            rollData.specialModifiers['Poor Craftsmanship'] = -10;
        } else if (craftsmanship === 'Good') {
            rollData.specialModifiers['Good Craftsmanship'] = 5;
        } else if (craftsmanship === 'Best') {
            rollData.specialModifiers['Best Craftsmanship'] = 10;
        }
    }
}

export function attackSpecials() {
    return [
        {
            name: 'Accurate',
            hasLevel: false,
        },
        {
            name: 'Balanced',
            hasLevel: false,
        },
        {
            name: 'Blast',
            hasLevel: true,
        },
        {
            // RT 1e's quality is Shocking (RT Core p.145), not DH2's Concussive (which appears in
            // RT only as crit-table prose). Tempest Bolt Shells grant it. (BUG-Q-193.)
            name: 'Shocking',
            hasLevel: false,
        },
        {
            name: 'Corrosive',
            hasLevel: false,
        },
        {
            name: 'Crippling',
            hasLevel: true,
        },
        {
            name: 'Defensive',
            hasLevel: false,
        },
        {
            name: 'Felling',
            hasLevel: true,
        },
        {
            name: 'Flame',
            hasLevel: false,
        },
        {
            name: 'Flexible',
            hasLevel: false,
        },
        {
            name: 'Force',
            hasLevel: false,
        },
        {
            name: 'Graviton',
            hasLevel: false,
        },
        {
            name: 'Hallucinogenic',
            hasLevel: true,
        },
        {
            name: 'Haywire',
            hasLevel: true,
        },
        {
            name: 'Inaccurate',
            hasLevel: false,
        },
        {
            name: 'Indirect',
            hasLevel: true,
        },
        {
            name: 'Lance',
            hasLevel: false,
        },
        {
            name: 'Maximal',
            hasLevel: false,
        },
        {
            name: 'Melta',
            hasLevel: false,
        },
        {
            name: 'Overheats',
            hasLevel: false,
        },
        {
            name: 'Power Field',
            hasLevel: false,
        },
        {
            name: 'Primitive',
            hasLevel: false,   // RT 1e Primitive takes no level — doubles armour, no damage cap (BUG-Q-198)
        },
        {
            name: 'Proven',
            hasLevel: true,
        },
        {
            name: 'Razor Sharp',
            hasLevel: false,
        },
        {
            name: 'Recharge',
            hasLevel: false,
        },
        {
            name: 'Reliable',
            hasLevel: false,
        },
        {
            name: 'Sanctified',
            hasLevel: false,
        },
        {
            name: 'Scatter',
            hasLevel: false,
        },
        {
            name: 'Smoke',
            hasLevel: false,   // RT 1e Smoke: flat 3d10m cloud, no level (BUG-Q-198)
        },
        {
            name: 'Snare',
            hasLevel: false,   // RT 1e Snare: flat Agility test, no level (BUG-Q-198)
        },
        {
            name: 'Spray',
            hasLevel: false,
        },
        {
            name: 'Storm',
            hasLevel: false,
        },
        {
            name: 'Tearing',
            hasLevel: false,
        },
        {
            name: 'Toxic',
            hasLevel: false,   // RT 1e Toxic: flat -5/point of damage, no level (BUG-Q-198)
        },
        {
            name: 'Twin-Linked',
            hasLevel: false,
        },
        {
            name: 'Unbalanced',
            hasLevel: false,
        },
        {
            name: 'Unreliable',
            hasLevel: false,
        },
        {
            name: 'Unwieldy',
            hasLevel: false,
        },
        {
            name: 'Unstable',
            hasLevel: false,
        },
        // (Vengeful removed — not an RT 1e weapon quality; DH2/Only War import. BUG-Q-186.)
    ];
}

export function attackSpecialsNames() {
    return attackSpecials().map((a) => a.name);
}
