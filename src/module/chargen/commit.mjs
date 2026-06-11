/**
 * Chargen — commit a ChargenState onto an acolyte Actor.
 *
 * Stage A scope: characteristics (proper base/modifier split — the rolled
 * base goes to `.base`, origin modifiers sum into `.modifier`), actor name,
 * and the full serialized state into `flags.rt.chargen` (resume + audit).
 * Stage B extends this with skills/talents/traits/origin-path/wounds/fate.
 *
 * This module touches Foundry document APIs (Actor.create / actor.update) —
 * keep it out of the pure-engine modules' import graph.
 */

import { CHAR_KEY } from './mapping.mjs';
import { ABBRS } from './characteristics.mjs';

/** Build the `system` + top-level update data for an actor from the state. */
export function buildActorData(state) {
    const system = { characteristics: {} };
    for (const abbr of ABBRS) {
        const key = CHAR_KEY[abbr];
        let modifier = 0;
        for (const m of state.modifiers) if (m.char === abbr) modifier += m.amount;
        system.characteristics[key] = {
            base: state.characteristics.base[abbr] ?? 0,
            modifier,
        };
    }
    return {
        name: state.name || 'New Explorer',
        system,
        flags: { rt: { chargen: state.toJSON() } },
    };
}

/** True if the actor already has non-default characteristic bases. */
export function hasExistingCharacteristics(actor) {
    return Object.values(actor.system.characteristics ?? {})
        .some((c) => (c?.base ?? 0) !== 0);
}

/** Create a new acolyte from the state. Returns the created Actor. */
export async function createActor(state) {
    const data = buildActorData(state);
    return Actor.create({ ...data, type: 'acolyte' });
}

/** Apply the state to an existing acolyte. Caller confirms overwrite first. */
export async function applyToActor(actor, state) {
    const data = buildActorData(state);
    await actor.update(data);
    return actor;
}
