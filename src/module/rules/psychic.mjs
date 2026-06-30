// RT Core p.159 "Sustaining Multiple Powers": maintaining two powers at once
// reduces the effective Psy Rating of both by 2, three powers by 3, and so on.
// Maintaining a single power has NO penalty — the reduction only kicks in at
// two or more sustained powers, and then equals the total count maintained.
// (BUG-Q-221: the old code subtracted the raw count, so one sustained power
// wrongly dropped the effective Psy Rating by 1.)
export function sustainedPsyPenalty(sustained) {
    const n = Number(sustained) || 0;
    return n >= 2 ? n : 0;
}
