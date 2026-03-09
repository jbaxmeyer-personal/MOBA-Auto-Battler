// js/game/shop.js — Shop logic and AI team simulation

// ─── Player Pool ──────────────────────────────────────────────────────────────

function initPool(state) {
  state.playerPool = buildPlayerPool();
  shuffleArray(state.playerPool);
}

// ─── Shop Draw / Reroll ───────────────────────────────────────────────────────

function drawShop(state) {
  if (state.shopLocked) return;

  // Return un-bought shop players to pool
  state.shopSlots.forEach(slot => {
    if (slot) state.playerPool.push({ ...slot, stats: { ...slot.stats }, champions: [...slot.champions], traits: [...(slot.traits||[])] });
  });
  state.shopSlots = [];

  for (let i = 0; i < CONFIG.SHOP_SIZE; i++) {
    state.shopSlots.push(drawFromPool(state));
  }
}

function drawFromPool(state) {
  if (!state.playerPool.length) return null;

  const odds       = CONFIG.TIER_ODDS[state.level] || CONFIG.TIER_ODDS[1];
  const roll       = Math.random() * 100;
  let   cumulative = 0;
  let   targetTier = 2; // default minimum

  for (let t = 1; t <= 5; t++) {
    cumulative += odds[t - 1];
    if (roll < cumulative) { targetTier = t; break; }
  }

  // Find a player of target tier; fallback to nearest available tier
  let idx = state.playerPool.findIndex(p => p.tier === targetTier);

  if (idx === -1) {
    // Try adjacent tiers: lower first, then higher
    for (let delta = 1; delta <= 4; delta++) {
      const lo = targetTier - delta;
      const hi = targetTier + delta;
      if (lo >= 1) idx = state.playerPool.findIndex(p => p.tier === lo);
      if (idx === -1 && hi <= 5) idx = state.playerPool.findIndex(p => p.tier === hi);
      if (idx !== -1) break;
    }
  }

  if (idx === -1) idx = 0; // last resort
  const [player] = state.playerPool.splice(idx, 1);
  return player;
}

function rerollShop(state) {
  if (state.gold < CONFIG.REROLL_COST) return false;
  state.gold -= CONFIG.REROLL_COST;
  state.shopLocked = false;
  drawShop(state);
  return true;
}

function toggleLockShop(state) {
  state.shopLocked = !state.shopLocked;
  return state.shopLocked;
}

function buyShopPlayer(state, shopIndex) {
  const player = state.shopSlots[shopIndex];
  if (!player) return false;
  if (!buyPlayer(state, player)) return false;
  state.shopSlots[shopIndex] = null;
  return true;
}

// ─── AI Team Simulation ───────────────────────────────────────────────────────

const AI_TEAM_CONFIGS = [
  { name: 'Team Nexus',      strategy: 'economy',    startStrength: 0.5 },
  { name: 'Dragon Guard',    strategy: 'synergy',    startStrength: 0.55 },
  { name: 'Iron Vanguard',   strategy: 'aggressor',  startStrength: 0.6 },
  { name: 'Shadow Protocol', strategy: 'reroller',   startStrength: 0.45 },
  { name: 'Phoenix Rising',  strategy: 'leveler',    startStrength: 0.5 },
  { name: 'Storm Raiders',   strategy: 'aggressor',  startStrength: 0.55 },
  { name: 'Void Walkers',    strategy: 'synergy',    startStrength: 0.45 },
];

