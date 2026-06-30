import { PsychicRollData, RollData, WeaponRollData } from './roll-data.mjs';
import { Hit, PsychicDamageData, scatterDirection, WeaponDamageData } from './damage-data.mjs';
import { astropathPerilsResult, attackTalentExtraHits, degreesOfSuccess, degreesOfFailure, getOpposedDegrees, isPsychicDoubles, roll1d100, sendActionDataToChat, stunDefenceBonus, uuid, voidshipWeaponHits, voidshipHullDamage } from './roll-helpers.mjs';
import { refundAmmo, useAmmo } from '../rules/ammo.mjs';
import { DHBasicActionManager } from '../actions/basic-action-manager.mjs';
import { conditionMeta } from '../rules/conditions.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { RogueTraderSettings } from '../rogue-trader-settings.mjs';

/**
 * Roll the named RollTable from the system's `tables` compendium and return
 * the result text. Returns null if the table or compendium can't be located.
 */
async function drawFromTable(tableName, modifier = 0, forcedTotal = null) {
    try {
        const pack = game.packs.get(`${SYSTEM_ID}.tables`);
        if (!pack) return null;
        const index = pack.index?.size ? pack.index : await pack.getIndex();
        const entry = index.find(e => e.name === tableName);
        if (!entry) return null;
        const table = await pack.getDocument(entry._id);
        if (!table) return null;
        // A positive modifier pushes the d100 toward the higher (more dangerous) rows — RT's
        // Push / Sustaining modifiers to the Psychic Phenomena roll (QA-039). A forcedTotal
        // resolves the table for a pre-computed value (the Astropath Transcendent's extra-d10
        // Perils result, BUG-Q-215) instead of rolling a fresh d100.
        const draw = forcedTotal != null
            ? await table.roll({ roll: new Roll(String(forcedTotal)) })
            : modifier ? await table.roll({ roll: new Roll(`1d100 + ${modifier}`) }) : await table.roll();
        const results = draw?.results ?? [];
        return results.map(r => r.text ?? r.description ?? '').filter(Boolean).join(' ');
    } catch (err) {
        console.warn(`[rt] drawFromTable("${tableName}") failed:`, err);
        return null;
    }
}

export class ActionData {
    id = uuid();
    template = '';
    hasDamage = false;
    rollData;
    damageData;
    effects = [];
    effectOutput = [];

    reset() {
        this.effects = [];
        this.effectOutput = [];
        this.damageData.reset();
        this.rollData.reset();
    }

    async checkForPerils() {
        if (!this.rollData.power) return;
        // Navigators never roll for Psychic Phenomena or Perils of the Warp (RT Core p.180).
        // Their powers are a separate discipline that doesn't draw on the same warp channel. (QA-041.)
        if (/navigator/i.test(this.rollData.power.system?.discipline ?? '')) return;
        const baseRating = this.rollData.sourceActor.psy.rating ?? 0;
        const currentRating = this.rollData.sourceActor.psy.currentRating ?? baseRating;
        const pr = this.rollData.pr ?? 0;
        const isDoubles = isPsychicDoubles(this.rollData.roll.total);
        const strength = this.rollData.strength ?? 'unfettered';

        // RT 1e: Fettered never triggers Psychic Phenomena.
        if (strength === 'fettered') return;

        let triggerPhenomena = false;
        let label = '';
        if (strength === 'push') {
            // Push (RT Core p.157 Table 6-1): ALWAYS rolls Psychic Phenomena, doubles or
            // not. There is no "Push + doubles → Perils" rule — that was a DH2 leftover.
            // Perils is reached only via a 75+ Phenomena result, escalated below. (QA-038.)
            triggerPhenomena = true;
            label = 'Push';
        } else if (isDoubles) {
            // Unfettered (pr === rating): Phenomena on doubles.
            triggerPhenomena = true;
            label = 'Unfettered';
        }

        if (triggerPhenomena) {
            // Push makes the Phenomena roll progressively more dangerous (RT Core p.157 Table
            // 6-1): +5 per rating pushed for a Sanctioned psyker, +10 for a Renegade/Unsanctioned
            // one. Sustaining other powers adds a further +10. The harder you Push, the worse the
            // expected result. (QA-039.)
            let phenomBonus = 0;
            if (strength === 'push') {
                // Calculate push amount based on current effective rating (QA-151 compliance)
                const pushed = pr - currentRating;
                const psyClass = String(this.rollData.sourceActor.system?.psy?.class ?? '').toLowerCase();
                const renegade = psyClass === 'unsanctioned' || psyClass === 'unbound' || psyClass === 'renegade';
                phenomBonus += pushed * (renegade ? 10 : 5);
            }
            const sustained = Number(this.rollData.sourceActor.system?.psy?.sustained ?? 0);
            if (sustained > 0) phenomBonus += 10;
            const phenom = await drawFromTable('Psychic Phenomena', phenomBonus);
            const text = phenom ? `The warp convulses with energy! ${phenom}` : 'The warp convulses with energy! — roll Psychic Phenomena manually.';
            const modNote = phenomBonus ? ` [+${phenomBonus} to the roll]` : '';
            this.addEffect('Psychic Phenomena', text + (label ? ` (${label})` : '') + modNote);
            // A 75+ Psychic Phenomena result escalates to Perils of the Warp (RT Core
            // p.157 — the 75+ row says "roll on Table 6-3 instead").
            if (phenom && /perils of the warp/i.test(phenom)) {
                // An Astropath Transcendent (Soul-Bound to the Emperor) rolls an extra d10 on
                // the Perils table and discards one die for a more favourable result (RT Core
                // p.159) — resolve the chosen percentile rather than a raw 1d100. (BUG-Q-215.)
                if (this.rollData.sourceActor?.hasTalent?.('Soul-Bound to the Emperor')) {
                    const d10 = async () => { const r = new Roll('1d10'); await r.evaluate(); return r.total % 10; };
                    const total = astropathPerilsResult(await d10(), await d10(), await d10());
                    const perils = await drawFromTable('Perils of the Warp', 0, total);
                    if (perils) this.addEffect('Perils of the Warp', `The Perils of the Warp claim the psyker — soul-bound, he rolls an extra d10 and discards one for a more favourable result! ${perils}`);
                } else {
                    const perils = await drawFromTable('Perils of the Warp');
                    if (perils) this.addEffect('Perils of the Warp', `The Perils of the Warp claim the psyker! ${perils}`);
                }
            }
        }
    }

