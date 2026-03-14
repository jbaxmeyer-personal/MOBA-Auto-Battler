// js/game/simulation.js — Grove Manager Phase 4D
// Full stat-driven sim engine for The Ancient Grove.
//
// Public API (unchanged):
//   draftChampions(blueTeamArr, redTeamArr) → draft result
//   simulateMatch(blueTeamArr, redTeamArr, blueName, redName) → full PBP result
//   quickSimulate(blueTeamArr, redTeamArr) → 'blue' | 'red'

'use strict';

// ─── SECTION 1: Utilities ─────────────────────────────────────────────────────

function rand(min, max)  { return Math.random() * (max - min) + min; }
function rInt(min, max)  { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function pick(arr)       { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a)      { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b; }
function fmt(min)        { const m=Math.floor(min),s=Math.floor((min-m)*60); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function chance(pct)     { return Math.random() * 100 < pct; }

// ─── SECTION 2: Map Positions (300×300 SVG) ───────────────────────────────────
// Blue base = bottom-left, Red base = top-right.

const LANE_POSITIONS = {
  blue: { vanguard:{x:28,y:165}, ranger:{x:82,y:170}, arcanist:{x:92,y:208}, hunter:{x:72,y:268}, warden:{x:90,y:274} },
  red:  { vanguard:{x:272,y:45}, ranger:{x:218,y:132}, arcanist:{x:208,y:92}, hunter:{x:228,y:268}, warden:{x:210,y:274} },
};

const SCENES = {
  laning:      LANE_POSITIONS,
  northShrine: {
    blue: { vanguard:{x:55,y:100}, ranger:{x:70,y:115}, arcanist:{x:80,y:140}, hunter:{x:40,y:170}, warden:{x:55,y:175} },
    red:  { vanguard:{x:100,y:75}, ranger:{x:120,y:90}, arcanist:{x:110,y:80}, hunter:{x:85,y:55},  warden:{x:95,y:60}  },
  },
  southShrine: {
    blue: { vanguard:{x:185,y:210}, ranger:{x:175,y:195}, arcanist:{x:170,y:200}, hunter:{x:200,y:235}, warden:{x:190,y:240} },
    red:  { vanguard:{x:225,y:185}, ranger:{x:238,y:172}, arcanist:{x:245,y:168}, hunter:{x:230,y:215}, warden:{x:220,y:220} },
  },
  center: {
    blue: { vanguard:{x:118,y:158}, ranger:{x:133,y:145}, arcanist:{x:145,y:162}, hunter:{x:110,y:172}, warden:{x:122,y:178} },
    red:  { vanguard:{x:178,y:138}, ranger:{x:165,y:152}, arcanist:{x:155,y:138}, hunter:{x:185,y:155}, warden:{x:172,y:165} },
  },
  bluePush: {
    blue: { vanguard:{x:215,y:75}, ranger:{x:198,y:90}, arcanist:{x:225,y:62}, hunter:{x:238,y:58}, warden:{x:205,y:72} },
    red:  { vanguard:{x:252,y:52}, ranger:{x:262,y:42}, arcanist:{x:258,y:32}, hunter:{x:272,y:38}, warden:{x:268,y:28} },
  },
  redPush: {
    blue: { vanguard:{x:48,y:252}, ranger:{x:38,y:262}, arcanist:{x:44,y:272}, hunter:{x:28,y:258}, warden:{x:32,y:248} },
    red:  { vanguard:{x:78,y:228}, ranger:{x:93,y:218}, arcanist:{x:102,y:208}, hunter:{x:112,y:238}, warden:{x:72,y:235} },
  },
};

function scene(name, jitter) {
  jitter = jitter === undefined ? 8 : jitter;
  var s = SCENES[name] || SCENES.center;
  var j = function() { return rInt(-jitter, jitter); };
  var jt = function(side) {
    var out = {};
    Object.entries(s[side]).forEach(function(entry) {
      var pos = entry[0], p = entry[1];
      out[pos] = { x: clamp(p.x + j(), 5, 295), y: clamp(p.y + j(), 5, 295), alive: true };
    });
    return out;
  };
  return { blue: jt('blue'), red: jt('red') };
}

// ─── SECTION 3: Role Weights & Power Calculation ──────────────────────────────
//
// Each player's general power is a weighted average of their 12 FM stats,
// with weights tuned to their role's responsibilities.
// Scale: 1–20 (matches the FM attribute scale).

const ROLE_WEIGHTS = {
  vanguard: {
    mechanics:             3,   // execution in fights
    teamfightPositioning:  4,   // staying alive + absorbing hits
    composure:             3,   // not cracking under pressure
    leadership:            3,   // rally effect on teammates
    objectiveExecution:    2,   // warden / root timing
    gameSense:             2,   // reading the map
    communication:         3,   // shot-calling engage
  },
  ranger: {
    mechanics:             3,   // gank execution
    mapMovement:           4,   // pathing and vision
    gameSense:             4,   // reading when to contest
    objectiveExecution:    3,   // warden call timing
    decisionMaking:        2,   // dive vs peel choices
    csAccuracy:            2,   // jungle clear efficiency
    adaptability:          2,   // responding to enemy jungle
  },
  arcanist: {
    mechanics:             4,   // landing skill shots
    decisionMaking:        4,   // ult timing, rotation choices
    gameSense:             3,   // roaming reads
    adaptability:          3,   // adjusting to lane opponent
    csAccuracy:            2,   // wave management
    composure:             2,   // not overcommitting
    championPoolDepth:     2,   // flexibility vs counters
  },
  hunter: {
    mechanics:             4,   // precision aim, kiting
    csAccuracy:            4,   // farming under pressure
    teamfightPositioning:  3,   // staying safe during fights
    composure:             3,   // not tilting when behind
    decisionMaking:        2,   // when to attack boss vs enemies
    adaptability:          2,   // repositioning in chaos
  },
  warden: {
    communication:         4,   // shot-calling, peel timing
    teamfightPositioning:  3,   // staying in range of carry
    leadership:            3,   // team morale effect
    composure:             3,   // calm under boss fight pressure
    objectiveExecution:    3,   // Poison Breath cleanse timing
    gameSense:             2,   // vision control, rotations
    adaptability:          2,   // adjusting to enemy engage
  },
};

// Contest-specific weights — what matters most for each type of in-game event.
const CONTEST_WEIGHTS = {
  skirmish: {
    mechanics:       4,
    mapMovement:     3,
    gameSense:       3,
    decisionMaking:  3,
    composure:       2,
  },
  shrine: {
    communication:        3,
    gameSense:            3,
    objectiveExecution:   3,
    mapMovement:          2,
    decisionMaking:       2,
    teamfightPositioning: 2,
  },
  warden_timing: {
    objectiveExecution:   4,
    gameSense:            4,
    communication:        3,
    decisionMaking:       3,
    mapMovement:          2,
  },
  warden_fight: {
    mechanics:             4,
    teamfightPositioning:  4,
    composure:             3,
    objectiveExecution:    3,
    adaptability:          2,
  },
  teamfight: {
    mechanics:             4,
    teamfightPositioning:  4,
    composure:             3,
    decisionMaking:        2,
    leadership:            1,
    adaptability:          2,
  },
  root_siege: {
    mechanics:             3,
    objectiveExecution:    3,
    decisionMaking:        2,
    csAccuracy:            2,
    gameSense:             2,
  },
  boss_tank: {
    teamfightPositioning:  4,
    composure:             4,
    mechanics:             3,
    leadership:            2,
    adaptability:          2,
  },
  boss_cleanse: {
    communication:         4,
    objectiveExecution:    4,
    gameSense:             3,
    composure:             3,
    decisionMaking:        2,
  },
  boss_dps: {
    mechanics:             4,
    csAccuracy:            3,
    composure:             3,
    adaptability:          3,
    teamfightPositioning:  2,
  },
};

// Morale modifier: morale 1–10, neutral at 7. Range: -1.5 to +0.75 power points.
// Low morale makes players underperform; high morale gives a small edge.
function moraleMod(player) {
  if (!player || player.morale === undefined) return 0;
  return (player.morale - 7) * 0.25;
}

function calcContestPower(player, contestType) {
  if (!player || !player.stats) return 10;
  var weights = CONTEST_WEIGHTS[contestType];
  if (!weights) return calcRolePower(player);
  var stats = player.stats;
  var total = 0, totalWeight = 0;
  Object.entries(weights).forEach(function(entry) {
    var stat = entry[0], w = entry[1];
    total += (stats[stat] || 10) * w;
    totalWeight += w;
  });
  return total / totalWeight + moraleMod(player);
}

function calcRolePower(player) {
  if (!player || !player.stats) return 10;
  var weights = ROLE_WEIGHTS[player.position] || ROLE_WEIGHTS.arcanist;
  var stats = player.stats;
  var total = 0, totalWeight = 0;
  Object.entries(weights).forEach(function(entry) {
    var stat = entry[0], w = entry[1];
    total += (stats[stat] || 10) * w;
    totalWeight += w;
  });
  return total / totalWeight + moraleMod(player);
}

function teamContestPower(team, contestType, bonus) {
  bonus = bonus || 0;
  return team.reduce(function(sum, pl) {
    return sum + calcContestPower(pl, contestType);
  }, 0) + bonus;
}

function resolveContest(bluePow, redPow, scaleFactor) {
  scaleFactor = scaleFactor || 1.8;
  var diff = (bluePow - redPow) * scaleFactor;
  var blueWinPct = clamp(50 + diff, 10, 90);
  return {
    blueWins:    chance(blueWinPct),
    blueWinPct:  blueWinPct,
    margin:      Math.abs(bluePow - redPow),
  };
}

// ─── SECTION 4: Playstyle Modifiers ───────────────────────────────────────────

var PLAYSTYLE_MODS = {
  engage: {
    bonus:   { warden_timing: 3, warden_fight: 3, teamfight: 2 },
    penalty: { root_siege: 1, boss_dps: 1 },
    desc: 'Aggressive early Warden contests and team fight initiation.',
  },
  poke: {
    bonus:   { root_siege: 3, shrine: 2, boss_dps: 1 },
    penalty: { warden_fight: 1, teamfight: 1 },
    desc: 'Systematic Root pressure and safe shrine trades.',
  },
  pick: {
    bonus:   { skirmish: 4, shrine: 2 },
    penalty: { teamfight: 2, warden_fight: 1 },
    desc: 'Isolating targets before objectives force the team fight.',
  },
  protect: {
    bonus:   { boss_cleanse: 3, boss_tank: 2, boss_dps: 2, teamfight: 1 },
    penalty: { skirmish: 2, warden_timing: 1 },
    desc: 'Boss fight execution and carry protection.',
  },
  splitpush: {
    bonus:   { root_siege: 4, skirmish: 2 },
    penalty: { warden_timing: 2, teamfight: 1 },
    desc: 'Side-lane Root pressure; weak in full 5v5 contests.',
  },
  scaling: {
    bonus:   { boss_dps: 3, boss_tank: 2, teamfight: 2 },
    penalty: { shrine: 2, warden_timing: 3 },
    desc: 'Dominant late game; gives up early objectives intentionally.',
  },
};

function getPlaystyleMod(playstyle, contestType) {
  var mods = PLAYSTYLE_MODS[playstyle];
  if (!mods) return 0;
  return (mods.bonus && mods.bonus[contestType] || 0) - (mods.penalty && mods.penalty[contestType] || 0);
}

// ─── SECTION 4B: Comp Synergy Contest Bonuses ────────────────────────────────
//
// When a team's draft triggers a COMP_SYNERGY (3+ champions of same compType),
// they receive a flat power bonus on the contest types that synergy favours.
// This makes the draft → power link explicit and visible in the narrative.

var COMP_SYNERGY_CONTEST_BONUS = {
  ENGAGE:    { teamfight: 4, warden_fight: 4, warden_timing: 2 },
  POKE:      { root_siege: 4, shrine: 3 },
  ASSASSIN:  { skirmish: 5, shrine: 2 },
  PROTECT:   { boss_tank: 4, boss_cleanse: 4, boss_dps: 3 },
  SPLITPUSH: { root_siege: 5, skirmish: 3 },
  SCALING:   { boss_dps: 4, teamfight: 3, boss_tank: 2 },
};

/**
 * Return the flat contest power bonus granted by a team's active comp synergy.
 * @param {Array}  picks       — draft picks array ({ champion, pos, player })
 * @param {string} contestType
 */
function getCompSynergyBonus(picks, contestType) {
  if (!picks) return 0;
  var type = getCompType(picks.map(function(p) { return { champion: p.champion }; }));
  if (!type) return 0;
  var table = COMP_SYNERGY_CONTEST_BONUS[type];
  return (table && table[contestType]) || 0;
}

// ─── SECTION 5: Narrative Helpers ─────────────────────────────────────────────

var DOMINANT_WIN = ['decisively', 'convincingly', 'in commanding fashion', 'with clinical precision'];
var CLOSE_WIN    = ['narrowly', 'by the skin of their teeth', 'in a tense finish', 'after an agonizing fight'];
var SHRINE_NAMES = ['North Ley Shrine', 'South Ley Shrine', 'Crossing Ley Shrine'];
var POS_IDX      = { vanguard:0, ranger:1, arcanist:2, hunter:3, warden:4 };

// First-blood entrance lines (ranger perspective)
var FB_ENTRY_DOMINANT = [
  ' reads the ward gap and burns a path through the northern brush — ',
  ' has been tracking this gank for two minutes and finally springs the trap — ',
  ' bursts out of the northern jungle with zero warning — ',
  ' cuts off every escape route before the target even realises the danger — ',
];
var FB_ENTRY_CLOSE = [
  ' forces a contested duel in the early jungle — ',
  ' trades blow-for-blow before landing the decisive hit — ',
  ' finds a marginal opening and barely converts it — ',
  ' and the victim both commit — only one walks away — ',
];

// Shrine coordination lines (warden/support perspective)
var SHRINE_CALL_GOOD = [
  ' coordinates a textbook rotation — the enemy has no answer.',
  '\'s callout cuts through the noise; the whole squad arrives in sync.',
  ' reads the shrine cooldown to the second and calls the move.',
  ' controls the vision around the shrine and dictates the terms of engagement.',
];
var SHRINE_CALL_CLOSE = [
  ' — a chaotic scramble, but the team holds the point.',
  ' — contested and bloody; the shrine changes hands only after the dust settles.',
  ' — neither team wants to commit, but ultimately one blinks first.',
  ' — both sides arrive at the same moment; the better team-fight composure wins out.',
];

// Team-fight opening lines (arcanist perspective)
var TF_OPEN_GOOD = [
  ' opens with a perfect $ — the enemy formation shatters.',
  ' fires $ into a cluster of three — there is no coherent reply.',
  ' lands $ and the fight is effectively over before it begins.',
  ' uses $ at exactly the right moment; the enemy has used their defensive tools already.',
];
var TF_OPEN_CLOSE = [
  ' unleashes $, but the enemy response is immediate — both teams grind it out.',
  ' commits $ and the team follows — a bloody exchange.',
  ' opens the dance with $; the counter-engage is fierce.',
  ' activates $ and the teamfight descends into chaos.',
];

// Stat-flavour descriptors: returns a short phrase based on stat value
function statFlair(statVal, highPhrases, lowPhrases) {
  return statVal >= 15 ? pick(highPhrases) : pick(lowPhrases);
}

var COMPOSURE_HIGH = ['calm as stone', 'ice-cold under pressure', 'utterly composed', 'unshakeable'];
var COMPOSURE_LOW  = ['visibly rattled', 'shaky under the pressure', 'struggling to hold it together', 'cracking at the edges'];
var COMM_HIGH      = ['calling every step', 'with surgical callouts', 'orchestrating the team perfectly', 'in total command of the comms'];
var COMM_LOW       = ['comms breaking down', 'with the team slightly out of sync', 'a beat slow on the callout', 'without a clean enough call'];
var SENSE_HIGH     = ['reading the map like a book', 'anticipating every enemy rotation', 'three steps ahead', 'with perfect vision control'];
var SENSE_LOW      = ['flying blind', 'caught unaware by the rotation', 'without enough map information', 'reacting rather than reading'];

// Build a teamfight opening line from template, replacing $ with the ult name
function tfOpenLine(side, winMargin) {
  var ultStr = ultName(side, 'arcanist');
  var templates = winMargin > 2 ? TF_OPEN_GOOD : TF_OPEN_CLOSE;
  return tagline(side,'arcanist') + pick(templates).replace('$', ultStr);
}

// ─── SECTION 6: Draft System (Phase 5A + 5B) ─────────────────────────────────

var ROLE_CLASS_PRIORITY = {
  vanguard:  ['Tank', 'Fighter'],
  ranger:    ['Assassin', 'Fighter'],
  arcanist:  ['Mage', 'Assassin'],
  hunter:    ['Marksman'],
  warden:    ['Sentinel'],
};

// When opponent is building this compType, prefer picking these compTypes to counter
var COMP_COUNTERS = {
  ENGAGE:    ['POKE', 'SCALING'],    // poke kites; scaling survives and scales past engagers
  POKE:      ['ENGAGE', 'ASSASSIN'], // all-in over poke; assassins dive the backline
  ASSASSIN:  ['ENGAGE', 'PROTECT'],  // engage lockdown stops picks; protect shields carry
  PROTECT:   ['SPLITPUSH', 'POKE'],  // can't protect a split lane; poke through shields
  SPLITPUSH: ['ENGAGE', 'SCALING'],  // win teamfight while they split
  SCALING:   ['ASSASSIN', 'ENGAGE'], // kill the scaling carry early before they come online
};

// Each class is weak against these classes in direct matchups (countered_by perspective)
var COUNTERED_BY = {
  Tank:      ['Marksman'],           // sustained ranged DPS melts tanks
  Fighter:   ['Mage'],               // kite and burst shuts down brawlers
  Mage:      ['Assassin'],           // burst before mages can cast
  Marksman:  ['Assassin', 'Tank'],   // burst before they act; tanks wall them off
  Assassin:  ['Tank', 'Sentinel'],   // tanks absorb burst; sentinels shield the target
  Sentinel:  ['Assassin', 'Mage'],   // hard to sustain through pure burst/poke
};

// Score a champion for ban consideration: how threatening is it on the enemy team?
function champBanValue(champName, player) {
  if (!player || !CHAMPIONS[champName]) return 0;
  var champ   = CHAMPIONS[champName];
  var pos     = player.position;
  var prefs   = ROLE_CLASS_PRIORITY[pos] || [];
  var base    = calcRolePower(player);
  var roleFit = (champ.role === pos) ? 1.6
              : (prefs.indexOf(champ.class) !== -1) ? 1.3 : 0.8;
  return base * roleFit;
}

// Return top numBans champion names from targetTeam's pools (ranked by threat)
function generateBans(targetTeam, numBans) {
  var candidates = [];
  targetTeam.forEach(function(player) {
    if (!player) return;
    (player.champions || []).forEach(function(champName) {
      candidates.push({ champion: champName, score: champBanValue(champName, player) });
    });
  });
  candidates.sort(function(a, b) { return b.score - a.score; });
  var seen = {}, bans = [];
  candidates.forEach(function(c) {
    if (!seen[c.champion] && bans.length < numBans) {
      seen[c.champion] = true;
      bans.push(c.champion);
    }
  });
  return bans;
}

// Get the leading comp type seen so far in a picks list (needs ≥ 2 to register)
function getDominantCompType(picks) {
  var counts = {};
  picks.forEach(function(p) {
    if (!p || p.champion === '???') return;
    var ch = CHAMPIONS[p.champion];
    if (!ch) return;
    counts[ch.compType] = (counts[ch.compType] || 0) + 1;
  });
  var best = null, bestCount = 1;
  Object.keys(counts).forEach(function(k) {
    if (counts[k] > bestCount) { best = k; bestCount = counts[k]; }
  });
  return best;
}

// Calculate net counter power advantage for blue (positive = blue has the edge)
// Scaled by 0.25 so counters influence but don't override raw skill gap
function getCounterScore(bluePicks, redPicks) {
  var score = 0;
  var redClasses  = redPicks.map(function(p) {
    return p && CHAMPIONS[p.champion] ? CHAMPIONS[p.champion].class : null;
  }).filter(Boolean);
  var blueClasses = bluePicks.map(function(p) {
    return p && CHAMPIONS[p.champion] ? CHAMPIONS[p.champion].class : null;
  }).filter(Boolean);
  // For each red champ countered by a blue class → +1.5 for blue
  redClasses.forEach(function(rc) {
    (COUNTERED_BY[rc] || []).forEach(function(counterClass) {
      if (blueClasses.indexOf(counterClass) !== -1) score += 1.5;
    });
  });
  // For each blue champ countered by a red class → -1.5 for blue
  blueClasses.forEach(function(bc) {
    (COUNTERED_BY[bc] || []).forEach(function(counterClass) {
      if (redClasses.indexOf(counterClass) !== -1) score -= 1.5;
    });
  });
  return score * 0.25; // scale: max ~±1.9 power offset
}

// Pick the best available champion for a player, counter-aware
function pickChampion(player, pos, banned, allPicked, enemyPicks) {
  if (!player) return '???';
  var pool         = player.champions || [];
  var priority     = ROLE_CLASS_PRIORITY[pos] || [];
  var enemyDom     = getDominantCompType(enemyPicks);
  var counterTypes = enemyDom ? (COMP_COUNTERS[enemyDom] || []) : [];

  var available = pool.filter(function(c) {
    return !banned[c] && !allPicked[c] && CHAMPIONS[c];
  });
  if (!available.length) return '???';

  var scored = available.map(function(c) {
    var champ = CHAMPIONS[c];
    var w = 1;
    if (priority.indexOf(champ.class) !== -1) w += 2; // role class fit
    if (champ.role === pos) w += 1;                    // exact role match
    if (counterTypes.indexOf(champ.compType) !== -1) w += 2; // counter-pick bonus
    w += Math.random() * 0.5;                          // variance to avoid repetitive drafts
    return { c: c, w: w };
  });
  scored.sort(function(a, b) { return b.w - a.w; });

  // Weighted pick among top 3 to keep variety
  var top   = scored.slice(0, Math.min(3, scored.length));
  var total = top.reduce(function(s, x) { return s + x.w; }, 0);
  var r     = Math.random() * total;
  for (var i = 0; i < top.length; i++) {
    r -= top[i].w;
    if (r <= 0) return top[i].c;
  }
  return top[0].c;
}

function draftChampions(blueTeamArr, redTeamArr) {
  // ── Phase 1: Bans (5 per side, each bans from opponent's pool) ──────────────
  var blueBans = generateBans(redTeamArr,  5); // blue bans opponent (red) champs
  var redBans  = generateBans(blueTeamArr, 5); // red bans opponent (blue) champs
  var banned   = {};
  blueBans.concat(redBans).forEach(function(c) { banned[c] = true; });

  // ── Phase 2: Picks — interleaved by position, counter-aware ─────────────────
  // Blue picks first at each slot, then red counter-picks with full knowledge.
  var allPicked = {}, bluePicks = [], redPicks = [];

  POSITIONS.forEach(function(pos, i) {
    var bc = pickChampion(blueTeamArr[i], pos, banned, allPicked, redPicks);
    if (bc !== '???') allPicked[bc] = true;
    var bClass = bc !== '???' && CHAMPIONS[bc] ? CHAMPIONS[bc].class : null;
    bluePicks.push({ pos: pos, player: blueTeamArr[i], champion: bc, champClass: bClass });

    var rc = pickChampion(redTeamArr[i], pos, banned, allPicked, bluePicks);
    if (rc !== '???') allPicked[rc] = true;
    var rClass = rc !== '???' && CHAMPIONS[rc] ? CHAMPIONS[rc].class : null;
    redPicks.push({ pos: pos, player: redTeamArr[i], champion: rc, champClass: rClass });
  });

  var synFor = function(picks) {
    var type = getCompType(picks.map(function(p) { return { champion: p.champion }; }));
    return type ? [COMP_SYNERGIES[type]] : [];
  };

  return {
    blue:          bluePicks,
    red:           redPicks,
    bans:          { blue: blueBans, red: redBans },
    blueSynergies: synFor(bluePicks),
    redSynergies:  synFor(redPicks),
    counterScore:  getCounterScore(bluePicks, redPicks),
  };
}

// ─── SECTION 7: Quick Simulate ────────────────────────────────────────────────

function quickSimulate(blueTeamArr, redTeamArr) {
  var pow = function(arr) {
    return arr.reduce(function(s, pl) { return s + (pl ? calcRolePower(pl) : 10); }, 0);
  };
  var diff = pow(blueTeamArr) - pow(redTeamArr);
  return chance(clamp(50 + diff * 1.8, 12, 88)) ? 'blue' : 'red';
}

// ─── SECTION 8: Match State & Event Helpers ───────────────────────────────────

var _ms = null; // live match state
var _ev = null; // event list

// Kill probability by position — who is most likely to get the kill credit
// hunter and arcanist are primary damage dealers; warden almost never takes kills
var KILL_PROB  = [10, 20, 30, 35, 5];  // vanguard, ranger, arcanist, hunter, warden
// Death probability — tanks and frontliners die more often, hunters sometimes
var DEATH_PROB = [30, 20, 25, 15, 10]; // vanguard, ranger, arcanist, hunter, warden

function weightedRolePick(probs) {
  var total = probs.reduce(function(s, v) { return s + v; }, 0);
  var r = Math.random() * total;
  for (var i = 0; i < probs.length; i++) { r -= probs[i]; if (r <= 0) return i; }
  return 0;
}

function initPerf() {
  return [0,1,2,3,4].map(function() { return { kills: 0, assists: 0, deaths: 0 }; });
}

// Attribute one kill: killerSide player gets kill, victimSide player gets death, teammates get assists
function attributeKillEvent(killerSide, victimSide) {
  var killerIdx = weightedRolePick(KILL_PROB);
  var victimIdx = weightedRolePick(DEATH_PROB);
  _ms[killerSide].perf[killerIdx].kills++;
  _ms[victimSide].perf[victimIdx].deaths++;
  for (var i = 0; i < 5; i++) {
    if (i !== killerIdx) _ms[killerSide].perf[i].assists++;
  }
}

function initMatchState(blueTeamArr, redTeamArr, blueName, redName, blueStyle, redStyle) {
  _ev = [];
  _ms = {
    t: 0,
    blueName:  blueName,
    redName:   redName,
    blueStyle: blueStyle,
    redStyle:  redStyle,
    blue: { players: blueTeamArr, kills: 0, shrines: 0, roots: 0, gold: 0, perf: initPerf() },
    red:  { players: redTeamArr,  kills: 0, shrines: 0, roots: 0, gold: 0, perf: initPerf() },
    adv:    50,
    winner: null,
    draft:  null,
    // Gold lead snapshots for the chart: array of { t, lead } (positive = blue ahead)
    goldSnapshots: [],
  };
}

// Advance gold simulation — called after each major event.
// Gold flows from kills, cs, objectives; winner naturally accumulates faster.
function tickGold() {
  var W    = _ms.winner;
  var t    = _ms.t;
  // Base gold per minute: ~400/min per player, 5 players = 2000/min each team
  var basePerMin = 2000;
  var dt   = Math.max(0.5, t - (_ms._lastGoldTick || 0));
  _ms._lastGoldTick = t;

  // Gold from cs (winner farms slightly better due to map pressure)
  var bCs  = basePerMin * dt * (W === 'blue' ? 1.04 : 0.96);
  var rCs  = basePerMin * dt * (W === 'red'  ? 1.04 : 0.96);
  // Gold from kills (300 per kill)
  var bKg  = _ms.blue.kills * 300;
  var rKg  = _ms.red.kills  * 300;
  // Gold from objectives
  var bObj = (_ms.blue.shrines * 150) + (_ms.blue.roots * 250);
  var rObj = (_ms.red.shrines  * 150) + (_ms.red.roots  * 250);

  _ms.blue.gold = Math.round(bCs + bKg + bObj);
  _ms.red.gold  = Math.round(rCs + rKg + rObj);

  var lead = _ms.blue.gold - _ms.red.gold;
  _ms.goldSnapshots.push({ t: Math.round(t * 10) / 10, lead: lead });
}

function getPlayer(side, pos) {
  var idx = typeof pos === 'string' ? POS_IDX[pos] : pos;
  return _ms[side].players[idx] || null;
}

function getChamp(side, pos) {
  if (!_ms.draft) return '???';
  var idx = typeof pos === 'string' ? POS_IDX[pos] : pos;
  return (_ms.draft[side][idx] && _ms.draft[side][idx].champion) || '???';
}

function tagline(side, pos) {
  var pl = getPlayer(side, pos);
  var ch = getChamp(side, pos);
  return pl ? (pl.name + ' (' + ch + ')') : ch;
}

function ultName(side, pos) {
  var ch = getChamp(side, pos);
  var data = CHAMPIONS[ch];
  if (!data || !data.ult) return 'their ultimate';
  return data.ult.split('—')[0].trim();
}

function getStat(side, pos, stat) {
  var pl = getPlayer(side, pos);
  return pl && pl.stats ? (pl.stats[stat] || 10) : 10;
}

function pushEv(type, text, sceneName, opts) {
  opts = opts || {};
  tickGold();
  var ev = {
    type:        type,
    time:        fmt(_ms.t),
    text:        text,
    positions:   sceneName ? scene(sceneName) : null,
    blueKills:   _ms.blue.kills,
    redKills:    _ms.red.kills,
    blueShrines: _ms.blue.shrines,
    redShrines:  _ms.red.shrines,
    blueRoots:   _ms.blue.roots,
    redRoots:    _ms.red.roots,
    advAfter:    Math.round(_ms.adv),
    blueGold:    _ms.blue.gold,
    redGold:     _ms.red.gold,
  };
  Object.keys(opts).forEach(function(k) { ev[k] = opts[k]; });
  _ev.push(ev);
}

function doKill(killerSide, text, sceneName, opts) {
  _ms[killerSide].kills++;
  var victimSide = killerSide === 'blue' ? 'red' : 'blue';
  attributeKillEvent(killerSide, victimSide);
  var swing = rand(1.5, 4.0);
  _ms.adv = clamp(_ms.adv + (killerSide === 'blue' ? swing : -swing), 10, 90);
  pushEv('kill', text, sceneName, Object.assign({ killBlue: killerSide === 'blue' }, opts || {}));
}

function doShrine(side, shrineName, sceneName) {
  _ms[side].shrines++;
  var stacks    = _ms[side].shrines;
  var buffNames = ['','Verdant Blessing','Quickened Roots','Ley Convergence'];
  var buff      = buffNames[Math.min(stacks, 3)] || '';
  var swing     = rand(2, 5);
  _ms.adv = clamp(_ms.adv + (side === 'blue' ? swing : -swing), 10, 90);
  var teamName = side === 'blue' ? _ms.blueName : _ms.redName;
  pushEv('objective',
    teamName + ' captures the ' + shrineName + '! ' +
    'Verdant Blessings \xd7' + stacks + (buff ? ' \u2014 ' + buff + ' active' : '') + '.',
    sceneName,
    { shrineBlue: side === 'blue', shrineRed: side === 'red' }
  );
}

function doRoot(side, label, sceneName) {
  _ms[side].roots++;
  var swing    = rand(3, 6);
  _ms.adv = clamp(_ms.adv + (side === 'blue' ? swing : -swing), 10, 90);
  var teamName = side === 'blue' ? _ms.blueName : _ms.redName;
  pushEv('objective',
    label + ' collapses under siege from ' + teamName + '! The lane is cracked open.',
    sceneName,
    { towerBlue: side === 'blue' }
  );
}

function doTeamfight(winnerSide, bKills, rKills, text, sceneName) {
  _ms.blue.kills += bKills;
  _ms.red.kills  += rKills;
  // Attribute kills: bKills = blue killed red players, rKills = red killed blue players
  for (var i = 0; i < bKills; i++) attributeKillEvent('blue', 'red');
  for (var j = 0; j < rKills; j++) attributeKillEvent('red', 'blue');
  var swing = rand(3, 7);
  _ms.adv = clamp(_ms.adv + (winnerSide === 'blue' ? swing : -swing), 10, 90);
  pushEv('teamfight', text, sceneName, { tfBlueKills: bKills, tfRedKills: rKills });
}

function doCommentary(text, sceneName) {
  pushEv('commentary', text, sceneName);
}

// ─── SECTION 9: Seedling Phase (0–10 min) ─────────────────────────────────────

function runSeedling() {
  var blueStyle = _ms.blueStyle, redStyle = _ms.redStyle;
  var bPlayers  = _ms.blue.players, rPlayers = _ms.red.players;

  // Opening commentary
  _ms.t = rand(0.5, 1.2);
  var bComp = _ms.draft && _ms.draft.blueSynergies[0] ? _ms.draft.blueSynergies[0].name : null;
  var rComp = _ms.draft && _ms.draft.redSynergies[0]  ? _ms.draft.redSynergies[0].name  : null;
  doCommentary(
    'Both teams step into the Ancient Grove. ' +
    _ms.blueName + (bComp ? ' field a ' + bComp : ' open with ' + (PLAYSTYLE_MODS[blueStyle] ? PLAYSTYLE_MODS[blueStyle].desc : 'a balanced approach')) + '. ' +
    _ms.redName + (rComp ? ' answer with ' + rComp : ' take their positions.'),
    'laning'
  );

  // ── First Blood ──────────────────────────────────────────────────────────────
  // Rangers duel in the jungle; arcanist roam and ASSASSIN/PICK synergy contribute.
  _ms.t = rand(3.0, 6.5);
  var bDraft = _ms.draft ? _ms.draft.blue : [];
  var rDraft = _ms.draft ? _ms.draft.red  : [];
  var bRngr = calcContestPower(getPlayer('blue','ranger'),  'skirmish')
    + getPlaystyleMod(blueStyle, 'skirmish') * 5
    + getCompSynergyBonus(bDraft, 'skirmish');
  var rRngr = calcContestPower(getPlayer('red', 'ranger'),  'skirmish')
    + getPlaystyleMod(redStyle,  'skirmish') * 5
    + getCompSynergyBonus(rDraft, 'skirmish');
  var bArc  = calcContestPower(getPlayer('blue','arcanist'),'skirmish') * 0.4;
  var rArc  = calcContestPower(getPlayer('red', 'arcanist'),'skirmish') * 0.4;
  var fb    = resolveContest(bRngr + bArc, rRngr + rArc, 2.5);
  var fbSide   = fb.blueWins ? 'blue' : 'red';
  var fbVictim = fb.blueWins ? 'red'  : 'blue';
  var victimPos = chance(55) ? 'ranger' : (chance(50) ? 'arcanist' : 'vanguard');
  var entranceLine = tagline(fbSide,'ranger') + pick(fb.margin > 3 ? FB_ENTRY_DOMINANT : FB_ENTRY_CLOSE);
  doKill(
    fbSide,
    'FIRST BLOOD! ' + entranceLine +
    tagline(fbVictim, victimPos) + ' has nowhere to go. ' +
    (fbSide === 'blue' ? _ms.blueName : _ms.redName) + ' draw first blood!',
    'northShrine'
  );

  // ── North Shrine ─────────────────────────────────────────────────────────────
  _ms.t = rand(5.5, 8.0);
  var bNorth = teamContestPower(bPlayers, 'shrine', getPlaystyleMod(blueStyle, 'shrine') * 5
    + getCompSynergyBonus(bDraft, 'shrine'));
  var rNorth = teamContestPower(rPlayers, 'shrine', getPlaystyleMod(redStyle,  'shrine') * 5
    + getCompSynergyBonus(rDraft, 'shrine'));
  var northBonus   = fbSide === 'blue' ? rand(2, 5) : -rand(2, 5);
  var northResult  = resolveContest(bNorth + northBonus, rNorth, 1.2);
  var northSide    = northResult.blueWins ? 'blue' : 'red';
  var northSupport = getPlayer(northSide, 'warden');
  var northSuppComm = northSupport ? (northSupport.stats.communication || 10) : 10;
  var northCallout  = northSuppComm >= 14
    ? (northSupport ? northSupport.name : 'the support') + pick(SHRINE_CALL_GOOD)
    : (northSide === 'blue' ? _ms.blueName : _ms.redName) + pick(SHRINE_CALL_CLOSE);
  doShrine(northSide, SHRINE_NAMES[0], 'northShrine');
  doCommentary(
    'North Shrine: ' + northCallout + ' ' +
    (northSide === 'blue' ? _ms.redName : _ms.blueName) + ' will need to respond on the south side.',
    'northShrine'
  );

  // ── South Shrine ─────────────────────────────────────────────────────────────
  _ms.t = rand(7.5, 9.5);
  var southBonus  = northSide === 'blue' ? -rand(3, 7) : rand(3, 7);
  var southResult = resolveContest(bNorth + southBonus, rNorth, 1.2);
  var southSide   = southResult.blueWins ? 'blue' : 'red';
  doShrine(southSide, SHRINE_NAMES[1], 'southShrine');
  // Commentary if the same team took both shrines — or if they split
  var bothShrines = northSide === southSide;
  if (bothShrines) {
    doCommentary(
      (northSide === 'blue' ? _ms.blueName : _ms.redName) +
      ' sweep both opening shrines — ' +
      (northSide === 'blue' ? _ms.redName : _ms.blueName) +
      ' will need a strong Warden contest to claw back into this.',
      'southShrine'
    );
  }

  // ── Optional early skirmish ───────────────────────────────────────────────────
  if (chance(60)) {
    _ms.t = rand(8.5, 9.8);
    var skResult  = resolveContest(bRngr + bArc, rRngr + rArc, 2.0);
    var skSide    = skResult.blueWins ? 'blue' : 'red';
    var skVictim  = skSide === 'blue' ? 'red' : 'blue';
    var skRngrGs  = getStat(skSide, 'ranger', 'gameSense');
    var skFlair   = statFlair(skRngrGs, SENSE_HIGH, SENSE_LOW);
    doKill(
      skSide,
      tagline(skSide,'ranger') + ' — ' + skFlair + ' — catches ' +
      tagline(skVictim,'arcanist') + ' over-extended near the South Shrine. Solo kill.',
      'southShrine'
    );
  }
}

// ─── SECTION 10: Growth Phase (10–20 min) ─────────────────────────────────────

function runGrowth() {
  var blueStyle = _ms.blueStyle, redStyle = _ms.redStyle;
  var bPlayers  = _ms.blue.players, rPlayers = _ms.red.players;

  // Phase header
  _ms.t = 10.0 + rand(0.2, 0.8);
  var bShrLead = _ms.blue.shrines - _ms.red.shrines;
  var leadText = bShrLead > 0
    ? _ms.blueName + ' hold a ' + _ms.blue.shrines + '-' + _ms.red.shrines + ' Shrine lead'
    : bShrLead < 0
    ? _ms.redName  + ' hold a ' + _ms.red.shrines  + '-' + _ms.blue.shrines + ' Shrine lead'
    : 'Shrines are tied one apiece';
  doCommentary(
    '[Growth Phase] ' + leadText + ' as both rosters transition to the mid-game. ' +
    'Ancient Roots are under pressure on all three lanes.',
    'center'
  );

  var bDraft = _ms.draft ? _ms.draft.blue : [];
  var rDraft = _ms.draft ? _ms.draft.red  : [];

  // ── Outer Root falls ──────────────────────────────────────────────────────────
  _ms.t = rand(10.5, 12.5);
  var bSiege = teamContestPower(bPlayers, 'root_siege',
    getPlaystyleMod(blueStyle, 'root_siege') * 5 + getCompSynergyBonus(bDraft, 'root_siege'));
  var rSiege = teamContestPower(rPlayers, 'root_siege',
    getPlaystyleMod(redStyle,  'root_siege') * 5 + getCompSynergyBonus(rDraft, 'root_siege'));
  var siegeR  = resolveContest(bSiege, rSiege, 1.5);
  var outerSide = siegeR.blueWins ? 'blue' : 'red';
  var outerLanes = ['Top-Lane Outer Root', 'Bot-Lane Outer Root', 'Mid-Lane Outer Root'];
  doRoot(outerSide, pick(outerLanes), outerSide === 'blue' ? 'northShrine' : 'southShrine');

  // ── Grove Warden spawns ───────────────────────────────────────────────────────
  _ms.t = rand(12.0, 13.0);
  doCommentary(
    'The Grove Warden stirs in the Grove Heart — both teams abandon their lanes and crash toward center.',
    'center'
  );

  // Stage 1: Timing contest — who reads the Warden's HP and calls it first?
  _ms.t += rand(0.5, 1.2);
  var bWTime = teamContestPower(bPlayers, 'warden_timing',
    getPlaystyleMod(blueStyle, 'warden_timing') * 5 + getCompSynergyBonus(bDraft, 'warden_timing'));
  var rWTime = teamContestPower(rPlayers, 'warden_timing',
    getPlaystyleMod(redStyle,  'warden_timing') * 5 + getCompSynergyBonus(rDraft, 'warden_timing'));
  var timeR  = resolveContest(bWTime, rWTime, 1.4);
  var timingSide = timeR.blueWins ? 'blue' : 'red';
  // Commentary on which Ranger called the timing
  var timingRngr = getPlayer(timingSide, 'ranger');
  var timingGs   = timingRngr ? (timingRngr.stats.gameSense || 10) : 10;
  doCommentary(
    tagline(timingSide,'ranger') + ' — ' + statFlair(timingGs, SENSE_HIGH, SENSE_LOW) +
    ' — calls the Warden at ' + fmt(_ms.t) + '. ' +
    (timingSide === 'blue' ? _ms.blueName : _ms.redName) + ' collapse first!',
    'center'
  );

  // Stage 2: Fight — who wins the chaotic 5v5 around the Warden?
  _ms.t += rand(0.3, 0.7);
  var bWFight = teamContestPower(bPlayers, 'warden_fight',
    getPlaystyleMod(blueStyle, 'warden_fight') * 5 + getCompSynergyBonus(bDraft, 'warden_fight'));
  var rWFight = teamContestPower(rPlayers, 'warden_fight',
    getPlaystyleMod(redStyle,  'warden_fight') * 5 + getCompSynergyBonus(rDraft, 'warden_fight'));
  var fightBonus = timingSide === 'blue' ? rand(2, 5) : -rand(2, 5);
  var fightR     = resolveContest(bWFight + fightBonus, rWFight, 1.5);
  var wardenSide = fightR.blueWins ? 'blue' : 'red';

  // Narrative quality based on key stats
  var tankComp = getStat(wardenSide, 'vanguard', 'composure');
  var suppComm = getStat(wardenSide, 'warden', 'communication');
  var tankLine = tankComp >= 16
    ? tagline(wardenSide,'vanguard') + ' — ' + statFlair(tankComp, COMPOSURE_HIGH, COMPOSURE_LOW) + ' — absorbs the Root Slam clean. '
    : tankComp >= 12
    ? tagline(wardenSide,'vanguard') + ' weathers the Root Slam, taking the hit so the carries don\'t. '
    : tagline(wardenSide,'vanguard') + ' barely survives the Root Slam — some damage leaks through. ';
  var healLine = suppComm >= 16
    ? tagline(wardenSide,'warden') + ' — ' + statFlair(suppComm, COMM_HIGH, COMM_LOW) + ' — activates ' + ultName(wardenSide,'warden') + '.'
    : suppComm >= 12
    ? tagline(wardenSide,'warden') + ' activates ' + ultName(wardenSide,'warden') + ' in time to clear the Poison Breath.'
    : tagline(wardenSide,'warden') + ' clears the Poison Breath, though the timing was closer than anyone would like.';

  var wSwing = rand(5, 10);
  _ms.adv = clamp(_ms.adv + (wardenSide === 'blue' ? wSwing : -wSwing), 10, 90);
  _ms[wardenSide].shrines++; // Warden's Grasp tracks in shrine slot
  pushEv('objective',
    'GROVE WARDEN SLAIN! ' + tankLine + healLine + ' ' +
    (wardenSide === 'blue' ? _ms.blueName : _ms.redName) + ' secure Warden\'s Grasp!',
    'center',
    { wardenBlue: wardenSide === 'blue', wardenRed: wardenSide === 'red' }
  );

  // ── Team fight erupts post-Warden ─────────────────────────────────────────────
  _ms.t += rand(0.5, 1.2);
  var bTF = teamContestPower(bPlayers, 'teamfight',
    getPlaystyleMod(blueStyle, 'teamfight') * 5 + getCompSynergyBonus(bDraft, 'teamfight'));
  var rTF = teamContestPower(rPlayers, 'teamfight',
    getPlaystyleMod(redStyle,  'teamfight') * 5 + getCompSynergyBonus(rDraft, 'teamfight'));
  var tfBonus1 = wardenSide === 'blue' ? rand(3, 6) : -rand(3, 6);
  var tf1R     = resolveContest(bTF + tfBonus1, rTF, 1.6);
  var tf1Side  = tf1R.blueWins ? 'blue' : 'red';
  var tf1bk    = tf1Side === 'blue' ? rInt(2,4) : rInt(0,2);
  var tf1rk    = tf1Side === 'red'  ? rInt(2,4) : rInt(0,2);
  doTeamfight(
    tf1Side, tf1bk, tf1rk,
    'Team fight erupts at the Grove Heart! ' + tfOpenLine(tf1Side, tf1R.margin) + ' ' +
    (tf1Side === 'blue' ? _ms.blueName : _ms.redName) +
    ' win the exchange ' + Math.max(tf1bk,tf1rk) + '-for-' + Math.min(tf1bk,tf1rk) + '.',
    'center'
  );

  // ── Inner Root falls ──────────────────────────────────────────────────────────
  _ms.t = rand(14.5, 16.5);
  var innerSide  = tf1Side;
  var innerLanes = ['Inner Top-Lane Root', 'Inner Bot-Lane Root', 'Inner Mid-Lane Root'];
  doRoot(innerSide, pick(innerLanes), innerSide === 'blue' ? 'northShrine' : 'southShrine');

  // ── Crossing Shrine ───────────────────────────────────────────────────────────
  _ms.t = rand(16.0, 18.5);
  var bCross = teamContestPower(bPlayers, 'shrine',
    getPlaystyleMod(blueStyle, 'shrine') * 5 + getCompSynergyBonus(bDraft, 'shrine'));
  var rCross = teamContestPower(rPlayers, 'shrine',
    getPlaystyleMod(redStyle,  'shrine') * 5 + getCompSynergyBonus(rDraft, 'shrine'));
  var crossBonus  = wardenSide === 'blue' ? rand(2, 5) : -rand(2, 5);
  var crossR      = resolveContest(bCross + crossBonus, rCross, 1.3);
  var crossSide   = crossR.blueWins ? 'blue' : 'red';
  doShrine(crossSide, SHRINE_NAMES[2], 'center');
  var crossWardComm = getStat(crossSide, 'warden', 'communication');
  doCommentary(
    'Crossing Shrine goes to ' + (crossSide === 'blue' ? _ms.blueName : _ms.redName) + ' — ' +
    tagline(crossSide,'warden') + ' ' + statFlair(crossWardComm, COMM_HIGH, COMM_LOW) + '.',
    'center'
  );

  // ── Optional second skirmish ──────────────────────────────────────────────────
  if (chance(65)) {
    _ms.t = rand(18.0, 19.5);
    var tf2R    = resolveContest(bTF, rTF, 1.5);
    var tf2Side = tf2R.blueWins ? 'blue' : 'red';
    var tf2bk   = tf2Side === 'blue' ? rInt(1,3) : rInt(0,2);
    var tf2rk   = tf2Side === 'red'  ? rInt(1,3) : rInt(0,2);
    var tf2Comp  = getStat(tf2Side, 'vanguard', 'composure');
    doTeamfight(
      tf2Side, tf2bk, tf2rk,
      tagline(tf2Side,'vanguard') + ' — ' + statFlair(tf2Comp, COMPOSURE_HIGH, COMPOSURE_LOW) +
      ' — engineers a pick near the Inner Root. ' +
      (tf2Side === 'blue' ? _ms.blueName : _ms.redName) +
      ' come out ahead ' + Math.max(tf2bk,tf2rk) + '-for-' + Math.min(tf2bk,tf2rk) + '.',
      crossSide === 'blue' ? 'northShrine' : 'southShrine'
    );
  }
}

// ─── SECTION 11: Bloom Phase (20+ min) ────────────────────────────────────────

function runBloom() {
  var blueStyle = _ms.blueStyle, redStyle = _ms.redStyle;
  var bPlayers  = _ms.blue.players, rPlayers = _ms.red.players;
  var W = _ms.winner, L = W === 'blue' ? 'red' : 'blue';
  var Wname = W === 'blue' ? _ms.blueName : _ms.redName;
  var Lname = L === 'blue' ? _ms.blueName : _ms.redName;

  // Phase header
  _ms.t = rand(20.0, 22.0);
  var wBless = _ms[W].shrines, lBless = _ms[L].shrines;
  doCommentary(
    '[Bloom Phase] ' + Wname + ' hold ' + wBless + ' Verdant Blessing' + (wBless !== 1 ? 's' : '') +
    ' and ' + _ms[W].roots + ' Root' + (_ms[W].roots !== 1 ? 's' : '') + ' cleared. ' +
    Lname + ' are at ' + lBless + ' Blessing' + (lBless !== 1 ? 's' : '') + '. The Corrupted Ancient beckons.',
    W === 'blue' ? 'bluePush' : 'redPush'
  );

  var bDraft = _ms.draft ? _ms.draft.blue : [];
  var rDraft = _ms.draft ? _ms.draft.red  : [];

  // ── Heart Root falls ──────────────────────────────────────────────────────────
  _ms.t += rand(1.0, 2.5);
  var bSiege = teamContestPower(bPlayers, 'root_siege',
    getPlaystyleMod(blueStyle, 'root_siege') * 5 + getCompSynergyBonus(bDraft, 'root_siege'));
  var rSiege = teamContestPower(rPlayers, 'root_siege',
    getPlaystyleMod(redStyle,  'root_siege') * 5 + getCompSynergyBonus(rDraft, 'root_siege'));
  var heartBonus  = W === 'blue' ? rand(3, 8) : -rand(3, 8);
  var heartR      = resolveContest(bSiege + heartBonus, rSiege, 1.6);
  var heartSide   = heartR.blueWins ? 'blue' : 'red';
  var heartSwing  = rand(5, 9);
  _ms.adv = clamp(_ms.adv + (heartSide === 'blue' ? heartSwing : -heartSwing), 10, 90);
  var heartLanes  = ['Heart Root — Top Lane', 'Heart Root — Bot Lane', 'Heart Root — Mid Lane'];
  doRoot(heartSide, pick(heartLanes), heartSide === 'blue' ? 'bluePush' : 'redPush');

  // ── Final team fight ──────────────────────────────────────────────────────────
  _ms.t += rand(1.5, 3.0);
  var bTF = teamContestPower(bPlayers, 'teamfight',
    getPlaystyleMod(blueStyle, 'teamfight') * 5 + getCompSynergyBonus(bDraft, 'teamfight'));
  var rTF = teamContestPower(rPlayers, 'teamfight',
    getPlaystyleMod(redStyle,  'teamfight') * 5 + getCompSynergyBonus(rDraft, 'teamfight'));
  var ftBonus = W === 'blue' ? rand(4, 9) : -rand(4, 9);
  var ftR     = resolveContest(bTF + ftBonus, rTF, 1.7);
  var ftSide  = ftR.blueWins ? 'blue' : 'red';
  var ftbk    = ftSide === 'blue' ? rInt(3,5) : rInt(0,2);
  var ftrk    = ftSide === 'red'  ? rInt(3,5) : rInt(0,2);
  doTeamfight(
    ftSide, ftbk, ftrk,
    'Decisive clash outside the enemy base! ' + tagline(ftSide,'hunter') + ' finds a clean angle — ' +
    (ftSide === 'blue' ? _ms.blueName : _ms.redName) +
    ' win ' + Math.max(ftbk,ftrk) + '-for-' + Math.min(ftbk,ftrk) + ' and immediately converge on the Corrupted Ancient!',
    W === 'blue' ? 'bluePush' : 'redPush'
  );

  // ── Boss fight ────────────────────────────────────────────────────────────────
  _ms.t += rand(0.8, 1.5);
  runBossFight();
}

// ─── SECTION 12: Corrupted Ancient Boss Fight ─────────────────────────────────

function runBossFight() {
  var W = _ms.winner, L = W === 'blue' ? 'red' : 'blue';
  var Wname = W === 'blue' ? _ms.blueName : _ms.redName;
  var Lname = L === 'blue' ? _ms.blueName : _ms.redName;
  var wStyle = W === 'blue' ? _ms.blueStyle : _ms.redStyle;
  var bPlayers = _ms.blue.players, rPlayers = _ms.red.players;

  // Overall margin determines how dramatic the boss fight is
  var bPow = bPlayers.reduce(function(s,pl) { return s + (pl ? calcRolePower(pl) : 10); }, 0);
  var rPow = rPlayers.reduce(function(s,pl) { return s + (pl ? calcRolePower(pl) : 10); }, 0);
  var margin  = Math.abs(bPow - rPow);
  var isClose = margin < 4;

  doCommentary(
    Wname + ' storm the Corrupted Ancient! All five drive through the shattered Heart Root — the enemy base cracks.',
    W === 'blue' ? 'bluePush' : 'redPush'
  );

  var wDraft = W === 'blue' ? (_ms.draft ? _ms.draft.blue : []) : (_ms.draft ? _ms.draft.red : []);

  // ── Root Slam check (Vanguard: composure + teamfightPositioning) ──────────────
  _ms.t += rand(0.4, 0.8);
  var tankPow = calcContestPower(getPlayer(W,'vanguard'), 'boss_tank')
    + getPlaystyleMod(wStyle, 'boss_tank') * 5
    + getCompSynergyBonus(wDraft, 'boss_tank');
  var slamOK  = chance(clamp(40 + (tankPow - 10) * 4, 20, 92));
  var tankComp = getStat(W, 'vanguard', 'composure');
  if (slamOK) {
    pushEv('commentary',
      'ROOT SLAM! The Ancient lunges — ' +
      (tankComp >= 16
        ? tagline(W,'vanguard') + ' reads it perfectly, activating ' + ultName(W,'vanguard') + ' to eat the full hit. The carries stand untouched.'
        : tankComp >= 12
        ? tagline(W,'vanguard') + ' holds the line and absorbs the blow. Some damage bleeds through, but the team holds.'
        : tagline(W,'vanguard') + ' just barely positions in time — it\'s messy, but the carries survive.'),
      W === 'blue' ? 'bluePush' : 'redPush'
    );
  } else {
    // Vanguard failed — loser gets a kill credit
    _ms[L].kills++;
    _ms.adv = clamp(_ms.adv + (L === 'blue' ? rand(2,4) : -rand(2,4)), 10, 90);
    pushEv('kill',
      'ROOT SLAM CONNECTS! ' + tagline(W,'vanguard') + ' is caught out of position and launched backward! ' +
      Lname + ' capitalise — ' + tagline(L,'arcanist') + ' picks off an exposed carry.',
      W === 'blue' ? 'bluePush' : 'redPush',
      { killBlue: L === 'blue' }
    );
  }

  // ── Poison Breath check (Warden: communication + objectiveExecution) ──────────
  _ms.t += rand(0.5, 1.0);
  var healPow   = calcContestPower(getPlayer(W,'warden'), 'boss_cleanse')
    + getPlaystyleMod(wStyle, 'boss_cleanse') * 5
    + getCompSynergyBonus(wDraft, 'boss_cleanse');
  var cleanseOK = chance(clamp(40 + (healPow - 10) * 4, 20, 92));
  var suppComm  = getStat(W, 'warden', 'communication');
  if (cleanseOK) {
    pushEv('commentary',
      'POISON BREATH — a wall of corrosive spores surges forward! ' +
      (suppComm >= 16
        ? tagline(W,'warden') + ' calls the timing to the millisecond, activating ' + ultName(W,'warden') + '. Not a single DoT stack lands on the carries. Flawless.'
        : suppComm >= 12
        ? tagline(W,'warden') + ' activates ' + ultName(W,'warden') + ' and clears the Poison Breath stacks in time.'
        : tagline(W,'warden') + ' just manages to clear the DoT before it becomes critical.'),
      W === 'blue' ? 'bluePush' : 'redPush'
    );
  } else {
    pushEv('commentary',
      'POISON BREATH — the DoT stacks spread through the backline unchecked! ' +
      tagline(W,'warden') + ' activates ' + ultName(W,'warden') + ' a beat too late. ' +
      Wname + ' grit their teeth and push through the burning pain.',
      W === 'blue' ? 'bluePush' : 'redPush'
    );
  }

  // ── Enrage check (triggered if team DPS is mediocre or match is close) ────────
  var wPlayers  = W === 'blue' ? bPlayers : rPlayers;
  var dpsPow    = teamContestPower(wPlayers, 'boss_dps',
    getPlaystyleMod(wStyle, 'boss_dps') * 5 + getCompSynergyBonus(wDraft, 'boss_dps'));
  var avgDps    = dpsPow / 5;
  var enrage    = isClose || avgDps < 12.5;

  if (enrage) {
    _ms.t += rand(0.8, 1.5);
    var hunterAdapt = getStat(W, 'hunter', 'adaptability');
    pushEv('commentary',
      'THE ANCIENT ENRAGES AT 50% HP! Forest Wraiths erupt from the grove floor — adds swarm the arena! ' +
      tagline(W,'arcanist') + ' pivots immediately with ' + ultName(W,'arcanist') + ' to clear the Wraiths. ' +
      tagline(W,'hunter') + ' — ' + statFlair(hunterAdapt, COMPOSURE_HIGH, COMPOSURE_LOW) +
      " — keeps the DPS rolling through the chaos. The Ancient's fury is no match for this team.",
      W === 'blue' ? 'bluePush' : 'redPush'
    );
    // In close matches, the loser makes a desperate counter-play
    if (isClose) {
      _ms.t += rand(0.3, 0.7);
      doKill(
        L,
        tagline(L,'arcanist') + ' teleports back for a desperation split! ' +
        Lname + ' pick off an isolated target — but the Ancient is already at 20% HP.',
        L === 'blue' ? 'bluePush' : 'redPush'
      );
    }
  }

  // ── Game end ──────────────────────────────────────────────────────────────────
  _ms.t += rand(1.0, 2.0);
  var style = margin >= 8 ? pick(DOMINANT_WIN) : pick(CLOSE_WIN);
  _ms.adv = W === 'blue' ? rInt(72, 90) : rInt(10, 28);
  // Reference the winning comp synergy if one exists
  var wSyn = (W === 'blue' ? (_ms.draft && _ms.draft.blueSynergies[0]) : (_ms.draft && _ms.draft.redSynergies[0]));
  var synLine = wSyn ? ' Their ' + wSyn.name + ' was the key.' : '';

  pushEv('result',
    'VICTORY \u2014 ' + Wname + ' defeat ' + Lname + ' ' + style + '! ' +
    'The Corrupted Ancient falls at ' + fmt(_ms.t) + '.' + synLine + ' ' +
    'Final: ' + _ms.blueName + ' ' + _ms.blue.kills + 'K / ' + _ms.redName + ' ' + _ms.red.kills + 'K',
    W === 'blue' ? 'bluePush' : 'redPush',
    { gameOver: true, winnerBlue: W === 'blue' }
  );
}

// ─── SECTION 13: Main simulateMatch ───────────────────────────────────────────

// preDraft is optional — pass the draft shown on the draft screen so the
// simulation uses exactly what the player saw (avoids a second random draft).
function simulateMatch(blueTeamArr, redTeamArr, blueName, redName, preDraft) {
  // Resolve team playstyles from live G state when available
  var blueStyle = 'engage', redStyle = 'engage';
  if (typeof G !== 'undefined' && G) {
    var blueTeamId = null, redTeamId = null;
    blueTeamArr.forEach(function(pl) { if (pl && pl.teamId && !blueTeamId) blueTeamId = pl.teamId; });
    redTeamArr.forEach(function(pl)  { if (pl && pl.teamId && !redTeamId)  redTeamId  = pl.teamId; });
    if (blueTeamId && G.teams[blueTeamId]) blueStyle = G.teams[blueTeamId].tactics.playstyle || 'engage';
    if (redTeamId  && G.teams[redTeamId])  redStyle  = G.teams[redTeamId].tactics.playstyle  || 'engage';
  }

  // Use pre-built draft if provided (avoids double-drafting when player saw the draft screen)
  var draft = preDraft || draftChampions(blueTeamArr, redTeamArr);

  // Pre-determine match winner: role power + playstyle bonus + draft counter edge
  var bPow = blueTeamArr.reduce(function(s,pl) { return s + (pl ? calcRolePower(pl) : 10); }, 0);
  var rPow = redTeamArr.reduce(function(s,pl)  { return s + (pl ? calcRolePower(pl) : 10); }, 0);
  var bStyleBonus = Object.values(PLAYSTYLE_MODS[blueStyle] && PLAYSTYLE_MODS[blueStyle].bonus || {}).reduce(function(s,v){ return s+v; }, 0) * 0.15;
  var rStyleBonus = Object.values(PLAYSTYLE_MODS[redStyle]  && PLAYSTYLE_MODS[redStyle].bonus  || {}).reduce(function(s,v){ return s+v; }, 0) * 0.15;
  var diff        = (bPow + bStyleBonus) - (rPow + rStyleBonus) + draft.counterScore;
  var bWinChance  = clamp(50 + diff * 1.8, 12, 88);
  var blueWins    = chance(bWinChance);

  // Initialise match state
  initMatchState(blueTeamArr, redTeamArr, blueName, redName, blueStyle, redStyle);
  _ms.draft  = draft;
  _ms.winner = blueWins ? 'blue' : 'red';
  _ms.adv    = blueWins
    ? clamp(50 + diff * 1.5, 50, 78)
    : clamp(50 - diff * 1.5, 22, 50);

  // Run all three phases
  runSeedling();
  runGrowth();
  runBloom();

  var buildPlayerStats = function(sideArr, perf, draftPicks) {
    return sideArr.map(function(pl, i) {
      var champion = draftPicks && draftPicks[i] ? draftPicks[i].champion : '???';
      return {
        name:      pl ? pl.name     : '?',
        pos:       POSITIONS[i],
        champion:  champion,
        kills:     perf[i].kills,
        deaths:    perf[i].deaths,
        assists:   perf[i].assists,
      };
    });
  };

  return {
    winner:        _ms.winner,
    events:        _ev,
    blueKills:     _ms.blue.kills,
    redKills:      _ms.red.kills,
    blueShrines:   _ms.blue.shrines,
    redShrines:    _ms.red.shrines,
    blueRoots:     _ms.blue.roots,
    redRoots:      _ms.red.roots,
    duration:      Math.floor(_ms.t),
    draft:         draft,
    goldSnapshots: _ms.goldSnapshots,
    blueGoldFinal: _ms.blue.gold,
    redGoldFinal:  _ms.red.gold,
    playerStats: {
      blue: buildPlayerStats(_ms.blue.players, _ms.blue.perf, draft ? draft.blue : null),
      red:  buildPlayerStats(_ms.red.players,  _ms.red.perf,  draft ? draft.red  : null),
    },
  };
}
