import { WeaponRollData } from '../rolls/roll-data.mjs';
import { hitLocationNames } from './hit-locations.mjs';

/**
 * @param rollData {WeaponRollData}
 */
export function calculateCombatActionModifier(rollData) {
    const currentAction = rollData.actions[rollData.action];

    game.rt.log('calculateCombatActionModifier', currentAction);
    if (rollData.action === 'Called Shot') {
        if(rollData.isCalledShot === false) {
            rollData.isCalledShot = true;
            rollData.calledShotLocation = hitLocationNames()[0];
        }
    } else {
        rollData.isCalledShot = false;
    }

    const actionInfo = allCombatActions().find(action => action.name === currentAction);
    if (actionInfo && actionInfo.attack?.modifier) {
        rollData.modifiers['attack'] = actionInfo.attack.modifier;
    } else {
        rollData.modifiers['attack'] = 0;
    }
}

/**
 * @param rollData {WeaponRollData}
 */
export function updateAvailableCombatActions(rollData) {
    const actions = allCombatActions()
        // DH2-only actions remain in the list for backwards compatibility with
        // imported actors/macros but are hidden from the attack dropdown.
        .filter((action) => !action.legacy)
        .filter((action) => action.subtype.includes('Attack'))
        .filter((action) => {
            if (rollData.weapon.isRanged) {
                return action.subtype.includes('Ranged');
            } else {
                return action.subtype.includes('Melee');
            }
        });

    // Swift Attack / Lightning Attack are RT 1e melee multi-attack TALENTS (RT Core
    // p.107 / p.102) — `legacy` keeps them out of the default dropdown, but surface
    // them as Full-Action melee options when the wielder owns the talent. Lightning
    // Attack replaces Swift Attack; show whichever talents the actor has.
    if (!rollData.weapon.isRanged) {
        for (const talent of ['Swift Attack', 'Lightning Attack']) {
            if (rollData.sourceActor?.hasTalent?.(talent)
                && !actions.find((a) => a.name === talent)) {
                const legacyAction = allCombatActions().find((a) => a.name === talent);
                if (legacyAction) actions.push(legacyAction);
            }
        }
    }

    if (rollData.hasAttackSpecial('Unbalanced') || rollData.hasAttackSpecial('Unwieldy')) {
        actions.findSplice((action) => action.name === 'Lightning Attack');
    }

    if (rollData.weapon.isRanged) {
        if (rollData.weapon.system.rateOfFire.burst <= 0) {
            actions.findSplice((action) => action.name === 'Semi-Auto Burst');
            actions.findSplice((action) => action.name === 'Suppressing Fire - Semi');
        }
        if (rollData.weapon.system.rateOfFire.full <= 0) {
            actions.findSplice((action) => action.name === 'Full Auto Burst');
            actions.findSplice((action) => action.name === 'Suppressing Fire - Full');
        }
    }

    rollData.actions = {};
    rollData.combatActionInformation = actions;
    for (let action of actions) {
        rollData.actions[action.name] = action.name;
    }

    // If action no longer exists -- set to first available
    if (!Object.keys(rollData.actions).find((a) => a === rollData.action)) {
        rollData.action = rollData.actions[Object.keys(rollData.actions)[0]];
    }
}