    async checkForOpposed() {
        // Psychic powers resolve their opposed test via the prompted "Roll Opposed"
        // button (BUG-007) — skip the silent auto-roll here so it isn't done twice.
        if(this.rollData.isOpposed && this.rollData.targetActor && !this.rollData.power) {
            const rollCheck = await this.rollData.targetActor.rollCheck(this.rollData.opposedTarget);
            this.rollData.opposedRoll = rollCheck.roll;
            this.rollData.opposedDos = rollCheck.dos;
            this.rollData.opposedDof = rollCheck.dof;
            this.rollData.opposedSuccess = rollCheck.success;
            if(rollCheck.success) {
                // Opposed test (RT Core p.23): the higher Degrees of Success wins; a TIE is
                // broken by the higher governing Characteristic, NOT auto-awarded to the
                // defender. The defender beats the attacker only with strictly more DoS, or on
                // an equal-DoS tie when its Characteristic (opposedTarget) is higher. (QA-106.)
                const tieToDefender = this.rollData.opposedDos === this.rollData.dos
                    && (this.rollData.opposedTarget ?? 0) > (this.rollData.modifiedTarget ?? 0);
                if(this.rollData.opposedDos > this.rollData.dos || tieToDefender) {
                    this.rollData.success = false;
                }
            }
        }

        if (this.rollData.isFeint) {
            if(!this.rollData.success) {
                this.addEffect('Feint', `The character fails to feint against the target!`);
            } else {
                if (this.rollData.targetActor) {
                    this.addEffect('Feint', `The next melee Standard Attack action against that same target during this turn cannot be Evaded!`);
                } else {
                    this.addEffect('Feint', `Compare to targets Weapon Skill check. If the character wins, his next melee Standard Attack action against that same target during this turn cannot be Evaded.`);
                }
            }
        }

        if (this.rollData.isKnockDown) {
            if(this.rollData.targetActor) {
                const opposedDegrees = getOpposedDegrees(this.rollData.success, this.rollData.dos, this.rollData.dof, this.rollData.opposedSuccess, this.rollData.opposedDos, this.rollData.opposedDof);
                if(opposedDegrees >= 2) {
                    const strengthBonus = this.rollData.sourceActor?.characteristics?.strength?.bonus ?? 0;
                    this.addEffect('Knock Down', `The target is knocked Prone and must use a Stand action in his turn to regain his feet! The impact deals [[1d5-3+${strengthBonus}]] (min 0) damage, with armour counting as double, and one level of fatigue to the target!`, ['prone']);
                } else if (opposedDegrees > 0) {
                    this.addEffect('Knock Down', `The target is knocked Prone and must use a Stand action in his turn to regain his feet!`, ['prone']);
                } else if (opposedDegrees > -2) {
                    this.addEffect('Knock Down', `The character fails to knock down the target!`);
                } else {
                    this.addEffect('Knock Down', `The character fails to knock down the target and in the failure knocks themselves prone instead!`);
                }
            } else {
                if(this.rollData.success) {
                    this.addEffect('Knock Down', `Compare to targets Strength check. If the attacker wins, the target is knocked Prone and must use a Stand action in his turn to regain his feet. If the attacker succeeds by two or more degrees of success, he can choose to inflict 1d5–3+SB Impact damage (with armour counting as double) and one level of Fatigue on the target. If the target wins the test, he keeps his footing. If the target wins by two or more degrees of success, the attacker is knocked Prone instead.`);
                } else {
                    this.addEffect('Knock Down', `The character fails to knock down the target!`);
                }
            }
        }
    }

    async _calculateHit() {
        this.rollData.roll = await roll1d100();
        let rollTotal = this.rollData.roll.total;
        const target = this.rollData.modifiedTarget;
        this.rollData.success = rollTotal === 1 || (rollTotal <= target && rollTotal !== 100);
    }

