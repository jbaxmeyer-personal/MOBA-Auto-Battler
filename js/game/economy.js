// js/game/economy.js — Gold, XP, leveling, trait/region synergies

// ─── Gold ─────────────────────────────────────────────────────────────────────

function calcGoldIncome(state) {
  const base        = CONFIG.BASE_GOLD;
  const interest    = Math.min(Math.floor(state.gold / 10), CONFIG.MAX_INTEREST);
  const winStreak   = Math.min(state.winStreak,  5);
  const loseStreak  = Math.min(state.loseStreak, 5);
  const streakBonus = state.winStreak >= 2
    ? (CONFIG.WIN_STREAK_GOLD[winStreak]   || 0)
    : (CONFIG.LOSE_STREAK_GOLD[loseStreak] || 0);

  return { base, interest, streakBonus, total: base + interest + streakBonus };
}

function applyGoldIncome(state) {
  const income = calcGoldIncome(state);
  state.gold += income.total;
  return income;
}

// ─── XP / Level ──────────────────────────────────────────────────────────────

function addXP(state, amount) {
  const maxLevel = CONFIG.LEVEL_XP.length - 1;
  if (state.level >= maxLevel) return;
  state.xp += amount;
  while (state.level < maxLevel && state.xp >= CONFIG.LEVEL_XP[state.level + 1]) {
    state.level++;
  }
}

function buyXP(state) {
  const maxLevel = CONFIG.LEVEL_XP.length - 1;
  if (state.gold < CONFIG.XP_COST || state.level >= maxLevel) return false;
  state.gold -= CONFIG.XP_COST;
  addXP(state, CONFIG.XP_PER_BUY);
  return true;
}

// ─── Buying / Selling ─────────────────────────────────────────────────────────

// All 5 active slots are always available (roster size is always 5)
function canBuyPlayer(state, player) {
  if (state.gold < CONFIG.TIER_COST[player.tier]) return false;
  const totalOwned = state.roster.filter(Boolean).length + state.bench.length;
  return totalOwned < CONFIG.ROSTER_MAX + CONFIG.BENCH_MAX;
}

function buyPlayer(state, player) {
  if (!canBuyPlayer(state, player)) return false;
  state.gold -= CONFIG.TIER_COST[player.tier];
  const instance = createPlayerInstance(player);

  // Auto-place: fill empty active slot matching position first
  const matchingSlot = state.roster.findIndex(p => !p && CONFIG.POSITIONS.indexOf(instance.position) !== -1);
  const emptySlot    = state.roster.findIndex(p => !p);

  // Prefer same-position empty slot, then any empty slot, then bench
  const targetRosterIdx = emptySlot; // just use first empty
  if (targetRosterIdx !== -1) {
    state.roster[targetRosterIdx] = instance;
  } else {
    state.bench.push(instance);
  }

  checkStarUpgrades(state);
  return true;
}

function sellPlayer(state, instanceId, returnToPool = true) {
  let player = null;

  const ri = state.roster.findIndex(p => p && p.instanceId === instanceId);
  if (ri !== -1) {
    player = state.roster[ri];
    // Selling from active roster: need bench replacement of same position
    const benchIdx = state.bench.findIndex(p => p && p.position === player.position);
    if (benchIdx === -1) return 'need_bench'; // caller shows toast
    // Auto-promote bench player into the starter slot
    state.roster[ri] = state.bench[benchIdx];
    state.bench.splice(benchIdx, 1);
  } else {
    const bi = state.bench.findIndex(p => p && p.instanceId === instanceId);
    if (bi !== -1) {
      player = state.bench[bi];
      state.bench.splice(bi, 1);
    }
  }
  if (!player) return false;

  // Stars multiply sell value: 2★ = 3× base, 3★ = 9× base (cost of all copies)
  const baseSell = CONFIG.TIER_SELL[player.tier] || 0;
  const starMult = player.stars === 3 ? 9 : player.stars === 2 ? 3 : 1;
  state.gold += baseSell * starMult;
  if (returnToPool && state.playerPool && player.tier > 0) {
    const template = getPlayerTemplate(player.id);
    if (template) state.playerPool.push({ ...template, stats: { ...template.stats }, champions: [...template.champions], traits: [...(template.traits||[])] });
  }
  return true;
}

