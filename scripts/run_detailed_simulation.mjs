import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

import { SimulatorPlayer, runSingleBannerForPlayer, strategies } from '../js/strategies.js';

const CONFIG = {
    seed: 20260711,
    numBanners: 10,
    startingCharTickets: 80,
    startingWeaponTickets: 8000,
    baseCharIncomePerBanner: 35,
    baseWeaponIncomePerBanner: 500,
    monthlyPass: true,
    protocolPass: false,
    strategyIds: ['save_commit']
};

CONFIG.charIncomePerBanner = CONFIG.baseCharIncomePerBanner + (CONFIG.monthlyPass ? 9 : 0) + (CONFIG.protocolPass ? 5 : 0);
CONFIG.weaponIncomePerBanner = CONFIG.baseWeaponIncomePerBanner + (CONFIG.protocolPass ? 1200 : 0);

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

function countByRarity(items) {
    return {
        six: items.filter(item => item.rarity === 6).length,
        five: items.filter(item => item.rarity === 5).length,
        four: items.filter(item => item.rarity === 4).length
    };
}

function countLimited(items) {
    return {
        featured6: items.filter(item => item.rarity === 6 && item.isFeatured).length,
        lechLimited6: items.filter(item => item.rarity === 6 && !item.isFeatured && item.isLechLimited).length,
        standard6: items.filter(item => item.rarity === 6 && !item.isFeatured && !item.isLechLimited).length,
        five: items.filter(item => item.rarity === 5).length,
        four: items.filter(item => item.rarity === 4).length
    };
}

function compactCharacter(item) {
    if (item.rarity === 6) {
        if (item.isFeatured) return 'F6';
        return item.isLechLimited ? 'L6' : 'S6';
    }
    return String(item.rarity);
}

function compactWeapon(item) {
    if (item.rarity === 6) return item.isFeatured ? 'F6' : 'S6';
    return String(item.rarity);
}

function formatNumber(value, digits = 0) {
    return Number(value).toLocaleString('vi-VN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
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
        weaponTicketsUsed: player.totalWeaponTicketsUsed
    };
}

function delta(after, before, key) {
    return after[key] - before[key];
}

const originalRandom = Math.random;
const runs = [];

try {
    for (const strategyId of CONFIG.strategyIds) {
        Math.random = mulberry32(CONFIG.seed);

        const player = new SimulatorPlayer(1);
        player.charTickets = CONFIG.startingCharTickets;
        player.arsenalTickets = CONFIG.startingWeaponTickets;

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
        for (let bannerIndex = 0; bannerIndex < CONFIG.numBanners; bannerIndex++) {
            const before = snapshotPlayer(player);
            const incomingDossier = player.nextBannerDossierTickets;
            const result = runSingleBannerForPlayer(
                strategyId,
                player,
                charState,
                weaponState,
                CONFIG.charIncomePerBanner,
                CONFIG.weaponIncomePerBanner,
                bannerIndex,
                CONFIG.numBanners
            );
            const after = snapshotPlayer(player);

            const regularLimited = result.charPulls.filter(item => !item.isUrgent);
            const urgent = result.charPulls.filter(item => item.isUrgent);
            const standardCounts = countByRarity(result.standardPulls);
            const limitedCounts = countLimited(regularLimited);
            const urgentCounts = countLimited(urgent);

            banners.push({
                index: bannerIndex + 1,
                before,
                after,
                incomingDossier,
                result,
                regularLimited,
                urgent,
                standardCounts,
                limitedCounts,
                urgentCounts,
                charPityAfter: { ...charState },
                weaponPityAfter: { ...weaponState },
                newFeatured: delta(after, before, 'featuredCharacters'),
                newUnique: delta(after, before, 'featuredUnique'),
                newDupes: delta(after, before, 'featuredDupes'),
                newFeaturedWeapons: delta(after, before, 'featuredWeapons'),
                potentialTokens: delta(after, before, 'potentialTokens'),
                weaponTicketsSpent: delta(after, before, 'weaponTicketsUsed')
            });
        }

        assert.equal(banners.reduce((sum, banner) => sum + banner.result.standardPulls.length, 0), CONFIG.numBanners * 15);
        assert.equal(banners.reduce((sum, banner) => sum + banner.regularLimited.length, 0), player.totalLimitedPulls);
        assert.equal(banners.reduce((sum, banner) => sum + banner.urgent.length, 0), player.totalUrgentPulls);
        assert.equal(banners.every(banner => banner.after.currentDossier === 0), true, 'Dossier khả dụng phải được xả hết');
        assert.equal(player.charTickets >= 0 && player.arsenalTickets >= 0, true, 'Ví cuối không được âm');

        runs.push({ strategyId, player, banners });
    }
} finally {
    Math.random = originalRandom;
}

