import Chart from 'chart.js/auto';
window.Chart = Chart;
import { rollCharacter, rollWeaponIssue, calculateArsenalTicketsRebate } from './gacha-math.js';
import { createRandomSeed, runSingleDetailedSimulation } from './single-run.js';
import {
    buildCharacterPullGroups,
    calculatePullArsenal,
    featuredCharacterHits,
    featuredWeaponHits
} from './single-run-view.js';
import { MonteCarloSimulator } from './simulator.js';
import { strategies } from './strategies.js';
import { drawDistributionChart, drawWeaponDistributionChart } from './chart-helper.js';
import {
    applyTranslations,
    formatNumber,
    getLocale,
    initI18n,
    setLocale,
    strategyName,
    subscribe,
    t
} from './i18n.js';

var interactiveCharTickets = 0;
var interactiveWeaponTickets = 0;
var interactiveBondQuota = 0;
var interactiveFreeLimitedTickets = 0;
var interactiveDossierTickets = 0;
var interactiveNextBannerDossierTickets = 0;
var interactiveInventory = [];
var interactiveOwnedCharactersSet = /* @__PURE__ */ new Set();
var interactiveCharPity = {
  pity6: 0,
  pity5: 0,
  pullsSinceFeatured: 0,
  bannerPullsCount: 0,
  guarantee120Consumed: false,
  featuredCountThisBanner: 0,
  potentialTokensThisBanner: 0
};
var interactiveWeaponPity = {
  issuesCount: 0,
  issuesSince6: 0,
  issuesSinceFeatured: 0,
  featuredGuaranteeConsumed: false
};
var activeBannerIdx = 0;
var lastSingleRun = null;
var interactiveStats = {
  charTotal: 0,
  charUrgent: 0,
  charDossier: 0,
  char6star: 0,
  char6starFeatured: 0,
  char6starLechLimited: 0,
  char5star: 0,
  charLosing5050: 0,
  pullsInCurrent6StarCycle: 0,
  charPullsFor6starList: [],
  // Danh sách số lượt roll để ra mỗi 6★
  milestone30Triggered: false,
  milestone60Triggered: false,
  potentialTokens: 0,
  totalBondQuotaEarned: 0,
  weapTicketsAccumulated: 0,
  weapIssues: 0,
  weap6star: 0,
  owned5StarWeapons: 0,
  weapSelectors: 0,
  weapTicketsUsed: 0
};
var STANDARD_6STAR_POOL2 = ["std_6_1", "std_6_2", "std_6_3", "std_6_4", "std_6_5", "std_6_6"];
var LECH_LIMITED_6STAR_POOL2 = ["lim_6_1", "lim_6_2", "lim_6_3"];
var CHAR_5STAR_POOL2 = Array.from({ length: 15 }, (_, i) => `char_5_${i + 1}`);
var STORAGE_PREFIX = "a9e_gacha_";
var SCHEMA_VERSION = "1.6";
function saveInteractiveState() {
  try {
    const state = {
      version: SCHEMA_VERSION,
      charTickets: interactiveCharTickets,
      weaponTickets: interactiveWeaponTickets,
      bondQuota: interactiveBondQuota,
      freeLimited: interactiveFreeLimitedTickets,
      dossierTickets: interactiveDossierTickets,
      nextBannerDossierTickets: interactiveNextBannerDossierTickets,
      charPity: interactiveCharPity,
      weaponPity: interactiveWeaponPity,
      stats: interactiveStats,
      ownedCharacters: Array.from(interactiveOwnedCharactersSet)
    };
    localStorage.setItem(STORAGE_PREFIX + "interactive_state", JSON.stringify(state));
    localStorage.setItem(STORAGE_PREFIX + "interactive_inventory", JSON.stringify(interactiveInventory));
  } catch (e) {
    console.error("Error saving interactive state to localStorage:", e);
  }
}
function loadInteractiveState() {
  try {
    const stateStr = localStorage.getItem(STORAGE_PREFIX + "interactive_state");
    const invStr = localStorage.getItem(STORAGE_PREFIX + "interactive_inventory");
    let canLoadInventory = true;
    if (stateStr) {
      const state = JSON.parse(stateStr);
      if (state.version === SCHEMA_VERSION) {
        interactiveCharTickets = state.charTickets;
        interactiveWeaponTickets = state.weaponTickets;
        interactiveBondQuota = state.bondQuota || 0;
        interactiveFreeLimitedTickets = 0;
        interactiveDossierTickets = state.dossierTickets || 0;
        interactiveNextBannerDossierTickets = state.nextBannerDossierTickets || 0;
        Object.assign(interactiveCharPity, state.charPity);
        if (typeof interactiveCharPity.featuredCountThisBanner === 'undefined') {
          interactiveCharPity.featuredCountThisBanner = 0;
        }
        Object.assign(interactiveWeaponPity, state.weaponPity);
        Object.assign(interactiveStats, state.stats);
        if (typeof interactiveStats.charDossier === 'undefined') {
          interactiveStats.charDossier = 0;
        }
        interactiveOwnedCharactersSet = new Set(state.ownedCharacters || []);
      } else {
        console.warn("Storage version mismatch. Resetting state.");
        localStorage.removeItem(STORAGE_PREFIX + "interactive_state");
        localStorage.removeItem(STORAGE_PREFIX + "interactive_inventory");
        canLoadInventory = false;
      }
    }
    if (invStr && canLoadInventory) {
      interactiveInventory = JSON.parse(invStr);
    }
  } catch (e) {
    console.error("Error loading interactive state from localStorage:", e);
  }
}
function saveSimulatorSettings() {
  try {
    const settings = {
      version: SCHEMA_VERSION,
      mode: "banners",
      players: document.getElementById("input-players").value,
      banners: document.getElementById("input-banners").value,
      metaBanners: document.getElementById("input-meta-banners").value,
      startTickets: document.getElementById("input-start-tickets").value,
      startWeaponTickets: document.getElementById("input-start-weapon-tickets").value,
      totalPulls: 0,
      baseChar: document.getElementById("input-base-char").value,
      baseWeapon: document.getElementById("input-base-weapon").value,
      monthly: document.getElementById("toggle-monthly").checked,
      bp: document.getElementById("toggle-bp").checked
    };
    localStorage.setItem(STORAGE_PREFIX + "simulator_settings", JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving simulator settings to localStorage:", e);
  }
}
function loadSimulatorSettings() {
  try {
    const settingsStr = localStorage.getItem(STORAGE_PREFIX + "simulator_settings");
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings.version === SCHEMA_VERSION) {
        document.getElementById("input-players").value = settings.players;
        document.getElementById("input-banners").value = settings.banners;
        document.getElementById("input-meta-banners").value = settings.metaBanners !== undefined ? settings.metaBanners : Math.floor(settings.banners * 0.3);
        document.getElementById("input-start-tickets").value = settings.startTickets;
        document.getElementById("input-start-weapon-tickets").value = settings.startWeaponTickets || 0;
        document.getElementById("input-base-char").value = settings.baseChar;
        document.getElementById("input-base-weapon").value = settings.baseWeapon;
        document.getElementById("toggle-monthly").checked = settings.monthly;
        document.getElementById("toggle-bp").checked = settings.bp;
      }
    }
  } catch (e) {
    console.error("Error loading simulator settings from localStorage:", e);
  }
}
function saveSimulatorLastResults(results, numBanners) {
  try {
    const data = {
      version: SCHEMA_VERSION,
      results,
      numBanners
    };
    localStorage.setItem(STORAGE_PREFIX + "last_results", JSON.stringify(data));
  } catch (e) {
    console.error("Error saving last simulation results to localStorage:", e);
  }
}
function loadSimulatorLastResults() {
  try {
    const dataStr = localStorage.getItem(STORAGE_PREFIX + "last_results");
    if (dataStr) {
      const data = JSON.parse(dataStr);
      if (data.version === SCHEMA_VERSION) {
        const tableTitle = document.getElementById("table-comparison-title");
        tableTitle.innerText = t("simulator.tableBanners", { count: formatNumber(data.numBanners) });
        displaySimulatorResults(data.results, data.numBanners);
      }
    }
  } catch (e) {
    console.error("Error loading last simulation results from localStorage:", e);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  initI18n();
  initLocaleSwitcher();
  initTabSwitcher();
  initDocsDialog();
  initTableTooltips();
  initInteractiveGacha();
  initSimulatorControls();
  initSingleRunControls();
  loadSimulatorSettings();
  loadInteractiveState();
  loadSimulatorLastResults();
  updateInteractiveUI();
  calculateVersionIncome();
  document.getElementById("build-info").textContent = t("app.version", { version: __APP_VERSION__, commit: __BUILD_COMMIT__ });
  subscribe(() => {
    applyTranslations();
    updateLocaleControls();
    updateInteractiveUI();
    calculateVersionIncome();
    updateSingleRunIncome();
    loadSimulatorLastResults();
    if (lastSingleRun) renderSingleRun(lastSingleRun);
    document.getElementById("build-info").textContent = t("app.version", { version: __APP_VERSION__, commit: __BUILD_COMMIT__ });
  });
});
function updateLocaleControls() {
  document.querySelectorAll(".locale-btn").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.locale === getLocale()));
  });
}
function initLocaleSwitcher() {
  document.querySelectorAll(".locale-btn").forEach((button) => {
    button.addEventListener("click", () => setLocale(button.dataset.locale));
  });
  updateLocaleControls();
}
function initDocsDialog() {
  const dialog = document.getElementById("docs-dialog");
  const openButton = document.getElementById("btn-open-docs");
  const closeButton = document.getElementById("btn-close-docs");
  openButton.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    closeButton.focus();
  });
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
function initTabSwitcher() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  function activateTab(btn) {
    const targetTab = btn.getAttribute("data-tab");
    tabBtns.forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
      b.tabIndex = active ? 0 : -1;
    });
    tabContents.forEach((c) => {
      const active = c.id === targetTab;
      c.classList.toggle("active", active);
      c.hidden = !active;
    });
  }
  tabBtns.forEach((btn, index2) => {
    btn.addEventListener("click", () => activateTab(btn));
    btn.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabBtns.length - 1 : index2 + (event.key === "ArrowRight" ? 1 : -1);
      nextIndex = (nextIndex + tabBtns.length) % tabBtns.length;
      tabBtns[nextIndex].focus();
      activateTab(tabBtns[nextIndex]);
    });
  });
}
function updateInteractiveUI() {
  document.getElementById("widget-pity6").innerText = `${interactiveCharPity.pity6}/80`;
  document.getElementById("widget-pity5").innerText = interactiveCharPity.pity5;

  const k = interactiveCharPity.featuredCountThisBanner || 0;
  let threshold = 120;
  if (k === 1) threshold = 240;
  else if (k >= 2) threshold = 240 * k;

  document.getElementById("widget-pity-featured").innerText = `${interactiveCharPity.bannerPullsCount}/${threshold}`;
  document.getElementById("progress-pity6").value = Math.min(interactiveCharPity.pity6, 80);
  document.getElementById("progress-featured").max = threshold;
  document.getElementById("progress-featured").value = Math.min(interactiveCharPity.bannerPullsCount, threshold);

  const featuredLabel = document.getElementById("widget-pity-featured-lbl");
  if (featuredLabel) {
    featuredLabel.innerText = t("banner.guaranteeDynamic", { threshold }) || `Bảo hiểm ${threshold}`;
  }

  document.getElementById("stat-char-total").innerText = interactiveStats.charTotal;
  document.getElementById("stat-char-urgent").innerText = interactiveStats.charUrgent;
  document.getElementById("stat-char-dossier").innerText = interactiveStats.charDossier || 0;
  document.getElementById("stat-char-6star").innerText = interactiveStats.char6star;
  const limTotal = interactiveStats.char6starFeatured || 0;
  const limNew = Array.from(interactiveOwnedCharactersSet).filter((id) => id.startsWith("featured_char_banner_")).length;
  const limDupe = Math.max(0, limTotal - limNew);
  const lechLim = interactiveStats.char6starLechLimited || 0;
  document.getElementById("stat-char-6star-lim-new").innerText = limNew;
  document.getElementById("stat-char-6star-lim-dupe").innerText = limDupe;
  document.getElementById("stat-char-6star-lech-lim").innerText = lechLim;
  const totalCharacterResults = interactiveStats.charTotal + interactiveStats.charUrgent;
  const char6Rate = totalCharacterResults > 0 ? (interactiveStats.char6star / totalCharacterResults * 100).toFixed(1) : "0.0";
  document.getElementById("stat-char-6star-rate").innerText = `${char6Rate}%`;
  document.getElementById("stat-char-5star").innerText = interactiveStats.char5star;
  document.getElementById("stat-char-potential").innerText = interactiveStats.potentialTokens || 0;
  const char5Rate = totalCharacterResults > 0 ? (interactiveStats.char5star / totalCharacterResults * 100).toFixed(1) : "0.0";
  document.getElementById("stat-char-5star-rate").innerText = `${char5Rate}%`;
  if (interactiveStats.charPullsFor6starList.length > 0) {
    const sum = interactiveStats.charPullsFor6starList.reduce((a, b) => a + b, 0);
    const avg = sum / interactiveStats.charPullsFor6starList.length;
    document.getElementById("stat-char-avg-pull").innerText = `${avg.toFixed(1)} roll`;
  } else {
    document.getElementById("stat-char-avg-pull").innerText = "--";
  }
  document.getElementById("stat-weap-tickets").innerText = interactiveStats.weapTicketsUsed;
  document.getElementById("stat-weap-issues").innerText = interactiveStats.weapIssues;
  document.getElementById("stat-weap-6star").innerText = interactiveStats.weap6star;
  document.getElementById("stat-weap-selectors").innerText = interactiveStats.weapSelectors;
  updateLuckRating();
  const invList = document.getElementById("inventory-list");
  if (interactiveInventory.length === 0) {
    invList.innerHTML = `<div style="color: var(--text-secondary); font-style: italic; text-align: center; margin-top: 50px;">${t("inventory.empty")}</div>`;
    return;
  }
  invList.innerHTML = "";
  interactiveInventory.forEach((item) => {
    const div = document.createElement("div");
    div.className = `inventory-item rarity-${item.rarity}`;
    let stars = `<span class="star-display rarity-${item.rarity}">${"\u2605".repeat(item.rarity)}</span>`;
    let featuredTag = item.isFeatured ? '<span class="tag featured">Featured</span>' : "";
    let urgentTag = item.isUrgent ? '<span class="tag" style="background: #333; color: #aaa;">Urgent</span>' : "";
    let typeName = item.type === "weapon" ? t("inventory.weapon") : t("inventory.operator");
    const noteKeys = {
      weaponSelector10: "inventory.note.weaponSelector10",
      "H\u1ED9p ch\u1ECDn m\u1ED1c 10": "inventory.note.weaponSelector10",
      weaponMilestone: "inventory.note.weaponMilestone",
      "Qu\xE0 m\u1ED1c t\xEDch lu\u1EF9": "inventory.note.weaponMilestone"
    };
    let noteText = item.note ? ` (${noteKeys[item.note] ? t(noteKeys[item.note]) : item.note})` : "";
    div.innerHTML = `
          <div class="name">
              ${stars}
              <span>${typeName} ${item.rarity}\u2605${noteText}</span>
              ${urgentTag}
          </div>
          <div>
              ${featuredTag}
          </div>
      `;
    invList.appendChild(div);
  });
}
function updateLuckRating() {
  const badge = document.getElementById("stat-luck-badge");
  const desc = document.getElementById("stat-luck-desc");
  const totalPulls = interactiveStats.charTotal;
  
  badge.className = "";
  badge.style.color = "";
  badge.style.borderColor = "";
  badge.style.background = "";
  
  if (totalPulls < 20) {
    badge.innerText = t("luck.unknown");
    badge.className = "stat-luck-badge";
    badge.style.color = "var(--text-secondary)";
    badge.style.borderColor = "var(--border-color)";
    badge.style.background = "rgba(255, 255, 255, 0.02)";
    desc.innerText = t("luck.minimum");
    return;
  }
  if (interactiveStats.charPullsFor6starList.length > 0) {
    const sum = interactiveStats.charPullsFor6starList.reduce((a, b) => a + b, 0);
    const avg = sum / interactiveStats.charPullsFor6starList.length;
    if (avg < 40) {
      badge.innerText = t("luck.great");
      badge.className = "stat-luck-badge luck-great";
      desc.innerText = t("luck.greatDesc", { average: formatNumber(avg, { maximumFractionDigits: 1 }) });
    } else if (avg < 64) {
      badge.innerText = t("luck.good");
      badge.className = "stat-luck-badge luck-good";
      desc.innerText = t("luck.goodDesc", { average: formatNumber(avg, { maximumFractionDigits: 1 }) });
    } else if (avg <= 72) {
      badge.innerText = t("luck.normal");
      badge.className = "stat-luck-badge luck-normal";
      desc.innerText = t("luck.normalDesc", { average: formatNumber(avg, { maximumFractionDigits: 1 }) });
    } else {
      badge.innerText = t("luck.bad");
      badge.className = "stat-luck-badge luck-bad";
      desc.innerText = t("luck.badDesc", { average: formatNumber(avg, { maximumFractionDigits: 1 }) });
    }
  } else {
    const currentPulls = interactiveCharPity.pity6;
    if (currentPulls >= 66) {
      badge.innerText = t("luck.veryBad");
      badge.className = "stat-luck-badge luck-bad";
      desc.innerText = t("luck.noSixBad", { count: formatNumber(currentPulls) });
    } else {
      badge.innerText = t("luck.normal");
      badge.className = "stat-luck-badge luck-normal";
      desc.innerText = t("luck.noSixNormal", { count: formatNumber(currentPulls) });
    }
  }
}
function interactiveCardOutcome(item) {
  if (item.rarity !== 6) {
    return { label: item.isUrgent ? "Urgent" : t("card.standardResult"), className: "" };
  }
  if (item.isFeatured) {
    return { label: t("card.featuredOutcome"), className: "featured" };
  }
  return {
    label: t(item.isLechLimited ? "card.offLimitedOutcome" : "card.offStandardOutcome"),
    className: "offrate"
  };
}
function renderInteractiveCard(item, titleOverride = "") {
  const revealBoard = document.getElementById("pull-reveal-board");
  const card = document.createElement("div");
  const outcome = interactiveCardOutcome(item);
  const outcomeClass = item.rarity === 6 ? item.isFeatured ? "outcome-featured" : "outcome-offrate" : "";
  card.className = `gacha-card ${outcomeClass}`;
  card.setAttribute("aria-label", `${item.rarity}\u2605 \xB7 ${outcome.label}`);
  const stars = `<span class="star-display rarity-${item.rarity}">${"\u2605".repeat(item.rarity)}</span>`;
  const typeText = titleOverride || (item.type === "weapon" ? t("inventory.weapon") : t("inventory.operator"));
  const slot = Number.isFinite(item.batchSlot) ? `<span class="card-slot" title="${t("card.slotTitle", { slot: item.batchSlot })}">#${item.batchSlot}</span>` : "";
  const pullNumber = Number.isFinite(item.bannerPullNumber) ? `<span class="card-pull-number" title="${t("card.pullTitle", { pull: item.bannerPullNumber })}">P${item.bannerPullNumber}</span>` : "";
  card.innerHTML = `
      <div class="gacha-card-inner">
          <div class="card-face card-back"></div>
          <div class="card-face card-front card-rarity-${item.rarity}">
              ${slot}
              ${pullNumber}
              <span class="front-title">${typeText}</span>
              <span class="star-row">${stars}</span>
              <span class="card-label ${outcome.className}">${outcome.label}</span>
          </div>
      </div>
  `;
  revealBoard.appendChild(card);
  const delay = 80 + ((item.batchSlot || 1) - 1) * 45;
  setTimeout(() => card.classList.add("flipped"), delay);
}
function initInteractiveGacha() {
  const revealBoard = document.getElementById("pull-reveal-board");
  const BANNERS = [0, 1, 2, 3].map((id) => ({ id }));
  function updateBannerDisplay() {
    const b = BANNERS[activeBannerIdx];
    const titleSpan = document.getElementById("active-banner-title").querySelector("span");
    if (titleSpan) {
      titleSpan.innerText = t(`banner.${b.id}.title`);
    }
    document.getElementById("active-banner-subtitle").innerText = t("banner.rules");
  }
  subscribe(updateBannerDisplay);
  try {
    const savedBanner = localStorage.getItem(STORAGE_PREFIX + "active_banner_idx");
    if (savedBanner !== null) {
      activeBannerIdx = parseInt(savedBanner, 10);
      updateBannerDisplay();
    }
  } catch (e) {
    console.error(e);
  }
  function switchInteractiveBanner() {
    activeBannerIdx = (activeBannerIdx + 1) % BANNERS.length;
    updateBannerDisplay();
    try {
      localStorage.setItem(STORAGE_PREFIX + "active_banner_idx", activeBannerIdx);
    } catch (e) {
    }
    interactiveDossierTickets = interactiveNextBannerDossierTickets;
    interactiveNextBannerDossierTickets = 0;
    interactiveFreeLimitedTickets = 0;
    interactiveCharPity.bannerPullsCount = 0;
    interactiveCharPity.pullsSinceFeatured = 0;
    interactiveCharPity.guarantee120Consumed = false;
    interactiveCharPity.featuredCountThisBanner = 0;
    interactiveCharPity.potentialTokensThisBanner = 0;
    interactiveStats.milestone30Triggered = false;
    interactiveStats.milestone60Triggered = false;
    interactiveWeaponPity.issuesCount = 0;
    interactiveWeaponPity.issuesSinceFeatured = 0;
    interactiveWeaponPity.featuredGuaranteeConsumed = false;
    revealBoard.innerHTML = `<span class="no-pulls-yet">${t("pull.bannerChanged")}</span>`;
    updateInteractiveUI();
    saveInteractiveState();
  }
  document.getElementById("btn-switch-banner").addEventListener("click", () => {
    switchInteractiveBanner();
  });
  const processCharacterPullResult = (result) => {
    result.type = "character";
    checkDuplicateAndAwardQuota(result);
    if (result.isUrgent) {
      interactiveStats.charUrgent++;
    } else {
      interactiveStats.charTotal++;
      interactiveStats.pullsInCurrent6StarCycle++;
    }
    if (result.isDossier) {
      interactiveStats.charDossier = (interactiveStats.charDossier || 0) + 1;
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
      if (!result.isUrgent) {
        interactiveStats.charPullsFor6starList.push(interactiveStats.pullsInCurrent6StarCycle);
        interactiveStats.pullsInCurrent6StarCycle = 0;
      }
    } else if (result.rarity === 5) {
      interactiveStats.char5star++;
    }
    const rebate = calculateArsenalTicketsRebate([result]);
    interactiveWeaponTickets += rebate;
    interactiveStats.weapTicketsAccumulated += rebate;
    interactiveInventory.unshift(result);
    renderInteractiveCard(result, result.isDossier ? t("pull.dossier") : "");
  };
  document.getElementById("btn-char-pull1").addEventListener("click", () => {
    let isDossier = false;
    if (interactiveDossierTickets > 0) {
      interactiveDossierTickets--;
      isDossier = true;
    } else {
      interactiveCharTickets++;
    }
    revealBoard.innerHTML = "";
    const result = rollCharacter(interactiveCharPity, false);
    result.batchSlot = 1;
    result.bannerPullNumber = interactiveCharPity.bannerPullsCount;
    result.isDossier = isDossier;
    processCharacterPullResult(result);
    checkInteractiveMilestones();

    if (result.rarity === 6 && result.isFeatured) {
      setTimeout(() => {
        if (confirm(t("pull.promptNextBanner"))) {
          switchInteractiveBanner();
        }
      }, 1200);
    }

    updateInteractiveUI();
    saveInteractiveState();
  });
  document.getElementById("btn-char-pull10").addEventListener("click", () => {
    revealBoard.innerHTML = "";
    let featuredPulled = false;
    for (let i = 0; i < 10; i++) {
      let isDossier = false;
      if (interactiveDossierTickets > 0) {
        interactiveDossierTickets--;
        isDossier = true;
      } else {
        interactiveCharTickets++;
      }
      const result = rollCharacter(interactiveCharPity, false);
      result.batchSlot = i + 1;
      result.bannerPullNumber = interactiveCharPity.bannerPullsCount;
      result.isDossier = isDossier;
      processCharacterPullResult(result);
      if (result.rarity === 6 && result.isFeatured) {
        featuredPulled = true;
      }
    }
    checkInteractiveMilestones();

    if (featuredPulled) {
      setTimeout(() => {
        if (confirm(t("pull.promptNextBanner"))) {
          switchInteractiveBanner();
        }
      }, 1200);
    }

    updateInteractiveUI();
    saveInteractiveState();
  });
  document.getElementById("btn-weapon-issue").addEventListener("click", () => {
    interactiveStats.weapTicketsUsed += 1980;
    revealBoard.innerHTML = "";
    const result = rollWeaponIssue(interactiveWeaponPity);
    interactiveStats.weapIssues++;
    result.items.forEach((item, index2) => {
      item.type = "weapon";
      item.batchSlot = index2 + 1;
      if (item.rarity === 6) {
        interactiveStats.weap6star++;
      } else if (item.rarity === 5) {
        interactiveStats.owned5StarWeapons = (interactiveStats.owned5StarWeapons || 0) + 1;
      }
      interactiveInventory.unshift(item);
      renderInteractiveCard(item);
    });
    if (result.milestoneReward === "selector_box") {
      setTimeout(() => {
        alert(t("milestone.issue10"));
        interactiveStats.weapSelectors++;
        interactiveStats.weap6star++;
        interactiveInventory.unshift({ rarity: 6, isFeatured: false, type: "weapon", note: "weaponSelector10" });
        updateInteractiveUI();
        saveInteractiveState();
      }, 1200);
    } else if (result.milestoneReward === "featured_weapon") {
      setTimeout(() => {
        alert(t("milestone.weaponFeatured"));
        interactiveStats.weap6star++;
        interactiveInventory.unshift({ rarity: 6, isFeatured: true, type: "weapon", note: "weaponMilestone" });
        updateInteractiveUI();
        saveInteractiveState();
      }, 1200);
    }
    updateInteractiveUI();
    saveInteractiveState();
  });
  document.getElementById("btn-reset-interactive").addEventListener("click", () => {
    interactiveCharTickets = 0;
    interactiveWeaponTickets = 0;
    interactiveBondQuota = 0;
    interactiveFreeLimitedTickets = 0;
    interactiveDossierTickets = 0;
    interactiveNextBannerDossierTickets = 0;
    interactiveInventory = [];
    interactiveOwnedCharactersSet.clear();
    interactiveCharPity.pity6 = 0;
    interactiveCharPity.pity5 = 0;
    interactiveCharPity.pullsSinceFeatured = 0;
    interactiveCharPity.bannerPullsCount = 0;
    interactiveCharPity.guarantee120Consumed = false;
    interactiveCharPity.featuredCountThisBanner = 0;
    interactiveCharPity.potentialTokensThisBanner = 0;
    interactiveWeaponPity.issuesCount = 0;
    interactiveWeaponPity.issuesSince6 = 0;
    interactiveWeaponPity.issuesSinceFeatured = 0;
    interactiveWeaponPity.featuredGuaranteeConsumed = false;
    interactiveStats.charTotal = 0;
    interactiveStats.charUrgent = 0;
    interactiveStats.charDossier = 0;
    interactiveStats.char6star = 0;
    interactiveStats.char6starFeatured = 0;
    interactiveStats.char6starLechLimited = 0;
    interactiveStats.char5star = 0;
    interactiveStats.charLosing5050 = 0;
    interactiveStats.pullsInCurrent6StarCycle = 0;
    interactiveStats.charPullsFor6starList = [];
    interactiveStats.milestone30Triggered = false;
    interactiveStats.milestone60Triggered = false;
    interactiveStats.potentialTokens = 0;
    interactiveStats.totalBondQuotaEarned = 0;
    interactiveStats.weapTicketsAccumulated = 0;
    interactiveStats.weapIssues = 0;
    interactiveStats.weap6star = 0;
    interactiveStats.owned5StarWeapons = 0;
    interactiveStats.weapSelectors = 0;
    interactiveStats.weapTicketsUsed = 0;
    revealBoard.innerHTML = `<span class="no-pulls-yet">${t("pull.empty")}</span>`;
    updateInteractiveUI();
    saveInteractiveState();
  });
}
var checkDuplicateAndAwardQuota = (result) => {
  let charId = "";
  if (result.rarity === 6) {
    if (result.isFeatured) {
      charId = `featured_char_banner_${activeBannerIdx}`;
    } else {
      if (result.isLechLimited) {
        const randIdx = Math.floor(Math.random() * LECH_LIMITED_6STAR_POOL2.length);
        charId = LECH_LIMITED_6STAR_POOL2[randIdx];
      } else {
        const randIdx = Math.floor(Math.random() * STANDARD_6STAR_POOL2.length);
        charId = STANDARD_6STAR_POOL2[randIdx];
      }
    }
  } else if (result.rarity === 5) {
    const randIdx = Math.floor(Math.random() * CHAR_5STAR_POOL2.length);
    charId = CHAR_5STAR_POOL2[randIdx];
  } else {
    return;
  }
  let award = 0;
  if (result.rarity === 6) {
    if (result.isFeatured || result.isLechLimited) {
      if (interactiveOwnedCharactersSet.has(charId)) {
        award = 50;
      }
    } else {
      award = 50;
    }
  } else if (result.rarity === 5) {
    award = 10;
  }
  if (award > 0) {
    interactiveBondQuota += award;
    interactiveStats.totalBondQuotaEarned = (interactiveStats.totalBondQuotaEarned || 0) + award;
    if (interactiveBondQuota >= 25) {
      const exchange = Math.floor(interactiveBondQuota / 25);
      interactiveCharTickets -= exchange;
      interactiveBondQuota -= exchange * 25;
    }
  }
  interactiveOwnedCharactersSet.add(charId);
};
function checkInteractiveMilestones() {
  setTimeout(() => {
    if (interactiveCharPity.bannerPullsCount >= 30 && !interactiveStats.milestone30Triggered) {
      interactiveStats.milestone30Triggered = true;
      alert(t("milestone.pull30"));
      let hasHighRarity = false;
      for (let k = 0; k < 10; k++) {
        const force5Star = k === 9 && !hasHighRarity;
        const urgentResult = rollCharacter(interactiveCharPity, true, force5Star);
        if (urgentResult.rarity >= 5) {
          hasHighRarity = true;
        }
        urgentResult.type = "character";
        urgentResult.batchSlot = k + 1;
        checkDuplicateAndAwardQuota(urgentResult);
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
        const rebate = calculateArsenalTicketsRebate([urgentResult]);
        interactiveWeaponTickets += rebate;
        interactiveStats.weapTicketsAccumulated += rebate;
        interactiveInventory.unshift(urgentResult);
        renderInteractiveCard(urgentResult, "Urgent Opt");
      }
      updateInteractiveUI();
      saveInteractiveState();
    }
    if (interactiveCharPity.bannerPullsCount >= 60 && !interactiveStats.milestone60Triggered) {
      interactiveStats.milestone60Triggered = true;
      alert(t("milestone.pull60"));
      interactiveNextBannerDossierTickets += 10;
      updateInteractiveUI();
      saveInteractiveState();
    }
    let potentialAlerted = false;
    while (interactiveCharPity.bannerPullsCount >= (interactiveCharPity.potentialTokensThisBanner + 1) * 240) {
      interactiveCharPity.potentialTokensThisBanner++;
      interactiveStats.potentialTokens++;
      potentialAlerted = true;
    }
    if (potentialAlerted) {
      alert(t("milestone.pull240"));
      updateInteractiveUI();
      saveInteractiveState();
    }
  }, 1200);
}
function initSimulatorControls() {
  const inputs = [
    "input-players",
    "input-banners",
    "input-meta-banners",
    "input-start-tickets",
    "input-start-weapon-tickets",
    "input-base-char",
    "input-base-weapon"
  ];
  inputs.forEach((id) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.addEventListener("input", () => {
        calculateVersionIncome();
        saveSimulatorSettings();
      });
    }
  });
  const bannersInput = document.getElementById("input-banners");
  if (bannersInput) {
    bannersInput.addEventListener("input", () => {
      const val = Math.max(1, Math.trunc(Number(bannersInput.value) || 0));
      document.getElementById("input-meta-banners").value = Math.floor(val * 0.3);
      saveSimulatorSettings();
    });
  }
  document.getElementById("toggle-monthly").addEventListener("change", () => {
    calculateVersionIncome();
    saveSimulatorSettings();
  });
  document.getElementById("toggle-bp").addEventListener("change", () => {
    calculateVersionIncome();
    saveSimulatorSettings();
  });

  // Initialize Sidebar Toggle
  const toggleBtn = document.getElementById("btn-toggle-sidebar");
  const simLayout = document.querySelector(".simulator-layout");
  const toggleIcon = document.getElementById("toggle-sidebar-icon");
  const toggleText = document.getElementById("toggle-sidebar-text");
  
  if (toggleBtn && simLayout) {
    try {
      const isCollapsed = localStorage.getItem("a9e_gacha_sim_sidebar_collapsed") === "true";
      if (isCollapsed) {
        simLayout.classList.add("sidebar-collapsed");
        if (toggleIcon) toggleIcon.innerText = "▶";
        if (toggleText) {
          toggleText.innerText = t("simulator.expandConfig") || "Mở rộng cấu hình";
          toggleText.dataset.i18n = "simulator.expandConfig";
        }
      }
    } catch (e) {}

    toggleBtn.addEventListener("click", () => {
      const collapsed = simLayout.classList.toggle("sidebar-collapsed");
      try {
        localStorage.setItem("a9e_gacha_sim_sidebar_collapsed", String(collapsed));
      } catch (e) {}
      
      if (toggleIcon) {
        toggleIcon.innerText = collapsed ? "▶" : "◀";
      }
      if (toggleText) {
        const key = collapsed ? "simulator.expandConfig" : "simulator.collapseConfig";
        toggleText.innerText = t(key);
        toggleText.dataset.i18n = key;
      }
    });
  }

  calculateVersionIncome();
  document.getElementById("btn-run-simulation").addEventListener("click", () => {
    const numPlayers = Number(document.getElementById("input-players").value);
    const numBanners = Number(document.getElementById("input-banners").value);
    const numMetaBanners = Number(document.getElementById("input-meta-banners").value);
    const startingCharTickets = Number(document.getElementById("input-start-tickets").value);
    const startingWeaponTickets = Number(document.getElementById("input-start-weapon-tickets").value);
    const totalPulls = Number(document.getElementById("input-total-pulls").value);
    const baseChar = Number(document.getElementById("input-base-char").value);
    const baseWeapon = Number(document.getElementById("input-base-weapon").value);
    const isMonthly = document.getElementById("toggle-monthly").checked;
    const isBP = document.getElementById("toggle-bp").checked;
    const incomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
    const weaponIncomeNonGacha = baseWeapon + (isBP ? 1200 : 0);
    const runBtn = document.getElementById("btn-run-simulation");
    runBtn.innerText = t("simulator.running");
    runBtn.disabled = true;
    document.querySelector(".dashboard-content").setAttribute("aria-busy", "true");
    setTimeout(() => {
      const config = {
        mode: "banners",
        numPlayers,
        numBanners,
        numMetaBanners,
        totalPulls: 0,
        startingCharTickets,
        startingWeaponTickets,
        incomePerBanner,
        weaponIncomeNonGacha,
        strategyIds: ["save_commit", "save_commit_single", "yolo", "pull_60", "roll_meta"]
      };
      const numBannersVal = numBanners;
      const tableTitle = document.getElementById("table-comparison-title");
      tableTitle.innerText = t("simulator.tableBanners", { count: formatNumber(numBanners) });
      try {
        const results = MonteCarloSimulator.run(config);
        displaySimulatorResults(results, numBannersVal);
        saveSimulatorLastResults(results, numBannersVal);
      } catch (err) {
        console.error(err);
        alert(t("error.simulation") + "\n\nError: " + err.message + "\nStack: " + err.stack);
      } finally {
        runBtn.innerText = t("simulator.run");
        runBtn.disabled = false;
        document.querySelector(".dashboard-content").setAttribute("aria-busy", "false");
      }
    }, 50);
  });
  const resetSimBtn = document.getElementById("btn-reset-simulator");
  if (resetSimBtn) {
    resetSimBtn.addEventListener("click", () => {
      document.getElementById("input-players").value = 10000;
      document.getElementById("input-banners").value = 10;
      document.getElementById("input-meta-banners").value = 3;
      document.getElementById("input-start-tickets").value = 80;
      document.getElementById("input-start-weapon-tickets").value = 0;
      document.getElementById("input-base-char").value = 36;
      document.getElementById("input-base-weapon").value = 600;
      document.getElementById("toggle-monthly").checked = true;
      document.getElementById("toggle-bp").checked = true;
      calculateVersionIncome();
      saveSimulatorSettings();
      try {
        localStorage.removeItem(STORAGE_PREFIX + "last_results");
      } catch (e) {
      }
    });
  }
}
function calculateVersionIncome() {
  const isBP = document.getElementById("toggle-bp").checked;
  const isMonthly = document.getElementById("toggle-monthly").checked;
  const baseChar = Number(document.getElementById("input-base-char").value);
  const baseWeapon = Number(document.getElementById("input-base-weapon").value);
  const charIncomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
  const weaponIncomePerBanner = baseWeapon + (isBP ? 1200 : 0);
  document.getElementById("info-version-income").innerText = t("simulator.charIncomeValue", {
    banner: formatNumber(charIncomePerBanner, { maximumFractionDigits: 1 }),
    version: formatNumber(charIncomePerBanner * 2, { maximumFractionDigits: 1 })
  });
  document.getElementById("info-weapon-income").innerText = t("simulator.weaponIncomeValue", {
    banner: formatNumber(weaponIncomePerBanner),
    version: formatNumber(weaponIncomePerBanner * 2)
  });
}
function displaySimulatorResults(results, numBanners) {
  const scRes = results.save_commit;
  if (scRes) {
    document.getElementById("card-avg-featured").innerText = scRes.avgFeaturedChars.toFixed(2);
    const eff = scRes.avgPullsPerFeaturedChar;
    document.getElementById("card-avg-efficiency").innerText = Number.isFinite(eff) ? `${eff.toFixed(1)}` : "N/A";
    document.getElementById("card-avg-weapons").innerText = scRes.avgFeaturedWeapons.toFixed(2);
  }
  const tableBody = document.getElementById("comparison-table-body");
  tableBody.innerHTML = "";
  Object.keys(results).forEach((strategyId) => {
    const res = results[strategyId];
    const strategyInfo = strategies[strategyId];
    const eff = res.avgPullsPerFeaturedChar;
    const tr = document.createElement("tr");
    if (strategyId === "save_commit") tr.className = "selected-row";
    const total6StarChar = res.avgFeaturedChars + res.avgLechLimited + res.avgStandard6Stars;
    const total6StarWeap = res.avgFeaturedWeapons + res.avgStandard6StarWeapons;
    const totalCharacterPulls = res.avgCharPulls + res.avgUrgentPulls;
    const regularCharacterPulls = res.avgCharPulls - res.avgDossierPulls;
    tr.innerHTML = `
          <td class="sticky-col">
              <span class="strategy-badge badge-${strategyId}">${strategyInfo ? strategyName(strategyId) : strategyId}</span>
          </td>
          <td class="metric-cell">
              <strong class="metric-main accent-pulls">${totalCharacterPulls.toFixed(0)}</strong>
              <span class="metric-detail">${t("table.metric.regularOnly", { count: regularCharacterPulls.toFixed(1) })}</span>
              <span class="metric-detail urgent-detail">${t("table.metric.urgentOnly", { count: res.avgUrgentPulls.toFixed(1) })}</span>
              <span class="metric-detail dossier-detail">${t("table.metric.dossierOnly", { count: res.avgDossierPulls.toFixed(1) })}</span>
          </td>
          <td class="metric-cell compact">
              <strong class="metric-main accent-wallet">${formatNumber(res.avgUnspentChar, { maximumFractionDigits: 1 })}</strong>
              <span class="metric-detail">${t("table.metric.remainingPulls")}</span>
          </td>
          <td class="metric-cell">
              <strong class="metric-main accent-six">${t("table.metric.sixCompact", { count: total6StarChar.toFixed(2) })}</strong>
              <span class="metric-detail featured-detail">${t("table.metric.featuredUnique", { count: (res.avgFeaturedUnique || 0).toFixed(2) })}</span>
              <span class="metric-detail featured-detail">${t("table.metric.featuredDupes", { count: (res.avgFeaturedDupes || 0).toFixed(2) })}</span>
              <span class="metric-detail">${t("table.metric.charOffrate", {
    limited: (res.avgLechLimited || 0).toFixed(1),
    standard: (res.avgStandard6Stars || 0).toFixed(1)
  })}</span>
          </td>
          <td class="metric-cell">
              <strong class="metric-main accent-efficiency">${t("table.metric.efficiency", { value: Number.isFinite(eff) ? eff.toFixed(1) : "N/A" })}</strong>
              <span class="metric-detail">${t("table.metric.pity120", { value: (res.avgTimesHit120Guarantee || 0).toFixed(2) })}</span>
          </td>
          <td class="metric-cell compact">
              <strong class="metric-main accent-range">${res.bestLuckChar}\u2013${res.worstLuckChar}</strong>
              <span class="metric-detail">${t("table.metric.highLow")}</span>
          </td>
          <td class="metric-cell compact">
              <strong class="metric-main accent-meta">${t("table.metric.metaChar", { count: res.avgMetaFeaturedChars.toFixed(2) })}</strong>
              <span class="metric-detail">${t("table.metric.metaWeapon", { count: res.avgMetaFeaturedWeapons.toFixed(2) })}</span>
          </td>
          <td class="metric-cell">
              <strong class="metric-main accent-weapon">${t("table.metric.sixCompact", { count: total6StarWeap.toFixed(2) })}</strong>
              <span class="metric-detail featured-detail">${t("table.metric.featuredCompact", { count: res.avgFeaturedWeapons.toFixed(2) })}</span>
              <span class="metric-detail arsenal-detail">${t("table.metric.arsenalRemaining", { count: formatNumber(res.avgUnspentWeapon, { maximumFractionDigits: 0 }) })}</span>
          </td>
          <td class="metric-cell">
              <strong class="metric-main">${t("table.metric.weaponUsed", { count: res.avgWeaponPulls.toFixed(0) })}</strong>
              <span class="metric-detail">${t("table.metric.weaponIssues", { count: (res.avgWeaponPulls / 10).toFixed(1) })}</span>
          </td>
          <td class="metric-cell compact">
              <strong class="metric-main accent-ownership">${res.ownershipRate.toFixed(1)}%</strong>
              <span class="metric-detail">${t("table.metric.completed")}</span>
          </td>
      `;
    tableBody.appendChild(tr);
  });
  drawDistributionChart("chart-distribution", results, strategies);
  drawWeaponDistributionChart("chart-efficiency", results, strategies);
}
function initTableTooltips() {
  const headers = document.querySelectorAll(".comparison-table .tooltip-header");
  if (!headers.length) return;
  const tooltip = document.createElement("div");
  tooltip.className = "table-tooltip-portal";
  tooltip.setAttribute("role", "tooltip");
  document.body.appendChild(tooltip);
  const hide = () => tooltip.classList.remove("visible");
  const show = (header) => {
    const content = header.dataset.tooltip;
    if (!content) return;
    tooltip.textContent = content;
    tooltip.classList.add("visible");
    const rect = header.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 8;
    const left = Math.min(window.innerWidth - tooltipRect.width - margin, Math.max(margin, rect.left + rect.width / 2 - tooltipRect.width / 2));
    const below = rect.bottom + margin;
    const top = below + tooltipRect.height <= window.innerHeight - margin ? below : Math.max(margin, rect.top - tooltipRect.height - margin);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };
  headers.forEach((header) => {
    header.tabIndex = 0;
    header.addEventListener("mouseenter", () => show(header));
    header.addEventListener("mouseleave", hide);
    header.addEventListener("focus", () => show(header));
    header.addEventListener("blur", hide);
  });
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
}
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function initSingleRunControls() {
  const seedInput = document.getElementById("single-seed");
  const runButton = document.getElementById("btn-run-single");
  const incomeControls = ["single-char-income", "single-weapon-income", "single-monthly", "single-bp"];
  incomeControls.forEach((id) => {
    const control = document.getElementById(id);
    control.addEventListener(control.type === "checkbox" ? "change" : "input", updateSingleRunIncome);
  });
  updateSingleRunIncome();
  const singleBannersInput = document.getElementById("single-banners");
  if (singleBannersInput) {
    singleBannersInput.addEventListener("input", () => {
      const val = Math.max(1, Math.trunc(Number(singleBannersInput.value) || 0));
      document.getElementById("single-meta-banners").value = Math.floor(val * 0.3);
    });
  }
  document.getElementById("btn-random-seed").addEventListener("click", () => {
    seedInput.value = createRandomSeed();
    seedInput.focus();
    seedInput.select();
  });
  runButton.addEventListener("click", () => {
    runButton.disabled = true;
    runButton.textContent = t("single.running");
    const report = document.getElementById("single-run-report");
    report.setAttribute("aria-busy", "true");
    setTimeout(() => {
      try {
        lastSingleRun = runSingleDetailedSimulation({
          strategyId: document.getElementById("single-strategy").value,
          seed: seedInput.value,
          numBanners: Number(document.getElementById("single-banners").value),
          numMetaBanners: Number(document.getElementById("single-meta-banners").value),
          startingCharTickets: Number(document.getElementById("single-start-tickets").value),
          startingWeaponTickets: Number(document.getElementById("single-start-weapons").value),
          incomePerBanner: getSingleRunIncome().characters,
          weaponIncomePerBanner: getSingleRunIncome().arsenal
        });
        seedInput.value = lastSingleRun.config.seed;
        renderSingleRun(lastSingleRun);
      } catch (error) {
        console.error(error);
        alert(t("error.simulation"));
      } finally {
        runButton.disabled = false;
        runButton.textContent = t("single.run");
        report.setAttribute("aria-busy", "false");
      }
    }, 20);
  });
}
function getSingleRunIncome() {
  const baseCharacters = Number(document.getElementById("single-char-income")?.value) || 0;
  const baseArsenal = Number(document.getElementById("single-weapon-income")?.value) || 0;
  const monthly = document.getElementById("single-monthly")?.checked === true;
  const bp = document.getElementById("single-bp")?.checked === true;
  return {
    characters: baseCharacters + (monthly ? 9 : 0) + (bp ? 5 : 0),
    arsenal: baseArsenal + (bp ? 1200 : 0)
  };
}
function updateSingleRunIncome() {
  const output = document.getElementById("single-income-summary");
  if (!output) return;
  const income = getSingleRunIncome();
  output.textContent = t("single.incomeSummary", {
    characters: formatNumber(income.characters),
    arsenal: formatNumber(income.arsenal)
  });
}
function singlePullType(item) {
  if (item.rarity !== 6) return "";
  if (item.isFeatured) return t("single.featured");
  return item.isLechLimited ? t("single.offLimited") : t("single.offStandard");
}
function singleDecisionText(strategyId, decision) {
  if (strategyId === "yolo") return t("single.yoloDecision");
  if (strategyId === "pull_60") return t("single.pull60Decision");
  if (strategyId === "roll_meta") return t("single.metaDecision");
  return decision.totalAvailable >= 110 ? t("single.commit") : t("single.skipCommit");
}
function phaseLabel(phase) {
  return {
    commit: t("single.phaseCommit"),
    strategy: t("single.phaseStrategy"),
    dossier: t("single.phaseDossier"),
    optimize30: t("single.phaseOptimize")
  }[phase] || t("single.strategyPhase");
}
function pullGroupLabel(group) {
  if (group.kind === "standard") return t("single.groupStandard", { count: group.entries.length });
  if (group.kind === "free") return t("single.groupFree", { count: group.entries.length });
  if (group.kind === "urgent") return t("single.groupUrgent", { count: group.entries.length });
  if (group.kind === "single") return t("single.groupSingle", { count: group.entries.length });
  const batches = group.batchIds.size || Math.max(1, Math.ceil(group.entries.length / 10));
  return batches === 1 ? "x10" : t("single.groupTen", { count: batches });
}
function pullGroupRange(group) {
  const start = group.entries[0].pull;
  const end = group.entries.at(-1).pull;
  const pool = group.kind === "standard" ? "Standard" : group.kind === "urgent" ? "Urgent" : "Limited";
  return `${pool} #${start}${end === start ? "" : `\u2013${end}`}`;
}
function pullEventChip(entry) {
  const item = entry.item;
  const type = singlePullType(item);
  const pity = item.rarity === 6 && !item.isUrgent
    ? ` \xB7 ${t("single.hitPity", { pity: Number.isFinite(item.standardPity6Before) ? item.standardPity6Before + 1 : item.pity6Before + 1 })}`
    : "";
  const detail = type ? ` \xB7 ${type}` : "";
  return `<span class="pull-result rarity-${item.rarity}"><b>${item.rarity}\u2605</b> #${entry.pull}${detail}${pity}</span>`;
}
function pullGroupMilestones(group) {
  const pulls = new Set(group.entries.filter((entry) => !entry.item.isUrgent).map((entry) => entry.pull));
  const milestones = [];
  if (pulls.has(30)) milestones.push(`<span class="milestone-chip">${t("single.milestone30Short")}</span>`);
  if (pulls.has(60)) milestones.push(`<span class="milestone-chip">${t("single.milestone60Short")}</span>`);
  if (pulls.has(120)) milestones.push(`<span class="milestone-chip featured">${t("single.milestone120Short")}</span>`);
  return milestones.join("");
}
function renderPullGroup(group) {
  const items = group.entries.map((entry) => entry.item);
  const last = items.at(-1);
  const notable = group.entries.filter((entry) => entry.item.rarity >= 5).map(pullEventChip);
  const quotaEarned = items.reduce((sum, item) => sum + (item.quotaEarned || 0), 0);
  const quotaTickets = items.reduce((sum, item) => sum + (item.quotaTicketsExchanged || 0), 0);
  const quotaEnd = Number.isFinite(last.bondQuotaAfter) ? last.bondQuotaAfter : 0;
  const walletEnd = Number.isFinite(last.charTicketsAfterQuota) ? formatNumber(last.charTicketsAfterQuota) : "\u2014";
  const arsenalEarned = calculatePullArsenal(items);
  const phase = ["standard", "free", "urgent"].includes(group.kind) ? "" : `<span class="phase-chip">${phaseLabel(group.phase)}</span>`;
  const quotaExchange = quotaTickets ? ` \u2192 ${t("single.exchangedTickets", { count: quotaTickets })}` : "";
  let pity80 = last.pity6After;
  let featured120 = last.guarantee120ConsumedAfter ? "\u2713" : `${last.pullsSinceFeaturedAfter}/120`;
  if (group.kind === "standard") {
    pity80 = last.standardPity6After;
    featured120 = null;
  }
  return `<article class="pull-group ${group.kind}">
      <div class="pull-group-heading">
          <div><strong>${pullGroupLabel(group)}</strong><span>${pullGroupRange(group)}</span>${phase}</div>
          <div class="pull-results">${notable.length ? notable.join("") : `<span class="no-notable">${t("single.noNotableShort")}</span>`}${pullGroupMilestones(group)}</div>
      </div>
      <div class="pull-group-stats">
          <span class="stat-quota"><b>Bond</b> +${quotaEarned}${quotaExchange} \xB7 ${t("single.remainingShort", { value: quotaEnd })}</span>
          <span class="stat-arsenal"><b>Arsenal</b> +${formatNumber(arsenalEarned)}</span>
          <span class="stat-wallet"><b>${t("single.ticketShort")}</b> ${walletEnd}</span>
          <span class="stat-pity"><b>${t("single.pityAfterShort")}</b> 6\u2605 ${pity80}/80${featured120 === null ? "" : ` \xB7 120 ${featured120}`}</span>
      </div>
  </article>`;
}
function renderCharacterTimeline(banner) {
  return `<div class="pull-group-list">${buildCharacterPullGroups(banner).map(renderPullGroup).join("")}</div>`;
}
function characterSummary(banner) {
  const hits = featuredCharacterHits(banner.result.charPulls);
  if (!hits.length) return `<span class="summary-result"><b>${t("single.operatorAbbr")}</b> ${t("single.notObtainedShort")}</span>`;
  const positions = hits.map((hit) => hit.urgent
    ? `Urgent #${hit.pull}`
    : `#${hit.pull} \xB7 ${t("single.hitPity", { pity: hit.pity })}`).join(", ");
  return `<span class="summary-result success"><b>${t("single.operatorAbbr")}</b> Featured${hits.length > 1 ? ` \xD7${hits.length}` : ""} <em>(${positions})</em></span>`;
}
function weaponSummary(banner) {
  const hits = featuredWeaponHits(banner.result.weaponIssues);
  if (!hits.length) {
    const status = banner.result.weaponIssues.length ? t("single.notObtainedShort") : t("single.notRolledShort");
    return `<span class="summary-result weapon"><b>${t("single.weaponAbbr")}</b> ${status}</span>`;
  }
  const positions = hits.map((hit) => hit.milestone
    ? t("single.weaponMilestonePosition", { issue: hit.issue })
    : t("single.weaponPosition", { issue: hit.issue, pull: hit.pull })).join(", ");
  return `<span class="summary-result weapon success"><b>${t("single.weaponAbbr")}</b> Featured${hits.length > 1 ? ` \xD7${hits.length}` : ""} <em>(${positions})</em></span>`;
}
function renderWeaponIssues(banner) {
  if (!banner.result.weaponIssues.length) return `<p class="muted-line">${t("single.noWeaponIssues")}</p>`;
  return `<div class="issue-grid">${banner.result.weaponIssues.map((issue, index2) => {
    const six = issue.items.filter((item) => item.rarity === 6).length;
    const five = issue.items.filter((item) => item.rarity === 5).length;
    const featured = issue.items.filter((item) => item.rarity === 6 && item.isFeatured).length;
    const milestone = issue.milestoneReward ? t("single.milestoneReward", { reward: escapeHtml(issue.milestoneReward) }) : "";
    return `<article class="issue-card ${featured ? "has-featured" : ""}">
          <strong>${t("single.issue", { index: index2 + 1 })}</strong>
          <span>${t("single.issueSummary", { six, five, milestone })}</span>
          <div class="issue-pips" aria-hidden="true">${issue.items.filter((item) => item.rarity >= 5).map((item) => `<i class="rarity-${item.rarity} ${item.isFeatured ? "featured" : ""}"></i>`).join("")}</div>
      </article>`;
  }).join("")}</div>`;
}
function renderSingleBanner(banner, run) {
  const decision = banner.result.decisionState;
  const featuredProgress = banner.charPityAfter.guarantee120Consumed ? t("single.completed") : `${banner.charPityAfter.pullsSinceFeatured}/120`;
  const quotaSpent = banner.quotaTickets * 25;
  const openingTickets = banner.before.charTickets + run.config.incomePerBanner;
  const arsenalIncome = banner.result.arsenalTicketsRebate + run.config.weaponIncomePerBanner;
  const pullsTotal = banner.result.standardPulls.length + banner.regularLimited.length + banner.urgent.length;
  return `<details class="banner-trace glass-panel" ${banner.index === 1 ? "open" : ""}>
      <summary>
          <span class="banner-index">${String(banner.index).padStart(2, "0")}</span>
          <span class="banner-summary-content">
              <span class="banner-summary-top">
                  <strong>${t("single.banner", { index: banner.index })}</strong>
                  <span class="banner-summary-results">${characterSummary(banner)}${weaponSummary(banner)}</span>
              </span>
              <span class="banner-summary-meta">
                  <span><b>${formatNumber(pullsTotal)}</b> ${t("single.pullCountShort")}</span>
                  <span>${t("single.pullsBreakdown", {
    standard: banner.result.standardPulls.length,
    limited: banner.regularLimited.length,
    urgent: banner.urgent.length
  })}</span>
                  <span><b>${t("single.ticketShort")}</b> ${formatNumber(openingTickets)}\u2192${formatNumber(banner.after.charTickets)}</span>
                  <span><b>Bond</b> ${banner.before.bondQuota}\u2192${banner.after.bondQuota}</span>
                  <span><b>Arsenal</b> +${formatNumber(arsenalIncome)}${banner.weaponTicketsSpent ? ` \xB7 \u2212${formatNumber(banner.weaponTicketsSpent)}` : ""} \u2192 ${formatNumber(banner.after.arsenalTickets)}</span>
              </span>
              <span class="banner-summary-pity"><b>${t("single.pityClosingShort")}</b> 6\u2605 ${banner.charPityAfter.pity6}/80 \xB7 120 ${banner.charPityAfter.guarantee120Consumed ? "\u2713" : `${banner.charPityAfter.pullsSinceFeatured}/120`} \xB7 Standard ${banner.after.standardPity6}/80</span>
          </span>
      </summary>
      <div class="banner-trace-body">
          <section class="trace-section opening-section">
              <h4>${t("single.opening")}</h4>
              <p>${t("single.openingWallet", {
    tickets: formatNumber(banner.before.charTickets + run.config.incomePerBanner),
    income: formatNumber(run.config.incomePerBanner),
    dossier: banner.incomingDossier,
    arsenal: formatNumber(banner.before.arsenalTickets + run.config.weaponIncomePerBanner),
    weaponIncome: formatNumber(run.config.weaponIncomePerBanner),
    quota: banner.before.bondQuota
  })}</p>
              <p>${t("single.pityOpening", {
    limited: banner.result.bannerStartState.pity6,
    standard: banner.before.standardPity6
  })}</p>
          </section>

          <section class="trace-section timeline-section">
              <h4>${t("single.timeline")}</h4>
              <div class="timeline-decision">
                  <p>${t("single.decision", {
    tickets: decision.charTickets,
    dossier: decision.dossierTickets,
    pity: decision.pity6,
    guarantee: decision.guarantee120Consumed ? t("single.completed") : `${decision.pullsSinceFeatured}/120`
  })}</p>
                  <p class="decision-callout">${singleDecisionText(run.config.strategyId, decision)}</p>
              </div>
              ${renderCharacterTimeline(banner)}
          </section>

          <section class="trace-section ledger-section">
              <h4>${t("single.ledger")}</h4>
              <div class="ledger-grid">
                  <div><span>Q</span>${t("single.quotaLedger", {
    earned: banner.quotaEarned,
    spent: quotaSpent,
    tickets: banner.quotaTickets,
    remaining: banner.after.bondQuota
  })}</div>
                  <div><span>A</span>${t("single.arsenalLedger", {
    rebate: formatNumber(banner.result.arsenalTicketsRebate),
    income: formatNumber(run.config.weaponIncomePerBanner),
    spent: formatNumber(banner.weaponTicketsSpent),
    remaining: formatNumber(banner.after.arsenalTickets)
  })}</div>
                  <div><span>D</span>${t("single.dossierLedger", {
    incoming: banner.incomingDossier,
    outgoing: banner.after.nextDossier
  })}</div>
              </div>
          </section>

          <section class="trace-section weapon-section">
              <h4>${t("single.arsenal")}</h4>
              ${renderWeaponIssues(banner)}
          </section>

          <section class="trace-section closing-section">
              <h4>${t("single.ending")}</h4>
              <p>${t("single.endWallet", {
    tickets: formatNumber(banner.after.charTickets),
    dossier: banner.after.nextDossier,
    arsenal: formatNumber(banner.after.arsenalTickets),
    quota: banner.after.bondQuota
  })}</p>
              <p>${t("single.endPity", {
    limited: banner.charPityAfter.pity6,
    featured: featuredProgress,
    standard: banner.after.standardPity6
  })}</p>
          </section>
      </div>
  </details>`;
}
function renderSingleRun(run) {
  const report = document.getElementById("single-run-report");
  const summary = run.summary;
  report.innerHTML = `<section class="single-report-header glass-panel">
      <div class="report-heading">
          <span class="eyebrow">${t("single.reportKicker")}</span>
          <h2>${t("single.reportTitle", {
    strategy: strategyName(run.config.strategyId),
    banners: formatNumber(run.config.numBanners)
  })}</h2>
          <div class="seed-readout">
              <span>${t("single.seedLabel")} <code>${escapeHtml(run.config.seed)}</code></span>
          </div>
      </div>
      <div class="single-summary-grid">
          <div><span>${t("single.featuredChars")}</span><strong>${summary.featuredCharacters}</strong><small>${summary.featuredUnique} unique \xB7 ${summary.featuredDupes} dupe<br>${t("single.pity120Hits", { count: summary.timesHit120Guarantee || 0 })}</small></div>
          <div><span>${t("single.featuredWeapons")}</span><strong>${summary.featuredWeapons}</strong><small>${summary.standardWeapons} off-banner 6\u2605</small></div>
          <div><span>${t("single.characterPulls")}</span><strong>${formatNumber(summary.totalCharPulls + summary.totalUrgentPulls)}</strong><small>${t("single.pullSources", {
    regular: formatNumber(summary.totalCharPulls - summary.totalDossierPulls),
    urgent: formatNumber(summary.totalUrgentPulls),
    dossier: formatNumber(summary.totalDossierPulls)
  })}</small></div>
          <div><span>${t("single.walletLeft")}</span><strong>${t("single.remainingPulls", { count: formatNumber(summary.charTickets) })}</strong><small>${formatNumber(summary.arsenalTickets)} Arsenal</small></div>
      </div>
  </section>
  <div class="banner-trace-list">${run.banners.map((banner) => renderSingleBanner(banner, run)).join("")}</div>`;
}
