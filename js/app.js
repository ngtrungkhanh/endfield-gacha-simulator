import { rollCharacter, rollWeaponIssue, calculateArsenalTicketsRebate } from './gacha-math.js';
import { strategies } from './strategies.js';
import { MonteCarloSimulator } from './simulator.js';
import { drawDistributionChart, drawComparisonChart } from './chart-helper.js';

// ====================================================================
// STATE CHO PHẦN TƯƠNG TÁC QUAY GACHA (TAB 1)
// ====================================================================
let interactiveCharTickets = 120;
let interactiveWeaponTickets = 0;
let interactiveInventory = [];

// Trạng thái pity nhân vật của người chơi
const interactiveCharPity = {
    pity6: 0,
    pity5: 0,
    pullsSinceFeatured: 0,
    bannerPullsCount: 0
};

// Trạng thái pity vũ khí
const interactiveWeaponPity = {
    issuesCount: 0,
    issuesSince6: 0,
    issuesSinceFeatured: 0
};

// Thống kê đợt quay tương tác thời gian thực
const interactiveStats = {
    charTotal: 0,
    charUrgent: 0,
    char6star: 0,
    char6starFeatured: 0,
    char6starLechLimited: 0,
    char5star: 0,
    charLosing5050: 0,
    pullsInCurrent6StarCycle: 0,
    charPullsFor6starList: [], // Danh sách số lượt roll để ra mỗi 6★
    milestone30Triggered: false,
    milestone60Triggered: false,
    
    weapTicketsAccumulated: 0,
    weapIssues: 0,
    weap6star: 0,
    weapSelectors: 0
};

// ====================================================================
// LOCALSTORAGE PERSISTENCE HELPERS
// ====================================================================
const STORAGE_PREFIX = 'a9e_gacha_';
const SCHEMA_VERSION = '1.1';

function saveInteractiveState() {
    try {
        const state = {
            version: SCHEMA_VERSION,
            charTickets: interactiveCharTickets,
            weaponTickets: interactiveWeaponTickets,
            charPity: interactiveCharPity,
            weaponPity: interactiveWeaponPity,
            stats: interactiveStats
        };
        localStorage.setItem(STORAGE_PREFIX + 'interactive_state', JSON.stringify(state));
        localStorage.setItem(STORAGE_PREFIX + 'interactive_inventory', JSON.stringify(interactiveInventory));
    } catch (e) {
        console.error('Error saving interactive state to localStorage:', e);
    }
}

function loadInteractiveState() {
    try {
        const stateStr = localStorage.getItem(STORAGE_PREFIX + 'interactive_state');
        const invStr = localStorage.getItem(STORAGE_PREFIX + 'interactive_inventory');
        
        if (stateStr) {
            const state = JSON.parse(stateStr);
            if (state.version === SCHEMA_VERSION) {
                interactiveCharTickets = state.charTickets;
                interactiveWeaponTickets = state.weaponTickets;
                Object.assign(interactiveCharPity, state.charPity);
                Object.assign(interactiveWeaponPity, state.weaponPity);
                Object.assign(interactiveStats, state.stats);
            } else {
                console.warn('Storage version mismatch. Resetting state.');
                localStorage.removeItem(STORAGE_PREFIX + 'interactive_state');
                localStorage.removeItem(STORAGE_PREFIX + 'interactive_inventory');
            }
        }
        
        if (invStr) {
            interactiveInventory = JSON.parse(invStr);
        }
    } catch (e) {
        console.error('Error loading interactive state from localStorage:', e);
    }
}

