/**
 * Encumbrance weight helpers — RT Core p.268 Table 9-33 (Carrying, Lifting & Pushing Weights).
 *
 * Pure functions (no Foundry globals) so they can be node-tested. The Lifting and Pushing
 * columns are NOT a clean 2×/4× of the Carrying column at every row (e.g. sum 10 → 157/315,
 * sum 14 → 675/1350, sum 0 → 2.25/4.5), so the canon values are tabulated directly rather
 * than derived. Index = Strength Bonus + Toughness Bonus, clamped to [0, 20]. (BUG-Q-235.)
 */

// Table 9-33 columns, indexed by SB+TB (0..20).
const CARRYING_BY_SUM = [0.9, 2.25, 4.5, 9, 18, 27, 36, 45, 56, 67, 78, 90, 112, 225, 337, 450, 675, 900, 1350, 1800, 2250];
const LIFTING_BY_SUM = [2.25, 4.5, 9, 18, 36, 54, 72, 90, 112, 135, 157, 180, 225, 450, 675, 900, 1350, 1800, 2700, 3600, 4500];
const PUSHING_BY_SUM = [4.5, 9, 18, 36, 72, 108, 144, 180, 225, 270, 315, 360, 450, 900, 1350, 1800, 2700, 3600, 5400, 7200, 9000];

/** Clamp the SB+TB sum to the table's [0, 20] index range. */
function sumIndex(attributeBonus) {
    if (!Number.isFinite(attributeBonus)) return 0;
    return Math.min(Math.max(Math.floor(attributeBonus), 0), 20);
}

/** Maximum Carrying Weight (kg) for a given SB+TB sum. */
export function carryingWeight(attributeBonus) {
    return CARRYING_BY_SUM[sumIndex(attributeBonus)];
}

/** Maximum Lifting Weight (kg) for a given SB+TB sum. */
export function liftingWeight(attributeBonus) {
    return LIFTING_BY_SUM[sumIndex(attributeBonus)];
}

/** Maximum Pushing Weight (kg) for a given SB+TB sum. */
export function pushingWeight(attributeBonus) {
    return PUSHING_BY_SUM[sumIndex(attributeBonus)];
}