    async calculateSuccessOrFailure() {
        let actionItem = this.rollData.weapon ?? this.rollData.power;
        if (actionItem && actionItem?.isShipWeapon) {
            await this._calculateVoidshipHits("Weapon", this.rollData.voidshipShotsAmount);
        } else {
            await this._calculateHit();

            // Action Item
            if (actionItem) {

                // All Out Attack — the attacker forfeits Dodge/Parry Reactions until his next
                // turn (RT Core p.245). Flag the actor so the Reaction gate blocks them; the
                // flag clears on his turn (onCombatTurnChange). (QA-071.)
                if (this.rollData.action === 'All Out Attack') {
                    this.addEffect('All Out Attack', 'The character cannot attempt Dodge or Parry Reactions until the beginning of his next turn.');
                    if (game.combat?.started && this.rollData.sourceActor?.system?.combat) {
                        await this.rollData.sourceActor.update({ 'system.combat.allOutAttack': true });
                    }
                }

                // Guarded Attack — +10 to all Dodge and Parry Tests until his next turn
                // (RT Core p.245). Flag the actor; cleared on his turn. (QA-071.)
                if (this.rollData.action === 'Guarded Attack') {
                    this.addEffect('Guarded Attack', 'The character gains +10 to all Dodge and Parry Tests until the beginning of his next turn.');
                    if (game.combat?.started && this.rollData.sourceActor?.system?.combat) {
                        await this.rollData.sourceActor.update({ 'system.combat.guardedAttack': true });
                    }
                }

                // Stun Action (RT Core p.250): a Hard (-20) Weapon Skill Test to hit; only
                // ON A HIT does the attacker roll 1d10+SB against the defender's 1d10 + TB +
                // 1 per head Armour Point (head AP DOUBLED when unarmed or Primitive). Target
                // is Stunned for (attacker − defender) rounds + 1 Fatigue. The WS test (with
                // its −20) was already resolved at _calculateHit() above; honour it. (QA-121.)
                if (this.rollData.isStun) {
                    if (!this.rollData.success) {
                        this.addEffect('Stun Attack', `The Weapon Skill Test misses — no Stun.`);
                        return;
                    }
                    const sb = this.rollData.sourceActor.getCharacteristicFuzzy('Strength').bonus;
                    const attackRoll = new Roll(`1d10+${sb}`, {});
                    await attackRoll.evaluate();
                    this.rollData.roll = attackRoll;

                    const isPrimitive = this.rollData.hasAttackSpecial('Primitive');
                    // An unarmed strike is a Melee weapon of `type: 'Unarmed'` (ENGINE-NATWEAPONS,
                    // cf. damage-data.mjs) — NOT a null weapon, so detect it by type.
                    const isUnarmed = String(this.rollData.weapon?.system?.type ?? '').toLowerCase() === 'unarmed';
                    const doubled = isPrimitive || isUnarmed;
                    if (this.rollData.targetActor) {
                        const headArmour = this.rollData.targetActor.system.armour.head;
                        const defBonus = stunDefenceBonus(headArmour.total, headArmour.toughnessBonus, isUnarmed, isPrimitive);
                        const defenceRoll = new Roll(`1d10+${defBonus}`, {});
                        await defenceRoll.evaluate();
                        const note = doubled ? ' (head AP doubled)' : '';
                        if (attackRoll.total >= defenceRoll.total) {
                            this.rollData.success = true;
                            const rounds = attackRoll.total - defenceRoll.total;
                            this.addEffect('Stun Attack', `Hit! Stun ${attackRoll.total} (1d10+SB) vs defence ${defenceRoll.total} (1d10+TB+headAP${note}). Target is Stunned for ${rounds} round${rounds === 1 ? '' : 's'} and gains 1 level of Fatigue.`, ['stunned']);
                        } else {
                            this.rollData.success = false;
                            this.addEffect('Stun Attack', `Hit, but Stun ${attackRoll.total} (1d10+SB) vs defence ${defenceRoll.total} (1d10+TB+headAP${note}) — the target shrugs it off.`);
                        }
                    } else {
                        this.rollData.success = true;
                        this.addEffect('Stun Attack', `Hit! Stun roll ${attackRoll.total} (1d10+SB). The target rolls 1d10 + Toughness Bonus + 1 per head Armour Point${doubled ? ' (doubled — unarmed/Primitive)' : ''}; if your roll is equal or higher, he is Stunned for the difference in rounds and gains 1 level of Fatigue.`, ['stunned']);
                    }
                    return;
                }

                if (this.rollData.hasAttackSpecial('Flame')) {
                    // Flame weapons make no BS test — they auto-hit (RT Core p.142).
                    // Everyone in the 30° cone must pass an Agility Test or be struck (in
                    // the body — the location is forced to Body in createHit). (QA-131.)
                    this.rollData.success = true;
                    this.rollData.dos = 1;
                    this.rollData.dof = 0;
                    this.addEffect('Flame', 'No BS test — each creature in the 30° cone must pass an Agility Test or be hit (in the body). A struck target is set On Fire (RT Core p.142).', ['onFire'])
                    // Flame weapons make NO roll to hit (RT Core p.117), so the ghost d100 must
                    // not be re-interpreted: skip the ranged Jam check (a Flame weapon never
                    // jams on a 96+ BS result — it only jams on a Damage die of 9, handled in
                    // damage resolution) and skip the DoS recompute that would clobber dos=1.
                    // (BUG-Q-179.)
                    return;
                }

                if (actionItem.isMelee) {
                    if (!this.rollData.success) {
                        // Re-Roll Attack for Blademaster
                        if (this.rollData.sourceActor.hasTalent('Blademaster')) {
                            this.effects.push('blademaster');
                            this.rollData.previousRolls.push(this.rollData.roll);
                            await this._calculateHit();
                        }
                    }
                } else if (actionItem.isRanged) {
                    // Suppressing Fire / Overwatch — targets in the arc make a Pinning Test
                    // (Willpower) or become Pinned (RT Core p.248). (QA-082.)
                    if (this.rollData.action === 'Suppressing Fire') {
                        this.addEffect('Suppressing', 'All targets within the 45 degree kill zone must pass a Hard (-20) Pinning test or become Pinned.', null, -20)
                    } else if (this.rollData.action === 'Overwatch') {
                        this.addEffect('Overwatch', 'Targets caught in the 45 degree kill zone must pass a Hard (-20) Pinning test or become Pinned, even if the attack did no damage.', null, -20)
                    }

                    const rollTotal = this.rollData.roll.total;
                    const isBestRanged = actionItem.isRanged && actionItem.system.craftsmanship === 'Best';
                    const isOverheats = this.rollData.hasAttackSpecial('Overheats');
                    // Base weapon jam is 96+ (RT Core p.249), but Semi-Auto Burst, Full Auto
                    // Burst, and Suppressing Fire jam more readily on 94+ (RT Core p.242).
                    // Reliable/Unreliable/Best still override below. (BUG-Q-181.)
                    const isBurstFire = this.rollData.action === 'Semi-Auto Burst'
                        || this.rollData.action === 'Full Auto Burst'
                        || this.rollData.action === 'Suppressing Fire';
                    let jamThreshold = isBurstFire ? 94 : 96;
                    if (isBestRanged) {
                        jamThreshold = 101;
                    } else if (this.rollData.hasAttackSpecial('Reliable')) {
                        jamThreshold = 100;
                    } else if (this.rollData.hasAttackSpecial('Unreliable')) {
                        jamThreshold = 91;
                    }
                    if (isOverheats) {
                        // RT Core p.116: an Overheats weapon NEVER jams — it overheats at
                        // 91+, and any roll that WOULD jam overheats instead. Best-craft
                        // ranged suppresses it. (QA-098/099.)
                        if (!isBestRanged && (rollTotal >= 91 || rollTotal >= jamThreshold)) {
                            this.effects.push('overheat');
                        }
                    } else if (rollTotal >= jamThreshold) {
                        // Thrown weapons are propelled by muscle, not a machine spirit, so
                        // they do not "jam" like fired ranged weapons (RT Core p.249 Weapon
                        // Jams — the rule is about firing). A jam result from throwing a
                        // grenade instead resolves the dud/detonate rule (RT Core p.126); an
                        // ordinary thrown weapon (knife/spear) simply misses. (BUG-Q-182.)
                        if (actionItem.isThrown) {
                            if (actionItem.system?.type === 'Grenade') {
                                this.effects.push('grenade-jam');
                            }
                            this.rollData.success = false;
                        } else if (actionItem.system?.type === 'Launcher') {
                            // A jam when FIRING a grenade launcher (or similar) follows the same
                            // dud/detonate rule as a thrown grenade, except on a 10 the explosive
                            // detonates IN THE BARREL — its normal effect AND the weapon is
                            // destroyed (RT Core p.126). (BUG-Q-182 completion — verify caught that
                            // launchers are isRanged and were falling through to the standard jam.)
                            this.effects.push('launcher-jam');
                            this.rollData.success = false;
                        } else {
                            this.effects.push('jam');
                            this.rollData.success = false;
                        }
                    }
                }
            }


            if (this.rollData.success) {
                this.rollData.dof = 0;
                // Canon Degrees of Success = full 10-point bands the roll is under the target
                // (RT Core p.22) — NOT the DH2 `1 + tens-digit-diff`, which over-counted (a
                // bare success is now 0 DoS). (QA-094.)
                this.rollData.dos = degreesOfSuccess(this.rollData.modifiedTarget, this.rollData.roll.total);

                if (actionItem) {
                    if (this.rollData.action === 'Semi-Auto Burst' ||
                        actionItem.isPsychicBarrage ||
                        this.rollData.action === 'Suppressing Fire') {
                        if (actionItem.isRanged && this.rollData.hasWeaponModification('Fluid Action')) {
                            this.rollData.dos += 1;
                        }

                        // Semi-Auto Burst: one additional hit per TWO degrees of success
                        // (RT Core Table 9-1). Canon DoS → floor(dos/2). (QA-094.)
                        this.damageData.additionalHits += Math.floor(this.rollData.dos / 2);

                        // But Max at fire rate (Ammo available / ammo per shot || rate of fire - whichever is lower)
                        if (actionItem.isRanged && this.damageData.additionalHits > this.rollData.fireRate - 1) {
                            this.damageData.additionalHits = this.rollData.fireRate - 1;
                        }
                    } else if (this.rollData.action === 'Full Auto Burst' || actionItem.isPsychicStorm) {
                        // Full Auto Burst: one additional hit per degree of success (RT Core
                        // Table 9-1; example p.22 — 2 DoS → 3 hits). Canon DoS → dos. (QA-094.)
                        this.damageData.additionalHits += this.rollData.dos;

                        // But Max at weapon rate. Gate on isRanged (not usesAmmo) so the
                        // cap also applies to ammo-less ranged weapons — fireRate is now
                        // set from the printed RoF regardless of ammo tracking (BUG-Q-171).
                        // Psychic Storm (isPsychicStorm, not isRanged) stays uncapped.
                        if (actionItem.isRanged && this.damageData.additionalHits > this.rollData.fireRate - 1) {
                            this.damageData.additionalHits = this.rollData.fireRate - 1;
                        }
                    }
                }

                // BUG-Q-178: Scatter at Point Blank scores +1 HIT per two Degrees of Success
                // (RT Core p.116 / Table 9-5 Multiple Hits) — a weapon-spread effect independent
                // of the fire action (no flat damage or to-hit modifier in RT 1e).
                if (actionItem?.isRanged && this.rollData.hasAttackSpecial('Scatter')
                    && this.rollData.rangeName === 'Point Blank') {
                    this.damageData.additionalHits += Math.floor(this.rollData.dos / 2);
                }

                // Swift Attack / Lightning Attack — RT 1e melee multi-attack TALENTS
                // (RT Core p.107 / p.102): a flat number of extra hits on a successful
                // WS test (Swift = 1 → two attacks, Lightning = 2 → three attacks), NOT
                // the DoS-scaled count the legacy DH2 actions used. Applied by name.
                this.damageData.additionalHits += attackTalentExtraHits(this.rollData.action);

                // Twin-Linked: scores ONE additional hit if the attack succeeds by two or
                // more degrees of success (RT Core p.121, "# TWIN-LINKED"). Flat +1 for any
                // action — RT prints no fire-mode DoS scaling. This stacks on top of the
                // fire-mode additional hits computed above; it must never overwrite them.
                // (BUG-Q-167: the old per-mode `=` formulas actively reduced the hit count.)
                if (this.rollData.dos > 1 && this.rollData.hasAttackSpecial('Twin-Linked')) {
                    this.damageData.additionalHits++;
                }

                // Storm: every hit counts as two hits (RT Core p.121)
                if (this.rollData.hasAttackSpecial('Storm')) {
                    this.damageData.additionalHits += 1 + this.damageData.additionalHits;
                }

            } else {
                this.rollData.dos = 0;
                // Canon Degrees of Failure = full 10-point bands the roll is over the target
                // (RT Core p.22) — same band method as DoS, replacing the tens-digit-diff
                // (BUG-001 dropped the `1 +`; QA-094 moves it onto the band method so opposed
                // tests mix DoS and DoF consistently).
                this.rollData.dof = degreesOfFailure(this.rollData.modifiedTarget, this.rollData.roll.total);

                if (this.rollData.isThrown) {
                    this.addEffect('Deviation', `The attack deviates [[ 1d5 ]]m off course to the ${scatterDirection()}!`);
                }

                if (this.rollData.roll.total === 100) {
                    this.effects.push('auto-failure');
                }
            }
        }
    }