function saveSimulatorSettings() {
    try {
        const settings = {
            version: SCHEMA_VERSION,
            mode: document.getElementById('select-sim-mode').value,
            players: document.getElementById('input-players').value,
            banners: document.getElementById('input-banners').value,
            startTickets: document.getElementById('input-start-tickets').value,
            totalPulls: document.getElementById('input-total-pulls').value,
            baseChar: document.getElementById('input-base-char').value,
            baseWeapon: document.getElementById('input-base-weapon').value,
            monthly: document.getElementById('toggle-monthly').checked,
            bp: document.getElementById('toggle-bp').checked
        };
        localStorage.setItem(STORAGE_PREFIX + 'simulator_settings', JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving simulator settings to localStorage:', e);
    }
}

function loadSimulatorSettings() {
    try {
        const settingsStr = localStorage.getItem(STORAGE_PREFIX + 'simulator_settings');
        if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            if (settings.version === SCHEMA_VERSION) {
                document.getElementById('select-sim-mode').value = settings.mode;
                document.getElementById('input-players').value = settings.players;
                document.getElementById('input-banners').value = settings.banners;
                document.getElementById('input-start-tickets').value = settings.startTickets;
                document.getElementById('input-total-pulls').value = settings.totalPulls;
                document.getElementById('input-base-char').value = settings.baseChar;
                document.getElementById('input-base-weapon').value = settings.baseWeapon;
                document.getElementById('toggle-monthly').checked = settings.monthly;
                document.getElementById('toggle-bp').checked = settings.bp;
                
                // Toggle containers visibility based on mode
                const containerBanners = document.getElementById('container-mode-banners');
                const containerPulls = document.getElementById('container-mode-pulls');
                if (settings.mode === 'banners') {
                    containerBanners.style.display = 'flex';
                    containerPulls.style.display = 'none';
                } else {
                    containerBanners.style.display = 'none';
                    containerPulls.style.display = 'flex';
                }
            }
        }
    } catch (e) {
        console.error('Error loading simulator settings from localStorage:', e);
    }
}

function saveSimulatorLastResults(results, numBanners) {
    try {
        const data = {
            version: SCHEMA_VERSION,
            results: results,
            numBanners: numBanners
        };
        localStorage.setItem(STORAGE_PREFIX + 'last_results', JSON.stringify(data));
    } catch (e) {
        console.error('Error saving last simulation results to localStorage:', e);
    }
}

function loadSimulatorLastResults() {
    try {
        const dataStr = localStorage.getItem(STORAGE_PREFIX + 'last_results');
        if (dataStr) {
            const data = JSON.parse(dataStr);
            if (data.version === SCHEMA_VERSION) {
                // Change title accordingly
                const modeSelect = document.getElementById('select-sim-mode');
                const totalPulls = Number(document.getElementById('input-total-pulls').value);
                const tableTitle = document.getElementById('table-comparison-title');
                
                if (modeSelect.value === 'banners') {
                    const numBanners = document.getElementById('input-banners').value;
                    tableTitle.innerText = `Bảng so sánh chi tiết các chiến thuật (Giả lập qua ${numBanners} mùa banner)`;
                } else {
                    const baseChar = Number(document.getElementById('input-base-char').value);
                    const isMonthly = document.getElementById('toggle-monthly').checked;
                    const isBP = document.getElementById('toggle-bp').checked;
                    const incomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
                    const calculatedBanners = Math.max(1, Math.ceil(totalPulls / incomePerBanner));
                    tableTitle.innerText = `Bảng so sánh chi tiết các chiến thuật (Giả lập với tổng số ${Number(totalPulls).toLocaleString()} pulls nhân vật ~ ${calculatedBanners} banner)`;
                }
                
                displaySimulatorResults(data.results, data.numBanners);
            }
        }
    } catch (e) {
        console.error('Error loading last simulation results from localStorage:', e);
    }
}

// ====================================================================
// XỬ LÝ KHỞI TẠO VÀ TƯƠNG TÁC GIAO DIỆN (UI/UX)
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    initTabSwitcher();
    initInteractiveGacha();
    initSimulatorControls();
    
    // Load persisted state from localStorage
    loadSimulatorSettings();
    loadInteractiveState();
    loadSimulatorLastResults();
    
    updateInteractiveUI();
    calculateVersionIncome();
});

