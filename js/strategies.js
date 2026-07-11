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
        this.nextBannerDossierTickets = 0; // Lượt roll Dossier miễn phí mang sang từ banner trước (mốc 60)
        
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
        this.totalUrgentPulls = 0;         // Tổng số lượt Urgent pull miễn phí
        
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
        return; // 4-Star không có Bond Quota
    }

    if (player.ownedCharactersSet.has(charId)) {
        // Đã sở hữu -> Trùng lặp (Dupe) -> Nhận Bond Quota
        const quotaEarned = result.rarity === 6 ? 50 : 10;
        player.bondQuota += quotaEarned;
        player.totalBondQuotaEarned += quotaEarned;
        
        // Tự động đổi Bond Quota sang vé nhân vật (25 Quota = 1 vé)
        if (player.bondQuota >= 25) {
            const ticketsExchanged = Math.floor(player.bondQuota / 25);
            player.charTickets += ticketsExchanged;
            player.bondQuota -= ticketsExchanged * 25;
        }
    } else {
        // Sở hữu mới
        player.ownedCharactersSet.add(charId);
    }
}

/**
 * Quay 15 lượt trên banner thường miễn phí
 */
function executeStandardBannerRolls(player, rollsCount, bannerIdx) {
    const pullsRecord = [];
    for (let i = 0; i < rollsCount; i++) {
        const result = rollStandardCharacter(player.standardCharPity);
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
        const result = rollCharacter(bannerState, false);
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

// Helper thực hiện vòng quay nhân vật hợp nhất sử dụng tài nguyên trong ví
// NÂNG CẤP: Quay x10 mặc định, tự động chuyển sang roll lẻ x1 khi pity >= 71 hoặc bảo hiểm >= 111
function executeCharacterPullSequence(player, bannerState, targetPulls, stopOnFeatured, bannerIdx, gotFeaturedThisBanner = false, forceSingleRoll = false) {
    const pullsRecord = [];
    let gotFeatured = gotFeaturedThisBanner;
    let currentBannerPulls = bannerState.bannerPullsCount; // Đã quay bao gồm 10 roll free

    // Định nghĩa hàm thực hiện một lượt pull lẻ
    const executeSinglePull = (isUrgent = false) => {
        const result = rollCharacter(bannerState, isUrgent);
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
            currentBannerPulls++;
        }
    };

    while (currentBannerPulls < targetPulls && (!stopOnFeatured || !gotFeatured)) {
        const pullsNeeded = targetPulls - currentBannerPulls;
        const totalTicketsAvailable = player.nextBannerDossierTickets + player.charTickets;

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
                          bannerState.pullsSinceFeatured < 111 && 
                          (!stopOnFeatured || !gotFeatured);

        if (canRoll10) {
            // Quay x10 (thực hiện liên tục 10 lần không ngắt quãng giữa chừng)
            for (let k = 0; k < 10; k++) {
                if (player.nextBannerDossierTickets > 0) {
                    player.nextBannerDossierTickets--;
                } else if (player.charTickets > 0) {
                    player.charTickets--;
                } else {
                    break;
                }
                executeSinglePull(false);
            }
        } else {
            // Quay lẻ x1 (được gọi khi sát mốc pity/bảo hiểm để tiết kiệm vé)
            if (player.nextBannerDossierTickets > 0) {
                player.nextBannerDossierTickets--;
            } else if (player.charTickets > 0) {
                player.charTickets--;
            } else {
                break;
            }
            executeSinglePull(false);
        }

        // Kích hoạt mốc 30 roll Urgent Recruitment
        if (currentBannerPulls === 30) {
            for (let k = 0; k < 10; k++) {
                if (stopOnFeatured && gotFeatured) break;
                executeSinglePull(true); // Quay Urgent miễn phí
            }
        }

        // Nhận quà mốc 60 roll Dossier
        if (currentBannerPulls === 60) {
            player.nextBannerDossierTickets += 10;
        }
    }

    // Thao tác "roll cố"
    if (currentBannerPulls > 20 && currentBannerPulls < 30) {
        const extraNeeded = 30 - currentBannerPulls;
        if (player.charTickets >= extraNeeded) {
            for (let i = 0; i < extraNeeded; i++) {
                player.charTickets--;
                executeSinglePull(false);
            }
            for (let k = 0; k < 10; k++) {
                if (stopOnFeatured && gotFeatured) break;
                executeSinglePull(true);
            }
        }
    }

    if (currentBannerPulls > 50 && currentBannerPulls < 60) {
        const extraNeeded = 60 - currentBannerPulls;
        if (player.charTickets >= extraNeeded) {
            for (let i = 0; i < extraNeeded; i++) {
                player.charTickets--;
                executeSinglePull(false);
            }
            player.nextBannerDossierTickets += 10;
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

        if (result.milestoneReward === 'selector_box' || result.milestoneReward === 'featured_weapon') {
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
        desc: 'Nhân vật: Chỉ quay khi tích đủ >= 120 vé (chắc chắn ra). Khi quay sẽ quay đến khi ra Featured thì dừng lại. Vũ khí: Chỉ quay khi tích lũy đủ 8 Issues (15,840 vé) để đảm bảo 100% trúng vũ khí rate-up.',
        
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
        desc: 'Nhân vật: Chỉ quay lẻ x1 từ đầu đến cuối khi tích đủ >= 120 vé (chắc chắn ra), dừng ngay khi ra Featured. Vũ khí: Chỉ quay khi tích lũy đủ 8 Issues (15,840 vé).',
        
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
        desc: 'Nhân vật: 30% số banner là Meta (quay tối đa 120 roll). Các banner thường khác quay theo Save & Commit (chỉ xả vé khi tích đủ bảo hiểm 120 roll và bảo đảm sau khi quay xong vẫn tích đủ bảo hiểm 120 roll cho banner Meta tiếp theo, ngược lại chỉ quay 10 roll free). Vũ khí: Chỉ quay vũ khí ở banner Meta.',
        
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

    // Reset bộ đếm pulls trên banner cụ thể này
    charBannerState.bannerPullsCount = 0;
    charBannerState.pullsSinceFeatured = 0;

    // Tương tự cho vũ khí
    weaponBannerState.issuesCount = 0;
    weaponBannerState.issuesSinceFeatured = 0;

    // 1. Nhận thu nhập vé nhân vật in-game của banner này trước khi quay
    player.charTickets += ticketIncome;

    // 2. Quay 15 lượt banner thường miễn phí để tích Bond Quota & Arsenal Tickets
    const stdPulls = executeStandardBannerRolls(player, 15, bannerIdx);

    // 3. Quay 10 lượt banner limited miễn phí (bắt buộc roll)
    const freeLimResults = executeFreeLimitedRolls(player, charBannerState, bannerIdx);
    let gotFeaturedChar = freeLimResults.gotFeatured;
    const allCharPulls = [...freeLimResults.pullsRecord];

    // 4. Quyết định quay tiếp bằng tài nguyên trong ví dựa trên chiến thuật
    let pullsRecord = [];
    if (strategyId === 'save_commit') {
        if (player.charTickets >= 110) { // Ví có >= 110 (cộng 10 free thành >= 120)
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar);
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    } else if (strategyId === 'save_commit_single') {
        if (player.charTickets >= 110) {
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar, true);
            pullsRecord = res.pullsRecord;
            gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
        }
    } else if (strategyId === 'yolo') {
        const res = executeCharacterPullSequence(player, charBannerState, Infinity, true, bannerIdx, gotFeaturedChar);
        pullsRecord = res.pullsRecord;
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
    } else if (strategyId === 'pull_60') {
        let targetPulls = 0;
        if (player.charTickets >= 50) { // Ví có >= 50 (cộng 10 free thành >= 60)
            targetPulls = 60;
        } else if (player.charTickets >= 20) { // Ví có >= 20 (cộng 10 free thành >= 30)
            targetPulls = 30;
        }
        if (targetPulls > 0) {
            const res = executeCharacterPullSequence(player, charBannerState, targetPulls, false, bannerIdx, gotFeaturedChar);
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
                
                // Điều kiện an toàn: sau khi quay banner này tốn tối đa 110 vé từ ví, 
                // lượng vé còn dư vẫn phải bảo đảm đủ neededAfterThis khi sang banner Meta
                if (player.charTickets >= 110 + Math.max(0, neededAfterThis)) {
                    shouldPull = true;
                }
            } else {
                // Không có banner Meta nào tiếp theo, quay theo Save & Commit bình thường
                if (player.charTickets >= 110) {
                    shouldPull = true;
                }
            }
        }

        if (shouldPull) {
            const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar);
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
            weaponIssues = executeWeaponPullSequence(player, weaponBannerState, 0, gotFeaturedChar);
        }
    } else if (strategyId === 'roll_meta') {
        const isMeta = isMetaBanner(bannerIdx, totalBanners);
        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar && isMeta);
    } else {
        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar);
    }

    return {
        charPulls: allCharPulls,
        weaponIssues
    };
}
