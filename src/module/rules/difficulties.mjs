// RT 1e Test Difficulty ladder (RT Core p.22 — Easy +30 … Very Hard −30). The DH2/Only War
// tiers (Simple +40, Arduous −40, and the wider bands) are NOT RT 1e, and the −30 tier is
// labelled "Very Hard", not "Very Difficult". (QA-089.)
export function rollDifficulties() {
    return {
        '30': 'Easy (+30)',
        '20': 'Routine (+20)',
        '10': 'Ordinary (+10)',
        '0': 'Challenging (+0)',
        '-10': 'Difficult (-10)',
        '-20': 'Hard (-20)',
        '-30': 'Very Hard (-30)',
    };
}
