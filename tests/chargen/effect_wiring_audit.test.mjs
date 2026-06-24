// Effect-wiring audit RATCHET (copy to tests/chargen/ at launch).
//
// Backpressure for the effect-wiring loop: validates the SHAPE of every
// ActiveEffect / conditionalBonus the loop authors (a malformed AE here = red gate),
// and asserts each entry the loop claims to have wired actually carries wiring.
//
// As the loop wires an entry it adds the name to WIRED_EXPECTED (with `kind`), or to
// CODE_HANDLED / NARRATIVE when the entry is intentionally NOT given an AE. The lists
// only grow — they encode progress and make regressions a red gate. Correctness of
// the VALUE (and that it reaches the live roll) is canon review + E2E, not this test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PACKS = ['talents', 'traits', 'cybernetics'];

// --- RATCHET LISTS (the loop appends; never remove) -------------------------
// Entries the loop has wired with an AE ('ae') or a conditionalBonus ('cond').
const WIRED_EXPECTED = [
    { name: 'Paranoia', kind: 'ae' },
    { name: 'Heightened Senses (Sight)', kind: 'cond' },
    { name: 'Heightened Senses (Smell)', kind: 'cond' },
    { name: 'Heightened Senses (Sound)', kind: 'cond' },
    { name: 'Heightened Senses (Taste)', kind: 'cond' },
    { name: 'Heightened Senses (Touch)', kind: 'cond' },
    { name: 'Fieldcraft', kind: 'ae' },
    { name: 'Multiple Arms', kind: 'ae' },
    { name: 'Renowned Warrant', kind: 'cond' },
    { name: 'Whispers', kind: 'cond' },
    { name: 'Inspire Wrath', kind: 'cond' },
    { name: 'Decadence', kind: 'cond' },
    { name: 'Electro Graft Use', kind: 'cond' },
    { name: 'Foresight', kind: 'cond' },
    { name: 'Sturdy', kind: 'cond' },
    { name: 'Wary', kind: 'ae' },
    // AUDIT-003 cybernetics (WIRE-CYBER-AE) — always-on AE on Common-baseline bonuses
    { name: 'Calculus Logi Upgrade', kind: 'ae' },
    { name: 'Optical Mechadendrite', kind: 'ae' },
    { name: 'Medicae Mechadendrite', kind: 'ae' },
    { name: 'Scribe-Tines', kind: 'ae' },
    { name: 'Utility Mechadendrite', kind: 'ae' },
    // AUDIT-003 cybernetics (WIRE-CYBER-COND) — situational conditionalBonuses
    { name: 'Bionic Respiratory System', kind: 'cond' },
    { name: 'Manipulator Mechadendrite', kind: 'cond' },
    { name: 'Mind Impulse Unit (miu)', kind: 'cond' },
    // Optical Mechadendrite carries the always-on +10 Per AE (above) AND a +20
    // night-vision conditionalBonus wired here.
    { name: 'Optical Mechadendrite', kind: 'cond' },
    // ENGINE-WOUNDS-MOD — additive system.wounds.modifier term (mirror of Initiative).
    // Sound Constitution "+1 Wound" (stackable) via an AE on system.wounds.modifier.
    { name: 'Sound Constitution', kind: 'ae' },
    // WIRE-SIXTH-SENSE — Sixth Sense (trait, ItS p.11) grants Psyniscience as a Trained
    // Skill via an AE (UPGRADE system.skills.psyniscience.advance → 1) AND grants Rival
    // (Inquisition) via flags.rt.grants (listed in GRANTS_EXPECTED below).
    { name: 'Sixth Sense', kind: 'ae' },
];
// Already applied by name in src/module/rolls/* (or documents/acolyte.mjs) — must NOT
// also be AE'd. Lightning Reflexes is computed in acolyte.mjs (Initiative ×AgB term)
// because an AE can't read the Agility Bonus; double-applying via AE is the risk.
const CODE_HANDLED = [
    'Crushing Blow', 'Mighty Shot', 'Blademaster', 'Eye of Vengeance',
    'Hammer Blow', 'Concussive', 'True Grit', 'Deathdealer',
    'Lightning Reflexes',
    // Crit-gated extra Damage applied by name in damage-data/assign-damage-data
    // (must NOT also get an AE — would double-apply). RT Core p.96.
    'Crack Shot', 'Crippling Strike',
    // Charge-gated +3 melee Damage applied by trait name in damage-data.mjs (Brutal
    // Charge, RT Core p.364) — engine-applied, must NOT also get an AE.
    'Brutal Charge',
    // Per-Round Reaction budget computed by talent name in acolyte._computeCharacteristics
    // (reactionBudget → system.combat.reactions.{dodge,parry}.max). RT Core p.119/121 —
    // engine-applied, must NOT also get an AE. ENGINE-REACTION-BUDGET.
    'Step Aside', 'Wall of Steel',
    // Outcome-gated extra-ATTACK triggers, eligibility computed by talent name in
    // roll-helpers.extraAttackEligibility (Counter Attack p.115, Furious Assault p.117,
    // WAAAGH! ItS p.173) — engine-applied, must NOT also get an AE. ENGINE-REACTION-ATTACK-TRIG.
    'Counter Attack', 'Furious Assault', 'WAAAGH!',
    // Melee multi-attack talents — flat extra-hit count applied by action name in
    // action-data (attackTalentExtraHits: Swift +1, Lightning +2) and surfaced as
    // Full-Action melee options by talent name in combat-actions. RT Core p.107/p.102 —
    // engine-applied, must NOT also get an AE. ENGINE-ATTACK-TALENTS.
    'Swift Attack', 'Lightning Attack',
    // Movement Agility-Bonus multiplier computed by trait name in
    // base-actor._computeMovement (quadrupedMoveMultiplier: ×2 base / ×3 six legs /
    // ×4 eight legs). RT Core p.366 — engine-applied (scales the derived AgB an AE
    // can't read), must NOT also get an AE. ENGINE-UNNATURAL (Quadruped slice).
    'Quadruped',
    // Unnatural Characteristic multiplier derived by trait name in
    // acolyte._computeCharacteristics (unnaturalCharacteristicMultipliers → SET-when-unset
    // on system.characteristics.<k>.unnatural; doubles the Characteristic Bonus). RT Core
    // p.368 — engine-applied (multiplies the derived bonus an AE can't express), must NOT
    // also get an AE. ENGINE-UNNATURAL-CHARS.
    'Unnatural Toughness (x2)',
    // Daemonic doubles the target's Toughness Bonus when soaking damage — applied by
    // trait name in assign-damage-data.update (daemonicToughnessMultiplier ×2 on the
    // per-location TB). RT Core p.364 — engine-applied (scales a per-hit soak an AE
    // can't express), must NOT also get an AE. ENGINE-UNNATURAL-DAMAGE.
    'Daemonic',
    // Bastion of Iron Will doubles the defender's defensive Psy Rating on an Opposed
    // Test (Psyniscience / Psychic Techniques) — multiplier via bastionPsyMultiplier;
    // engine-applied by name (NOT an AE). The opposed-resist apply point itself is the
    // Foundry-coupled follow-up. RT Core p.94. ENGINE-UNNATURAL-DAMAGE.
    'Bastion of Iron Will',
    // Rapid Reload halves a weapon's reload time — applied by talent name in
    // acolyte._computeWeaponReload (rapidReloadTime → derived system.effectiveReload on
    // owned ranged weapons). RT Core p.110 — engine-applied (rewrites a free-text field
    // an AE can't address), must NOT also get an AE. ENGINE-RAPID-RELOAD.
    'Rapid Reload',
];
// ENGINE-TRAIT-GRANTS — entries that GRANT other compendium items via `flags.rt.grants`
// (auto-embedded on the actor by hooks-manager.applyItemGrants). This is a third wiring
// kind (neither AE nor conditionalBonus): the granting entry carries metadata, the
// granted items carry their own effects. Validated below: each granting entry has a
// well-formed grants array AND every granted {name,type} resolves to a real pack doc.
const GRANTS_EXPECTED = [
    'Explorator Implants', // → Mechanicus Implants (RT Core)
    'The Flesh is Weak',   // → Machine (RT Core)
    'Physical Perfection', // → Machine (ItS p.199)
    "'Ard",                // → Unnatural Toughness (x2) + Sturdy + Iron Jaw + True Grit (ItS)
    'Sixth Sense',         // → Rival (Inquisition), a pre-chosen pickable grant (ItS p.11)
    // WIRE-CYBER-GRANTS — cybernetics that grant a Talent (reuse flags.rt.grants).
    'Bionic Heart',        // → Sprint (RT Core p.133)
    'Memorance Implant',   // → Total Recall (RT Core p.133)
    'Vitae Supplacement',  // → Autosanguine (ItS p.142)
    'Blackbone Bracing',   // → Bulging Biceps + Iron Jaw (ItS p.142; +2 unarmed dmg → ENGINE-NATWEAPONS)
];
// Intentionally text-only (narrative / per-DoS / PF / GM-adjudicated). These describe
// a mechanic the system deliberately does NOT express as an AE/conditionalBonus
// (activated buff, per-DoS, PF/Endeavour flavor, immunity, ally-targeted, positional).
// Guarded below: a NARRATIVE entry must NOT carry wiring (catches a wrong later AE).
const NARRATIVE = [
    // AUDIT-001 (first-pass +N sweep) — see loops/effects-audit/triage.md
    // talents
    'Ancestral Blessing', 'Binary Chatter', 'Blood of the Stalker', 'Bloodtracker',
    'Concealed Cavity', 'Dual Shot', 'Dual Strike', 'Electrical Succour',
    'Exceptional Leader', 'Hard Bargain', 'Hyperactive Nymune Organ',
    'Into the Jaws of Hell', 'Last Man Standing', 'Luminen Charge', 'Luminen Shock',
    'Master & Commander', 'Master Enginseer', 'Mimic', 'Psy Rating', 'Warp Conduit',
    // traits
    "'Ard", 'Dynastic Warrant', 'Incorporeal', 'Instinctual Understanding',
    'Mechanicus Implants', 'Mob Rule',
    // AUDIT-002 (non-`+N` sweep) — see loops/effects-audit/triage.md AUDIT-002
    // talents
    'Blessed Radiance', 'Bulging Biceps', 'Da Nekst Best Fing', 'Dark Soul',
    "Ded 'Ard", 'Ded Sneaky', 'Die Hard', 'Duty Unto Death', 'Favoured by the Warp',
    'Fearless', 'Give it Sum Dakka!', 'Greed is Good', 'Hardy', 'Improved Warp Sense',
    'Iron Jaw', 'Jaded', 'Kroot Leap', 'Legendary', 'Light Sleeper', 'Master Orator',
    'Mercenary', 'More fer Me!', 'Nerves of Steel', 'Polyglot', 'Prophetic Dreams',
    'Prosanguine', 'Rapid Reaction', 'Sharpshooter', 'Sprint', 'Strong Minded',
    'Survival Master', 'Takedown', 'Unshakeable Faith', 'Warp Affinity',
    'Watchful For Betrayal', 'See Without Eyes', 'Blind Fighting',
    // traits
    'Auto-Stabilised', 'Blind', 'Dark Sight', 'From Beyond', 'Phase', 'Regeneration',
    'Strange Physiology', 'The Stuff of Nightmares', 'Toxic', 'Warp Weapon',
    // AUDIT-003 cybernetics (NARRATIVE-RECORD-CYBER) — intentionally text-only:
    // weapons (item-like), immunities, comms/info utilities, duration extensions, and
    // craftsmanship-gated bonuses whose Common baseline grants no standing bonus. See
    // loops/effects-audit/triage.md AUDIT-003. (The talent-grant / SB / unarmed / ×2
    // cybernetics extend ENGINE-TRAIT-GRANTS / ENGINE-UNNATURAL / ENGINE-NATWEAPONS.)
    'Cybernetic Senses', 'Bionic Arm', 'Bionic Locomotion (legs, Hips, Pelvis, Etc.)',
    'Auger Arrays', 'Baleful Eye', 'Ballistic Mechadendrite', 'Miu Weapon Interface',
    'Internal Blade', 'Internal Power Cell', 'Locator Matrix',
    'Respiratory Filter Implant', 'Gastral Bionics', 'Pain Ward', 'Voidskin',
    'Volitor Implant', 'Vox Implant', 'Implant Systems',
    // WIRE-CYBER-GRANTS — Augmented Senses grants "Heightened Senses for any one
    // sense (sight, smell, etc.)" — a player choice among 5 distinct fixed pack docs
    // (no pickable base). The clean name+type grant can't express "pick one of 5", so
    // it stays narrative (player drags the chosen Heightened Senses talent). RT Core p.133.
    'Augmented Senses',
    // ENGINE-WOUNDS-MOD — Eaters of the Dead (Kroot, ItS p.142) grants bonus Wounds
    // equal to a devoured corpse's unmodified Toughness Bonus, capped at the Kroot's own
    // TB and lasting TB hours, removed first when damaged. A timed/conditional/TB-derived
    // activated effect — a static AE would wrongly grant permanent Wounds. Needs the
    // activated-consumable engine (ENGINE-CONSUMABLE-ACTIVATE), not a standing bonus.
    'Eaters of the Dead',
];
// ----------------------------------------------------------------------------