// 1. Quản lý việc chuyển Tab
function initTabSwitcher() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// 2. Đồng bộ giao diện ví & bộ đếm tab Interactive
function updateInteractiveUI() {
    // Cập nhật Wallet
    document.getElementById('wallet-char-tickets').innerText = interactiveCharTickets;
    document.getElementById('wallet-weapon-tickets').innerText = interactiveWeaponTickets;

    // Cập nhật Widgets Pity
    document.getElementById('widget-pity6').innerText = interactiveCharPity.pity6;
    document.getElementById('widget-pity5').innerText = interactiveCharPity.pity5;
    document.getElementById('widget-pity-featured').innerText = `${interactiveCharPity.pullsSinceFeatured}/120`;

    // Cập nhật Bảng thống kê Interactive
    document.getElementById('stat-char-total').innerText = interactiveStats.charTotal;
    document.getElementById('stat-char-urgent').innerText = interactiveStats.charUrgent;
    document.getElementById('stat-char-6star').innerText = interactiveStats.char6star;
    
    const limTotal = interactiveStats.char6starFeatured || 0;
    const limNew = limTotal > 0 ? 1 : 0;
    const limDupe = limTotal > 0 ? limTotal - 1 : 0;
    const lechLim = interactiveStats.char6starLechLimited || 0;
    
    document.getElementById('stat-char-6star-lim-new').innerText = limNew;
    document.getElementById('stat-char-6star-lim-dupe').innerText = limDupe;
    document.getElementById('stat-char-6star-lech-lim').innerText = lechLim;
    
    const char6Rate = interactiveStats.charTotal > 0 ? (interactiveStats.char6star / interactiveStats.charTotal * 100).toFixed(1) : '0.0';
    document.getElementById('stat-char-6star-rate').innerText = `${char6Rate}%`;
    
    document.getElementById('stat-char-5star').innerText = interactiveStats.char5star;
    const char5Rate = interactiveStats.charTotal > 0 ? (interactiveStats.char5star / interactiveStats.charTotal * 100).toFixed(1) : '0.0';
    document.getElementById('stat-char-5star-rate').innerText = `${char5Rate}%`;

    // Tính pull trung bình cho mỗi 6★
    if (interactiveStats.charPullsFor6starList.length > 0) {
        const sum = interactiveStats.charPullsFor6starList.reduce((a, b) => a + b, 0);
        const avg = sum / interactiveStats.charPullsFor6starList.length;
        document.getElementById('stat-char-avg-pull').innerText = `${avg.toFixed(1)} roll`;
    } else {
        document.getElementById('stat-char-avg-pull').innerText = '--';
    }

    document.getElementById('stat-weap-tickets').innerText = interactiveStats.weapTicketsAccumulated;
    document.getElementById('stat-weap-issues').innerText = interactiveStats.weapIssues;
    document.getElementById('stat-weap-6star').innerText = interactiveStats.weap6star;
    document.getElementById('stat-weap-selectors').innerText = interactiveStats.weapSelectors;

    // Đánh giá nhân phẩm (Luck Rating)
    updateLuckRating();

    // Hiển thị hòm đồ
    const invList = document.getElementById('inventory-list');
    if (interactiveInventory.length === 0) {
        invList.innerHTML = `<div style="color: var(--text-secondary); font-style: italic; text-align: center; margin-top: 50px;">Chưa có vật phẩm nào được quay...</div>`;
        return;
    }

    invList.innerHTML = '';
    interactiveInventory.forEach(item => {
        const div = document.createElement('div');
        div.className = `inventory-item rarity-${item.rarity}`;
        
        let stars = `<span class="star-display rarity-${item.rarity}">${'★'.repeat(item.rarity)}</span>`;
        let featuredTag = item.isFeatured ? '<span class="tag featured">Featured</span>' : '';
        let urgentTag = item.isUrgent ? '<span class="tag" style="background: #333; color: #aaa;">Urgent</span>' : '';
        let typeName = item.type === 'weapon' ? 'Vũ khí' : 'Operator';
        let noteText = item.note ? ` (${item.note})` : '';
        
        div.innerHTML = `
            <div class="name">
                ${stars}
                <span>${typeName} ${item.rarity}★${noteText}</span>
                ${urgentTag}
            </div>
            <div>
                ${featuredTag}
            </div>
        `;
        invList.appendChild(div);
    });
}

