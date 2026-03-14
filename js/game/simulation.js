// js/game/simulation.js — Grove Manager match simulation (Phase 2)
// TAG-flavored PBP engine. Phase 4 will replace this with the full
// Ley Shrine / Warden / Corrupted Ancient mechanics engine.
//
// Public API:
//   draftChampions(blueTeamArr, redTeamArr) → draft result
//   simulateMatch(blueTeamArr, redTeamArr, blueName, redName) → full PBP
//   quickSimulate(blueTeamArr, redTeamArr) → 'blue' | 'red'

// ─── Utilities ────────────────────────────────────────────────────────────────

function rand(min, max)   { return Math.random() * (max - min) + min; }
function rInt(min, max)   { return Math.floor(rand(min, max + 1)); }
function clamp(v,lo,hi)   { return Math.max(lo, Math.min(hi, v)); }
function pick(arr)         { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a)        { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b; }

function fmt(min) {
  const m = Math.floor(min), s = Math.floor((min - m) * 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── Position Scenes (map coordinates for the 300×300 SVG) ───────────────────
// Matches the LoL-style map until Phase 3 replaces it with the hex map.
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

function scene(name, jitter = 8) {
  const s = SCENES[name] || SCENES.center;
  const j = () => rInt(-jitter, jitter);
  const jt = side => {
    const out = {};
    Object.entries(s[side]).forEach(([pos, p]) => {
      out[pos] = { x: clamp(p.x + j(), 5, 295), y: clamp(p.y + j(), 5, 295), alive: true };
    });
    return out;
  };
  return { blue: jt('blue'), red: jt('red') };
}

// ─── Champion helpers ─────────────────────────────────────────────────────────

function champOf(draft, side, posIdx) {
  return draft[side][posIdx]?.champion || '???';
}
function playerOf(draft, side, posIdx) {
  return draft[side][posIdx]?.player?.name || '???';
}
function ultOf(champName) {
  return CHAMPIONS[champName]?.ult || null;
}
function tagLine(champName, playerName) {
  return `${playerName} (${champName})`;
}

// Position index lookup
const POS_IDX = { vanguard:0, ranger:1, arcanist:2, hunter:3, warden:4 };

// ─── Draft ────────────────────────────────────────────────────────────────────

function draftChampions(blueTeamArr, redTeamArr) {
  const draftSide = (team) => POSITIONS.map((pos, i) => {
    const player = team[i];
    if (!player) return { pos, player: null, champion: '???' };
    const pool = player.champions || [];
    const champ = pool.length ? pick(pool) : '???';
    return { pos, player, champion: champ };
  });

  const bluePicks = draftSide(blueTeamArr);
  const redPicks  = draftSide(redTeamArr);

  const synFor = (picks) => {
    const type = getCompType(picks.map(p => ({ champion: p.champion })));
    return type ? [COMP_SYNERGIES[type]] : [];
  };

  return {
    blue: bluePicks,
    red:  redPicks,
    blueSynergies: synFor(bluePicks),
    redSynergies:  synFor(redPicks),
  };
}

// ─── Quick Simulate ───────────────────────────────────────────────────────────

function quickSimulate(blueTeamArr, redTeamArr) {
  const pow = arr => arr.reduce((s, p) => s + (p ? calcOverall(p) : 45), 0);
  const diff = pow(blueTeamArr) - pow(redTeamArr);
  return Math.random() * 100 < clamp(50 + diff * 0.5, 15, 85) ? 'blue' : 'red';
}

// ─── Full Match Simulation ────────────────────────────────────────────────────

function simulateMatch(blueTeamArr, redTeamArr, blueName, redName) {
  const draft = draftChampions(blueTeamArr, redTeamArr);

  // Power calculation
  const pow = (arr) => arr.reduce((s, p) => s + (p ? calcOverall(p) : 45), 0);
  const bPow = pow(blueTeamArr), rPow = pow(redTeamArr);
  const diff  = bPow - rPow;
  const bWinChance = clamp(50 + diff * 0.55, 12, 88);
  const blueWins   = Math.random() * 100 < bWinChance;
  const W = blueWins ? 'blue' : 'red';  // winner
  const L = blueWins ? 'red' : 'blue';  // loser
  const Wname = blueWins ? blueName : redName;
  const Lname = blueWins ? redName  : blueName;
  const margin = Math.abs(diff); // 0-25ish

  // Counters
  let bK = 0, rK = 0, bShr = 0, rShr = 0, bRt = 0, rRt = 0;
  let t = 0; // time in minutes
  const events = [];
  let adv = blueWins ? clamp(50 + margin * 0.8, 50, 80) : clamp(50 - margin * 0.8, 20, 50);

  const ev = (type, text, sc, opts = {}) => {
    events.push({
      type,
      time: fmt(t),
      text,
      positions: sc ? scene(sc) : null,
      blueKills: bK, redKills: rK,
      blueShrines: bShr, redShrines: rShr,
      blueRoots: bRt, redRoots: rRt,
      advAfter: Math.round(adv),
      ...opts,
    });
  };

  // Convenience: kill event that updates score
  const kill = (killerSide, text, sc) => {
    if (killerSide === 'blue') bK++; else rK++;
    adv = blueWins
      ? clamp(adv + (killerSide === 'blue' ? rand(2,5) : -rand(1,3)), 42, 88)
      : clamp(adv + (killerSide === 'blue' ? rand(1,3) : -rand(2,5)), 12, 58);
    ev('kill', text, sc, { killBlue: killerSide === 'blue' });
  };

  const shrine = (side, shrineId, sc) => {
    if (side === 'blue') bShr++; else rShr++;
    const stacks = side === 'blue' ? bShr : rShr;
    const buffNames = ['','Verdant Blessing','Quickened Roots','Ley Convergence'];
    const bonus = buffNames[stacks] || '';
    adv = clamp(adv + (side === 'blue' ? rand(2,4) : -rand(2,4)), 10, 90);
    ev('objective', `${side === 'blue' ? blueName : redName} secures the ${shrineId} — Verdant Blessings ×${stacks}${bonus ? ` (${bonus})` : ''}`, sc, {
      shrineBlue: side === 'blue', shrineRed: side === 'red',
    });
  };

  const root = (side, lane, label, sc) => {
    if (side === 'blue') bRt++; else rRt++;
    adv = clamp(adv + (side === 'blue' ? rand(3,6) : -rand(3,6)), 10, 90);
    ev('objective', `${label} Ancient Root falls to ${side === 'blue' ? blueName : redName}! The ${lane} lane is cracked open.`, sc, {
      towerBlue: side === 'blue',
    });
  };

  const tf = (winnerSide, bKills, rKills, text, sc) => {
    bK += bKills; rK += rKills;
    adv = clamp(adv + (winnerSide === 'blue' ? rand(3,7) : -rand(3,7)), 10, 90);
    ev('teamfight', text, sc, { tfBlueKills: bKills, tfRedKills: rKills });
  };

  // ─── PHASE 1: Seedling (0–10 min) ──────────────────────────────────────────
  t = rand(0.5, 1.2);
  ev('commentary', `Both teams enter the Ancient Grove. ${blueName} opens with ${draft.blue[1]?.champion || 'their Ranger'} pathing toward the North Shrine.`, 'laning');

  // First blood
  t = rand(3.0, 6.5);
  const fbKiller = pick(['ranger', 'vanguard', 'arcanist']);
  const fbVictim = pick(['vanguard', 'arcanist', 'hunter']);
  const fbSide   = pick(['blue','blue','red']);
  const fbKillSide = fbSide;
  const fbKillerName = tagLine(champOf(draft, fbKillSide, POS_IDX[fbKiller]), playerOf(draft, fbKillSide, POS_IDX[fbKiller]));
  const fbVictimName = tagLine(champOf(draft, fbKillSide === 'blue' ? 'red' : 'blue', POS_IDX[fbVictim]), playerOf(draft, fbKillSide === 'blue' ? 'red' : 'blue', POS_IDX[fbVictim]));
  kill(fbKillSide, `FIRST BLOOD! ${fbKillerName} ambushes ${fbVictimName} — ${fbKillSide === 'blue' ? blueName : redName} draws first blood!`, 'northShrine');

  // North Shrine capture
  t = rand(5.5, 8.0);
  const northSide = pick([W, W, L]);
  shrine(northSide, 'North Ley Shrine', 'northShrine');

  // Early skirmish
  t = rand(7.0, 9.5);
  const skirmishWinner = pick([W, W, L]);
  const skirmishKiller = tagLine(champOf(draft, skirmishWinner, 1), playerOf(draft, skirmishWinner, 1));
  const skirmishVictim = tagLine(champOf(draft, skirmishWinner === 'blue' ? 'red' : 'blue', 0), playerOf(draft, skirmishWinner === 'blue' ? 'red' : 'blue', 0));
  kill(skirmishWinner, `${skirmishKiller} catches ${skirmishVictim} overextended — solo kill in the jungle.`, 'southShrine');

  // South Shrine
  t = rand(8.5, 10.5);
  const southSide = bShr > rShr ? L : pick([W, W, L]);
  shrine(southSide, 'South Ley Shrine', 'southShrine');

  // ─── PHASE 2: Growth (10–20 min) ───────────────────────────────────────────
  t = 10.0 + rand(0.2, 0.8);
  ev('commentary', `[Growth Phase] The Verdant Blessings race intensifies. ${Wname} controls ${W === 'blue' ? bShr : rShr} shrine${(W === 'blue' ? bShr : rShr) !== 1 ? 's' : ''} and begins pressuring the Ancient Roots.`, 'center');

  // First team fight
  t = rand(11.0, 13.5);
  const tf1bk = blueWins ? rInt(2,3) : rInt(1,2);
  const tf1rk = blueWins ? rInt(0,1) : rInt(2,3);
  const tf1Winner = tf1bk > tf1rk ? 'blue' : 'red';
  const tf1Arcanist = tagLine(champOf(draft, tf1Winner, 2), playerOf(draft, tf1Winner, 2));
  const tf1Ult = ultOf(champOf(draft, tf1Winner, 2));
  tf(tf1Winner, tf1bk, tf1rk,
    `5v5 team fight erupts at the Crossing Shrine! ${tf1Arcanist} ${tf1Ult ? `activates ${tf1Ult.split('—')[0].trim()}` : 'unleashes their ultimate'} — ${tf1Winner === 'blue' ? blueName : redName} wins ${Math.max(tf1bk,tf1rk)} for ${Math.min(tf1bk,tf1rk)}.`,
    'center');

  // Outer root falls
  t = rand(12.5, 14.5);
  const outerLane = pick(['Top-Lane','Bot-Lane','Mid-Lane']);
  root(W, outerLane.replace('-',' '), `The Outer ${outerLane}`, 'northShrine');

  // Grove Warden spawns
  t = rand(12.0, 13.5);
  ev('commentary', `The Grove Warden stirs in the Grove Heart! Both teams rush toward the center.`, 'center');

  t += rand(0.8, 1.8);
  const wardenSide = pick([W, W, L]);
  const wardenTank  = tagLine(champOf(draft, wardenSide, 0), playerOf(draft, wardenSide, 0));
  const wardenHeal  = tagLine(champOf(draft, wardenSide, 4), playerOf(draft, wardenSide, 4));
  adv = clamp(adv + (wardenSide === 'blue' ? rand(4,8) : -rand(4,8)), 10, 90);
  if (wardenSide === 'blue') bShr++; else rShr++; // warden reuses shrine slot
  ev('objective', `${wardenSide === 'blue' ? blueName : redName} slays the Grove Warden! ${wardenTank} absorbs the Root Slam while ${wardenHeal} keeps the team alive. Warden's Grasp buff secured!`, 'center', {
    wardenBlue: wardenSide === 'blue', wardenRed: wardenSide === 'red',
  });

  // Second team fight
  t += rand(2.5, 4.5);
  const tf2Winner = pick([W, W, W, L]);
  const tf2bk = tf2Winner === 'blue' ? rInt(2,4) : rInt(0,2);
  const tf2rk = tf2Winner === 'red'  ? rInt(2,4) : rInt(0,2);
  const tf2Vanguard = tagLine(champOf(draft, tf2Winner, 0), playerOf(draft, tf2Winner, 0));
  tf(tf2Winner, tf2bk, tf2rk,
    `${tf2Winner === 'blue' ? blueName : redName} engages a pick near the Inner Root! ${tf2Vanguard} leads the charge — ${Math.max(tf2bk,tf2rk)}-for-${Math.min(tf2bk,tf2rk)} exchange.`,
    tf2Winner === 'blue' ? 'northShrine' : 'southShrine');

  // Inner root falls
  t += rand(1.0, 2.5);
  root(W, 'Inner Top-Lane', 'The Inner Top-Lane', W === 'blue' ? 'northShrine' : 'southShrine');

  // Crossing shrine contest
  t += rand(1.5, 2.5);
  const crossSide = pick([W, W, L]);
  shrine(crossSide, 'Crossing Ley Shrine', 'center');

  if (margin > 8) {
    // Dominant winner gets a bonus objective
    t += rand(1.0, 2.0);
    const bonusKiller = tagLine(champOf(draft, W, 2), playerOf(draft, W, 2));
    kill(W, `${bonusKiller} picks off an isolated target — ${Wname} is snowballing.`, 'center');
  }

  // ─── PHASE 3: Bloom (20+ min) ──────────────────────────────────────────────
  t = rand(20.0, 23.0);
  ev('commentary', `[Bloom Phase] ${Wname} has ${W === 'blue' ? bShr : rShr} Verdant Blessings and ${W === 'blue' ? bRt : rRt} root${(W === 'blue' ? bRt : rRt) !== 1 ? 's' : ''} cleared. The Corrupted Ancient looms.`, W === 'blue' ? 'bluePush' : 'redPush');

  // Heart root falls
  t += rand(1.0, 2.5);
  root(W, 'Heart', 'The Heart Root', W === 'blue' ? 'bluePush' : 'redPush');
  adv = clamp(adv + (W === 'blue' ? rand(5,9) : -rand(5,9)), 10, 90);

  // Final team fight before boss
  t += rand(1.5, 3.0);
  const tf3bk = blueWins ? rInt(3,5) : rInt(0,2);
  const tf3rk = blueWins ? rInt(0,2) : rInt(3,5);
  const tf3Hunter = tagLine(champOf(draft, W, 3), playerOf(draft, W, 3));
  const tf3HunterUlt = ultOf(champOf(draft, W, 3));
  tf(W, tf3bk, tf3rk,
    `Decisive team fight outside the enemy base! ${tf3Hunter} ${tf3HunterUlt ? `uses ${tf3HunterUlt.split('—')[0].trim()}` : 'carries the fight'} — ${Wname} wins ${Math.max(tf3bk,tf3rk)} for ${Math.min(tf3bk,tf3rk)} and starts the Ancient!`,
    W === 'blue' ? 'bluePush' : 'redPush');

  // Boss engage
  t += rand(0.8, 1.5);
  const bossTank   = tagLine(champOf(draft, W, 0), playerOf(draft, W, 0));
  const bossWarden = tagLine(champOf(draft, W, 4), playerOf(draft, W, 4));
  ev('commentary',
    `${Wname} storms the Corrupted Ancient! ${bossTank} absorbs the opening Root Slam. ${bossWarden} cleanses Poison Breath with ${CHAMPIONS[champOf(draft,W,4)]?.ult?.split('—')[0]?.trim() || 'their ultimate'}.`,
    W === 'blue' ? 'bluePush' : 'redPush');

  // Boss enrage (if close match)
  if (margin < 10) {
    t += rand(1.0, 2.0);
    const loseKiller = tagLine(champOf(draft, L, rInt(0,4)), playerOf(draft, L, rInt(0,4)));
    ev('commentary', `The Corrupted Ancient enters Enrage at 50% HP! Forest Wraiths surge from the ground. ${loseKiller} is grabbed by a Vine Lash!`, W === 'blue' ? 'bluePush' : 'redPush');
  }

  // Backdoor attempt by loser (close match)
  if (margin < 6) {
    t += rand(0.5, 1.0);
    const bdPlayer = tagLine(champOf(draft, L, 2), playerOf(draft, L, 2));
    kill(L, `${bdPlayer} teleports back for a desperate split — ${Lname} is fighting for their lives!`, L === 'blue' ? 'bluePush' : 'redPush');
  }

  // Game end
  t += rand(1.0, 2.5);
  const duration = fmt(t);
  const bossHP = margin < 6 ? 'barely' : margin < 15 ? 'steadily' : 'decisively';
  adv = W === 'blue' ? rInt(72, 88) : rInt(12, 28);
  ev('result',
    `VICTORY — ${Wname} ${bossHP} defeats ${Lname}! The Corrupted Ancient falls at ${duration}. Final: ${blueName} ${bK}K / ${redName} ${rK}K`,
    W === 'blue' ? 'bluePush' : 'redPush',
    { gameOver: true, winnerBlue: blueWins });

  return {
    winner:      W,
    events,
    blueKills:   bK,
    redKills:    rK,
    blueShrines: bShr,
    redShrines:  rShr,
    blueRoots:   bRt,
    redRoots:    rRt,
    duration:    Math.floor(t),
    draft,
  };
}