    async _calculateVoidshipHits(type, amount) {
        // NOTE — Turret defence and boarding actions are NOT resolved here. They have dedicated
        // canon-correct resolvers on the voidship document: turrets are a passive defensive rating
        // (RT Core p.220, no to-hit roll) and a boarding action is a single opposed Command Test
        // (RT Core p.219). The old homebrew per-attack d100 loops were removed — see
        // voidship.rollTurrets() / voidship.rollBoarding(). (BUG-Q-170.)
        if (type === "Weapon") {
            // RT RAW (RT Core p.217-219): a SINGLE BS test scores 1 hit + 1 per Degree of
            // Success, capped at the weapon's Strength; a Critical Hit triggers when DoS ≥
            // the weapon's Crit Rating. (QA-153 / QA-044 — replaces the homebrew "Strength
            // independent rolls" + fixed "≤ target/10" crit threshold.)
            this.rollData.roll = await roll1d100();
            const rollTotal = this.rollData.roll.total;
            const target = this.rollData.modifiedTarget;
            const strength = amount ?? this.rollData.weapon?.system?.strength ?? 1;
            const critRating = this.rollData.weapon?.system?.critRating ?? 0;
            const isLance = this.rollData.weapon?.system?.type === 'Lance';
            const res = voidshipWeaponHits(rollTotal, target, strength, critRating, isLance);
            this.rollData.dos = res.dos;
            // A Critical Hit triggers ONLY when DoS ≥ the weapon's Crit Rating (RT Core p.218).
            // Destructive does NOT upgrade a normal hit to a Critical — it adds +1 to the 1d5
            // Critical Hits chart roll WHEN a crit is naturally generated (Battlefleet Koronus
            // p.35: "If this weapon generates a crit, add 1 to the result rolled"). (BUG-Q-213.)
            const critical = res.critical;
            for (let i = 0; i < res.hits; i++) {
                this.rollData.voidshipResults.push({
                    isCritical: critical, isHit: !critical, isMiss: false, isFumble: false,
                    penetration: false, overpenetration: false, roll: rollTotal, location: "",
                });
            }
            if (res.hits > 0) {
                this.rollData.success = true;
            } else {
                // record the miss / fumble so the result card still renders
                this.rollData.voidshipResults.push({
                    isCritical: false, isHit: false, isMiss: rollTotal !== 100, isFumble: rollTotal === 100,
                    penetration: false, overpenetration: false, roll: rollTotal, location: "",
                });
            }
        }
    }

