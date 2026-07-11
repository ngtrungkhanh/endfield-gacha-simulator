import { rollCharacter, rollStandardCharacter, rollWeaponIssue, calculateArsenalTicketsRebate } from './gacha-math.js';

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
        this.totalPotentialTokens = 0;     // Token Potential nhận tại mỗi mốc 240 của banner
        
        // Thống kê vũ khí
        this.ownedFeaturedWeapons = 0;     // Số lượng vũ khí rate-up sở hữu
        this.ownedStandard6StarWeapons = 0;// Số lượng vũ khí 6★ lệch rate
        this.owned5StarWeapons = 0;        // Số lượng vũ khí 5★
        this.totalWeaponPulls = 0;         // Tổng số lượt pull vũ khí
        this.weaponMilestoneSelectors = 0; // Số hộp chọn vũ khí nhận được từ mốc 10
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
function executeFreeLimitedRolls(player, bannerState, bannerIdx) {
    const pullsRecord = [];
    let gotFeatured = false;
    let gotFeaturedThisBanner = false;

    const executeSinglePull = () => {
        const pity6Before = bannerState.pity6;
        const pullsSinceFeaturedBefore = bannerState.pullsSinceFeatured;
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
        
        if (result.rarity === 6) {
            if (result.isFeatured) {
                gotFeatured = true;
                player.ownedFeaturedCharacters++;
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

// Helper xác định banner Meta (30% số banner phân bổ đều)
const isMetaBanner = (bannerIdx, totalBanners) => {
    const numMeta = Math.floor(totalBanners * 0.3);
    if (numMeta <= 0) return false;
    
    const step = totalBanners / numMeta;
    for (let m = 0; m < numMeta; m++) {
        const idx = Math.floor(m * step + step / 2);
        if (idx === bannerIdx) return true;
    }
    return false;
};

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
function executeCharacterPullSequence(player, bannerState, targetPulls, stopOnFeatured, bannerIdx, gotFeaturedThisBanner = false, forceSingleRoll = false) {
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
        
        if (result.rarity === 6) {
            if (result.isFeatured) {
                gotFeatured = true;
                player.ownedFeaturedCharacters++;
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

// Helper thực hiện vòng quay vũ khí hợp nhất
function executeWeaponPullSequence(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar) {
    player.arsenalTickets += totalArsenalTicketsEarned;
    
    if (!gotFeaturedChar) {
        return [];
    }

    const issuesRecord = [];
    let gotFeatured = false;

    while (!gotFeatured && player.arsenalTickets >= 1980) {
        player.arsenalTickets -= 1980;
        player.totalWeaponTicketsUsed += 1980;
        
        const result = rollWeaponIssue(bannerState);
        issuesRecord.push(result);

        player.totalWeaponPulls += 10;

        result.items.forEach(item => {
            if (item.rarity === 6) {
                if (item.isFeatured) {
                    gotFeatured = true;
                    player.ownedFeaturedWeapons++;
                } else {
                    player.ownedStandard6StarWeapons++;
                }
            } else if (item.rarity === 5) {
                player.owned5StarWeapons++;
            }
        });

        if (result.milestoneReward === 'selector_box') {
            gotFeatured = true;
            player.ownedFeaturedWeapons++;
            player.weaponMilestoneSelectors++;
        } else if (result.milestoneReward === 'featured_weapon') {
            gotFeatured = true;
            player.ownedFeaturedWeapons++;
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
        desc: 'Nhân vật: Chỉ commit khi 10 free cộng tổng vé thường/Dossier đủ 120 lượt. Khi quay sẽ dừng sau cụm chứa Featured, rồi xả hết Dossier sắp hết hạn. Vũ khí: Chỉ quay khi tích lũy đủ 8 Issues (15.840 vé).',
        
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
        desc: 'Nhân vật: Chỉ quay lẻ x1 khi 10 free cộng tổng vé thường/Dossier đủ 120 lượt, dừng khi ra Featured rồi xả hết Dossier sắp hết hạn. Vũ khí: Chỉ quay khi tích lũy đủ 8 Issues (15.840 vé).',
        
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
        desc: 'Nhân vật: Cứ có bao nhiêu vé là quay hết, nhưng dừng lại ngay lập tức nếu trúng nhân vật Featured. Vũ khí: Quay vũ khí nếu trúng nhân vật.',
        
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
        desc: 'Nhân vật: Chỉ quay khi tính đủ 60 lượt (để lấy vé Dossier x10). Nếu không đủ 60, cố chạm mốc 30 để nhận Urgent free, ngược lại sẽ skip để trữ vé. Vũ khí: Quay vũ khí nếu trúng nhân vật.',
        
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
        desc: 'Nhân vật: 30% số banner là Meta (quay tối đa 120 roll). Banner thường chỉ commit khi vẫn bảo toàn ngân sách cho Meta kế tiếp; Dossier hết hạn và tối ưu mốc 30 vẫn luôn áp dụng. Vũ khí: Chỉ quay ở banner Meta.',
        
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
export function runSingleBannerForPlayer(strategyId, player, charBannerState, weaponBannerState, ticketIncome, weaponIncomeNonGacha = 0, bannerIdx = 0, totalBanners = 1) {
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
    const freeLimResults = executeFreeLimitedRolls(player, charBannerState, bannerIdx);
    let gotFeaturedChar = freeLimResults.gotFeatured;
    const allCharPulls = [...freeLimResults.pullsRecord];
    const decisionState = {
        charTickets: player.charTickets,
        dossierTickets: player.currentBannerDossierTickets,
        totalAvailable: player.charTickets + player.currentBannerDossierTickets,
        pity6: charBannerState.pity6,
        pity5: charBannerState.pity5,
        pullsSinceFeatured: charBannerState.pullsSinceFeatured,
        bannerPullsCount: charBannerState.bannerPullsCount,
        guarantee120Consumed: charBannerState.guarantee120Consumed === true
    };

    // 4. Quyết định quay tiếp bằng tài nguyên trong ví dựa trên chiến thuật
    let pullsRecord = [];
    const totalCharacterTicketsAvailable = player.charTickets + player.currentBannerDossierTickets;
    if (strategyId === 'save_commit') {
        if (totalCharacterTicketsAvailable >= 110) { // Tổng vé ví + Dossier đủ 110 (cộng 10 free thành 120)
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar);
            res.pullsRecord.forEach(item => { item.actionPhase = 'commit'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    } else if (strategyId === 'save_commit_single') {
        if (totalCharacterTicketsAvailable >= 110) {
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar, true);
            res.pullsRecord.forEach(item => { item.actionPhase = 'commit'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    } else if (strategyId === 'yolo') {
        const res = executeCharacterPullSequence(player, charBannerState, Infinity, true, bannerIdx, gotFeaturedChar);
        res.pullsRecord.forEach(item => { item.actionPhase = 'strategy'; });
        pullsRecord = res.pullsRecord;
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
    } else if (strategyId === 'pull_60') {
        let targetPulls = 0;
        if (totalCharacterTicketsAvailable >= 50) { // Tổng vé ví + Dossier đủ mốc 60
            targetPulls = 60;
        } else if (totalCharacterTicketsAvailable >= 20) { // Tổng vé ví + Dossier đủ mốc 30
            targetPulls = 30;
        }
        if (targetPulls > 0) {
            const res = executeCharacterPullSequence(player, charBannerState, targetPulls, false, bannerIdx, gotFeaturedChar);
            res.pullsRecord.forEach(item => { item.actionPhase = 'strategy'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    } else if (strategyId === 'roll_meta') {
        const isMeta = isMetaBanner(bannerIdx, totalBanners);
        let shouldPull = false;
        
        if (isMeta) {
            shouldPull = true; // Banner Meta luôn quay hết mình
        } else {
            // Banner không Meta: kiểm tra xem quay xong có tích đủ bảo hiểm 120 roll cho banner Meta tiếp theo không
            let nextMetaIdx = -1;
            for (let idx = bannerIdx + 1; idx < totalBanners; idx++) {
                if (isMetaBanner(idx, totalBanners)) {
                    nextMetaIdx = idx;
                    break;
                }
            }

            if (nextMetaIdx !== -1) {
                const bannersUntilMeta = nextMetaIdx - bannerIdx;
                const expectedEarnings = bannersUntilMeta * ticketIncome;
                const neededAfterThis = 110 - expectedEarnings;
                const maxCharTicketsSpentNow = Math.max(0, 110 - player.currentBannerDossierTickets);
                
                // Điều kiện an toàn: sau khi quay banner này tốn tối đa 110 vé từ ví, 
                // lượng vé còn dư vẫn phải bảo đảm đủ neededAfterThis khi sang banner Meta
                if (player.charTickets >= maxCharTicketsSpentNow + Math.max(0, neededAfterThis)) {
                    shouldPull = true;
                }
            } else {
                // Không có banner Meta nào tiếp theo, quay theo Save & Commit bình thường
                if (totalCharacterTicketsAvailable >= 110) {
                    shouldPull = true;
                }
            }
        }

        if (shouldPull) {
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar);
            res.pullsRecord.forEach(item => { item.actionPhase = 'strategy'; });
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    }

    // Dossier khả dụng sẽ hết hạn sau banner này nên luôn phải được dùng hết,
    // kể cả khi chiến thuật skip hoặc đã trúng Featured trong lượt miễn phí/lượt trước đó.
    if (player.currentBannerDossierTickets > 0) {
        const dossierTarget = charBannerState.bannerPullsCount + player.currentBannerDossierTickets;
        const res = executeCharacterPullSequence(player, charBannerState, dossierTarget, false, bannerIdx, gotFeaturedChar, strategyId === 'save_commit_single');
        res.pullsRecord.forEach(item => { item.actionPhase = 'dossier'; });
        pullsRecord.push(...res.pullsRecord);
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
    }

    // TỐI ƯU MỐC 30: Nếu số lượt quay đã đạt từ 20 đến 29 (do có 10 free + 10 Dossier) và chưa ra Featured,
    // người chơi sẽ bỏ thêm vé từ ví để đạt đúng mốc 30 roll nhằm lấy 10 roll Urgent Recruitment miễn phí.
    const currentPullsCount = charBannerState.bannerPullsCount;
    if (currentPullsCount >= 20 && currentPullsCount < 30 && !gotFeaturedChar) {
        const neededTo30 = 30 - currentPullsCount;
        if (player.charTickets >= neededTo30) {
            const res = executeCharacterPullSequence(player, charBannerState, 30, true, bannerIdx, gotFeaturedChar, strategyId === 'save_commit_single');
            res.pullsRecord.forEach(item => { item.actionPhase = 'optimize30'; });
            pullsRecord.push(...res.pullsRecord);
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
            weaponIssues = executeWeaponPullSequence(player, weaponBannerState, 0, gotFeaturedChar);
        }
    } else if (strategyId === 'roll_meta') {
        const isMeta = isMetaBanner(bannerIdx, totalBanners);
        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar && isMeta);
    } else {
        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar);
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
