import { SimulatorPlayer, runSingleBannerForPlayer } from './strategies.js';

/**
 * Lớp điều phối chạy giả lập Monte Carlo gacha
 */
export class MonteCarloSimulator {
    /**
     * Chạy giả lập cho một danh sách các chiến thuật
     * @param {Object} config - Cấu hình giả lập
     * @param {string} config.mode - Chế độ giả lập: 'banners' (theo chu kỳ) hoặc 'pulls' (theo tổng số pull)
     * @param {number} config.numPlayers - Số người chơi (ví dụ: 1000)
     * @param {number} config.numBanners - Số lượng banner (sử dụng khi mode là 'banners')
     * @param {number} config.totalPulls - Tổng số pull nhân vật (sử dụng khi mode là 'pulls')
     * @param {number} config.startingCharTickets - Số vé nhân vật ban đầu
     * @param {number} config.incomePerBanner - Thu nhập vé mỗi mùa banner (nhân vật)
     * @param {number} config.weaponIncomeNonGacha - Thu nhập vé vũ khí in-game cố định mỗi banner
     * @param {Array<string>} config.strategyIds - Danh sách các ID chiến thuật cần chạy
     * @returns {Object} Kết quả giả lập của tất cả chiến thuật
     */
    static run(config) {
        const { mode, numPlayers, startingCharTickets, incomePerBanner, weaponIncomeNonGacha, strategyIds } = config;
        
        let numBanners = config.numBanners;
        let totalPullsAllocated = 0;

        if (mode === 'pulls') {
            // Chế độ giả lập theo tổng số pulls nhân vật
            totalPullsAllocated = config.totalPulls;
            // Tính số banner tương ứng (tối thiểu là 1)
            numBanners = Math.max(1, Math.ceil(totalPullsAllocated / incomePerBanner));
        }

        const results = {};

        strategyIds.forEach(strategyId => {
            // Khởi tạo danh sách người chơi cho chiến thuật này
            const players = [];
            for (let i = 0; i < numPlayers; i++) {
                const player = new SimulatorPlayer(i);
                // Với chế độ pulls, xuất phát điểm là 0 và nhận vé banner-by-banner để kiểm soát tổng lượng vé
                player.charTickets = (mode === 'pulls') ? 0 : startingCharTickets;
                players.push(player);
            }

            // Khởi tạo trạng thái pity riêng biệt cho từng người chơi để bảo lưu qua các banner
            const playerCharPities = Array.from({ length: numPlayers }, () => ({
                pity6: 0,
                pity5: 0,
                pullsSinceFeatured: 0,
                bannerPullsCount: 0
            }));

            const playerWeaponPities = Array.from({ length: numPlayers }, () => ({
                issuesCount: 0,
                issuesSince6: 0,
                issuesSinceFeatured: 0
            }));

            // Chạy qua từng banner gacha
            for (let b = 0; b < numBanners; b++) {
                // Xác định lượng vé nhận được trong banner này
                let bannerIncome = incomePerBanner;
                
                if (mode === 'pulls') {
                    if (b === numBanners - 1) {
                        // Banner cuối cùng nhận phần còn lại của tổng số pull
                        bannerIncome = totalPullsAllocated - (numBanners - 1) * incomePerBanner;
                    }
                }

                for (let p = 0; p < numPlayers; p++) {
                    const player = players[p];
                    const charPity = playerCharPities[p];
                    const weaponPity = playerWeaponPities[p];

                    // Chạy gacha banner hiện tại
                    runSingleBannerForPlayer(
                        strategyId,
                        player,
                        charPity,
                        weaponPity,
                        bannerIncome,
                        weaponIncomeNonGacha,
                        b,
                        numBanners
                    );
                }
            }

            // Thu thập và phân tích dữ liệu thống kê
            results[strategyId] = this.analyzeResults(players, numBanners);
        });

        return results;
    }