    async _calculateVoidshipHit() {
        this.rollData.roll = await roll1d100();
        const rollTotal = this.rollData.roll.total;
        const target = this.rollData.modifiedTarget;
        // RT RAW (RT Core p.215): a void-ship Extended Action is a standard Test —
        // Success/Failure with Degrees of Success/Failure as normal, NOT the homebrew
        // "Flawless / Flawed Success" scale. Set the real `success` flag so downstream
        // rules integrate (the chat card falls through to the standard Success+DoS /
        // Fail+DoF branch). (BUG-Q-169.)
        this.rollData.success = rollTotal === 1 || (rollTotal <= target && rollTotal !== 100);
        if (this.rollData.success) {
            this.rollData.dof = 0;
            this.rollData.dos = degreesOfSuccess(target, rollTotal);
        } else {
            this.rollData.dos = 0;
            this.rollData.dof = degreesOfFailure(target, rollTotal);
        }
    }

    async calculateResultVoidship() {
        // Crew Extended Actions resolve as a standard RT Test (RT Core p.215). Turret defence and
        // boarding actions are handled by their own canon resolvers (voidship.rollTurrets /
        // rollBoarding), not through this path. (BUG-Q-170.)
        await this._calculateVoidshipHit();
    }

    reverseD100(roll) {
        return parseInt(roll.toString().padStart(2, '0').split('').reverse().join(''));
    }

