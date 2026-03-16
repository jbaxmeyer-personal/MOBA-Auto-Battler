// js/main.js — Grove Manager entry point and game flow

// ─── Module state ─────────────────────────────────────────────────────────────

let _selectedTeamId = null;
let _matchContext   = null;  // { match, blueId, redId, blueName, redName, blueRoster, redRoster, draft }
let _matchResult    = null;  // result from simulateMatch / quickSimulate
let _pbpTimer       = null;
let _seriesState    = null;
// { match, blueId, redId, blueName, redName, format, neededToWin, blueWins, redWins, games, humanSide }

const DRAFT_SEQUENCE = [
  { side:'blue', type:'ban'  },
  { side:'red',  type:'ban'  },
  { side:'blue', type:'ban'  },
  { side:'red',  type:'ban'  },
  { side:'blue', type:'pick' },
  { side:'red',  type:'pick' },
  { side:'red',  type:'pick' },
  { side:'blue', type:'pick' },
  { side:'blue', type:'pick' },
  { side:'red',  type:'pick' },
  { side:'red',  type:'pick' },
  { side:'blue', type:'pick' },
  { side:'blue', type:'pick' },
  { side:'red',  type:'pick' },
];
let _draftState = null;

// ─── Intro / Team Select ──────────────────────────────────────────────────────

