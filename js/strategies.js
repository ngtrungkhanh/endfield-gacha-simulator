import {
    rollCharacter,
    rollStandardCharacter,
    rollWeaponIssue,
    calculateArsenalTicketsRebate,
    calculateMinimumTicketsRequired
} from './gacha-math.js';

/**
 * Lớp định nghĩa cấu trúc dữ liệu người chơi trong giả lập
 */
export class SimulatorPlayer {
    constructor(id) {
        this.id = id;
        
        // Tài nguyên nhân vật
        this.charTickets = 0;              // Số vé nhân vật hiện có (Oroberyl quy đổi)
        this.charTicketsDebt = 0;          // Nợ vé nhân vật (phải nạp tiền thêm) - giữ làm 0
        this.nextBannerDossierTickets = 0; // Lượt roll Dossier tích lũy được trong banner hiện tại (dành cho banner sau)
        this.currentBannerDossierTickets = 0; // Lượt roll Dossier khả dụng ở banner hiện tại
        
        // Tiền tệ mới Bond Quota
        this.bondQuota = 0;                // Số dư Bond Quota hiện tại
        this.totalBondQuotaEarned = 0;     // Thống kê tổng Bond Quota kiếm được
        
        // Theo dõi sở hữu nhân vật để tính Dupe
        this.ownedCharactersSet = new Set();
        
        // Pity của banner thường
        this.standardCharPity = {
            pity6: 0,
            pity5: 0,
            bannerPullsCount: 0
        };
        
        // Tài nguyên vũ khí
        this.arsenalTickets = 0;           // Số vé vũ khí hiện có (Arsenal Tickets)
        this.arsenalTicketsDebt = 0;       // Nợ vé vũ khí - giữ làm 0
        this.totalWeaponTicketsUsed = 0;   // Thống kê tổng vé vũ khí đã dùng
        
        // Thống kê nhân vật
        this.ownedFeaturedCharacters = 0;  // Số lượng nhân vật rate-up sở hữu
        this.ownedFeaturedUnique = 0;      // Số lượng limited unique sở hữu
        this.ownedFeaturedDupes = 0;       // Số lượng limited dupe sở hữu
        this.ownedLechLimited = 0;         // Số lượng 6★ lệch limited
        this.ownedStandard6Stars = 0;      // Số lượng nhân vật 6★ lệch rate
        this.owned5Stars = 0;              // Số lượng nhân vật 5★
        this.totalCharPulls = 0;           // Tổng số lượt pull nhân vật tiêu chuẩn đã thực hiện
        this.totalLimitedPulls = 0;        // Tổng lượt Limited có tính pity (không gồm Standard/Urgent)
        this.totalUrgentPulls = 0;         // Tổng số lượt Urgent pull miễn phí
        this.totalDossierPulls = 0;        // Tổng số lượt Dossier pull
        this.totalPotentialTokens = 0;     // Token Potential nhận tại mỗi mốc 240 của banner
        this.timesHit120Guarantee = 0;     // Số lần chạm bảo hiểm 120 pulls
        
        // Thống kê vũ khí
        this.ownedFeaturedWeapons = 0;     // Số lượng vũ khí rate-up sở hữu
        this.ownedStandard6StarWeapons = 0;// Số lượng vũ khí 6★ lệch rate
        this.owned5StarWeapons = 0;        // Số lượng vũ khí 5★
        this.ownedMetaFeaturedCharacters = 0; // Số nhân vật Featured trúng trên banner Meta
        this.ownedMetaFeaturedWeapons = 0;    // Số vũ khí Featured trúng trên banner Meta
        this.totalWeaponPulls = 0;         // Tổng số lượt pull vũ khí
        this.weaponMilestoneSelectors = 0; // Số hộp chọn vũ khí nhận từ chu kỳ phần thưởng Issue
    }
}

// Bể tướng giả lập để check dupe
const STANDARD_6STAR_POOL = ['std_6_1', 'std_6_2', 'std_6_3', 'std_6_4', 'std_6_5', 'std_6_6'];
const LECH_LIMITED_6STAR_POOL = ['lim_6_1', 'lim_6_2', 'lim_6_3'];
const CHAR_5STAR_POOL = Array.from({ length: 15 }, (_, i) => `char_5_${i + 1}`);

/**
 * Xử lý khi quay trúng nhân vật: kiểm tra dupe để cộng Bond Quota & tự động đổi thành vé
 */