    /**
     * Phân tích kết quả mô phỏng của một nhóm người chơi
     * @param {Array<SimulatorPlayer>} players - Danh sách người chơi sau giả lập
     * @param {number} numBanners - Tổng số banner đã chạy
     * @returns {Object} Báo cáo thống kê chi tiết
     */
    static analyzeResults(players, numBanners) {
        const numPlayers = players.length;
        
        let sumFeaturedChars = 0;
        let sumFeaturedUnique = 0;
        let sumFeaturedDupes = 0;
        let sumLechLimited = 0;
        let sumStandard6Stars = 0;
        let sum5Stars = 0;
        let sumCharPulls = 0;
        let sumUrgentPulls = 0;
        let sumCharDebt = 0;
        let sumUnspentChar = 0;
        let sumUnspentWeapon = 0;

        let sumFeaturedWeapons = 0;
        let sumStandard6StarWeapons = 0;
        let sum5StarWeapons = 0;
        let sumWeaponPulls = 0;
        let sumWeaponDebt = 0;
        let sumWeaponSelectors = 0;
        
        let sumWeaponTicketsUsed = 0;

        // Cực trị (Hên nhất, Đen nhất)
        let maxFeaturedChars = -Infinity;
        let minFeaturedChars = Infinity;
        let maxFeaturedWeapons = -Infinity;
        let minFeaturedWeapons = Infinity;

        // Lưu trữ phân phối số lượng Featured nhân vật nhận được
        const distribution = {};

        players.forEach(player => {
            sumFeaturedChars += player.ownedFeaturedCharacters;
            sumFeaturedUnique += player.ownedFeaturedUnique || 0;
            sumFeaturedDupes += player.ownedFeaturedDupes || 0;
            sumLechLimited += player.ownedLechLimited || 0;
            sumStandard6Stars += player.ownedStandard6Stars;
            sum5Stars += player.owned5Stars;
            sumCharPulls += player.totalCharPulls;
            sumUrgentPulls += player.totalUrgentPulls;
            sumCharDebt += player.charTicketsDebt;
            sumUnspentChar += player.charTickets;
            sumUnspentWeapon += player.arsenalTickets;

            sumFeaturedWeapons += player.ownedFeaturedWeapons;
            sumStandard6StarWeapons += player.ownedStandard6StarWeapons;
            sum5StarWeapons += player.owned5StarWeapons;
            sumWeaponPulls += player.totalWeaponPulls;
            sumWeaponDebt += player.arsenalTicketsDebt;
            sumWeaponSelectors += player.weaponMilestoneSelectors;
            
            sumWeaponTicketsUsed += player.totalWeaponTicketsUsed || 0;

            // Tính toán giá trị cực trị
            if (player.ownedFeaturedCharacters > maxFeaturedChars) maxFeaturedChars = player.ownedFeaturedCharacters;
            if (player.ownedFeaturedCharacters < minFeaturedChars) minFeaturedChars = player.ownedFeaturedCharacters;
            
            if (player.ownedFeaturedWeapons > maxFeaturedWeapons) maxFeaturedWeapons = player.ownedFeaturedWeapons;
            if (player.ownedFeaturedWeapons < minFeaturedWeapons) minFeaturedWeapons = player.ownedFeaturedWeapons;

            const count = player.ownedFeaturedCharacters;
            distribution[count] = (distribution[count] || 0) + 1;
        });

        // Chuyển đổi phân phối sang dạng phần trăm để vẽ biểu đồ
        const distributionPercent = {};
        Object.keys(distribution).forEach(key => {
            distributionPercent[key] = (distribution[key] / numPlayers) * 100;
        });

        const averageFeaturedChars = sumFeaturedChars / numPlayers;
        const ownershipRate = (averageFeaturedChars / numBanners) * 100;

        return {
            // Thống kê Nhân vật (Trung bình mỗi người chơi)
            avgFeaturedChars: averageFeaturedChars,
            avgFeaturedUnique: sumFeaturedUnique / numPlayers,
            avgFeaturedDupes: sumFeaturedDupes / numPlayers,
            avgLechLimited: sumLechLimited / numPlayers,
            avgStandard6Stars: sumStandard6Stars / numPlayers,
            avg5Stars: sum5Stars / numPlayers,
            avgCharPulls: sumCharPulls / numPlayers,
            avgUnspentChar: sumUnspentChar / numPlayers,
            avgUnspentWeapon: sumUnspentWeapon / numPlayers,
            avgUrgentPulls: sumUrgentPulls / numPlayers,
            avgCharDebt: sumCharDebt / numPlayers,
            ownershipRate: ownershipRate,
            
            // Cực trị nhân vật
            bestLuckChar: maxFeaturedChars,
            worstLuckChar: minFeaturedChars,
            
            // Hiệu suất vé nhân vật (Số vé trung bình để ra 1 Featured)
            avgPullsPerFeaturedChar: averageFeaturedChars > 0 
                ? (sumCharPulls + sumCharDebt) / sumFeaturedChars 
                : Infinity,

            // Thống kê Vũ khí (Trung bình mỗi người chơi)
            avgFeaturedWeapons: sumFeaturedWeapons / numPlayers,
            avgStandard6StarWeapons: sumStandard6StarWeapons / numPlayers,
            avg5StarWeapons: sum5StarWeapons / numPlayers,
            avgWeaponPulls: sumWeaponPulls / numPlayers,
            avgWeaponDebt: sumWeaponDebt / numPlayers,
            avgWeaponSelectors: sumWeaponSelectors / numPlayers,
            avgWeaponTicketsUsed: sumWeaponTicketsUsed / numPlayers,

            // Cực trị vũ khí
            bestLuckWeapon: maxFeaturedWeapons,
            worstLuckWeapon: minFeaturedWeapons,
            
            // Phân phối tần suất
            distribution: distributionPercent
        };
    }
}
