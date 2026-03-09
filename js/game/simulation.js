// js/game/simulation.js — Stateful LoL match simulation engine v3
//
// Core principle: a GameState object is threaded through every phase.
// Every fight reads live player counts, buffs, and gold from state before
// resolving. Kill counts are bounded by alive players. Death timers prevent
// dead players from participating in the next fight. Baron buff is a state
// flag that explicitly multiplies the buffed team's fight score — never the
// wrong team. All stats emerge from simulation events; PBP and results are
// always consistent because they share the same tally.

// ─── Utilities ────────────────────────────────────────────────────────────────

function rand(min, max)   { return Math.random() * (max - min) + min; }
function randInt(min, max){ return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function chance(pct)      { return Math.random() * 100 < pct; }
function randFrom(arr)    { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArr(a)    { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b; }

// Formats a float minute value → "MM:SS"
function padTime(m, s) {
  if (s === undefined) {
    const min = Math.floor(m), sec = Math.floor((m - min) * 60);
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── Death Timers ─────────────────────────────────────────────────────────────
// Returns respawn delay in minutes, matching real LoL scaling.
function deathTimer(minute) {
  if (minute < 15) return 0.25;   // ~15 s early game
  if (minute < 25) return 0.50;   // ~30 s mid game
  if (minute < 33) return 0.75;   // ~45 s late game
  return 1.0;                     // ~60 s very late game
}

// ─── Player Helpers ───────────────────────────────────────────────────────────

const POSITIONS = ['top', 'jungle', 'mid', 'adc', 'support'];

function playerAt(team, pos) {
  const p = team.find(p => p && p.position === pos);
  return p ? p.name : {top:'the top laner',jungle:'the jungler',mid:'the mid laner',adc:'the ADC',support:'the support'}[pos] || 'a player';
}
function playerWithChamp(team, pos) {
  const p = team.find(p => p && p.position === pos);
  if (!p) return playerAt(team, pos);
  return p.champion ? `${p.name} (${p.champion})` : p.name;
}
function randPlayer(team) {
  const v = team.filter(Boolean);
  return v.length ? v[randInt(0, v.length-1)].name : 'a player';
}

// ─── Team Ratings ─────────────────────────────────────────────────────────────

const FILLER = { mechanics:42, laning:42, gameSense:42, teamfighting:42, communication:42, clutch:42, consistency:42, draftIQ:42 };

function getStats(player) { return player ? getEffectiveStats(player) : { ...FILLER }; }
function avgStat(team, stat) {
  const vals = team.map(p => getStats(p)[stat]);
  return vals.reduce((a,b) => a+b, 0) / vals.length;
}

function calcTeamRatings(team) {
  const traits  = calcTraitSynergies(team);
  const region  = calcRegionSynergy(team);
  const boosted = team.map(p => {
    const base = getStats(p);
    return applyBonuses(base, traits, region, p || null);
  });
  const avg = stat => boosted.reduce((a, s) => a + s[stat], 0) / boosted.length;
  const jStats  = boosted[CONFIG.POSITIONS.indexOf('jungle')] || FILLER;
  const adcStats= boosted[CONFIG.POSITIONS.indexOf('adc')]    || FILLER;
  return {
    earlyRating:  avg('laning')       * 0.45 + avg('mechanics')    * 0.35 + avg('gameSense')    * 0.20,
    jungleRating: jStats.gameSense    * 0.40 + jStats.mechanics     * 0.40 + jStats.laning       * 0.20,
    tfRating:     avg('teamfighting') * 0.45 + avg('mechanics')     * 0.30 + avg('communication')* 0.25,
    lateRating:   avg('gameSense')    * 0.40 + avg('clutch')        * 0.35 + avg('teamfighting') * 0.25,
    draftRating:  avg('draftIQ')      * 0.70 + avg('gameSense')     * 0.30,
    adcRating:    adcStats.mechanics  * 0.50 + adcStats.teamfighting* 0.30 + adcStats.consistency* 0.20,
    consistency:  avg('consistency'),
    clutchRating: avg('clutch'),
  };
}

// ─── Game State ────────────────────────────────────────────────────────────────
// Threaded through all phases. Every fight reads from and writes to this object.

function createState() {
  return {
    t: 0,
    // Per-team gold — grows from CS income added at phase boundaries
    gold: { blue: 1500, red: 1500 },
    // respawn[side][position] = minute the player is available again (0 = alive now)
    respawn: {
      blue: { top:0, jungle:0, mid:0, adc:0, support:0 },
      red:  { top:0, jungle:0, mid:0, adc:0, support:0 },
    },
    // Active buffs — explicitly tracked so the right team benefits
    buffs: {
      baronBlue: 0,    // minute baron buff expires for blue (0 = no buff)
      baronRed:  0,    // minute baron buff expires for red
      soulBlue:  false,
      soulRed:   false,
    },
    objectives: {
      towers:  { blue:0, red:0 },
      dragons: { blue:0, red:0 },
      barons:  { blue:0, red:0 },
      inhibDown: { blue:[], red:[] }, // lanes with inhibitors down
    },
    nextDragon: 5.0,   // minute next dragon spawns
    nextBaron:  20.0,  // minute baron first spawns
    drakePool:  [],
    dIdx:       0,
    mapAdvantage: 50,  // 0-100, >50 = blue advantaged
    gameOver: false,
    winner: null,
  };
}

// CS gold per team per minute (real LoL: ~21 minions × ~31g = ~650g/min/team)
function addCSGold(state, fromMin, toMin) {
  const g = Math.round((toMin - fromMin) * 650);
  state.gold.blue += g;
  state.gold.red  += g;
}

// ─── Tally System ─────────────────────────────────────────────────────────────

const KILL_WEIGHT   = { top:2, jungle:2, mid:3, adc:3, support:1 };
const DEATH_WEIGHT  = { top:2, jungle:2, mid:2, adc:2, support:3 };
const ASSIST_WEIGHT = { top:1, jungle:2, mid:2, adc:1, support:3 };

function pickPos(weights) {
  let total = 0;
  for (const w of Object.values(weights)) total += w;
  let r = Math.random() * total;
  for (const [pos, w] of Object.entries(weights)) { r -= w; if (r <= 0) return pos; }
  return Object.keys(weights)[0];
}

function makeTally() {
  return {
    blue: { kills:0, towers:0, dragons:0, barons:0, gold:0 },
    red:  { kills:0, towers:0, dragons:0, barons:0, gold:0 },
    blueKDA: null,
    redKDA:  null,
    goldDiff: 0,
  };
}

function initKDA(tally, blue, red) {
  const kda = (team) => {
    const obj = {};
    CONFIG.POSITIONS.forEach((pos, i) => {
      const p = team[i];
      obj[pos] = { k:0, d:0, a:0, name: p?.name || '—', champion: p?.champion || '' };
    });
    return obj;
  };
  tally.blueKDA = kda(blue);
  tally.redKDA  = kda(red);
}

function recordKill(tally, attSide, defSide) {
  const aKDA = tally[attSide + 'KDA'];
  const dKDA = tally[defSide + 'KDA'];
  const killerPos = pickPos(KILL_WEIGHT);
  const victimPos = pickPos(DEATH_WEIGHT);
  if (aKDA) aKDA[killerPos].k++;
  if (dKDA) dKDA[victimPos].d++;
  tally[attSide].kills++;
  const others = CONFIG.POSITIONS.filter(p => p !== killerPos);
  const assistW = {};
  others.forEach(p => assistW[p] = ASSIST_WEIGHT[p] || 1);
  const assistCount = randInt(1, Math.min(3, others.length));
  for (let i = 0; i < assistCount; i++) {
    if (!Object.keys(assistW).length) break;
    const ap = pickPos(assistW);
    if (aKDA) aKDA[ap].a++;
    delete assistW[ap];
  }
  const g = 300 + assistCount * 50;
  tally[attSide].gold += g;
  tally.goldDiff += attSide === 'blue' ? g : -g;
}

function recordObj(tally, type, isBlue) {
  const side = isBlue ? 'blue' : 'red';
  const GOLD = { tower:175, dragon:150, baron:300 };
  tally[side][type + 's']++;
  const g = GOLD[type] || 0;
  tally[side].gold += g;
  tally.goldDiff += isBlue ? g : -g;
}

// ─── Fight Engine ─────────────────────────────────────────────────────────────
// All kills are bounded by alive player counts. Never > 5 per side.

function countAlive(state, side) {
  return POSITIONS.filter(pos => state.respawn[side][pos] <= state.t).length;
}
function getAlivePosns(state, side) {
  return POSITIONS.filter(pos => state.respawn[side][pos] <= state.t);
}

// Returns the effective fight score for a team, incorporating all state buffs.
function effectiveScore(state, baseScore, side) {
  const alive     = countAlive(state, side);
  if (alive === 0) return 0;
  const numerical = alive / 5;                                  // 4v5 = 0.8×
  const baron     = (side==='blue' ? state.buffs.baronBlue : state.buffs.baronRed) > state.t ? 1.25 : 1.0;
  const soul      = (side==='blue' ? state.buffs.soulBlue  : state.buffs.soulRed)  ? 1.12 : 1.0;
  const items     = 1.0 + Math.min(state.gold[side] / 110000, 0.28); // up to +28% from items
  return baseScore * numerical * baron * soul * items;
}

// Resolve a fight from current state. Returns winner and BOUNDED kill counts.
function resolveFight(state, blueScore, redScore) {
  const blueAlive = countAlive(state, 'blue');
  const redAlive  = countAlive(state, 'red');

  // Edge cases: if one side has no one alive, other side wins uncontested
  if (blueAlive === 0 && redAlive === 0) return { blueWins:true, winnerKills:0, loserKills:0, blueAlive, redAlive };
  if (blueAlive === 0) return { blueWins:false, winnerKills:0, loserKills:0, blueAlive, redAlive };
  if (redAlive  === 0) return { blueWins:true,  winnerKills:0, loserKills:0, blueAlive, redAlive };

  const blueEff = effectiveScore(state, blueScore, 'blue');
  const redEff  = effectiveScore(state, redScore,  'red');
  const diff    = blueEff - redEff;
  const blueWinChance = clamp(50 + diff * 0.30, 12, 88);
  const blueWins = chance(blueWinChance);

  const winAlive  = blueWins ? blueAlive : redAlive;
  const loseAlive = blueWins ? redAlive  : blueAlive;
  const dominance = blueWins ? blueWinChance : (100 - blueWinChance); // 50-88

  // killFrac: 0 = close win (kill ~40% of enemies), 1 = stomp (kill 90%+)
  const killFrac = clamp((dominance - 50) / 38, 0, 1);

  // winnerKills: at least 1, at most all losers alive, scaled by dominance
  const minWK = 1;
  const maxWK = loseAlive;
  const winnerKills = clamp(Math.round(minWK + (maxWK - minWK) * killFrac + (Math.random()-0.5)), minWK, maxWK);

  // loserKills: 0 in a stomp, up to (winAlive-1) in a very close fight — never kills ALL winners
  const maxLK = Math.max(0, Math.floor(winAlive * (1 - killFrac) * 0.5));
  const loserKills = clamp(randInt(0, maxLK), 0, winAlive - 1);

  return { blueWins, winnerKills, loserKills, blueAlive, redAlive };
}

// Apply fight result: set respawn timers, record kills to tally.
// Returns { winSide, loseSide, deadPositions }
function applyFight(state, result, tally) {
  const { blueWins, winnerKills, loserKills } = result;
  const winSide  = blueWins ? 'blue' : 'red';
  const loseSide = blueWins ? 'red'  : 'blue';
  const timer    = deathTimer(state.t);

  const loseAlivePosns = getAlivePosns(state, loseSide);
  const winAlivePosns  = getAlivePosns(state, winSide);

  const loseDead = shuffleArr(loseAlivePosns).slice(0, winnerKills);
  const winDead  = shuffleArr(winAlivePosns).slice(0, loserKills);

  loseDead.forEach(pos => {
    state.respawn[loseSide][pos] = state.t + timer;
    recordKill(tally, winSide, loseSide);
  });
  winDead.forEach(pos => {
    state.respawn[winSide][pos] = state.t + timer;
    recordKill(tally, loseSide, winSide);
  });

  // Gold flows into state for item power calculations
  state.gold[winSide]  += winnerKills * 350;
  state.gold[loseSide] += loserKills  * 350;

  return { winSide, loseSide, loseDead, winDead };
}

// Formatted fight score text: "3-for-1"
function fightScore(result) {
  return `${result.winnerKills}-for-${result.loserKills}`;
}

// ─── Champion Draft ───────────────────────────────────────────────────────────

function draftChampions(blueTeam, redTeam) {
  const picks = { blue: [], red: [] };
  const globalPicked = new Set();

  [blueTeam, redTeam].forEach((team, ti) => {
    const side = ti === 0 ? 'blue' : 'red';
    team.forEach(player => {
      if (!player) { picks[side].push(null); return; }
      const stats = getEffectiveStats(player);
      const pool  = player.champions || [];
      if (!pool.length) { picks[side].push({ player: player.name, stars: player.stars, champion: '?', position: player.position }); return; }
      const available = pool.filter(c => !globalPicked.has(c));
      const pickPool  = available.length ? available : pool;
      const draftRoll = Math.random() * 100;
      const idx = draftRoll < stats.draftIQ ? 0 : randInt(0, pickPool.length - 1);
      const champion = pickPool[idx];
      if (champion && available.includes(champion)) globalPicked.add(champion);
      player.champion = champion;
      picks[side].push({ player: player.name, stars: player.stars, champion, position: player.position });
    });
  });

  const blueComp = getCompType(blueTeam.map((p,i) => p ? {...p, champion: picks.blue[i]?.champion} : null));
  const redComp  = getCompType(redTeam.map((p,i)  => p ? {...p, champion: picks.red[i]?.champion}  : null));

  return { blue: picks.blue, red: picks.red, blueComp, redComp };
}

// ─── Laning Phase (0–14 min) ──────────────────────────────────────────────────

function simulateLaning(blue, red, bR, rR, state, events, tally) {
  addCSGold(state, 0, 14);
  const drakeTypes = ['Infernal','Mountain','Ocean','Cloud','Hextech','Chemtech'];
  state.drakePool = shuffleArr([...drakeTypes]);

  // ── First Blood (3–7 min) ──────────────────────────────────────────────────
  state.t = 3 + Math.random() * 4;
  {
    const fbBlue  = chance(50 + (bR.earlyRating - rR.earlyRating) * 0.4);
    const attSide = fbBlue ? 'blue' : 'red';
    const defSide = fbBlue ? 'red'  : 'blue';
    const attTeam = fbBlue ? blue   : red;
    const defTeam = fbBlue ? red    : blue;
    const killer  = playerWithChamp(attTeam, chance(60) ? 'jungle' : 'mid');
    const victimPos = randFrom(['mid','top','jungle']);
    const victim  = playerAt(defTeam, victimPos);
    state.respawn[defSide][victimPos] = state.t + deathTimer(state.t);
    recordKill(tally, attSide, defSide);
    state.gold[attSide] += 100; // first blood bonus
    state.mapAdvantage = clamp(state.mapAdvantage + (fbBlue ? 5 : -5), 5, 95);
    events.push({
      time: padTime(state.t), text: `⚔️ FIRST BLOOD! ${killer} eliminates ${victim}!`,
      type: 'kill', phase: 'laning', killBlue: fbBlue,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Gank (5–10 min) ───────────────────────────────────────────────────────
  state.t = 5 + Math.random() * 5;
  {
    const gankBlue = chance(50 + (bR.jungleRating - rR.jungleRating) * 0.4);
    const attSide  = gankBlue ? 'blue' : 'red';
    const defSide  = gankBlue ? 'red'  : 'blue';
    const attTeam  = gankBlue ? blue   : red;
    const defTeam  = gankBlue ? red    : blue;
    const jg       = playerWithChamp(attTeam, 'jungle');
    const gankLane = randFrom(['top','mid','bot']);
    const victimPos = gankLane === 'bot' ? 'adc' : gankLane;
    const victim   = playerAt(defTeam, victimPos);
    if (chance(65) && state.respawn[defSide][victimPos] <= state.t) {
      state.respawn[defSide][victimPos] = state.t + deathTimer(state.t);
      recordKill(tally, attSide, defSide);
      state.mapAdvantage = clamp(state.mapAdvantage + (gankBlue ? 4 : -4), 5, 95);
      events.push({
        time: padTime(state.t), text: `🗺️ ${jg} ganks ${gankLane} — ${victim} is caught out and goes down!`,
        type: 'kill', phase: 'laning', killBlue: gankBlue,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    } else {
      events.push({
        time: padTime(state.t), text: `🗺️ ${jg} rotates to ${gankLane} but wards spot it — ${victim} backs off safely.`,
        type: 'commentary', phase: 'laning',
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── Dragon 1 (5–8 min) ────────────────────────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextDragon);
  {
    const d1Score  = bR.jungleRating * 0.5 + bR.earlyRating * 0.5;
    const d1ScoreR = rR.jungleRating * 0.5 + rR.earlyRating * 0.5;
    const result   = resolveFight(state, d1Score, d1ScoreR);
    const d1Type   = state.drakePool[state.dIdx++];
    const { winSide } = applyFight(state, result, tally);
    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 4 : -4), 5, 95);
    const jg = playerAt(result.blueWins ? blue : red, 'jungle');
    if (result.winnerKills + result.loserKills > 0) {
      events.push({
        time: padTime(state.t),
        text: `🐉 ${d1Type} Dragon: ${winSide === 'blue' ? 'Blue' : 'Red'} side wins the fight ${fightScore(result)} and secures the drake!`,
        type: 'objective', phase: 'laning', dragonBlue: result.blueWins, killBlue: result.blueWins,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    } else {
      events.push({
        time: padTime(state.t),
        text: `🐉 ${jg} secures the ${d1Type} Dragon uncontested — early objective control established.`,
        type: 'objective', phase: 'laning', dragonBlue: result.blueWins,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── Rift Herald (8–12 min) ────────────────────────────────────────────────
  state.t = Math.max(state.t + 1, 8 + Math.random() * 4);
  {
    const result = resolveFight(state, bR.jungleRating, rR.jungleRating);
    const { winSide } = applyFight(state, result, tally);
    const rhLane = chance(50) ? 'top' : 'mid';
    const jg     = playerWithChamp(result.blueWins ? blue : red, 'jungle');
    state.objectives.towers[winSide]++;
    recordObj(tally, 'tower', result.blueWins);
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 5 : -5), 5, 95);
    const killLine = result.winnerKills > 0 ? ` ${fightScore(result)} fight beforehand.` : '';
    events.push({
      time: padTime(state.t),
      text: `🔮 ${jg} secures Rift Herald for ${winSide === 'blue' ? 'Blue' : 'Red'} side — it crashes into ${rhLane} and the tower crumbles!${killLine}`,
      type: 'objective', phase: 'laning', towerBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Bot lane skirmish (8–12 min, 55% chance) ──────────────────────────────
  state.t = Math.max(state.t + 0.5, 8 + Math.random() * 4);
  if (chance(55)) {
    // 2v2 only — fake a 2-alive state: only adc/support participate
    const botState = {
      ...state,
      respawn: {
        blue: { top: state.t+99, jungle: state.t+99, mid: state.t+99, adc: Math.max(0, state.respawn.blue.adc), support: Math.max(0, state.respawn.blue.support) },
        red:  { top: state.t+99, jungle: state.t+99, mid: state.t+99, adc: Math.max(0, state.respawn.red.adc),  support: Math.max(0, state.respawn.red.support)  },
      },
      buffs: { ...state.buffs },
      gold:  { ...state.gold },
    };
    const blueBot = (blue.find(p=>p?.position==='adc')?.earlyRating||70);
    const redBot  = (red.find(p=>p?.position==='adc')?.earlyRating||70);
    const result  = resolveFight(botState, blueBot, redBot);
    // Apply only kills (respawn timers already live in state.respawn)
    const winSide  = result.blueWins ? 'blue' : 'red';
    const loseSide = result.blueWins ? 'red'  : 'blue';
    const kills    = Math.min(2, result.winnerKills);
    const losses   = Math.min(1, result.loserKills);
    for (let i = 0; i < kills;  i++) recordKill(tally, winSide, loseSide);
    for (let i = 0; i < losses; i++) recordKill(tally, loseSide, winSide);
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? kills*2 : -kills*2), 5, 95);
    const adc = playerWithChamp(result.blueWins ? blue : red, 'adc');
    events.push({
      time: padTime(state.t),
      text: `🏹 ${winSide === 'blue' ? 'Blue' : 'Red'} side wins a ${kills}-for-${losses} skirmish in bot — ${adc} picks up kills!`,
      type: 'kill', phase: 'laning', killBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── First Tower (10–14 min) ───────────────────────────────────────────────
  state.t = Math.max(state.t + 1, 10 + Math.random() * 4);
  {
    const blueScore = bR.earlyRating * 0.7 + bR.jungleRating * 0.3;
    const redScore  = rR.earlyRating * 0.7 + rR.jungleRating * 0.3;
    const towerBlue = chance(50 + (blueScore - redScore) * 0.5);
    const winSide   = towerBlue ? 'blue' : 'red';
    const towerLane = randFrom(['top','mid','bot']);
    state.objectives.towers[winSide]++;
    recordObj(tally, 'tower', towerBlue);
    state.mapAdvantage = clamp(state.mapAdvantage + (towerBlue ? 6 : -6), 5, 95);
    events.push({
      time: padTime(state.t),
      text: `🏰 ${winSide === 'blue' ? 'Blue' : 'Red'} side secures First Tower in ${towerLane}!`,
      type: 'objective', phase: 'laning', towerBlue,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  state.t = 14;
}

// ─── Mid Game (14–26 min) ─────────────────────────────────────────────────────

function simulateMidGame(blue, red, bR, rR, state, events, tally) {
  addCSGold(state, 14, 26);
  const objR = (r) => r.tfRating * 0.55 + r.jungleRating * 0.45;

  // ── Dragon 2 (≥nextDragon, ~14–18 min) ───────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextDragon);
  {
    const result = resolveFight(state, objR(bR), objR(rR));
    const d2Type = state.drakePool[state.dIdx++ % state.drakePool.length];
    const { winSide } = applyFight(state, result, tally);
    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 5 : -5), 5, 95);
    const jg = playerAt(result.blueWins ? blue : red, 'jungle');
    if (result.winnerKills + result.loserKills > 0) {
      events.push({
        time: padTime(state.t),
        text: `🐉 ${d2Type} Dragon: ${winSide === 'blue' ? 'Blue' : 'Red'} side wins ${fightScore(result)} and takes the drake!`,
        type: 'objective', phase: 'midgame', dragonBlue: result.blueWins, killBlue: result.blueWins,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    } else {
      events.push({
        time: padTime(state.t),
        text: `🐉 ${jg} secures the ${d2Type} Dragon for ${winSide === 'blue' ? 'Blue' : 'Red'} side.`,
        type: 'objective', phase: 'midgame', dragonBlue: result.blueWins,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── Second tower push (15–19 min, only if one side is clearly ahead) ──────
  state.t = Math.max(state.t + 1, 15 + Math.random() * 4);
  if (Math.abs(state.mapAdvantage - 50) > 8) {
    const towerBlue = state.mapAdvantage > 50;
    const winSide   = towerBlue ? 'blue' : 'red';
    const towerLane = randFrom(['top','bot']);
    state.objectives.towers[winSide]++;
    recordObj(tally, 'tower', towerBlue);
    state.mapAdvantage = clamp(state.mapAdvantage + (towerBlue ? 4 : -4), 5, 95);
    events.push({
      time: padTime(state.t),
      text: `🏰 ${winSide === 'blue' ? 'Blue' : 'Red'} side destroys the ${towerLane} outer tower — lane control secured!`,
      type: 'objective', phase: 'midgame', towerBlue,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Major mid-game teamfight (17–22 min) ──────────────────────────────────
  state.t = Math.max(state.t + 1.5, 17 + Math.random() * 5);
  {
    const result = resolveFight(state, bR.tfRating, rR.tfRating);
    const { winSide } = applyFight(state, result, tally);
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? result.winnerKills*1.5 : -result.winnerKills*1.5), 5, 95);
    // Always push a tower after winning a major teamfight (real LoL)
    const tfTowers = result.winnerKills >= 3 ? randInt(1,2) : 1;
    for (let i = 0; i < tfTowers; i++) {
      state.objectives.towers[winSide]++;
      recordObj(tally, 'tower', result.blueWins);
    }
    const mvp = randPlayer(result.blueWins ? blue : red);
    const towerText = tfTowers > 1 ? ` ${tfTowers} towers fall!` : ' A tower falls!';
    events.push({
      time: padTime(state.t),
      text: `💥 Major teamfight erupts — ${winSide === 'blue' ? 'Blue' : 'Red'} side wins ${fightScore(result)}!${towerText} ${mvp} was massive.`,
      type: 'teamfight', phase: 'midgame',
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Dragon 3 (≥nextDragon, ~19–24 min) ───────────────────────────────────
  state.t = Math.max(state.t + 1, state.nextDragon);
  {
    const result = resolveFight(state, objR(bR), objR(rR));
    const d3Type = state.drakePool[state.dIdx++ % state.drakePool.length];
    const { winSide } = applyFight(state, result, tally);
    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 5 : -5), 5, 95);
    // Check dragon soul (4 dragons)
    let soulText = '';
    if (state.objectives.dragons.blue >= 4 && !state.buffs.soulBlue) { state.buffs.soulBlue = true; soulText = ' 🔥 DRAGON SOUL — Blue side is empowered!'; }
    if (state.objectives.dragons.red  >= 4 && !state.buffs.soulRed)  { state.buffs.soulRed  = true; soulText = ' 🔥 DRAGON SOUL — Red side is empowered!';  }
    events.push({
      time: padTime(state.t),
      text: `🐉 ${d3Type} Dragon secured by ${winSide === 'blue' ? 'Blue' : 'Red'} side.${soulText}`,
      type: 'objective', phase: 'midgame', dragonBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Second mid-game skirmish (23–27 min, 65% chance) ─────────────────────
  state.t = Math.max(state.t + 1, 23 + Math.random() * 4);
  if (chance(65)) {
    const result = resolveFight(state, bR.tfRating, rR.tfRating);
    if (result.winnerKills + result.loserKills > 0) {
      const { winSide } = applyFight(state, result, tally);
      state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? result.winnerKills : -result.winnerKills), 5, 95);
      // Winners rotate to take a tower after skirmish victory (real LoL: almost always)
      if (chance(68)) {
        state.objectives.towers[winSide]++;
        recordObj(tally, 'tower', result.blueWins);
      }
      const player = randPlayer(result.blueWins ? blue : red);
      events.push({
        time: padTime(state.t),
        text: `💥 ${winSide === 'blue' ? 'Blue' : 'Red'} side wins a skirmish ${fightScore(result)} — ${player} extends the lead!`,
        type: 'teamfight', phase: 'midgame',
        tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
        tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── T2 / Inner Tower rotation (25–26 min) ────────────────────────────────
  // Teams capitalize on map control by sieging inner towers before Baron spawns.
  state.t = Math.max(state.t + 0.5, 25);
  {
    const leading = state.mapAdvantage >= 50 ? 'blue' : 'red';
    const leadMag = Math.abs(state.mapAdvantage - 50);
    // If game is close, 50% chance each side takes one; if one side leads, that side takes 1 (sometimes 2)
    const numTowers = leadMag > 15 ? (chance(55) ? 2 : 1) : 1;
    const towerSide = leadMag > 8 ? leading : (chance(50) ? 'blue' : 'red');
    for (let i = 0; i < numTowers; i++) {
      state.objectives.towers[towerSide]++;
      recordObj(tally, 'tower', towerSide === 'blue');
    }
    const lane = randFrom(['top','mid','bot']);
    const sideLabel = towerSide === 'blue' ? 'Blue' : 'Red';
    events.push({
      time: padTime(state.t),
      text: `🏰 ${sideLabel} side rotates to siege the ${lane} inner tower — ${numTowers > 1 ? 'two towers fall before Baron spawns!' : 'inner tower crumbles!'}`,
      type: 'objective', phase: 'midgame', towerBlue: towerSide === 'blue',
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  state.t = 26;
}

// ─── Late Game (26+ min) ──────────────────────────────────────────────────────

function simulateLateGame(blue, red, bR, rR, state, events, tally) {
  addCSGold(state, 26, 36);
  const objR = (r) => r.lateRating * 0.55 + r.tfRating * 0.45;

  // ── Dragon 4 (≥nextDragon, ~26–31 min) ───────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextDragon);
  if (state.t < 34) {
    const result = resolveFight(state, objR(bR), objR(rR));
    const d4Type = state.drakePool[state.dIdx % state.drakePool.length];
    const { winSide } = applyFight(state, result, tally);
    state.objectives.dragons[winSide]++;
    recordObj(tally, 'dragon', result.blueWins);
    state.nextDragon = state.t + 5;
    let soulText = '';
    if (state.objectives.dragons.blue >= 4 && !state.buffs.soulBlue) { state.buffs.soulBlue = true; soulText = ' 🔥 DRAGON SOUL for Blue!'; }
    if (state.objectives.dragons.red  >= 4 && !state.buffs.soulRed)  { state.buffs.soulRed  = true; soulText = ' 🔥 DRAGON SOUL for Red!'; }
    events.push({
      time: padTime(state.t),
      text: `🐉 ${d4Type} Dragon to ${winSide === 'blue' ? 'Blue' : 'Red'} side.${soulText}`,
      type: 'objective', phase: 'lategame', dragonBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Baron Nashor (≥nextBaron, ~26–30 min) ─────────────────────────────────
  state.t = Math.max(state.t + 0.5, state.nextBaron);
  let baronWinSide;
  {
    const result = resolveFight(state, objR(bR), objR(rR));
    const { winSide, loseSide } = applyFight(state, result, tally);
    baronWinSide = winSide;

    state.objectives.barons[winSide]++;
    recordObj(tally, 'baron', result.blueWins);

    // Write baron buff to state for the correct team — this is what the push fight reads
    if (winSide === 'blue') state.buffs.baronBlue = state.t + 3;
    else                    state.buffs.baronRed  = state.t + 3;

    state.nextBaron = state.t + 6;
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 12 : -12), 5, 95);

    const jg  = playerWithChamp(result.blueWins ? blue : red, 'jungle');
    const isSteal = chance(15) && result.loserKills > 0;
    const killLine = result.winnerKills + result.loserKills > 0 ? ` Fight: ${fightScore(result)}.` : '';
    events.push({
      time: padTime(state.t),
      text: isSteal
        ? `🟣 BARON STEAL!! ${jg} smites it away — ${winSide === 'blue' ? 'Blue' : 'Red'} side secures Baron Nashor!${killLine} THE CROWD GOES WILD!`
        : `🟣 Baron Nashor secured by ${winSide === 'blue' ? 'Blue' : 'Red'} side! ${jg} lands the Smite.${killLine} Baron buff active!`,
      type: 'objective', phase: 'lategame', baronBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Baron Push (1–2 min after Baron) ──────────────────────────────────────
  // The buffed team now pushes. The buff is in state.buffs — fight reads it automatically.
  state.t += 1 + Math.random();
  {
    const result   = resolveFight(state, bR.tfRating, rR.tfRating);
    const { winSide, loseSide } = applyFight(state, result, tally);

    // The side that actually has baron buff is who should ideally win this.
    // If the buff team lost the fight, that's a legitimate upset (they got caught).
    const pushSide = winSide;
    const inhibLane = randFrom(['top','mid','bot']);

    // Baron push destroys 2–3 towers and potentially inhibitor
    const towersDown = randInt(2, 3);
    for (let i = 0; i < towersDown; i++) {
      state.objectives.towers[pushSide]++;
      recordObj(tally, 'tower', pushSide === 'blue');
    }

    // Inhibitor falls if dominant win (≥3 kills) or very lopsided map control
    const inhibFalls = result.winnerKills >= 3 || Math.abs(state.mapAdvantage - 50) > 22;
    if (inhibFalls) {
      state.objectives.inhibDown[loseSide].push(inhibLane);
    }

    // Consume baron buff after the push
    if (baronWinSide === 'blue') state.buffs.baronBlue = 0;
    else                         state.buffs.baronRed  = 0;

    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? result.winnerKills*2 : -result.winnerKills*2), 5, 95);
    const inhibText = inhibFalls ? ` The ${inhibLane} inhibitor falls!` : '';
    events.push({
      time: padTime(state.t),
      text: `💥 ${pushSide === 'blue' ? 'Blue' : 'Red'} side uses Baron buff to win ${fightScore(result)} — ${towersDown} towers down!${inhibText}`,
      type: 'teamfight', phase: 'lategame',
      tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
      tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
  }

  // ── Second Baron (only if game is close and 6 min have elapsed) ───────────
  const canSecondBaron = Math.abs(state.mapAdvantage - 50) < 20;
  state.t = Math.max(state.t + 2, state.nextBaron);
  if (canSecondBaron && state.t < 40) {
    const result = resolveFight(state, objR(bR), objR(rR));
    const { winSide } = applyFight(state, result, tally);
    state.objectives.barons[winSide]++;
    recordObj(tally, 'baron', result.blueWins);
    if (winSide === 'blue') state.buffs.baronBlue = state.t + 3;
    else                    state.buffs.baronRed  = state.t + 3;
    state.nextBaron = state.t + 6;
    const killLine = result.winnerKills + result.loserKills > 0 ? ` Fight: ${fightScore(result)}.` : '';
    events.push({
      time: padTime(state.t),
      text: `🟣 Second Baron spawns — ${winSide === 'blue' ? 'Blue' : 'Red'} side secures it!${killLine}`,
      type: 'objective', phase: 'lategame', baronBlue: result.blueWins,
      advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
    });
    // Second baron push: 2 towers
    state.t += 1 + Math.random();
    {
      const pushResult = resolveFight(state, bR.tfRating, rR.tfRating);
      const { winSide: pushSide } = applyFight(state, pushResult, tally);
      const b2Towers = randInt(1, 2);
      for (let i = 0; i < b2Towers; i++) {
        state.objectives.towers[pushSide]++;
        recordObj(tally, 'tower', pushResult.blueWins);
      }
      if (winSide === 'blue') state.buffs.baronBlue = 0;
      else                    state.buffs.baronRed  = 0;
      state.mapAdvantage = clamp(state.mapAdvantage + (pushResult.blueWins ? pushResult.winnerKills*2 : -pushResult.winnerKills*2), 5, 95);
      events.push({
        time: padTime(state.t),
        text: `💥 ${pushSide === 'blue' ? 'Blue' : 'Red'} side uses second Baron buff ${fightScore(pushResult)} — ${b2Towers} more tower${b2Towers>1?'s':''} fall!`,
        type: 'teamfight', phase: 'lategame',
        tfBlueKills: pushResult.blueWins ? pushResult.winnerKills : pushResult.loserKills,
        tfRedKills:  pushResult.blueWins ? pushResult.loserKills  : pushResult.winnerKills,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }
  }

  // ── Final Teamfight ────────────────────────────────────────────────────────
  state.t += 2 + Math.random() * 2;
  {
    const comebackSide = state.mapAdvantage < 50 ? 'blue' : 'red';
    const clutch       = comebackSide === 'blue' ? bR.clutchRating : rR.clutchRating;
    const comeback     = chance(clamp((clutch - 60) * 0.7, 4, 22));

    // For comeback: temporarily level the playing field so the underdog can win
    let result;
    if (comeback) {
      const savedAdv = state.mapAdvantage;
      state.mapAdvantage = 50; // even fight — clutch play neutralises the lead
      result = resolveFight(state, bR.lateRating, rR.lateRating);
      // Force underdog to win
      result.blueWins = comebackSide === 'blue';
      state.mapAdvantage = savedAdv;
    } else {
      result = resolveFight(state, bR.lateRating, rR.lateRating);
    }

    applyFight(state, result, tally);
    const finalWinner = result.blueWins ? 'blue' : 'red';
    state.mapAdvantage = clamp(state.mapAdvantage + (result.blueWins ? 18 : -18), 5, 95);

    // Base towers (2 nexus towers)
    state.objectives.towers[finalWinner] += 2;
    recordObj(tally, 'tower', result.blueWins);
    recordObj(tally, 'tower', result.blueWins);

    const mvp = randPlayer(result.blueWins ? blue : red);
    if (comeback) {
      const hero = playerWithChamp(result.blueWins ? blue : red, randFrom(['mid','adc','jungle']));
      events.push({
        time: padTime(state.t),
        text: `🔥 CLUTCH COMEBACK! ${hero} makes an INSANE play — ${finalWinner === 'blue' ? 'Blue' : 'Red'} side turns it around ${fightScore(result)}! BASE IS OPEN!`,
        type: 'teamfight', phase: 'lategame',
        tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
        tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    } else {
      events.push({
        time: padTime(state.t),
        text: `💥 Final teamfight — ${finalWinner === 'blue' ? 'Blue' : 'Red'} side wins ${fightScore(result)}! ${mvp} pops off — the base is wide open!`,
        type: 'teamfight', phase: 'lategame',
        tfBlueKills: result.blueWins ? result.winnerKills : result.loserKills,
        tfRedKills:  result.blueWins ? result.loserKills  : result.winnerKills,
        advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
      });
    }

    state.winner = finalWinner;
  }

  // ── Nexus falls (1–2 min after final fight) ───────────────────────────────
  const nexusMin = state.t + 1 + Math.random();
  const winTeam  = state.winner === 'blue' ? blue : red;
  events.push({
    time: padTime(nexusMin),
    text: `🏆 NEXUS DESTROYED! ${state.winner === 'blue' ? 'Blue' : 'Red'} side wins the match! GG WP`,
    type: 'result', phase: 'lategame',
    advAfter: state.mapAdvantage, goldDiff: tally.goldDiff,
  });
}

// ─── Main Match Simulator ─────────────────────────────────────────────────────

function padToPositions(team) {
  return CONFIG.POSITIONS.map(pos => team.find(p => p && p.position === pos) || null);
}

function simulateMatch(blueTeam, redTeam, blueTeamName, redTeamName) {
  const blue = padToPositions(blueTeam);
  const red  = padToPositions(redTeam);

  const draft = draftChampions(blue, red);
  const tally = makeTally();
  initKDA(tally, blue, red);

  const bR = calcTeamRatings(blue);
  const rR = calcTeamRatings(red);

  const state = createState();
  // Draft advantage seeds initial map control
  state.mapAdvantage = clamp(50 + (bR.draftRating - rR.draftRating) * 0.15, 40, 60);

  const laningEvents = [], midEvents = [], lateEvents = [];

  simulateLaning(blue, red, bR, rR, state, laningEvents, tally);

  // Early stomp: if one team dominates laning phase
  if (state.mapAdvantage >= 82 || state.mapAdvantage <= 18) {
    const earlyWin = state.mapAdvantage >= 50;
    const earlyMin = randInt(18, 22);
    lateEvents.push({
      time: padTime(earlyMin, 0),
      text: `🏆 EARLY SURRENDER! ${earlyWin ? blueTeamName : redTeamName} completely dominates — GG WP!`,
      type: 'result', phase: 'lategame', goldDiff: tally.goldDiff,
    });
    const csPerMin = 700;
    tally.blue.gold += Math.round(earlyMin * csPerMin * (earlyWin ? 0.55 : 0.45));
    tally.red.gold  += Math.round(earlyMin * csPerMin * (earlyWin ? 0.45 : 0.55));
    const stats = { blue: { ...tally.blue, kda: tally.blueKDA }, red: { ...tally.red, kda: tally.redKDA } };
    return { winner: earlyWin ? 'blue' : 'red', events: { laning: laningEvents, midgame: [], lategame: lateEvents }, stats, draft, advantage: state.mapAdvantage, ratings: { blue: bR, red: rR } };
  }

  simulateMidGame(blue, red, bR, rR, state, midEvents, tally);
  simulateLateGame(blue, red, bR, rR, state, lateEvents, tally);

  // CS gold estimate based on actual game length
  const nexusEv = lateEvents.find(e => e.type === 'result');
  const gameMin = nexusEv ? (parseFloat(nexusEv.time) || 35) : 35;
  const blueWins = state.winner === 'blue';
  tally.blue.gold += Math.round(gameMin * 700 * (blueWins ? 0.52 : 0.48));
  tally.red.gold  += Math.round(gameMin * 700 * (blueWins ? 0.48 : 0.52));

  const stats = { blue: { ...tally.blue, kda: tally.blueKDA }, red: { ...tally.red, kda: tally.redKDA } };

  const sortByTime = evs => evs.slice().sort((a, b) => {
    const toSec = t => { if (!t) return 9999; const [m,s]=(t+'').split(':').map(Number); return (m||0)*60+(s||0); };
    return toSec(a.time) - toSec(b.time);
  });

  return {
    winner: state.winner || (blueWins ? 'blue' : 'red'),
    events: { laning: sortByTime(laningEvents), midgame: sortByTime(midEvents), lategame: sortByTime(lateEvents) },
    stats,
    draft,
    advantage: state.mapAdvantage,
    ratings: { blue: bR, red: rR },
  };
}

// ─── Quick AI vs AI Simulation ────────────────────────────────────────────────

function quickSimulate(blueTeam, redTeam) {
  if (blueTeam && redTeam && Array.isArray(blueTeam)) {
    const bP = padToPositions(blueTeam.filter(Boolean));
    const rP = padToPositions(redTeam.filter(Boolean));
    const bR = calcTeamRatings(bP);
    const rR = calcTeamRatings(rP);
    const overall = r => (r.earlyRating + r.tfRating + r.lateRating) / 3;
    const diff = (overall(bR) - overall(rR)) * 0.5;
    return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
  }
  const diff = ((blueTeam || 0.5) - (redTeam || 0.5)) * 40;
  return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
}
