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

    // Penalty-negating talents (RT Core): Sharpshooter cancels the −20 for Called Shots;
    // Takedown cancels the −20 for the Stun Action. (QA-034.)
    const actor = rollData.sourceActor;
    if (rollData.action === 'Called Shot' && actor?.hasTalent?.('Sharpshooter')) {
        rollData.modifiers['attack'] = 0;
    } else if (rollData.action === 'Called Shot' && actor?.hasTalent?.('Deadeye Shot')) {
        // Deadeye Shot (RT Core p.98): a Called Shot is −10 instead of −20. Checked AFTER
        // Sharpshooter (whose prereq is Deadeye Shot) so a Sharpshooter still gets the full
        // negation. (BUG-Q-205.)
        rollData.modifiers['attack'] = -10;
    } else if (rollData.action === 'Stun' && actor?.hasTalent?.('Takedown')) {
        rollData.modifiers['attack'] = 0;
    }

    // Two-Weapon Fighting (RT Core p.246): with the Two-Weapon Wielder talent, each attack of
    // a Multiple Attacks action (one per weapon — resolve the action once per hand) suffers
    // −20, dropping to −10 with Ambidextrous. (QA-119.)
    if (rollData.action === 'Multiple Attacks') {
        const hasTWW = actor?.items?.some?.((i) => i.type === 'talent' && /^two-?weapon wielder/i.test(i.name));
        rollData.modifiers['attack'] = -20;
        if (hasTWW && actor?.hasTalent?.('Ambidextrous')) {
            rollData.modifiers['attack'] = -10;
        }
        // Gunslinger (RT Core p.99): firing two PISTOLS, reduce the two-weapon penalty by a
        // further 10 (−20→−10), and to 0 with Ambidextrous. (BUG-Q-203.)
        const isPistol = String(rollData.weapon?.system?.class ?? '').toLowerCase() === 'pistol';
        if (isPistol && actor?.hasTalent?.('Gunslinger')) {
            rollData.modifiers['attack'] = actor?.hasTalent?.('Ambidextrous') ? 0 : -10;
        }
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
        }
        if (rollData.weapon.system.rateOfFire.full <= 0) {
            actions.findSplice((action) => action.name === 'Full Auto Burst');
            // Suppressing Fire requires a weapon capable of fully automatic fire
            // (RT Core p.242).
            actions.findSplice((action) => action.name === 'Suppressing Fire');
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
                'Shoot targets coming into a set 45-degree kill zone with Standard/Semi-Auto/Full-Auto attack (specify which) at -20 BS. Targets caught in the kill zone must make a Hard (-20) Pinning test or become Pinned, even if the attack did no damage.',
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
            // RT Core p.242: a single action requiring a weapon capable of fully
            // automatic fire. Establishes a 45-degree kill zone; everyone caught in it
            // makes a Hard (-20) Pinning Test, and the firer makes a Hard (-20) BS Test
            // to see if the wild spray hits anyone.
            name: 'Suppressing Fire',
            type: ['Full'],
            subtype: ['Attack', 'Ranged'],
            description:
                'Fires a fully automatic burst into a 45 degree kill zone at -20 BS. Everyone in the kill zone must make a Hard (-20) Pinning test or become Pinned.',
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
        // Vehicle Combat Actions (Into the Storm Ch.V). Tagged `vehicle: true` and given the
        // Vehicle subtype so they are documented + filterable without entering the personal
        // weapon-attack dropdown. Movement/speed resolution (the move-then-shoot −10/−20 penalty,
        // Ram damage, crash-on-fail-by-5) is GM-adjudicated. (QA-117.)
        {
            name: 'Tactical Manoeuvring',
            type: ['Half', 'Full'],
            subtype: ['Movement', 'Vehicle'],
            vehicle: true,
            description: 'The vehicle moves its tactical speed (Half) or twice its tactical speed (Full). Shooting from the vehicle this Round suffers −10 (tactical) or −20 (twice tactical) to hit.',
        },
        {
            name: 'Evasive Manoeuvring',
            type: ['Full'],
            subtype: ['Movement', 'Vehicle'],
            vehicle: true,
            description: 'Move tactical speed and make a Challenging (+0) Drive Test; on success (and per extra DoS) impose −10 on all attacks against the vehicle until its next turn — and on its own shooting. Fail by 5+ DoF → crash.',
        },
        {
            name: 'Floor it!',
            type: ['Full'],
            subtype: ['Movement', 'Vehicle'],
            vehicle: true,
            description: 'Move twice tactical speed (one turn only) with a Difficult (−10) Drive Test; success grants +5m per DoS of extra movement. All shooting at or from the vehicle suffers −20. Walkers may not use this. Fail by 5+ DoF → crash.',
        },
        {
            name: 'Ram',
            type: ['Full'],
            subtype: ['Attack', 'Vehicle'],
            vehicle: true,
            description: 'Move at least tactical speed in a straight line and make a Challenging (+0) Drive/Pilot Test. On a hit, deal damage = the striking facing\'s AP + 1d10 (2d10 at twice tactical speed); ramming another solid object also damages your own vehicle by its AP + 1d5. Moves the target 1m per damage point.',
        },
        {
            name: 'Manoeuvre (Vehicle)',
            type: ['Half', 'Full'],
            subtype: ['Movement', 'Vehicle'],
            vehicle: true,
            description: 'A catch-all driver manoeuvre (base Challenging +0, GM modifies by complexity) — e.g. ducking a low arch or boosting a skimmer over a chasm.',
        },
    ];
}
