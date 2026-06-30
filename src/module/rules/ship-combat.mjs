// Strategic Round / VU void-ship combat (RT Core pp.213-220). Space combat runs in Strategic
// Rounds (~30 min); each ship takes a Strategic Turn in initiative order and makes one Manoeuvre
// Action and one Shooting Action. Distance/movement is measured in Void Units (VU ≈ 10,000 km).
// This module supplies the RT turn structure (initiative + per-ship action economy), the
// Manoeuvre resolution, and the Shooting modifiers (range band by VU + firing-arc eligibility).
// Positioning itself is the GM's on-canvas job (1 grid square = 1 VU, per canon); the system
// reads VU distance + the target's arc as inputs rather than computing canvas geometry. (QA-047.)
//
// The pure helpers below are engine-agnostic (no Foundry globals) so they are node-tested.

// ── Pure helpers ────────────────────────────────────────────────────────────────────────────

/** Initiative bonus = the tens digit of the ship's Detection characteristic (RT Core p.213). */
export function shipInitiativeBonus(detection) {
    return Math.floor((Number(detection) || 0) / 10);
}

/** VUs moved by a Manoeuvre Action: full Speed, or half Speed (rounded UP — RT's default fractional
 *  rounding, RT Core p.17). Ships always move. (BUG-Q-223.) */
export function shipManoeuvreDistance(speed, fraction = 'full') {
    const s = Math.max(0, Number(speed) || 0);
    return fraction === 'half' ? Math.ceil(s / 2) : s;
}

/** Max turn after moving: 90° for frigate-or-smaller hulls, 45° otherwise (RT Core p.214). */
export function shipMaxTurn(shipType) {
    const t = String(shipType ?? '').toLowerCase();
    const nimble = ['transport', 'raider', 'frigate'].some((k) => t.includes(k));
    return nimble ? 90 : 45;
}

/**
 * Range band + to-hit modifier for a ship weapon firing at a VU distance (RT Core p.217). A
 * weapon can fire only within its Range; ≤ half Range is Short (+10 BS), beyond that out to
 * Range is Long (−10 BS). Authored band thresholds — logged for RT-rules review.
 */
export function shipRangeBand(distanceVU, weaponRangeVU) {
    const d = Math.max(0, Number(distanceVU) || 0);
    const range = Math.max(0, Number(weaponRangeVU) || 0);
    if (d > range) return { band: 'Out of range', canFire: false, modifier: 0 };
    if (d <= range / 2) return { band: 'Short', canFire: true, modifier: 10 };
    return { band: 'Long', canFire: true, modifier: -10 };
}

/**
 * Whether a weapon mounted in `slot` can bear on a target in `arc` (RT firing arcs). Prow → Fore;
 * Port/Starboard → their own beam; Dorsal/Keel → any arc except Aft; Special → GM-defined (any).
 * arc ∈ {fore, port, starboard, aft}.
 */
export function firingArcAllows(slot, arc) {
    const s = String(slot ?? '').toLowerCase();
    const a = String(arc ?? '').toLowerCase();
    if (!a) return false;
    switch (s) {
        case 'prow': return a === 'fore';
        case 'port': return a === 'port';
        case 'starboard': return a === 'starboard';
        case 'dorsal':
        case 'keel': return a !== 'aft';
        case 'special': return true;
        default: return false;
    }
}

/**
 * Combined Shooting Action resolution for a ship weapon: eligibility (in range + arc bears) and
 * the total to-hit modifier (range band). Returns `{ canFire, modifier, band, reason }`.
 */
export function shipShootingResolution({ distanceVU, weaponRangeVU, slot, targetArc }) {
    if (!firingArcAllows(slot, targetArc)) {
        return { canFire: false, modifier: 0, band: null, reason: `A ${slot} weapon cannot bear on a target in the ${targetArc} arc.` };
    }
    const rb = shipRangeBand(distanceVU, weaponRangeVU);
    if (!rb.canFire) {
        return { canFire: false, modifier: 0, band: rb.band, reason: `Target is beyond the weapon's Range (${weaponRangeVU} VU).` };
    }
    return { canFire: true, modifier: rb.modifier, band: rb.band, reason: '' };
}

// ── Foundry-coupled actions ─────────────────────────────────────────────────────────────────

const blankTurn = () => ({ manoeuvre: false, shooting: false, movedVU: 0 });

/** Reset a ship's per-Turn action economy (called at the start of its Strategic Turn). */
export async function resetStrategicTurn(ship) {
    if (ship?.type !== 'voidship') return;
    await ship.update({ 'system.combat.strategicTurn': blankTurn() });
}

