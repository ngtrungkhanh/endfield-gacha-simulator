import { SimulatorPlayer, runSingleBannerForPlayer, strategies, generateMetaBannerIndices } from './strategies.js';

function mulberry32(seed) {
    let value = seed >>> 0;
    return () => {
        value += 0x6D2B79F5;
        let result = value;
        result = Math.imul(result ^ (result >>> 15), result | 1);
        result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
        return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
}

export function seedToUint32(seed) {
    const text = String(seed).trim();
    if (/^\d+$/.test(text)) return Number(BigInt(text) & 0xffffffffn);

    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function createRandomSeed() {
    if (globalThis.crypto?.getRandomValues) {
        const values = new Uint32Array(2);
        globalThis.crypto.getRandomValues(values);
        return `${values[0]}${values[1].toString().padStart(10, '0')}`;
    }
    return `${Date.now()}${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
}

function snapshotPlayer(player) {
    return {
        charTickets: player.charTickets,
        arsenalTickets: player.arsenalTickets,
        bondQuota: player.bondQuota,
        totalBondQuotaEarned: player.totalBondQuotaEarned,
        currentDossier: player.currentBannerDossierTickets,
        nextDossier: player.nextBannerDossierTickets,
        featuredCharacters: player.ownedFeaturedCharacters,
        featuredUnique: player.ownedFeaturedUnique,
        featuredDupes: player.ownedFeaturedDupes,
        lechLimited: player.ownedLechLimited,
        standard6: player.ownedStandard6Stars,
        fiveStars: player.owned5Stars,
        featuredWeapons: player.ownedFeaturedWeapons,
        standardWeapons: player.ownedStandard6StarWeapons,
        fiveStarWeapons: player.owned5StarWeapons,
        potentialTokens: player.totalPotentialTokens,
        totalCharPulls: player.totalCharPulls,
        totalLimitedPulls: player.totalLimitedPulls,
        totalUrgentPulls: player.totalUrgentPulls,
        totalWeaponPulls: player.totalWeaponPulls,
        weaponTicketsUsed: player.totalWeaponTicketsUsed,
        weaponSelectors: player.weaponMilestoneSelectors,
        standardPity6: player.standardCharPity.pity6,
        standardPity5: player.standardCharPity.pity5,
        metaBannersSet: player.metaBannersSet ? new Set(player.metaBannersSet) : null,
        timesHit120Guarantee: player.timesHit120Guarantee || 0
    };
}

function delta(after, before, key) {
    return after[key] - before[key];
}

function countCharacterResults(items) {
    return {
        featured6: items.filter(item => item.rarity === 6 && item.isFeatured).length,
        limited6: items.filter(item => item.rarity === 6 && !item.isFeatured && item.isLechLimited).length,
        standard6: items.filter(item => item.rarity === 6 && !item.isFeatured && !item.isLechLimited).length,
        five: items.filter(item => item.rarity === 5).length,
        four: items.filter(item => item.rarity === 4).length
    };
}

function normalizeConfig(config) {
    const numBanners = Math.min(100, Math.max(1, Math.trunc(Number(config.numBanners) || 10)));
    const defaultMeta = Math.floor(numBanners * 0.3);
    const normalized = {
        strategyId: config.strategyId || 'save_commit',
        seed: String(config.seed || '').trim() || createRandomSeed(),
        numBanners,
        numMetaBanners: config.numMetaBanners !== undefined ? Math.max(0, Math.min(numBanners, Math.trunc(Number(config.numMetaBanners)))) : defaultMeta,
        startingCharTickets: Math.max(0, Math.trunc(Number(config.startingCharTickets) || 0)),
        startingWeaponTickets: Math.max(0, Math.trunc(Number(config.startingWeaponTickets) || 0)),
        incomePerBanner: Math.max(0, Math.trunc(Number(config.incomePerBanner) || 0)),
        weaponIncomePerBanner: Math.max(0, Math.trunc(Number(config.weaponIncomePerBanner) || 0))
    };
    if (!strategies[normalized.strategyId]) throw new Error(`Unknown strategy: ${normalized.strategyId}`);
    normalized.numericSeed = seedToUint32(normalized.seed);
    return normalized;
}

export function runSingleDetailedSimulation(config) {
    const runConfig = normalizeConfig(config);
    const player = new SimulatorPlayer(1);
    player.charTickets = runConfig.startingCharTickets;
    player.arsenalTickets = runConfig.startingWeaponTickets;

    const charState = {
        pity6: 0,
        pity5: 0,
        pullsSinceFeatured: 0,
        bannerPullsCount: 0,
        guarantee120Consumed: false,
        milestone30Triggered: false,
        milestone60Triggered: false,
        potentialTokensThisBanner: 0
    };
    const weaponState = {
        issuesCount: 0,
        issuesSince6: 0,
        issuesSinceFeatured: 0,
        featuredGuaranteeConsumed: false
    };

    const banners = [];
    const originalRandom = Math.random;
    try {
        Math.random = mulberry32(runConfig.numericSeed);
        const metaRandom = mulberry32(runConfig.numericSeed + 9999);
        const metaBannersSet = generateMetaBannerIndices(runConfig.numBanners, runConfig.numMetaBanners, metaRandom);
        player.metaBannersSet = metaBannersSet;
        for (let bannerIndex = 0; bannerIndex < runConfig.numBanners; bannerIndex++) {
            const before = snapshotPlayer(player);
            const incomingDossier = player.nextBannerDossierTickets;
            const result = runSingleBannerForPlayer(
                runConfig.strategyId,
                player,
                charState,
                weaponState,
                runConfig.incomePerBanner,
                runConfig.weaponIncomePerBanner,
                bannerIndex,
                runConfig.numBanners
            );
            const after = snapshotPlayer(player);
            const regularLimited = result.charPulls.filter(item => !item.isUrgent);
            const urgent = result.charPulls.filter(item => item.isUrgent);
            const allCharacters = [...result.standardPulls, ...result.charPulls];
            const quotaEarned = allCharacters.reduce((sum, item) => sum + (item.quotaEarned || 0), 0);
            const quotaTickets = allCharacters.reduce((sum, item) => sum + (item.quotaTicketsExchanged || 0), 0);

            banners.push({
                index: bannerIndex + 1,
                before,
                after,
                incomingDossier,
                result,
                regularLimited,
                urgent,
                standardCounts: countCharacterResults(result.standardPulls),
                limitedCounts: countCharacterResults(regularLimited),
                urgentCounts: countCharacterResults(urgent),
                charPityAfter: { ...charState },
                weaponPityAfter: { ...weaponState },
                quotaEarned,
                quotaTickets,
                newFeatured: delta(after, before, 'featuredCharacters'),
                newFeaturedWeapons: delta(after, before, 'featuredWeapons'),
                newPotentialTokens: delta(after, before, 'potentialTokens'),
                weaponTicketsSpent: delta(after, before, 'weaponTicketsUsed')
            });
        }
    } finally {
        Math.random = originalRandom;
    }

    return {
        config: runConfig,
        banners,
        summary: snapshotPlayer(player)
    };
}
