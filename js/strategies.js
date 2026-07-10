import { rollCharacter, rollWeaponIssue, calculateArsenalTicketsRebate } from './gacha-math.js';

/**
 * Lớp định nghĩa cấu trúc dữ liệu người chơi trong giả lập
 */
export class SimulatorPlayer {
    constructor(id) {
        this.id = id;
        
        // Tài nguyên nhân vật
        this.charTickets = 0;              // Số vé nhân vật hiện có (Oroberyl quy đổi)
        this.charTicketsDebt = 0;          // Nợ vé nhân vật (phải nạp tiền thêm) - giữ làm 0 để tránh lỗi tham chiếu
        this.nextBannerDossierTickets = 0; // Lượt roll Dossier miễn phí mang sang từ banner trước (mốc 60)
        
        // Tài nguyên vũ khí
        this.arsenalTickets = 0;           // Số vé vũ khí hiện có (Arsenal Tickets)
        this.arsenalTicketsDebt = 0;       // Nợ vé vũ khí - giữ làm 0
        
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

// Helper thực hiện vòng quay nhân vật hợp nhất
function executeCharacterPullSequence(player, bannerState, targetPulls, stopOnFeatured) {
    let dossierPullsLeft = player.nextBannerDossierTickets;
    player.nextBannerDossierTickets = 0;

    const pullsRecord = [];
    let gotFeatured = false;
    let currentBannerPulls = 0;
    let gotFeaturedThisBanner = false;

    const executeSinglePull = (isUrgent = false) => {
        const result = rollCharacter(bannerState, isUrgent);
        pullsRecord.push(result);
        
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
        if (dossierPullsLeft > 0) {
            dossierPullsLeft--;
            executeSinglePull(false);
        } else if (player.charTickets > 0) {
            player.charTickets--;
            executeSinglePull(false);
        } else {
            break;
        }

        if (currentBannerPulls === 30) {
            for (let k = 0; k < 10; k++) {
                if (stopOnFeatured && gotFeatured) break;
                executeSinglePull(true);
            }
        }

        if (currentBannerPulls === 60) {
            player.nextBannerDossierTickets += 10;
        }
    }

    // Thao tác "roll cố" (nếu thiếu < 10 roll để chạm mốc 30 hoặc mốc 60)
    // 1. Roll cố lên mốc 30 để nhận 10 lượt Urgent free
    if (currentBannerPulls > 20 && currentBannerPulls < 30) {
        const extraNeeded = 30 - currentBannerPulls;
        if (player.charTickets >= extraNeeded) {
            for (let i = 0; i < extraNeeded; i++) {
                player.charTickets--;
                executeSinglePull(false);
            }
            // Kích hoạt mốc Urgent 30 ngay lập tức
            for (let k = 0; k < 10; k++) {
                if (stopOnFeatured && gotFeatured) break;
                executeSinglePull(true);
            }
        }
    }

    // 2. Roll cố lên mốc 60 để nhận 10 vé Dossier chuyển tiếp
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

// Helper thực hiện vòng quay vũ khí hợp nhất (quay sạch vé vũ khí khi có nhân vật rate-up)
function executeWeaponPullSequence(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar) {
    player.arsenalTickets += totalArsenalTicketsEarned;
    
    if (!gotFeaturedChar) {
        return [];
    }

    const issuesRecord = [];
    let gotFeatured = false;

    while (!gotFeatured && player.arsenalTickets >= 1980) {
        player.arsenalTickets -= 1980;
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
            player.charTickets += ticketIncome;
            let dossierPullsLeft = player.nextBannerDossierTickets;
            
            if (player.charTickets + dossierPullsLeft < 120) {
                return []; // Bỏ qua banner này
            }
            
            const res = executeCharacterPullSequence(player, bannerState, 120, true);
            return res.pullsRecord;
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            player.arsenalTickets += totalArsenalTicketsEarned;
            if (!gotFeaturedChar || player.arsenalTickets < 15840) {
                return [];
            }
            return executeWeaponPullSequence(player, bannerState, 0, gotFeaturedChar);
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
            player.charTickets += ticketIncome;
            const res = executeCharacterPullSequence(player, bannerState, Infinity, true);
            return res.pullsRecord;
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return executeWeaponPullSequence(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar);
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
            player.charTickets += ticketIncome;
            let dossierPullsLeft = player.nextBannerDossierTickets;
            const totalTickets = player.charTickets + dossierPullsLeft;

            let targetPulls = 0;
            if (totalTickets >= 60) {
                targetPulls = 60;
            } else if (totalTickets >= 30) {
                targetPulls = 30;
            } else {
                targetPulls = 0;
            }

            if (targetPulls === 0) {
                return [];
            }

            const res = executeCharacterPullSequence(player, bannerState, targetPulls, false);
            return res.pullsRecord;
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return executeWeaponPullSequence(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar);
        }
    },

    // ----------------------------------------------------------------
    // Chiến thuật 4: Chiến thuật 60+ (Tấn công khi có đệm)
    // ----------------------------------------------------------------
    '60_plus': {
        id: '60_plus',
        name: 'Chiến thuật 60+',
        desc: 'Nhân vật: Tương tự mốc 60, nếu tại mốc 60 chưa ra Featured và túi còn >= 80 vé, tiếp tục quay lên 120 để chạm bảo hiểm. Vũ khí: Quay vũ khí nếu trúng nhân vật.',
        
        runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
            player.charTickets += ticketIncome;
            let dossierPullsLeft = player.nextBannerDossierTickets;
            const totalTickets = player.charTickets + dossierPullsLeft;

            let targetPulls = 0;
            let stopOnFeatured = false;

            if (totalTickets >= 60) {
                targetPulls = 60;
            } else if (totalTickets >= 30) {
                targetPulls = 30;
            } else {
                targetPulls = 0;
            }

            if (targetPulls <= 0) {
                return [];
            }

            player.nextBannerDossierTickets = 0;

            const pullsRecord = [];
            let gotFeatured = false;
            let currentBannerPulls = 0;
            let gotFeaturedThisBanner = false;

            const executeSinglePull = (isUrgent = false) => {
                const result = rollCharacter(bannerState, isUrgent);
                pullsRecord.push(result);
                
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
                if (dossierPullsLeft > 0) {
                    dossierPullsLeft--;
                    executeSinglePull(false);
                } else if (player.charTickets > 0) {
                    player.charTickets--;
                    executeSinglePull(false);
                } else {
                    break;
                }

                if (currentBannerPulls === 30) {
                    for (let k = 0; k < 10; k++) {
                        if (stopOnFeatured && gotFeatured) break;
                        executeSinglePull(true);
                    }
                }

                if (currentBannerPulls === 60) {
                    player.nextBannerDossierTickets += 10;
                    if (!gotFeatured && player.charTickets >= 80) {
                        targetPulls = 120;
                        stopOnFeatured = true;
                    }
                }
            }

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

            return pullsRecord;
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            return executeWeaponPullSequence(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar);
        }
    },

    // ----------------------------------------------------------------
    // Chiến thuật 5: Quay theo Meta (Roll Meta)
    // ----------------------------------------------------------------
    roll_meta: {
        id: 'roll_meta',
        name: 'Roll Meta',
        desc: 'Nhân vật: 30% số banner là Meta. Cố gắng tích 120 vé trước banner Meta. Các banner không Meta quay mốc 60 nếu túi còn đủ 120 vé dự phòng cho banner Meta tiếp theo, ngược lại sẽ skip để tích lũy. Vũ khí: Chỉ quay vũ khí ở banner Meta.',
        
        runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
            player.charTickets += ticketIncome;
            const isMeta = isMetaBanner(bannerIdx, totalBanners);
            
            let targetPulls = 0;
            let stopOnFeatured = false;
            
            if (isMeta) {
                targetPulls = 120;
                stopOnFeatured = true;
            } else {
                // Tìm kiếm banner Meta tiếp theo
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
                    const neededAfterThis = 120 - expectedEarnings;
                    
                    const maxSpendable = player.charTickets - Math.max(0, neededAfterThis);
                    if (maxSpendable > 0) {
                        targetPulls = Math.min(60, maxSpendable);
                        stopOnFeatured = false;
                    } else {
                        targetPulls = 0; // Skip để trữ vé cho banner Meta tiếp theo
                    }
                } else {
                    // Không có banner Meta nào tiếp theo, quay 60 bình thường
                    targetPulls = 60;
                    stopOnFeatured = false;
                }
            }
            
            if (targetPulls <= 0) {
                return [];
            }
            
            const res = executeCharacterPullSequence(player, bannerState, targetPulls, stopOnFeatured);
            return res.pullsRecord;
        },
        
        runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
            const isMeta = isMetaBanner(bannerIdx, totalBanners);
            // Vũ khí chỉ gacha nếu nhân vật thuộc diện Meta và đã quay trúng được nhân vật
            return executeWeaponPullSequence(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar && isMeta);
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
    // Chú ý: Bảo hiểm 120 không mang sang banner sau
    charBannerState.pullsSinceFeatured = 0;

    // Tương tự cho vũ khí
    weaponBannerState.issuesCount = 0;
    weaponBannerState.issuesSinceFeatured = 0;

    // 1. Quay banner nhân vật
    const charPulls = strategy.runCharacterPull(player, charBannerState, ticketIncome, bannerIdx, totalBanners);

    // 2. Tính vé hoàn trả từ gacha nhân vật + vé cố định
    const arsenalTicketsRebate = calculateArsenalTicketsRebate(charPulls);
    const totalArsenalTicketsEarned = arsenalTicketsRebate + weaponIncomeNonGacha;

    // 3. Quay banner vũ khí
    const gotFeaturedChar = charPulls.some(p => p.rarity === 6 && p.isFeatured);
    const weaponIssues = strategy.runWeaponPull(player, weaponBannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners);

    return {
        charPulls,
        weaponIssues
    };
}