function initAITeam(cfg) {
  // Each AI has its own private pool (independent from human pool)
  const privatePool = buildPlayerPool();
  shuffleArray(privatePool);

  // Pick target trait for synergy strategy
  const traitKeys   = Object.keys(CONFIG.TRAITS);
  const targetTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];

  const starterRoster = [null, null, null, null, null];
  // Give AI the starter pack (one T0 per position)
  getStarterPack().forEach(p => {
    const posIdx = CONFIG.POSITIONS.indexOf(p.position);
    if (posIdx !== -1) starterRoster[posIdx] = p;
  });

  // AI spends starting gold to replace T0 rookies with T1 players from their pool
  let spendGold = CONFIG.STARTING_GOLD;
  shuffleArray(privatePool);
  for (let i = privatePool.length - 1; i >= 0 && spendGold > 0; i--) {
    const p = privatePool[i];
    if (p.tier !== 1) continue;
    const posIdx = CONFIG.POSITIONS.indexOf(p.position);
    if (posIdx === -1) continue;
    const cost = CONFIG.TIER_COST[p.tier];
    if (spendGold < cost) continue;
    if (starterRoster[posIdx] && starterRoster[posIdx].tier === 0) {
      starterRoster[posIdx] = createPlayerInstance(p);
      privatePool.splice(i, 1);
      spendGold -= cost;
    }
  }

  return {
    id:          cfg.name.replace(/\s+/g, '_').toLowerCase(),
    name:        cfg.name,
    strategy:    cfg.strategy,
    targetTrait,
    gold:        spendGold,
    xp:          0,
    level:       1,
    roster:      starterRoster,
    bench:       [],
    privatePool,
    wins:        0,
    losses:      0,
    kills:       0,
    deaths:      0,
    isHuman:     false,
  };
}

// Simulate one round of shopping for an AI team
function simulateAIShopRound(aiTeam, round) {
  // ─ Income ─
  const base      = CONFIG.BASE_GOLD;
  const interest  = Math.min(Math.floor(aiTeam.gold / 10), CONFIG.MAX_INTEREST);
  const winBonus  = aiTeam.winStreak  >= 2 ? (CONFIG.WIN_STREAK_GOLD[Math.min(aiTeam.winStreak,5)]  || 0) : 0;
  const loseBonus = aiTeam.loseStreak >= 2 ? (CONFIG.LOSE_STREAK_GOLD[Math.min(aiTeam.loseStreak,5)]|| 0) : 0;
  aiTeam.gold += base + interest + winBonus + loseBonus;

  // ─ Auto XP ─
  if (!aiTeam.xp) aiTeam.xp = 0;
  aiTeam.xp += CONFIG.XP_PER_ROUND;
  const maxLevel = CONFIG.LEVEL_XP.length - 1;
  // Level up from XP
  while (aiTeam.level < maxLevel && aiTeam.xp >= CONFIG.LEVEL_XP[aiTeam.level + 1]) {
    aiTeam.level++;
  }

  const strategy = aiTeam.strategy;

  // ─ Level-up decisions ─
  if (strategy === 'leveler' && aiTeam.level < maxLevel && aiTeam.gold >= CONFIG.XP_COST + 3) {
    aiTeam.gold -= CONFIG.XP_COST;
    aiTeam.xp   += CONFIG.XP_PER_BUY;
    while (aiTeam.level < maxLevel && aiTeam.xp >= CONFIG.LEVEL_XP[aiTeam.level + 1]) aiTeam.level++;
  }
  if (strategy === 'aggressor' && aiTeam.level < maxLevel && aiTeam.gold >= CONFIG.XP_COST + 5 && round % 2 === 0) {
    aiTeam.gold -= CONFIG.XP_COST;
    aiTeam.xp   += CONFIG.XP_PER_BUY;
    while (aiTeam.level < maxLevel && aiTeam.xp >= CONFIG.LEVEL_XP[aiTeam.level + 1]) aiTeam.level++;
  }

  // ─ Draw virtual shop ─
  const shopPool = { playerPool: [...aiTeam.privatePool], level: aiTeam.level, shopSlots: [], shopLocked: false, gold: aiTeam.gold };
  for (let i = 0; i < CONFIG.SHOP_SIZE; i++) shopPool.shopSlots.push(drawFromPool(shopPool));
  // Remove drawn cards from AI private pool
  aiTeam.privatePool = shopPool.playerPool;

  // ─ Reroll decision ─
  let rerolls = 0;
  const maxRerolls = strategy === 'reroller' ? 4 : strategy === 'synergy' ? 2 : 1;

  while (rerolls < maxRerolls && aiTeam.gold >= CONFIG.REROLL_COST) {
    const wantReroll = shouldAIReroll(aiTeam, shopPool.shopSlots, strategy);
    if (!wantReroll) break;
    // Return shop to pool, redraw
    shopPool.shopSlots.forEach(p => { if (p) aiTeam.privatePool.push({...p}); });
    shopPool.shopSlots = [];
    shopPool.playerPool = aiTeam.privatePool;
    for (let i = 0; i < CONFIG.SHOP_SIZE; i++) shopPool.shopSlots.push(drawFromPool(shopPool));
    aiTeam.privatePool = shopPool.playerPool;
    aiTeam.gold -= CONFIG.REROLL_COST;
    rerolls++;
  }

  // ─ Buy players ─
  const toBuy = shopPool.shopSlots.filter(Boolean).filter(p => aiShouldBuy(aiTeam, p, strategy));

  toBuy.forEach(p => {
    const cost = CONFIG.TIER_COST[p.tier];
    const owned = aiTeam.roster.filter(Boolean).length + aiTeam.bench.length;

    // Economy: maintain interest breakpoints
    if (strategy === 'economy') {
      const newGold = aiTeam.gold - cost;
      const lostInterest = Math.floor(aiTeam.gold / 10) - Math.floor(newGold / 10);
      if (lostInterest > 0 && newGold > 20) return; // skip if it costs interest
    }

    if (aiTeam.gold < cost) return;
    if (owned >= CONFIG.ROSTER_MAX + CONFIG.BENCH_MAX) return;

    aiTeam.gold -= cost;
    const instance = createPlayerInstance(p);
    const emptyIdx = aiTeam.roster.findIndex(r => !r);
    if (emptyIdx !== -1) aiTeam.roster[emptyIdx] = instance;
    else aiTeam.bench.push(instance);
  });

  // ─ Star upgrades ─
  checkStarUpgrades(aiTeam);

  // ─ Manage bench: sell weakest if over limit ─
  while (aiTeam.bench.length > CONFIG.BENCH_MAX) {
    let weakestIdx = 0;
    for (let i = 1; i < aiTeam.bench.length; i++) {
      if (statTotal(aiTeam.bench[i]) < statTotal(aiTeam.bench[weakestIdx])) weakestIdx = i;
    }
    const w = aiTeam.bench[weakestIdx];
    aiTeam.gold += CONFIG.TIER_SELL[w.tier];
    aiTeam.bench.splice(weakestIdx, 1);
  }

  // ─ Optimize lineup: best player at each position ─
  optimizeAILineup(aiTeam);
}

