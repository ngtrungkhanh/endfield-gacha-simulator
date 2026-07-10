/**
 * core xử lý toán học gacha của Arknights: Endfield
 */

/**
 * Thực hiện 1 lượt pull nhân vật (Headhunting)
 * @param {Object} state - Trạng thái pity của người chơi
 * @param {boolean} isUrgent - Có phải lượt quay từ Urgent Recruitment (mốc 30) hay không
 * @returns {Object} Kết quả lượt quay { rarity: 4|5|6, isFeatured: boolean, isUrgent: boolean }
 */
export function rollCharacter(state, isUrgent = false) {
    if (isUrgent) {
        // Urgent Recruitment: Tỉ lệ cơ bản, không tăng pity, không reset pity khi trúng
        const r = Math.random();
        if (r < 0.008) {
            const isFeatured = Math.random() < 0.5;
            const isLechLimited = !isFeatured && (Math.random() < 0.10);
            return { rarity: 6, isFeatured, isUrgent: true, isLechLimited };
        } else if (r < 0.008 + 0.08) {
            return { rarity: 5, isFeatured: Math.random() < 0.5, isUrgent: true };
        } else {
            return { rarity: 4, isFeatured: false, isUrgent: true };
        }
    }

    // Lượt pull tiêu chuẩn
    state.bannerPullsCount++;
    state.pity6++;
    state.pity5++;
    state.pullsSinceFeatured++;

    let rate6 = 0.008;

    // Soft Pity bắt đầu từ lượt thứ 65 (tỉ lệ tăng thêm 5% mỗi lượt sau lượt 65)
    // Lượt 66: 5.8%, Lượt 67: 10.8%... Lượt 80: 80.8% -> Hard Pity ở 80 (100%)
    if (state.pity6 >= 80) {
        rate6 = 1.0;
    } else if (state.pity6 > 65) {
        rate6 = 0.008 + (state.pity6 - 65) * 0.05;
    }

    // Bảo hiểm 120 lượt chắc chắn ra Featured nhân vật
    const isGuaranteedFeatured = state.pullsSinceFeatured >= 120;
    if (isGuaranteedFeatured) {
        rate6 = 1.0;
    }

    const r = Math.random();
    if (r < rate6) {
        // Trúng 6-Star!
        const isFeatured = isGuaranteedFeatured ? true : (Math.random() < 0.5);
        const isLechLimited = !isFeatured && (Math.random() < 0.10);
        state.pity6 = 0;
        state.pity5 = 0;
        if (isFeatured) {
            state.pullsSinceFeatured = 0;
        }
        return { rarity: 6, isFeatured, isUrgent: false, isLechLimited };
    }

    // Bảo hiểm 5-Star: Chắc chắn ra 5-Star trở lên ở lượt thứ 10 nếu 9 lượt trước không ra 5-Star/6-Star
    const isGuaranteed5 = state.pity5 >= 10;
    const rate5 = isGuaranteed5 ? 1.0 : 0.08;

    if (Math.random() < rate5) {
        // Trúng 5-Star!
        const isFeatured = Math.random() < 0.5;
        state.pity5 = 0;
        return { rarity: 5, isFeatured, isUrgent: false };
    }

    // Ra 4-Star!
    return { rarity: 4, isFeatured: false, isUrgent: false };
}

/**
 * Thực hiện 1 lượt quay Issue vũ khí (Arsenal Exchange - 10 pulls)
 * @param {Object} state - Trạng thái của banner vũ khí
 * @returns {Object} Kết quả { items: Array<{rarity, isFeatured}>, milestoneReward: string|null }
 */
export function rollWeaponIssue(state) {
    state.issuesCount++;

    let guaranteeFeatured = state.issuesSinceFeatured >= 7; // Issue thứ 8 chắc chắn trúng Featured
    let guarantee6 = state.issuesSince6 >= 3;              // Issue thứ 4 chắc chắn trúng 6-Star

    const results = [];
    let found6 = false;
    let foundFeatured = false;

    // Mỗi Issue gồm 10 lượt pull vũ khí
    for (let i = 0; i < 10; i++) {
        let rarity = 4;
        let isFeatured = false;

        if (i === 0 && guaranteeFeatured) {
            // Cưỡng chế ra vũ khí 6-Star rate-up
            rarity = 6;
            isFeatured = true;
            guaranteeFeatured = false;
            guarantee6 = false;
        } else if (i === 0 && guarantee6) {
            // Cưỡng chế ra vũ khí 6-Star (25% trúng rate-up)
            rarity = 6;
            isFeatured = Math.random() < 0.25;
            guarantee6 = false;
        } else {
            let p6 = 0.04;  // Tỉ lệ 6★: 4%
            let p5 = 0.15;  // Tỉ lệ 5★: 15%
            let p4 = 0.81;  // Tỉ lệ 4★: 81%

            // Bảo hiểm 5★ trở lên trong cùng 1 Issue (x10)
            const hasHighRarity = results.some(item => item.rarity >= 5);
            if (i === 9 && !hasHighRarity) {
                // Nếu 9 lượt trước toàn 4★, lượt thứ 10 buộc phải là 5★ hoặc 6★
                p4 = 0;
                const total = p6 + p5; // 0.04 + 0.15 = 0.19
                p6 = p6 / total; // ~21%
                p5 = p5 / total; // ~79%
            }

            const r = Math.random();
            if (r < p6) {
                rarity = 6;
                isFeatured = Math.random() < 0.25;
            } else if (r < p6 + p5) {
                rarity = 5;
                isFeatured = Math.random() < 0.25;
            } else {
                rarity = 4;
            }
        }

        if (rarity === 6) {
            found6 = true;
            if (isFeatured) {
                foundFeatured = true;
            }
        }

        results.push({ rarity, isFeatured });
    }

    // Cập nhật bộ đếm
    if (found6) {
        state.issuesSince6 = 0;
    } else {
        state.issuesSince6++;
    }

    if (foundFeatured) {
        state.issuesSinceFeatured = 0;
    } else {
        state.issuesSinceFeatured++;
    }

    // Tính toán phần thưởng cột mốc (Milestone Rewards)
    let milestoneReward = null;
    if (state.issuesCount === 10) {
        milestoneReward = 'selector_box'; // Hộp tự chọn vũ khí
    } else if (state.issuesCount === 18) {
        milestoneReward = 'featured_weapon'; // Tặng thẳng vũ khí rate-up
    } else if (state.issuesCount > 18 && (state.issuesCount - 18) % 8 === 0) {
        milestoneReward = 'featured_weapon'; // Cứ mỗi 8 Issues tiếp theo lại tặng thẳng
    }

    return {
        items: results,
        milestoneReward
    };
}

/**
 * Tính số lượng vé hoàn trả Arsenal Tickets thu được từ gacha nhân vật
 * @param {Array} hhResults - Danh sách kết quả gacha nhân vật
 * @returns {number} Số vé Arsenal Tickets nhận được
 */
export function calculateArsenalTicketsRebate(hhResults) {
    let tickets = 0;
    hhResults.forEach(item => {
        if (item.rarity === 6) {
            tickets += 2000;
        } else if (item.rarity === 5) {
            tickets += 200;
        } else if (item.rarity === 4) {
            tickets += 20;
        }
    });
    return tickets;
}
