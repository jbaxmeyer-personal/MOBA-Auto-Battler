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
  const { blueRoster, redRoster, blueName, redName } = _matchContext;

  _matchResult = simulateMatch(blueRoster, redRoster, blueName, redName);

  document.getElementById('draft-phase').style.display   = 'none';
  document.getElementById('pbp-container').style.display = 'block';
  document.getElementById('pbp-results').style.display   = 'none';
  document.getElementById('pbp-events').innerHTML        = '';

  _updateMatchScore(0, 0, 0, 0, 0, 0, 50);
  startPBP(_matchResult.events);
}

function onSkipMatch() {
  if (!_matchContext) return;
  const { blueRoster, redRoster, blueName, redName } = _matchContext;

  _matchResult = simulateMatch(blueRoster, redRoster, blueName, redName);

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

function _showMatchResult(result) {
  if (!result || !_matchContext) return;
  const { blueName, redName, blueId } = _matchContext;
  const blueWon   = result.winner === 'blue';
  const winner    = blueWon ? blueName : redName;
  const humanWon  = (result.winner === 'blue') === (blueId === G.humanTeamId);

  const el = document.getElementById('pbp-results');
  if (!el) return;
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
