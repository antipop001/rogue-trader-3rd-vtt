/**
 * Chargen rules-data loader.
 *
 * The origin-path rules data is vendored from the RTT_MAKER character builder
 * (see tools/sync_chargen_data.py) as JSON under module/chargen/data/. Each
 * file is `{_meta: {...}, options: [...]}` with declarative effects and
 * source/page provenance.
 */

const DATA_ROOT = 'systems/rogue-trader-3rd/module/chargen/data';

/** Origin-path step keys, in chart order, mapped to their data file. */
export const STEP_FILES = {
    home_world: 'home_worlds.json',
    birthright: 'birthrights.json',
    lure_of_the_void: 'lure_of_the_void.json',
    trials_and_travails: 'trials_and_travails.json',
    motivation: 'motivations.json',
    warrant_and_ship: 'warrant_and_ship.json',
    species: 'species.json',
};

const cache = new Map();

/**
 * Fetch (once) and return the parsed data file for an origin step.
 * @param {string} step  a key of STEP_FILES, e.g. 'home_world'
 * @returns {Promise<object>} the parsed JSON ({_meta, options})
 */
export async function loadStep(step) {
    const file = STEP_FILES[step];
    if (!file) throw new Error(`chargen: unknown data step '${step}'`);
    if (!cache.has(step)) {
        cache.set(step, fetch(`${DATA_ROOT}/${file}`).then((r) => {
            if (!r.ok) throw new Error(`chargen: failed to load ${file} (${r.status})`);
            return r.json();
        }));
    }
    return cache.get(step);
}
