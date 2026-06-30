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
    { id: 'grappled', name: 'Grappled', img: 'icons/svg/net.svg' },
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
    if (s.has('unaware') || isHelplessTarget(s)) mod += 30;
    else if (s.has('stunned')) mod += 20;
    if (s.has('prone')) mod += isMelee ? 10 : -10;
    return mod;
}

/**
 * Whether a target counts as helpless for combat purposes. RT Core p.248 defines automatic
 * hits / coup-de-grace against "a sleeping, unconscious or otherwise helpless target"; p.250
 * (CoreBook-201-401.pdf/markdown.md:2948) confirms "An unconscious character ... is also
 * treated as a helpless target (see page 248)." The system models `unconscious` as a status
 * distinct from `helpless`, so both must be checked. (BUG-Q-220.)
 * @param {Iterable<string>|Set<string>} statuses  the target's active status ids
 * @returns {boolean}
 */
export function isHelplessTarget(statuses) {
    const s = statuses instanceof Set ? statuses : new Set(Array.from(statuses ?? []));
    return s.has('helpless') || s.has('unconscious');
}

/**
 * The to-hit penalty a SHOOTER suffers for their OWN conditions (distinct from
 * {@link conditionToHitModifier}, which reads the target's). A Pinned character suffers
 * −20 to all Ballistic Skill Tests (RT Core p.248). Melee (WS) attacks are unaffected.
 * @param {Iterable<string>|Set<string>} statuses  the attacker's active status ids
 * @param {boolean} isRanged  whether the attack is a Ballistic Skill (ranged) test
 * @returns {number} the BS to-hit penalty (0 or −20)
 */
export function attackerConditionModifier(statuses, isRanged = false) {
    const s = statuses instanceof Set ? statuses : new Set(Array.from(statuses ?? []));
    let mod = 0;
    if (isRanged && s.has('pinned')) mod -= 20;
    return mod;
}

/**
 * Whether a Weapon Skill (melee) Test to hit automatically succeeds because the target is
 * helpless. RT Core p.248: "Weapon Skill Tests made to hit a sleeping, unconscious or
 * otherwise helpless target automatically succeed." Ranged (BS) shots do NOT auto-hit — they
 * only gain the +30 condition modifier from {@link conditionToHitModifier}. Counts both the
 * `helpless` and `unconscious` statuses (an unconscious target is "treated as a helpless
 * target", RT Core p.250), staying in lockstep with the coup-de-grace damage doubling
 * (damage-data.mjs). (BUG-Q-220.)
 * @param {boolean} isMelee  whether the attack is a Weapon Skill (melee) test
 * @param {Iterable<string>|Set<string>} statuses  the target's active status ids
 * @returns {boolean}
 */
export function meleeAutoHitsHelpless(isMelee, statuses) {
    if (!isMelee) return false;
    return isHelplessTarget(statuses);
}

/** Conditions that forbid spending Reactions (Dodge/Parry) entirely (RT Core p.244, 247). */
const REACTION_LOCKING = new Set(['stunned', 'helpless', 'unconscious']);

/**
 * Whether a creature in these conditions may take Reactions. A Stunned, Helpless, or
 * Unconscious creature "can take no Actions or Reactions" — so Dodge/Parry are unavailable
 * regardless of the Reaction budget. (QA-080 increment 4.)
 * @param {Iterable<string>|Set<string>} statuses  the actor's active status ids
 * @returns {boolean} true if Reactions are locked out
 */
export function reactionsLocked(statuses) {
    const s = statuses instanceof Set ? statuses : new Set(Array.from(statuses ?? []));
    for (const id of REACTION_LOCKING) if (s.has(id)) return true;
    return false;
}

/**
 * Look up a condition's display metadata ({id, name, img}) by id — used to build the
 * "Apply: <name>" buttons attached to a combat outcome. Returns null for unknown ids.
 * @param {string} id  a condition id (e.g. 'prone', 'stunned', 'onFire')
 * @returns {{id: string, name: string, img: string}|null}
 */
export function conditionMeta(id) {
    return RT_CONDITIONS.find((c) => c.id === id) ?? null;
}

/** Condition-id → matcher for scanning Critical-effect prose. Order = RT_CONDITIONS order. */
const CRIT_TEXT_MATCHERS = [
    ['stunned', /\bstunned\b/i],
    ['prone', /\bprone\b/i],                                   // "knocked Prone", "falls Prone"
    ['blinded', /\bblinded\b/i],
    ['deafened', /\bdeafened\b/i],
    ['onFire', /catches fire|on fire|set (?:on fire|ablaze)|bursts into flame/i],
    ['bloodLoss', /\bblood loss\b/i],
    ['unconscious', /\bunconscious\b/i],
    ['helpless', /\bhelpless\b/i],
];

/**
 * Scan a Critical-Hit effect description for the conditions it inflicts, returning the
 * matching condition ids. Critical effects are DETERMINISTIC (no test to pass), so the
 * caller auto-applies these to the target — unlike the test-gated weapon-special outcomes,
 * which surface a button instead. Keyword-anchored to the phrasings in the RT crit tables
 * (`critical-damage.mjs`). Durations (e.g. "Stunned for 1d10 rounds") are NOT modelled —
 * the persistent status is applied and the GM clears it via the token HUD. (QA-080 inc.2.)
 * @param {string} text  a Critical-Hit effect description
 * @returns {string[]} unique condition ids found, in RT_CONDITIONS order
 */
export function conditionsFromCriticalText(text) {
    if (!text || typeof text !== 'string') return [];
    const found = [];
    for (const [id, re] of CRIT_TEXT_MATCHERS) {
        if (re.test(text)) found.push(id);
    }
    return found;
}