/** Roll Strategic-Round initiative (1d10 + Detection bonus) for every voidship in the active Combat. */
export async function rollShipInitiative() {
    const combat = game.combat;
    if (!combat) { ui.notifications?.warn('Start a Combat encounter first to roll ship initiative.'); return; }
    for (const combatant of combat.combatants) {
        const ship = combatant.actor;
        if (ship?.type !== 'voidship') continue;
        const bonus = shipInitiativeBonus(ship.system?.detection);
        const roll = await new Roll(`1d10 + ${bonus}`).evaluate();
        await combat.setInitiative(combatant.id, roll.total);
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: ship }),
            content: `<p><strong>${ship.name}</strong> — Strategic Initiative ${roll.total} (1d10 + ${bonus} Detection bonus).</p>`,
        });
    }
}

/** Manoeuvre Action: move full/half Speed in VU, then turn up to the hull's max. Records movement. */
export async function shipManoeuvre(ship, fraction = 'full', degrees = 0) {
    if (ship?.type !== 'voidship') { ui.notifications?.warn('Select a voidship to Manoeuvre.'); return; }
    const turn = ship.system?.combat?.strategicTurn ?? blankTurn();
    if (turn.manoeuvre) { ui.notifications?.warn(`${ship.name} has already made its Manoeuvre Action this Strategic Turn.`); return; }
    const moved = shipManoeuvreDistance(ship.system?.speed, fraction);
    const maxTurn = shipMaxTurn(ship.system?.shipType);
    const turned = Math.min(Math.abs(Number(degrees) || 0), maxTurn);
    await ship.update({ 'system.combat.strategicTurn': { ...turn, manoeuvre: true, movedVU: moved } });
    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: ship }),
        content: `<p><strong>${ship.name} — Manoeuvre</strong>: moves ${moved} VU (${fraction} Speed), then turns ${turned}° (max ${maxTurn}°). Reposition the token on the map accordingly.</p>`,
    });
}

/** Mark a ship's Shooting Action as spent this Turn (returns false if already used). */
export async function spendShipShooting(ship) {
    if (ship?.type !== 'voidship') return true;
    const turn = ship.system?.combat?.strategicTurn ?? blankTurn();
    if (turn.shooting) { ui.notifications?.warn(`${ship.name} has already made its Shooting Action this Strategic Turn.`); return false; }
    await ship.update({ 'system.combat.strategicTurn': { ...turn, shooting: true } });
    return true;
}

/**
 * Pre-fire Strategic-Round check for a ship weapon: prompt for the target's VU distance + arc,
 * verify the weapon bears (firing arc) and is in range, spend the ship's one Shooting Action, and
 * surface the range-band BS modifier. Returns true if the shot may proceed. While a Combat is
 * running the once-per-Turn economy is enforced; out of combat it's a courtesy check. (QA-047.)
 */
export async function shipShootingCheck(ship, weapon) {
    if (ship?.type !== 'voidship' || !weapon) return true;
    const slot = String(weapon.system?.location ?? 'special').toLowerCase();
    const weaponRangeVU = Number(weapon.system?.range) || 0;
    const DialogV2 = foundry.applications?.api?.DialogV2;
    let distanceVU = 0;
    let targetArc = 'fore';
    if (DialogV2) {
        const arcs = ['fore', 'port', 'starboard', 'aft'].map(a => `<option value="${a}">${a[0].toUpperCase() + a.slice(1)}</option>`).join('');
        const content = `<form class="rt-ship-shoot" autocomplete="off">
            <div class="form-group"><label>Target distance (VU)</label><input type="number" name="distance" min="0" value="0"/></div>
            <div class="form-group"><label>Target arc</label><select name="arc">${arcs}</select></div></form>`;
        const result = await DialogV2.prompt({
            window: { title: `${ship.name} — Shooting (${weapon.name}, ${slot}, Range ${weaponRangeVU} VU)` },
            content,
            ok: { label: 'Resolve', callback: (_e, btn) => ({ distance: Number(btn.form.distance.value) || 0, arc: btn.form.arc.value }) },
        }).catch(() => null);
        if (!result) return false;
        distanceVU = result.distance;
        targetArc = result.arc;
    }
    const res = shipShootingResolution({ distanceVU, weaponRangeVU, slot, targetArc });
    if (!res.canFire) {
        ui.notifications?.warn(res.reason);
        return { ok: false, modifier: 0 };
    }
    if (!(await spendShipShooting(ship))) return { ok: false, modifier: 0 };
    const modTxt = res.modifier >= 0 ? `+${res.modifier}` : `${res.modifier}`;
    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: ship }),
        content: `<p><strong>${ship.name} fires ${weapon.name}</strong> into the ${targetArc} arc at ${distanceVU} VU — <strong>${res.band}</strong> range (${modTxt} BS, applied to the attack).</p>`,
    });
    return { ok: true, modifier: res.modifier };
}

