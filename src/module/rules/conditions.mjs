// RT 1e condition / status-effect layer (QA-080).
//
// Registers RT conditions as Foundry status effects so they are clickable on the token
// HUD, tracked on the actor (`actor.statuses`), and readable by the combat engine. This
// module is the FOUNDATION: the read side (a target's condition feeds the to-hit test) is
// wired here; applying conditions from combat outcomes (Stun → Stunned, Knock Down →
// Prone, Concussive → Stunned, Flame → On Fire) and recurring On-Fire / Blood-Loss damage
// are subsequent increments.

/** The RT condition set, in Foundry `CONFIG.statusEffects` shape ({id, name, img}). */
export const RT_CONDITIONS = [
    { id: 'stunned', name: 'Stunned', img: 'icons/svg/daze.svg' },
    { id: 'prone', name: 'Prone', img: 'icons/svg/falling.svg' },
    { id: 'pinned', name: 'Pinned', img: 'icons/svg/net.svg' },
    { id: 'blinded', name: 'Blinded', img: 'icons/svg/blind.svg' },
    { id: 'deafened', name: 'Deafened', img: 'icons/svg/deaf.svg' },
    { id: 'onFire', name: 'On Fire', img: 'icons/svg/fire.svg' },
    { id: 'bloodLoss', name: 'Blood Loss', img: 'icons/svg/blood.svg' },
    { id: 'unconscious', name: 'Unconscious', img: 'icons/svg/unconscious.svg' },
    { id: 'helpless', name: 'Helpless', img: 'icons/svg/paralysis.svg' },
    { id: 'unaware', name: 'Unaware', img: 'icons/svg/invisible.svg' },
];

/**
 * The to-hit modifier for attacking a target in a given condition (RT Core).
 *  - Unaware / Helpless → Easy, +30 (p.246)
 *  - Stunned → Routine, +20 (p.~2070: "cannot take Actions or Reactions"; easier to hit)
 *  - Prone → easier in melee (+10), harder at range (−10)
 * Stunned and Unaware don't stack (take the larger "easier to hit" step); Prone adds on top.
 * @param {Iterable<string>|Set<string>} statuses  the target's active status ids
 * @param {boolean} isMelee  whether the attack is melee
 * @returns {number} the WS/BS to-hit modifier
 */
export function conditionToHitModifier(statuses, isMelee = false) {
    const s = statuses instanceof Set ? statuses : new Set(Array.from(statuses ?? []));
    let mod = 0;
    if (s.has('unaware') || s.has('helpless')) mod += 30;
    else if (s.has('stunned')) mod += 20;
    if (s.has('prone')) mod += isMelee ? 10 : -10;
    return mod;
}