function allCombatActions() {
    return [
        {
            name: 'Standard Attack',
            type: ['Half'],
            subtype: ['Attack', 'Melee', 'Ranged'],
            description: 'Make one melee attack (WS test) or one ranged attack (BS test). No bonus or penalty. Jam on 96+ for ranged.',
            attack: {
                modifier: 0,
            },
        },
        {
            name: 'Aim',
            type: ['Full', 'Half'],
            subtype: ['Concentration'],
            description: "Grants +10 (Half) or +20 (Full) bonus to character's next attack. Taking a Reaction will remove the bonus from Aiming.",
        },
        {
            name: 'All Out Attack',
            type: ['Full'],
            subtype: ['Attack', 'Melee'],
            description: "Give up Dodge and Parry Reactions this Round to gain +20 WS.",
            attack: {
                modifier: 20,
            },
        },
        {
            name: 'Brace Heavy Weapon',
            type: ['Half'],
            subtype: ['Miscellaneous'],
            description: 'Support a Heavy weapon. Unbraced heavy weapons incur -30 to BS. May pivot 45-degrees without losing bracing.',
        },
        {
            name: 'Called Shot',
            type: ['Full'],
            subtype: ['Attack', 'Concentration', 'Melee', 'Ranged'],
            description: 'Attack a specific location on a target with a -20 to WS or BS.',
            attack: {
                modifier: -20,
            },
        },
        {
            name: 'Charge',
            type: ['Full'],
            subtype: ['Attack', 'Melee', 'Movement'],
            description: 'Move up to 3x AgB (last 4m in a straight line at the enemy), then make a single melee attack with +10 WS.',
            attack: {
                modifier: 10,
            },
        },
        {
            name: 'Defensive Stance',
            type: ['Full'],
            subtype: ['Concentration', 'Melee'],
            description: 'Gain an additional Reaction. Opponents suffer -20 WS.',
        },
        {
            name: 'Delay',
            type: ['Half'],
            subtype: ['Miscellaneous'],
            description: "Take any Half Action at any time before the character's next turn. Attacks count as being part of the next turn.",
        },
        {
            name: 'Disengage',
            type: ['Full'],
            subtype: ['Movement'],
            description: 'Break from melee without incurring a free attack.',
        },
        {
            name: 'Dodge',
            type: ['Reaction'],
            subtype: ['Movement'],
            description:
                'Attempt to avoid an incoming ranged or melee attack with an Agility-based Dodge test. To evade an area-of-effect attack the character must be able to escape the radius by moving no further than a Half Move.',
        },
        {
            name: 'Parry',
            type: ['Reaction'],
            subtype: ['Defence', 'Melee'],
            description:
                'Attempt to parry an incoming melee attack with a Weapon Skill test. Some weapons grant a bonus or penalty to the Parry test; the Defensive quality grants +15, Unwieldy weapons cannot Parry.',
        },
        {
            // RT Living Errata v1.4 removes the 'Attack' subtype so Feint
            // doesn't consume the once-per-turn Attack slot. We keep it here
            // so the action remains pickable from the attack dropdown.
            name: 'Feint',
            type: ['Half'],
            subtype: ['Attack', 'Melee'],
            description: 'Opposed WS test; if character wins, his next Melee attack cannot be Dodged or Parried.',
        },
        {
            name: 'Full Auto Burst',
            type: ['Full'],
            subtype: ['Attack', 'Ranged'],
            description: 'Grants +20 BS, one hit per Degree of Success (up to the weapon\'s Full RoF); Jam on 94+ result.',
            attack: {
                modifier: 20,
            },
        },
        {
            name: 'Grapple',
            type: ['Half', 'Full'],
            subtype: ['Attack', 'Melee'],
            description: 'Affect a Grappled opponent or escape from a Grapple.',
        },
        {
            // RT 1e Core: Guarded Attack — Full, Attack/Concentration/Melee.
            // RT lists this as melee-only; we keep Ranged in subtype for the
            // shooter equivalent (a common house-rule extension).
            name: 'Guarded Attack',
            type: ['Full'],
            subtype: ['Attack', 'Concentration', 'Melee', 'Ranged'],
            description: 'Make one melee attack at -10 WS. Until the start of your next turn, gain +10 to all Dodge and Parry tests.',
            attack: {
                modifier: -10,
            },
        },
        {
            name: 'Jump or Leap',
            type: ['Full'],
            subtype: ['Movement'],
            description: 'Jump vertically or leap horizontally.',
        },
        {
            name: 'Knock Down',
            type: ['Half'],
            subtype: ['Attack', 'Melee'],
            description: 'Make an opposed Strength test. If you win, the target is knocked Prone; on 2+DoS it also suffers (1d5-3)+SB Impact damage (with armour counting as double) and 1 level of fatigue.',
        },
        {
            // RT 1e Core lists Lightning Attack as a TALENT, not a base action
            // (RT Core p.102): "As a Full Action, the character may make three melee
            // attacks." Surfaced in the dropdown only when the actor owns the talent
            // (updateAvailableCombatActions); `legacy` keeps it out of the default list.
            name: 'Lightning Attack',
            type: ['Full'],
            subtype: ['Attack', 'Melee'],
            description: 'Make three melee attacks (Lightning Attack talent). Two additional hits on a successful WS test; replaces Swift Attack.',
            attack: {
                modifier: 0,
            },
            legacy: true,
        },
        {
            name: 'Manoeuvre',
            type: ['Half'],
            subtype: ['Attack', 'Movement', 'Melee'],   // QA-069: Attack so it appears in the melee attack dropdown
            description:
                'Make an opposed WS test against character in melee range; if successful, move them up to 1 metre in direction of choice (character may advance 1 metre as well). Cannot push into obstacles or characters, but can push off of cliffs or edges.',
        },
        {
            // RT Core p.248 / Table 9-4 — Tactical Advance IS RT canon (was wrongly dropped
            // as DH2-only). A Full Action to move from cover to cover. (QA-070.)
            name: 'Tactical Advance',
            type: ['Full'],
            subtype: ['Concentration', 'Movement'],
            description:
                'Move from cover to cover: move up to your Full Move, but you must begin and end the move in cover.',
        },
        {
            name: 'Overwatch',
            type: ['Full'],
            subtype: ['Attack', 'Concentration', 'Ranged'],
            description:
                'Shoot targets coming into a set 45-degree kill zone with Standard/Semi-Auto/Full-Auto attack (specify which) at -20 BS. Targets of an Overwatch shot must make a +0 Pinning test or become Pinned, even if the attack did no damage.',
            attack: {
                modifier: -20,
            },
        },
        {
            name: 'Ready',
            type: ['Half'],
            subtype: ['Miscellaneous'],
            description:
                'Ready a weapon or an item, apply a bandage or coat a blade with poison, stow an item securely in a bag. Dropping an item is considered a Free Action. Can used twice to affect 2 different items.',
        },
        {
            name: 'Reload',
            type: ['Half', 'Full', '2Full'],
            subtype: ['Miscellaneous'],
            description:
                'Reload a ranged weapon - the time necessary depends on the specific weapon. If a reload action extends across multiple turns, it counts as being Extended, and is subject to additional tests or interruptions.',
        },
        {
            name: 'Semi-Auto Burst',
            type: ['Full'],
            subtype: ['Attack', 'Ranged'],
            description: 'Grants +10 BS, one hit plus one additional hit per two Degrees of Success (up to the weapon\'s Semi RoF); jam on 94+.',
            attack: {
                modifier: 10,
            },
        },
        {
            name: 'Stun',
            type: ['Full'],
            subtype: ['Attack', 'Melee'],
            description:
                'Using melee weapon, WS test with -20. Success is 1d10+SB, vs targets TB+(AP on head). If success, target is stunned for the number of rounds equal to difference.',
            attack: {
                modifier: -20,
            },
        },
        {
            name: 'Suppressing Fire - Semi',
            type: ['Full'],
            subtype: ['Attack', 'Ranged'],
            description:
                'Fires a semi-auto (in 30 degree arc) burst at -20 to BS. Enemies in the arc must make a -10 Pinning save or become pinned.',
            attack: {
                modifier: -20,
            },
        },
        {
            name: 'Suppressing Fire - Full',
            type: ['Full'],
            subtype: ['Attack', 'Ranged'],
            description:
                'Fires a full-auto (in 45 degree arc) burst at -20 to BS. Enemies in the arc must make a -20 Pinning save or become pinned.',
            attack: {
                modifier: -20,
            },
        },
        {
            // RT 1e Core lists Swift Attack as a TALENT, not a base action
            // (RT Core p.107): "As a Full Action, he may make two melee attacks on his
            // Turn." Surfaced in the dropdown only when the actor owns the talent
            // (updateAvailableCombatActions); `legacy` keeps it out of the default list.
            name: 'Swift Attack',
            type: ['Full'],
            subtype: ['Attack', 'Melee'],
            description: 'Make two melee attacks (Swift Attack talent). One additional hit on a successful WS test.',
            attack: {
                modifier: 0,
            },
            legacy: true,
        },
        {
            // RT 1e Core Table 9-4 (Chapter IX, p.243). Attack more than once
            // when wielding two weapons or via a talent (e.g. Two-Weapon
            // Wielder). Mechanical handling of the second attack is on the GM
            // for now — this entry just makes the action selectable.
            name: 'Multiple Attacks',
            type: ['Full'],
            subtype: ['Attack', 'Melee', 'Ranged'],
            description: 'Attack more than once in the same Round. Requires two weapons or a talent (e.g. Two-Weapon Wielder). Resolve each attack with its own WS or BS test.',
            attack: {
                modifier: 0,
            },
        },
    ];
}