export function processCharacterDuplicateAndQuota(player, result, bannerIdx) {
    let charId = '';
    result.characterId = null;
    result.isDuplicate = false;
    result.quotaEarned = 0;
    result.quotaTicketsExchanged = 0;
    
    if (result.rarity === 6) {
        if (result.isFeatured) {
            charId = `featured_char_banner_${bannerIdx}`;
        } else {
            if (result.isLechLimited) {
                const randIdx = Math.floor(Math.random() * LECH_LIMITED_6STAR_POOL.length);
                charId = LECH_LIMITED_6STAR_POOL[randIdx];
            } else {
                const randIdx = Math.floor(Math.random() * STANDARD_6STAR_POOL.length);
                charId = STANDARD_6STAR_POOL[randIdx];
            }
        }
    } else if (result.rarity === 5) {
        const randIdx = Math.floor(Math.random() * CHAR_5STAR_POOL.length);
        charId = CHAR_5STAR_POOL[randIdx];
    } else {
        result.bondQuotaAfter = player.bondQuota;
        result.charTicketsAfterQuota = player.charTickets;
        return result; // 4-Star không có Bond Quota
    }

    const wasOwned = player.ownedCharactersSet.has(charId);
    let quotaEarned = 0;
    if (result.rarity === 6) {
        if (result.isFeatured || result.isLechLimited) {
            if (wasOwned) {
                quotaEarned = 50;
            }
        } else {
            // Lệch Standard: mặc định luôn là dupe, luôn nhận 50 Quota!
            quotaEarned = 50;
        }
    } else if (result.rarity === 5) {
        quotaEarned = 10;
    }

    if (quotaEarned > 0) {
        player.bondQuota += quotaEarned;
        player.totalBondQuotaEarned += quotaEarned;
        
        // Tự động đổi Bond Quota sang vé nhân vật (25 Quota = 1 vé)
        if (player.bondQuota >= 25) {
            const ticketsExchanged = Math.floor(player.bondQuota / 25);
            player.charTickets += ticketsExchanged;
            player.bondQuota -= ticketsExchanged * 25;
            result.quotaTicketsExchanged = ticketsExchanged;
        }
    }

    // Vẫn cập nhật ownedCharactersSet để tính toán thống kê Unique/Dupes
    player.ownedCharactersSet.add(charId);
    result.characterId = charId;
    result.isDuplicate = wasOwned;
    result.quotaEarned = quotaEarned;
    result.bondQuotaAfter = player.bondQuota;
    result.charTicketsAfterQuota = player.charTickets;
    return result;
}

/**
 * Quay 15 lượt trên banner thường miễn phí
 */
function executeStandardBannerRolls(player, rollsCount, bannerIdx) {
    const pullsRecord = [];
    for (let i = 0; i < rollsCount; i++) {
        const standardPity6Before = player.standardCharPity.pity6;
        const result = rollStandardCharacter(player.standardCharPity);
        result.standardPity6Before = standardPity6Before;
        result.standardPity6After = player.standardCharPity.pity6;
        result.standardPity5After = player.standardCharPity.pity5;
        pullsRecord.push(result);
        
        processCharacterDuplicateAndQuota(player, result, bannerIdx);
        result.dossierTicketsAfter = player.currentBannerDossierTickets;
        
        if (result.rarity === 6) {
            player.ownedStandard6Stars++;
        } else if (result.rarity === 5) {
            player.owned5Stars++;
        }
        player.totalCharPulls++;
    }
    return pullsRecord;
}

/**
 * Quay 10 lượt trên banner limited miễn phí (bắt buộc, không tốn vé ví, dạng x10 liên tục)
 */
function executeFreeLimitedRolls(player, bannerState, bannerIdx, totalBanners = 10) {
    const pullsRecord = [];
    let gotFeatured = false;
    let gotFeaturedThisBanner = false;

    const executeSinglePull = () => {
        const pity6Before = bannerState.pity6;
        const pullsSinceFeaturedBefore = bannerState.pullsSinceFeatured;
        // rollCharacter tăng bộ đếm trước khi xét guarantee, nên trạng thái 119
        // nghĩa là lượt sắp thực hiện chính là pull bảo hiểm thứ 120.
        const isGuaranteedFeatured = bannerState.guarantee120Consumed !== true && bannerState.pullsSinceFeatured >= 119;
        const result = rollCharacter(bannerState, false);
        result.actionPhase = 'free';
        result.rollMode = 'free-x10';
        result.pity6Before = pity6Before;
        result.pullsSinceFeaturedBefore = pullsSinceFeaturedBefore;
        result.pity6After = bannerState.pity6;
        result.pity5After = bannerState.pity5;
        result.pullsSinceFeaturedAfter = bannerState.pullsSinceFeatured;
        result.bannerPullsCountAfter = bannerState.bannerPullsCount;
        result.guarantee120ConsumedAfter = bannerState.guarantee120Consumed === true;
        pullsRecord.push(result);
        
        processCharacterDuplicateAndQuota(player, result, bannerIdx);
        result.dossierTicketsAfter = player.currentBannerDossierTickets;
        
        if (result.rarity === 6) {
            if (result.isFeatured) {
                gotFeatured = true;
                player.ownedFeaturedCharacters++;
                if (isGuaranteedFeatured) {
                    player.timesHit120Guarantee++;
                }
                if (isMetaBanner(player, bannerIdx, totalBanners)) {
                    player.ownedMetaFeaturedCharacters++;
                }
                if (!gotFeaturedThisBanner) {
                    player.ownedFeaturedUnique++;
                    gotFeaturedThisBanner = true;
                } else {
                    player.ownedFeaturedDupes++;
                }
            } else {
                if (result.isLechLimited) {
                    player.ownedLechLimited++;
                } else {
                    player.ownedStandard6Stars++;
                }
            }
        } else if (result.rarity === 5) {
            player.owned5Stars++;
        }

        player.totalCharPulls++;
        player.totalLimitedPulls++;
    };

    for (let i = 0; i < 10; i++) {
        executeSinglePull();
    }
    return { pullsRecord, gotFeatured };
}