function readableCharacterName(item) {
    if (!item.characterId) return '';
    if (item.isFeatured) return `Featured_Char_B${Number(item.characterId.split('_').at(-1)) + 1}`;
    return item.characterId
        .replace('char_5_', 'Operator_5★_')
        .replace('std_6_', 'Standard_6★_')
        .replace('lim_6_', 'Limited_6★_');
}

function formatGuarantee120(item) {
    return item.guarantee120ConsumedAfter
        ? 'đã hoàn thành (Featured đã nhận)'
        : `${item.pullsSinceFeaturedAfter}/120`;
}

function limitedPityText(item) {
    const prefix = item.isUrgent ? 'Pity không đổi' : 'Pity sau lượt';
    return `${prefix}: 80 = ${item.pity6After}/80 · 120 = ${formatGuarantee120(item)}`;
}

function notableCharacterLine(item, label, pool = 'limited') {
    const icon = item.rarity === 6 ? (item.isFeatured ? '👑' : '🔴') : '🟣';
    const rarityText = item.rarity === 6
        ? (item.isFeatured ? '6★ FEATURED' : item.isLechLimited ? '6★ LỆCH LIMITED' : '6★ STANDARD')
        : '5★';
    const ownership = item.isDuplicate ? 'TRÙNG' : 'MỚI';
    const details = [ownership];
    if (item.quotaEarned) details.push(`+${item.quotaEarned} Quota`);
    if (item.quotaTicketsExchanged) details.push(`đổi +${item.quotaTicketsExchanged} vé → ví lúc đó ${item.charTicketsAfterQuota} vé`);
    if (pool === 'standard') {
        details.push(`Pity Standard 80 = ${item.standardPity6After}/80`);
    } else {
        details.push(limitedPityText(item));
    }
    return `- ${label}: ${icon} **${rarityText}** → ${readableCharacterName(item)} [${details.join(' · ')}]`;
}

function appendNotableCharacters(lines, items, labelPrefix, offset = 0, pool = 'limited') {
    const notable = items
        .map((item, index) => ({ item, index: index + 1 + offset }))
        .filter(entry => entry.item.rarity >= 5);
    if (notable.length === 0) {
        lines.push('- Không có kết quả 5★/6★ đáng chú ý.');
        return;
    }
    notable.forEach(entry => lines.push(notableCharacterLine(entry.item, `${labelPrefix} ${entry.index}`, pool)));
}

function phaseDecisionLine(phase, items) {
    const paidCount = items.filter(item => !item.isUrgent).length;
    if (phase === 'commit') {
        return `- **Thực thi Commit:** dùng vé để tiến tới Featured/trần 120; quay ${paidCount} lượt có tính pity trong pha này và dừng sau cụm quay chứa Featured.`;
    }
    if (phase === 'dossier') {
        return `- **Cưỡng chế dùng Dossier:** quay ${paidCount} lượt vì Dossier chỉ có hiệu lực trong banner này; để lại sẽ hết hạn.`;
    }
    if (phase === 'optimize30') {
        return `- **Tối ưu mốc 30:** bỏ thêm ${paidCount} vé thường vì đã ở trong khoảng 20–29 lượt, nhằm nhận ngay 10 Urgent miễn phí.`;
    }
    return `- Thực hiện thêm ${paidCount} lượt theo điều kiện của chiến thuật.`;
}

