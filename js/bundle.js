(() => {
  // js/gacha-math.js
  function rollCharacter(state, isUrgent = false) {
    if (isUrgent) {
      const r2 = Math.random();
      if (r2 < 8e-3) {
        const isFeatured = Math.random() < 0.5;
        const isLechLimited = !isFeatured && Math.random() < 0.1;
        return { rarity: 6, isFeatured, isUrgent: true, isLechLimited };
      } else if (r2 < 8e-3 + 0.08) {
        return { rarity: 5, isFeatured: Math.random() < 0.5, isUrgent: true };
      } else {
        return { rarity: 4, isFeatured: false, isUrgent: true };
      }
    }
    state.bannerPullsCount++;
    state.pity6++;
    state.pity5++;
    state.pullsSinceFeatured++;
    let rate6 = 8e-3;
    if (state.pity6 >= 80) {
      rate6 = 1;
    } else if (state.pity6 > 65) {
      rate6 = 8e-3 + (state.pity6 - 65) * 0.05;
    }
    const isGuaranteedFeatured = state.pullsSinceFeatured >= 120;
    if (isGuaranteedFeatured) {
      rate6 = 1;
    }
    const r = Math.random();
    if (r < rate6) {
      const isFeatured = isGuaranteedFeatured ? true : Math.random() < 0.5;
      const isLechLimited = !isFeatured && Math.random() < 0.1;
      state.pity6 = 0;
      state.pity5 = 0;
      if (isFeatured) {
        state.pullsSinceFeatured = 0;
      }
      return { rarity: 6, isFeatured, isUrgent: false, isLechLimited };
    }
    const isGuaranteed5 = state.pity5 >= 10;
    const rate5 = isGuaranteed5 ? 1 : 0.08;
    if (Math.random() < rate5) {
      const isFeatured = Math.random() < 0.5;
      state.pity5 = 0;
      return { rarity: 5, isFeatured, isUrgent: false };
    }
    return { rarity: 4, isFeatured: false, isUrgent: false };
  }
  function rollWeaponIssue(state) {
    state.issuesCount++;
    let guaranteeFeatured = state.issuesSinceFeatured >= 7;
    let guarantee6 = state.issuesSince6 >= 3;
    const results = [];
    let found6 = false;
    let foundFeatured = false;
    for (let i = 0; i < 10; i++) {
      let rarity = 4;
      let isFeatured = false;
      if (i === 0 && guaranteeFeatured) {
        rarity = 6;
        isFeatured = true;
        guaranteeFeatured = false;
        guarantee6 = false;
      } else if (i === 0 && guarantee6) {
        rarity = 6;
        isFeatured = Math.random() < 0.25;
        guarantee6 = false;
      } else {
        let p6 = 0.04;
        let p5 = 0.15;
        let p4 = 0.81;
        const hasHighRarity = results.some((item) => item.rarity >= 5);
        if (i === 9 && !hasHighRarity) {
          p4 = 0;
          const total = p6 + p5;
          p6 = p6 / total;
          p5 = p5 / total;
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
    let milestoneReward = null;
    if (state.issuesCount === 10) {
      milestoneReward = "selector_box";
    } else if (state.issuesCount === 18) {
      milestoneReward = "featured_weapon";
    } else if (state.issuesCount > 18 && (state.issuesCount - 18) % 8 === 0) {
      milestoneReward = "featured_weapon";
    }
    return {
      items: results,
      milestoneReward
    };
  }
  function calculateArsenalTicketsRebate(hhResults) {
    let tickets = 0;
    hhResults.forEach((item) => {
      if (item.rarity === 6) {
        tickets += 2e3;
      } else if (item.rarity === 5) {
        tickets += 200;
      } else if (item.rarity === 4) {
        tickets += 20;
      }
    });
    return tickets;
  }
  function rollStandardCharacter(state) {
    state.bannerPullsCount = (state.bannerPullsCount || 0) + 1;
    state.pity6 = (state.pity6 || 0) + 1;
    state.pity5 = (state.pity5 || 0) + 1;
    let rate6 = 8e-3;
    if (state.pity6 >= 80) {
      rate6 = 1;
    } else if (state.pity6 > 65) {
      rate6 = 8e-3 + (state.pity6 - 65) * 0.05;
    }
    const r = Math.random();
    if (r < rate6) {
      state.pity6 = 0;
      state.pity5 = 0;
      return { rarity: 6, isFeatured: false, isUrgent: false, isLechLimited: false };
    }
    const isGuaranteed5 = state.pity5 >= 10;
    const rate5 = isGuaranteed5 ? 1 : 0.08;
    if (Math.random() < rate5) {
      state.pity5 = 0;
      return { rarity: 5, isFeatured: false, isUrgent: false };
    }
    return { rarity: 4, isFeatured: false, isUrgent: false };
  }

  // js/strategies.js
  var SimulatorPlayer = class {
    constructor(id) {
      this.id = id;
      this.charTickets = 0;
      this.charTicketsDebt = 0;
      this.nextBannerDossierTickets = 0;
      this.bondQuota = 0;
      this.totalBondQuotaEarned = 0;
      this.ownedCharactersSet = /* @__PURE__ */ new Set();
      this.standardCharPity = {
        pity6: 0,
        pity5: 0,
        bannerPullsCount: 0
      };
      this.arsenalTickets = 0;
      this.arsenalTicketsDebt = 0;
      this.totalWeaponTicketsUsed = 0;
      this.ownedFeaturedCharacters = 0;
      this.ownedFeaturedUnique = 0;
      this.ownedFeaturedDupes = 0;
      this.ownedLechLimited = 0;
      this.ownedStandard6Stars = 0;
      this.owned5Stars = 0;
      this.totalCharPulls = 0;
      this.totalUrgentPulls = 0;
      this.ownedFeaturedWeapons = 0;
      this.ownedStandard6StarWeapons = 0;
      this.owned5StarWeapons = 0;
      this.totalWeaponPulls = 0;
      this.weaponMilestoneSelectors = 0;
    }
  };
  var STANDARD_6STAR_POOL = ["std_6_1", "std_6_2", "std_6_3", "std_6_4", "std_6_5", "std_6_6"];
  var LECH_LIMITED_6STAR_POOL = ["lim_6_1", "lim_6_2", "lim_6_3"];
  var CHAR_5STAR_POOL = Array.from({ length: 15 }, (_, i) => `char_5_${i + 1}`);
  function processCharacterDuplicateAndQuota(player, result, bannerIdx) {
    let charId = "";
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
      return;
    }
    if (player.ownedCharactersSet.has(charId)) {
      const quotaEarned = result.rarity === 6 ? 50 : 10;
      player.bondQuota += quotaEarned;
      player.totalBondQuotaEarned += quotaEarned;
      if (player.bondQuota >= 25) {
        const ticketsExchanged = Math.floor(player.bondQuota / 25);
        player.charTickets += ticketsExchanged;
        player.bondQuota -= ticketsExchanged * 25;
      }
    } else {
      player.ownedCharactersSet.add(charId);
    }
  }
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
  var isMetaBanner = (bannerIdx, totalBanners) => {
    const numMeta = Math.floor(totalBanners * 0.3);
    if (numMeta <= 0) return false;
    const step = totalBanners / numMeta;
    for (let m = 0; m < numMeta; m++) {
      const idx = Math.floor(m * step + step / 2);
      if (idx === bannerIdx) return true;
    }
    return false;
  };
  function executeCharacterPullSequence(player, bannerState, targetPulls, stopOnFeatured, bannerIdx, gotFeaturedThisBanner = false, forceSingleRoll = false) {
    const pullsRecord = [];
    let gotFeatured = gotFeaturedThisBanner;
    let currentBannerPulls = bannerState.bannerPullsCount;
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
      const canRoll10 = !forceSingleRoll && pullsNeeded >= 10 && totalTicketsAvailable >= 10 && bannerState.pity6 < 71 && bannerState.pullsSinceFeatured < 111 && (!stopOnFeatured || !gotFeatured);
      if (canRoll10) {
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
        if (player.nextBannerDossierTickets > 0) {
          player.nextBannerDossierTickets--;
        } else if (player.charTickets > 0) {
          player.charTickets--;
        } else {
          break;
        }
        executeSinglePull(false);
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
      result.items.forEach((item) => {
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
      if (result.milestoneReward === "selector_box" || result.milestoneReward === "featured_weapon") {
        gotFeatured = true;
        player.ownedFeaturedWeapons++;
      }
    }
    return issuesRecord;
  }
  var strategies = {
    // ----------------------------------------------------------------
    // Chiến thuật 1: Save & Commit (Tích lũy an toàn)
    // ----------------------------------------------------------------
    save_commit: {
      id: "save_commit",
      name: "Save & Commit",
      desc: "Nh\xE2n v\u1EADt: Ch\u1EC9 quay khi t\xEDch \u0111\u1EE7 >= 120 v\xE9 (ch\u1EAFc ch\u1EAFn ra). Khi quay s\u1EBD quay \u0111\u1EBFn khi ra Featured th\xEC d\u1EEBng l\u1EA1i. V\u0169 kh\xED: Ch\u1EC9 quay khi t\xEDch l\u0169y \u0111\u1EE7 8 Issues (15,840 v\xE9) \u0111\u1EC3 \u0111\u1EA3m b\u1EA3o 100% tr\xFAng v\u0169 kh\xED rate-up.",
      runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
        return [];
      },
      runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
        return [];
      }
    },
    save_commit_single: {
      id: "save_commit_single",
      name: "Save & Commit (Roll l\u1EBB)",
      desc: "Nh\xE2n v\u1EADt: Ch\u1EC9 quay l\u1EBB x1 t\u1EEB \u0111\u1EA7u \u0111\u1EBFn cu\u1ED1i khi t\xEDch \u0111\u1EE7 >= 120 v\xE9 (ch\u1EAFc ch\u1EAFn ra), d\u1EEBng ngay khi ra Featured. V\u0169 kh\xED: Ch\u1EC9 quay khi t\xEDch l\u0169y \u0111\u1EE7 8 Issues (15,840 v\xE9).",
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
      id: "yolo",
      name: "Yolo / Spend All",
      desc: "Nh\xE2n v\u1EADt: C\u1EE9 c\xF3 bao nhi\xEAu v\xE9 l\xE0 quay h\u1EBFt, nh\u01B0ng d\u1EEBng l\u1EA1i ngay l\u1EADp t\u1EE9c n\u1EBFu tr\xFAng nh\xE2n v\u1EADt Featured. V\u0169 kh\xED: Quay v\u0169 kh\xED n\u1EBFu tr\xFAng nh\xE2n v\u1EADt.",
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
      id: "pull_60",
      name: "Pull 60",
      desc: "Nh\xE2n v\u1EADt: Ch\u1EC9 quay khi t\xEDnh \u0111\u1EE7 60 l\u01B0\u1EE3t (\u0111\u1EC3 l\u1EA5y v\xE9 Dossier x10). N\u1EBFu kh\xF4ng \u0111\u1EE7 60, c\u1ED1 ch\u1EA1m m\u1ED1c 30 \u0111\u1EC3 nh\u1EADn Urgent free, ng\u01B0\u1EE3c l\u1EA1i s\u1EBD skip \u0111\u1EC3 tr\u1EEF v\xE9. V\u0169 kh\xED: Quay v\u0169 kh\xED n\u1EBFu tr\xFAng nh\xE2n v\u1EADt.",
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
      id: "roll_meta",
      name: "Roll Meta",
      desc: "Nh\xE2n v\u1EADt: 30% s\u1ED1 banner l\xE0 Meta (quay t\u1ED1i \u0111a 120 roll). C\xE1c banner th\u01B0\u1EDDng kh\xE1c quay theo Save & Commit (ch\u1EC9 x\u1EA3 v\xE9 khi t\xEDch \u0111\u1EE7 b\u1EA3o hi\u1EC3m 120 roll v\xE0 b\u1EA3o \u0111\u1EA3m sau khi quay xong v\u1EABn t\xEDch \u0111\u1EE7 b\u1EA3o hi\u1EC3m 120 roll cho banner Meta ti\u1EBFp theo, ng\u01B0\u1EE3c l\u1EA1i ch\u1EC9 quay 10 roll free). V\u0169 kh\xED: Ch\u1EC9 quay v\u0169 kh\xED \u1EDF banner Meta.",
      runCharacterPull(player, bannerState, ticketIncome, bannerIdx, totalBanners) {
        return [];
      },
      runWeaponPull(player, bannerState, totalArsenalTicketsEarned, gotFeaturedChar, bannerIdx, totalBanners) {
        return [];
      }
    }
  };
  function runSingleBannerForPlayer(strategyId, player, charBannerState, weaponBannerState, ticketIncome, weaponIncomeNonGacha = 0, bannerIdx = 0, totalBanners = 1) {
    const strategy = strategies[strategyId];
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} is not defined.`);
    }
    charBannerState.bannerPullsCount = 0;
    charBannerState.pullsSinceFeatured = 0;
    weaponBannerState.issuesCount = 0;
    weaponBannerState.issuesSinceFeatured = 0;
    player.charTickets += ticketIncome;
    const stdPulls = executeStandardBannerRolls(player, 15, bannerIdx);
    const freeLimResults = executeFreeLimitedRolls(player, charBannerState, bannerIdx);
    let gotFeaturedChar = freeLimResults.gotFeatured;
    const allCharPulls = [...freeLimResults.pullsRecord];
    let pullsRecord = [];
    if (strategyId === "save_commit") {
      if (player.charTickets >= 110) {
        const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar);
        pullsRecord = res.pullsRecord;
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
      }
    } else if (strategyId === "save_commit_single") {
      if (player.charTickets >= 110) {
        const res = executeCharacterPullSequence(player, charBannerState, 120, true, bannerIdx, gotFeaturedChar, true);
        pullsRecord = res.pullsRecord;
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
      }
    } else if (strategyId === "yolo") {
      const res = executeCharacterPullSequence(player, charBannerState, Infinity, true, bannerIdx, gotFeaturedChar);
      pullsRecord = res.pullsRecord;
      gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
    } else if (strategyId === "pull_60") {
      let targetPulls = 0;
      if (player.charTickets >= 50) {
        targetPulls = 60;
      } else if (player.charTickets >= 20) {
        targetPulls = 30;
      }
      if (targetPulls > 0) {
        const res = executeCharacterPullSequence(player, charBannerState, targetPulls, false, bannerIdx, gotFeaturedChar);
        pullsRecord = res.pullsRecord;
        gotFeaturedChar = gotFeaturedChar || res.gotFeatured;
      }
    } else if (strategyId === "roll_meta") {
      const isMeta = isMetaBanner(bannerIdx, totalBanners);
      let shouldPull = false;
      if (isMeta) {
        shouldPull = true;
      } else {
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
          if (player.charTickets >= 110 + Math.max(0, neededAfterThis)) {
            shouldPull = true;
          }
        } else {
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
    const totalCharRollsThisBanner = [...stdPulls, ...allCharPulls];
    const arsenalTicketsRebate = calculateArsenalTicketsRebate(totalCharRollsThisBanner);
    const totalArsenalTicketsEarned = arsenalTicketsRebate + weaponIncomeNonGacha;
    let weaponIssues = [];
    if (strategyId === "save_commit" || strategyId === "save_commit_single") {
      player.arsenalTickets += totalArsenalTicketsEarned;
      if (gotFeaturedChar && player.arsenalTickets >= 15840) {
        weaponIssues = executeWeaponPullSequence(player, weaponBannerState, 0, gotFeaturedChar);
      }
    } else if (strategyId === "roll_meta") {
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

  // js/simulator.js
  var MonteCarloSimulator = class {
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
      if (mode === "pulls") {
        totalPullsAllocated = config.totalPulls;
        numBanners = Math.max(1, Math.ceil(totalPullsAllocated / incomePerBanner));
      }
      const results = {};
      strategyIds.forEach((strategyId) => {
        const players = [];
        for (let i = 0; i < numPlayers; i++) {
          const player = new SimulatorPlayer(i);
          player.charTickets = mode === "pulls" ? 0 : startingCharTickets;
          players.push(player);
        }
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
        for (let b = 0; b < numBanners; b++) {
          let bannerIncome = incomePerBanner;
          if (mode === "pulls") {
            if (b === numBanners - 1) {
              bannerIncome = totalPullsAllocated - (numBanners - 1) * incomePerBanner;
            }
          }
          for (let p = 0; p < numPlayers; p++) {
            const player = players[p];
            const charPity = playerCharPities[p];
            const weaponPity = playerWeaponPities[p];
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
      let maxFeaturedChars = -Infinity;
      let minFeaturedChars = Infinity;
      let maxFeaturedWeapons = -Infinity;
      let minFeaturedWeapons = Infinity;
      const distribution = {};
      players.forEach((player) => {
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
        if (player.ownedFeaturedCharacters > maxFeaturedChars) maxFeaturedChars = player.ownedFeaturedCharacters;
        if (player.ownedFeaturedCharacters < minFeaturedChars) minFeaturedChars = player.ownedFeaturedCharacters;
        if (player.ownedFeaturedWeapons > maxFeaturedWeapons) maxFeaturedWeapons = player.ownedFeaturedWeapons;
        if (player.ownedFeaturedWeapons < minFeaturedWeapons) minFeaturedWeapons = player.ownedFeaturedWeapons;
        const count = player.ownedFeaturedCharacters;
        distribution[count] = (distribution[count] || 0) + 1;
      });
      const distributionPercent = {};
      Object.keys(distribution).forEach((key) => {
        distributionPercent[key] = distribution[key] / numPlayers * 100;
      });
      const averageFeaturedChars = sumFeaturedChars / numPlayers;
      const ownershipRate = averageFeaturedChars / numBanners * 100;
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
        ownershipRate,
        // Cực trị nhân vật
        bestLuckChar: maxFeaturedChars,
        worstLuckChar: minFeaturedChars,
        // Hiệu suất vé nhân vật (Số vé trung bình để ra 1 Featured)
        avgPullsPerFeaturedChar: averageFeaturedChars > 0 ? (sumCharPulls + sumCharDebt) / sumFeaturedChars : Infinity,
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
  };

  // js/chart-helper.js
  var chartInstances = {};
  function destroyChartIfExists(canvasId) {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    }
  }
  function drawDistributionChart(canvasId, results, strategiesConfig) {
    destroyChartIfExists(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    let maxOwned = 0;
    Object.keys(results).forEach((strategyId) => {
      const distKeys = Object.keys(results[strategyId].distribution).map(Number);
      if (distKeys.length > 0) {
        maxOwned = Math.max(maxOwned, ...distKeys);
      }
    });
    const labels = [];
    for (let i = 0; i <= maxOwned; i++) {
      labels.push(`${i} nh\xE2n v\u1EADt`);
    }
    const colors = {
      save_commit: {
        border: "#ff6b00",
        bg: "rgba(255, 107, 0, 0.6)"
      },
      save_commit_single: {
        border: "#2a9d8f",
        bg: "rgba(42, 157, 143, 0.6)"
      },
      yolo: {
        border: "#0077b6",
        bg: "rgba(0, 119, 182, 0.6)"
      },
      pull_60: {
        border: "#9d4edd",
        bg: "rgba(157, 78, 221, 0.6)"
      },
      roll_meta: {
        border: "#ffb800",
        bg: "rgba(255, 184, 0, 0.6)"
      }
    };
    const datasets = Object.keys(results).map((strategyId) => {
      const dist = results[strategyId].distribution;
      const data = [];
      for (let i = 0; i <= maxOwned; i++) {
        data.push(dist[i] || 0);
      }
      const strategyInfo = strategiesConfig[strategyId];
      const color = colors[strategyId] || { border: "#ccc", bg: "rgba(200, 200, 200, 0.5)" };
      return {
        label: strategyInfo ? strategyInfo.name : strategyId,
        data,
        borderColor: color.border,
        backgroundColor: color.bg,
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: color.border
      };
    });
    const ctx = canvas.getContext("2d");
    chartInstances[canvasId] = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Ph\xE2n Ph\u1ED1i T\u1EC9 L\u1EC7 S\u1EDF H\u1EEFu Nh\xE2n V\u1EADt Gi\u1EDBi H\u1EA1n",
            color: "#ffffff",
            font: {
              size: 16,
              family: "Outfit"
            }
          },
          legend: {
            position: "top",
            labels: {
              color: "#a0aebf",
              font: {
                family: "Inter"
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${context.raw.toFixed(2)}% ng\u01B0\u1EDDi ch\u01A1i`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: "#1f2937"
            },
            ticks: {
              color: "#a0aebf",
              font: {
                family: "Inter"
              }
            }
          },
          y: {
            grid: {
              color: "#1f2937"
            },
            ticks: {
              color: "#a0aebf",
              font: {
                family: "Inter"
              },
              callback: function(value) {
                return value + "%";
              }
            },
            title: {
              display: true,
              text: "Ph\u1EA7n tr\u0103m ng\u01B0\u1EDDi ch\u01A1i (%)",
              color: "#a0aebf",
              font: {
                family: "Inter"
              }
            }
          }
        }
      }
    });
  }
  function drawComparisonChart(canvasId, results, strategiesConfig) {
    destroyChartIfExists(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const labels = Object.keys(results).map((strategyId) => {
      return strategiesConfig[strategyId] ? strategiesConfig[strategyId].name : strategyId;
    });
    const ownershipData = Object.keys(results).map((strategyId) => results[strategyId].ownershipRate);
    const pullsPerFeaturedData = Object.keys(results).map((strategyId) => {
      const val = results[strategyId].avgPullsPerFeaturedChar;
      return val === Infinity || isNaN(val) ? 0 : val;
    });
    const ctx = canvas.getContext("2d");
    chartInstances[canvasId] = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "T\u1EC9 l\u1EC7 s\u1EDF h\u1EEFu Featured tr\xEAn m\u1ED7i banner (%)",
            data: ownershipData,
            backgroundColor: "rgba(255, 107, 0, 0.7)",
            borderColor: "#ff6b00",
            borderWidth: 2,
            borderRadius: 4,
            yAxisID: "y"
          },
          {
            label: "S\u1ED1 pull trung b\xECnh cho 1 Featured (Hi\u1EC7u n\u0103ng)",
            data: pullsPerFeaturedData,
            backgroundColor: "rgba(157, 78, 221, 0.7)",
            borderColor: "#9d4edd",
            borderWidth: 2,
            borderRadius: 4,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "So S\xE1nh T\u1EC9 L\u1EC7 S\u1EDF H\u1EEFu & Hi\u1EC7u N\u0103ng S\u1EED D\u1EE5ng V\xE9",
            color: "#ffffff",
            font: {
              size: 16,
              family: "Outfit"
            }
          },
          legend: {
            position: "top",
            labels: {
              color: "#a0aebf",
              font: {
                family: "Inter"
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: "#1f2937"
            },
            ticks: {
              color: "#a0aebf",
              font: {
                family: "Inter"
              }
            }
          },
          y: {
            position: "left",
            grid: {
              color: "#1f2937"
            },
            ticks: {
              color: "#a0aebf",
              callback: function(value) {
                return value + "%";
              }
            },
            title: {
              display: true,
              text: "T\u1EC9 l\u1EC7 s\u1EDF h\u1EEFu (%)",
              color: "#a0aebf"
            }
          },
          y1: {
            position: "right",
            grid: {
              drawOnChartArea: false
              // Ẩn lưới trục Y thứ 2 để tránh rối mắt
            },
            ticks: {
              color: "#a0aebf",
              callback: function(value) {
                return value + " pull";
              }
            },
            title: {
              display: true,
              text: "S\u1ED1 pull trung b\xECnh",
              color: "#a0aebf"
            }
          }
        }
      }
    });
  }

  // js/app.js
  var interactiveCharTickets = 120;
  var interactiveWeaponTickets = 0;
  var interactiveBondQuota = 0;
  var interactiveFreeLimitedTickets = 10;
  var interactiveInventory = [];
  var interactiveOwnedCharactersSet = /* @__PURE__ */ new Set();
  var interactiveCharPity = {
    pity6: 0,
    pity5: 0,
    pullsSinceFeatured: 0,
    bannerPullsCount: 0
  };
  var interactiveWeaponPity = {
    issuesCount: 0,
    issuesSince6: 0,
    issuesSinceFeatured: 0
  };
  var interactiveStats = {
    charTotal: 0,
    charUrgent: 0,
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
    weapTicketsAccumulated: 0,
    weapIssues: 0,
    weap6star: 0,
    weapSelectors: 0,
    weapTicketsUsed: 0
  };
  var STANDARD_6STAR_POOL2 = ["std_6_1", "std_6_2", "std_6_3", "std_6_4", "std_6_5", "std_6_6"];
  var LECH_LIMITED_6STAR_POOL2 = ["lim_6_1", "lim_6_2", "lim_6_3"];
  var CHAR_5STAR_POOL2 = Array.from({ length: 15 }, (_, i) => `char_5_${i + 1}`);
  var STORAGE_PREFIX = "a9e_gacha_";
  var SCHEMA_VERSION = "1.3";
  function saveInteractiveState() {
    try {
      const state = {
        version: SCHEMA_VERSION,
        charTickets: interactiveCharTickets,
        weaponTickets: interactiveWeaponTickets,
        bondQuota: interactiveBondQuota,
        freeLimited: interactiveFreeLimitedTickets,
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
      if (stateStr) {
        const state = JSON.parse(stateStr);
        if (state.version === SCHEMA_VERSION) {
          interactiveCharTickets = state.charTickets;
          interactiveWeaponTickets = state.weaponTickets;
          interactiveBondQuota = state.bondQuota || 0;
          interactiveFreeLimitedTickets = state.freeLimited !== void 0 ? state.freeLimited : 10;
          Object.assign(interactiveCharPity, state.charPity);
          Object.assign(interactiveWeaponPity, state.weaponPity);
          Object.assign(interactiveStats, state.stats);
          interactiveOwnedCharactersSet = new Set(state.ownedCharacters || []);
        } else {
          console.warn("Storage version mismatch. Resetting state.");
          localStorage.removeItem(STORAGE_PREFIX + "interactive_state");
          localStorage.removeItem(STORAGE_PREFIX + "interactive_inventory");
        }
      }
      if (invStr) {
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
        mode: document.getElementById("select-sim-mode").value,
        players: document.getElementById("input-players").value,
        banners: document.getElementById("input-banners").value,
        startTickets: document.getElementById("input-start-tickets").value,
        totalPulls: document.getElementById("input-total-pulls").value,
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
          document.getElementById("select-sim-mode").value = settings.mode;
          document.getElementById("input-players").value = settings.players;
          document.getElementById("input-banners").value = settings.banners;
          document.getElementById("input-start-tickets").value = settings.startTickets;
          document.getElementById("input-total-pulls").value = settings.totalPulls;
          document.getElementById("input-base-char").value = settings.baseChar;
          document.getElementById("input-base-weapon").value = settings.baseWeapon;
          document.getElementById("toggle-monthly").checked = settings.monthly;
          document.getElementById("toggle-bp").checked = settings.bp;
          const containerBanners = document.getElementById("container-mode-banners");
          const containerPulls = document.getElementById("container-mode-pulls");
          if (settings.mode === "banners") {
            containerBanners.style.display = "flex";
            containerPulls.style.display = "none";
          } else {
            containerBanners.style.display = "none";
            containerPulls.style.display = "flex";
          }
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
          const modeSelect = document.getElementById("select-sim-mode");
          const totalPulls = Number(document.getElementById("input-total-pulls").value);
          const tableTitle = document.getElementById("table-comparison-title");
          if (modeSelect.value === "banners") {
            const numBanners = document.getElementById("input-banners").value;
            tableTitle.innerText = `B\u1EA3ng so s\xE1nh chi ti\u1EBFt c\xE1c chi\u1EBFn thu\u1EADt (Gi\u1EA3 l\u1EADp qua ${numBanners} m\xF9a banner)`;
          } else {
            const baseChar = Number(document.getElementById("input-base-char").value);
            const isMonthly = document.getElementById("toggle-monthly").checked;
            const isBP = document.getElementById("toggle-bp").checked;
            const incomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
            const calculatedBanners = Math.max(1, Math.ceil(totalPulls / incomePerBanner));
            tableTitle.innerText = `B\u1EA3ng so s\xE1nh chi ti\u1EBFt c\xE1c chi\u1EBFn thu\u1EADt (Gi\u1EA3 l\u1EADp v\u1EDBi t\u1ED5ng s\u1ED1 ${Number(totalPulls).toLocaleString()} pulls nh\xE2n v\u1EADt ~ ${calculatedBanners} banner)`;
          }
          displaySimulatorResults(data.results, data.numBanners);
        }
      }
    } catch (e) {
      console.error("Error loading last simulation results from localStorage:", e);
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    initTabSwitcher();
    initInteractiveGacha();
    initSimulatorControls();
    loadSimulatorSettings();
    loadInteractiveState();
    loadSimulatorLastResults();
    updateInteractiveUI();
    calculateVersionIncome();
  });
  function initTabSwitcher() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(targetTab).classList.add("active");
      });
    });
  }
  function updateInteractiveUI() {
    document.getElementById("wallet-char-tickets").innerText = interactiveCharTickets;
    document.getElementById("wallet-weapon-tickets").innerText = interactiveWeaponTickets;
    document.getElementById("wallet-bond-quota").innerText = interactiveBondQuota;
    document.getElementById("wallet-free-limited").innerText = interactiveFreeLimitedTickets;
    const btnFreeLim = document.getElementById("btn-roll-free-limited");
    btnFreeLim.innerText = `Quay Free Banner (x${interactiveFreeLimitedTickets} Free)`;
    btnFreeLim.disabled = interactiveFreeLimitedTickets <= 0;
    document.getElementById("widget-pity6").innerText = interactiveCharPity.pity6;
    document.getElementById("widget-pity5").innerText = interactiveCharPity.pity5;
    document.getElementById("widget-pity-featured").innerText = `${interactiveCharPity.pullsSinceFeatured}/120`;
    document.getElementById("stat-char-total").innerText = interactiveStats.charTotal;
    document.getElementById("stat-char-urgent").innerText = interactiveStats.charUrgent;
    document.getElementById("stat-char-6star").innerText = interactiveStats.char6star;
    const limTotal = interactiveStats.char6starFeatured || 0;
    const limNew = Array.from(interactiveOwnedCharactersSet).filter((id) => id.startsWith("featured_char_banner_")).length;
    const limDupe = Math.max(0, limTotal - limNew);
    const lechLim = interactiveStats.char6starLechLimited || 0;
    document.getElementById("stat-char-6star-lim-new").innerText = limNew;
    document.getElementById("stat-char-6star-lim-dupe").innerText = limDupe;
    document.getElementById("stat-char-6star-lech-lim").innerText = lechLim;
    const char6Rate = interactiveStats.charTotal > 0 ? (interactiveStats.char6star / interactiveStats.charTotal * 100).toFixed(1) : "0.0";
    document.getElementById("stat-char-6star-rate").innerText = `${char6Rate}%`;
    document.getElementById("stat-char-5star").innerText = interactiveStats.char5star;
    const char5Rate = interactiveStats.charTotal > 0 ? (interactiveStats.char5star / interactiveStats.charTotal * 100).toFixed(1) : "0.0";
    document.getElementById("stat-char-5star-rate").innerText = `${char5Rate}%`;
    if (interactiveStats.charPullsFor6starList.length > 0) {
      const sum = interactiveStats.charPullsFor6starList.reduce((a, b) => a + b, 0);
      const avg = sum / interactiveStats.charPullsFor6starList.length;
      document.getElementById("stat-char-avg-pull").innerText = `${avg.toFixed(1)} roll`;
    } else {
      document.getElementById("stat-char-avg-pull").innerText = "--";
    }
    document.getElementById("stat-weap-tickets").innerText = interactiveStats.weapTicketsAccumulated;
    document.getElementById("stat-weap-issues").innerText = interactiveStats.weapIssues;
    document.getElementById("stat-weap-6star").innerText = interactiveStats.weap6star;
    document.getElementById("stat-weap-selectors").innerText = interactiveStats.weapSelectors;
    updateLuckRating();
    const invList = document.getElementById("inventory-list");
    if (interactiveInventory.length === 0) {
      invList.innerHTML = `<div style="color: var(--text-secondary); font-style: italic; text-align: center; margin-top: 50px;">Ch\u01B0a c\xF3 v\u1EADt ph\u1EA9m n\xE0o \u0111\u01B0\u1EE3c quay...</div>`;
      return;
    }
    invList.innerHTML = "";
    interactiveInventory.forEach((item) => {
      const div = document.createElement("div");
      div.className = `inventory-item rarity-${item.rarity}`;
      let stars = `<span class="star-display rarity-${item.rarity}">${"\u2605".repeat(item.rarity)}</span>`;
      let featuredTag = item.isFeatured ? '<span class="tag featured">Featured</span>' : "";
      let urgentTag = item.isUrgent ? '<span class="tag" style="background: #333; color: #aaa;">Urgent</span>' : "";
      let typeName = item.type === "weapon" ? "V\u0169 kh\xED" : "Operator";
      let noteText = item.note ? ` (${item.note})` : "";
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
    if (totalPulls < 20) {
      badge.innerText = "Ch\u01B0a x\xE1c \u0111\u1ECBnh";
      badge.style.color = "var(--text-secondary)";
      badge.style.borderColor = "var(--border-color)";
      badge.style.background = "rgba(255, 255, 255, 0.02)";
      desc.innerText = "Quay t\u1ED1i thi\u1EC3u 20 l\u1EA7n \u0111\u1EC3 h\u1EC7 th\u1ED1ng \u0111\xE1nh gi\xE1 nh\xE2n ph\u1EA9m.";
      return;
    }
    if (interactiveStats.charPullsFor6starList.length > 0) {
      const sum = interactiveStats.charPullsFor6starList.reduce((a, b) => a + b, 0);
      const avg = sum / interactiveStats.charPullsFor6starList.length;
      if (avg < 40) {
        badge.innerText = "Si\xEAu \u0110\u1ECF";
        badge.style.color = "#ffb800";
        badge.style.borderColor = "#ffb800";
        badge.style.background = "rgba(255, 184, 0, 0.05)";
        desc.innerText = `R\u1EA5t may m\u1EAFn! Trung b\xECnh ch\u1EC9 m\u1EA5t ${avg.toFixed(1)} rolls \u0111\u1EC3 ra 6\u2605.`;
      } else if (avg < 64) {
        badge.innerText = "Kh\xE1 \u0110\u1ECF";
        badge.style.color = "#ff6b00";
        badge.style.borderColor = "#ff6b00";
        badge.style.background = "rgba(255, 107, 0, 0.05)";
        desc.innerText = `May m\u1EAFn t\u1ED1t! T\u1EC9 l\u1EC7 ra 6\u2605 trung b\xECnh l\xE0 ${avg.toFixed(1)} rolls.`;
      } else if (avg <= 72) {
        badge.innerText = "B\xECnh Th\u01B0\u1EDDng";
        badge.style.color = "#0077b6";
        badge.style.borderColor = "#0077b6";
        badge.style.background = "rgba(0, 119, 182, 0.05)";
        desc.innerText = `Nh\xE2n ph\u1EA9m b\xECnh \u1ED5n. Trung b\xECnh m\u1EA5t ${avg.toFixed(1)} rolls \u0111\u1EC3 ra 6\u2605.`;
      } else {
        badge.innerText = "H\u01A1i \u0110en";
        badge.style.color = "#e63946";
        badge.style.borderColor = "#e63946";
        badge.style.background = "rgba(230, 57, 70, 0.05)";
        desc.innerText = `H\u01A1i \u0111en r\u1ED3i! Trung b\xECnh m\u1EA5t t\u1EDBi ${avg.toFixed(1)} rolls m\u1EDBi n\u1ED5 6\u2605.`;
      }
    } else {
      const currentPulls = interactiveCharPity.pity6;
      if (currentPulls >= 65) {
        badge.innerText = "\u0110ang B\u1ECB \u0110en";
        badge.style.color = "#e63946";
        badge.style.borderColor = "#e63946";
        badge.style.background = "rgba(230, 57, 70, 0.05)";
        desc.innerText = `\u0110\xE3 quay ${currentPulls} l\u1EA7n ch\u01B0a c\xF3 6\u2605. \u0110ang \u1EDF v\xF9ng soft pity \u0111en \u0111\u1EE7i.`;
      } else {
        badge.innerText = "B\xECnh Th\u01B0\u1EDDng";
        badge.style.color = "#0077b6";
        badge.style.borderColor = "#0077b6";
        badge.style.background = "rgba(0, 119, 182, 0.05)";
        desc.innerText = `\u0110\xE3 quay ${currentPulls} l\u1EA7n ch\u01B0a ra 6\u2605. T\u1EC9 l\u1EC7 n\u1ED5 v\u1EABn \u1EDF m\u1EE9c b\xECnh \u1ED5n.`;
      }
    }
  }
  function initInteractiveGacha() {
    const revealBoard = document.getElementById("pull-reveal-board");
    const BANNERS = [
      { id: 0, title: "M\xF9a Hoa N\u1EDF R\u1ED9 (Featured: Endfield Operator)", desc: "T\u1EC9 l\u1EC7 6\u2605: 0.8% | B\u1EA3o hi\u1EC3m: Soft pity 65+, Hard pity 80 | B\u1EA3o hi\u1EC3m Featured: 120" },
      { id: 1, title: "B\xECnh Minh K\u1EF7 Nguy\xEAn (Featured: Perlica)", desc: "T\u1EC9 l\u1EC7 6\u2605: 0.8% | B\u1EA3o hi\u1EC3m: Soft pity 65+, Hard pity 80 | B\u1EA3o hi\u1EC3m Featured: 120" },
      { id: 2, title: "Sa M\u1EA1c Hoang Vu (Featured: Chen Qianyu)", desc: "T\u1EC9 l\u1EC7 6\u2605: 0.8% | B\u1EA3o hi\u1EC3m: Soft pity 65+, Hard pity 80 | B\u1EA3o hi\u1EC3m Featured: 120" },
      { id: 3, title: "B\xF3ng \u0110\xEAm Bi\xEAn Gi\u1EDBi (Featured: Wulfgard)", desc: "T\u1EC9 l\u1EC7 6\u2605: 0.8% | B\u1EA3o hi\u1EC3m: Soft pity 65+, Hard pity 80 | B\u1EA3o hi\u1EC3m Featured: 120" }
    ];
    let activeBannerIdx = 0;
    function updateBannerDisplay() {
      const b = BANNERS[activeBannerIdx];
      const titleSpan = document.getElementById("active-banner-title").querySelector("span");
      if (titleSpan) {
        titleSpan.innerText = b.title;
      }
      document.getElementById("active-banner-subtitle").innerText = b.desc;
    }
    try {
      const savedBanner = localStorage.getItem(STORAGE_PREFIX + "active_banner_idx");
      if (savedBanner !== null) {
        activeBannerIdx = parseInt(savedBanner, 10);
        updateBannerDisplay();
      }
    } catch (e) {
      console.error(e);
    }
    document.getElementById("btn-switch-banner").addEventListener("click", () => {
      activeBannerIdx = (activeBannerIdx + 1) % BANNERS.length;
      updateBannerDisplay();
      try {
        localStorage.setItem(STORAGE_PREFIX + "active_banner_idx", activeBannerIdx);
      } catch (e) {
      }
      interactiveFreeLimitedTickets = 10;
      interactiveCharPity.bannerPullsCount = 0;
      interactiveCharPity.pullsSinceFeatured = 0;
      interactiveStats.milestone30Triggered = false;
      interactiveStats.milestone60Triggered = false;
      revealBoard.innerHTML = `<span class="no-pulls-yet">\u0110\xE3 \u0111\u1ED5i banner. V\xE9 mi\u1EC5n ph\xED (10 limited) \u0111\xE3 \u0111\u01B0\u1EE3c c\u1EA5p m\u1EDBi cho banner n\xE0y!</span>`;
      updateInteractiveUI();
      saveInteractiveState();
    });
    const renderCard = (item) => {
      const card = document.createElement("div");
      card.className = "gacha-card";
      let stars = `<span class="star-display rarity-${item.rarity}">${"\u2605".repeat(item.rarity)}</span>`;
      let typeText = item.type === "weapon" ? "Weapon" : "Operator";
      let isFeaturedText = item.isFeatured ? "Rate-Up" : "Standard";
      let featuredClass = item.isFeatured ? "featured" : "";
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
      setTimeout(() => {
        card.classList.add("flipped");
      }, 100);
    };
    const checkDuplicateAndAwardQuota = (result) => {
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
      if (interactiveOwnedCharactersSet.has(charId)) {
        const award = result.rarity === 6 ? 50 : 10;
        interactiveBondQuota += award;
        interactiveStats.totalBondQuotaEarned = (interactiveStats.totalBondQuotaEarned || 0) + award;
        if (interactiveBondQuota >= 25) {
          const exchange = Math.floor(interactiveBondQuota / 25);
          interactiveCharTickets += exchange;
          interactiveBondQuota -= exchange * 25;
        }
      } else {
        interactiveOwnedCharactersSet.add(charId);
      }
    };
    const processCharacterPullResult = (result) => {
      result.type = "character";
      checkDuplicateAndAwardQuota(result);
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
      renderCard(result);
    };
    document.getElementById("btn-roll-free-limited").addEventListener("click", () => {
      if (interactiveFreeLimitedTickets < 10) {
        alert("B\u1EA1n kh\xF4ng \u0111\u1EE7 v\xE9 Free Banner gi\u1EDBi h\u1EA1n!");
        return;
      }
      interactiveFreeLimitedTickets = 0;
      revealBoard.innerHTML = "";
      for (let i = 0; i < 10; i++) {
        const result = rollCharacter(interactiveCharPity, false);
        processCharacterPullResult(result);
      }
      checkInteractiveMilestones();
      updateInteractiveUI();
      saveInteractiveState();
    });
    document.getElementById("btn-char-pull1").addEventListener("click", () => {
      if (interactiveCharTickets < 1) {
        alert("B\u1EA1n kh\xF4ng \u0111\u1EE7 v\xE9 gacha nh\xE2n v\u1EADt! H\xE3y t\xEDch lu\u1EF9 th\xEAm ho\u1EB7c b\u1EA5m Reset.");
        return;
      }
      interactiveCharTickets--;
      revealBoard.innerHTML = "";
      const result = rollCharacter(interactiveCharPity, false);
      processCharacterPullResult(result);
      checkInteractiveMilestones();
      updateInteractiveUI();
      saveInteractiveState();
    });
    document.getElementById("btn-char-pull10").addEventListener("click", () => {
      if (interactiveCharTickets < 10) {
        alert("B\u1EA1n kh\xF4ng \u0111\u1EE7 v\xE9 gacha nh\xE2n v\u1EADt! H\xE3y t\xEDch lu\u1EF9 th\xEAm ho\u1EB7c b\u1EA5m Reset.");
        return;
      }
      interactiveCharTickets -= 10;
      revealBoard.innerHTML = "";
      for (let i = 0; i < 10; i++) {
        const result = rollCharacter(interactiveCharPity, false);
        processCharacterPullResult(result);
      }
      checkInteractiveMilestones();
      updateInteractiveUI();
      saveInteractiveState();
    });
    document.getElementById("btn-weapon-issue").addEventListener("click", () => {
      if (interactiveWeaponTickets < 1980) {
        alert("Kh\xF4ng \u0111\u1EE7 v\xE9 Arsenal Tickets! M\u1ED7i Issue (x10 v\u0169 kh\xED) y\xEAu c\u1EA7u 1980 v\xE9.");
        return;
      }
      interactiveWeaponTickets -= 1980;
      interactiveStats.weapTicketsUsed += 1980;
      revealBoard.innerHTML = "";
      const result = rollWeaponIssue(interactiveWeaponPity);
      interactiveStats.weapIssues++;
      result.items.forEach((item) => {
        item.type = "weapon";
        if (item.rarity === 6) {
          interactiveStats.weap6star++;
        } else if (item.rarity === 5) {
          interactiveStats.owned5StarWeapons = (interactiveStats.owned5StarWeapons || 0) + 1;
        }
        interactiveInventory.unshift(item);
        renderCard(item);
      });
      if (result.milestoneReward === "selector_box") {
        alert("Ch\xFAc m\u1EEBng! B\u1EA1n \u0111\u1EA1t m\u1ED1c 10 Issues v\xE0 nh\u1EADn \u0111\u01B0\u1EE3c H\u1ED9p t\u1EF1 ch\u1ECDn v\u0169 kh\xED 6\u2605!");
        interactiveStats.weapSelectors++;
        interactiveStats.weap6star++;
        interactiveInventory.unshift({ rarity: 6, isFeatured: true, type: "weapon", note: "H\u1ED9p ch\u1ECDn m\u1ED1c 10" });
      } else if (result.milestoneReward === "featured_weapon") {
        alert("Ch\xFAc m\u1EEBng! B\u1EA1n \u0111\u1EA1t c\u1ED9t m\u1ED1c qu\xE0 t\u1EB7ng v\xE0 nh\u1EADn \u0111\u01B0\u1EE3c tr\u1EF1c ti\u1EBFp V\u0169 kh\xED 6\u2605 Rate-up!");
        interactiveStats.weap6star++;
        interactiveInventory.unshift({ rarity: 6, isFeatured: true, type: "weapon", note: "Qu\xE0 m\u1ED1c t\xEDch lu\u1EF9" });
      }
      updateInteractiveUI();
      saveInteractiveState();
    });
    document.getElementById("btn-reset-interactive").addEventListener("click", () => {
      interactiveCharTickets = 120;
      interactiveWeaponTickets = 0;
      interactiveBondQuota = 0;
      interactiveFreeLimitedTickets = 10;
      interactiveInventory = [];
      interactiveOwnedCharactersSet.clear();
      interactiveCharPity.pity6 = 0;
      interactiveCharPity.pity5 = 0;
      interactiveCharPity.pullsSinceFeatured = 0;
      interactiveCharPity.bannerPullsCount = 0;
      interactiveWeaponPity.issuesCount = 0;
      interactiveWeaponPity.issuesSince6 = 0;
      interactiveWeaponPity.issuesSinceFeatured = 0;
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
      interactiveStats.weapTicketsUsed = 0;
      revealBoard.innerHTML = `<span class="no-pulls-yet">Nh\u1EA5n n\xFAt b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 th\u1EF1c hi\u1EC7n quay gacha...</span>`;
      updateInteractiveUI();
      saveInteractiveState();
    });
  }
  function checkInteractiveMilestones() {
    const revealBoard = document.getElementById("pull-reveal-board");
    if (interactiveCharPity.bannerPullsCount >= 30 && !interactiveStats.milestone30Triggered) {
      interactiveStats.milestone30Triggered = true;
      alert("C\u1ED9t m\u1ED1c 30 roll \u0111\u1EA1t \u0111\u01B0\u1EE3c! B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c 10 l\u01B0\u1EE3t quay Urgent Recruitment mi\u1EC5n ph\xED ngay b\xE2y gi\u1EDD!");
      for (let k = 0; k < 10; k++) {
        const urgentResult = rollCharacter(interactiveCharPity, true);
        urgentResult.type = "character";
        const award = urgentResult.rarity === 6 ? 50 : urgentResult.rarity === 5 ? 10 : 0;
        if (award > 0) {
          let charId = "";
          if (urgentResult.rarity === 6) {
            if (urgentResult.isFeatured) {
              charId = `featured_char_banner_urgent`;
            } else {
              charId = `std_6_urgent_${k}`;
            }
          } else {
            charId = `char_5_urgent_${k}`;
          }
          if (interactiveOwnedCharactersSet.has(charId)) {
            interactiveBondQuota += award;
            if (interactiveBondQuota >= 25) {
              const exchange = Math.floor(interactiveBondQuota / 25);
              interactiveCharTickets += exchange;
              interactiveBondQuota -= exchange * 25;
            }
          } else {
            interactiveOwnedCharactersSet.add(charId);
          }
        }
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
        const card = document.createElement("div");
        card.className = "gacha-card";
        let stars = `<span class="star-display rarity-${urgentResult.rarity}">${"\u2605".repeat(urgentResult.rarity)}</span>`;
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
        setTimeout(() => card.classList.add("flipped"), 100);
      }
    }
    if (interactiveCharPity.bannerPullsCount >= 60 && !interactiveStats.milestone60Triggered) {
      interactiveStats.milestone60Triggered = true;
      alert("C\u1ED9t m\u1ED1c 60 roll \u0111\u1EA1t \u0111\u01B0\u1EE3c! B\u1EA1n nh\u1EADn \u0111\u01B0\u1EE3c 10 v\xE9 Dossier mi\u1EC5n ph\xED c\u1ED9ng tr\u1EF1c ti\u1EBFp v\xE0o v\xED.");
      interactiveCharTickets += 10;
    }
  }
  function initSimulatorControls() {
    const inputs = [
      "input-players",
      "input-banners",
      "input-start-tickets",
      "input-total-pulls",
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
    const modeSelect = document.getElementById("select-sim-mode");
    const containerBanners = document.getElementById("container-mode-banners");
    const containerPulls = document.getElementById("container-mode-pulls");
    modeSelect.addEventListener("change", () => {
      if (modeSelect.value === "banners") {
        containerBanners.style.display = "flex";
        containerPulls.style.display = "none";
      } else {
        containerBanners.style.display = "none";
        containerPulls.style.display = "flex";
      }
      saveSimulatorSettings();
    });
    document.getElementById("toggle-monthly").addEventListener("change", () => {
      calculateVersionIncome();
      saveSimulatorSettings();
    });
    document.getElementById("toggle-bp").addEventListener("change", () => {
      calculateVersionIncome();
      saveSimulatorSettings();
    });
    calculateVersionIncome();
    document.getElementById("btn-run-simulation").addEventListener("click", () => {
      const mode = modeSelect.value;
      const numPlayers = Number(document.getElementById("input-players").value);
      const numBanners = Number(document.getElementById("input-banners").value);
      const startingCharTickets = Number(document.getElementById("input-start-tickets").value);
      const totalPulls = Number(document.getElementById("input-total-pulls").value);
      const baseChar = Number(document.getElementById("input-base-char").value);
      const baseWeapon = Number(document.getElementById("input-base-weapon").value);
      const isMonthly = document.getElementById("toggle-monthly").checked;
      const isBP = document.getElementById("toggle-bp").checked;
      const incomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
      const weaponIncomeNonGacha = baseWeapon + (isBP ? 1200 : 0);
      const runBtn = document.getElementById("btn-run-simulation");
      const originalText = runBtn.innerText;
      runBtn.innerText = "\u0110ang gi\u1EA3 l\u1EADp...";
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
          strategyIds: ["save_commit", "save_commit_single", "yolo", "pull_60", "roll_meta"]
        };
        const numBannersVal = mode === "banners" ? numBanners : Math.max(1, Math.ceil(totalPulls / incomePerBanner));
        const tableTitle = document.getElementById("table-comparison-title");
        if (mode === "banners") {
          tableTitle.innerText = `B\u1EA3ng so s\xE1nh chi ti\u1EBFt c\xE1c chi\u1EBFn thu\u1EADt (Gi\u1EA3 l\u1EADp qua ${numBanners} m\xF9a banner)`;
        } else {
          tableTitle.innerText = `B\u1EA3ng so s\xE1nh chi ti\u1EBFt c\xE1c chi\u1EBFn thu\u1EADt (Gi\u1EA3 l\u1EADp v\u1EDBi t\u1ED5ng s\u1ED1 ${Number(totalPulls).toLocaleString()} pulls nh\xE2n v\u1EADt ~ ${numBannersVal} banner)`;
        }
        try {
          const results = MonteCarloSimulator.run(config);
          displaySimulatorResults(results, numBannersVal);
          saveSimulatorLastResults(results, numBannersVal);
        } catch (err) {
          console.error(err);
          alert("C\xF3 l\u1ED7i x\u1EA3y ra trong qu\xE1 tr\xECnh ch\u1EA1y gi\u1EA3 l\u1EADp!");
        } finally {
          runBtn.innerText = originalText;
          runBtn.disabled = false;
        }
      }, 50);
    });
  }
  function calculateVersionIncome() {
    const isBP = document.getElementById("toggle-bp").checked;
    const isMonthly = document.getElementById("toggle-monthly").checked;
    const baseChar = Number(document.getElementById("input-base-char").value);
    const baseWeapon = Number(document.getElementById("input-base-weapon").value);
    const charIncomePerBanner = baseChar + (isMonthly ? 9 : 0) + (isBP ? 5 : 0);
    const weaponIncomePerBanner = baseWeapon + (isBP ? 1200 : 0);
    document.getElementById("info-version-income").innerText = `~${charIncomePerBanner.toFixed(1)} v\xE9/banner (~${(charIncomePerBanner * 2).toFixed(1)} v\xE9/b\u1EA3n)`;
    document.getElementById("info-weapon-income").innerText = `~${Number(weaponIncomePerBanner).toLocaleString()} v\xE9/banner (~${Number(weaponIncomePerBanner * 2).toLocaleString()} v\xE9/b\u1EA3n)`;
  }
  function displaySimulatorResults(results, numBanners) {
    const scRes = results.save_commit;
    if (scRes) {
      document.getElementById("card-avg-featured").innerText = scRes.avgFeaturedChars.toFixed(2);
      const eff = scRes.avgPullsPerFeaturedChar;
      document.getElementById("card-avg-efficiency").innerText = eff === Infinity ? "N/A" : `${eff.toFixed(1)} pull`;
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
      tr.innerHTML = `
            <td>
                <span class="strategy-badge badge-${strategyId}">${strategyInfo ? strategyInfo.name : strategyId}</span>
            </td>
            <td>${res.avgCharPulls.toFixed(0)} pull</td>
            <td>${res.avgUnspentChar.toFixed(1)} v\xE9</td>
            <td style="font-weight: 700; color: #ffcc00;">${total6StarChar.toFixed(2)}</td>
            <td>${(res.avgFeaturedUnique || 0).toFixed(2)} / ${(res.avgFeaturedDupes || 0).toFixed(2)}</td>
            <td>${(res.avgLechLimited || 0).toFixed(2)}</td>
            <td>${(res.avgStandard6Stars || 0).toFixed(2)}</td>
            <td>${eff === Infinity ? "N/A" : `${eff.toFixed(1)} pull/char`}</td>
            <td style="font-weight: 600; color: #ffb800;">${res.bestLuckChar} / ${res.worstLuckChar}</td>
            <td>${res.avgFeaturedWeapons.toFixed(2)}</td>
            <td style="font-weight: 700; color: #00b4d8;">${total6StarWeap.toFixed(2)}</td>
            <td>${res.avgWeaponPulls.toFixed(0)} pull</td>
            <td>${(res.avgUnspentWeapon / 198).toFixed(1)} pull</td>
            <td style="font-weight: 700; color: var(--orange-primary);">${res.ownershipRate.toFixed(1)}%</td>
        `;
      tableBody.appendChild(tr);
    });
    drawDistributionChart("chart-distribution", results, strategies);
    drawComparisonChart("chart-efficiency", results, strategies);
  }
})();
