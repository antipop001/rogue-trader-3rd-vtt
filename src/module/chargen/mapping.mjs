/**
 * Chargen — engine-name → actor-schema key tables.
 *
 * Direct port of the validated mapping in RTT_MAKER
 * `rogue_trader/export/foundry.py` (live-import-validated against this
 * system). Engine-side names are RT 1e full names as they appear in the
 * vendored rules data; keys are template.json / rules/*.mjs conventions.
 * Do not invent new mappings here — change foundry.py first, then re-port.
 */

/** Characteristic abbreviation -> system.characteristics key. */
export const CHAR_KEY = Object.freeze({
    WS: 'weaponSkill',
    BS: 'ballisticSkill',
    S: 'strength',
    T: 'toughness',
    Ag: 'agility',
    Int: 'intelligence',
    Per: 'perception',
    WP: 'willpower',
    Fel: 'fellowship',
});

/** Non-specialist skill name -> system.skills key. */
export const SKILL_KEY = Object.freeze({
    'Awareness': 'awareness',
    'Barter': 'barter',
    'Blather': 'blather',
    'Carouse': 'carouse',
    'Charm': 'charm',
    'Chem-Use': 'chemUse',
    'Climb': 'climb',
    'Command': 'command',
    'Commerce': 'commerce',
    'Concealment': 'concealment',
    'Contortionist': 'contortionist',
    'Deceive': 'deceive',
    'Demolitions': 'demolitions',
    'Disguise': 'disguise',
    'Dodge': 'dodge',
    'Evaluate': 'evaluate',
    'Gamble': 'gamble',
    'Inquiry': 'inquiry',
    'Interrogation': 'interrogation',
    'Intimidate': 'intimidate',
    'Invocation': 'invocation',
    'Literacy': 'literacy',
    'Logic': 'logic',
    'Medicae': 'medicae',
    'Parry': 'parry',
    'Psyniscience': 'psyniscience',
    'Scrutiny': 'scrutiny',
    'Search': 'search',
    'Security': 'security',
    'Shadowing': 'shadowing',
    'Silent Move': 'silentMove',
    'Sleight of Hand': 'sleightOfHand',
    'Survival': 'survival',
    'Swim': 'swim',
    'Tech-Use': 'techUse',
    'Tracking': 'tracking',
    'Wrangling': 'wrangling',
});

/** Specialist skill base name -> system.skills key. */
export const SPECIALIST_SKILL = Object.freeze({
    'Common Lore': 'commonLore',
    'Forbidden Lore': 'forbiddenLore',
    'Scholastic Lore': 'scholasticLore',
    'Speak Language': 'speakLanguage',
    'Secret Tongue': 'secretTongue',
    'Ciphers': 'ciphers',
    'Trade': 'trade',
    'Navigation': 'navigate',
    'Navigate': 'navigate',
    'Drive': 'drive',
    'Pilot': 'pilot',
    'Performance': 'performance',
});

/**
 * Parenthetical specialty text (lowercased) -> system speciality key.
 * Flat across parents; per-parent overrides in SPECIALITY_KEY_BY_PARENT win.
 */