// Tính toán và hiển thị độ may mắn
function updateLuckRating() {
    const badge = document.getElementById('stat-luck-badge');
    const desc = document.getElementById('stat-luck-desc');
    const totalPulls = interactiveStats.charTotal;

    if (totalPulls < 20) {
        badge.innerText = 'Chưa xác định';
        badge.style.color = 'var(--text-secondary)';
        badge.style.borderColor = 'var(--border-color)';
        badge.style.background = 'rgba(255, 255, 255, 0.02)';
        desc.innerText = 'Quay tối thiểu 20 lần để hệ thống đánh giá nhân phẩm.';
        return;
    }

    // Nếu đã trúng ít nhất một 6★
    if (interactiveStats.charPullsFor6starList.length > 0) {
        const sum = interactiveStats.charPullsFor6starList.reduce((a, b) => a + b, 0);
        const avg = sum / interactiveStats.charPullsFor6starList.length;

        if (avg < 40) {
            badge.innerText = 'Siêu Đỏ 👑';
            badge.style.color = '#ffb800';
            badge.style.borderColor = '#ffb800';
            badge.style.background = 'rgba(255, 184, 0, 0.05)';
            desc.innerText = `Rất may mắn! Trung bình chỉ mất ${avg.toFixed(1)} rolls để ra 6★.`;
        } else if (avg < 64) {
            badge.innerText = 'Khá Đỏ 👍';
            badge.style.color = '#ff6b00';
            badge.style.borderColor = '#ff6b00';
            badge.style.background = 'rgba(255, 107, 0, 0.05)';
            desc.innerText = `May mắn tốt! Tỉ lệ ra 6★ trung bình là ${avg.toFixed(1)} rolls.`;
        } else if (avg <= 72) {
            badge.innerText = 'Bình Thường ⚖️';
            badge.style.color = '#0077b6';
            badge.style.borderColor = '#0077b6';
            badge.style.background = 'rgba(0, 119, 182, 0.05)';
            desc.innerText = `Nhân phẩm bình ổn. Trung bình mất ${avg.toFixed(1)} rolls để ra 6★.`;
        } else {
            badge.innerText = 'Hơi Đen 🌧️';
            badge.style.color = '#e63946';
            badge.style.borderColor = '#e63946';
            badge.style.background = 'rgba(230, 57, 70, 0.05)';
            desc.innerText = `Hơi đen rồi! Trung bình mất tới ${avg.toFixed(1)} rolls mới nổ 6★.`;
        }
    } else {
        // Chưa ra 6★ nào nhưng đã quay >= 20 lần
        const currentPulls = interactiveCharPity.pity6;
        if (currentPulls >= 65) {
            badge.innerText = 'Đang Bị Đen 💀';
            badge.style.color = '#e63946';
            badge.style.borderColor = '#e63946';
            badge.style.background = 'rgba(230, 57, 70, 0.05)';
            desc.innerText = `Đã quay ${currentPulls} lần chưa có 6★. Đang ở vùng soft pity đen đủi.`;
        } else {
            badge.innerText = 'Bình Thường ⚖️';
            badge.style.color = '#0077b6';
            badge.style.borderColor = '#0077b6';
            badge.style.background = 'rgba(0, 119, 182, 0.05)';
            desc.innerText = `Đã quay ${currentPulls} lần chưa ra 6★. Tỉ lệ nổ vẫn ở mức bình ổn.`;
        }
    }
}