/** Ramming dice by hull size (RT Core p.219, verbatim): transport/raider 1d5, frigate 1d10, light cruiser 2d5, cruiser 2d10. */
export function shipRamDice(shipType) {
    const t = String(shipType ?? '').toLowerCase();
    if (t.includes('cruiser') && t.includes('light')) return '2d5';
    if (t.includes('cruiser')) return '2d10';
    if (t.includes('frigate')) return '1d10';
    return '1d5'; // transports, raiders, and equivalents
}

/**
 * Ram (RT Core p.219): within 1 VU and bow-on, a ship may give up its Shooting Action to ram.
 * Damage = prow Armour + the hull-size die (ignoring void shields); the rammer takes the target's
 * Armour + 1d5 to its own prow (also ignoring shields). The Hard (−20) Pilot test is the
 * helmsman's to roll; this resolves and announces the damage figures. (QA-047 follow-up.)
 */
export async function shipRam(rammer, target) {
    if (rammer?.type !== 'voidship') { ui.notifications?.warn('Select a void-ship to ram with.'); return; }
    if (!(await spendShipShooting(rammer))) return; // ramming uses the Shooting Action
    const prowArmour = Number(rammer.system?.armour?.prow ?? rammer.system?.armour) || 0;
    const dice = shipRamDice(rammer.system?.shipType);
    const dmg = await new Roll(`${prowArmour} + ${dice}`).evaluate();
    let selfLine = '';
    if (target?.type === 'voidship') {
        const targetArmour = Number(target.system?.armour?.prow ?? target.system?.armour) || 0;
        const self = await new Roll(`${targetArmour} + 1d5`).evaluate();
        selfLine = `<br/>${rammer.name} takes <strong>${self.total}</strong> to its prow (target Armour ${targetArmour} + 1d5, ignoring shields).`;
    }
    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: rammer }),
        content: `<p><strong>${rammer.name} rams${target ? ' ' + target.name : ''}!</strong> Helmsman makes a Hard (−20) Pilot (Space Craft)+Manoeuvrability Test; on a hit it deals <strong>${dmg.total}</strong> (prow Armour ${prowArmour} + ${dice}, ignoring void shields).${selfLine}</p>`,
    });
}

/** Come About — a Manoeuvre Action (Adjust Speed & Bearing, Hard −20) to turn earlier than normal. */
export async function shipComeAbout(ship) {
    if (ship?.type !== 'voidship') return;
    const turn = ship.system?.combat?.strategicTurn ?? blankTurn();
    if (turn.manoeuvre) { ui.notifications?.warn(`${ship.name} has already made its Manoeuvre Action this Turn.`); return; }
    const moved = shipManoeuvreDistance(ship.system?.speed, 'full');
    await ship.update({ 'system.combat.strategicTurn': { ...turn, manoeuvre: true, movedVU: moved } });
    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: ship }),
        content: `<p><strong>${ship.name} — Come About</strong> (Adjust Speed &amp; Bearing): helmsman makes a Hard (−20) Pilot (Space Craft)+Manoeuvrability Test. On a success (and per DoS) the ship may turn after moving 1 VU less, and adjust its ${moved} VU move by ±1.</p>`,
    });
}

/** Disengage — a Manoeuvre Action to flee combat (RT Core p.219): not within 8 VU of an enemy; no firing this turn. */
export async function shipDisengage(ship) {
    if (ship?.type !== 'voidship') return;
    const turn = ship.system?.combat?.strategicTurn ?? blankTurn();
    if (turn.manoeuvre) { ui.notifications?.warn(`${ship.name} has already made its Manoeuvre Action this Turn.`); return; }
    // Disengaging forfeits the Shooting Action and spends the Manoeuvre.
    await ship.update({ 'system.combat.strategicTurn': { ...turn, manoeuvre: true, shooting: true, movedVU: shipManoeuvreDistance(ship.system?.speed, 'full') } });
    await ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: ship }),
        content: `<p><strong>${ship.name} attempts to Disengage</strong> (may not be within 8 VU of any enemy): helmsman makes a Challenging (+0) Pilot (Space Craft)+Manoeuvrability Test, opposed by each enemy within 20 VU (Detection+Scrutiny). Beat them all to leave combat. The ship fires no weapons this turn.</p>`,
    });
}