function onSelectTeam(teamId) {
  _selectedTeamId = teamId;
  document.querySelectorAll('.team-select-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`tsc-${teamId}`);
  if (card) card.classList.add('selected');
  document.getElementById('btn-start')?.removeAttribute('disabled');
}

function onStartGame() {
  if (!_selectedTeamId) return;
  initGame(_selectedTeamId);
  showScreen('screen-game');
  showMain('dashboard');
}

// ─── Week Advancement ─────────────────────────────────────────────────────────

function onAdvanceWeek() {
  if (!G) return;
  const result = advanceWeek();
  if (result.type === 'offseason') {
    addNews('The season is over. Offseason begins.', 'info');
  }
  renderAll();
}


// ─── Match Flow ───────────────────────────────────────────────────────────────

function onPlayMatch() {
  if (!G) return;
  let match = null;

  // Check playoff matches first
  if (G.season.phase === 'playoffs' && G.season.playoffMatches) {
    match = G.season.playoffMatches.find(m =>
      !m.played && m.homeId && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
    );
  }
  // Then regular season
  if (!match) {
    match = G.season.schedule.find(m =>
      !m.played && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
    );
  }
  if (!match) return;

  _startSeries(match);
}

function _startSeries(match) {
  const humanIsHome = match.homeId === G.humanTeamId;
  const blueId   = match.homeId;
  const redId    = match.awayId;
  const blueName = G.teams[blueId].name;
  const redName  = G.teams[redId].name;
  const humanSide = humanIsHome ? 'blue' : 'red';
  const neededToWin = match.format === 'bo5' ? 3 : 2;
  const maxGames    = match.format === 'bo5' ? 5 : 3;

  _seriesState = {
    match, blueId, redId, blueName, redName,
    format: match.format || 'bo3',
    neededToWin, maxGames,
    blueWins: 0, redWins: 0,
    games: [],
    humanSide,
    humanIsHome,
  };

  _startSeriesGame();
}

function _startSeriesGame() {
  const ss = _seriesState;
  const blueRoster = getActiveRoster(ss.blueId);
  const redRoster  = getActiveRoster(ss.redId);
  const humanSide  = ss.humanSide;

  _matchContext = {
    match: ss.match,
    blueId: ss.blueId, redId: ss.redId,
    blueName: ss.blueName, redName: ss.redName,
    blueRoster, redRoster,
    humanIsHome: ss.humanIsHome,
    draft: null,
  };
  _matchResult = null;

  showScreen('screen-match');
  document.getElementById('draft-phase').style.display        = 'block';
  document.getElementById('pbp-container').style.display      = 'none';
  document.getElementById('pbp-results').style.display        = 'none';
  document.getElementById('pbp-events').innerHTML             = '';
  const chatFeed = document.getElementById('pbp-chat-feed');
  if (chatFeed) chatFeed.innerHTML = '';
  _chatSeed = 0;
  setText('match-game-timer', '0:00');
  setText('mh-blue-gold', '0K');
  setText('mh-red-gold',  '0K');
  const sbBlue = document.getElementById('pbp-sb-blue');
  const sbRed  = document.getElementById('pbp-sb-red');
  if (sbBlue) sbBlue.innerHTML = '';
  if (sbRed)  sbRed.innerHTML  = '';
  document.getElementById('draft-actions').style.display      = 'none';
  document.getElementById('between-games-panel').style.display = 'none';
  document.getElementById('comp-synergies').innerHTML         = '';
  document.getElementById('role-assignment-phase').style.display = 'none';
  document.getElementById('tactics-phase').style.display     = 'none';
  setText('match-team-blue', ss.blueName);
  setText('match-team-red',  ss.redName);
  _updateSeriesDots();

  _draftState = {
    humanSide,
    blueTeamArr: blueRoster,
    redTeamArr:  redRoster,
    bans: { blue: [], red: [] },
    bluePicks: [],   // strings
    redPicks:  [],   // strings
    blueAssigned: null,
    redAssigned:  null,
    humanAssignment: {},
    raSelectedChamp: null,
    step: 0, done: false,
  };
  renderInteractiveDraft(null);
  advanceDraft();
}

function onStartMatch() {
  if (!_matchContext) return;
  const { blueRoster, redRoster, blueName, redName, draft } = _matchContext;

  _matchResult = simulateMatch(blueRoster, redRoster, blueName, redName, draft);

  document.getElementById('draft-phase').style.display   = 'none';
  document.getElementById('role-assignment-phase').style.display = 'none';
  document.getElementById('tactics-phase').style.display = 'none';
  document.getElementById('pbp-container').style.display = 'block';
  document.getElementById('pbp-results').style.display   = 'none';
  document.getElementById('pbp-events').innerHTML        = '';

  if (typeof initLiveStats === 'function' && draft) {
    initLiveStats(draft, blueName, redName);
  }
  _updateMatchScore(0, 0, 0, 0, 0, 0, 50);
  startPBP(_matchResult.events);
  // Set player names on map dots after map is initialized
  if (_matchContext?.draft) {
    ['blue','red'].forEach(side => {
      const picks = _matchContext.draft[side] || [];
      picks.forEach((p, i) => {
        const pos = POSITIONS[i];
        const pfx = side[0];
        const el = document.getElementById(`map-name-${pfx}-${pos}`);
        if (el) {
          const name = typeof p === 'string' ? p : (p.player?.name || p.champion || '');
          el.textContent = name.length > 8 ? name.slice(0,7)+'.' : name;
        }
      });
    });
  }
}

function onSkipMatch() {
  if (!_matchContext) return;
  const { blueRoster, redRoster, blueName, redName, draft } = _matchContext;

  _matchResult = simulateMatch(blueRoster, redRoster, blueName, redName, draft);

  document.getElementById('draft-phase').style.display   = 'none';
  document.getElementById('role-assignment-phase').style.display = 'none';
  document.getElementById('tactics-phase').style.display = 'none';
  document.getElementById('pbp-container').style.display = 'block';
  if (typeof initLiveStats === 'function' && draft) {
    initLiveStats(draft, blueName, redName);
  }

  if (_pbpTimer) { clearTimeout(_pbpTimer); _pbpTimer = null; }
  if (typeof setMapSkipMode === 'function') setMapSkipMode(true);

  _updateMatchScore(
    _matchResult.blueKills,   _matchResult.redKills,
    _matchResult.blueShrines, _matchResult.redShrines,
    _matchResult.blueRoots,   _matchResult.redRoots,
    _matchResult.winner === 'blue' ? 80 : 20
  );
  _drawGoldChart(_matchResult.goldSnapshots);
  _showMatchResult(_matchResult);
}

function returnFromMatch() {
  if (_pbpTimer) { clearTimeout(_pbpTimer); _pbpTimer = null; }
  if (typeof setMapSkipMode === 'function') setMapSkipMode(false);

  if (!_matchResult || !_matchContext || !_seriesState) {
    _matchResult = null; _matchContext = null; _seriesState = null;
    showScreen('screen-game'); showMain('dashboard');
    return;
  }

  const ss = _seriesState;
  const blueWon = _matchResult.winner === 'blue';

  // Record this game in the series
  ss.games.push({ winner: blueWon ? ss.blueId : ss.redId, result: _matchResult });
  if (blueWon) ss.blueWins++; else ss.redWins++;
  _updateSeriesDots();

  // Update morale/form
  _applyPostMatchMorale(ss.blueId, 'blue', blueWon);
  _applyPostMatchMorale(ss.redId,  'red',  !blueWon);

  // Check if series is over
  if (ss.blueWins >= ss.neededToWin || ss.redWins >= ss.neededToWin) {
    _finalizeHumanSeries();
  } else {
    // Show between-games panel
    _showBetweenGames();
  }

  _matchResult  = null;
  _matchContext = null;
}

// ─── Series finalization ──────────────────────────────────────────────────────

function _finalizeHumanSeries() {
  const ss = _seriesState;
  const blueWon = ss.blueWins > ss.redWins;
  const match   = ss.match;

  match.played   = true;
  match.homeWins = ss.blueWins;  // home is always blue
  match.awayWins = ss.redWins;
  match.games    = ss.games;
  match.result   = {
    winnerId: blueWon ? ss.blueId : ss.redId,
    score: `${ss.blueWins}-${ss.redWins}`,
  };

  const blueTeam = G.teams[ss.blueId];
  const redTeam  = G.teams[ss.redId];
  const humanWon = (blueWon && ss.humanSide === 'blue') || (!blueWon && ss.humanSide === 'red');

  if (blueWon) { blueTeam.wins++; blueTeam.points += 3; redTeam.losses++; }
  else         { redTeam.wins++;  redTeam.points  += 3; blueTeam.losses++; }

  const winner = blueWon ? blueTeam : redTeam;
  const loser  = blueWon ? redTeam  : blueTeam;
  const wk = G.season.week > 1 ? G.season.week - 1 : 1;
  addNews(
    `${winner.name} defeat ${loser.name} ${match.result.score} in Week ${wk}.`,
    'match'
  );

  if (typeof _applyFanChange === 'function') {
    _applyFanChange(ss.blueId, blueWon);
    _applyFanChange(ss.redId,  !blueWon);
  }

  // Manager XP: series result
  if (typeof grantManagerXP === 'function') {
    if (humanWon) {
      const xpAmount = match.isPlayoff ? 100 : 50;
      grantManagerXP(xpAmount, `Series win vs ${loser.name}`);
    }
  }

  _seriesState = null;
  showScreen('screen-game');
  showMain('dashboard');
  saveGame();
}

// ─── Between-games panel ──────────────────────────────────────────────────────

function _showBetweenGames() {
  const ss = _seriesState;
  const humanWins  = ss.humanSide === 'blue' ? ss.blueWins : ss.redWins;
  const cpuWins    = ss.humanSide === 'blue' ? ss.redWins  : ss.blueWins;
  const cpuName    = ss.humanSide === 'blue' ? ss.redName  : ss.blueName;
  const gameNum    = ss.games.length + 1;
  const fmt        = ss.format.toUpperCase();

  document.getElementById('draft-phase').style.display        = 'none';
  document.getElementById('pbp-container').style.display      = 'none';
  document.getElementById('pbp-results').style.display        = 'none';
  document.getElementById('between-games-panel').style.display = 'block';

  const scoreHtml = `<div class="bgp-score">
    <span class="bgp-you">YOU  ${humanWins}</span>
    <span class="bgp-sep">–</span>
    <span class="bgp-cpu">${cpuWins}  ${cpuName}</span>
  </div>
  <div class="bgp-label">${fmt} Series · Game ${gameNum} next</div>
  <div class="bgp-hint">Tactics are set in the pre-match phase before each game.</div>`;

  document.getElementById('between-games-content').innerHTML = scoreHtml;
}

function onNextGame() {
  document.getElementById('between-games-panel').style.display = 'none';
  _startSeriesGame();
}

function onAbandonSeries() {
  // Forfeit: opponent wins the series
  if (!_seriesState) { showScreen('screen-game'); showMain('dashboard'); return; }
  const ss = _seriesState;
  const cpuSide = ss.humanSide === 'blue' ? 'red' : 'blue';
  // Force remaining wins to CPU
  while (ss.blueWins < ss.neededToWin && ss.redWins < ss.neededToWin) {
    if (cpuSide === 'red') ss.redWins++; else ss.blueWins++;
  }
  _finalizeHumanSeries();
}

// ─── Career continuation ──────────────────────────────────────────────────────

function onContinueCareer() {
  const saved = loadGame();
  if (!saved) return;
  G = saved;
  showScreen('screen-game');
  showMain('dashboard');
  renderAll();
}

function onNewSeason() {
  startNewSeason();
  showMain('dashboard');
}

// ─── Scouting ────────────────────────────────────────────────────────────────

function onStartScouting(prospectId) {
  const result = startScouting(prospectId);
  if (result === 'started') {
    renderScouting();
    renderFinances();
  } else if (result === 'no_budget') {
    alert('Insufficient budget to send a scout.');
  } else if (result === 'already_active') {
    alert('All scout slots are currently occupied.');
  }
}

// Update morale and rolling form for each player after a match.
// Win/loss sets the base; individual KDA adjusts further.
function _applyPostMatchMorale(teamId, side, won) {
  const baseMorale = won ? 1 : -1;
  const baseForm   = won ? 7 : 4;
  const ps = _matchResult.playerStats && _matchResult.playerStats[side];
  const team = G.teams[teamId];
  if (!team) return;

  POSITIONS.forEach((pos, i) => {
    const pid = team.roster[pos];
    if (!pid) return;
    const player = G.players[pid];
    if (!player) return;

    const perf = ps ? ps[i] : null;
    let delta = baseMorale;
    let formVal = baseForm;

    if (perf) {
      // Outstanding: high kills or many assists
      if (perf.kills >= 3 || perf.assists >= 6) { delta++; formVal++; }
      // Poor: multiple deaths with no kills
      if (perf.deaths >= 3 && perf.kills === 0) { delta--; formVal--; }
    }

    player.morale = Math.min(10, Math.max(1, player.morale + delta));
    // Rolling 3-match form: push new, keep last 3
    player.form = [...player.form.slice(-2), Math.min(10, Math.max(1, formVal))];
  });
}

// ─── Gold Chart ───────────────────────────────────────────────────────────────

function _drawGoldChart(snapshots) {
  const svg = document.getElementById('gold-chart-svg');
  if (!svg || !snapshots || !snapshots.length) return;

  const W = svg.clientWidth || 260;
  const H = 64;
  svg.setAttribute('width', W);

  const maxLead = Math.max(1000, ...snapshots.map(s => Math.abs(s.lead)));
  const midY    = H / 2;

  // Build polyline points
  const pts = snapshots.map((s, i) => {
    const x = (i / (snapshots.length - 1 || 1)) * W;
    const y = midY - (s.lead / maxLead) * (midY * 0.85);
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  // Determine fill direction (above midline = blue, below = red)
  const finalLead = snapshots[snapshots.length - 1].lead;

  svg.innerHTML =
    // Baseline
    `<line x1="0" y1="${midY}" x2="${W}" y2="${midY}" stroke="#333" stroke-width="1"/>` +
    // Blue lead area (above midline)
    `<polyline points="0,${midY} ${pts} ${W},${midY}" fill="rgba(79,195,247,0.18)" stroke="none"/>` +
    // Line
    `<polyline points="${pts}" fill="none" stroke="${finalLead >= 0 ? '#4fc3f7' : '#ff7b7b'}" stroke-width="2" stroke-linejoin="round"/>` +
    // Zero label
    `<text x="3" y="${midY - 3}" font-size="9" fill="#555">0</text>`;
}

// ─── PBP ──────────────────────────────────────────────────────────────────────

const PBP_BASE_DELAY = 300; // ms per event at 1× speed
let _pbpSpeedMult = 1;
let _pbpPaused    = false;

function pbpSpeed(mult) {
  _pbpSpeedMult = mult;
  _pbpPaused    = false;
  document.querySelectorAll('.pbp-speed-btn[id^="pbp-btn-"]').forEach(b => b.classList.remove('pbp-speed-active'));
  const btn = document.getElementById(`pbp-btn-${mult}x`);
  if (btn) btn.classList.add('pbp-speed-active');
}

function pbpPause() {
  _pbpPaused = !_pbpPaused;
  const btn = document.getElementById('pbp-btn-pause');
  if (btn) btn.textContent = _pbpPaused ? '▶' : '⏸';
  if (!_pbpPaused && _pbpContinueFn) _pbpContinueFn();
}

let _pbpContinueFn = null;

function startPBP(events) {
  if (typeof initMapVisualization === 'function') initMapVisualization();
  if (typeof setMapSkipMode       === 'function') setMapSkipMode(false);
  _pbpSpeedMult = 1;
  _pbpPaused    = false;
  _pbpContinueFn= null;
  // Reset speed button state
  document.querySelectorAll('.pbp-speed-btn[id^="pbp-btn-"]').forEach(b => b.classList.remove('pbp-speed-active'));
  const btn1 = document.getElementById('pbp-btn-1x');
  if (btn1) btn1.classList.add('pbp-speed-active');
  const pauseBtn = document.getElementById('pbp-btn-pause');
  if (pauseBtn) pauseBtn.textContent = '⏸';

  const feedEl = document.getElementById('pbp-events');
  _updateMatchScore(0, 0, 0, 0, 0, 0, 50);

  let idx = 0;
  function step() {
    if (_pbpPaused) { _pbpContinueFn = step; return; }
    if (idx >= events.length) return;
    const ev = events[idx++];

    if (typeof updateMap === 'function') updateMap(ev);
    if (ev.type !== 'move') {
      _appendPBPEvent(ev, feedEl);
    }
    if (ev.agentStats && typeof updateLiveStats === 'function') updateLiveStats(ev.agentStats);
    if (ev.agentStats) _updateMatchup(ev.agentStats);
    // Live gold chart: update progressively each tick
    if (ev.tick !== undefined && _matchResult?.goldSnapshots) {
      _drawGoldChart(_matchResult.goldSnapshots.slice(0, ev.tick + 1));
    }
    _updateMatchScore(
      ev.blueKills,   ev.redKills,
      ev.blueShrines, ev.redShrines,
      ev.blueRoots,   ev.redRoots,
      ev.advAfter
    );
    // Timer
    if (ev.time) setText('match-game-timer', ev.time);
    // Live gold totals
    if (ev.agentStats) {
      const bg = Object.values(ev.agentStats.blue).reduce((s,p)=>s+(p.gold||0),0);
      const rg = Object.values(ev.agentStats.red ).reduce((s,p)=>s+(p.gold||0),0);
      const fmtG = g => g>=1000?(g/1000).toFixed(1)+'K':g+'';
      setText('mh-blue-gold', fmtG(bg));
      setText('mh-red-gold',  fmtG(rg));
    }
    // Chat
    _generatePBPChat(ev);

    if (ev.type === 'result') {
      _drawGoldChart(_matchResult && _matchResult.goldSnapshots);
      _showMatchResult(_matchResult);
      return;
    }
    _pbpTimer = setTimeout(step, Math.round(PBP_BASE_DELAY / _pbpSpeedMult));
  }
  step();
}

function _appendPBPEvent(ev, feedEl) {
  if (!feedEl) return;
  const div = document.createElement('div');
  div.className = 'pbp-line pbp-' + (ev.type || 'commentary');
  // Add blue/red side tint
  if (ev.side === 'blue' || ev.killBlue || ev.towerBlue || ev.wardenBlue || ev.shrineBlue) {
    div.classList.add('pbp-blue-event');
  } else if (ev.side === 'red' || (ev.killBlue === false)) {
    div.classList.add('pbp-red-event');
  }
  div.innerHTML = `<span class="pbp-time">${ev.time}</span> ${_escHtml(ev.text || '')}`;
  feedEl.prepend(div);
  // Trigger enter animation
  requestAnimationFrame(() => div.classList.add('pbp-visible'));
}

function _escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function _updateSeriesDots() {
  if (!_seriesState) return;
  const { neededToWin, blueWins, redWins } = _seriesState;
  function dots(wins, total, color) {
    return Array.from({length: total}, (_,i) =>
      `<span class="mh-dot${i < wins ? ' mh-dot-filled' : ''}" style="--dot-color:${color}"></span>`
    ).join('');
  }
  const bEl = document.getElementById('mh-blue-dots');
  const rEl = document.getElementById('mh-red-dots');
  if (bEl) bEl.innerHTML = dots(blueWins, neededToWin, '#4fc3f7');
  if (rEl) rEl.innerHTML = dots(redWins,  neededToWin, '#ff7b7b');
}

function _updateMatchScore(bK, rK, bShr, rShr, bRt, rRt, adv) {
  setText('score-blue-kills',   `${bK||0}`);
  setText('score-red-kills',    `${rK||0}`);
  setText('score-blue-shrines', `${bShr||0}`);
  setText('score-red-shrines',  `${rShr||0}`);
  setText('score-blue-roots',   `${bRt||0}`);
  setText('score-red-roots',    `${rRt||0}`);
  const fill = document.getElementById('advantage-fill');
  if (fill) fill.style.width = `${adv ?? 50}%`;
}

// ─── Champion Matchup Section ─────────────────────────────────────────────────

function _updateMatchup(agentStats) {
  const el = document.getElementById('pbp-matchup-rows');
  if (!el || !_matchContext) return;
  const { blueRoster, redRoster } = _matchContext;
  const roles = ['top','jungle','mid','adc','support'];
  const rlbl = { top:'TOP', jungle:'JGL', mid:'MID', adc:'ADC', support:'SUP' };
  let html = '';
  for (const role of roles) {
    const bs = agentStats?.blue?.[role] || {};
    const rs = agentStats?.red?.[role]  || {};
    const bp = blueRoster?.find(p => p.role === role);
    const rp = redRoster?.find(p => p.role === role);
    const bKda  = `${bs.kills||0}/${bs.deaths||0}/${bs.assists||0}`;
    const rKda  = `${rs.kills||0}/${rs.deaths||0}/${rs.assists||0}`;
    const bGold = ((bs.gold||0)/1000).toFixed(1)+'K';
    const rGold = ((rs.gold||0)/1000).toFixed(1)+'K';
    const bCls  = bs.isDead ? ' pbp-mu-dead' : '';
    const rCls  = rs.isDead ? ' pbp-mu-dead' : '';
    html += `<div class="pbp-mu-row">
      <span class="pbp-mu-blue${bCls}">${bp?.name||'?'}&nbsp;<span class="pbp-mu-kda">${bKda}</span>&nbsp;<span class="pbp-mu-gold">${bGold}</span></span>
      <span class="pbp-mu-role">${rlbl[role]}</span>
      <span class="pbp-mu-red${rCls}"><span class="pbp-mu-gold">${rGold}</span>&nbsp;<span class="pbp-mu-kda">${rKda}</span>&nbsp;${rp?.name||'?'}</span>
    </div>`;
  }
  el.innerHTML = html;
}

// ─── Live Scoreboard ──────────────────────────────────────────────────────────

function updateLiveStats(agentStats) {
  if (!_matchContext) return;
  const { blueRoster, redRoster } = _matchContext;
  const ROLES = ['top','jungle','mid','adc','support'];

  function render(stats, roster, color) {
    // Build pos→name map from roster (roster is array ordered by POSITIONS)
    const names = {};
    if (roster) ROLES.forEach((pos, i) => {
      const p = roster[i];
      if (p) names[pos] = (p.name || '').split(' ')[0] || pos;
    });
    return ROLES.map(pos => {
      const s = stats?.[pos] || {};
      const name = names[pos] || pos;
      const k = s.kills||0, d = s.deaths||0, a = s.assists||0;
      const gold = s.gold||0;
      const dead = s.isDead ? ' pbp-sb-dead' : '';
      const gStr = gold>=1000 ? (gold/1000).toFixed(1)+'K' : gold+'';
      return `<div class="pbp-sb-row${dead}">
        <span class="pbp-sb-name" style="color:${color}">${_escHtml(name)}</span>
        <span class="pbp-sb-kda">${k}/${d}/${a}</span>
        <span class="pbp-sb-gold">${gStr}</span>
      </div>`;
    }).join('');
  }

  const bEl = document.getElementById('pbp-sb-blue');
  const rEl = document.getElementById('pbp-sb-red');
  if (bEl) bEl.innerHTML = render(agentStats.blue, blueRoster, '#4fc3f7');
  if (rEl) rEl.innerHTML = render(agentStats.red,  redRoster,  '#ff7b7b');
}

// ─── PBP Chat ─────────────────────────────────────────────────────────────────

let _chatSeed = 0;
const _CHAT = {
  kill_win:  ['Got one!','Nice kill','Down!','Eliminated','Clean pick'],
  kill_loss: ['Fall back','Be careful','Regroup','Stay safe'],
  obj_win:   ['Good push','Objective down','Let\'s push','Keep going'],
  obj_loss:  ['Rotate now','Respond!','We need to answer'],
  tf_any:    ['Group up','Fight here','All in?','Let\'s go','Contest it'],
  comm_ahead:['We\'re ahead','Keep the pressure','Don\'t give them farm'],
  comm_behind:['Play it safe','Need vision','Farm up','Be patient'],
  comm_even: ['Stay focused','Maintain pressure','Ward up','Group mid'],
};

function _generatePBPChat(ev) {
  if (!_matchContext) return;
  const { blueId, blueRoster, redRoster } = _matchContext;
  const humanSide   = blueId === G.humanTeamId ? 'blue' : 'red';
  const humanRoster = humanSide === 'blue' ? blueRoster : redRoster;
  if (!humanRoster) return;

  _chatSeed++;
  const player = humanRoster.filter(Boolean)[_chatSeed % humanRoster.filter(Boolean).length];
  if (!player) return;
  const name = (player.name || '').split(' ')[0] || '?';

  let msgs = null;
  if (ev.type === 'kill') {
    msgs = ev.side === humanSide ? _CHAT.kill_win : _CHAT.kill_loss;
  } else if (ev.type === 'objective') {
    msgs = ev.side === humanSide ? _CHAT.obj_win : _CHAT.obj_loss;
  } else if (ev.type === 'teamfight') {
    msgs = _CHAT.tf_any;
  } else if (ev.type === 'commentary') {
    const adv = ev.advAfter ?? 50;
    msgs = adv > 55 ? _CHAT.comm_ahead : adv < 45 ? _CHAT.comm_behind : _CHAT.comm_even;
  }
  if (!msgs) return;

  const msg = msgs[_chatSeed % msgs.length];
  _addPBPChat(name, msg);
}

function _addPBPChat(playerName, message) {
  const feed = document.getElementById('pbp-chat-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = 'pbp-chat-line';
  div.innerHTML = `<span class="pbp-chat-pname">${_escHtml(playerName)}:</span> ${_escHtml(message)}`;
  feed.appendChild(div);
  while (feed.children.length > 10) feed.removeChild(feed.firstChild);
  feed.scrollTop = feed.scrollHeight;
}

function _buildResultsKDARows(players, color) {
  const POS_ICON = { top:'⚔️', jungle:'🌿', mid:'✦', adc:'🏹', support:'🛡️' };
  return players.map(p => {
    const gold = p.gold >= 1000 ? (p.gold/1000).toFixed(1)+'K' : (p.gold||0)+'';
    return `<tr class="res-kda-row">
      <td class="res-kda-pos">${POS_ICON[p.pos]||''}</td>
      <td class="res-kda-name" style="color:${color}">${_escHtml(p.name)}</td>
      <td class="res-kda-champ">${_escHtml(p.champion)}</td>
      <td class="res-kda-kda">
        <span style="color:#e8e8e8;font-weight:700">${p.kills}</span>/<span style="color:#e74c3c">${p.deaths}</span>/<span style="color:#4fc3f7">${p.assists}</span>
      </td>
      <td class="res-kda-gold">${gold}</td>
    </tr>`;
  }).join('');
}

function _showMatchResult(result) {
  if (!result || !_matchContext) return;
  const { blueName, redName, blueId } = _matchContext;
  const blueWon  = result.winner === 'blue';
  const winner   = blueWon ? blueName : redName;
  const loser    = blueWon ? redName  : blueName;
  const humanWon = (result.winner === 'blue') === (blueId === G.humanTeamId);

  const el = document.getElementById('pbp-results');
  if (!el) return;

  const hasPS = result.playerStats?.blue?.length;

  const kdaBlue = hasPS ? _buildResultsKDARows(result.playerStats.blue, '#4fc3f7') : '';
  const kdaRed  = hasPS ? _buildResultsKDARows(result.playerStats.red,  '#ff7b7b') : '';

  const tableStyle = 'width:100%;border-collapse:collapse;font-size:13px;';
  const thStyle = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;padding:4px 8px;border-bottom:1px solid #1a2a1a;';

  el.style.display = '';
  el.innerHTML = `
    <div class="res-banner ${humanWon ? 'res-win' : 'res-loss'}">
      <span class="res-winner-name">${_escHtml(winner)}</span>
      <span class="res-victory-word">VICTORY</span>
      <span class="res-loser-name">${_escHtml(loser)} defeated</span>
    </div>

    <div class="res-summary-bar">
      <div class="res-summary-side res-summary-blue">
        <span class="res-sum-team" style="color:#4fc3f7">${_escHtml(blueName)}</span>
        <span class="res-sum-stat"><span class="res-sum-val">${result.blueKills}</span><span class="res-sum-label">Kills</span></span>
        <span class="res-sum-stat"><span class="res-sum-val">${result.blueRoots}</span><span class="res-sum-label">🌳 Towers</span></span>
        <span class="res-sum-stat"><span class="res-sum-val">${result.blueShrines}</span><span class="res-sum-label">🌿 Shrines</span></span>
      </div>
      <div class="res-summary-center">
        <div class="res-duration">⏱ ${result.duration} min</div>
      </div>
      <div class="res-summary-side res-summary-red">
        <span class="res-sum-stat"><span class="res-sum-val">${result.redShrines}</span><span class="res-sum-label">🌿 Shrines</span></span>
        <span class="res-sum-stat"><span class="res-sum-val">${result.redRoots}</span><span class="res-sum-label">🌳 Towers</span></span>
        <span class="res-sum-stat"><span class="res-sum-val">${result.redKills}</span><span class="res-sum-label">Kills</span></span>
        <span class="res-sum-team" style="color:#ff7b7b">${_escHtml(redName)}</span>
      </div>
    </div>

    ${hasPS ? `<div class="res-kda-section">
      <div class="res-kda-col">
        <div class="res-kda-header" style="color:#4fc3f7">${_escHtml(blueName)}</div>
        <table style="${tableStyle}">
          <thead><tr>
            <th style="${thStyle}"></th><th style="${thStyle}">Player</th>
            <th style="${thStyle}">Champion</th><th style="${thStyle}">K/D/A</th>
            <th style="${thStyle}">Gold</th>
          </tr></thead>
          <tbody>${kdaBlue}</tbody>
        </table>
      </div>
      <div class="res-kda-divider"></div>
      <div class="res-kda-col">
        <div class="res-kda-header" style="color:#ff7b7b">${_escHtml(redName)}</div>
        <table style="${tableStyle}">
          <thead><tr>
            <th style="${thStyle}"></th><th style="${thStyle}">Player</th>
            <th style="${thStyle}">Champion</th><th style="${thStyle}">K/D/A</th>
            <th style="${thStyle}">Gold</th>
          </tr></thead>
          <tbody>${kdaRed}</tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="res-actions">
      <button class="btn-primary btn-large" onclick="returnFromMatch()">← Return to Manager</button>
    </div>
  `;
}

// ─── Interactive Draft ────────────────────────────────────────────────────────

function advanceDraft() {
  const ds = _draftState;
  if (!ds || ds.done) return;
  if (ds.step >= DRAFT_SEQUENCE.length) { _finalizeDraft(); return; }
  const seq = DRAFT_SEQUENCE[ds.step];
  if (seq.side === ds.humanSide) {
    renderInteractiveDraft(_draftAvailableChamps(ds.step));
  } else {
    renderInteractiveDraft(null);
    const stepSnapshot = ds.step;
    setTimeout(() => {
      if (!_draftState || _draftState.done || _draftState.step !== stepSnapshot) return;
      try {
        const taken = new Set([
          ..._draftState.bans.blue, ..._draftState.bans.red,
          ..._draftState.bluePicks,
          ..._draftState.redPicks,
        ]);
        const c = _cpuDraftAction(stepSnapshot)
          || Object.keys(CHAMPIONS).find(k => !taken.has(k))
          || Object.keys(CHAMPIONS)[0];
        applyDraftAction(c);
      } catch(e) {
        console.error('CPU draft error at step', stepSnapshot, e);
      }
    }, 420);
  }
}

function applyDraftAction(champName) {
  const ds = _draftState;
  if (!ds || ds.done) return;
  const step = ds.step;
  const seq  = DRAFT_SEQUENCE[step];
  const champData = CHAMPIONS[champName];

  if (seq.type === 'ban') {
    ds.bans[seq.side].push(champName);
  } else {
    if (seq.side === 'blue') ds.bluePicks.push(champName);
    else                     ds.redPicks.push(champName);
  }

  ds.step++;

  if (ds.step >= DRAFT_SEQUENCE.length) {
    _finalizeDraft();
  } else {
    renderInteractiveDraft(null);
    advanceDraft();
  }
}

function _draftAvailableChamps(step) {
  const ds = _draftState;
  const taken = new Set([
    ...ds.bans.blue, ...ds.bans.red,
    ...ds.bluePicks, ...ds.redPicks,
  ]);
  const seq = DRAFT_SEQUENCE[step];
  if (seq.type === 'ban') {
    return Object.keys(CHAMPIONS).filter(c => !taken.has(c));
  }
  // For picks: show full team pool + all champions as fallback
  const teamArr = ds.humanSide === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
  const poolSet = new Set();
  teamArr.forEach(p => (p?.champions || []).forEach(c => poolSet.add(c)));
  // Add all available champs so player isn't restricted
  Object.keys(CHAMPIONS).forEach(c => { if (!taken.has(c)) poolSet.add(c); });
  return [...poolSet].filter(c => !taken.has(c));
}

function _cpuDraftAction(step) {
  const ds  = _draftState;
  const seq = DRAFT_SEQUENCE[step];
  const banned    = [...ds.bans.blue, ...ds.bans.red];
  const allPicked = [...ds.bluePicks, ...ds.redPicks];
  if (seq.type === 'ban') {
    const foeArr = seq.side === 'blue' ? ds.redTeamArr : ds.blueTeamArr;
    const taken  = [...banned, ...allPicked];
    const bans   = generateBans(foeArr, 2);
    return bans.find(b => !taken.includes(b))
      || Object.keys(CHAMPIONS).find(c => !taken.includes(c));
  }
  // For picks: iterate roster and pick best champion
  const teamArr  = seq.side === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
  const foePicks = seq.side === 'blue' ? ds.redPicks  : ds.bluePicks;

  let bestChamp = null;
  for (const player of teamArr) {
    if (!player) continue;
    const c = pickChampion(player, player.position, banned, allPicked, foePicks);
    if (c) { bestChamp = c; break; }
  }
  return bestChamp || Object.keys(CHAMPIONS).find(c => !allPicked.includes(c) && !banned.includes(c));
}

function _finalizeDraft() {
  const ds = _draftState;
  ds.done = true;

  // CPU assigns its picks to roles
  const cpuSide   = ds.humanSide === 'blue' ? 'red' : 'blue';
  const cpuPicks  = cpuSide === 'blue' ? ds.bluePicks : ds.redPicks;
  const cpuRoster = cpuSide === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
  const cpuAssigned = _cpuAssignRoles(cpuPicks, cpuRoster);
  if (cpuSide === 'blue') ds.blueAssigned = cpuAssigned;
  else                    ds.redAssigned  = cpuAssigned;

  // Also auto-assign human picks by default (so draft-actions becomes available immediately)
  const humanPicks  = ds.humanSide === 'blue' ? ds.bluePicks : ds.redPicks;
  const humanRoster = ds.humanSide === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
  const humanAssigned = _cpuAssignRoles(humanPicks, humanRoster);
  if (ds.humanSide === 'blue') ds.blueAssigned = humanAssigned;
  else                         ds.redAssigned  = humanAssigned;

  // Pre-populate the humanAssignment map so the UI reflects auto-assignment
  ds.humanAssignment = {};
  humanAssigned.forEach(entry => {
    ds.humanAssignment[entry.pos] = entry.champion;
  });

  // Build draft immediately so match can start (draft-actions visible)
  const blueNames = ds.blueAssigned.map(p => p.champion);
  const redNames  = ds.redAssigned.map(p => p.champion);
  const draft = {
    blue: ds.blueAssigned,
    red:  ds.redAssigned,
    bans: ds.bans,
    blueSynergies: (() => { const s = COMP_SYNERGIES[getDominantCompType(blueNames)]; return s ? [s] : []; })(),
    redSynergies:  (() => { const s = COMP_SYNERGIES[getDominantCompType(redNames)];  return s ? [s] : []; })(),
    counterScore:  getCounterScore(blueNames, redNames),
  };
  _matchContext.draft = draft;

  renderInteractiveDraft(null);
  document.getElementById('draft-champ-picker').style.display = 'none';
  renderDraftSynergies(draft);
  document.getElementById('draft-actions').style.display = 'flex';

  // Also show role assignment screen for optional rearrangement
  showRoleAssignmentScreen();
}

function _cpuAssignRoles(picks, rosterArr) {
  const ROLE_CLASS_FIT = {
    top:     ['tank','fighter'],
    jungle:  ['assassin','fighter'],
    mid:     ['mage'],
    adc:     ['marksman'],
    support: ['sentinel'],
  };
  const used = new Set();
  return POSITIONS.map((pos, i) => {
    const player = rosterArr[i];
    let bestIdx = -1, bestScore = -1;
    picks.forEach((champName, j) => {
      if (used.has(j)) return;
      const cls = (CHAMPIONS[champName]?.class || '').toLowerCase();
      const fit = (ROLE_CLASS_FIT[pos] || []).includes(cls) ? 2 : 0;
      const owned = player?.champions?.includes(champName) ? 1 : 0;
      const score = fit + owned;
      if (score > bestScore) { bestScore = score; bestIdx = j; }
    });
    if (bestIdx === -1) bestIdx = picks.findIndex((_, j) => !used.has(j));
    used.add(bestIdx);
    const champName = picks[bestIdx] || picks[0];
    return { pos, player, champion: champName, champClass: CHAMPIONS[champName]?.class || '' };
  });
}

function showRoleAssignmentScreen() {
  const ds = _draftState;
  ds.humanAssignment = {};
  ds.raSelectedChamp = null;
  document.getElementById('role-assignment-phase').style.display = 'block';
  const picks = ds.humanSide === 'blue' ? ds.bluePicks : ds.redPicks;
  renderRoleAssignment(picks);
}

function raSelectChamp(champName) {
  _draftState.raSelectedChamp = (_draftState.raSelectedChamp === champName) ? null : champName;
  renderRoleAssignment(_draftState.humanSide === 'blue' ? _draftState.bluePicks : _draftState.redPicks);
}

function raAssignToSlot(pos) {
  const ds = _draftState;
  if (!ds.raSelectedChamp) {
    // If slot has a champ, unassign it back to bench
    if (ds.humanAssignment[pos]) {
      delete ds.humanAssignment[pos];
      renderRoleAssignment(ds.humanSide === 'blue' ? ds.bluePicks : ds.redPicks);
    }
    return;
  }
  // Remove this champ from any other slot it might be in
  Object.keys(ds.humanAssignment).forEach(p => {
    if (ds.humanAssignment[p] === ds.raSelectedChamp) delete ds.humanAssignment[p];
  });
  ds.humanAssignment[pos] = ds.raSelectedChamp;
  ds.raSelectedChamp = null;
  renderRoleAssignment(ds.humanSide === 'blue' ? ds.bluePicks : ds.redPicks);
}

function onConfirmRoleAssignment() {
  const ds = _draftState;
  const humanSide = ds.humanSide;
  const rosterArr = humanSide === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
  const humanPicks = humanSide === 'blue' ? ds.bluePicks : ds.redPicks;

  const humanAssigned = POSITIONS.map((pos, i) => {
    const champName = ds.humanAssignment[pos] || humanPicks[i];
    const player = rosterArr.find(p => p?.champions?.includes(champName)) || rosterArr[i];
    return { pos, player, champion: champName, champClass: CHAMPIONS[champName]?.class || '' };
  });

  if (humanSide === 'blue') ds.blueAssigned = humanAssigned;
  else                      ds.redAssigned  = humanAssigned;

  const blueNames = ds.blueAssigned.map(p => p.champion);
  const redNames  = ds.redAssigned.map(p => p.champion);

  const draft = {
    blue: ds.blueAssigned,
    red:  ds.redAssigned,
    bans: ds.bans,
    blueSynergies: (() => { const s = COMP_SYNERGIES[getDominantCompType(blueNames)]; return s ? [s] : []; })(),
    redSynergies:  (() => { const s = COMP_SYNERGIES[getDominantCompType(redNames)];  return s ? [s] : []; })(),
    counterScore:  getCounterScore(blueNames, redNames),
  };
  _matchContext.draft = draft;

  document.getElementById('role-assignment-phase').style.display = 'none';
  renderDraftSynergies(draft);
  // Show tactics phase before match start
  showTacticsPhase();
}

// ─── DOM Ready ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderIntro();
  showScreen('screen-intro');
});