// 3. Logic quay Gacha tương tác
function initInteractiveGacha() {
    const revealBoard = document.getElementById('pull-reveal-board');

    // Cấu hình danh sách banner có thể đổi
    const BANNERS = [
        { title: 'Mùa Hoa Nở Rộ (Featured: Endfield Operator)', desc: 'Tỉ lệ 6★: 0.8% | Bảo hiểm: Soft pity 65+, Hard pity 80 | Bảo hiểm Featured: 120' },
        { title: 'Bình Minh Kỷ Nguyên (Featured: Perlica)', desc: 'Tỉ lệ 6★: 0.8% | Bảo hiểm: Soft pity 65+, Hard pity 80 | Bảo hiểm Featured: 120' },
        { title: 'Sa Mạc Hoang Vu (Featured: Chen Qianyu)', desc: 'Tỉ lệ 6★: 0.8% | Bảo hiểm: Soft pity 65+, Hard pity 80 | Bảo hiểm Featured: 120' },
        { title: 'Bóng Đêm Biên Giới (Featured: Wulfgard)', desc: 'Tỉ lệ 6★: 0.8% | Bảo hiểm: Soft pity 65+, Hard pity 80 | Bảo hiểm Featured: 120' }
    ];
    
    let activeBannerIdx = 0;
    
    function updateBannerDisplay() {
        const b = BANNERS[activeBannerIdx];
        const titleSpan = document.getElementById('active-banner-title').querySelector('span');
        if (titleSpan) {
            titleSpan.innerText = b.title;
        }
        document.getElementById('active-banner-subtitle').innerText = b.desc;
    }

    // Load active banner from localStorage if exists
    try {
        const savedBanner = localStorage.getItem(STORAGE_PREFIX + 'active_banner_idx');
        if (savedBanner !== null) {
            activeBannerIdx = parseInt(savedBanner, 10);
            updateBannerDisplay();
        }
    } catch(e) {
        console.error(e);
    }

    document.getElementById('btn-switch-banner').addEventListener('click', () => {
        activeBannerIdx = (activeBannerIdx + 1) % BANNERS.length;
        updateBannerDisplay();
        try {
            localStorage.setItem(STORAGE_PREFIX + 'active_banner_idx', activeBannerIdx);
        } catch(e) {}
        
        // Dọn dẹp bảng gacha hiển thị
        revealBoard.innerHTML = `<span class="no-pulls-yet">Đã đổi banner. Nhấn nút bên dưới để thực hiện quay...</span>`;
    });

    // Hàm phụ trợ tạo card hiển thị trên màn hình
    const renderCard = (item) => {
        const card = document.createElement('div');
        card.className = 'gacha-card';
        
        let stars = `<span class="star-display rarity-${item.rarity}">${'★'.repeat(item.rarity)}</span>`;
        let typeText = item.type === 'weapon' ? 'Weapon' : 'Operator';
        let isFeaturedText = item.isFeatured ? 'Rate-Up' : 'Standard';
        let featuredClass = item.isFeatured ? 'featured' : '';

        card.innerHTML = `
            <div class="gacha-card-inner">
                <div class="card-face card-back"></div>
                <div class="card-face card-front card-rarity-${item.rarity}">
                    <span class="front-title">${typeText}</span>
                    <span class="star-row">${stars}</span>
                    <span class="card-label ${featuredClass}">${isFeaturedText}</span>
                </div>
            </div>
        `;
        revealBoard.appendChild(card);

        // Kích hoạt hiệu ứng lật thẻ
        setTimeout(() => {
            card.classList.add('flipped');
        }, 100);
    };

    // Hàm xử lý khi thực hiện 1 lượt pull nhân vật
    const processCharacterPullResult = (result) => {
        result.type = 'character';
        
        // Thống kê
        if (result.isUrgent) {
            interactiveStats.charUrgent++;
        } else {
            interactiveStats.charTotal++;
            interactiveStats.pullsInCurrent6StarCycle++;
        }

        if (result.rarity === 6) {
            interactiveStats.char6star++;
            if (result.isFeatured) {
                interactiveStats.char6starFeatured++;
            } else {
                interactiveStats.charLosing5050++;
                if (result.isLechLimited) {
                    interactiveStats.char6starLechLimited = (interactiveStats.char6starLechLimited || 0) + 1;
                }
            }
            // Lưu lại số lượt quay để nổ 6★ và reset
            if (!result.isUrgent) {
                interactiveStats.charPullsFor6starList.push(interactiveStats.pullsInCurrent6StarCycle);
                interactiveStats.pullsInCurrent6StarCycle = 0;
            }
        } else if (result.rarity === 5) {
            interactiveStats.char5star++;
        }

        // Tính vé hoàn trả và cộng dồn
        const rebate = calculateArsenalTicketsRebate([result]);
        interactiveWeaponTickets += rebate;
        interactiveStats.weapTicketsAccumulated += rebate;

        interactiveInventory.unshift(result);
        renderCard(result);
    };

    // Nút quay x1 nhân vật
    document.getElementById('btn-char-pull1').addEventListener('click', () => {
        if (interactiveCharTickets < 1) {
            alert('Bạn không đủ vé gacha nhân vật! Hãy bấm Reset để nhận thêm vé.');
            return;
        }

        interactiveCharTickets--;
        revealBoard.innerHTML = '';

        const result = rollCharacter(interactiveCharPity, false);
        processCharacterPullResult(result);

        // Kiểm tra cột mốc 30 roll
        checkInteractiveMilestones();
        updateInteractiveUI();
        saveInteractiveState();
    });

    // Nút quay x10 nhân vật
    document.getElementById('btn-char-pull10').addEventListener('click', () => {
        if (interactiveCharTickets < 10) {
            alert('Bạn không đủ vé gacha nhân vật! Hãy bấm Reset để nhận thêm vé.');
            return;
        }

        interactiveCharTickets -= 10;
        revealBoard.innerHTML = '';

        for (let i = 0; i < 10; i++) {
            const result = rollCharacter(interactiveCharPity, false);
            processCharacterPullResult(result);
        }

        checkInteractiveMilestones();
        updateInteractiveUI();
        saveInteractiveState();
    });

    // Nút quay Issue vũ khí (x10)
    document.getElementById('btn-weapon-issue').addEventListener('click', () => {
        if (interactiveWeaponTickets < 1980) {
            alert('Không đủ vé Arsenal Tickets! Mỗi Issue (x10 vũ khí) yêu cầu 1980 vé. Vé này kiếm được khi bạn quay banner nhân vật.');
            return;
        }

        interactiveWeaponTickets -= 1980;
        revealBoard.innerHTML = '';

        const result = rollWeaponIssue(interactiveWeaponPity);
        interactiveStats.weapIssues++;
        
        result.items.forEach(item => {
            item.type = 'weapon';
            
            // Thống kê vũ khí
            if (item.rarity === 6) {
                interactiveStats.weap6star++;
            } else if (item.rarity === 5) {
                interactiveStats.owned5StarWeapons = (interactiveStats.owned5StarWeapons || 0) + 1;
            }

            interactiveInventory.unshift(item);
            renderCard(item);
        });

        // Xử lý quà cột mốc vũ khí
        if (result.milestoneReward === 'selector_box') {
            alert('Chúc mừng! Bạn đạt mốc 10 Issues và nhận được Hộp tự chọn vũ khí 6★!');
            interactiveStats.weapSelectors++;
            interactiveStats.weap6star++;
            interactiveInventory.unshift({ rarity: 6, isFeatured: true, type: 'weapon', note: 'Hộp chọn mốc 10' });
        } else if (result.milestoneReward === 'featured_weapon') {
            alert('Chúc mừng! Bạn đạt cột mốc quà tặng và nhận được trực tiếp Vũ khí 6★ Rate-up!');
            interactiveStats.weap6star++;
            interactiveInventory.unshift({ rarity: 6, isFeatured: true, type: 'weapon', note: 'Quà mốc tích luỹ' });
        }

        updateInteractiveUI();
        saveInteractiveState();
    });

    // Nút Reset tiến trình tương tác
    document.getElementById('btn-reset-interactive').addEventListener('click', () => {
        interactiveCharTickets = 120;
        interactiveWeaponTickets = 0;
        interactiveInventory = [];

        interactiveCharPity.pity6 = 0;
        interactiveCharPity.pity5 = 0;
        interactiveCharPity.pullsSinceFeatured = 0;
        interactiveCharPity.bannerPullsCount = 0;

        interactiveWeaponPity.issuesCount = 0;
        interactiveWeaponPity.issuesSince6 = 0;
        interactiveWeaponPity.issuesSinceFeatured = 0;

        // Reset thống kê
        interactiveStats.charTotal = 0;
        interactiveStats.charUrgent = 0;
        interactiveStats.char6star = 0;
        interactiveStats.char6starFeatured = 0;
        interactiveStats.char6starLechLimited = 0;
        interactiveStats.char5star = 0;
        interactiveStats.charLosing5050 = 0;
        interactiveStats.pullsInCurrent6StarCycle = 0;
        interactiveStats.charPullsFor6starList = [];
        interactiveStats.milestone30Triggered = false;
        interactiveStats.milestone60Triggered = false;
        
        interactiveStats.weapTicketsAccumulated = 0;
        interactiveStats.weapIssues = 0;
        interactiveStats.weap6star = 0;
        interactiveStats.weapSelectors = 0;

        revealBoard.innerHTML = `<span class="no-pulls-yet">Nhấn nút bên dưới để thực hiện quay gacha...</span>`;
        updateInteractiveUI();
        saveInteractiveState();
    });
}