// Helper xác định banner Meta (Ưu tiên kiểm tra Set ngẫu nhiên của player, nếu không có sẽ dùng phân bổ đều làm fallback)
export const isMetaBanner = (player, bannerIdx, totalBanners) => {
    if (player && player.metaBannersSet) {
        return player.metaBannersSet.has(bannerIdx);
    }
    const numMeta = Math.floor(totalBanners * 0.3);
    if (numMeta <= 0) return false;
    
    const step = totalBanners / numMeta;
    for (let m = 0; m < numMeta; m++) {
        const idx = Math.floor(m * step + step / 2);
        if (idx === bannerIdx) return true;
    }
    return false;
};

// Hàm sinh tập chỉ số banner Meta ngẫu nhiên
export function generateMetaBannerIndices(numBanners, numMeta, customRandom = Math.random) {
    const indices = [];
    for (let i = 0; i < numBanners; i++) {
        indices.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(customRandom() * (i + 1));
        const temp = indices[i];
        indices[i] = indices[j];
        indices[j] = temp;
    }
    return new Set(indices.slice(0, numMeta));
}

const META_RESERVE_NO_DOSSIER = calculateMinimumTicketsRequired({
    pity5: 0,
    pity120: 0,
    quota: 0,
    targetRolls: [0, 120]
});

const META_RESERVE_WITH_DOSSIER = calculateMinimumTicketsRequired({
    pity5: 0,
    pity120: 60,
    quota: 0,
    targetRolls: [60, 120]
});

function calculateRequiredTickets(player, bannerState, targetRolls) {
    return calculateMinimumTicketsRequired({
        pity5: bannerState.pity5 || 0,
        // Nếu Featured ra sớm thì chiến thuật thông thường đã dừng. Pull 60 vẫn
        // tiếp tục tới mốc đã chọn, nên dùng tiến độ banner thay vì bộ đếm đã reset.
        pity120: bannerState.bannerPullsCount || 0,
        quota: player.bondQuota || 0,
        targetRolls
    });
}

function calculateFutureTicketIncome(ticketIncome, bannerIdx, targetBannerIdx, options) {
    const schedule = options.ticketIncomeSchedule;
    const fallbackIncome = Number.isFinite(Number(options.defaultTicketIncome))
        ? Number(options.defaultTicketIncome)
        : ticketIncome;
    if (Array.isArray(schedule)) {
        let total = 0;
        for (let idx = bannerIdx + 1; idx <= targetBannerIdx; idx++) {
            total += idx < schedule.length
                ? (Number(schedule[idx]) || 0)
                : fallbackIncome;
        }
        return total;
    }
    return Math.max(0, targetBannerIdx - bannerIdx) * fallbackIncome;
}

/**
 * Xác định khi nào phải chuyển sang x1 để không đi xuyên qua mốc 30/60/120.
 * Còn đúng 10 lượt vẫn được phép dùng x10; chỉ ép x1 khi còn từ 1 đến 9 lượt.
 */
export function shouldForceSingleNearMilestone(bannerState, currentBannerPulls) {
    const distanceTo30 = 30 - currentBannerPulls;
    const distanceTo60 = 60 - currentBannerPulls;
    const distanceTo120 = 120 - bannerState.pullsSinceFeatured;

    return (!bannerState.milestone30Triggered && distanceTo30 > 0 && distanceTo30 < 10) ||
           (!bannerState.milestone60Triggered && distanceTo60 > 0 && distanceTo60 < 10) ||
           (bannerState.guarantee120Consumed !== true && distanceTo120 > 0 && distanceTo120 < 10);
}