function shouldAIReroll(aiTeam, shopSlots, strategy) {
  if (strategy === 'reroller') return true;
  if (strategy === 'synergy') {
    return !shopSlots.some(p => p && (p.traits||[]).includes(aiTeam.targetTrait));
  }
  return false;
}

function aiShouldBuy(aiTeam, player, strategy) {
  if (!player) return false;
  const tier = player.tier;

  if (strategy === 'aggressor') return tier >= aiTeam.level; // buy if tier >= level
  if (strategy === 'synergy')   return (player.traits||[]).includes(aiTeam.targetTrait);
  if (strategy === 'reroller')  return tier <= 3; // only buy cheap players to 3-star
  if (strategy === 'leveler')   return tier >= Math.max(2, aiTeam.level - 1);
  if (strategy === 'economy')   return tier <= 3 || aiTeam.gold > 30;

  return tier >= 2;
}

function optimizeAILineup(aiTeam) {
  const all = [...aiTeam.roster.filter(Boolean), ...aiTeam.bench];
  const byPos = {};
  CONFIG.POSITIONS.forEach(pos => {
    byPos[pos] = all.filter(p => p.position === pos).sort((a, b) => {
      const aS = getEffectiveStats(a);
      const bS = getEffectiveStats(b);
      return Object.values(bS).reduce((x,y)=>x+y,0) - Object.values(aS).reduce((x,y)=>x+y,0);
    });
  });

  aiTeam.roster = CONFIG.POSITIONS.map((pos, i) => byPos[pos].shift() || aiTeam.roster[i] || null);
  aiTeam.bench  = Object.values(byPos).flat();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
