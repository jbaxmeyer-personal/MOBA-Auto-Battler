// js/main.js — Grove Manager entry point and game flow

// ─── Module state ─────────────────────────────────────────────────────────────

let _selectedTeamId = null;
let _matchContext   = null;  // { match, blueId, redId, blueName, redName, blueRoster, redRoster, draft }
let _matchResult    = null;  // result from simulateMatch / quickSimulate
let _pbpTimer       = null;
let _seriesState    = null;
// { match, blueId, redId, blueName, redName, format, neededToWin, blueWins, redWins, games, humanSide }

const DRAFT_SEQUENCE = [
  { side:'blue', type:'ban',  posIdx:null },
  { side:'red',  type:'ban',  posIdx:null },
  { side:'blue', type:'ban',  posIdx:null },
  { side:'red',  type:'ban',  posIdx:null },
  { side:'blue', type:'pick', posIdx:0 },
  { side:'red',  type:'pick', posIdx:0 },
  { side:'red',  type:'pick', posIdx:1 },
  { side:'blue', type:'pick', posIdx:1 },
  { side:'blue', type:'pick', posIdx:2 },
  { side:'red',  type:'pick', posIdx:2 },
  { side:'red',  type:'pick', posIdx:3 },
  { side:'blue', type:'pick', posIdx:3 },
  { side:'blue', type:'pick', posIdx:4 },
  { side:'red',  type:'pick', posIdx:4 },
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
  document.getElementById('draft-actions').style.display      = 'none';
  document.getElementById('between-games-panel').style.display = 'none';
  document.getElementById('comp-synergies').innerHTML         = '';
  setText('match-team-blue', ss.blueName);
  setText('match-team-red',  ss.redName);

  _draftState = {
    humanSide,
    blueTeamArr: blueRoster,
    redTeamArr:  redRoster,
    bans: { blue: [], red: [] },
    bluePicks: [], redPicks: [],
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
  document.getElementById('pbp-container').style.display = 'block';
  document.getElementById('pbp-results').style.display   = 'none';
  document.getElementById('pbp-events').innerHTML        = '';

  _updateMatchScore(0, 0, 0, 0, 0, 0, 50);
  startPBP(_matchResult.events);
}

function onSkipMatch() {
  if (!_matchContext) return;
  const { blueRoster, redRoster, blueName, redName, draft } = _matchContext;

  _matchResult = simulateMatch(blueRoster, redRoster, blueName, redName, draft);

  document.getElementById('draft-phase').style.display   = 'none';
  document.getElementById('pbp-container').style.display = 'block';

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
  <div class="bgp-label">${fmt} Series · Game ${gameNum} next</div>`;

  // Tactic options
  const tactics = Object.entries(PLAYSTYLES).map(([key, val]) => {
    const active = G.teams[G.humanTeamId].tactics.playstyle === key;
    return `<div class="bgp-tactic ${active ? 'bgp-tactic-active' : ''}" onclick="onBetweenGamesTactic('${key}')">
      <div class="bgp-tactic-name">${val.name}</div>
      <div class="bgp-tactic-desc">${val.desc}</div>
    </div>`;
  }).join('');

  const tacticsHtml = `<div class="bgp-tactics-wrap">
    <div class="bgp-section-label">ADJUST TACTICS FOR GAME ${gameNum}</div>
    <div class="bgp-tactics-grid">${tactics}</div>
  </div>`;

  document.getElementById('between-games-content').innerHTML = scoreHtml + tacticsHtml;
}

function onBetweenGamesTactic(key) {
  if (!G || !_seriesState) return;
  G.teams[G.humanTeamId].tactics.playstyle = key;
  _showBetweenGames(); // re-render to update active
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

function onStartScouting() {
  const result = startScouting();
  if (result === 'started') {
    renderAll();
    showMain('scouting');
  } else if (result === 'no_budget') {
    alert('Insufficient budget to send a scout.');
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

const PBP_BASE_DELAY = 850; // ms per event at 1× speed
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
    _appendPBPEvent(ev, feedEl);
    _updateMatchScore(
      ev.blueKills,   ev.redKills,
      ev.blueShrines, ev.redShrines,
      ev.blueRoots,   ev.redRoots,
      ev.advAfter
    );

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

function _updateMatchScore(bK, rK, bShr, rShr, bRt, rRt, adv) {
  setText('score-blue-kills',   `${bK}K`);
  setText('score-red-kills',    `${rK}K`);
  setText('score-blue-shrines', `🌿${bShr}`);
  setText('score-red-shrines',  `🌿${rShr}`);
  setText('score-blue-roots',   `🌳${bRt}`);
  setText('score-red-roots',    `🌳${rRt}`);
  const fill = document.getElementById('advantage-fill');
  if (fill) fill.style.width = `${adv ?? 50}%`;
}

function _buildKDATable(players, color) {
  const POS_ICON = { vanguard:'⚔️', ranger:'🌲', arcanist:'✨', hunter:'🏹', warden:'🛡️' };
  const rows = players.map(p => `
    <tr>
      <td style="color:${color};font-size:11px;padding:2px 6px 2px 0">${POS_ICON[p.pos]||''} ${_escHtml(p.name)}</td>
      <td style="font-size:11px;color:#aaa;padding:2px 6px 2px 0">${_escHtml(p.champion)}</td>
      <td style="font-size:12px;font-weight:600;padding:2px 4px;white-space:nowrap">
        <span style="color:#e8e8e8">${p.kills}</span>/<span style="color:#ff7b7b">${p.deaths}</span>/<span style="color:#4fc3f7">${p.assists}</span>
      </td>
    </tr>`).join('');
  return `<table style="border-collapse:collapse">${rows}</table>`;
}

function _showMatchResult(result) {
  if (!result || !_matchContext) return;
  const { blueName, redName, blueId } = _matchContext;
  const blueWon   = result.winner === 'blue';
  const winner    = blueWon ? blueName : redName;
  const humanWon  = (result.winner === 'blue') === (blueId === G.humanTeamId);

  const el = document.getElementById('pbp-results');
  if (!el) return;

  const hasPlayerStats = result.playerStats &&
    result.playerStats.blue && result.playerStats.blue.length;

  const kdaSection = hasPlayerStats ? `
    <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
      <div>
        <div style="font-size:11px;color:#4fc3f7;font-weight:600;margin-bottom:4px">${_escHtml(blueName)}</div>
        ${_buildKDATable(result.playerStats.blue, '#4fc3f7')}
      </div>
      <div>
        <div style="font-size:11px;color:#ff7b7b;font-weight:600;margin-bottom:4px">${_escHtml(redName)}</div>
        ${_buildKDATable(result.playerStats.red, '#ff7b7b')}
      </div>
    </div>` : '';

  el.style.display = '';
  el.innerHTML = `
    <div class="pbp-result-banner ${humanWon ? 'win' : 'loss'}">
      ${_escHtml(winner)} VICTORY
    </div>
    <div class="pbp-result-body">
      <div class="pbp-stats-table">
        <div style="display:flex;gap:8px;margin-bottom:6px">
          <span style="color:#4fc3f7;font-weight:600">${_escHtml(blueName)}</span>
          <span style="color:var(--text-dim)">vs</span>
          <span style="color:#ff7b7b;font-weight:600">${_escHtml(redName)}</span>
        </div>
        <div style="font-size:13px;color:var(--text-dim);margin-bottom:4px">
          <span style="color:#4fc3f7">${result.blueKills}K</span>
          · 🌿${result.blueShrines}
          · 🌳${result.blueRoots}
          &nbsp;|&nbsp;
          <span style="color:#ff7b7b">${result.redKills}K</span>
          · 🌿${result.redShrines}
          · 🌳${result.redRoots}
        </div>
        <div style="font-size:12px;color:var(--text-dim)">⏱ ${result.duration} min</div>
        ${kdaSection}
      </div>
    </div>
    <div style="margin-top:14px">
      <button class="btn-primary" onclick="returnFromMatch()">← Return to Manager</button>
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
          ..._draftState.bluePicks.map(p => p.champion),
          ..._draftState.redPicks.map(p => p.champion),
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
    const teamArr = seq.side === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
    const player  = teamArr[seq.posIdx];
    const entry   = { pos: POSITIONS[seq.posIdx], player, champion: champName, champClass: champData?.class || '' };
    if (seq.side === 'blue') ds.bluePicks.push(entry);
    else                     ds.redPicks.push(entry);
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
  const ds   = _draftState;
  const taken = new Set([
    ...ds.bans.blue, ...ds.bans.red,
    ...ds.bluePicks.map(p => p.champion),
    ...ds.redPicks.map(p => p.champion),
  ]);
  const seq  = DRAFT_SEQUENCE[step];
  if (seq.type === 'pick') {
    const teamArr = seq.side === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
    const player  = teamArr[seq.posIdx];
    const pool    = (player?.champions || []).filter(c => !taken.has(c));
    if (pool.length > 0) return pool;
    // Fallback: any available champ of appropriate class
    return Object.keys(CHAMPIONS).filter(c => !taken.has(c)).slice(0, 8);
  }
  // Ban: all non-taken
  return Object.keys(CHAMPIONS).filter(c => !taken.has(c));
}

function _cpuDraftAction(step) {
  const ds  = _draftState;
  const seq = DRAFT_SEQUENCE[step];
  const banned   = [...ds.bans.blue, ...ds.bans.red];
  const allPicked = [...ds.bluePicks.map(p => p.champion), ...ds.redPicks.map(p => p.champion)];
  if (seq.type === 'ban') {
    const foeArr = seq.side === 'blue' ? ds.redTeamArr : ds.blueTeamArr;
    const taken  = [...banned, ...allPicked];
    const bans   = generateBans(foeArr, 2);
    return bans.find(b => !taken.includes(b))
      || Object.keys(CHAMPIONS).find(c => !taken.includes(c));
  }
  const teamArr  = seq.side === 'blue' ? ds.blueTeamArr : ds.redTeamArr;
  const foePicks = (seq.side === 'blue' ? ds.redPicks : ds.bluePicks).map(p => p.champion);
  const player   = teamArr[seq.posIdx];
  return pickChampion(player, POSITIONS[seq.posIdx], banned, allPicked, foePicks);
}

function _finalizeDraft() {
  const ds = _draftState;
  ds.done  = true;
  const blueNames = ds.bluePicks.map(p => p.champion);
  const redNames  = ds.redPicks.map(p => p.champion);
  const draft = {
    blue: ds.bluePicks,
    red:  ds.redPicks,
    bans: ds.bans,
    blueSynergies: COMP_SYNERGIES[getDominantCompType(blueNames)] || [],
    redSynergies:  COMP_SYNERGIES[getDominantCompType(redNames)]  || [],
    counterScore:  getCounterScore(blueNames, redNames),
  };
  _matchContext.draft = draft;
  renderInteractiveDraft(null);
  renderDraftSynergies(draft);
  document.getElementById('draft-actions').style.display = 'flex';
  document.getElementById('draft-champ-picker').style.display = 'none';
}

// ─── DOM Ready ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderIntro();
  showScreen('screen-intro');
});