function docsOf(pack) {
    const docs = yaml.loadAll(readFileSync(path.join(ROOT, `src/packs/${pack}/${pack}.yml`), 'utf8'));
    return docs.filter((d) => d && typeof d === 'object' && d.name);
}
const ALL = PACKS.flatMap(docsOf);
const byName = new Map(ALL.map((d) => [d.name, d]));

function aeChangeOk(c) {
    return c && typeof c.key === 'string' && c.key.startsWith('system.')
        && Number.isInteger(c.mode) && c.mode >= 0 && c.mode <= 5
        && typeof c.value === 'string';
}
function validateEffects(d, hard) {
    const issues = [];
    for (const e of d.effects ?? []) {
        if (e._id != null && !/^[A-Za-z0-9]{16}$/.test(e._id)) issues.push(`${d.name}: effect _id not 16-char alnum`);
        if (!Array.isArray(e.changes)) { issues.push(`${d.name}: effect.changes not an array`); continue; }
        for (const c of e.changes) if (!aeChangeOk(c)) issues.push(`${d.name}: bad AE change ${JSON.stringify(c)}`);
    }
    const cbs = d.flags?.rt?.conditionalBonuses;
    if (cbs !== undefined) {
        if (!Array.isArray(cbs)) issues.push(`${d.name}: conditionalBonuses not an array`);
        else for (const b of cbs) {
            if (!b.applies || !Array.isArray(b.applies.skills) || !Array.isArray(b.applies.characteristics))
                issues.push(`${d.name}: conditionalBonus.applies malformed`);
            if (typeof b.value !== 'number') issues.push(`${d.name}: conditionalBonus.value not a number`);
        }
    }
    return issues;
}

