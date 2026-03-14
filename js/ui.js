// js/ui.js — Grove Manager render functions

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${(abs/1000000).toFixed(1)}M`;
  if (abs >= 1000)    return `${sign}$${Math.round(abs/1000)}K`;
  return `${sign}$${abs}`;
}

function overallColor(ovr) {
  if (ovr >= 75) return 'ovr-green';
  if (ovr >= 55) return 'ovr-yellow';
  return 'ovr-red';
}

function attrColor(val) {
  if (val >= 16) return '#4caf50';
  if (val >= 12) return '#c89b3c';
  if (val >= 8)  return '#4fc3f7';
  return '#f44336';
}

function posIcon(pos) {
  return { vanguard:'⚔️', ranger:'🌿', arcanist:'🔮', hunter:'🏹', warden:'🛡️' }[pos] || '👤';
}

function posLabel(pos) {
  return { vanguard:'Vanguard', ranger:'Ranger', arcanist:'Arcanist', hunter:'Hunter', warden:'Warden' }[pos] || pos;
}

function statLabel(key) {
  return {
    mechanics:'Mechanics', csAccuracy:'CS Accuracy', teamfightPositioning:'TF Positioning',
    mapMovement:'Map Movement', objectiveExecution:'Objective Exec', championPoolDepth:'Champ Pool Depth',
    decisionMaking:'Decision Making', gameSense:'Game Sense', communication:'Communication',
    leadership:'Leadership', adaptability:'Adaptability', composure:'Composure',
  }[key] || key;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setHtml(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

// ─── Panel / Sidebar routing ──────────────────────────────────────────────────

function showMain(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-screen="${name}"]`);
  if (nav) nav.classList.add('active');
  // Call panel-specific render
  switch (name) {
    case 'dashboard':  renderDashboard(); break;
    case 'squad':      renderSquad('starters'); break;
    case 'tactics':    renderTactics(); break;
    case 'transfers':  renderTransfers('free-agents'); break;
    case 'finances':   renderFinances(); break;
    case 'league':     renderLeague(); break;
    case 'schedule':   renderSchedule(); break;
  }
}

function showSquadTab(tab) {
  document.querySelectorAll('#panel-squad .ptab').forEach(b => b.classList.remove('active'));
  document.querySelector(`#panel-squad .ptab[onclick="showSquadTab('${tab}')"]`)?.classList.add('active');
  renderSquad(tab);
}