// Helper thực hiện vòng quay nhân vật hợp nhất sử dụng tài nguyên trong ví
// Quay x10 mặc định; chuyển x1 gần mốc 30/60, pity 80 và guarantee 120.
function executeCharacterPullSequence(player, bannerState, targetPulls, stopOnFeatured, bannerIdx, gotFeaturedThisBanner = false, forceSingleRoll = false, totalBanners = 10) {
    const pullsRecord = [];
    let gotFeatured = gotFeaturedThisBanner;
    let currentBannerPulls = bannerState.bannerPullsCount; // Đã quay bao gồm 10 roll free
    let rollBatchCounter = 0;

    bannerState.milestone30Triggered = bannerState.milestone30Triggered === true;
    bannerState.milestone60Triggered = bannerState.milestone60Triggered === true;
    bannerState.potentialTokensThisBanner = bannerState.potentialTokensThisBanner || 0;

    // Định nghĩa hàm thực hiện một lượt pull lẻ
    const executeSinglePull = (isUrgent = false, force5Star = false, rollMode = 'x1', rollBatchId = null) => {
        const pity6Before = bannerState.pity6;
        const pullsSinceFeaturedBefore = bannerState.pullsSinceFeatured;
        // Kiểm tra trước khi roll: 119 lượt đã qua => lượt hiện tại chạm mốc 120.
        const isGuaranteedFeatured = !isUrgent && bannerState.guarantee120Consumed !== true && bannerState.pullsSinceFeatured >= 119;
        const result = rollCharacter(bannerState, isUrgent, force5Star);
        result.pity6Before = pity6Before;
        result.pullsSinceFeaturedBefore = pullsSinceFeaturedBefore;
        result.rollMode = isUrgent ? 'urgent' : rollMode;
        result.rollBatchId = rollBatchId;
        result.pity6After = bannerState.pity6;
        result.pity5After = bannerState.pity5;
        result.pullsSinceFeaturedAfter = bannerState.pullsSinceFeatured;
        result.bannerPullsCountAfter = bannerState.bannerPullsCount;
        result.guarantee120ConsumedAfter = bannerState.guarantee120Consumed === true;
        pullsRecord.push(result);
        
        processCharacterDuplicateAndQuota(player, result, bannerIdx);
        result.dossierTicketsAfter = player.currentBannerDossierTickets;
        
        if (result.rarity === 6) {
            if (result.isFeatured) {
                gotFeatured = true;
                player.ownedFeaturedCharacters++;
                if (isGuaranteedFeatured) {
                    player.timesHit120Guarantee++;
                }
                if (isMetaBanner(player, bannerIdx, totalBanners)) {
                    player.ownedMetaFeaturedCharacters++;
                }
                if (!gotFeaturedThisBanner) {
                    player.ownedFeaturedUnique++;
                    gotFeaturedThisBanner = true;
                } else {
                    player.ownedFeaturedDupes++;
                }
            } else {
                if (result.isLechLimited) {
                    player.ownedLechLimited++;
                } else {
                    player.ownedStandard6Stars++;
                }
            }
        } else if (result.rarity === 5) {
            player.owned5Stars++;
        }

        if (isUrgent) {
            player.totalUrgentPulls++;
        } else {
            player.totalCharPulls++;
            player.totalLimitedPulls++;
            currentBannerPulls++;

            // Kích hoạt mốc 30 roll Urgent Recruitment
            if (currentBannerPulls >= 30 && !bannerState.milestone30Triggered) {
                bannerState.milestone30Triggered = true;
                let hasHighRarity = false;
                for (let k = 0; k < 10; k++) {
                    const force5Star = (k === 9 && !hasHighRarity);
                    const res = executeSinglePull(true, force5Star, 'urgent', `urgent-${currentBannerPulls}`); // Quay Urgent miễn phí, không bao giờ dừng!
                    if (res && res.rarity >= 5) {
                        hasHighRarity = true;
                    }
                }
            }

            // Nhận quà mốc 60 roll Dossier
            if (currentBannerPulls >= 60 && !bannerState.milestone60Triggered) {
                bannerState.milestone60Triggered = true;
                player.nextBannerDossierTickets += 10;
            }

            // Mỗi 240 lượt trên cùng banner nhận một token Potential featured.
            while (currentBannerPulls >= (bannerState.potentialTokensThisBanner + 1) * 240) {
                bannerState.potentialTokensThisBanner++;
                player.totalPotentialTokens++;
            }
        }
        return result;
    };

    while (currentBannerPulls < targetPulls && (!stopOnFeatured || !gotFeatured)) {
        const pullsNeeded = targetPulls - currentBannerPulls;
        const totalTicketsAvailable = player.currentBannerDossierTickets + player.charTickets;
        const nearProtectedMilestone = shouldForceSingleNearMilestone(bannerState, currentBannerPulls);

        // Điều kiện để quay x10:
        // 1. Cần ít nhất 10 lượt quay nữa để đạt mốc mục tiêu.
        // 2. Tổng số vé khả dụng lớn hơn hoặc bằng 10.
        // 3. Pity hiện tại < 71 (chưa sát mốc soft/hard pity 80).
        // 4. Bảo hiểm Featured hiện tại < 111.
        // 5. Nếu chiến thuật dừng khi ra Featured thì ta chưa trúng Featured (gotFeatured == false).
        const canRoll10 = !forceSingleRoll &&
                          pullsNeeded >= 10 && 
                          totalTicketsAvailable >= 10 && 
                          bannerState.pity6 < 71 && 
                          !nearProtectedMilestone &&
                          (!stopOnFeatured || !gotFeatured);

        if (canRoll10) {
            // Quay x10 (thực hiện liên tục 10 lần không ngắt quãng giữa chừng)
            const rollBatchId = ++rollBatchCounter;
            for (let k = 0; k < 10; k++) {
                if (player.currentBannerDossierTickets > 0) {
                    player.currentBannerDossierTickets--;
                    player.totalDossierPulls++;
                } else if (player.charTickets > 0) {
                    player.charTickets--;
                } else {
                    break;
                }
                executeSinglePull(false, false, 'x10', rollBatchId);
            }
        } else {
            // Quay lẻ x1 (được gọi khi sát mốc pity/bảo hiểm để tiết kiệm vé)
            if (player.currentBannerDossierTickets > 0) {
                player.currentBannerDossierTickets--;
                player.totalDossierPulls++;
            } else if (player.charTickets > 0) {
                player.charTickets--;
            } else {
                break;
            }
            executeSinglePull(false, false, 'x1', ++rollBatchCounter);
        }
    }

    return { pullsRecord, gotFeatured };
}

/**
 * Sau khi đã nhận Featured, người chơi có thể dùng tối đa 10 vé còn lại để
 * chạm pull 60 và nhận 10 Dossier cho banner sau. Pull 30 không còn là lý do
 * để chi thêm vé vì Urgent không tăng pity 80 hoặc tiến độ Featured 120.
 */
