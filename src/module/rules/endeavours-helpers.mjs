// Pure Endeavour helpers (RT Core Ch.XII + Table 9-41) — no Foundry globals, so they are
// node-testable. The dialog/setting glue lives in endeavours.mjs. (QA-084 / QA-085.)

/** Base Profit-Factor reward by Endeavour size (RT Core p.291): Lesser +1, Greater +3, Grand +5
 *  (Lesser/Greater span +1/+2 and +3/+4 — the GM may bump the editable reward within range). */
export function endeavourSizeReward(size) {
    return { lesser: 1, greater: 3, grand: 5 }[String(size ?? '').toLowerCase()] ?? 1;
}

/** Sum the Achievement Points and target across an Endeavour's Objectives. */
export function endeavourTotals(objectives = []) {
    return (objectives ?? []).reduce(
        (acc, o) => ({ ap: acc.ap + (Number(o.achievementPoints) || 0), target: acc.target + (Number(o.target) || 0) }),
        { ap: 0, target: 0 },
    );
}

/** Profit Factor awarded on completion: the size reward + 1 per full 100 AP beyond the target. */
export function endeavourCompletionPF(sizeReward, totalAP, totalTarget) {
    const excess = Math.max(0, (Number(totalAP) || 0) - (Number(totalTarget) || 0));
    return (Number(sizeReward) || 0) + Math.floor(excess / 100);
}

/** Misfortune result for a d100 (RT Core Table 9-41); Calamitous costs 1d5 PF (pass the d5). */
export function misfortuneResult(d100, d5 = 1) {
    const r = Number(d100) || 0;
    if (r <= 49) return { tier: 'None', loss: 0 };
    if (r <= 65) return { tier: 'Nuisance', loss: 1 };
    if (r <= 90) return { tier: 'Grim', loss: 2 };
    return { tier: 'Calamitous', loss: Math.max(1, Number(d5) || 1) };
}