function showTransferTab(tab) {
  document.querySelectorAll('#panel-transfers .ptab').forEach(b => b.classList.remove('active'));
  document.querySelector(`#panel-transfers .ptab[onclick="showTransferTab('${tab}')"]`)?.classList.add('active');
  renderTransfers(tab);
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function renderTopBar() {
  if (!G) return;
  const team = G.teams[G.humanTeamId];
  if (!team) return;
  setText('top-team-name', team.name);
  setText('top-week', getWeekLabel());
  setText('top-budget', fmtMoney(team.budget));
  setText('top-wages', fmtMoney(team.weeklyWages) + '/wk');
  setText('top-fans', (team.fans / 1000).toFixed(0) + 'K');
  setText('top-record', `${team.wins}W ${team.losses}L`);
}

// ─── Intro ────────────────────────────────────────────────────────────────────

function renderIntro() {
  const grid = document.getElementById('team-select-grid');
  if (!grid) return;
  grid.innerHTML = TEAMS_DATA.map(t => `
    <div class="team-select-card" id="tsc-${t.id}" onclick="onSelectTeam('${t.id}')">
      <div class="tsc-short" style="color:${t.color}">${t.shortName}</div>
      <div class="tsc-name">${t.name}</div>
      <div class="tsc-budget">${fmtMoney(t.budget)}</div>
      <div class="tsc-prestige">${'★'.repeat(Math.round(t.prestige/2))} P${t.prestige}</div>
    </div>
  `).join('');
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function renderDashboard() {
  if (!G) return;
  const team = G.teams[G.humanTeamId];

  // Next match
  const nextMatch = G.season.schedule.find(m =>
    !m.played && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
  );
  const nextMatchEl = document.getElementById('next-match-info');
  const playBtn     = document.getElementById('btn-play-match');
  if (nextMatch && nextMatchEl) {
    const oppId   = nextMatch.homeId === G.humanTeamId ? nextMatch.awayId : nextMatch.homeId;
    const opp     = G.teams[oppId];
    const isHome  = nextMatch.homeId === G.humanTeamId;
    nextMatchEl.innerHTML = `
      <strong>Week ${nextMatch.week}</strong><br>
      ${isHome ? team.shortName : opp.shortName}
      <span style="color:var(--text-dim)"> vs </span>
      ${isHome ? opp.shortName : team.shortName}<br>
      <span style="font-size:11px;color:var(--text-dim)">${opp.name} · ${opp.wins}W ${opp.losses}L</span>
    `;
    if (playBtn) {
      playBtn.style.display = 'block';
      playBtn._matchId = nextMatch;
    }
  } else if (nextMatchEl) {
    nextMatchEl.textContent = G.season.phase === 'playoffs' ? 'Playoffs — Coming Soon' : 'No upcoming match';
    if (playBtn) playBtn.style.display = 'none';
  }

  // Team stats
  setHtml('dash-team-stats', `
    <div class="team-stat-row"><span class="tsr-label">Record</span><span class="tsr-val">${team.wins}W – ${team.losses}L</span></div>
    <div class="team-stat-row"><span class="tsr-label">Standing</span><span class="tsr-val">#${getStandings().findIndex(t=>t.id===G.humanTeamId)+1}</span></div>
    <div class="team-stat-row"><span class="tsr-label">Budget</span><span class="tsr-val">${fmtMoney(team.budget)}</span></div>
    <div class="team-stat-row"><span class="tsr-label">Wage bill</span><span class="tsr-val">${fmtMoney(team.weeklyWages)}/wk</span></div>
    <div class="team-stat-row"><span class="tsr-label">Fans</span><span class="tsr-val">${(team.fans/1000).toFixed(0)}K</span></div>
    <div class="team-stat-row"><span class="tsr-label">Playstyle</span><span class="tsr-val" style="text-transform:capitalize">${team.tactics.playstyle}</span></div>
  `);

  // Mini standings
  const standings = getStandings();
  setHtml('dash-standings', standings.map((t, i) => `
    <div class="mini-row${t.id === G.humanTeamId ? ' mini-human' : ''}">
      <span class="mini-pos">${i+1}</span>
      <span class="mini-dot" style="background:${G.teams[t.id].color}"></span>
      <span class="mini-name">${t.shortName}</span>
      <span class="mini-record">${t.wins}W ${t.losses}L</span>
    </div>
  `).join(''));

  // News
  const news = G.news.slice(0, 8);
  setHtml('dash-news', news.length
    ? news.map(n => `<div class="news-item news-${n.type}"><span class="news-week">Wk${n.week}</span>${n.text}</div>`).join('')
    : '<div class="news-item">No news yet.</div>'
  );
}

// ─── Squad ────────────────────────────────────────────────────────────────────

function renderSquad(tab = 'starters') {
  if (!G) return;
  const team    = G.teams[G.humanTeamId];
  const players = tab === 'starters'
    ? POSITIONS.map(pos => G.players[team.roster[pos]])
    : G.players ? Object.values(G.players).filter(p =>
        p.teamId === G.humanTeamId && !POSITIONS.some(pos => team.roster[pos] === p.id)
      ) : [];

  const rows = players.filter(Boolean).map(p => {
    const ovr = calcOverall(p);
    const moraleW = Math.round(p.morale * 10);
    const moraleColor = p.morale >= 7 ? '#4caf50' : p.morale >= 5 ? '#c89b3c' : '#f44336';
    return `
      <tr class="squad-row" onclick="renderPlayerProfile('${p.id}')">
        <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
        <td style="font-weight:600;color:var(--text-hi)">${p.name}</td>
        <td><span class="overall-badge ${overallColor(ovr)}">${ovr}</span></td>
        <td style="color:var(--text-dim)">${p.age}</td>
        <td style="color:var(--text-dim)">${p.nationality}</td>
        <td>${fmtMoney(p.contract.salary)}/yr</td>
        <td>
          <div class="morale-bar-wrap">
            <div class="morale-bar-bg">
              <div class="morale-bar-fill" style="width:${moraleW}%;background:${moraleColor}"></div>
            </div>
            <span style="font-size:11px;color:var(--text-dim)">${p.morale}/10</span>
          </div>
        </td>
        <td style="color:var(--text-dim);font-size:11px">${p.contract.yearsLeft}yr</td>
      </tr>`;
  }).join('');

  setHtml('squad-content', `
    <table class="squad-table">
      <thead><tr>
        <th>Pos</th><th>Name</th><th>OVR</th><th>Age</th>
        <th>Nat</th><th>Salary</th><th>Morale</th><th>Contract</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:20px">No players</td></tr>'}</tbody>
    </table>
  `);
}

// ─── Player Profile ───────────────────────────────────────────────────────────

function renderPlayerProfile(playerId) {
  if (!G) return;
  const p = G.players[playerId];
  if (!p) return;
  G.selectedPlayerId = playerId;

  // Switch to player panel
  document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
  document.getElementById('panel-player')?.classList.add('active');
  setText('player-profile-name', p.name);

  const ovr = calcOverall(p);
  const TECHNICAL = ['mechanics','csAccuracy','teamfightPositioning','mapMovement','objectiveExecution','championPoolDepth'];
  const MENTAL    = ['decisionMaking','gameSense','communication','leadership','adaptability','composure'];

  const attrBlock = (keys) => keys.map(k => {
    const v = p.stats[k];
    const pct = Math.round((v / 20) * 100);
    return `
      <div class="attr-row">
        <span class="attr-name">${statLabel(k)}</span>
        <div class="attr-bar-bg"><div class="attr-bar-fill" style="width:${pct}%;background:${attrColor(v)}"></div></div>
        <span class="attr-val" style="color:${attrColor(v)}">${v}</span>
      </div>`;
  }).join('');

  const champPills = (p.champions || []).map(c => `<span class="champ-pill">${c}</span>`).join('');

  setHtml('player-profile-content', `
    <div class="profile-meta" style="margin-bottom:20px">
      <div class="profile-meta-main">
        <div class="profile-name">${p.name}</div>
        <div class="profile-detail">
          <span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span>
          &nbsp; Age ${p.age} · ${p.nationality} · ${fmtMoney(p.contract.salary)}/yr · ${p.contract.yearsLeft} yr left
        </div>
        <div class="champ-pills">${champPills}</div>
      </div>
      <div style="text-align:right">
        <div class="profile-ovr" style="color:${attrColor(Math.round(ovr/99*20))}">${ovr}</div>
        <div class="profile-ovr-label">Overall</div>
      </div>
    </div>
    <div class="profile-grid">
      <div>
        <div class="attr-section-title">Technical</div>
        ${attrBlock(TECHNICAL)}
      </div>
      <div>
        <div class="attr-section-title">Mental</div>
        ${attrBlock(MENTAL)}
      </div>
    </div>
  `);
}

// ─── Tactics ─────────────────────────────────────────────────────────────────

function renderTactics() {
  if (!G) return;
  const team    = G.teams[G.humanTeamId];
  const current = team.tactics.playstyle;
  setHtml('tactics-content', `
    <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px">
      Choose how your team approaches each match. Your playstyle influences
      objective priority, fighting decisions, and player stat weights during simulation.
    </p>
    <div class="playstyle-grid">
      ${Object.entries(PLAYSTYLES).map(([key, ps]) => `
        <div class="playstyle-card ${current === key ? 'active' : ''}"
             onclick="setPlaystyle('${key}')">
          <div class="ps-name">${ps.name}</div>
          <div class="ps-desc">${ps.desc}</div>
        </div>
      `).join('')}
    </div>
  `);
}

function setPlaystyle(key) {
  if (!G) return;
  G.teams[G.humanTeamId].tactics.playstyle = key;
  addNews(`Tactics updated to ${PLAYSTYLES[key].name}.`, 'info');
  renderTactics();
}

// ─── Transfers ────────────────────────────────────────────────────────────────

function renderTransfers(tab = 'free-agents') {
  if (!G) return;
  const team = G.teams[G.humanTeamId];

  if (tab === 'free-agents') {
    const fas = G.freeAgents.map(id => G.players[id]).filter(Boolean);
    const rows = fas.map(p => {
      const ovr = calcOverall(p);
      const canAfford = team.budget >= p.contract.salary * 1 && team.budget > 0;
      return `
        <tr class="transfer-row">
          <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
          <td style="font-weight:600;color:var(--text-hi)">${p.name}</td>
          <td><span class="overall-badge ${overallColor(ovr)}">${ovr}</span></td>
          <td style="color:var(--text-dim)">${p.age}</td>
          <td style="color:var(--text-dim)">${p.nationality}</td>
          <td>${fmtMoney(p.contract.salary)}/yr</td>
          <td>
            <button class="btn-sign" onclick="signFreeAgent('${p.id}')"
              ${canAfford ? '' : 'disabled'}>
              Sign
            </button>
          </td>
        </tr>`;
    }).join('');

    setHtml('transfers-content', `
      <p style="color:var(--text-dim);font-size:12px;margin-bottom:12px">
        Budget: <strong style="color:var(--gold)">${fmtMoney(team.budget)}</strong>
        &nbsp;·&nbsp; Wage bill: ${fmtMoney(team.weeklyWages)}/wk
      </p>
      <table class="transfer-table">
        <thead><tr><th>Pos</th><th>Player</th><th>OVR</th><th>Age</th><th>Nat</th><th>Salary Ask</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px">No free agents available</td></tr>'}</tbody>
      </table>
    `);
  } else {
    // Listed for transfer (players with onTransferList flag)
    const listed = Object.values(G.players).filter(p =>
      p.teamId === G.humanTeamId && p.onTransferList
    );
    setHtml('transfers-content', listed.length
      ? `<p style="color:var(--text-dim);font-size:13px">Players listed for transfer appear here.</p>`
      : '<div class="coming-soon"><div class="cs-icon">💼</div><div class="cs-title">No listed players</div><div class="cs-desc">You have not listed any players for transfer.</div></div>'
    );
  }
}

function signFreeAgent(playerId) {
  if (!G) return;
  const p    = G.players[playerId];
  const team = G.teams[G.humanTeamId];
  if (!p || p.teamId) return;

  // Check roster slot
  const posSlotFree = !team.roster[p.position];
  p.teamId = G.humanTeamId;
  p.contract = { salary: p.contract.salary || 50000, yearsLeft: 1, expiryYear: G.season.year + 1 };
  if (posSlotFree) team.roster[p.position] = p.id;

  // Remove from free agents list
  G.freeAgents = G.freeAgents.filter(id => id !== playerId);
  team.weeklyWages = Object.values(G.players)
    .filter(pl => pl.teamId === G.humanTeamId)
    .reduce((s, pl) => s + (pl.contract.salary || 0), 0);

  addNews(`Signed ${p.name} (${posLabel(p.position)}, OVR ${calcOverall(p)}).`, 'info');
  renderTransfers('free-agents');
  renderTopBar();
}

// ─── Finances ────────────────────────────────────────────────────────────────

function renderFinances() {
  if (!G) return;
  const team = G.teams[G.humanTeamId];
  const net  = team.sponsorIncome - team.weeklyWages;
  const weeksLeft = Math.max(0, G.season.totalWeeks - G.season.week + 1);

  setHtml('finances-content', `
    <div class="finance-grid">
      <div class="finance-card">
        <h3>Cash Flow</h3>
        <div class="finance-row"><span class="fr-label">Budget</span><span class="fr-val fr-gold">${fmtMoney(team.budget)}</span></div>
        <div class="finance-row"><span class="fr-label">Sponsor income/wk</span><span class="fr-val fr-pos">+${fmtMoney(team.sponsorIncome)}</span></div>
        <div class="finance-row"><span class="fr-label">Wage bill/wk</span><span class="fr-val fr-neg">-${fmtMoney(team.weeklyWages)}</span></div>
        <div class="finance-row"><span class="fr-label">Net/week</span><span class="fr-val ${net >= 0 ? 'fr-pos' : 'fr-neg'}">${net >= 0 ? '+':''}{${fmtMoney(net)}}</span></div>
        <div class="finance-row"><span class="fr-label">Projected (${weeksLeft}wk)</span><span class="fr-val ${net*weeksLeft >= 0 ? 'fr-pos':'fr-neg'}">${fmtMoney(team.budget + net * weeksLeft)}</span></div>
      </div>
      <div class="finance-card">
        <h3>Roster Cost</h3>
        ${POSITIONS.map(pos => {
          const pid = team.roster[pos];
          const p   = pid ? G.players[pid] : null;
          return `<div class="finance-row">
            <span class="fr-label">${posLabel(pos)}</span>
            <span class="fr-val">${p ? `${p.name} — ${fmtMoney(p.contract.salary)}/yr` : '<i style="color:var(--text-dim)">Empty slot</i>'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `);
}

// ─── League ───────────────────────────────────────────────────────────────────

function renderLeague() {
  if (!G) return;
  const standings = getStandings();
  const hdr = document.getElementById('panel-league-header');
  if (hdr) hdr.textContent = `Verdant League — ${G.season.split === 'spring' ? 'Spring' : 'Summer'} Split ${G.season.year}`;

  setHtml('league-content', `
    <table class="standings">
      <thead><tr>
        <th>#</th><th>Team</th><th>W</th><th>L</th><th>Points</th>
      </tr></thead>
      <tbody>
        ${standings.map((t, i) => `
          <tr class="${t.id === G.humanTeamId ? 'row-human' : ''} ${i < 4 ? 'row-bracket' : ''}">
            <td style="color:var(--text-dim)">${i+1}</td>
            <td>
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${G.teams[t.id].color};margin-right:6px;vertical-align:middle"></span>
              ${t.name}${t.id === G.humanTeamId ? ' <span style="color:var(--gold);font-size:10px">YOU</span>' : ''}
            </td>
            <td style="color:var(--win);font-weight:600">${t.wins}</td>
            <td style="color:var(--loss)">${t.losses}</td>
            <td style="color:var(--gold)">${t.points}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p class="bracket-note">Top 4 advance to playoffs.</p>
  `);
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function renderSchedule() {
  if (!G) return;
  const weeks = G.season.totalWeeks;
  let html = '';
  for (let w = 1; w <= weeks; w++) {
    const matches = getWeekMatches(w);
    html += `<div class="schedule-week">
      <div class="sched-week-label">Week ${w}${w === G.season.week ? ' — Current' : ''}</div>
      ${matches.map(m => {
        const home = G.teams[m.homeId], away = G.teams[m.awayId];
        const isHuman = m.homeId === G.humanTeamId || m.awayId === G.humanTeamId;
        let result = '';
        if (m.played && m.result) {
          const humanWon = m.result.winnerId === G.humanTeamId;
          result = isHuman
            ? `<span class="sched-result ${humanWon ? 'sched-win':'sched-loss'}">${humanWon ? 'W' : 'L'}</span>`
            : `<span class="sched-upcoming" style="color:${m.result.winnerId === m.homeId ? 'var(--win)':'var(--loss)'}">${G.teams[m.result.winnerId].shortName} won</span>`;
        } else {
          result = `<span class="sched-upcoming">Upcoming</span>`;
        }
        return `<div class="sched-match ${isHuman ? 'sched-human' : ''}">
          <span class="sched-team" style="color:${home.color}">${home.shortName}</span>
          <span class="sched-vs">vs</span>
          <span class="sched-team" style="color:${away.color}">${away.shortName}</span>
          ${result}
        </div>`;
      }).join('')}
    </div>`;
  }
  setHtml('schedule-content', html);
}

// ─── Match Draft Display ──────────────────────────────────────────────────────

function renderMatchDraft(blueTeamName, redTeamName, draftResult) {
  if (!draftResult) return;
  setText('match-team-blue', blueTeamName);
  setText('match-team-red', redTeamName);

  const col = (picks, side) => `
    <div class="draft-col">
      <div class="draft-col-label ${side === 'blue' ? 'blue-text' : 'red-text'}">${side === 'blue' ? blueTeamName : redTeamName}</div>
      ${picks.map(p => `
        <div class="draft-pick">
          <span class="pick-pos">${posIcon(p.pos)}</span>
          <span class="pick-player">${p.player ? p.player.name : '—'}</span>
          <span class="pick-champ">${p.champion}</span>
        </div>
      `).join('')}
    </div>`;

  setHtml('draft-picks', col(draftResult.blue, 'blue') + col(draftResult.red, 'red'));

  const synBadges = (syns, side) => syns.map(s =>
    `<span class="synergy ${side}-syn">${s.name}: ${s.desc}</span>`
  ).join('');
  setHtml('comp-synergies',
    synBadges(draftResult.blueSynergies || [], 'blue') +
    synBadges(draftResult.redSynergies  || [], 'red')
  );
}

// ─── renderAll ────────────────────────────────────────────────────────────────

function renderAll() {
  renderTopBar();
  renderDashboard();
}