function executePull60AfterFeatured(
    player,
    bannerState,
    gotFeaturedChar,
    bannerIdx,
    totalBanners,
    ticketIncome,
    options,
    protectNext120 = false
) {
    if (!gotFeaturedChar) return { pullsRecord: [], gotFeatured: false, check: null };

    const currentPulls = bannerState.bannerPullsCount;
    const targetPulls = !bannerState.milestone60Triggered &&
        currentPulls < 60 &&
        60 - currentPulls <= 10
        ? 60
        : 0;

    const pullsNeeded = targetPulls - currentPulls;
    if (targetPulls === 0 || player.charTickets < pullsNeeded) {
        return { pullsRecord: [], gotFeatured: true, check: null };
    }

    let check = null;
    if (protectNext120) {
        const requiredRouteTickets = calculateRequiredTickets(player, bannerState, [targetPulls, 120]);
        const futureIncome = calculateFutureTicketIncome(ticketIncome, bannerIdx, bannerIdx + 1, options);
        const affordable = player.charTickets + futureIncome >= requiredRouteTickets;
        check = {
            targetPulls,
            nextTargetPulls: 120,
            requiredRouteTickets,
            availableTickets: player.charTickets,
            futureIncome,
            affordable
        };
        if (!affordable) {
            return { pullsRecord: [], gotFeatured: true, check };
        }
    }

    const result = executeCharacterPullSequence(
        player,
        bannerState,
        targetPulls,
        false,
        bannerIdx,
        true,
        false,
        totalBanners
    );
    result.pullsRecord.forEach(item => { item.actionPhase = 'finish_milestone'; });
    return { ...result, check };
}

// Helper thực hiện vòng quay vũ khí hợp nhất
function executeWeaponPullSequence(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, maxSpend = Infinity, bannerIdx = 0, totalBanners = 10) {
    player.arsenalTickets += totalArsenalTicketsEarned;
    
    if (!gotFeaturedChar) {
        return [];
    }

    const issuesRecord = [];
    let gotFeatured = false;
    let spent = 0;

    while (!gotFeatured && player.arsenalTickets >= 1980 && (spent + 1980) <= maxSpend) {
        player.arsenalTickets -= 1980;
        player.totalWeaponTicketsUsed += 1980;
        spent += 1980;
        
        const result = rollWeaponIssue(bannerState);
        issuesRecord.push(result);

        player.totalWeaponPulls += 10;

        result.items.forEach(item => {
            if (item.rarity === 6) {
                if (item.isFeatured) {
                    gotFeatured = true;
                    player.ownedFeaturedWeapons++;
                    if (isMetaBanner(player, bannerIdx, totalBanners)) {
                        player.ownedMetaFeaturedWeapons++;
                    }
                } else {
                    player.ownedStandard6StarWeapons++;
                }
            } else if (item.rarity === 5) {
                player.owned5StarWeapons++;
            }
        });

        if (result.milestoneReward === 'selector_box') {
            // Arms OC chỉ chọn vũ khí 6★ ngoài rate-up, không hoàn thành mục tiêu Featured.
            player.ownedStandard6StarWeapons++;
            player.weaponMilestoneSelectors++;
        } else if (result.milestoneReward === 'featured_weapon') {
            gotFeatured = true;
            player.ownedFeaturedWeapons++;
            if (isMetaBanner(player, bannerIdx, totalBanners)) {
                player.ownedMetaFeaturedWeapons++;
            }
        }
    }

    return issuesRecord;
}

export const strategies = {
    // ----------------------------------------------------------------
    // Chiến thuật 1: Save & Commit (Tích lũy an toàn)
    // ----------------------------------------------------------------
    save_commit: {
        id: 'save_commit',
        name: 'Save & Commit',
        desc: 'Nhân vật: Sau phần miễn phí/Dossier, chỉ roll khi vé ví đạt chi phí an toàn động đến mốc 120. Sau Featured, chỉ hoàn tất mốc 60 trong 10 lượt nếu vẫn bảo vệ được mốc 120 banner sau; không chi thêm để cố mốc 30. Vũ khí: Quay khi tích đủ 8 Issues (15.840 vé).',
        
        runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
            return [];
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return [];
        }
    },
    save_commit_single: {
        id: 'save_commit_single',
        name: 'Save & Commit (Roll lẻ)',
        desc: 'Nhân vật: Dùng phép kiểm tra ngân sách động giống Save & Commit, nhưng phần commit quay lẻ x1 từ đầu đến cuối để dừng đúng lượt nhận Featured. Vũ khí: Chỉ quay khi tích đủ 8 Issues (15.840 vé).',
        
        runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
            return [];
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return [];
        }
    },

    // ----------------------------------------------------------------
    // Chiến thuật 2: Yolo / Spend All (Có nhiêu chơi nhiêu)
    // ----------------------------------------------------------------
    yolo: {
        id: 'yolo',
        name: 'Yolo / Spend All',
        desc: 'Nhân vật: Có bao nhiêu vé khả dụng dùng tới Featured hoặc hết vé. Sau Featured, nếu còn tối đa 10 lượt tới mốc 60 và đủ vé thì hoàn tất mốc rồi dừng; không chi thêm để cố mốc 30. Vũ khí: Nếu trúng nhân vật, dùng từng Issue cho đến Featured Weapon hoặc hết Arsenal.',
        
        runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
            return [];
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return [];
        }
    },

    // ----------------------------------------------------------------
    // Chiến thuật 3: Pull 60 mỗi banner (Chiến thuật Mốc 60)
    // ----------------------------------------------------------------
    pull_60: {
        id: 'pull_60',
        name: 'Pull 60',
        desc: 'Nhân vật: Đủ mốc 60 thì đi thẳng tới 60 kể cả ra Featured sớm; không đủ 60 thì skip, không fallback về mốc 30. Chưa có Featured ở 60 mới cân nhắc 120 hiện tại đồng thời bảo vệ 60 banner sau. Vũ khí: Chỉ quay sau khi có nhân vật và tích đủ 8 Issues (15.840 vé).',
        
        runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
            return [];
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return [];
        }
    },

    // ----------------------------------------------------------------
    // Chiến thuật 4: Quay theo Meta (Roll Meta)
    // ----------------------------------------------------------------
    roll_meta: {
        id: 'roll_meta',
        name: 'Roll Meta',
        desc: 'Nhân vật: Chọn ngẫu nhiên đúng số banner Meta đã cấu hình. Banner Meta dùng tài nguyên khả dụng; banner thường chỉ roll nếu đủ bảo hiểm hiện tại và vẫn giữ quỹ 95/105 vé cho Meta gần nhất. Vũ khí: Banner thường phải bảo vệ 8 Issues cho Meta kế tiếp.',
        
        runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
            return [];
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return [];
        }
    }
};

