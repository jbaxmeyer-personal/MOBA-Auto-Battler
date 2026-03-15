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

// ─── Personality Badge ────────────────────────────────────────────────────────

const PERSONALITY_LABEL = { leader:'Leader', maverick:'Maverick', grinder:'Grinder', volatile:'Volatile', pro:'Pro' };
const PERSONALITY_COLOR = { leader:'#4fc3f7', maverick:'#ff7b7b', grinder:'#8bc34a', volatile:'#ffd740', pro:'#b0bec5' };
const PERSONALITY_DESC  = {
  leader:   'Boosts team morale',
  maverick: 'High upside, trains unevenly',
  grinder:  'Improves faster in training',
  volatile: 'Big swings in training gains',
  pro:      'Consistent and reliable',
};
function personalityBadge(p) {
  const label = PERSONALITY_LABEL[p] || p;
  const color = PERSONALITY_COLOR[p] || '#888';
  return `<span class="personality-badge" style="color:${color};border-color:${color}">${label}</span>`;
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

function _escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    case 'training':   renderTraining(); break;
    case 'finances':   renderFinances(); break;
    case 'league':     renderLeague(); break;
    case 'schedule':   renderSchedule(); break;
    case 'scouting':   renderScouting(); break;
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
  const continueBtn = document.getElementById('btn-continue');
  if (continueBtn) continueBtn.style.display = hasSave() ? 'block' : 'none';
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function renderDashboard() {
  if (!G) return;
  const team = G.teams[G.humanTeamId];

  // Next match — check playoffs first, then regular schedule
  let nextMatch = null;
  if (G.season.phase === 'playoffs' && G.season.playoffMatches) {
    nextMatch = G.season.playoffMatches.find(m =>
      !m.played && m.homeId && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
    );
  }
  if (!nextMatch) {
    nextMatch = G.season.schedule.find(m =>
      !m.played && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
    );
  }
  const nextMatchEl = document.getElementById('next-match-info');
  const playBtn     = document.getElementById('btn-play-match');
  if (nextMatch && nextMatchEl) {
    const oppId   = nextMatch.homeId === G.humanTeamId ? nextMatch.awayId : nextMatch.homeId;
    const opp     = G.teams[oppId];
    const isHome  = nextMatch.homeId === G.humanTeamId;
    const fmtLabel = (nextMatch.format || 'bo3').toUpperCase();
    const roundLabel = nextMatch.isPlayoff ? ` — ${nextMatch.round === 'final' ? 'Grand Final' : 'Semi-Final'}` : '';
    nextMatchEl.innerHTML = `
      <strong>Week ${nextMatch.week}${roundLabel}</strong><br>
      ${isHome ? team.name : opp.name}
      <span style="color:var(--text-dim)"> vs </span>
      ${isHome ? opp.name : team.name}<br>
      <span style="font-size:11px;color:var(--text-dim)">${opp.wins}W ${opp.losses}L · ${fmtLabel}</span>
    `;
    if (playBtn) {
      playBtn.style.display = 'block';
      playBtn._matchId = nextMatch;
    }
  } else if (nextMatchEl) {
    nextMatchEl.textContent = G.season.phase === 'playoffs' ? 'Playoffs in progress...' : (G.season.phase === 'offseason' ? 'Season complete!' : 'No upcoming match');
    if (playBtn) playBtn.style.display = 'none';
  }

  // New season button
  const newSeasonBtn = document.getElementById('btn-new-season');
  if (newSeasonBtn) {
    newSeasonBtn.style.display = G.season.phase === 'offseason' ? 'block' : 'none';
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
    <div class="mini-row${t.id === G.humanTeamId ? ' mini-human' : ''}" style="cursor:pointer" onclick="showTeamDetail('${t.id}')">
      <span class="mini-pos">${i+1}</span>
      <span class="mini-dot" style="background:${G.teams[t.id].color}"></span>
      <span class="mini-name">${t.name}</span>
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
        <td>${personalityBadge(p.personality || 'pro')}</td>
      </tr>`;
  }).join('');

  const chem = calcChemistry(G.humanTeamId);
  const chemColor = chem >= 7 ? '#4caf50' : chem >= 5 ? '#c89b3c' : '#f44336';

  setHtml('squad-content', `
    <div class="chemistry-bar">
      Team Chemistry: <span style="color:${chemColor};font-weight:700">${chem.toFixed(1)}/10</span>
      <span style="color:var(--text-dim);font-size:11px">— avg morale + personality compatibility</span>
    </div>
    <table class="squad-table">
      <thead><tr>
        <th>Pos</th><th>Name</th><th>OVR</th><th>Age</th>
        <th>Nat</th><th>Salary</th><th>Morale</th><th>Contract</th><th>Personality</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:20px">No players</td></tr>'}</tbody>
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

  const pers = p.personality || 'pro';
  const persDesc = PERSONALITY_DESC[pers] || '';

  setHtml('player-profile-content', `
    <div class="profile-meta" style="margin-bottom:20px">
      <div class="profile-meta-main">
        <div class="profile-name">${p.name} ${personalityBadge(pers)}</div>
        <div class="profile-detail">
          <span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span>
          &nbsp; Age ${p.age} · ${p.nationality} · ${fmtMoney(p.contract.salary)}/yr · ${p.contract.yearsLeft} yr left
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px">${persDesc}</div>
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
  team.weeklyWages = calcWagesBill(G.humanTeamId);

  addNews(`Signed ${p.name} (${posLabel(p.position)}, OVR ${calcOverall(p)}).`, 'info');
  renderTransfers('free-agents');
  renderTopBar();
}

// ─── Training ────────────────────────────────────────────────────────────────

function setTraining(choice) {
  if (!G) return;
  G.weeklyTraining = choice;
  renderTraining();
}

function renderTraining() {
  if (!G) return;
  const current = G.weeklyTraining || 'rest';
  const team    = G.teams[G.humanTeamId];
  const choices = Object.entries(TRAINING_DEFS);

  const playerRows = POSITIONS.map(pos => {
    const pid = team.roster[pos];
    const p   = pid ? G.players[pid] : null;
    if (!p) return '';
    const ovr = calcOverall(p);
    const formAvg = p.form.length ? Math.round(p.form.reduce((a,b)=>a+b,0)/p.form.length) : 5;
    const moraleColor = p.morale >= 7 ? '#4caf50' : p.morale >= 4 ? '#c89b3c' : '#f44336';
    return `<tr>
      <td style="color:var(--text-dim);font-size:11px">${posLabel(pos)}</td>
      <td>${_escHtml(p.name)}</td>
      <td><span class="ovr-badge ${overallColor(ovr)}">${ovr}</span></td>
      <td>Age ${p.age}</td>
      <td style="color:${moraleColor}">♥ ${p.morale.toFixed(1)}</td>
      <td style="color:var(--text-dim)">${formAvg}/10 form</td>
    </tr>`;
  }).join('');

  const btnRows = choices.map(([key, def]) => {
    const active = key === current;
    return `<div class="training-option ${active ? 'training-active' : ''}" onclick="setTraining('${key}')">
      <span class="training-icon">${def.icon}</span>
      <div class="training-info">
        <div class="training-label">${def.label}</div>
        <div class="training-desc">${def.desc}</div>
      </div>
      ${active ? '<span class="training-check">✓ Selected</span>' : ''}
    </div>`;
  }).join('');

  setHtml('training-content', `
    <div class="training-layout">
      <div class="training-choices">
        <h3 style="margin-bottom:10px;color:var(--text-dim);font-size:13px">THIS WEEK'S FOCUS</h3>
        ${btnRows}
      </div>
      <div class="training-squad">
        <h3 style="margin-bottom:10px;color:var(--text-dim);font-size:13px">SQUAD CONDITION</h3>
        <table class="squad-table" style="width:100%">
          <tbody>${playerRows}</tbody>
        </table>
      </div>
    </div>
  `);
}

// ─── Finances ────────────────────────────────────────────────────────────────

function renderFinances() {
  if (!G) return;
  const team = G.teams[G.humanTeamId];
  const net  = team.sponsorIncome - team.weeklyWages;
  const weeksLeft = Math.max(0, G.season.totalWeeks - G.season.week + 1);

  // Sponsor cards section
  const sponsors = team.sponsors || [];
  const sponsorCardsHtml = sponsors.length ? `
    <div class="finance-card" style="margin-top:14px">
      <h3>Sponsors</h3>
      <div class="sponsor-cards">
        ${sponsors.map(sp => `
          <div class="sponsor-card">
            <div class="sponsor-card-header">
              <div class="sponsor-name">${_escHtml(sp.name)}</div>
              <div class="sponsor-income">+${fmtMoney(sp.weeklyIncome)}/wk</div>
            </div>
            <div class="sponsor-bonuses">
              ${(sp.bonuses || []).map(b => `
                <div class="sponsor-bonus">
                  <span class="bonus-label">${_escHtml(b.label)}</span>
                  <span>
                    <span class="bonus-reward">${fmtMoney(b.reward)}</span>
                    ${b.paid
                      ? '<span class="bonus-paid"> ✓ Paid</span>'
                      : '<span class="bonus-pending"> Pending</span>'}
                  </span>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  setHtml('finances-content', `
    <div class="finance-grid">
      <div class="finance-card">
        <h3>Cash Flow</h3>
        <div class="finance-row"><span class="fr-label">Budget</span><span class="fr-val fr-gold">${fmtMoney(team.budget)}</span></div>
        <div class="finance-row"><span class="fr-label">Sponsor income/wk</span><span class="fr-val fr-pos">+${fmtMoney(team.sponsorIncome)}</span></div>
        <div class="finance-row"><span class="fr-label">Wage bill/wk</span><span class="fr-val fr-neg">-${fmtMoney(team.weeklyWages)}</span></div>
        <div class="finance-row"><span class="fr-label">Net/week</span><span class="fr-val ${net >= 0 ? 'fr-pos' : 'fr-neg'}">${net >= 0 ? '+' : ''}${fmtMoney(net)}</span></div>
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
    ${sponsorCardsHtml}
    ${(G.financeLog && G.financeLog.length > 0) ? `
    <div class="finance-card" style="margin-top:14px">
      <h3>Transaction History</h3>
      <table class="squad-table" style="width:100%">
        <thead><tr>
          <th style="text-align:left;color:var(--text-dim);font-size:11px;padding:4px 6px">Week</th>
          <th style="text-align:right;color:var(--text-dim);font-size:11px;padding:4px 6px">Income</th>
          <th style="text-align:right;color:var(--text-dim);font-size:11px;padding:4px 6px">Wages</th>
          <th style="text-align:right;color:var(--text-dim);font-size:11px;padding:4px 6px">Net</th>
          <th style="text-align:right;color:var(--text-dim);font-size:11px;padding:4px 6px">Balance</th>
        </tr></thead>
        <tbody>
          ${G.financeLog.slice().reverse().map(e => {
            const rowNet = e.income - e.wages;
            return `<tr>
              <td style="padding:5px 6px;font-size:12px;color:var(--text-dim)">Wk ${e.week}</td>
              <td style="padding:5px 6px;font-size:12px;text-align:right;color:var(--win)">+${fmtMoney(e.income)}</td>
              <td style="padding:5px 6px;font-size:12px;text-align:right;color:var(--loss)">-${fmtMoney(e.wages)}</td>
              <td style="padding:5px 6px;font-size:12px;text-align:right;color:${rowNet >= 0 ? 'var(--win)' : 'var(--loss)'}">${rowNet >= 0 ? '+':''}${fmtMoney(rowNet)}</td>
              <td style="padding:5px 6px;font-size:12px;text-align:right;color:var(--gold);font-weight:600">${fmtMoney(e.balance)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}
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
          <tr class="${t.id === G.humanTeamId ? 'row-human' : ''} ${i < 4 ? 'row-bracket' : ''}" style="cursor:pointer" onclick="showTeamDetail('${t.id}')">
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

// ─── Team Detail ──────────────────────────────────────────────────────────────

function showTeamDetail(teamId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-team-detail')?.classList.add('active');
  renderTeamDetail(teamId);
}

function renderTeamDetail(teamId) {
  if (!G) return;
  const team = G.teams[teamId];
  if (!team) return;

  setText('team-detail-name', team.name);

  const players = POSITIONS.map(pos => team.roster[pos] ? G.players[team.roster[pos]] : null);
  const record = `${team.wins}W – ${team.losses}L · ${team.points} pts`;

  const rows = players.map(p => {
    if (!p) return `<tr><td colspan="8" style="color:var(--text-dim)">Empty slot</td></tr>`;
    const ovr = calcOverall(p);
    const kda  = p.career?.gamesPlayed
      ? `${(p.career.kills/p.career.gamesPlayed).toFixed(1)}/${(p.career.deaths/p.career.gamesPlayed).toFixed(1)}/${(p.career.assists/p.career.gamesPlayed).toFixed(1)}`
      : '—';
    const cs = p.career?.gamesPlayed ? Math.round(p.career.cs / p.career.gamesPlayed) : '—';
    const wr = p.career?.gamesPlayed ? `${Math.round(p.career.wins/p.career.gamesPlayed*100)}%` : '—';
    const isHuman = teamId === G.humanTeamId;
    return `<tr>
      <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
      <td style="font-weight:600">${_escHtml(p.name)}</td>
      <td style="color:var(--gold);font-weight:600">${ovr}</td>
      <td style="color:var(--text-dim)">${p.age}</td>
      <td style="color:var(--text-dim)">${p.nationality}</td>
      <td>${kda}</td>
      <td style="color:var(--text-dim)">${cs}</td>
      <td style="color:${wr !== '—' && parseInt(wr)>=50 ? 'var(--win)' : 'var(--loss)'}">${wr}</td>
    </tr>`;
  }).join('');

  const champRows = players.filter(Boolean).map(p => {
    const champs = (p.champions || []).slice(0, 4).join(', ') || '—';
    return `<tr>
      <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
      <td style="font-weight:600">${_escHtml(p.name)}</td>
      <td style="color:var(--text-dim);font-size:12px">${champs}</td>
    </tr>`;
  }).join('');

  setHtml('team-detail-content', `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
      <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${team.color}"></span>
      <span style="font-size:18px;font-weight:700;color:${team.color}">${_escHtml(team.name)}</span>
      <span style="color:var(--text-dim);margin-left:8px">${record}</span>
      ${teamId === G.humanTeamId ? '<span style="color:var(--gold);font-size:11px;margin-left:6px">YOUR TEAM</span>' : ''}
    </div>
    <h3 style="margin-bottom:8px;font-size:13px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Roster</h3>
    <table class="standings" style="margin-bottom:24px">
      <thead><tr>
        <th>Pos</th><th>Player</th><th>OVR</th><th>Age</th><th>Nat</th><th>KDA/g</th><th>CS/g</th><th>WR</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h3 style="margin-bottom:8px;font-size:13px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Champion Pools</h3>
    <table class="standings">
      <thead><tr><th>Pos</th><th>Player</th><th>Champions</th></tr></thead>
      <tbody>${champRows}</tbody>
    </table>
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
          const score = m.result.score || '1-0';
          if (isHuman) {
            const humanWon = m.result.winnerId === G.humanTeamId;
            result = `<span class="sched-result ${humanWon ? 'sched-win' : 'sched-loss'}">${humanWon ? 'W' : 'L'} ${score}</span>`;
          } else {
            const won = m.result.winnerId === m.homeId;
            result = `<span class="sched-upcoming" style="color:${won ? 'var(--win)':'var(--loss)'}">${G.teams[m.result.winnerId].name} won ${score}</span>`;
          }
        } else {
          result = `<span class="sched-upcoming">Upcoming</span>`;
        }
        return `<div class="sched-match ${isHuman ? 'sched-human' : ''}">
          <span class="sched-team" style="color:${home.color};cursor:pointer" onclick="showTeamDetail('${m.homeId}')">${home.name}</span>
          <span class="sched-vs">vs</span>
          <span class="sched-team" style="color:${away.color};cursor:pointer" onclick="showTeamDetail('${m.awayId}')">${away.name}</span>
          ${result}
        </div>`;
      }).join('')}
    </div>`;
  }
  setHtml('schedule-content', html);
}

// ─── Match Draft Display ──────────────────────────────────────────────────────

// Class abbreviation badge shown next to each champion name
const CLASS_BADGE = {
  Tank:      { label:'TK', color:'#4fc3f7' },
  Fighter:   { label:'FT', color:'#ff9800' },
  Assassin:  { label:'AS', color:'#e040fb' },
  Mage:      { label:'MG', color:'#40c4ff' },
  Marksman:  { label:'MM', color:'#69f0ae' },
  Sentinel:  { label:'SN', color:'#ffd740' },
};

function classBadge(champClass) {
  const b = CLASS_BADGE[champClass];
  if (!b) return '';
  return `<span class="class-badge" style="color:${b.color};border-color:${b.color}">${b.label}</span>`;
}

function renderInteractiveDraft(availChamps) {
  const ds = _draftState;
  if (!ds) return;
  const { bans, bluePicks, redPicks, step, done, humanSide } = ds;
  const blueName = _matchContext?.blueName || 'Blue';
  const redName  = _matchContext?.redName  || 'Red';
  const seq = (!done && step < DRAFT_SEQUENCE.length) ? DRAFT_SEQUENCE[step] : null;

  // ── Turn indicator ─────────────────────────────────────────────────────────
  let turnHtml = '';
  if (!done && seq) {
    const isHuman   = seq.side === humanSide;
    const teamLabel = seq.side === 'blue' ? blueName : redName;
    const posName   = seq.type === 'pick' ? posLabel(POSITIONS[seq.posIdx]) : '';
    const action    = seq.type === 'ban' ? 'Ban a Champion' : `Pick for ${posName}`;
    turnHtml = `<div class="draft-turn-indicator ${isHuman ? 'turn-yours' : 'turn-cpu'}">
      ${isHuman ? '▶ YOUR TURN —' : `${_escHtml(teamLabel)} —`} ${action}
      ${!isHuman ? '<span class="turn-thinking">thinking…</span>' : ''}
    </div>`;
  } else if (done) {
    turnHtml = `<div class="draft-turn-indicator turn-done">✓ Draft Complete — Ready to play</div>`;
  }

  // ── Ban slots ──────────────────────────────────────────────────────────────
  const banSlot = (champ, side) => champ
    ? `<span class="ban-chip ban-chip-${side} ban-filled">${_escHtml(champ)}</span>`
    : `<span class="ban-slot-empty ban-slot-${side}">—</span>`;
  const bansHtml = `<div class="ban-row">
    <span class="ban-row-label blue-text">Blue Bans:</span>
    ${[0,1].map(i => banSlot(bans.blue[i],'blue')).join('')}
    <span class="ban-row-sep">·</span>
    ${[0,1].map(i => banSlot(bans.red[i],'red')).join('')}
    <span class="ban-row-label red-text">:Red Bans</span>
  </div>`;

  // ── Pick board ─────────────────────────────────────────────────────────────
  const pickSlot = (pickArr, posIdx, side) => {
    const pick = pickArr[posIdx];
    const pos  = POSITIONS[posIdx];
    const isCurrent = !done && seq && seq.type === 'pick' && seq.side === side && seq.posIdx === posIdx;
    return `<div class="draft-pick ${isCurrent ? 'pick-current' : ''} ${!pick ? 'pick-empty' : ''}">
      <span class="pick-pos">${posIcon(pos)}</span>
      <span class="pick-player">${pick ? _escHtml(pick.player?.name || '—') : posLabel(pos)}</span>
      ${pick ? `<span class="pick-champ">${_escHtml(pick.champion)}</span>${classBadge(pick.champClass)}` : ''}
    </div>`;
  };

  const blueCol = `<div class="draft-col">
    <div class="draft-col-label blue-text">${_escHtml(blueName)}</div>
    ${POSITIONS.map((_,i) => pickSlot(bluePicks, i, 'blue')).join('')}
  </div>`;
  const redCol  = `<div class="draft-col">
    <div class="draft-col-label red-text">${_escHtml(redName)}</div>
    ${POSITIONS.map((_,i) => pickSlot(redPicks, i, 'red')).join('')}
  </div>`;

  setHtml('draft-bans',  bansHtml + turnHtml);
  setHtml('draft-picks', blueCol + redCol);

  // ── Champion picker ────────────────────────────────────────────────────────
  const pickerEl = document.getElementById('draft-champ-picker');
  if (!pickerEl) return;

  if (availChamps && availChamps.length > 0) {
    const isBan  = seq && seq.type === 'ban';
    const cards  = availChamps.map(champName => {
      const cd = CHAMPIONS[champName];
      const b  = cd ? CLASS_BADGE[cd.class.toLowerCase()] : null;
      return `<div class="draft-champ-card" onclick="applyDraftAction('${champName.replace(/'/g,"\\'")}')">
        <div class="dcc-name">${_escHtml(champName)}</div>
        ${b ? `<span class="class-badge" style="color:${b.color};border-color:${b.color}">${b.label}</span>` : ''}
      </div>`;
    }).join('');
    pickerEl.style.display = 'block';
    pickerEl.innerHTML = `
      <div class="draft-picker-label">${isBan ? '🚫 Choose a Champion to BAN' : `✓ Pick for ${posLabel(POSITIONS[seq.posIdx])}`}</div>
      <div class="draft-champ-grid">${cards}</div>`;
  } else {
    pickerEl.style.display = 'none';
    pickerEl.innerHTML = '';
  }
}

function renderDraftSynergies(draft) {
  const blueName = _matchContext?.blueName || 'Blue';
  const redName  = _matchContext?.redName  || 'Red';
  const synBadges = (syns, side) => (syns||[]).map(s =>
    `<span class="synergy ${side}-syn">${s.name}: ${s.desc}</span>`).join('');
  const cs = draft.counterScore || 0;
  const csLine = Math.abs(cs) >= 0.5
    ? `<span class="counter-score ${cs > 0 ? 'blue-text':'red-text'}">${cs > 0 ? _escHtml(blueName) : _escHtml(redName)} has the counter edge</span>`
    : '';
  setHtml('comp-synergies', synBadges(draft.blueSynergies,'blue') + synBadges(draft.redSynergies,'red') + csLine);
}

// ─── Scouting ────────────────────────────────────────────────────────────────

function renderScouting() {
  if (!G) return;
  const sc = G.scouting || {};
  const discovered = (sc.discovered || []).map(id => G.players[id]).filter(Boolean);
  const team = G.teams[G.humanTeamId];

  // Active scout status
  let scoutStatus = '';
  if (sc.activeScout) {
    scoutStatus = `<div class="scout-active">Scout in the field — report in ${sc.activeScout.weeksLeft} week(s).</div>`;
  } else {
    const canScout = team.budget >= 50000;
    const remaining = SCOUT_POOL.filter(p => !p.discovered && !(sc.discovered||[]).includes(p.id)).length;
    scoutStatus = remaining > 0
      ? `<div class="scout-idle">
           <p>${remaining} undiscovered prospect(s) in the challenger ladder.</p>
           <button class="btn-primary" onclick="onStartScouting()" ${canScout ? '' : 'disabled'}>
             Send Scout ($50K)
           </button>
           ${!canScout ? '<p class="scout-warn">Insufficient budget.</p>' : ''}
         </div>`
      : '<div class="scout-idle"><p>All prospects have been scouted.</p></div>';
  }

  // Discovered players
  let discoveredHtml = '';
  if (discovered.length) {
    discoveredHtml = `<div class="scout-reports">
      <h3>Scout Reports</h3>
      ${discovered.map(p => {
        const ovr = calcOverall(p);
        const inFA = G.freeAgents.includes(p.id);
        return `<div class="scout-report-row">
          <span class="sr-pos">${posIcon(p.position)}</span>
          <span class="sr-name">${_escHtml(p.name)}</span>
          <span class="ovr-badge ${overallColor(ovr)}">${ovr}</span>
          ${personalityBadge(p.personality || 'pro')}
          <span class="sr-age">Age ${p.age}</span>
          <span class="sr-pot pot-${p.potential}">${p.potential} potential</span>
          ${inFA ? '<span class="sr-fa">Free Agent</span>' : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  setHtml('scouting-content', scoutStatus + discoveredHtml);
}

// ─── renderAll ────────────────────────────────────────────────────────────────

function renderAll() {
  renderTopBar();
  renderDashboard();
}
