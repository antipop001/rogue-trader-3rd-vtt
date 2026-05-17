/**
 * Origin Path — Career.
 * RT Core Rulebook Ch.II "Career Paths" + Into the Storm Ch.II additions.
 *
 * 8 corebook careers + 2 ItS alien careers = 10 total.
 */
export function careerOptions() {
    return [
        // RT Core Rulebook (Ch.II, pp.35-73)
        { key: 'rogueTrader', label: 'Rogue Trader', source: 'Rogue Trader Core, p.36' },
        { key: 'archMilitant', label: 'Arch-Militant', source: 'Rogue Trader Core, p.42' },
        { key: 'astropathTranscendent', label: 'Astropath Transcendent', source: 'Rogue Trader Core, p.48' },
        { key: 'explorator', label: 'Explorator', source: 'Rogue Trader Core, p.54' },
        { key: 'missionary', label: 'Missionary', source: 'Rogue Trader Core, p.60' },
        { key: 'navigator', label: 'Navigator', source: 'Rogue Trader Core, p.65' },
        { key: 'seneschal', label: 'Seneschal', source: 'Rogue Trader Core, p.69' },
        { key: 'voidMaster', label: 'Void-master', source: 'Rogue Trader Core, p.73' },
        // Into the Storm (Ch.II)
        { key: 'krootMercenary', label: 'Kroot Mercenary (ItS)', source: 'Into the Storm, p.36' },
        { key: 'orkFreebooter', label: 'Ork Freebooter (ItS)', source: 'Into the Storm, p.52' },
    ];
}