function appendPaidTimeline(lines, paidTimeline) {
    if (paidTimeline.length === 0) {
        lines.push('- Không phát sinh lượt Limited ngoài 10 free hay Urgent Recruitment.');
        return;
    }

    let currentPhase = null;
    let urgentIndex = 0;
    let inUrgentBlock = false;

    for (let timelineIndex = 0; timelineIndex < paidTimeline.length; timelineIndex++) {
        const item = paidTimeline[timelineIndex];
        if (item.actionPhase !== currentPhase) {
            currentPhase = item.actionPhase;
            const phaseItems = paidTimeline.filter(entry => entry.actionPhase === currentPhase);
            lines.push(phaseDecisionLine(currentPhase, phaseItems));
        }

        if (item.isUrgent) {
            if (!inUrgentBlock) {
                inUrgentBlock = true;
                urgentIndex = 0;
                lines.push('- **[Ngay sau mốc 30]** Hệ thống bắt buộc thực hiện 10 lượt Urgent Recruitment miễn phí; không thể lưu sang lúc khác. Các lượt này không tăng hoặc reset pity 80/120.');
            }
            urgentIndex++;
            if (item.rarity >= 5) {
                lines.push(notableCharacterLine(item, `Lượt Urgent ${urgentIndex}`));
            }
            continue;
        }

        inUrgentBlock = false;
        if (item.bannerPullsCountAfter === 120) {
            lines.push('- **[Mốc 120]** Bảo hiểm Featured kích hoạt cho chính lượt Limited 120; tiến độ này chỉ thuộc banner hiện tại.');
        }
        if (item.pity6Before === 65) {
            lines.push(`- **[Mốc soft pity 66/80]** Lượt Limited ${item.bannerPullsCountAfter} là lượt thứ 66 kể từ 6★ gần nhất, bắt đầu vùng tăng tỷ lệ; bộ đếm trước lượt là 65/80.`);
        }
        if (item.pity6Before === 79) {
            lines.push(`- **[Mốc pity 80]** Lượt Limited ${item.bannerPullsCountAfter} được bảo đảm 6★.`);
        }
        if (item.rarity >= 5) {
            lines.push(notableCharacterLine(item, `Lượt Limited ${item.bannerPullsCountAfter}`));
            if (item.rarity === 6 && item.isFeatured) {
                const remainingInBatch = paidTimeline.slice(timelineIndex + 1).filter(entry =>
                    !entry.isUrgent &&
                    entry.actionPhase === item.actionPhase &&
                    entry.rollBatchId === item.rollBatchId
                ).length;
                if (item.rollMode === 'x10' && remainingInBatch > 0) {
                    lines.push(`- **Quyết định tại Featured:** Featured xuất hiện giữa cụm x10 nên ${remainingInBatch} lượt còn lại của cụm vẫn được hoàn tất; sau đó chiến thuật mới dừng dùng vé thường.`);
                } else {
                    lines.push('- **Quyết định tại Featured:** lượt quay hiện tại đã kết thúc; chiến thuật dừng dùng vé thường ngay vì mục tiêu Featured đã hoàn thành. Dossier còn dư, nếu có, vẫn phải được dùng trước khi hết hạn.');
                }
            }
        }
        if (item.bannerPullsCountAfter === 60) {
            lines.push('- **[Ngay sau mốc 60]** Nhận 10 Dossier dành riêng cho banner kế tiếp.');
        }
    }
}

const run = runs[0];
const player = run.player;
const lines = [];
lines.push('# Nhật ký Chi tiết Gacha của 1 Người Chơi qua 10 Mùa Banner');
lines.push('');
lines.push('> [!NOTE]');
lines.push('> Nhật ký ghi lại chiến thuật **Save & Commit** với seed `20260711`. Đây là một run đơn lẻ để theo dõi diễn biến, không phải kết quả trung bình thống kê.');
lines.push('>');
lines.push(`> Cấu hình: ${CONFIG.startingCharTickets} vé nhân vật ban đầu, ${formatNumber(CONFIG.startingWeaponTickets)} Arsenal ban đầu; mỗi banner nhận ${CONFIG.baseCharIncomePerBanner} vé cơ bản + 9 Monthly = **${CONFIG.charIncomePerBanner} vé nhân vật**, cùng **${formatNumber(CONFIG.weaponIncomePerBanner)} Arsenal**; không BP.`);

