// js/main.js — Grove Manager entry point and game flow

// ─── Module state ─────────────────────────────────────────────────────────────

let _selectedTeamId = null;
let _matchContext   = null;  // { match, blueId, redId, blueName, redName, blueRoster, redRoster, draft }
let _matchResult    = null;  // result from simulateMatch / quickSimulate
let _pbpTimer       = null;

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

  // Find the first unplayed human match in the schedule
  const match = G.season.schedule.find(m =>
    !m.played && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
  );
  if (!match) return;

  const humanIsHome = match.homeId === G.humanTeamId;
  const blueId   = match.homeId;
  const redId    = match.awayId;
  const blueName = G.teams[blueId].name;
  const redName  = G.teams[redId].name;

  const blueRoster = getActiveRoster(blueId);
  const redRoster  = getActiveRoster(redId);
  const draft      = draftChampions(blueRoster, redRoster);

  _matchContext = { match, blueId, redId, blueName, redName, blueRoster, redRoster, humanIsHome, draft };
  _matchResult  = null;

  showScreen('screen-match');
  document.getElementById('draft-phase').style.display        = 'block';
  document.getElementById('pbp-container').style.display      = 'none';
  document.getElementById('pbp-results').style.display        = 'none';
  document.getElementById('pbp-events').innerHTML             = '';

  renderMatchDraft(blueName, redName, draft);
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
  if (_matchResult && _matchContext) {
    _applyMatchResult();
  }
  if (_pbpTimer) { clearTimeout(_pbpTimer); _pbpTimer = null; }
  if (typeof setMapSkipMode === 'function') setMapSkipMode(false);

  _matchResult  = null;
  _matchContext = null;

  showScreen('screen-game');
  showMain('dashboard');
}

// ─── Apply result to game state ───────────────────────────────────────────────

function _applyMatchResult() {
  const { match, blueId, redId } = _matchContext;
  const blueWon = _matchResult.winner === 'blue';

  match.played = true;
  match.result = {
    winnerId:  blueWon ? blueId : redId,
    blueKills: _matchResult.blueKills,
    redKills:  _matchResult.redKills,
    duration:  _matchResult.duration,
  };

  const blueTeam = G.teams[blueId];
  const redTeam  = G.teams[redId];

  if (blueWon) {
    blueTeam.wins++;  blueTeam.points += 3;
    redTeam.losses++;
  } else {
    redTeam.wins++;   redTeam.points += 3;
    blueTeam.losses++;
  }

  const winner = blueWon ? blueTeam : redTeam;
  const loser  = blueWon ? redTeam  : blueTeam;
  const wk = G.season.week > 1 ? G.season.week - 1 : 1;
  addNews(
    `${winner.name} defeat ${loser.name} in Week ${wk}. (${_matchResult.blueKills}–${_matchResult.redKills} kills, ${_matchResult.duration} min)`,
    'match'
  );

  // Update morale and form for all players in this match
  _applyPostMatchMorale(blueId, 'blue', blueWon);
  _applyPostMatchMorale(redId,  'red',  !blueWon);
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

const PBP_DELAY = 850; // ms per event

function startPBP(events) {
  if (typeof initMapVisualization === 'function') initMapVisualization();
  if (typeof setMapSkipMode       === 'function') setMapSkipMode(false);

  const feedEl = document.getElementById('pbp-events');
  _updateMatchScore(0, 0, 0, 0, 0, 0, 50);

  let idx = 0;
  function step() {
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
    _pbpTimer = setTimeout(step, PBP_DELAY);
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

// ─── DOM Ready ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  renderIntro();
  showScreen('screen-intro');
});