    async calculateHitLocations() {
        this.rollData.voidshipResults.forEach((result) => {
            if (result.isCritical || result.isHit ) {
                let hitRoll = this.reverseD100(result.roll);
                switch (this.rollData.voidshipFacing) {
                    case 0: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 50) {
                        result.location = "Prow";
                    } else if (hitRoll <= 90) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                    case 1: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 25) {
                        result.location = "Prow";
                    } else if (hitRoll <= 85) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                    case 2: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 25) {
                        result.location = "Prow";
                    } else if (hitRoll <= 85) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                    case 3: if (hitRoll <= 10) {
                        result.location = "Bridge";
                    } else if (hitRoll <= 20) {
                        result.location = "Prow";
                    } else if (hitRoll <= 50) {
                        result.location = "Main";
                    } else {
                        result.location = "Rear";
                    } break;
                }
            }
        })
    }

    async calculateVoidShields() {
        if (!this.rollData.targetActor || this.rollData.targetActor.type !== "voidship") return;

        // Lances ignore the target's ARMOUR (handled in calculatePenetration via isLance) but
        // NOT void shields — "ignore the target's armour … but not void shields" (RT Core p.216,
        // markdown.md:1214; worked example :1252 has the lance strike "unimpeded" only because
        // the shields were already down). So lances fall through the same cancellation loop as
        // macrobatteries instead of skipping it.

        // Void shields cancel up to `strength` hits from THIS salvo (RT Core p.226). They are
        // NOT permanently spent: shields "reduce hits from all ships firing on them … restored
        // in time to protect against that attacker's fire as well", so the full strength applies
        // to every incoming salvo. We therefore cancel hits locally but do NOT persist a
        // decrement (was `targetActor.update({shields})`, which left shields spent forever —
        // QA-045). Simplification: a single attacker's multiple salvos in one turn each get
        // full shields rather than overloading after the first; the dominant fix is that
        // shields no longer drain permanently.
        let shields = this.rollData.targetActor.system.shields;
        if (shields <= 0) return;

        for (const result of this.rollData.voidshipResults) {
            if (shields <= 0) break;
            if (result.isCritical || result.isHit) {
                result.isShielded = true;
                result.isCritical = false;
                result.isHit = false;
                shields--;
                this.rollData.voidshipShieldsUsed++;
            }
        }
    }

    async calculatePenetration() {
        let damage = this.rollData.weapon.system.damage;

        // Lances take no range Damage modifier and ignore Armour; they fall through to the
        // unified hull-damage computation below (handled via the isLance flag). (QA-042.)
        if (this.rollData.weapon.system.type === "Macrocannon") {
            if (this.rollData.hasAttackSpecial('Scattershot')) {
                switch (this.rollData.rangeName) {
                    case "Short Range" :
                        damage = damage + 3;
                        break;
                    case "Long Range" :
                        damage = damage - 3;
                        break;
                }
            } else if (this.rollData.hasAttackSpecial('Self Propelled Warhead')) {
                switch (this.rollData.rangeName) {
                    case "Short Range" :
                        damage = damage + 2;
                        break;
                }
            } else {
                switch (this.rollData.rangeName) {
                    case "Short Range" :
                        damage = damage + 2;
                        break;
                    case "Long Range" :
                        damage = damage - 2;
                        break;
                }
            }
        }
        this.rollData.voidshipDamage = damage;
        if (this.rollData.targetActor && this.rollData.targetActor.type === "voidship") {
            this.rollData.voidshipTarget = true;
            const isLance = this.rollData.weapon.system.type === "Lance";
            const baseArmour = this.rollData.targetActor.system.armour;
            const cb = this.rollData.targetActor.system.componentBonuses ?? {};
            const armourByFacing = {
                0: (baseArmour.prow || 0) + (cb.armour || 0) + (cb.armourProw || 0),
                1: (baseArmour.side || 0) + (cb.armour || 0),
                2: (baseArmour.side || 0) + (cb.armour || 0),
                3: (baseArmour.rear || 0) + (cb.armour || 0),
            };
            const facingArmour = armourByFacing[this.rollData.voidshipFacing] ?? 0;

            // RT Core p.216: roll the weapon's Damage (1d10 + the stored bonus) once per
            // non-shielded hit. Macrobatteries SUM the rolls then subtract the facing Armour
            // ONCE; lances resolve each hit ignoring Armour, straight to Hull. (QA-042 —
            // replaces the homebrew penetration-tier / fixed 1-4 hull constants.)
            const hits = this.rollData.voidshipResults.filter((r) => r.isCritical || r.isHit);
            const perHit = [];
            for (const r of hits) {
                const dr = new Roll(`1d10+${damage}`, {});
                await dr.evaluate();
                r.damageRoll = dr.total;
                perHit.push(dr.total);
            }
            const hull = voidshipHullDamage(perHit, facingArmour, isLance);
            const critCount = hits.filter((r) => r.isCritical).length;
            // Destructive: +1 to the Critical Hits chart roll when a crit is generated
            // (Battlefleet Koronus p.35). Carried on the hit so executeCritical can apply it.
            const destructive = this.rollData.hasAttackSpecial('Destructive');
            this.rollData.voidshipHullDamage = hull;
            this.rollData.voidshipCritHits = critCount;
            this.rollData.voidshipDamageRolls = perHit;
            // The combined salvo total is applied ONCE — attach it to the primary hit so a
            // single Assign carries the whole salvo; subsequent hits carry 0.
            hits.forEach((r, i) => {
                r.voidshipHull = i === 0 ? hull : 0;
                r.voidshipCritHits = i === 0 ? critCount : 0;
                r.voidshipDestructive = destructive;
                r.penetration = true;   // (legacy flag the card/assign still read; tiering removed)
            });
        }
    }

    async calculateHits() {
        // A ranged weapon that uses ammo cannot fire if the clip lacks enough rounds for even one
        // shot of this action: calculateAmmoInformation clamps fireRate to 0 when availableAmmo <
        // ammoPerShot (e.g. a Maximal shot needs 3 with 2 left). Produce NO hits and flag it, so
        // the attack can't resolve "for free" via a programmatic / non-dialog path (the weapon
        // dialog has its own fireRate===0 guard). (BUG-Q-210 — RT Core p.115: "A weapon cannot be
        // fired if it does not have enough ammunition.")
        if (this.rollData.usesAmmo && !this.rollData.isThrown && (this.rollData.fireRate ?? 0) <= 0) {
            this.addEffect('Out of Ammo', 'Not enough ammunition remains to fire this action.');
            return;
        }
        if (this.rollData.success || this.rollData.isThrown) {
            let hit = await Hit.createHit(this, 0);
            this.damageData.hits.push(hit);

            for (let i = 0; i < this.damageData.additionalHits; i++) {
                hit = await Hit.createHit(this, i + 1);
                this.damageData.hits.push(hit);
            }
        }
    }

    addEffect(name, effect, conditions = null, pinning = null) {
        this.effectOutput.push({
            name: name,
            effect: effect,
            // QA-080 inc.2: optional condition ids this outcome lets the GM apply to the
            // target (rendered as "Apply: <name>" buttons on the chat card). Resolved to
            // {id, name} metadata here so the template stays logic-free.
            conditions: (conditions ?? [])
                .map((id) => conditionMeta(id))
                .filter(Boolean),
            // QA-082: when set, the card shows a "Roll Pinning Test" button at this WP-test
            // difficulty; on failure the target becomes Pinned. `pinning` is the modifier
            // (e.g. -10 Difficult, -20 Hard, 0 Ordinary).
            pinning: (pinning === null || pinning === undefined) ? null : { difficulty: pinning },
        })
    }

    async createEffectData() {
        for (const effect of this.effects) {
            switch(effect){
                case 'auto-failure':
                    this.addEffect('Auto Failure', `The roll resulted in an automatic failure!`);
                    break;
                case 'blademaster':
                    this.addEffect('Blademaster', `Original roll of ${this.rollData.previousRolls[0].total} rerolled.`);
                    break;
                case 'overheat': {
                    // RT Core p.116: the wielder suffers energy damage equal to the weapon's
                    // damage at Penetration 0 to an arm, OR may drop the weapon (a Free
                    // Action) to avoid it; the weapon then cools down and cannot be fired
                    // until the round after next. (QA-100. Auto-assigning the arm hit and the
                    // per-weapon cooldown round-state are deferred — they need the round-state
                    // machinery; here we roll the damage number and state the choice.)
                    const overheatFormula = this.rollData.weapon?.system?.damage;
                    let overheatDmg = '';
                    if (overheatFormula) {
                        try {
                            const r = new Roll(String(overheatFormula), {});
                            await r.evaluate();
                            overheatDmg = ` (${r.total} Energy damage, Pen 0, to an arm)`;
                        } catch (e) { /* unparseable formula — describe without a number */ }
                    }
                    this.addEffect('Overheats', `The weapon overheats! The wielder suffers energy damage equal to the weapon's damage at Penetration 0 to an arm${overheatDmg}, or may drop the weapon (a Free Action) to avoid the damage. The weapon must cool down and cannot be fired again until the round after next.`);
                    break;
                }
                case 'jam':
                    // RT Core p.238: a jammed weapon cannot be fired again until cleared with a
                    // Full Action Ballistic Skill Test. Persist the state on the weapon. (QA-105.)
                    this.addEffect('Jam', `The weapon jams! It cannot be fired again until cleared — a Full Action Ballistic Skill Test (use the weapon sheet's "Clear Jam" control).`);
                    if (this.rollData.weapon?.update) {
                        await this.rollData.weapon.update({ 'system.jammed': true });
                    }
                    break;
                case 'grenade-jam': {
                    // RT Core p.126 (When a Grenade "Jams"): a jam from throwing a grenade
                    // does not leave the weapon jammed — roll 1d10. On any result other than
                    // 10 the explosive is simply a dud and nothing happens; on a 10 it
                    // detonates immediately, centred on the attacker. (BUG-Q-182.)
                    const dudRoll = new Roll('1d10', {});
                    await dudRoll.evaluate();
                    if (dudRoll.total === 10) {
                        this.addEffect('Grenade Detonates!', `The throw goes catastrophically wrong (1d10 → ${dudRoll.total}): the explosive detonates immediately, centred on the attacker with its normal effect!`);
                    } else {
                        this.addEffect('Grenade Dud', `The throw misfires (1d10 → ${dudRoll.total}): the explosive is simply a dud and nothing happens.`);
                    }
                    break;
                }
                case 'launcher-jam': {
                    // RT Core p.126: a jam when FIRING a grenade launcher (or similar) — roll 1d10.
                    // On any result other than 10 the round is a dud and nothing happens; on a 10
                    // it detonates IN THE BARREL with its normal effect AND destroys the weapon.
                    // (BUG-Q-182 completion — the thrown-grenade path is `grenade-jam` above. Full
                    // item destruction is left as a GM follow-up; the weapon is marked jammed so it
                    // can't keep firing.)
                    const barrelRoll = new Roll('1d10', {});
                    await barrelRoll.evaluate();
                    if (barrelRoll.total === 10) {
                        this.addEffect('Launcher Detonates!', `The launcher misfires catastrophically (1d10 → ${barrelRoll.total}): the explosive detonates in the barrel — its normal effect is centred on the attacker AND the weapon is destroyed.`);
                        if (this.rollData.weapon?.update) {
                            await this.rollData.weapon.update({ 'system.jammed': true });
                        }
                    } else {
                        this.addEffect('Launcher Dud', `The launcher misfires (1d10 → ${barrelRoll.total}): the round is a dud and nothing happens.`);
                    }
                    break;
                }
            }
        }
    }

    async descriptionText() {}

    async useResources() {
        // Expend Ammo
        await useAmmo(this);

        // Recharge (RT Core p.143): a Recharge weapon must spend the Round after firing
        // building a charge — it can only fire every other Round. Stamp it as recharging with
        // the round it fired; cleared two Rounds later by the combat-turn hook. (QA-016.)
        const weapon = this.rollData.weapon;
        if (weapon?.update && this.rollData.hasAttackSpecial?.('Recharge')) {
            await weapon.update({
                'system.recharging': true,
                'system.rechargedRound': game.combat?.round ?? 0,
            });
        }

        // Use a Fate for Eye of Vengeance
        if(this.rollData.eyeOfVengeance) {
            await this.rollData.sourceActor.spendFate();
        }
    }

    async refundResources() {
        // Refund Ammo
        await refundAmmo(this);

        // Use a Fate for Eye of Vengeance
        if(this.rollData.eyeOfVengeance) {
            await this.rollData.sourceActor.update({
                system: {
                    fate: {
                        value: this.rollData.sourceActor.system.fate.value + 1
                    }
                }
            });
        }
    }

    async performActionAndSendToChat() {
        // Store Roll Information
        DHBasicActionManager.storeActionData(this);

        // Finalize Modifiers
        await this.rollData.calculateTotalModifiers();

        // Determine Success/Hits
        await this.calculateSuccessOrFailure();
        if (this.rollData.weapon && this.rollData.weapon.isShipWeapon) {
            this.rollData.voidshipAttack = true;
            await this.calculateVoidShields();
            await this.calculateHitLocations();
            await this.calculatePenetration();
        }

        if (this.rollData.action !== 'Stun') {
            await this.checkForOpposed();
            await this.checkForPerils();

            // Calculate Hits
            await this.calculateHits();

            // Create Specials
            await this.createEffectData();

            game.rt.log('Perform Action', this);

            // Description Text
            await this.descriptionText();

            // Use Resources
            await this.useResources();
        }

        // Render Attack Roll
        this.rollData.render = await this.rollData.roll.render();
        this.template = this.rollData.template;

        // Send to Chat
        await sendActionDataToChat(this);
    }
}