for (const banner of run.banners) {
    const decision = banner.result.decisionState;
    const freeLimited = banner.regularLimited.slice(0, 10);
    const paidTimeline = banner.result.charPulls.slice(10);
    const freeFeatured = freeLimited.some(item => item.rarity === 6 && item.isFeatured);
    const enoughToCommit = decision.totalAvailable >= 110;
    const arsenalBeforeWeapon = banner.before.arsenalTickets + banner.result.totalArsenalTicketsEarned;
    const totalCharacterResults = banner.result.standardPulls.length + banner.regularLimited.length + banner.urgent.length;
    const allCharacterResults = [...banner.result.standardPulls, ...banner.result.charPulls];
    const standardQuota = banner.result.standardPulls.reduce((sum, item) => sum + (item.quotaEarned || 0), 0);
    const limitedQuota = banner.regularLimited.reduce((sum, item) => sum + (item.quotaEarned || 0), 0);
    const urgentQuota = banner.urgent.reduce((sum, item) => sum + (item.quotaEarned || 0), 0);
    const quotaEarned = allCharacterResults.reduce((sum, item) => sum + (item.quotaEarned || 0), 0);
    const quotaTicketsExchanged = allCharacterResults.reduce((sum, item) => sum + (item.quotaTicketsExchanged || 0), 0);

    lines.push('');
    lines.push(`## ⚔️ BANNER MÙA ${banner.index}`);
    lines.push('');
    lines.push('### 📦 [Nhập Ví Đầu Mùa]');
    lines.push('');
    lines.push(`- Nhận **+${CONFIG.charIncomePerBanner} vé nhân vật** và **+${formatNumber(CONFIG.weaponIncomePerBanner)} Arsenal Tickets**.`);
    lines.push(`- Ví trước khi xử lý pull: ${formatNumber(banner.before.charTickets + CONFIG.charIncomePerBanner)} vé nhân vật; ${banner.incomingDossier} Dossier khả dụng; **${banner.before.bondQuota} Bond Quota**; ${formatNumber(banner.before.arsenalTickets)} Arsenal đang tích lũy.`);
    lines.push(`- Pity đầu mùa trước khi quay: **Limited 80 = ${banner.result.bannerStartState.pity6}/80** (được cộng dồn từ banner trước); **Featured 120 = 0/120** (đã reset khi đổi banner); **Standard 80 = ${banner.before.standardPity6 ?? banner.result.standardPulls[0]?.standardPity6Before ?? 0}/80**.`);
    lines.push('');
    lines.push('### 🔴 [Phần 1] Quay 15 lượt Standard miễn phí');
    lines.push('');
    appendNotableCharacters(lines, banner.result.standardPulls, 'Lượt Standard', 0, 'standard');
    lines.push(`- Kết thúc Standard: pity Standard 80 = **${banner.result.standardPulls.at(-1).standardPity6After}/80**; pity này độc lập với Limited.`);
    lines.push('');
    lines.push('### 👑 [Phần 2] Quay 10 lượt Limited miễn phí');
    lines.push('');
    appendNotableCharacters(lines, freeLimited, 'Lượt Limited free');
    lines.push(`- Sau 10 free: pity Limited 80 = **${decision.pity6}/80**; Featured 120 = **${decision.guarantee120Consumed ? 'đã hoàn thành' : `${decision.pullsSinceFeatured}/120`}**.`);
    lines.push('');
    lines.push('### 🎫 [Phần 3] Quyết định Save & Commit');
    lines.push('');
    lines.push(`- Sau Standard và 10 Limited free: **${decision.charTickets} vé thường + ${decision.dossierTickets} Dossier = ${decision.totalAvailable} lượt khả dụng**.`);
    if (freeFeatured) {
        lines.push('- **Quyết định không Commit bằng vé thường:** Featured đã xuất hiện trong 10 free nên mục tiêu nhân vật của mùa đã hoàn thành. Nếu còn Dossier, vẫn phải dùng vì chúng hết hạn cuối banner.');
    } else if (enoughToCommit) {
        lines.push('- **Quyết định Commit:** có ít nhất 110 lượt trả phí, cộng 10 free đủ chạm trần 120. Quay đến khi nhận Featured hoặc tới mốc bảo hiểm 120; dùng x1 khi còn dưới 10 lượt tới mốc 30/60/80/120.');
    } else {
        lines.push('- **Quyết định không Commit:** tổng lượt khả dụng dưới 110 nên không bảo đảm được Featured ở mốc 120. Giữ vé thường, ngoại trừ Dossier sắp hết hạn và phần vé cần thiết để tối ưu mốc 30.');
    }
    appendPaidTimeline(lines, paidTimeline);
    const finalLimitedPity = banner.charPityAfter.guarantee120Consumed
        ? 'đã hoàn thành (Featured đã nhận)'
        : `${banner.charPityAfter.pullsSinceFeatured}/120`;
    lines.push(`- **Quyết định kết thúc phần nhân vật:** ${banner.result.gotFeaturedChar ? 'dừng dùng vé thường vì đã nhận Featured; mọi Dossier khả dụng được mang từ mùa trước đã được xả để tránh hết hạn (Dossier vừa nhận ở mốc 60 vẫn được giữ cho mùa kế tiếp)' : 'dừng và giữ số vé thường còn lại vì không còn hành động bắt buộc hoặc mốc tối ưu đủ điều kiện'}. Pity lúc dừng: 80 = ${banner.charPityAfter.pity6}/80; 120 = ${finalLimitedPity}.`);
    lines.push('');
    lines.push('### 🔄 [Phần 4] Kiếm và quy đổi Bond Quota');
    lines.push('');
    lines.push(`- Bond Quota đầu mùa: **${banner.before.bondQuota}**.`);
    lines.push(`- Kiếm trong mùa: **+${quotaEarned} Quota** = ${standardQuota} từ Standard + ${limitedQuota} từ Limited + ${urgentQuota} từ Urgent.`);
    if (quotaTicketsExchanged > 0) {
        lines.push(`- Tự động quy đổi **${quotaTicketsExchanged * 25} Quota → +${quotaTicketsExchanged} vé nhân vật** theo tỷ lệ 25 Quota/vé. Vé được cộng ngay vào ví tại đúng lượt phát sinh và có thể được dùng tiếp trong chính banner này.`);
    } else {
        lines.push('- Chưa đủ thêm 25 Quota tại bất kỳ thời điểm nào để đổi vé; không nhận thêm pull từ Quota trong mùa này.');
    }
    lines.push(`- Bond Quota cuối mùa: **${banner.after.bondQuota}**. Lũy kế Quota từng kiếm đến hết mùa: **${banner.after.totalBondQuotaEarned}**.`);
    lines.push(`- Đối soát: ${banner.before.bondQuota} đầu mùa + ${quotaEarned} kiếm được − ${quotaTicketsExchanged * 25} đã đổi = **${banner.after.bondQuota} Quota** còn lại.`);
    lines.push('');
    lines.push('### 💰 [Phần 5] Rebate Arsenal');
    lines.push('');
    lines.push(`- Tổng kết quả nhân vật trong banner: **${totalCharacterResults}** (${banner.result.standardPulls.length} Standard + ${banner.regularLimited.length} Limited + ${banner.urgent.length} Urgent).`);
    lines.push(`- Rebate từ gacha nhân vật: **+${formatNumber(banner.result.arsenalTicketsRebate)} Arsenal**.`);
    lines.push(`- Thu nhập cố định: **+${formatNumber(CONFIG.weaponIncomePerBanner)} Arsenal**.`);
    lines.push(`- Số dư trước khi quyết định quay vũ khí: **${formatNumber(arsenalBeforeWeapon)} Arsenal** (~${formatNumber(arsenalBeforeWeapon / 198, 1)} pull vũ khí).`);
    lines.push('');
    lines.push('### ⚔️ [Phần 6] Quay Arsenal theo Save & Commit');
    lines.push('');
    lines.push(`- Trúng Featured Operator trong banner: **${banner.result.gotFeaturedChar ? 'CÓ' : 'KHÔNG'}**.`);
    lines.push(`- Ngưỡng bắt đầu: **15.840 Arsenal**; trạng thái ngân sách: **${arsenalBeforeWeapon >= 15840 ? 'ĐỦ' : 'KHÔNG ĐỦ'}**.`);
    if (banner.result.weaponIssues.length === 0) {
        if (!banner.result.gotFeaturedChar) {
            lines.push('- **Quyết định không quay Arsenal:** chưa nhận Featured Operator của mùa, nên Save & Commit không theo đuổi vũ khí tương ứng dù ngân sách có thể đã đủ. Tiếp tục tích lũy.');
        } else {
            lines.push('- **Quyết định không quay Arsenal:** đã nhận Featured Operator nhưng chưa đủ 15.840 Arsenal để bảo đảm tối đa 8 Issues. Tiếp tục tích lũy.');
        }
    } else {
        lines.push(`- **Quyết định quay Arsenal:** đã có Featured Operator và ngân sách đạt ngưỡng bảo đảm 8 Issues. Thực hiện **${banner.result.weaponIssues.length} Issue** rồi dừng khi nhận Featured Weapon; tiêu **${formatNumber(banner.weaponTicketsSpent)} Arsenal**.`);
        banner.result.weaponIssues.forEach((issue, issueIndex) => {
            const notable = issue.items
                .map((item, index) => ({ item, index: index + 1 }))
                .filter(entry => entry.item.rarity >= 5)
                .map(entry => {
                    if (entry.item.rarity === 6) return `Pull ${entry.index}: ${entry.item.isFeatured ? '👑 6★ FEATURED' : '🔴 6★ lệch rate'}`;
                    return `Pull ${entry.index}: 🟣 5★`;
                });
            const milestone = issue.milestoneReward ? `; quà mốc: ${issue.milestoneReward}` : '';
            lines.push(`  - Issue #${issueIndex + 1}: ${notable.join('; ') || 'chỉ có 4★'}${milestone}.`);
        });
    }
    lines.push('');
    lines.push(`### 📌 [Trạng thái cuối mùa ${banner.index}]`);
    lines.push('');
    lines.push(`- Ví: **${formatNumber(banner.after.charTickets)} vé nhân vật**, **${banner.after.nextDossier} Dossier cho banner sau**, **${formatNumber(banner.after.arsenalTickets)} Arsenal**.`);
    lines.push(`- Kết quả mùa: Featured Operator **${banner.newFeatured}**, Featured Weapon **${banner.newFeaturedWeapons}**.`);
    lines.push(`- Pity cuối mùa: **Limited 80 = ${banner.charPityAfter.pity6}/80** (mang sang mùa sau); **Featured 120 = ${banner.charPityAfter.guarantee120Consumed ? 'đã hoàn thành' : `${banner.charPityAfter.pullsSinceFeatured}/120`}** (sẽ reset về 0 khi sang mùa sau); **Standard 80 = ${banner.result.standardPulls.at(-1).standardPity6After}/80**.`);
}

