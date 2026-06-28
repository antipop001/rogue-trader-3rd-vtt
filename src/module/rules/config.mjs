import { attackSpecialsNames } from './attack-specials.mjs';
import { homeWorldOptions } from './origin-path/homeworlds.mjs';
import { birthrightOptions } from './origin-path/birthrights.mjs';
import { lureOfTheVoidOptions } from './origin-path/lures.mjs';
import { trialsAndTravailsOptions } from './origin-path/trials.mjs';
import { motivationOptions } from './origin-path/motivations.mjs';
import { careerOptions } from './origin-path/careers.mjs';
import { shipRoleOptions } from './ship-roles.mjs';

export const DarkHeresy = {};

// Into the Storm Ch.VII Ship Roles — full role records (key, label, rank,
// careers, skills, benefit, description, source). The panel reads the full
// list, filters by selected key, and renders all the metadata.
DarkHeresy.shipRoles = shipRoleOptions();

// RT 1e Origin Path — canonical labels per stage, sourced from RT Core Rulebook
// Ch.I + Into the Storm Ch.I (additional Home Worlds + replacement options).
// Used to populate dropdowns on the Origin Path sheet panel.
DarkHeresy.originPath = {
    homeWorld: homeWorldOptions().map(o => o.label),
    birthright: birthrightOptions().map(o => o.label),
    lureOfTheVoid: lureOfTheVoidOptions().map(o => o.label),
    trialsAndTravails: trialsAndTravailsOptions().map(o => o.label),
    motivation: motivationOptions().map(o => o.label),
    career: careerOptions().map(o => o.label),
};

DarkHeresy.bio = {
    // DH2-fork primary fields hidden from the header (replaced by Origin Path).
    primary: [],
    // Skipped by the generic bio loop entirely. The DH2 fields stay in
    // template.json so existing acolyte data doesn't break, but they no longer
    // render anywhere on the sheet. 'originPath' is excluded because it has
    // its own panel.
    skip: ['originPath', 'shipRole', 'homeWorld', 'background', 'role', 'elite', 'divination'],
    size: {
        4: 'Average (4)',
        1: 'Minuscule (1)',
        2: 'Puny (2)',
        3: 'Scrawny (3)',
        5: 'Hulking (5)',
        6: 'Enormous (6)',
        7: 'Massive (7)',
        8: 'Immense (8)',
        9: 'Monumental (9)',
        10: 'Titanic (10)',
    }
};

DarkHeresy.items = {
    availability: ['Ubiquitous', 'Abundant', 'Plentiful', 'Common', 'Average', 'Scarce', 'Rare', 'Very Rare', 'Extremely Rare', 'Near Unique', 'Unique'],
    craftsmanship: ['Poor', 'Common', 'Good', 'Best'],
    vehicle_types: ['Walker', 'Wheeled', 'Tracked', 'Skimmer', 'Aircraft', 'Spacecraft']
};

DarkHeresy.combat = {
    psychic_attacks: ['Psychic Bolt', 'Psychic Blast', 'Psychic Barrage', 'Psychic Storm'],
    damage_types: ['Energy', 'Impact', 'Rending', 'Explosive'],
    action_speeds: ['N/A', 'Free Action', 'Half Action', 'Full Action', '2 Full Actions', '3 Full Actions', 'Special'],
    sustained_speeds: ['No', 'Free Action', 'Half Action', 'Full Action'],
    psychic_subtypes: ['Concentration', 'Attack', 'Attack, Concentration'],
    special: attackSpecialsNames(),
    ship_weapon_class: ['Turret', 'Broadside', 'Artillery', 'Keel', 'Special'],
    ship_weapon_size: ['Super Light', 'Light', 'Medium', 'Heavy', 'Super Heavy'],
    ship_weapon_slot: ['Dorsal', 'Prow', 'Port', 'Starboard', 'Keel', 'Special'],
    component_class: ['Essential', 'Supplemental', 'Special'],
    component_location: ['Prow', 'Main', 'Rear', 'Bridge', 'Special'],
    component_type: ['Plasma Drive', 'Main Thrusters', 'Maneuvering Thrusters', 'Warp Engine', 'Gellar Field', 'Void Shield', 'Ship`s Bridge', 'Life Sustainer',
        'Crew Quarters', 'Augur Array', 'Gravitic Array', 'Cargo Hold', 'Enhancement', 'Facility', 'Special'],
    ship_weapon_type: ['Macrocannon', 'Lance', 'Nova Cannon', 'Torpedoes', 'Launch Bays', 'Special'],
    weapon_class: ['Pistol', 'Basic', 'Heavy', 'Thrown', 'Melee'],
    weapon_type: [
        'Bolt',
        'Flame',
        'Las',
        'Launcher',
        'Low-Tech',
        'Melta',
        'Plasma',
        'Solid Projectile',
        'Exotic',
        'Grenades/Missiles',
        'Explosives',
        'Arc',
        'Galvanic',
        'Gamma',
        'Phosphor',
        'Radium',
        'Volkite',
        'Darklight',
        'Shuriken',
        'Splinter',
        'Chain',
        'Force',
        'Power',
        'Shock',
        'Taser',
        'Gauntlet',
        'Unarmed',
    ],
    armour_type: ['Basic', 'Flak', 'Mesh', 'Carapace', 'Power'],
    characteristics: {
        'weaponSkill': 'WS',
        'ballisticSkill': 'BS',
        'strength': 'S',
        'toughness': 'T',
        'agility': 'Ag',
        'intelligence': 'Int',
        'perception': 'Per',
        'willpower': 'WP',
        'fellowship': 'Fel'
    }
};

DarkHeresy.ui = {
    toggleExpanded: function (name) {
        if (DarkHeresy.ui.expanded.includes(name)) {
            const index = DarkHeresy.ui.expanded.indexOf(name);
            if (index > -1) {
                DarkHeresy.ui.expanded.splice(index, 1);
            }
        } else {
            DarkHeresy.ui.expanded.push(name);
        }
    },
    expanded: [],
};

export function toggleUIExpanded(name) {
    CONFIG.rt.ui.toggleExpanded(name);
}

export function fieldMatch(val1, val2) {
    let one = val1.replace(/\s/g, '');
    let two = val2.replace(/\s/g, '');
    return one.toUpperCase() === two.toUpperCase();
}
