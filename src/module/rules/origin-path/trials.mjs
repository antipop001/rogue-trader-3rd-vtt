/**
 * Origin Path — Trials and Travails.
 * RT Core Rulebook Ch.I "Trials and Travails" + Into the Storm Ch.I "New Trials
 * and Travails Options".
 *
 * 6 corebook + 3 ItS broad headings (each with 3 sub-options; record specific
 * choice in the notes field).
 */
export function trialsAndTravailsOptions() {
    return [
        // RT Core (p.27)
        { key: 'theHandOfWar', label: 'The Hand of War', source: 'Rogue Trader Core, p.27' },
        { key: 'pressGanged', label: 'Press-Ganged', source: 'Rogue Trader Core, p.27' },
        { key: 'calamity', label: 'Calamity', source: 'Rogue Trader Core, p.28' },
        { key: 'shipLorn', label: 'Ship-lorn', source: 'Rogue Trader Core, p.28' },
        { key: 'darkVoyage', label: 'Dark Voyage', source: 'Rogue Trader Core, p.28' },
        { key: 'highVendetta', label: 'High Vendetta', source: 'Rogue Trader Core, p.28' },
        // Into the Storm (p.23-24)
        { key: 'darkness', label: 'Darkness (ItS — replaces The Hand of War or High Vendetta)', source: 'Into the Storm, p.23' },
        { key: 'aProductOfUpbringing', label: 'A Product of Upbringing (ItS — replaces Press-Ganged or Ship-lorn)', source: 'Into the Storm, p.23' },
        { key: 'lostWorlds', label: 'Lost Worlds (ItS — replaces Calamity or Dark Voyage)', source: 'Into the Storm, p.24' },
    ];
}