// ─── Star Upgrades ────────────────────────────────────────────────────────────

function checkStarUpgrades(state) {
  const allPlayers = [...state.roster.filter(Boolean), ...state.bench];
  const byId = {};

  allPlayers.forEach(p => {
    if (!byId[p.id]) byId[p.id] = { s1: [], s2: [] };
    if (p.stars === 1) byId[p.id].s1.push(p.instanceId);
    if (p.stars === 2) byId[p.id].s2.push(p.instanceId);
  });

  let upgraded = false;

  for (const [id, counts] of Object.entries(byId)) {
    // Upgrade 3× 1-star → 1× 2-star
    if (counts.s1.length >= 3) {
      let removed = 0;
      let targetRosterIdx = -1; // first roster slot freed — 2★ goes back here
      for (let i = 0; i < state.roster.length && removed < 3; i++) {
        if (state.roster[i] && state.roster[i].id === id && state.roster[i].stars === 1) {
          if (targetRosterIdx === -1) targetRosterIdx = i;
          state.roster[i] = null; removed++;
        }
      }
      for (let i = state.bench.length - 1; i >= 0 && removed < 3; i--) {
        if (state.bench[i] && state.bench[i].id === id && state.bench[i].stars === 1) {
          state.bench.splice(i, 1); removed++;
        }
      }
      const template = getPlayerTemplate(id);
      if (!template) continue;
      const up = createPlayerInstance(template);
      up.stars = 2;
      // Place back in the roster slot if one was freed, otherwise bench
      if (targetRosterIdx !== -1) {
        state.roster[targetRosterIdx] = up;
      } else {
        state.bench.push(up);
      }
      upgraded = true;
    }

    // Upgrade 3× 2-star → 1× 3-star
    if (counts.s2.length >= 3) {
      let removed = 0;
      let targetRosterIdx = -1;
      for (let i = 0; i < state.roster.length && removed < 3; i++) {
        if (state.roster[i] && state.roster[i].id === id && state.roster[i].stars === 2) {
          if (targetRosterIdx === -1) targetRosterIdx = i;
          state.roster[i] = null; removed++;
        }
      }
      for (let i = state.bench.length - 1; i >= 0 && removed < 3; i--) {
        if (state.bench[i] && state.bench[i].id === id && state.bench[i].stars === 2) {
          state.bench.splice(i, 1); removed++;
        }
      }
      const template = getPlayerTemplate(id);
      if (!template) continue;
      const up = createPlayerInstance(template);
      up.stars = 3;
      if (targetRosterIdx !== -1) {
        state.roster[targetRosterIdx] = up;
      } else {
        state.bench.push(up);
      }
      upgraded = true;
    }
  }

  if (upgraded) checkStarUpgrades(state);
}

// ─── Trait / Region Synergy Calculation ──────────────────────────────────────