test('every entry this loop wired actually carries valid wiring', () => {
    for (const { name, kind } of WIRED_EXPECTED) {
        const d = byName.get(name);
        assert.ok(d, `WIRED_EXPECTED "${name}" not found in any pack`);
        const hasAe = (d.effects ?? []).length > 0;
        const hasCond = (d.flags?.rt?.conditionalBonuses ?? []).length > 0;
        assert.ok(hasAe || hasCond, `"${name}" claimed wired but has no effects/conditionalBonuses`);
        if (kind === 'ae') assert.ok(hasAe, `"${name}" expected an ActiveEffect`);
        if (kind === 'cond') assert.ok(hasCond, `"${name}" expected a conditionalBonus`);
        const issues = validateEffects(d, true);
        assert.equal(issues.length, 0, issues.join('\n'));
    }
});

test('no code-handled talent was given an AE/conditionalBonus (double-apply guard)', () => {
    for (const name of CODE_HANDLED) {
        const d = byName.get(name);
        if (!d) continue;
        const hasAe = (d.effects ?? []).length > 0;
        const hasCond = (d.flags?.rt?.conditionalBonuses ?? []).length > 0;
        assert.ok(!hasAe && !hasCond, `code-handled "${name}" must not also be wired (double-apply risk)`);
    }
});