/**
 * Hàm điều phối việc chạy 1 banner đơn lẻ cho 1 người chơi
 */
export function runSingleBannerForPlayer(strategyId, player, charBannerState, weaponBannerState, ticketIncome, weaponIncomeNonGacha = 0, bannerIdx = 0, totalBanners = 1, options = {}) {
    const strategy = strategies[strategyId];
    if (!strategy) {
        throw new Error(`Strategy ${strategyId} is not defined.`);
    }

    // Chuyển vé Dossier tích lũy từ mùa trước thành vé Dossier khả dụng mùa này
    player.currentBannerDossierTickets = player.nextBannerDossierTickets;
    player.nextBannerDossierTickets = 0;

    // Reset bộ đếm pulls trên banner cụ thể này
    charBannerState.bannerPullsCount = 0;
    charBannerState.pullsSinceFeatured = 0;
    charBannerState.guarantee120Consumed = false;
    charBannerState.milestone30Triggered = false;
    charBannerState.milestone60Triggered = false;
    charBannerState.potentialTokensThisBanner = 0;
    const bannerStartState = {
        pity6: charBannerState.pity6,
        pity5: charBannerState.pity5,
        pullsSinceFeatured: charBannerState.pullsSinceFeatured,
        guarantee120Consumed: charBannerState.guarantee120Consumed
    };

    // Tương tự cho vũ khí
    weaponBannerState.issuesCount = 0;
    weaponBannerState.issuesSinceFeatured = 0;
    weaponBannerState.featuredGuaranteeConsumed = false;

    // 1. Nhận thu nhập vé nhân vật in-game của banner này trước khi quay
    player.charTickets += ticketIncome;

    // 2. Quay 15 lượt banner thường miễn phí để tích Bond Quota & Arsenal Tickets
    const stdPulls = executeStandardBannerRolls(player, 15, bannerIdx);

    // 3. Quay 10 lượt banner limited miễn phí (bắt buộc roll)
    const freeLimResults = executeFreeLimitedRolls(player, charBannerState, bannerIdx, totalBanners);
    let gotFeaturedChar = freeLimResults.gotFeatured;
    const allCharPulls = [...freeLimResults.pullsRecord];

    // 4. Dossier của banner trước hết hạn trong banner này, nên người chơi dùng hết
    // ngay sau phần Limited miễn phí rồi mới cân nhắc chi vé trong ví.
    const dossierPullsAtStart = player.currentBannerDossierTickets;
    if (dossierPullsAtStart > 0) {
        const dossierTarget = charBannerState.bannerPullsCount + dossierPullsAtStart;
        const res = executeCharacterPullSequence(
            player,
            charBannerState,
            dossierTarget,
            false,
            bannerIdx,
            gotFeaturedChar,
            strategyId === 'save_commit_single',
            totalBanners
        );
        res.pullsRecord.forEach(item => { item.actionPhase = 'dossier'; });
        allCharPulls.push(...res.pullsRecord);
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
    }

    // 5. Chụp checkpoint ngay sau các lượt thật sự bắt buộc.
    const required120 = calculateRequiredTickets(player, charBannerState, 120);
    const decisionState = {
        charTickets: player.charTickets,
        dossierTickets: player.currentBannerDossierTickets,
        totalAvailable: player.charTickets + player.currentBannerDossierTickets,
        dossierPullsUsed: dossierPullsAtStart,
        worstCaseWalletCost120: required120,
        walletShortfall120: Math.max(0, required120 - player.charTickets),
        canAfford120: player.charTickets >= required120,
        pity6: charBannerState.pity6,
        pity5: charBannerState.pity5,
        pullsSinceFeatured: charBannerState.pullsSinceFeatured,
        bannerPullsCount: charBannerState.bannerPullsCount,
        guarantee120Consumed: charBannerState.guarantee120Consumed === true,
        budgetTargetPulls: 120,
        budgetRequiredTickets: required120,
        budgetShortfall: Math.max(0, required120 - player.charTickets),
        canAffordTarget: player.charTickets >= required120,
        selectedTargetPulls: player.charTickets >= required120 ? 120 : 0,
        initialSelectedTargetPulls: player.charTickets >= required120 ? 120 : 0,
        upgradedTo120: false,
        checks: {
            pull120: {
                requiredTickets: required120,
                availableTickets: player.charTickets,
                affordable: player.charTickets >= required120
            }
        }
    };

    // Pull 60 chỉ đi khi đủ ngân sách cho đúng mốc 60; không fallback về pull 30.
    if (strategyId === 'pull_60') {
        const required60 = calculateRequiredTickets(player, charBannerState, 60);
        const canAfford60 = player.charTickets >= required60;
        decisionState.budgetTargetPulls = 60;
        decisionState.budgetRequiredTickets = required60;
        decisionState.budgetShortfall = Math.max(0, required60 - player.charTickets);
        decisionState.canAffordTarget = canAfford60;
        decisionState.selectedTargetPulls = canAfford60 ? 60 : 0;
        decisionState.initialSelectedTargetPulls = decisionState.selectedTargetPulls;
        decisionState.checks.pull60 = {
            requiredTickets: required60,
            availableTickets: player.charTickets,
            affordable: canAfford60
        };
    }

    // 6. Quyết định quay tiếp bằng tài nguyên trong ví dựa trên chiến thuật.
    let pullsRecord = [];
    if (strategyId === 'save_commit') {
        if (decisionState.canAfford120) {
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar, false, totalBanners);
            res.pullsRecord.forEach(item => { item.actionPhase = 'commit'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
            const milestoneResult = executePull60AfterFeatured(
                player,
                charBannerState,
                gotFeaturedChar,
                bannerIdx,
                totalBanners,
                ticketIncome,
                options,
                true
            );
            if (milestoneResult.check) {
                decisionState.checks.finishMilestoneProtectsNext120 = milestoneResult.check;
            }
            pullsRecord.push(...milestoneResult.pullsRecord);
            gotFeaturedChar = gotFeaturedChar || milestoneResult.gotFeatured;
        }
    } else if (strategyId === 'save_commit_single') {
        if (decisionState.canAfford120) {
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar, true, totalBanners);
            res.pullsRecord.forEach(item => { item.actionPhase = 'commit'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    } else if (strategyId === 'yolo') {
        const res = executeCharacterPullSequence(player, charBannerState, Infinity, true, bannerIdx, gotFeaturedChar, false, totalBanners);
        res.pullsRecord.forEach(item => { item.actionPhase = 'strategy'; });
        pullsRecord = res.pullsRecord;
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        const milestoneResult = executePull60AfterFeatured(
            player,
            charBannerState,
            gotFeaturedChar,
            bannerIdx,
            totalBanners,
            ticketIncome,
            options,
            false
        );
        pullsRecord.push(...milestoneResult.pullsRecord);
        gotFeaturedChar = gotFeaturedChar || milestoneResult.gotFeatured;
    } else if (strategyId === 'pull_60') {
        const initialTarget = decisionState.selectedTargetPulls;

        if (initialTarget > 0) {
            const res = executeCharacterPullSequence(player, charBannerState, initialTarget, false, bannerIdx, gotFeaturedChar, false, totalBanners);
            res.pullsRecord.forEach(item => { item.actionPhase = 'strategy'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }

        // Tại 60, chỉ nâng lên 120 khi chưa có Featured và vẫn bảo vệ được
        // mốc 60 banner sau. Income banner sau không được tài trợ ngược cho 120 hiện tại.
        if (charBannerState.bannerPullsCount === 60 && !gotFeaturedChar) {
            const requiredCurrent120 = calculateRequiredTickets(player, charBannerState, 120);
            const requiredProtectedRoute = calculateRequiredTickets(player, charBannerState, [120, 60]);
            const futureIncome = calculateFutureTicketIncome(ticketIncome, bannerIdx, bannerIdx + 1, options);
            const canUpgrade = player.charTickets >= requiredCurrent120 &&
                player.charTickets + futureIncome >= requiredProtectedRoute;

            decisionState.checks.pull120At60 = {
                requiredTickets: requiredCurrent120,
                protectedRouteRequiredTickets: requiredProtectedRoute,
                availableTickets: player.charTickets,
                futureIncome,
                affordable: canUpgrade
            };

            if (canUpgrade) {
                const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar, false, totalBanners);
                res.pullsRecord.forEach(item => { item.actionPhase = 'strategy_upgraded'; });
                pullsRecord.push(...res.pullsRecord);
                gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
                decisionState.selectedTargetPulls = 120;
                decisionState.upgradedTo120 = true;
            }
        }
    } else if (strategyId === 'roll_meta') {
        const currentIsMeta = isMetaBanner(player, bannerIdx, totalBanners);
        decisionState.isMetaBanner = currentIsMeta;
        let shouldPull = false;

        if (currentIsMeta) {
            shouldPull = true; // Banner Meta luôn quay hết mình
        } else {
            let nextMetaIdx = -1;
            for (let idx = bannerIdx + 1; idx < totalBanners; idx++) {
                if (isMetaBanner(player, idx, totalBanners)) {
                    nextMetaIdx = idx;
                    break;
                }
            }

            if (nextMetaIdx !== -1) {
                const bannersUntilMeta = nextMetaIdx - bannerIdx;
                const futureIncome = calculateFutureTicketIncome(ticketIncome, bannerIdx, nextMetaIdx, options);
                const metaReserve = bannersUntilMeta === 1
                    ? META_RESERVE_WITH_DOSSIER
                    : META_RESERVE_NO_DOSSIER;
                const remainingAfterCurrent = player.charTickets - required120;

                shouldPull = player.charTickets >= required120 &&
                    remainingAfterCurrent + futureIncome >= metaReserve;

                decisionState.checks.metaReserve = {
                    nextMetaBanner: nextMetaIdx,
                    bannersUntilMeta,
                    requiredCurrentTickets: required120,
                    reserveTickets: metaReserve,
                    futureIncome,
                    remainingAfterCurrent,
                    affordable: shouldPull
                };
            } else {
                // Không còn Meta phía sau: hành xử như Save & Commit.
                shouldPull = player.charTickets >= required120;
            }
        }

        decisionState.selectedTargetPulls = shouldPull ? 120 : 0;
        decisionState.initialSelectedTargetPulls = decisionState.selectedTargetPulls;
        decisionState.canAffordTarget = currentIsMeta ? decisionState.canAfford120 : shouldPull;

        if (shouldPull) {
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar, false, totalBanners);
            res.pullsRecord.forEach(item => { item.actionPhase = 'strategy'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    }

    allCharPulls.push(...pullsRecord);

    // 5. Tính toán vé hoàn trả từ tất cả các lượt quay nhân vật (stdPulls + allCharPulls)
    const totalCharRollsThisBanner = [...stdPulls, ...allCharPulls];
    const arsenalTicketsRebate = calculateArsenalTicketsRebate(totalCharRollsThisBanner);
    const totalArsenalTicketsEarned = arsenalTicketsRebate + weaponIncomeNonGacha;

    // 6. Quay banner vũ khí
    let weaponIssues = [];
    if (strategyId === 'save_commit' || strategyId === 'save_commit_single') {
        player.arsenalTickets += totalArsenalTicketsEarned;
        if (gotFeaturedChar && player.arsenalTickets >= 15840) {
            weaponIssues = executeWeaponPullSequence(player, weaponBannerState, 0, gotFeaturedChar, Infinity, bannerIdx, totalBanners);
        }
    } else if (strategyId === 'pull_60') {
        player.arsenalTickets += totalArsenalTicketsEarned;
        if (gotFeaturedChar && player.arsenalTickets >= 15840) {
            weaponIssues = executeWeaponPullSequence(player, weaponBannerState, 0, gotFeaturedChar, Infinity, bannerIdx, totalBanners);
        }
    } else if (strategyId === 'roll_meta') {
        const isMeta = isMetaBanner(player, bannerIdx, totalBanners);
        if (isMeta) {
            weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar, Infinity, bannerIdx, totalBanners);
        } else {
            if (gotFeaturedChar) {
                let nextMetaIdx = -1;
                for (let idx = bannerIdx + 1; idx < totalBanners; idx++) {
                    if (isMetaBanner(player, idx, totalBanners)) {
                        nextMetaIdx = idx;
                        break;
                    }
                }
                if (nextMetaIdx !== -1) {
                    const bannersUntilMeta = nextMetaIdx - bannerIdx;
                    const expectedFutureEarnings = bannersUntilMeta * (weaponIncomeNonGacha + 860);
                    const currentTickets = player.arsenalTickets + totalArsenalTicketsEarned;
                    // Phải có đủ 8 Issues (15840 vé) ở banner hiện tại
                    // VÀ sau khi chi tối đa 8 Issues ở banner hiện tại, cộng với thu nhập tương lai vẫn phải đủ 8 Issues (15840 vé) cho banner Meta kế tiếp
                    if (currentTickets >= 15840 && (currentTickets - 15840 + expectedFutureEarnings) >= 15840) {
                        const maxSpend = currentTickets - 15840 + expectedFutureEarnings;
                        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar, maxSpend, bannerIdx, totalBanners);
                    } else {
                        player.arsenalTickets += totalArsenalTicketsEarned;
                    }
                } else {
                    // Không có banner Meta tiếp theo: Chỉ quay nếu bản thân banner này có đủ tích lũy 8 Issues (15840 vé)
                    if (player.arsenalTickets + totalArsenalTicketsEarned >= 15840) {
                        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar, Infinity, bannerIdx, totalBanners);
                    } else {
                        player.arsenalTickets += totalArsenalTicketsEarned;
                    }
                }
            } else {
                player.arsenalTickets += totalArsenalTicketsEarned;
            }
        }
    } else {
        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar, Infinity, bannerIdx, totalBanners);
    }

    return {
        standardPulls: stdPulls,
        charPulls: allCharPulls,
        weaponIssues,
        gotFeaturedChar,
        arsenalTicketsRebate,
        totalArsenalTicketsEarned,
        decisionState,
        bannerStartState
    };
}