// Xử lý cột mốc Urgent/Dossier trong quay tương tác
function checkInteractiveMilestones() {
    const revealBoard = document.getElementById('pull-reveal-board');

    // Mốc 30 roll Urgent Recruitment (Kích hoạt khi đạt hoặc vượt quá 30 nếu chưa nhận)
    if (interactiveCharPity.bannerPullsCount >= 30 && !interactiveStats.milestone30Triggered) {
        interactiveStats.milestone30Triggered = true;
        alert('Cột mốc 30 roll đạt được! Bạn nhận được 10 lượt quay Urgent Recruitment miễn phí ngay bây giờ!');
        
        for (let k = 0; k < 10; k++) {
            const urgentResult = rollCharacter(interactiveCharPity, true);
            urgentResult.type = 'character';
            
            // Thống kê Urgent
            interactiveStats.charUrgent++;
            if (urgentResult.rarity === 6) {
                interactiveStats.char6star++;
                if (urgentResult.isFeatured) {
                    interactiveStats.char6starFeatured++;
                } else {
                    interactiveStats.charLosing5050++;
                    if (urgentResult.isLechLimited) {
                        interactiveStats.char6starLechLimited = (interactiveStats.char6starLechLimited || 0) + 1;
                    }
                }
            } else if (urgentResult.rarity === 5) {
                interactiveStats.char5star++;
            }

            // Hoàn vé vũ khí
            const rebate = calculateArsenalTicketsRebate([urgentResult]);
            interactiveWeaponTickets += rebate;
            interactiveStats.weapTicketsAccumulated += rebate;

            interactiveInventory.unshift(urgentResult);
            
            // Vẽ thẻ Urgent với số sao được định dạng đẹp mắt
            const card = document.createElement('div');
            card.className = 'gacha-card';
            let stars = `<span class="star-display rarity-${urgentResult.rarity}">${'★'.repeat(urgentResult.rarity)}</span>`;
            card.innerHTML = `
                <div class="gacha-card-inner">
                    <div class="card-face card-back"></div>
                    <div class="card-face card-front card-rarity-${urgentResult.rarity}">
                        <span class="front-title">Urgent Opt</span>
                        <span class="star-row">${stars}</span>
                        <span class="card-label">Urgent</span>
                    </div>
                </div>
            `;
            revealBoard.appendChild(card);
            setTimeout(() => card.classList.add('flipped'), 100);
        }
    }

    // Mốc 60 roll Dossier (Kích hoạt khi đạt hoặc vượt quá 60 nếu chưa nhận)
    if (interactiveCharPity.bannerPullsCount >= 60 && !interactiveStats.milestone60Triggered) {
        interactiveStats.milestone60Triggered = true;
        alert('Cột mốc 60 roll đạt được! Bạn nhận được 10 vé Dossier miễn phí tích trữ cho banner giới hạn tiếp theo.');
        // Cộng luôn vào số dư vé nhân vật
        interactiveCharTickets += 10;
    }
}

