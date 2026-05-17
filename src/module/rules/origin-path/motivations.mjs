/**
 * Origin Path — Motivation.
 * RT Core Rulebook Ch.I "Motivation" + Into the Storm Ch.I "New Motivation Options".
 *
 * 6 corebook + 1 ItS broad heading (Knowledge, with 3 sub-options).
 */
export function motivationOptions() {
    return [
        // RT Core (p.29)
        { key: 'endurance', label: 'Endurance', source: 'Rogue Trader Core, p.29' },
        { key: 'fortune', label: 'Fortune', source: 'Rogue Trader Core, p.30' },
        { key: 'vengeance', label: 'Vengeance', source: 'Rogue Trader Core, p.30' },
        { key: 'renown', label: 'Renown', source: 'Rogue Trader Core, p.30' },
        { key: 'pride', label: 'Pride', source: 'Rogue Trader Core, p.30' },
        { key: 'prestige', label: 'Prestige', source: 'Rogue Trader Core, p.30' },
        // Into the Storm (p.25)
        { key: 'knowledge', label: 'Knowledge (ItS — replaces Vengeance or Pride)', source: 'Into the Storm, p.25' },
    ];
}
