// js/game/simulation.js — Match simulation engine
// Pro LoL stat references (calibrated vs real data 2024-2026):
//   Total kills/game: ~26-32 (winner ~16-20, loser ~8-14)
//   Total towers/game: ~10-13 (winner ~7-9, loser ~2-5)
//   Dragons: 4-5 total both sides. Barons: 1-2 total both sides.
//   Game length: 28-40 min (avg ~33 min). Gold per team: ~60-75k.

// ─── Utilities ────────────────────────────────────────────────────────────────

function rand(min, max)   { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi)  { return Math.max(lo, Math.min(hi, v)); }
function chance(pct)       { return Math.random() * 100 < pct; }
function padTime(m, s)     { return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function playerAt(team, pos) {
  const p = team.find(p => p && p.position === pos);
  return p ? p.name : { top:'the top laner', jungle:'the jungler', mid:'the mid laner', adc:'the ADC', support:'the support' }[pos] || 'a player';
}

// Returns "Name (Champion)" for richer PBP commentary
function playerWithChamp(team, pos) {
  const p = team.find(p => p && p.position === pos);
  if (!p) return playerAt(team, pos);
  return p.champion ? `${p.name} (${p.champion})` : p.name;
}
function randPlayer(team) {
  const valid = team.filter(Boolean);
  return valid.length ? valid[randInt(0, valid.length-1)].name : 'a player';
}

// ─── Team Rating Calculation ──────────────────────────────────────────────────

const FILLER = { mechanics:42, laning:42, gameSense:42, teamfighting:42, communication:42, clutch:42, consistency:42, draftIQ:42 };

function getStats(player) {
  return player ? getEffectiveStats(player) : { ...FILLER };
}

function avgStat(team, stat) {
  const vals = team.map(p => getStats(p)[stat]);
  return vals.reduce((a,b) => a+b, 0) / vals.length;
}

function calcTeamRatings(team) {
  // Apply per-player trait and region bonuses
  const traits  = calcTraitSynergies(team);
  const region  = calcRegionSynergy(team);

  const boosted = team.map(p => {
    const base = getStats(p);
    return applyBonuses(base, traits, region, p || null);
  });

  const avg = stat => boosted.reduce((a, s) => a + s[stat], 0) / boosted.length;

  const jStats = boosted[CONFIG.POSITIONS.indexOf('jungle')] || FILLER;
  const adcStats= boosted[CONFIG.POSITIONS.indexOf('adc')]   || FILLER;

  return {
    earlyRating:   avg('laning')        * 0.45 + avg('mechanics')    * 0.35 + avg('gameSense')    * 0.20,
    jungleRating:  jStats.gameSense     * 0.40 + jStats.mechanics     * 0.40 + jStats.laning       * 0.20,
    tfRating:      avg('teamfighting')  * 0.45 + avg('mechanics')     * 0.30 + avg('communication')* 0.25,
    lateRating:    avg('gameSense')     * 0.40 + avg('clutch')        * 0.35 + avg('teamfighting') * 0.25,
    draftRating:   avg('draftIQ')       * 0.70 + avg('gameSense')     * 0.30,
    adcRating:     adcStats.mechanics   * 0.50 + adcStats.teamfighting* 0.30 + adcStats.consistency* 0.20,
    consistency:   avg('consistency'),
    clutchRating:  avg('clutch'),
  };
}

// Resolve a single event: returns true if blue wins the event
function blueWinsEvent(blueScore, redScore, bConsistency, rConsistency) {
  const diff = (blueScore - redScore);
  // Scale: a 20-point rating difference → ±10% chance
  const raw  = clamp(50 + diff * 0.35, 15, 85);
  // Consistency reduces variance (tightens the range toward 50)
  const avgCons = (bConsistency + rConsistency) / 2 / 100;
  const adjusted = 50 + (raw - 50) * (1.2 - avgCons * 0.4);
  return chance(clamp(adjusted, 12, 88));
}

// ─── Match Tally ─────────────────────────────────────────────────────────────
// Accumulates all stats during simulation so PBP and results always agree.

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
  aKDA[killerPos].k++;
  dKDA[victimPos].d++;
  tally[attSide].kills++;
  const others = CONFIG.POSITIONS.filter(p => p !== killerPos);
  const assistW = {};
  others.forEach(p => assistW[p] = ASSIST_WEIGHT[p] || 1);
  const assistCount = randInt(1, Math.min(3, others.length));
  for (let i = 0; i < assistCount; i++) {
    if (!Object.keys(assistW).length) break;
    const ap = pickPos(assistW);
    aKDA[ap].a++;
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

// ─── Champion Draft ───────────────────────────────────────────────────────────

function draftChampions(blueTeam, redTeam) {
  const picks = { blue: [], red: [] };
  const globalPicked = new Set(); // prevent same champion on both teams

  [blueTeam, redTeam].forEach((team, ti) => {
    const side = ti === 0 ? 'blue' : 'red';
    team.forEach(player => {
      if (!player) { picks[side].push(null); return; }
      const stats = getEffectiveStats(player);
      const pool  = player.champions || [];
      if (!pool.length) { picks[side].push({ player: player.name, stars: player.stars, champion: '?', position: player.position }); return; }

      // Filter out already-picked champions; fallback to full pool if all taken
      const available = pool.filter(c => !globalPicked.has(c));
      const pickPool  = available.length ? available : pool;

      // High draftIQ = picks index 0 (best champ) more reliably
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

function simulateLaning(blue, red, bR, rR, events, tally) {
  let adv = 50;

  // First Blood (3–7 min)
  const fbBlue   = blueWinsEvent(bR.earlyRating, rR.earlyRating, bR.consistency, rR.consistency);
  const fbKiller = playerWithChamp(fbBlue ? blue : red, fbBlue ? 'jungle' : 'mid');
  const fbVictim = fbBlue ? playerAt(red, 'mid') : playerAt(blue, 'mid');
  adv = clamp(adv + (fbBlue ? 5 : -5), 5, 95);
  recordKill(tally, fbBlue ? 'blue' : 'red', fbBlue ? 'red' : 'blue');
  events.push({ time: padTime(randInt(3,7), randInt(0,59)), text: `⚔️ FIRST BLOOD! ${fbKiller} eliminates ${fbVictim}!`, type: 'kill', phase: 'laning', killBlue: fbBlue, advAfter: adv, goldDiff: tally.goldDiff });

  // CS/laning advantage (5–8 min)
  const laningBlue = blueWinsEvent(bR.earlyRating, rR.earlyRating, bR.consistency, rR.consistency);
  const csDiff  = randInt(8, 24);
  const csLane  = ['top','mid','bot'][randInt(0,2)];
  const csLaner = laningBlue ? playerAt(blue, csLane === 'bot' ? 'adc' : csLane)
                              : playerAt(red,  csLane === 'bot' ? 'adc' : csLane);
  adv = clamp(adv + (laningBlue ? 3 : -3), 5, 95);
  events.push({ time: padTime(randInt(5,8), randInt(0,59)), text: `📊 ${csLaner} builds a +${csDiff} CS lead in the ${csLane} — the laning phase is swinging their way.`, type: 'commentary', phase: 'laning', advAfter: adv, goldDiff: tally.goldDiff });

  // Gank (6–10 min)
  const gankBlue   = blueWinsEvent(bR.jungleRating, rR.jungleRating, bR.consistency, rR.consistency);
  const gankLane   = ['top', 'mid', 'bot'][randInt(0,2)];
  const gankPos    = gankLane === 'bot' ? 'adc' : gankLane;
  const jgName     = playerWithChamp(gankBlue ? blue : red, 'jungle');
  const gankVictim = gankBlue ? playerAt(red, gankPos) : playerAt(blue, gankPos);
  if (chance(68)) {
    adv = clamp(adv + (gankBlue ? 4 : -4), 5, 95);
    recordKill(tally, gankBlue ? 'blue' : 'red', gankBlue ? 'red' : 'blue');
    events.push({ time: padTime(randInt(6,10), randInt(0,59)), text: `🗺️ ${jgName} ganks ${gankLane} — ${gankVictim} is caught out of position and goes down!`, type: 'kill', phase: 'laning', killBlue: gankBlue, advAfter: adv, goldDiff: tally.goldDiff });
  } else {
    events.push({ time: padTime(randInt(6,10), randInt(0,59)), text: `🗺️ ${jgName} rotates to ${gankLane} but the enemy wards it — ${gankVictim} flashes away just in time!`, type: 'commentary', phase: 'laning', advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Bot lane 2v2 skirmish (8–12 min)
  if (chance(55)) {
    const botBlue  = blueWinsEvent(bR.earlyRating, rR.earlyRating, bR.consistency, rR.consistency);
    const botKills = chance(50) ? 2 : 1;
    adv = clamp(adv + (botBlue ? botKills * 2 : -botKills * 2), 5, 95);
    const adcName  = playerWithChamp(botBlue ? blue : red, 'adc');
    for (let i = 0; i < botKills; i++) recordKill(tally, botBlue ? 'blue' : 'red', botBlue ? 'red' : 'blue');
    events.push({ time: padTime(randInt(8,12), randInt(0,59)), text: `🏹 ${botBlue?'Blue':'Red'} side wins a ${botKills}-for-0 skirmish in bot — ${adcName} picks up the kills!`, type: 'kill', phase: 'laning', killBlue: botBlue, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // First Tower (10–14 min)
  const towerBlue = blueWinsEvent(bR.earlyRating * 0.7 + bR.jungleRating * 0.3,
                                   rR.earlyRating * 0.7 + rR.jungleRating * 0.3,
                                   bR.consistency, rR.consistency);
  const towerLane = ['top', 'mid', 'bot'][randInt(0,2)];
  adv = clamp(adv + (towerBlue ? 6 : -6), 5, 95);
  recordObj(tally, 'tower', towerBlue);
  events.push({ time: padTime(randInt(10,14), randInt(0,59)),
    text: `🏰 ${towerBlue ? 'Blue' : 'Red'} side takes the First Tower in ${towerLane}! Gold lead widening.`,
    type: 'objective', phase: 'laning', towerBlue: towerBlue, advAfter: adv, goldDiff: tally.goldDiff });

  return adv;
}

// ─── Mid Game (14–26 min) ─────────────────────────────────────────────────────

function simulateMidGame(blue, red, bR, rR, advIn, events, tally) {
  let adv = advIn;
  const drakes = shuffleArray([...CONFIG.DRAGON_TYPES]);
  let dIdx = 0;

  const objectiveRating = (r) => r.tfRating * 0.55 + r.jungleRating * 0.45;

  // Dragon 1 (14–17 min)
  const d1Blue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);
  const d1Type = drakes[dIdx++];
  adv = clamp(adv + (d1Blue ? 4 : -4), 5, 95);
  recordObj(tally, 'dragon', d1Blue);
  if (chance(45)) {
    const fightWinner = d1Blue ? randPlayer(blue) : randPlayer(red);
    recordKill(tally, d1Blue ? 'blue' : 'red', d1Blue ? 'red' : 'blue');
    events.push({ time: padTime(randInt(14,17), randInt(0,59)), text: `🐉 ${d1Type} Dragon: ${d1Blue ? 'Blue' : 'Red'} side wins a skirmish — ${fightWinner} gets a kill in the river!`, type: 'objective', phase: 'midgame', dragonBlue: d1Blue, killBlue: d1Blue, advAfter: adv, goldDiff: tally.goldDiff });
  } else {
    events.push({ time: padTime(randInt(14,17), randInt(0,59)), text: `🐉 ${playerAt(d1Blue ? blue : red, 'jungle')} secures the ${d1Type} Dragon. ${d1Blue ? 'Blue' : 'Red'} side takes early drake control.`, type: 'objective', phase: 'midgame', dragonBlue: d1Blue, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Rift Herald (15–18 min)
  const rhBlue = blueWinsEvent(bR.jungleRating, rR.jungleRating, bR.consistency, rR.consistency);
  adv = clamp(adv + (rhBlue ? 3 : -3), 5, 95);
  const rhLane = ['top', 'mid'][randInt(0,1)];
  const rhJg   = playerAt(rhBlue ? blue : red, 'jungle');
  recordObj(tally, 'tower', rhBlue);
  events.push({ time: padTime(randInt(15,18), randInt(0,59)), text: `🔮 ${rhJg} secures Rift Herald for ${rhBlue ? 'blue' : 'red'} side — it's smashed into the ${rhLane} lane and the tower crumbles!`, type: 'objective', phase: 'midgame', towerBlue: rhBlue, advAfter: adv, goldDiff: tally.goldDiff });

  // Second tower (17–21 min, conditional on laning advantage)
  if (adv > 58 || adv < 42) {
    const t2Blue  = adv > 50;
    const t2Lane  = ['top', 'bot'][randInt(0,1)];
    adv = clamp(adv + (t2Blue ? 4 : -4), 5, 95);
    recordObj(tally, 'tower', t2Blue);
    events.push({ time: padTime(randInt(17,21), randInt(0,59)), text: `🏰 ${t2Blue?'Blue':'Red'} side destroys the ${t2Lane} outer tower — full lane control established!`, type: 'objective', phase: 'midgame', towerBlue: t2Blue, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Mid-game teamfight (18–23 min)
  const tf1Blue   = blueWinsEvent(bR.tfRating, rR.tfRating, bR.consistency, rR.consistency);
  const tf1Kills  = randInt(3, 7);
  const tf1Deaths = randInt(1, Math.max(1, tf1Kills - 1));
  adv = clamp(adv + (tf1Blue ? tf1Kills * 1.4 : -tf1Kills * 1.4), 5, 95);
  for (let i = 0; i < tf1Kills;  i++) recordKill(tally, tf1Blue ? 'blue' : 'red', tf1Blue ? 'red' : 'blue');
  for (let i = 0; i < tf1Deaths; i++) recordKill(tally, tf1Blue ? 'red' : 'blue', tf1Blue ? 'blue' : 'red');
  events.push({ time: padTime(randInt(18,23), randInt(0,59)),
    text: `💥 Teamfight breaks out near Dragon pit — ${tf1Blue ? 'Blue' : 'Red'} side wins ${tf1Kills}-for-${tf1Deaths}! ${randPlayer(tf1Blue ? blue : red)} was massive.`,
    type: 'teamfight', phase: 'midgame', tfBlueKills: tf1Blue ? tf1Kills : tf1Deaths, tfRedKills: tf1Blue ? tf1Deaths : tf1Kills, advAfter: adv, goldDiff: tally.goldDiff });

  // Dragon 2 (21–25 min) — 50% chance of a fight
  const d2Blue = blueWinsEvent(objectiveRating(bR) + (adv > 55 ? 5 : 0),
                                objectiveRating(rR) + (adv < 45 ? 5 : 0),
                                bR.consistency, rR.consistency);
  const d2Type = drakes[dIdx++] || drakes[0];
  adv = clamp(adv + (d2Blue ? 5 : -5), 5, 95);
  recordObj(tally, 'dragon', d2Blue);
  if (chance(50)) {
    const d2Kills = randInt(1, 3);
    for (let i = 0; i < d2Kills; i++) recordKill(tally, d2Blue ? 'blue' : 'red', d2Blue ? 'red' : 'blue');
    events.push({ time: padTime(randInt(21,25), randInt(0,59)), text: `🐉 ${d2Type} Dragon contested — ${d2Blue ? 'Blue' : 'Red'} side wins the fight ${d2Kills}-for-0 and secures the drake!`, type: 'objective', phase: 'midgame', dragonBlue: d2Blue, killBlue: d2Blue, advAfter: adv, goldDiff: tally.goldDiff });
  } else {
    events.push({ time: padTime(randInt(21,25), randInt(0,59)), text: `🐉 ${d2Type} Dragon secured by ${d2Blue ? 'blue' : 'red'} side after a quick rotate.`, type: 'objective', phase: 'midgame', dragonBlue: d2Blue, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Second mid-game skirmish (24–27 min) — 70% chance
  if (chance(70)) {
    const sk2Blue   = blueWinsEvent(bR.tfRating, rR.tfRating, bR.consistency, rR.consistency);
    const sk2Kills  = randInt(2, 5);
    const sk2Deaths = randInt(0, Math.max(0, sk2Kills - 1));
    adv = clamp(adv + (sk2Blue ? sk2Kills : -sk2Kills), 5, 95);
    for (let i = 0; i < sk2Kills;  i++) recordKill(tally, sk2Blue ? 'blue' : 'red', sk2Blue ? 'red' : 'blue');
    for (let i = 0; i < sk2Deaths; i++) recordKill(tally, sk2Blue ? 'red' : 'blue', sk2Blue ? 'blue' : 'red');
    if (chance(40)) recordObj(tally, 'tower', sk2Blue);
    const sk2Player = randPlayer(sk2Blue ? blue : red);
    events.push({ time: padTime(randInt(24,27), randInt(0,59)),
      text: `💥 ${sk2Blue ? 'Blue' : 'Red'} side wins a ${sk2Kills}-for-${sk2Deaths} skirmish — ${sk2Player} extends the lead!`,
      type: 'teamfight', phase: 'midgame', tfBlueKills: sk2Blue ? sk2Kills : sk2Deaths, tfRedKills: sk2Blue ? sk2Deaths : sk2Kills, advAfter: adv, goldDiff: tally.goldDiff });
  }

  return { adv, drakes, dIdx };
}

// ─── Late Game (26+ min) ──────────────────────────────────────────────────────
// All event times use a sequential clock so causality is preserved:
// no event can appear before the event that caused it.

function simulateLateGame(blue, red, bR, rR, advIn, events, drakes, dIdx, tally) {
  let adv = advIn;
  const objectiveRating = (r) => r.lateRating * 0.55 + r.tfRating * 0.45;

  // Running clock — each section advances t forward
  let t = 26;

  // Dragon 3 (26–30 min)
  t += randInt(0, 4);
  const d3Min  = t;
  const d3Blue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);
  const d3Type = drakes[dIdx] || drakes[0];
  recordObj(tally, 'dragon', d3Blue);
  adv = clamp(adv + (d3Blue ? 5 : -5), 5, 95);
  const d3Soul = tally.blue.dragons >= 4 ? '🔥 DRAGON SOUL — Blue side is unstoppable!'
               : tally.red.dragons  >= 4 ? '🔥 DRAGON SOUL — Red side is unstoppable!' : '';
  events.push({ time: padTime(d3Min, randInt(0,59)),
    text: `🐉 ${d3Type} Dragon secured by ${d3Blue ? 'blue' : 'red'} side. ${d3Soul}`,
    type: 'objective', phase: 'lategame', dragonBlue: d3Blue, advAfter: adv, goldDiff: tally.goldDiff });

  // Baron Nashor (≥28 min, at least 2 min after dragon 3)
  t = Math.max(28, d3Min + randInt(2, 4));
  const baronMin  = t;
  const baronBlue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);
  let baronWinner;

  if (chance(18)) {
    baronWinner = !baronBlue;
    const stealer = playerWithChamp(baronWinner ? blue : red, 'jungle');
    adv = clamp(adv + (baronWinner ? 12 : -12), 5, 95);
    recordObj(tally, 'baron', baronWinner);
    events.push({ time: padTime(baronMin, randInt(0,59)),
      text: `🟣 BARON STEAL!! ${stealer} smites it away from ${baronWinner ? 'red' : 'blue'} side at the last second! THE CROWD GOES WILD!`,
      type: 'objective', phase: 'lategame', baronBlue: baronWinner, advAfter: adv, goldDiff: tally.goldDiff });
  } else {
    baronWinner = baronBlue;
    const jg = playerWithChamp(baronWinner ? blue : red, 'jungle');
    adv = clamp(adv + (baronWinner ? 10 : -10), 5, 95);
    recordObj(tally, 'baron', baronWinner);
    events.push({ time: padTime(baronMin, randInt(0,59)),
      text: `🟣 BARON NASHOR secured by ${baronWinner ? 'blue' : 'red'} side! ${jg} lands the Smite — buff applied!`,
      type: 'objective', phase: 'lategame', baronBlue: baronWinner, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Dragon 4 (4–6 min after d3, only in non-stomp games)
  const d4Min = d3Min + randInt(4, 6);
  if (adv > 25 && adv < 75) {
    const d4Blue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);
    const d4Type = drakes[(dIdx + 1) % drakes.length];
    recordObj(tally, 'dragon', d4Blue);
    adv = clamp(adv + (d4Blue ? 4 : -4), 5, 95);
    const soulSide = tally.blue.dragons >= 4 ? 'blue' : tally.red.dragons >= 4 ? 'red' : null;
    const soulText = soulSide ? ` 🔥 DRAGON SOUL — ${soulSide === 'blue' ? 'Blue' : 'Red'} side is now empowered!` : '';
    events.push({ time: padTime(d4Min, randInt(0,59)),
      text: `🐉 ${d4Type} Dragon to ${d4Blue ? 'blue' : 'red'} side.${soulText}`,
      type: 'objective', phase: 'lategame', dragonBlue: d4Blue, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Baron push teamfight (2–4 min after baron)
  t = baronMin + randInt(2, 4);
  const pushMin  = t;
  const pushBlue = blueWinsEvent(
    bR.tfRating + (baronWinner ? 18 : 0),
    rR.tfRating + (!baronWinner ? 18 : 0),
    bR.consistency, rR.consistency
  );
  const pushKills = randInt(3, 6);
  const pushLoss  = randInt(0, Math.max(0, pushKills - 2));
  adv = clamp(adv + (pushBlue ? pushKills * 1.6 : -pushKills * 1.6), 5, 95);
  const inhibLane = ['top', 'mid', 'bot'][randInt(0,2)];
  for (let i = 0; i < pushKills; i++) recordKill(tally, pushBlue ? 'blue' : 'red', pushBlue ? 'red' : 'blue');
  for (let i = 0; i < pushLoss;  i++) recordKill(tally, pushBlue ? 'red' : 'blue', pushBlue ? 'blue' : 'red');
  // Baron push destroys the outer tower + inhibitor tower (2–3 structures)
  const pushTowers = randInt(2, 3);
  for (let i = 0; i < pushTowers; i++) recordObj(tally, 'tower', pushBlue);
  events.push({ time: padTime(pushMin, randInt(0,59)),
    text: `💥 ${pushBlue?'Blue':'Red'} side uses Baron buff to win ${pushKills}-for-${pushLoss} — ${inhibLane} inhibitor falls!`,
    type: 'teamfight', phase: 'lategame', tfBlueKills: pushBlue ? pushKills : pushLoss, tfRedKills: pushBlue ? pushLoss : pushKills, advAfter: adv, goldDiff: tally.goldDiff });

  // Second Baron — only in very close games (43–57), exactly 6 min after first, before the final fight
  const secondBaronMin = baronMin + 6;
  if (adv > 43 && adv < 57) {
    t = secondBaronMin;
    const b2Blue = blueWinsEvent(objectiveRating(bR), objectiveRating(rR), bR.consistency, rR.consistency);
    adv = clamp(adv + (b2Blue ? 8 : -8), 5, 95);
    recordObj(tally, 'baron', b2Blue);
    events.push({ time: padTime(t, randInt(0,59)),
      text: `🟣 Second BARON NASHOR spawns — ${b2Blue ? 'blue' : 'red'} side contests and secures it!`,
      type: 'objective', phase: 'lategame', baronBlue: b2Blue, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Final teamfight — 2–4 min after last major event (push or second baron)
  t += randInt(2, 4);
  const finalTFMin      = t;
  const finalBlue       = blueWinsEvent(bR.lateRating, rR.lateRating, bR.consistency, rR.consistency);
  const comebackSide    = !finalBlue;
  const clutchRating    = comebackSide ? bR.clutchRating : rR.clutchRating;
  const comebackHappens = chance(clamp((clutchRating - 60) * 0.7, 4, 24));

  let blueWins;
  if (comebackHappens) {
    blueWins = comebackSide;
    const hero = playerWithChamp(blueWins ? blue : red, ['mid','adc','jungle'][randInt(0,2)]);
    adv = clamp(adv + (blueWins ? 15 : -15), 5, 95);
    for (let i = 0; i < 5; i++) recordKill(tally, blueWins ? 'blue' : 'red', blueWins ? 'red' : 'blue');
    events.push({ time: padTime(finalTFMin, randInt(0,59)),
      text: `🔥 CLUTCH COMEBACK! ${hero} makes an INSANE outplay — ${blueWins ? 'Blue' : 'Red'} side turns the fight around! ACE!`,
      type: 'teamfight', phase: 'lategame', tfBlueKills: blueWins ? 5 : 0, tfRedKills: blueWins ? 0 : 5, advAfter: adv, goldDiff: tally.goldDiff });
  } else {
    blueWins = finalBlue;
    const finalKills = randInt(3, 6);
    const finalLoss  = randInt(0, Math.max(0, finalKills - 1));
    const mvp        = playerWithChamp(blueWins ? blue : red, ['mid','adc'][randInt(0,1)]);
    adv = clamp(adv + (blueWins ? finalKills * 1.5 : -finalKills * 1.5), 5, 95);
    for (let i = 0; i < finalKills; i++) recordKill(tally, blueWins ? 'blue' : 'red', blueWins ? 'red' : 'blue');
    for (let i = 0; i < finalLoss;  i++) recordKill(tally, blueWins ? 'red' : 'blue', blueWins ? 'blue' : 'red');
    events.push({ time: padTime(finalTFMin, randInt(0,59)),
      text: `💥 Final teamfight — ${blueWins ? 'Blue' : 'Red'} side wins ${finalKills}-for-${finalLoss}! ${mvp} absolutely pops off — the base is open!`,
      type: 'teamfight', phase: 'lategame', tfBlueKills: blueWins ? finalKills : finalLoss, tfRedKills: blueWins ? finalLoss : finalKills, advAfter: adv, goldDiff: tally.goldDiff });
  }

  // Winning side destroys the 2 base towers on the way to nexus
  recordObj(tally, 'tower', blueWins);
  recordObj(tally, 'tower', blueWins);

  // Nexus falls 1–3 min after the final fight — always, no exceptions
  const nexusMin = finalTFMin + randInt(1, 3);
  events.push({ time: padTime(nexusMin, randInt(0,59)),
    text: `🏆 NEXUS DESTROYED! ${blueWins ? 'Blue' : 'Red'} side wins the match!`,
    type: 'result', phase: 'lategame', advAfter: adv, goldDiff: tally.goldDiff });

  return { adv, blueWins };
}

// ─── Main Match Simulator ─────────────────────────────────────────────────────

function simulateMatch(blueTeam, redTeam, blueTeamName, redTeamName) {
  const blue = padToPositions(blueTeam);
  const red  = padToPositions(redTeam);

  // Draft (assigns .champion to each player object)
  const draft = draftChampions(blue, red);

  // Create tally AFTER draft so champion names are available
  const tally = makeTally();
  initKDA(tally, blue, red);

  // Team ratings
  const bR = calcTeamRatings(blue);
  const rR = calcTeamRatings(red);

  const laningEvents = [], midEvents = [], lateEvents = [];

  let advantage = 50;
  const draftAdv = (bR.draftRating - rR.draftRating) * 0.15;
  advantage = clamp(50 + draftAdv, 40, 60);

  advantage = simulateLaning(blue, red, bR, rR, laningEvents, tally);

  // Early stomp check
  if (advantage >= 85 || advantage <= 15) {
    const earlyWin = advantage >= 50;
    const earlyMin = randInt(18, 22);
    lateEvents.push({ time: padTime(earlyMin, 0), text: `🏆 EARLY SURRENDER! ${earlyWin ? blueTeamName : redTeamName} completely dominates — GG WP!`, type: 'result', phase: 'lategame', goldDiff: tally.goldDiff });

    // CS gold for short game
    const csPerMin = 700;
    tally.blue.gold += Math.round(earlyMin * csPerMin * (earlyWin ? 0.55 : 0.45));
    tally.red.gold  += Math.round(earlyMin * csPerMin * (earlyWin ? 0.45 : 0.55));

    const stats = { blue: { ...tally.blue, kda: tally.blueKDA }, red: { ...tally.red, kda: tally.redKDA } };
    return { winner: earlyWin ? 'blue' : 'red', events: { laning: laningEvents, midgame: [], lategame: lateEvents }, stats, draft, advantage, ratings: { blue: bR, red: rR } };
  }

  const midResult = simulateMidGame(blue, red, bR, rR, advantage, midEvents, tally);
  advantage = midResult.adv;

  const lateResult = simulateLateGame(blue, red, bR, rR, advantage, lateEvents, midResult.drakes, midResult.dIdx, tally);
  advantage = lateResult.adv;
  const blueWins = lateResult.blueWins;

  // CS gold estimate based on game length
  const nexusEv  = lateEvents.find(e => e.type === 'result');
  const gameMin  = nexusEv ? (parseInt(nexusEv.time) || 35) : 35;
  const csPerMin = 700;
  tally.blue.gold += Math.round(gameMin * csPerMin * (blueWins ? 0.52 : 0.48));
  tally.red.gold  += Math.round(gameMin * csPerMin * (blueWins ? 0.48 : 0.52));

  const stats = { blue: { ...tally.blue, kda: tally.blueKDA }, red: { ...tally.red, kda: tally.redKDA } };

  const sortByTime = evs => evs.slice().sort((a, b) => {
    const toSec = t => { if (!t) return 999; const [m,s]=(t||'0:0').split(':').map(Number); return m*60+(s||0); };
    return toSec(a.time) - toSec(b.time);
  });

  return {
    winner:  blueWins ? 'blue' : 'red',
    events:  { laning: sortByTime(laningEvents), midgame: sortByTime(midEvents), lategame: sortByTime(lateEvents) },
    stats,
    draft,
    advantage,
    ratings: { blue: bR, red: rR },
  };
}

// Pad roster to exactly 5 slots in POSITIONS order
function padToPositions(team) {
  return CONFIG.POSITIONS.map(pos => team.find(p => p && p.position === pos) || null);
}

// ─── Quick AI vs AI Match ─────────────────────────────────────────────────────

function quickSimulate(blueTeam, redTeam) {
  // Use actual ratings if teams provided, else use strength fallback
  if (blueTeam && redTeam && Array.isArray(blueTeam)) {
    const bP = padToPositions(blueTeam.filter(Boolean));
    const rP = padToPositions(redTeam.filter(Boolean));
    const bR = calcTeamRatings(bP);
    const rR = calcTeamRatings(rP);
    const overall = (r) => (r.earlyRating + r.tfRating + r.lateRating) / 3;
    const diff = (overall(bR) - overall(rR)) * 0.5;
    return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
  }
  // Fallback: numeric strength
  const diff = ((blueTeam || 0.5) - (redTeam || 0.5)) * 40;
  return chance(clamp(50 + diff, 15, 85)) ? 'blue' : 'red';
}
