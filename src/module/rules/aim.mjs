// QA-088: the former `calculateAimBonus()` was a dead no-op (it read the weapon/power and did
// nothing) with no callers — Aim applies directly via `rollData.modifiers.aim`. Removed.

export function aimModifiers() {
    return {
        0: 'None',
        10: 'Half (+10)',
        20: 'Full (+20)',
    };
}