export class WeaponActionData extends ActionData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
        this.hasDamage = true;
        this.rollData = new WeaponRollData();
        this.damageData = new WeaponDamageData();
    }
}

export class PsychicActionData extends ActionData {
    psychicEffect = '';

    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
        this.hasDamage = true;
        this.rollData = new PsychicRollData();
        this.damageData = new PsychicDamageData();
    }

    async performActionAndSendToChat() {
        if(!this.rollData.hasDamage) {
            this.rollData.template = 'systems/rogue-trader-3rd/templates/chat/psychic-action-chat.hbs';
            this.template = 'systems/rogue-trader-3rd/templates/chat/psychic-action-chat.hbs';
        }
        await super.performActionAndSendToChat();
    }

    async descriptionText() {
        if(this.rollData.power) {
            this.psychicEffect = await TextEditor.enrichHTML(this.rollData.power.system.description, {rollData: this.rollData});
        }
    }
}

export class PsychicSkillData extends ActionData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/action-roll-chat.hbs';
        this.hasDamage = false;
        this.rollData = new PsychicRollData();
    }
}

export class SimpleSkillData extends ActionData {
    constructor() {
        super();
        this.template = 'systems/rogue-trader-3rd/templates/chat/simple-roll-chat.hbs';
        this.hasDamage = false;
        this.rollData = new RollData();
    }
}
