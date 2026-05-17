/**
 * Origin Path — Home Worlds.
 * RT Core Rulebook Ch.I "Home World Options" + Into the Storm Ch.I "New Home Worlds".
 *
 * 6 corebook + 6 ItS = 12 canonical options. Each ItS option replaces a specific
 * corebook entry on the Origin Path chart (noted in the description).
 */
export function homeWorldOptions() {
    return [
        // RT Core Rulebook (p.17-23)
        { key: 'deathWorld', label: 'Death World', source: 'Rogue Trader Core, p.18' },
        { key: 'voidBorn', label: 'Void Born', source: 'Rogue Trader Core, p.20' },
        { key: 'forgeWorld', label: 'Forge World', source: 'Rogue Trader Core, p.21' },
        { key: 'hiveWorld', label: 'Hive World', source: 'Rogue Trader Core, p.22' },
        { key: 'imperialWorld', label: 'Imperial World', source: 'Rogue Trader Core, p.23' },
        { key: 'nobleBorn', label: 'Noble Born', source: 'Rogue Trader Core, p.24' },
        // Into the Storm (p.8-16)
        { key: 'frontierWorld', label: 'Frontier World (ItS — replaces Death World)', source: 'Into the Storm, p.8' },
        { key: 'footfallen', label: 'Footfallen (ItS — replaces Void Born)', source: 'Into the Storm, p.10' },
        { key: 'fortressWorld', label: 'Fortress World (ItS — replaces Forge World)', source: 'Into the Storm, p.12' },
        { key: 'battlefleet', label: 'Battlefleet (ItS — replaces Hive World)', source: 'Into the Storm, p.13' },
        { key: 'penalWorld', label: 'Penal World (ItS — replaces Imperial World)', source: 'Into the Storm, p.14' },
        { key: 'childOfDynasty', label: 'Child of Dynasty (ItS — replaces Noble Born)', source: 'Into the Storm, p.16' },
    ];
}
