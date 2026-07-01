/**
 * Armour helpers (pure — no Foundry globals) so the per-location "which worn
 * armour wins" logic is node-testable.
 */

/**
 * Effective Armour Points for a single worn piece at one location.
 *
 * Best Craftsmanship armour provides an extra Armour Point (RT Core p.138).
 * The bonus only applies where the armour actually covers the location (base
 * AP > 0), so an uncovered location stays 0.
 *
 * @param {number} base            worn AP at the location before craftsmanship
 * @param {string} craftsmanship   e.g. 'Common' | 'Poor' | 'Good' | 'Best'
 * @returns {number} effective AP
 */
export function effectiveArmourAP(base, craftsmanship) {
    const val = Number(base) || 0;
    if (val <= 0) return 0;
    return craftsmanship === 'Best' ? val + 1 : val;
}
