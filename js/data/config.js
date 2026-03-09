// js/data/config.js — Game constants

const CONFIG = {
  ROSTER_MAX: 5,      // Always 5 active slots (unlocked from start)
  BENCH_MAX: 9,
  SHOP_SIZE: 5,
  REROLL_COST: 2,
  XP_COST: 4,
  XP_PER_BUY: 4,
  XP_PER_ROUND: 2,

  // XP levels only affect shop quality, not roster size
  // Cumulative XP to reach each level (index = level) — max level 9
  LEVEL_XP: [0, 0, 2, 6, 12, 20, 32, 48, 68, 92],

  // Cost to buy / gold returned on sell, indexed by tier
  TIER_COST: [0, 1, 2, 3, 4, 5],
  TIER_SELL: [0, 0, 1, 2, 3, 4],

  // Copies of each player in the shared pool, indexed by tier
  TIER_POOL_SIZE: [0, 25, 20, 15, 10, 9],

  STARTING_GOLD: 10,
  BASE_GOLD: 5,
  MAX_INTEREST: 5,

  // Bonus gold at win/lose streak counts
  WIN_STREAK_GOLD:  { 0:0, 1:0, 2:1, 3:1, 4:2, 5:3 },
  LOSE_STREAK_GOLD: { 0:0, 1:0, 2:1, 3:2, 4:3, 5:3 },

  ROUND_ROBIN_ROUNDS: 14,  // Each team plays every other team TWICE
  TOTAL_TEAMS: 8,
  BRACKET_SIZE: 4,

  // Shop tier odds by player level [T1%, T2%, T3%, T4%, T5%] — TFT-style scaling
  TIER_ODDS: {
    1: [75, 25,  0,  0,  0],  // Only Iron/Silver
    2: [50, 35, 15,  0,  0],  // Mostly Iron/Silver, some Gold
    3: [26, 38, 29, 7, 0],  // Gold focus, barely any Platinum, no Diamond
    4: [ 8, 24, 40, 24,  4],  // Gold/Platinum mix
    5: [ 2, 14, 36, 34, 14],  // Platinum focus, Diamond available
    6: [ 0,  6, 24, 42, 28],  // Platinum/Diamond
    7: [ 0,  2, 15, 40, 43],  // Diamond focus
    8: [ 0,  1,  9, 34, 56],  // Mostly Diamond
    9: [ 0,  0,  5, 25, 70],  // Almost all Diamond
  },

  // Star upgrade multipliers (applied to base stats)
  STAR_MULTIPLIER: { 1: 1.0, 2: 1.22, 3: 1.55 },
  COPIES_TO_UPGRADE: 3,

  POSITIONS: ['top', 'jungle', 'mid', 'adc', 'support'],
  DRAGON_TYPES: ['Infernal', 'Mountain', 'Ocean', 'Cloud', 'Hextech', 'Chemtech'],

  // ─── TRAIT SYSTEM ────────────────────────────────────────────
  // Each trait activates at count thresholds, granting stat bonuses (additive, not %)
  TRAITS: {
    Carry: {
      icon: '⚔️',
      color: '#e74c3c',
      thresholds: [2, 4],
      bonuses: [
        { mechanics: 8,  laning: 5 },
        { mechanics: 16, laning: 10, teamfighting: 6 },
      ],
      desc: ['(2) +8 Mech, +5 Lan', '(4) +16 Mech, +10 Lan, +6 TF'],
    },
    Shotcaller: {
      icon: '📣',
      color: '#f39c12',
      thresholds: [1, 2],
      bonuses: [
        { gameSense: 8,  communication: 5 },
        { gameSense: 18, communication: 15, teamfighting: 6 },
      ],
      desc: ['(1) +8 GS, +5 COM', '(2) +18 GS, +15 COM, +6 TF'],
    },
    Mechanical: {
      icon: '⚡',
      color: '#3498db',
      thresholds: [2, 3],
      bonuses: [
        { mechanics: 12, clutch: 6 },
        { mechanics: 20, clutch: 12, laning: 8 },
      ],
      desc: ['(2) +12 Mech, +6 CLU', '(3) +20 Mech, +12 CLU, +8 Lan'],
    },
    Veteran: {
      icon: '🎖️',
      color: '#95a5a6',
      thresholds: [2, 3],
      bonuses: [
        { consistency: 12, gameSense: 5 },
        { consistency: 22, gameSense: 12, communication: 8 },
      ],
      desc: ['(2) +12 CON, +5 GS', '(3) +22 CON, +12 GS'],
    },
    Fragger: {
      icon: '💀',
      color: '#9b59b6',
      thresholds: [2, 4],
      bonuses: [
        { clutch: 8,  mechanics: 5 },
        { clutch: 16, mechanics: 10, laning: 8 },
      ],
      desc: ['(2) +8 CLU, +5 Mech', '(4) +16 CLU, +10 Mech, +8 Lan'],
    },
    Utility: {
      icon: '🛡️',
      color: '#2ecc71',
      thresholds: [2, 3],
      bonuses: [
        { communication: 10, teamfighting: 6 },
        { communication: 20, teamfighting: 14, gameSense: 8 },
      ],
      desc: ['(2) +10 COM, +6 TF', '(3) +20 COM, +14 TF'],
    },
    Macro: {
      icon: '🗺️',
      color: '#1abc9c',
      thresholds: [2, 3],
      bonuses: [
        { gameSense: 12, consistency: 6 },
        { gameSense: 22, consistency: 12, teamfighting: 8 },
      ],
      desc: ['(2) +12 GS, +6 CON', '(3) +22 GS, +12 CON'],
    },
    Playmaker: {
      icon: '🎯',
      color: '#e67e22',
      thresholds: [2, 3],
      bonuses: [
        { clutch: 10, mechanics: 6 },
        { clutch: 20, mechanics: 14, teamfighting: 8 },
      ],
      desc: ['(2) +10 CLU, +6 Mech', '(3) +20 CLU, +14 Mech'],
    },
  },

  // ─── REGION SYNERGIES ─────────────────────────────────────────
  // Active when 2+ players from same region on active roster
  REGION_SYNERGY: {
    2: { bonusPct: 6,  desc: '+6% all stats' },
    3: { bonusPct: 12, desc: '+12% all stats' },
    4: { bonusPct: 18, desc: '+18% all stats' },
    5: { bonusPct: 20, desc: '+20% all stats' },
  },
  REGION_COLORS: {
    Korea: '#4fc3f7', China: '#ff7043', EU: '#ab47bc',
    NA: '#26a69a', SEA: '#d4e157', LATAM: '#ffa726',
  },

  // ─── AI STRATEGIES ────────────────────────────────────────────
  AI_STRATEGIES: ['economy', 'synergy', 'aggressor', 'reroller', 'leveler'],
};