function calcTraitSynergies(roster) {
  const counts = {};
  roster.filter(Boolean).forEach(p => {
    (p.traits || []).forEach(t => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });

  const bonuses  = {};
  const active   = []; // { trait, count, tier, bonus, nextAt }

  for (const [trait, count] of Object.entries(counts)) {
    const def = CONFIG.TRAITS[trait];
    if (!def) continue;

    let activeTier = -1;
    for (let i = def.thresholds.length - 1; i >= 0; i--) {
      if (count >= def.thresholds[i]) { activeTier = i; break; }
    }

    const nextAt = def.thresholds.find(t => t > count) || null;

    active.push({
      trait, count, activeTier, nextAt,
      bonus: activeTier >= 0 ? def.bonuses[activeTier] : null,
      def,
    });

    if (activeTier >= 0) {
      for (const [stat, val] of Object.entries(def.bonuses[activeTier])) {
        bonuses[stat] = (bonuses[stat] || 0) + val;
      }
    }
  }

  // Sort: active first, then by count desc
  active.sort((a, b) => {
    if (a.activeTier !== b.activeTier) return b.activeTier - a.activeTier;
    return b.count - a.count;
  });

  return { bonuses, active, counts };
}

function calcRegionSynergy(roster) {
  const counts = {};
  roster.filter(Boolean).forEach(p => {
    if (p.region && p.region !== 'null') {
      counts[p.region] = (counts[p.region] || 0) + 1;
    }
  });

  // Find max region and collect ALL active region bonuses (2+ from same region)
  let maxCount = 0;
  let maxRegion = null;
  const activeRegions = {};

  for (const [r, c] of Object.entries(counts)) {
    if (c > maxCount) { maxCount = c; maxRegion = r; }
    if (c >= 2) {
      const syn = CONFIG.REGION_SYNERGY[Math.min(c, 5)];
      if (syn) activeRegions[r] = { count: c, bonusPct: syn.bonusPct, desc: syn.desc };
    }
  }

  const maxSyn = maxCount >= 2 ? CONFIG.REGION_SYNERGY[Math.min(maxCount, 5)] : null;

  return {
    counts,
    maxRegion,
    maxCount,
    activeRegions,
    bonusPct: maxSyn ? maxSyn.bonusPct : 0,
    desc: maxSyn ? maxSyn.desc : null,
  };
}

// Apply per-player synergy bonuses:
//   - Trait bonus: only applies to players who have that trait (and it's active)
//   - Region bonus: only applies to players from an active region
function applyBonuses(baseStats, traitSynergies, regionSynergy, player) {
  if (!player) {
    const s = {};
    for (const [k, v] of Object.entries(baseStats)) s[k] = Math.round(v);
    return s;
  }

  // Only traits THIS player has, if that trait is active
  const playerTraitBonus = {};
  (player.traits || []).forEach(trait => {
    const syn = (traitSynergies.active || []).find(s => s.trait === trait && s.activeTier >= 0);
    if (syn && syn.bonus) {
      for (const [k, v] of Object.entries(syn.bonus)) {
        playerTraitBonus[k] = (playerTraitBonus[k] || 0) + v;
      }
    }
  });

  // Only apply region bonus if this player is from an active region
  const regionData = player.region && regionSynergy.activeRegions
    ? regionSynergy.activeRegions[player.region] : null;
  const regionMult = 1 + (regionData ? regionData.bonusPct : 0) / 100;

  const s = {};
  for (const [k, v] of Object.entries(baseStats)) {
    s[k] = Math.round((v + (playerTraitBonus[k] || 0)) * regionMult);
  }
  return s;
}

// Move a player from bench to roster (swap with same-position or first empty)
function moveToRoster(state, instanceId) {
  const bi = state.bench.findIndex(p => p && p.instanceId === instanceId);
  if (bi === -1) return false;
  const player = state.bench[bi];

  // Try same-position swap first
  const samePos = state.roster.findIndex(p => p && p.position === player.position);
  if (samePos !== -1) {
    const existing = state.roster[samePos];
    state.roster[samePos] = player;
    state.bench[bi] = existing;
    return true;
  }

  // Try any empty slot
  const empty = state.roster.findIndex(p => !p);
  if (empty !== -1) {
    state.roster[empty] = player;
    state.bench.splice(bi, 1);
    return true;
  }

  return false; // Roster full (5 different positions)
}

// Move a player from roster to bench (requires same-position bench player to swap with)
function moveToBench(state, instanceId) {
  const ri = state.roster.findIndex(p => p && p.instanceId === instanceId);
  if (ri === -1) return false;
  const player = state.roster[ri];
  // Need a same-position bench player to swap with (roster must stay full)
  const benchIdx = state.bench.findIndex(p => p && p.position === player.position);
  if (benchIdx === -1) return 'need_swap';
  // Swap: bench player becomes starter, starter goes to bench
  state.roster[ri] = state.bench[benchIdx];
  state.bench[benchIdx] = player;
  return true;
}

// Swap two roster slots
function swapRosterSlots(state, indexA, indexB) {
  const tmp = state.roster[indexA];
  state.roster[indexA] = state.roster[indexB];
  state.roster[indexB] = tmp;
}