export const SPECIALITY_KEY = Object.freeze({
    // Common Lore
    'adeptus arbites': 'adeptusArbites',
    'adeptus astra telepathica': 'adeptusAstraTelepathica',
    'adeptus mechanicus': 'adeptusMechanicus',
    'administratum': 'administratum',
    'ecclesiarchy': 'ecclesiarchy',
    'imperial creed': 'imperialCreed',
    'imperial guard': 'imperialGuard',
    'imperial navy': 'imperialNavy',
    'imperium': 'imperium',
    'koronus expanse': 'koronusExpanse',
    'navis nobilite': 'navisNobilite',
    'rogue traders': 'rogueTraders',
    'tech': 'tech',
    'war': 'war',
    // Forbidden Lore
    'archeotech': 'archeotech',
    'daemonology': 'daemonology',
    'heresy': 'heresy',
    'the inquisition': 'theInquisition',
    'mutants': 'mutants',
    'navigators': 'navigators',
    'pirates': 'pirates',
    'psykers': 'psykers',
    'the warp': 'theWarp',
    'warp': 'theWarp',
    'xenos': 'xenos',
    // Scholastic Lore
    'archaic': 'archaic',
    'astromancy': 'astromancy',
    'beasts': 'beasts',
    'bureaucracy': 'bureaucracy',
    'chymistry': 'chymistry',
    'cryptology': 'cryptology',
    'heraldry': 'heraldry',
    'imperial warrants': 'imperialWarrants',
    'judgement': 'judgement',
    'legend': 'legend',
    'numerology': 'numerology',
    'occult': 'occult',
    'philosophy': 'philosophy',
    'tactica imperialis': 'tacticaImperialis',
    // Speak Language
    'eldar': 'eldar',
    'explorator binary': 'exploratorBinary',
    'high gothic': 'highGothic',
    'low gothic': 'lowGothic',
    'ork': 'ork',
    'techna-lingua': 'technalingua',
    "trader's cant": 'tradersCant',
    // Secret Tongue
    'military': 'military',
    'navigator': 'navigator',
    'rogue trader': 'rogueTrader',
    'underdeck': 'underdeck',
    // Ciphers
    'mercenary cant': 'mercenaryCant',
    'nobilite family': 'nobiliteFamily',
    'astropath sign': 'astropathSign',
    'underworld': 'underworld',
    // Trade
    'archaeologist': 'archaeologist',
    'armourer': 'armourer',
    'astrographer': 'astrographer',
    'chymist': 'chymist',
    'cryptographer': 'cryptographer',
    'explorator': 'explorator',
    'linguist': 'linguist',
    'remembrancer': 'remembrancer',
    'shipwright': 'shipwright',
    'soothsayer': 'soothsayer',
    'technomat': 'technomat',
    'trader': 'trader',
    'voidfarer': 'voidfarer',
    // Navigation
    'surface': 'surface',
    'stellar': 'stellar',
    // Drive
    'ground vehicle': 'groundVehicle',
    'skimmer/hover': 'skimmerHover',
    'walker': 'walker',
    // Pilot
    'flyer': 'flyer',
    'flyers': 'flyer',
    'personal': 'personal',
    'space craft': 'spaceCraft',
    'spacecraft': 'spaceCraft',
    // Performance
    'dancer': 'dancer',
    'musician': 'musician',
    'singer': 'singer',
    'storyteller': 'storyteller',
});

/**
 * Per-parent speciality overrides for specialty text that is ambiguous across
 * parents ("Warp" is `theWarp` under Forbidden Lore but `warp` under
 * Navigation). Checked before the flat SPECIALITY_KEY table.
 */
export const SPECIALITY_KEY_BY_PARENT = Object.freeze({
    navigate: { warp: 'warp', surface: 'surface', stellar: 'stellar' },
});

/** Engine skill-level string -> system advance integer. */
export const ADVANCE = Object.freeze({ 'basic': 0, 'trained': 1, '+10': 2, '+20': 3 });

/** Engine origin step key -> system bio.originPath sub-key.
 *  (warrant_and_ship has no originPath slot; it goes to bio notes.) */
export const ORIGIN_STEP = Object.freeze({
    home_world: 'homeWorld',
    birthright: 'birthright',
    lure_of_the_void: 'lureOfTheVoid',
    trials_and_travails: 'trialsAndTravails',
    motivation: 'motivation',
});

/** Engine career name -> system career key (rules/origin-path/careers.mjs). */
export const CAREER_KEY = Object.freeze({
    'Rogue Trader': 'rogueTrader',
    'Arch-militant': 'archMilitant',
    'Astropath Transcendent': 'astropathTranscendent',
    'Explorator': 'explorator',
    'Missionary': 'missionary',
    'Navigator': 'navigator',
    'Seneschal': 'seneschal',
    'Void-master': 'voidMaster',
    'Kroot Mercenary': 'krootMercenary',
    'Ork Freebooter': 'orkFreebooter',
});

const PAREN_RE = /^(.+?)\s*\(([^)]*)\)\s*$/;

/**
 * Resolve an engine skill name to its system location.
 * @returns {{key: string, speciality?: string, unresolvedSpeciality?: string}|null}
 *   null if the skill name is unknown; `speciality` when a specialist
 *   parenthetical resolved; `unresolvedSpeciality` carries the raw text when
 *   the parent matched but the speciality didn't (caller reports a gap).
 */
export function resolveSkill(name) {
    const m = PAREN_RE.exec(name);
    if (m) {
        const base = m[1].trim();
        const specText = m[2].trim().toLowerCase();
        const key = SPECIALIST_SKILL[base];
        if (!key) return SKILL_KEY[name] ? { key: SKILL_KEY[name] } : null;
        const spec = SPECIALITY_KEY_BY_PARENT[key]?.[specText] ?? SPECIALITY_KEY[specText];
        if (spec) return { key, speciality: spec };
        return { key, unresolvedSpeciality: m[2].trim() };
    }
    if (SKILL_KEY[name]) return { key: SKILL_KEY[name] };
    // A specialist skill granted without a parenthetical (rare) maps the parent.
    if (SPECIALIST_SKILL[name]) return { key: SPECIALIST_SKILL[name] };
    return null;
}
