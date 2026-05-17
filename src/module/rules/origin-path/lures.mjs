/**
 * Origin Path — Lure of the Void.
 * RT Core Rulebook Ch.I "Lure of the Void" + Into the Storm Ch.I "New Lure of the Void Options".
 *
 * 6 corebook + 3 ItS broad headings (each with 3 sub-options; record specific
 * choice in the notes field).
 */
export function lureOfTheVoidOptions() {
    return [
        // RT Core (p.25)
        { key: 'tainted', label: 'Tainted', source: 'Rogue Trader Core, p.25' },
        { key: 'criminal', label: 'Criminal', source: 'Rogue Trader Core, p.25' },
        { key: 'renegade', label: 'Renegade', source: 'Rogue Trader Core, p.26' },
        { key: 'dutyBound', label: 'Duty Bound', source: 'Rogue Trader Core, p.26' },
        { key: 'zealot', label: 'Zealot', source: 'Rogue Trader Core, p.26' },
        { key: 'chosenByDestiny', label: 'Chosen by Destiny', source: 'Rogue Trader Core, p.26' },
        // Into the Storm (p.20-22)
        { key: 'crusade', label: 'Crusade (ItS — replaces Criminal or Renegade)', source: 'Into the Storm, p.20' },
        { key: 'hunter', label: 'Hunter (ItS — replaces Tainted or Renegade)', source: 'Into the Storm, p.21' },
        { key: 'newHorizons', label: 'New Horizons (ItS — replaces Zealot or Chosen by Destiny)', source: 'Into the Storm, p.22' },
    ];
}