// ====================================================================
// XỬ LÝ ĐIỀU KHIỂN & CHẠY GIẢ LẬP (TAB 2)
// ====================================================================
function initSimulatorControls() {
    const inputs = [
        'input-players',
        'input-banners',
        'input-start-tickets',
        'input-total-pulls',
        'input-base-char',
        'input-base-weapon'
    ];

    inputs.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('input', () => {
                calculateVersionIncome();
                saveSimulatorSettings();
            });
        }
    });

    // 2. Chuyển đổi chế độ giả lập (banners vs pulls)
    const modeSelect = document.getElementById('select-sim-mode');
    const containerBanners = document.getElementById('container-mode-banners');
    const containerPulls = document.getElementById('container-mode-pulls');

    modeSelect.addEventListener('change', () => {
        if (modeSelect.value === 'banners') {
            containerBanners.style.display = 'flex';
            containerPulls.style.display = 'none';
        } else {
            containerBanners.style.display = 'none';
            containerPulls.style.display = 'flex';
        }
        saveSimulatorSettings();
    });

    // 3. Lắng nghe toggle Paid Passes
    document.getElementById('toggle-monthly').addEventListener('change', () => {
        calculateVersionIncome();
        saveSimulatorSettings();
    });
    document.getElementById('toggle-bp').addEventListener('change', () => {
        calculateVersionIncome();
        saveSimulatorSettings();
    });

    calculateVersionIncome(); // Chạy tính toán ban đầu

    // 4. Nút bấm Chạy giả lập
    document.getElementById('btn-run-simulation').addEventListener('click', () => {
        const mode = modeSelect.value;
        const numPlayers = Number(document.getElementById('input-players').value);
        const numBanners = Number(document.getElementById('input-banners').value);
        const startingCharTickets = Number(document.getElementById('input-start-tickets').value);
        const totalPulls = Number(document.getElementById('input-total-pulls').value);
        
        const baseChar = Number(document.getElementById('input-base-char').value);
        const baseWeapon = Number(document.getElementById('input-base-weapon').value);

        // Tính thu nhập nhân vật dựa trên cấu hình trả phí
        const isMonthly = document.getElementById('toggle-monthly').checked;
        const isBP = document.getElementById('toggle-bp').checked;
        
        const incomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
        const weaponIncomeNonGacha = baseWeapon + (isBP ? 1200 : 0);

        const runBtn = document.getElementById('btn-run-simulation');
        const originalText = runBtn.innerText;
        runBtn.innerText = 'Đang giả lập...';
        runBtn.disabled = true;

        setTimeout(() => {
            const config = {
                mode,
                numPlayers,
                numBanners,
                totalPulls,
                startingCharTickets,
                incomePerBanner,
                weaponIncomeNonGacha,
                strategyIds: ['save_commit', 'yolo', 'pull_60', '60_plus', 'roll_meta']
            };

            const numBannersVal = mode === 'banners' ? numBanners : Math.max(1, Math.ceil(totalPulls / incomePerBanner));

            // Đổi tiêu đề bảng so sánh dựa theo chế độ
            const tableTitle = document.getElementById('table-comparison-title');
            if (mode === 'banners') {
                tableTitle.innerText = `Bảng so sánh chi tiết các chiến thuật (Giả lập qua ${numBanners} mùa banner)`;
            } else {
                tableTitle.innerText = `Bảng so sánh chi tiết các chiến thuật (Giả lập với tổng số ${Number(totalPulls).toLocaleString()} pulls nhân vật ~ ${numBannersVal} banner)`;
            }

            try {
                const results = MonteCarloSimulator.run(config);
                // Cập nhật UI kết quả
                displaySimulatorResults(results, numBannersVal);
                saveSimulatorLastResults(results, numBannersVal);
            } catch (err) {
                console.error(err);
                alert('Có lỗi xảy ra trong quá trình chạy giả lập!');
            } finally {
                runBtn.innerText = originalText;
                runBtn.disabled = false;
            }
        }, 50);
    });
}

