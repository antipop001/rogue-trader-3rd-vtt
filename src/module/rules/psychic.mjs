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

// RT Core p.159 "Sustaining Multiple Powers": if a psyker suffers Psychic
// Phenomena while maintaining other active powers, add "+10 to the result
// rolled on the chart per additional power he is maintaining." The count of
// powers being maintained (other than the one being cast now) are all
// "additional", so the bonus scales per power — not a flat +10.
// (BUG-Q-231: the old code added a flat +10 regardless of count.)
export function sustainedPhenomenaBonus(sustained) {
    const n = Number(sustained) || 0;
    return n > 0 ? n * 10 : 0;
}