lines.push('');
lines.push('## 📊 BÁO CÁO TỔNG KẾT RUN');
lines.push('');
lines.push(`- Featured Operator sở hữu: **${player.ownedFeaturedCharacters}** (${player.ownedFeaturedUnique} Unique, ${player.ownedFeaturedDupes} Dupe).`);
lines.push(`- 6★ lệch Limited / Standard: **${player.ownedLechLimited} / ${player.ownedStandard6Stars}**.`);
lines.push(`- Operator 5★: **${player.owned5Stars}**.`);
lines.push(`- Tổng pull nhân vật: **${player.totalCharPulls}**; Urgent miễn phí: **${player.totalUrgentPulls}**.`);
lines.push(`- Ví nhân vật còn dư: **${formatNumber(player.charTickets)}**; Bond Quota: **${player.bondQuota}**.`);
lines.push(`- Bond Quota toàn run: kiếm **${player.totalBondQuotaEarned}**, đã dùng **${player.totalBondQuotaEarned - player.bondQuota} Quota** để đổi **${(player.totalBondQuotaEarned - player.bondQuota) / 25} vé nhân vật**, còn **${player.bondQuota} Quota**.`);
lines.push(`- Featured Weapon: **${player.ownedFeaturedWeapons}**; 6★ lệch rate: **${player.ownedStandard6StarWeapons}**; Weapon 5★: **${player.owned5StarWeapons}**.`);
lines.push(`- Tổng pull vũ khí: **${player.totalWeaponPulls}**; Arsenal còn dư: **${formatNumber(player.arsenalTickets)}** (~${formatNumber(player.arsenalTickets / 198, 1)} pull).`);
lines.push('');

const outputPath = path.resolve('reports/detailed_gacha_run.md');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, lines.join('\n'), 'utf8');
console.log(outputPath);
