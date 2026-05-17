/**
 * Origin Path — Birthrights.
 * RT Core Rulebook Ch.I "Birthright" + Into the Storm Ch.I "New Birthright Options".
 *
 * 6 corebook entries + 3 ItS broad headings (each ItS heading contains 3 sub-options
 * the player picks between; record the specific choice in the notes field).
 */
export function birthrightOptions() {
    return [
        // RT Core (p.24)
        { key: 'scavenger', label: 'Scavenger', source: 'Rogue Trader Core, p.24' },
        { key: 'scapegrace', label: 'Scapegrace', source: 'Rogue Trader Core, p.24' },
        { key: 'stubjack', label: 'Stubjack', source: 'Rogue Trader Core, p.24' },
        { key: 'childOfTheCreed', label: 'Child of the Creed', source: 'Rogue Trader Core, p.24' },
        { key: 'savant', label: 'Savant', source: 'Rogue Trader Core, p.24' },
        { key: 'vaunted', label: 'Vaunted', source: 'Rogue Trader Core, p.24' },
        // Into the Storm broad-heading options (3 sub-options each; capture choice in notes)
        { key: 'fringeSurvivor', label: 'Fringe Survivor (ItS — replaces Scavenger or Savant)', source: 'Into the Storm, p.17' },
        { key: 'anUnnaturalOrigin', label: 'An Unnatural Origin (ItS — replaces Scapegrace or Stubjack)', source: 'Into the Storm, p.18' },
        { key: 'inServiceToTheThrone', label: 'In Service to the Throne (ItS — replaces Child of the Creed or Vaunted)', source: 'Into the Storm, p.19' },
    ];
}