test('every entry that grants items has a well-formed grants array resolving to real pack docs', () => {
    for (const name of GRANTS_EXPECTED) {
        const d = byName.get(name);
        assert.ok(d, `GRANTS_EXPECTED "${name}" not found in any pack`);
        const grants = d.flags?.rt?.grants;
        assert.ok(Array.isArray(grants) && grants.length > 0, `"${name}" has no flags.rt.grants array`);
        for (const g of grants) {
            assert.ok(g && typeof g.name === 'string' && typeof g.type === 'string',
                `"${name}" grant malformed: ${JSON.stringify(g)}`);
            const target = byName.get(g.name);
            assert.ok(target, `"${name}" grants "${g.name}" which is not in any pack`);
            assert.equal(target.type, g.type,
                `"${name}" grants "${g.name}" as type ${g.type} but pack doc is ${target.type}`);
        }
    }
});

test('narrative (intentionally text-only) entries carry no wiring', () => {
    for (const name of NARRATIVE) {
        const d = byName.get(name);
        assert.ok(d, `NARRATIVE "${name}" not found in any pack`);
        const hasAe = (d.effects ?? []).length > 0;
        const hasCond = (d.flags?.rt?.conditionalBonuses ?? []).length > 0;
        assert.ok(!hasAe && !hasCond, `narrative "${name}" must stay text-only (no AE/conditionalBonus)`);
    }
});

test('all pack effects/conditionalBonuses are well-formed (soft — warns)', () => {
    const all = ALL.flatMap((d) => validateEffects(d, false));
    if (all.length) console.log(`effect-shape warnings (${all.length}):\n  ` + all.join('\n  '));
});
