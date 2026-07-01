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

// RT Core p.159 "Sustaining Multiple Powers": the bonus fires only "while
// maintaining multiple active powers" (two or more) and adds "+10 to the
// result rolled on the chart per additional power he is maintaining." Reading
// `sustained` as the TOTAL count maintained (consistent with sustainedPsyPenalty
// above), maintaining a single power is not "multiple" → 0, and beyond that the
// "additional" powers number one fewer than the total (2 maintained = 1
// additional = +10, 3 = +20, …). (BUG-Q-231: the old code added a flat +10, and
// the first fix used n*10 which both fired at a single power and over-counted.)
export function sustainedPhenomenaBonus(sustained) {
    const n = Number(sustained) || 0;
    return n >= 2 ? (n - 1) * 10 : 0;
}