// Tính lượng vé tích lũy in-game
function calculateVersionIncome() {
    const isBP = document.getElementById('toggle-bp').checked;
    const isMonthly = document.getElementById('toggle-monthly').checked;
    const baseChar = Number(document.getElementById('input-base-char').value);
    const baseWeapon = Number(document.getElementById('input-base-weapon').value);
    
    const charIncomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
    const weaponIncomePerBanner = baseWeapon + (isBP ? 1200 : 0);
    
    // Hiển thị cả lượng vé phiên bản và lượng vé quy đổi trên mỗi banner limited
    document.getElementById('info-version-income').innerText = `~${charIncomePerBanner.toFixed(1)} vé/banner (~${(charIncomePerBanner * 2).toFixed(1)} vé/bản)`;
    document.getElementById('info-weapon-income').innerText = `~${Number(weaponIncomePerBanner).toLocaleString()} vé/banner (~${Number(weaponIncomePerBanner * 2).toLocaleString()} vé/bản)`;
}

// Cập nhật các chỉ số, bảng so sánh và biểu đồ kết quả giả lập
function displaySimulatorResults(results, numBanners) {
    // 1. Cập nhật các thẻ số liệu chính (Lấy chiến thuật Tích lũy làm mẫu)
    const scRes = results.save_commit;
    if (scRes) {
        document.getElementById('card-avg-featured').innerText = scRes.avgFeaturedChars.toFixed(2);
        
        const eff = scRes.avgPullsPerFeaturedChar;
        document.getElementById('card-avg-efficiency').innerText = (eff === Infinity) ? 'N/A' : `${eff.toFixed(1)} pull`;
        
        document.getElementById('card-avg-weapons').innerText = scRes.avgFeaturedWeapons.toFixed(2);
    }

    // 2. Cập nhật bảng so sánh
    const tableBody = document.getElementById('comparison-table-body');
    tableBody.innerHTML = '';

    Object.keys(results).forEach(strategyId => {
        const res = results[strategyId];
        const strategyInfo = strategies[strategyId];
        const eff = res.avgPullsPerFeaturedChar;
        
        const tr = document.createElement('tr');
        if (strategyId === 'save_commit') tr.className = 'selected-row';

        const total6StarChar = res.avgFeaturedChars + res.avgLechLimited + res.avgStandard6Stars;
        const total6StarWeap = res.avgFeaturedWeapons + res.avgStandard6StarWeapons;

        tr.innerHTML = `
            <td>
                <span class="strategy-badge badge-${strategyId}">${strategyInfo ? strategyInfo.name : strategyId}</span>
            </td>
            <td>${res.avgCharPulls.toFixed(0)} pull</td>
            <td>${res.avgUnspentChar.toFixed(1)} vé</td>
            <td style="font-weight: 700; color: #ffcc00;">${total6StarChar.toFixed(2)}</td>
            <td>${res.avgFeaturedChars.toFixed(2)} / ${numBanners} banner</td>
            <td>${(res.avgFeaturedUnique || 0).toFixed(2)} / ${(res.avgFeaturedDupes || 0).toFixed(2)}</td>
            <td>${(res.avgLechLimited || 0).toFixed(2)}</td>
            <td>${(res.avgStandard6Stars || 0).toFixed(2)}</td>
            <td>${(eff === Infinity) ? 'N/A' : `${eff.toFixed(1)} pull/char`}</td>
            <td style="font-weight: 600; color: #ffb800;">${res.bestLuckChar} / ${res.worstLuckChar}</td>
            <td>${res.avgFeaturedWeapons.toFixed(2)}</td>
            <td style="font-weight: 700; color: #00b4d8;">${total6StarWeap.toFixed(2)}</td>
            <td style="font-weight: 700; color: var(--orange-primary);">${res.ownershipRate.toFixed(1)}%</td>
        `;
        tableBody.appendChild(tr);
    });

    // 3. Vẽ lại biểu đồ
    drawDistributionChart('chart-distribution', results, strategies);
    drawComparisonChart('chart-efficiency', results, strategies);
}
