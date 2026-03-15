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
  return { top:'⚔️', jungle:'🌿', mid:'✦', adc:'🏹', support:'🛡️' }[pos] || '👤';
}

function posLabel(pos) {
  return { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support' }[pos] || pos;
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
    case 'news':       renderNews(); break;
    case 'staff':        renderStaff(); break;
    case 'facilities':   renderFacilities(); break;
    case 'fans':         renderFans(); break;
    case 'teaminfo':     renderTeamInfo(); break;
    case 'champions':    renderChampionBrowser(); break;
    case 'statistics':   renderStatistics(_statsTab); break;
    case 'manager':      renderManagerProfile(); break;
    case 'items':        renderItemBrowser(); break;
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
        <td style="color:${p.contract.yearsLeft<=1?'var(--loss)':'var(--text-dim)'};font-size:11px">
          ${p.contract.yearsLeft}yr
          ${p.contract.yearsLeft<=1 ? `<button class="btn-sm btn-renew" onclick="event.stopPropagation();onOfferRenewal('${p.id}')">Renew</button>` : ''}
        </td>
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
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          ${p.contract.yearsLeft<=1 ? `<button class="btn-sm btn-renew" onclick="onOfferRenewal('${p.id}')">Renew Contract</button>` : ''}
          ${p.teamId===G.humanTeamId ? (p.onTransferList
            ? `<button class="btn-sm btn-secondary" onclick="onUnlistPlayer('${p.id}');renderPlayerProfile('${p.id}')">Unlist from Transfer</button>`
            : `<button class="btn-sm btn-secondary" onclick="onListPlayer('${p.id}');renderPlayerProfile('${p.id}')">List for Transfer</button>`)
            : ''}
        </div>
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
    // Listed tab: your players + CPU transfer-listed players
    const yourListed = Object.values(G.players).filter(p =>
      p.teamId === G.humanTeamId && p.onTransferList
    );
    const cpuListed = Object.values(G.players).filter(p =>
      p.teamId && p.teamId !== G.humanTeamId && p.onTransferList
    );

    let html = '';

    // ─ Your listed players ─
    html += `<div class="transfer-section-header">Your Listed Players</div>`;
    if (yourListed.length) {
      const rows = yourListed.map(p => {
        const ovr = calcOverall(p);
        const fee = calcTransferFee(p.id);
        return `<tr class="transfer-row">
          <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
          <td style="font-weight:600;color:var(--text-hi)">${_escHtml(p.name)}</td>
          <td><span class="overall-badge ${overallColor(ovr)}">${ovr}</span></td>
          <td style="color:var(--text-dim)">${p.age}</td>
          <td style="color:var(--gold)">${fmtMoney(fee)}</td>
          <td><button class="btn-secondary btn-sm" onclick="onUnlistPlayer('${p.id}')">Unlist</button></td>
        </tr>`;
      }).join('');
      html += `<table class="transfer-table" style="margin-bottom:20px">
        <thead><tr><th>Pos</th><th>Player</th><th>OVR</th><th>Age</th><th>Asking Fee</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    } else {
      html += `<p class="transfer-empty">No players listed. Use the Squad screen to list players.</p>`;
    }

    // ─ CPU transfer market ─
    html += `<div class="transfer-section-header" style="margin-top:8px">Transfer Market</div>`;
    if (cpuListed.length) {
      const rows = cpuListed.map(p => {
        const ovr = calcOverall(p);
        const fee = calcTransferFee(p.id);
        const teamName = G.teams[p.teamId]?.name || '?';
        const canAfford = team.budget >= fee;
        return `<tr class="transfer-row">
          <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
          <td style="font-weight:600;color:var(--text-hi)">${_escHtml(p.name)}</td>
          <td><span class="overall-badge ${overallColor(ovr)}">${ovr}</span></td>
          <td style="color:var(--text-dim)">${p.age}</td>
          <td style="color:var(--text-dim)">${_escHtml(teamName)}</td>
          <td style="color:var(--gold)">${fmtMoney(fee)}</td>
          <td>${personalityBadge(p.personality||'pro')}</td>
          <td><button class="btn-primary btn-sm" onclick="showTransferBuyModal('${p.id}')" ${canAfford?'':'disabled'}>Bid</button></td>
        </tr>`;
      }).join('');
      html += `<table class="transfer-table">
        <thead><tr><th>Pos</th><th>Player</th><th>OVR</th><th>Age</th><th>Team</th><th>Fee</th><th></th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    } else {
      html += `<p class="transfer-empty">No players listed by other teams this week.</p>`;
    }

    setHtml('transfers-content', `
      <p style="color:var(--text-dim);font-size:12px;margin-bottom:14px">
        Budget: <strong style="color:var(--gold)">${fmtMoney(team.budget)}</strong>
        &nbsp;·&nbsp; Wage bill: ${fmtMoney(team.weeklyWages)}/wk
      </p>
      ${html}
    `);
  }
}

function signFreeAgent(playerId) {
  showContractModal(playerId, false);
}

// ─── Contract Negotiation Modal ──────────────────────────────────────────────

let _contractNeg = null; // { playerId, isRenewal, lastOffer }

function showContractModal(playerId, isRenewal) {
  if (!G) return;
  const p = G.players[playerId];
  if (!p) return;
  const ovr = calcOverall(p);
  const marketVal = calcMarketValue(playerId);
  const suggested = Math.round(marketVal * 0.9 / 1000) * 1000;

  _contractNeg = { playerId, isRenewal, lastOffer: null };

  setHtml('contract-modal-box', `
    <div class="cmod-header">
      <div class="cmod-player">
        <span class="cmod-pos pos-badge pos-${p.position}">${posLabel(p.position)}</span>
        <span class="cmod-name">${_escHtml(p.name)}</span>
        <span class="ovr-badge ${overallColor(ovr)}">${ovr}</span>
        ${personalityBadge(p.personality || 'pro')}
      </div>
      <button class="cmod-close" onclick="onCloseContractModal()">✕</button>
    </div>
    <div class="cmod-market">
      Market value: <strong>${fmtMoney(marketVal)}/yr</strong>
      &nbsp;·&nbsp; Age ${p.age} &nbsp;·&nbsp; ${p.nationality}
      &nbsp;·&nbsp; <span class="sp-pot pot-${p.potential}">${p.potential} potential</span>
    </div>
    <div id="cmod-body">
      <div class="cmod-form">
        <label class="cmod-label">Salary offer (per year)</label>
        <input id="cmod-salary" class="cmod-input" type="number" min="10000" step="5000" value="${suggested}" />
        <label class="cmod-label" style="margin-top:10px">Contract length</label>
        <div class="cmod-years">
          ${[1,2,3].map(y => `<button class="cmod-yr-btn${y===1?' active':''}" onclick="onSelectContractYears(${y},this)">${y} yr</button>`).join('')}
        </div>
        <input id="cmod-years" type="hidden" value="1" />
        <button class="btn-primary cmod-offer-btn" onclick="onMakeContractOffer()">Make Offer</button>
      </div>
    </div>
  `);

  document.getElementById('contract-modal-overlay').style.display = 'flex';
}

function onSelectContractYears(years, btn) {
  document.querySelectorAll('.cmod-yr-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('cmod-years').value = years;
}

function onMakeContractOffer() {
  if (!_contractNeg || !G) return;
  const salary = parseInt(document.getElementById('cmod-salary').value) || 50000;
  const years  = parseInt(document.getElementById('cmod-years').value) || 1;
  _contractNeg.lastOffer = { salary, years };

  const result = evalContractOffer(_contractNeg.playerId, salary, years);
  const p = G.players[_contractNeg.playerId];
  let bodyHtml = '';

  if (result.type === 'accept') {
    const bwHtml = result.biddingWar
      ? `<div class="cmod-bidwar">⚠️ <strong>${_escHtml(result.biddingWar.teamName)}</strong> has also made an offer — ${fmtMoney(result.biddingWar.salary)}/yr.
          <button class="btn-sm btn-primary" style="margin-left:8px" onclick="onBeatBid(${result.biddingWar.salary})">Beat Bid</button>
          <button class="btn-sm btn-secondary" onclick="onAcceptBidRisk()">Proceed Anyway</button>
         </div>`
      : '';
    bodyHtml = `
      ${bwHtml}
      <div class="cmod-response cmod-accept">
        <span class="cmod-resp-icon">✅</span>
        <span>${_escHtml(p.name)} is happy with the offer and ready to sign.</span>
      </div>
      <div class="cmod-resp-terms">
        ${fmtMoney(salary)}/yr &nbsp;·&nbsp; ${years} year${years>1?'s':''}
      </div>
      <div class="cmod-actions">
        <button class="btn-primary" onclick="onConfirmSigning()">Confirm Signing</button>
        <button class="btn-secondary" onclick="onCloseContractModal()">Cancel</button>
      </div>`;
  } else if (result.type === 'counter') {
    const mid = Math.round((salary + result.counterSalary) / 2 / 1000) * 1000;
    bodyHtml = `
      <div class="cmod-response cmod-counter">
        <span class="cmod-resp-icon">💬</span>
        <span>${_escHtml(p.name)} wants <strong>${fmtMoney(result.counterSalary)}/yr</strong>
        for ${result.counterYears} year${result.counterYears>1?'s':''}.</span>
      </div>
      <div class="cmod-actions">
        <button class="btn-primary" onclick="onAcceptCounter(${result.counterSalary},${result.counterYears})">Accept Counter</button>
        <button class="btn-secondary" onclick="onSplitDifference(${mid},${result.counterYears})">Split (${fmtMoney(mid)}/yr)</button>
        <button class="btn-secondary" onclick="onWalkAway()">Walk Away</button>
      </div>`;
  } else if (result.type === 'reject') {
    bodyHtml = `
      <div class="cmod-response cmod-reject">
        <span class="cmod-resp-icon">❌</span>
        <span>"${result.reason}"</span>
      </div>
      <div class="cmod-actions">
        <button class="btn-secondary" onclick="onWalkAway()">Close</button>
      </div>`;
  }

  setHtml('cmod-body', bodyHtml);
}

function onBeatBid(rivalSalary) {
  const beatSalary = rivalSalary + 5000;
  if (document.getElementById('cmod-salary')) {
    document.getElementById('cmod-salary').value = beatSalary;
  }
  _contractNeg.lastOffer.salary = beatSalary;
  onMakeContractOffer();
}

function onAcceptBidRisk() {
  // Proceed with original offer; small chance player picks rival
  const p = G.players[_contractNeg.playerId];
  if (Math.random() < 0.35) {
    setHtml('cmod-body', `<div class="cmod-response cmod-reject">
      <span class="cmod-resp-icon">😔</span>
      <span>${_escHtml(p.name)} decided to join the other team. Better luck next time.</span>
    </div>
    <div class="cmod-actions"><button class="btn-secondary" onclick="onCloseContractModal()">Close</button></div>`);
  } else {
    onConfirmSigning();
  }
}

function onConfirmSigning() {
  if (!_contractNeg) return;
  const { playerId, isRenewal, lastOffer } = _contractNeg;
  if (!lastOffer) return;
  const res = completeContractSigning(playerId, lastOffer.salary, lastOffer.years, isRenewal);
  if (res === 'no_budget') {
    alert('Insufficient budget.');
    return;
  }
  onCloseContractModal();
  renderTransfers('free-agents');
  renderSquad('starters');
  renderTopBar();
}

function onAcceptCounter(salary, years) {
  if (_contractNeg) _contractNeg.lastOffer = { salary, years };
  const res = completeContractSigning(_contractNeg.playerId, salary, years, _contractNeg.isRenewal);
  if (res === 'no_budget') { alert('Insufficient budget.'); return; }
  onCloseContractModal();
  renderTransfers('free-agents');
  renderSquad('starters');
  renderTopBar();
}

function onSplitDifference(salary, years) {
  if (_contractNeg) _contractNeg.lastOffer = { salary, years };
  // Re-evaluate with the split offer — player should almost always accept
  const result = evalContractOffer(_contractNeg.playerId, salary, years);
  if (result.type === 'accept' || result.type === 'counter') {
    // Accept the split
    onAcceptCounter(salary, years);
  } else {
    onMakeContractOffer(); // re-render with rejection
  }
}

function onWalkAway() {
  if (_contractNeg) {
    rejectContractNegotiation(_contractNeg.playerId, _contractNeg.isRenewal);
  }
  onCloseContractModal();
}

function onCloseContractModal() {
  _contractNeg = null;
  document.getElementById('contract-modal-overlay').style.display = 'none';
}

function onContractModalBgClick(e) {
  if (e.target === document.getElementById('contract-modal-overlay')) {
    onCloseContractModal();
  }
}

function onOfferRenewal(playerId) {
  showContractModal(playerId, true);
}

function onUnlistPlayer(playerId) {
  unlistPlayerFromTransfer(playerId);
  renderTransfers('listed');
}

function onListPlayer(playerId) {
  listPlayerForTransfer(playerId);
  renderTransfers('listed');
  showMain('transfers');
}

function showTransferBuyModal(playerId) {
  if (!G) return;
  const p = G.players[playerId];
  if (!p) return;
  const ovr = calcOverall(p);
  const fee = calcTransferFee(playerId);
  const marketVal = calcMarketValue(playerId);
  const suggested = Math.round(marketVal * 0.9 / 1000) * 1000;
  const sellerName = G.teams[p.teamId]?.name || '?';

  _contractNeg = { playerId, isRenewal: false, lastOffer: null, isBuy: true };

  setHtml('contract-modal-box', `
    <div class="cmod-header">
      <div class="cmod-player">
        <span class="cmod-pos pos-badge pos-${p.position}">${posLabel(p.position)}</span>
        <span class="cmod-name">${_escHtml(p.name)}</span>
        <span class="ovr-badge ${overallColor(ovr)}">${ovr}</span>
        ${personalityBadge(p.personality || 'pro')}
      </div>
      <button class="cmod-close" onclick="onCloseContractModal()">✕</button>
    </div>
    <div class="cmod-market">
      At <strong>${_escHtml(sellerName)}</strong> &nbsp;·&nbsp;
      Calculated fee: <strong style="color:var(--gold)">${fmtMoney(fee)}</strong> &nbsp;·&nbsp;
      Age ${p.age} · ${p.contract.yearsLeft}yr left
    </div>
    <div id="cmod-body">
      <div class="cmod-form">
        <label class="cmod-label">Transfer fee bid</label>
        <input id="cmod-fee" class="cmod-input" type="number" min="${Math.round(fee*0.8)}" step="10000" value="${fee}" />
        <p class="cmod-hint">Minimum accepted: ${fmtMoney(Math.round(fee * 0.8))}</p>
        <label class="cmod-label" style="margin-top:10px">Contract salary offer</label>
        <input id="cmod-salary" class="cmod-input" type="number" min="10000" step="5000" value="${suggested}" />
        <label class="cmod-label" style="margin-top:10px">Contract length</label>
        <div class="cmod-years">
          ${[1,2,3].map(y => `<button class="cmod-yr-btn${y===1?' active':''}" onclick="onSelectContractYears(${y},this)">${y} yr</button>`).join('')}
        </div>
        <input id="cmod-years" type="hidden" value="1" />
        <button class="btn-primary cmod-offer-btn" onclick="onSubmitTransferBid()">Submit Bid</button>
      </div>
    </div>
  `);
  document.getElementById('contract-modal-overlay').style.display = 'flex';
}

function onSubmitTransferBid() {
  if (!_contractNeg) return;
  const fee    = parseInt(document.getElementById('cmod-fee').value) || 0;
  const salary = parseInt(document.getElementById('cmod-salary').value) || 50000;
  const years  = parseInt(document.getElementById('cmod-years').value) || 1;

  const result = buyPlayerFromTeam(_contractNeg.playerId, fee, salary, years);
  const p = G.players[_contractNeg.playerId];
  let bodyHtml = '';

  if (result === 'ok') {
    bodyHtml = `<div class="cmod-response cmod-accept">
      <span class="cmod-resp-icon">✅</span>
      <span>Transfer completed! <strong>${_escHtml(p.name)}</strong> has joined your squad.</span>
    </div>
    <div class="cmod-actions"><button class="btn-primary" onclick="onCloseContractModal();renderSquad('starters');renderTransfers('listed');renderTopBar()">Continue</button></div>`;
  } else if (result === 'rejected') {
    bodyHtml = `<div class="cmod-response cmod-reject">
      <span class="cmod-resp-icon">❌</span>
      <span>Bid rejected. The team wants at least ${fmtMoney(Math.round(calcTransferFee(_contractNeg.playerId)*0.8))}.</span>
    </div>
    <div class="cmod-actions"><button class="btn-secondary" onclick="onCloseContractModal()">Close</button></div>`;
  } else if (result === 'no_budget') {
    bodyHtml = `<div class="cmod-response cmod-reject">
      <span class="cmod-resp-icon">❌</span><span>Insufficient budget for this transfer fee.</span>
    </div>
    <div class="cmod-actions"><button class="btn-secondary" onclick="onCloseContractModal()">Close</button></div>`;
  }

  setHtml('cmod-body', bodyHtml);
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
    const action    = seq.type === 'ban' ? 'Ban a Champion' : 'Pick a Champion';
    turnHtml = `<div class="draft-turn-indicator ${isHuman ? 'turn-yours' : 'turn-cpu'}">
      ${isHuman ? '▶ YOUR TURN —' : `${_escHtml(teamLabel)} —`} ${action}
      ${!isHuman ? '<span class="turn-thinking">thinking…</span>' : ''}
    </div>`;
  } else if (done) {
    turnHtml = `<div class="draft-turn-indicator turn-done">✓ Draft Complete — Assign roles</div>`;
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
  // Picks are now strings (champion names), ordered by draft sequence (indices 0-4)
  const _roleMap = { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support', arcanist:'Mid', vanguard:'Top', ranger:'Jungle', hunter:'ADC', warden:'Support' };
  const pickSlot = (pickArr, idx, side) => {
    const pick = pickArr[idx];
    const isCurrent = !done && seq && seq.type === 'pick' && seq.side === side
      && (side === 'blue' ? ds.bluePicks.length : ds.redPicks.length) === idx;
    const champName  = typeof pick === 'string' ? pick : pick?.champion;
    const cd         = champName ? (CHAMPIONS[champName] || {}) : null;
    const champClass = cd?.class || '';
    const champRoles = cd?.roles ? cd.roles.map(r => _roleMap[r] || r).join(' / ') : '';
    const safe       = champName ? champName.replace(/'/g,"\\'") : '';
    return `<div class="draft-pick ${isCurrent ? 'pick-current' : ''} ${!champName ? 'pick-empty' : ''}" ${champName ? `onclick="showDraftChampInfo('${safe}')" title="${_escHtml(champName)}"` : ''}>
      <span class="pick-pos">${idx + 1}</span>
      <div class="pick-info">
        <span class="pick-player">${champName ? _escHtml(champName) : '—'}</span>
        ${champName ? `<span class="pick-type-roles">${_escHtml(champClass)}${champRoles ? ' · '+_escHtml(champRoles) : ''}</span>` : ''}
      </div>
    </div>`;
  };

  const blueCol = `<div class="draft-col">
    <div class="draft-col-label blue-text">${_escHtml(blueName)}</div>
    ${[0,1,2,3,4].map(i => pickSlot(bluePicks, i, 'blue')).join('')}
  </div>`;
  const redCol  = `<div class="draft-col">
    <div class="draft-col-label red-text">${_escHtml(redName)}</div>
    ${[0,1,2,3,4].map(i => pickSlot(redPicks, i, 'red')).join('')}
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
      const b  = cd ? CLASS_BADGE[(cd.class || '').toLowerCase()] : null;
      const safe = champName.replace(/'/g,"\\'");
      return `<div class="draft-champ-card" onclick="applyDraftAction('${safe}')" onmouseenter="showDraftChampInfo('${safe}')">
        <div class="dcc-name">${_escHtml(champName)}</div>
        ${b ? `<span class="class-badge" style="color:${b.color};border-color:${b.color}">${b.label}</span>` : ''}
      </div>`;
    }).join('');
    pickerEl.style.display = 'block';
    pickerEl.innerHTML = `
      <div class="draft-picker-label">${isBan ? '🚫 Choose a Champion to BAN' : '✓ Pick a Champion'}</div>
      <div class="draft-champ-grid">${cards}</div>
      <div id="draft-champ-info" class="draft-champ-info"></div>`;
  } else {
    pickerEl.style.display = 'none';
    pickerEl.innerHTML = '';
  }
}

// Build short description from ability effects
function _effectsDesc(effects) {
  if (!effects || !effects.length) return '';
  return effects.map(ef => {
    if (ef.type === 'cc')       return `${ef.ccType} ${ef.duration ? ef.duration+'s' : ''}`.trim();
    if (ef.type === 'aoe')      return `area (r:${ef.radius})`;
    if (ef.type === 'channel')  return `channel ${ef.ticks} ticks`;
    if (ef.type === 'vamp')     return `heals ${Math.round(ef.pct*100)}%`;
    if (ef.type === 'spellVamp')return `spell vamp ${Math.round(ef.pct*100)}%`;
    if (ef.type === 'heal')     return 'heals caster';
    if (ef.type === 'shield')   return 'grants shield';
    if (ef.type === 'execute')  return 'execute bonus';
    if (ef.type === 'bounce')   return `bounces ×${ef.count}`;
    if (ef.type === 'trap')     return `places ${ef.count} traps`;
    if (ef.type === 'pull')     return 'pulls target';
    if (ef.type === 'invuln')   return `invulnerable ${ef.duration}s`;
    if (ef.type === 'reflect')  return `reflects ${Math.round((ef.pct||0)*100)}% dmg`;
    if (ef.type === 'globalProjectile') return 'global range';
    if (ef.type === 'terrain')  return `terrain ${ef.duration}s`;
    if (ef.type === 'mobilityCharge') return `${ef.charges} charges`;
    if (ef.type === 'killReset')return 'reset on kill';
    return ef.type;
  }).join(', ');
}

function showDraftChampInfo(champName) {
  const el = document.getElementById('draft-champ-info');
  if (!el) return;
  const cd = CHAMPIONS[champName];
  if (!cd) { el.innerHTML = ''; return; }

  const b = CLASS_BADGE[(cd.class || '').toLowerCase()];
  const stat = (label, val) => `<div class="dci-stat"><span class="dci-stat-label">${label}</span><span class="dci-stat-val">${val}</span></div>`;

  const abilityHtml = (key, icon) => {
    const ab = cd.abilities?.[key];
    if (!ab || key === 'aa') return '';
    const isPhys  = ab.dmgType !== 'magic';
    const dmgStr  = ab.dmg ? `${ab.dmg}${ab.apRatio ? ` (+${ab.apRatio} AP)` : ''}` : '';
    const typeStr = isPhys ? '⚔' : '✦';
    const efDesc  = _effectsDesc(ab.effects);
    return `<div class="dci-ability">
      <div class="dci-ability-header">
        <span class="dci-ability-icon">${icon}</span>
        <span class="dci-ability-name">${_escHtml(ab.name || key.toUpperCase())}</span>
        <span class="dci-ability-cd">cd: ${ab.cd}s</span>
        ${dmgStr ? `<span class="dci-ability-dmg">${typeStr} ${dmgStr}</span>` : ''}
      </div>
      ${efDesc ? `<div class="dci-ability-desc">${_escHtml(efDesc)}</div>` : ''}
    </div>`;
  };

  const roleMap = { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support', arcanist:'Mid', vanguard:'Top', ranger:'Jungle', hunter:'ADC', warden:'Support' };
  const COMP_COLORS = { ENGAGE:'#e67e22', POKE:'#3498db', PICK:'#9b59b6', PROTECT:'#27ae60', SCALING:'#c89b3c' };
  const compColor = cd.compType ? (COMP_COLORS[cd.compType] || '#888') : null;
  const roleCssMap = { Top:'pos-top', Jungle:'pos-jungle', Mid:'pos-mid', ADC:'pos-adc', Support:'pos-support' };
  const infoRolesRaw = cd.roles || (cd.role ? [cd.role] : []);
  const infoRoleBadges = infoRolesRaw.map(r => {
    const d = roleMap[r] || r;
    return `<span class="pos-badge ${roleCssMap[d]||''}">${d}</span>`;
  }).join('');

  // Determine physical vs magic attack type
  const aaType = cd.abilities?.aa?.dmgType || 'physical';
  const physAtk = aaType !== 'magic' ? cd.baseDmg : 0;
  const magicAtk = aaType === 'magic' ? cd.baseDmg : 0;

  el.innerHTML = `
    <div class="dci-wrap">
      <div class="dci-left">
        <div class="dci-header">
          <span class="dci-name">${_escHtml(champName)}</span>
          ${cd.class ? `<span class="dci-fullclass" style="color:${b ? b.color : '#888'}">${cd.class}</span>` : ''}
          ${compColor ? `<span class="dci-comp" style="color:${compColor};border-color:${compColor}">${cd.compType}</span>` : ''}
        </div>
        <div class="dci-roles-row">${infoRoleBadges}</div>
        ${cd.lore ? `<div class="dci-lore">${_escHtml(cd.lore)}</div>` : ''}
        <div class="dci-stats">
          ${stat('HP',          cd.baseHp)}
          ${physAtk ? stat('Physical Atk', physAtk) : ''}
          ${magicAtk ? stat('Magic Atk',   magicAtk) : ''}
          ${stat('Range',       cd.attackRange)}
          ${stat('Move Spd',    cd.moveSpeed)}
          ${stat('Armor',       cd.physResist)}
          ${stat('Magic Res',   cd.magicResist)}
        </div>
      </div>
      <div class="dci-right">
        <div class="dci-abilities-title">Abilities</div>
        ${abilityHtml('q',   'Q')}
        ${abilityHtml('e',   'E')}
        ${abilityHtml('ult', 'R')}
        ${cd.passive ? `<div class="dci-passive"><span class="dci-ability-icon">P</span> <span class="dci-passive-text">${_escHtml(cd.passive.desc || '')}</span></div>` : ''}
      </div>
    </div>`;
}

function renderRoleAssignment(picks) {
  const ds = _draftState;
  if (!ds) return;
  const assigned = ds.humanAssignment || {};
  const assignedChamps = new Set(Object.values(assigned));
  const bench = picks.filter(c => !assignedChamps.has(c));

  const benchHtml = `
    <div class="ra-bench-label">Your Picks — click a champion, then click a role</div>
    <div class="ra-bench-cards">
      ${bench.map(c => {
        const cd  = CHAMPIONS[c] || {};
        const sel = ds.raSelectedChamp === c;
        const b   = CLASS_BADGE[(cd.class || '').toLowerCase()];
        const roleMap2 = { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support', arcanist:'Mid', vanguard:'Top', ranger:'Jungle', hunter:'ADC', warden:'Support' };
        const rolesStr = (cd.roles || []).map(r => roleMap2[r] || r).join(' / ');
        return `<div class="ra-champ-card ${sel ? 'ra-selected' : ''}" onclick="raSelectChamp('${c.replace(/'/g,"\\'")}')">
          <div class="ra-champ-name">${_escHtml(c)}</div>
          ${cd.class ? `<div class="ra-champ-type" style="color:${b ? b.color : '#888'}">${cd.class}</div>` : ''}
          ${rolesStr ? `<div class="ra-champ-roles">${_escHtml(rolesStr)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;

  const slotsHtml = POSITIONS.map(pos => {
    const champ = assigned[pos];
    const cd = champ ? (CHAMPIONS[champ] || {}) : null;
    const filled = !!champ;
    const raB = cd ? CLASS_BADGE[(cd.class || '').toLowerCase()] : null;
    const raRoleMap = { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support', arcanist:'Mid', vanguard:'Top', ranger:'Jungle', hunter:'ADC', warden:'Support' };
    const raRoles = cd ? (cd.roles || []).map(r => raRoleMap[r] || r).join(' / ') : '';
    return `<div class="ra-slot ${filled ? 'ra-slot-filled' : 'ra-slot-empty'}" onclick="raAssignToSlot('${pos}')">
      <span class="ra-slot-icon">${posIcon(pos)}</span>
      <span class="ra-slot-label">${posLabel(pos)}</span>
      ${filled
        ? `<span class="ra-slot-champ">${_escHtml(champ)}</span>
           ${cd.class ? `<span class="ra-slot-type" style="color:${raB ? raB.color : '#888'}">${cd.class}${raRoles ? ' · '+raRoles : ''}</span>` : ''}
           <span class="ra-unassign" onclick="event.stopPropagation();raAssignToSlot('${pos}')">✕</span>`
        : `<span class="ra-slot-hint">— assign —</span>`}
    </div>`;
  }).join('');

  const allFilled = POSITIONS.every(p => assigned[p]);

  setHtml('ra-bench', benchHtml);
  setHtml('ra-slots', slotsHtml);
  const actEl = document.getElementById('ra-actions');
  if (actEl) actEl.style.display = allFilled ? 'flex' : 'none';
}

function initLiveStats(draft, blueName, redName) {
  const blue = document.getElementById('lsp-blue-label');
  const red  = document.getElementById('lsp-red-label');
  if (blue) blue.textContent = blueName;
  if (red)  red.textContent  = redName;

  const makeRows = (side, picks) => {
    return (picks || []).map((p, i) => {
      const champName  = typeof p === 'string' ? p : (p.champion || '');
      const playerName = typeof p === 'string' ? '' : (p.player?.name || '');
      const pos = typeof p === 'string' ? POSITIONS[i] : (p.pos || POSITIONS[i]);
      const pfx = side[0];
      return `<div class="lsp-row" id="lsp-${pfx}-${pos}">
        <div class="lsp-row-top">
          <span class="lsp-pos">${posIcon(pos)}</span>
          <div class="lsp-info">
            <div class="lsp-level" id="lsp-lv-${pfx}-${pos}">Lv.1</div>
            <div class="lsp-name">${_escHtml(playerName || champName)}</div>
            <div class="lsp-champ">${_escHtml(champName)}</div>
          </div>
          <div class="lsp-gold" id="lsp-gold-${pfx}-${pos}">0g</div>
        </div>
        <div class="lsp-hp-bar-wrap">
          <div class="lsp-hp-bar" id="lsp-hp-${pfx}-${pos}"></div>
        </div>
        <div class="lsp-row-bottom">
          <div class="lsp-kda" id="lsp-kda-${pfx}-${pos}">0/0/0</div>
          <div class="lsp-items" id="lsp-items-${pfx}-${pos}"></div>
        </div>
      </div>`;
    }).join('');
  };

  const blueEl = document.getElementById('lsp-blue-rows');
  const redEl  = document.getElementById('lsp-red-rows');
  if (blueEl) blueEl.innerHTML = makeRows('blue', draft.blue || []);
  if (redEl)  redEl.innerHTML  = makeRows('red',  draft.red  || []);
}

function updateLiveStats(agentStats) {
  if (!agentStats) return;
  ['blue','red'].forEach(side => {
    POSITIONS.forEach(pos => {
      const s = agentStats[side]?.[pos];
      if (!s) return;
      const pfx = side[0];
      const kdaEl   = document.getElementById(`lsp-kda-${pfx}-${pos}`);
      const goldEl  = document.getElementById(`lsp-gold-${pfx}-${pos}`);
      const rowEl   = document.getElementById(`lsp-${pfx}-${pos}`);
      const lvEl    = document.getElementById(`lsp-lv-${pfx}-${pos}`);
      const itemsEl = document.getElementById(`lsp-items-${pfx}-${pos}`);
      if (kdaEl)  kdaEl.innerHTML = `<span style="color:#e8e8e8">${s.kills}</span>/<span style="color:#ff7b7b">${s.deaths}</span>/<span style="color:#4fc3f7">${s.assists}</span>`;
      if (goldEl) goldEl.textContent = s.gold >= 1000 ? (s.gold/1000).toFixed(1)+'k' : s.gold+'g';
      if (rowEl)  rowEl.classList.toggle('lsp-dead', !!s.isDead);
      if (lvEl)   lvEl.textContent = `Lv.${s.level || 1}`;
      if (itemsEl && s.items) {
        itemsEl.innerHTML = s.items.map(id => {
          const item = typeof ITEM_MAP !== 'undefined' ? ITEM_MAP[id] : null;
          const name = item ? item.name : id;
          const abbr = name.split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();
          return `<span class="lsp-item" title="${_escHtml(name)}">${abbr}</span>`;
        }).join('');
      }
      // HP bar
      const hpEl = document.getElementById(`lsp-hp-${pfx}-${pos}`);
      if (hpEl && s.hp !== undefined && s.maxHp) {
        const pct = Math.max(0, Math.min(1, s.hp / s.maxHp));
        hpEl.style.width = (pct * 100).toFixed(1) + '%';
        hpEl.classList.toggle('hp-yellow', pct < 0.6 && pct >= 0.3);
        hpEl.classList.toggle('hp-red',    pct < 0.3);
        hpEl.classList.remove(pct >= 0.6 ? 'hp-yellow' : '', pct >= 0.3 ? 'hp-red' : '');
        if (pct >= 0.6) { hpEl.classList.remove('hp-yellow','hp-red'); }
      }
    });
  });
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
  // Normalize old format in-place for UI
  if (!sc.activeScouts) sc.activeScouts = sc.activeScout ? [sc.activeScout] : [];
  const team = G.teams[G.humanTeamId];
  const scout = (G.staff || []).find(s => s.role === 'scout');
  const maxSlots = scout && (scout.attrs?.networkReach || 0) >= 14 ? 2 : 1;
  const { cost: scoutCost, weeks: scoutWeeks } = _scoutCostAndWeeks();

  // ─── Scout Staff Card ────────────────────────────────────────────────────
  let staffHtml = '';
  if (scout) {
    const ovr = _staffOverall(scout.attrs);
    const attrBars = Object.entries(scout.attrs).map(([k, v]) =>
      `<span class="ssc-attr"><span class="ssc-attr-label">${STAFF_ROLE_ATTR_LABELS[k] || k}</span> <strong>${v}</strong></span>`
    ).join('');
    staffHtml = `<div class="scout-staff-card">
      <div class="ssc-name">${_escHtml(scout.name)} <span class="ovr-badge ${overallColor(ovr)}">${ovr}</span></div>
      <div class="ssc-attrs">${attrBars}</div>
      <div class="ssc-info">
        Slots: <strong>${sc.activeScouts.length}/${maxSlots}</strong> active &nbsp;·&nbsp;
        Report time: <strong>${scoutWeeks} wk${scoutWeeks > 1 ? 's' : ''}</strong> &nbsp;·&nbsp;
        Cost: <strong>$${(scoutCost / 1000).toFixed(0)}K per assignment</strong>
      </div>
    </div>`;
  } else {
    staffHtml = `<div class="scout-staff-card scout-no-staff">
      <p><strong>No Scout hired.</strong> Hire a Scout from the Staff screen to speed up assignments, reduce costs, and unlock a second scouting slot (networkReach ≥ 14).</p>
      <div class="ssc-info">Slots: <strong>1</strong> &nbsp;·&nbsp; Speed: <strong>3 weeks</strong> &nbsp;·&nbsp; Cost: <strong>$50K</strong></div>
    </div>`;
  }

  // ─── Active Assignments ──────────────────────────────────────────────────
  let activeHtml = '';
  if (sc.activeScouts.length > 0) {
    activeHtml = `<div class="scout-section">
      <h3>Active Assignments</h3>
      ${sc.activeScouts.map(as => {
        const p = SCOUT_POOL.find(x => x.id === as.targetId);
        const total = as.weeksTotal || scoutWeeks;
        const done = total - as.weeksLeft;
        const pct = Math.round((done / total) * 100);
        const displayName = p ? (p.visibility === 'hidden' ? '???' : _escHtml(p.name)) : 'Unknown';
        const displayPos  = p ? posIcon(p.position) : '?';
        const region = p?.region || '?';
        return `<div class="scout-assignment">
          <span class="sa-pos">${displayPos}</span>
          <span class="sa-name">${displayName}</span>
          <span class="sa-region">${_escHtml(region)}</span>
          <div class="sa-progress-wrap"><div class="sa-progress-bar" style="width:${pct}%"></div></div>
          <span class="sa-weeks">${as.weeksLeft} wk${as.weeksLeft !== 1 ? 's' : ''} left</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ─── Prospect Pool ───────────────────────────────────────────────────────
  const undiscovered = SCOUT_POOL.filter(p =>
    !p.discovered &&
    !(sc.discovered || []).includes(p.id) &&
    !sc.activeScouts.some(a => a.targetId === p.id)
  );
  let prospectsHtml = '';
  if (undiscovered.length > 0) {
    const canScout = team.budget >= scoutCost && sc.activeScouts.length < maxSlots;
    const cards = undiscovered.map(p => {
      const vis = p.visibility || 'known';
      let nameHtml, detailHtml;
      if (vis === 'hidden') {
        nameHtml  = `<span class="sp-name sp-hidden">??? Prospect</span>`;
        detailHtml = `<span class="sp-region">${_escHtml(p.region || 'Unknown')}</span> <span class="sp-pos">${posIcon(p.position)}</span>`;
      } else if (vis === 'rumored') {
        nameHtml  = `<span class="sp-name sp-rumored">[Rumored ${posLabel(p.position)}]</span>`;
        detailHtml = `<span class="sp-region">${_escHtml(p.region || '?')}</span> <span class="sp-age">~${p.age}y</span> <span class="sp-pot pot-${p.potential}">${p.potential}</span>`;
      } else {
        const ovr = calcOverall(p);
        nameHtml  = `<span class="sp-name">${_escHtml(p.name)}</span> <span class="ovr-badge ${overallColor(ovr)}">${ovr}</span>`;
        detailHtml = `<span class="sp-region">${_escHtml(p.region || '?')}</span> <span class="sp-pos">${posIcon(p.position)}</span> <span class="sp-age">Age ${p.age}</span> <span class="sp-nat">${p.nationality}</span> <span class="sp-pot pot-${p.potential}">${p.potential}</span>`;
      }
      return `<div class="prospect-card prospect-${vis}">
        <div class="pc-header">${nameHtml}</div>
        <div class="pc-detail">${detailHtml}</div>
        <button class="btn-sm btn-primary pc-scout-btn" onclick="onStartScouting('${p.id}')" ${canScout ? '' : 'disabled'}>
          Scout ($${(scoutCost / 1000).toFixed(0)}K · ${scoutWeeks}wk)
        </button>
      </div>`;
    }).join('');
    const warnHtml = !canScout
      ? (team.budget < scoutCost
          ? `<p class="scout-warn">Insufficient budget ($${fmtMoney(team.budget)} / $${fmtMoney(scoutCost)} needed).</p>`
          : `<p class="scout-warn">All ${maxSlots} scout slot(s) occupied.</p>`)
      : '';
    prospectsHtml = `<div class="scout-section">
      <h3>Prospect Pool <span class="scout-budget-note">Budget: $${fmtMoney(team.budget)}</span></h3>
      <div class="prospect-grid">${cards}</div>
      ${warnHtml}
    </div>`;
  } else if (undiscovered.length === 0 && sc.activeScouts.length === 0) {
    prospectsHtml = `<div class="scout-section"><p class="scout-idle">All prospects scouted or already in the reports archive.</p></div>`;
  }

  // ─── Reports Archive ─────────────────────────────────────────────────────
  const discovered = (sc.discovered || []).map(id => G.players[id]).filter(Boolean);
  let reportsHtml = '';
  if (discovered.length) {
    reportsHtml = `<div class="scout-section">
      <h3>Reports Archive</h3>
      ${discovered.map(p => {
        const ovr = calcOverall(p);
        const inFA = G.freeAgents.includes(p.id);
        const onTeam = Object.values(G.teams).find(t => t.roster.includes(p.id) || (t.academy || []).includes(p.id));
        return `<div class="scout-report-row">
          <span class="sr-pos">${posIcon(p.position)}</span>
          <span class="sr-name">${_escHtml(p.name)}</span>
          <span class="ovr-badge ${overallColor(ovr)}">${ovr}</span>
          ${personalityBadge(p.personality || 'pro')}
          <span class="sr-age">Age ${p.age}</span>
          <span class="sr-pot pot-${p.potential}">${p.potential} potential</span>
          ${inFA ? '<span class="sr-fa">Free Agent</span>' : ''}
          ${onTeam ? `<span class="sr-team">${_escHtml(onTeam.name)}</span>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  setHtml('scouting-content', `<div class="scouting-layout">${staffHtml}${activeHtml}${prospectsHtml}${reportsHtml}</div>`);
}

// ─── Tactics Phase ────────────────────────────────────────────────────────────

let _tacticsContext = null; // { humanCompType, enemyCompType, draft }

function showTacticsPhase(context) {
  if (context) _tacticsContext = context;
  document.getElementById('tactics-phase').style.display = 'block';
  document.getElementById('draft-actions').style.display = 'none';
  renderTacticsPhase();
}

function renderTacticsPhase() {
  if (!G || !TACTICS_DEFS) return;
  const tactics = G.teams[G.humanTeamId].tactics;
  const draft   = (typeof _matchContext !== 'undefined') ? _matchContext?.draft : null;

  // Helper: build a tactic dimension block
  function tacticBlock(key) {
    const def = TACTICS_DEFS[key];
    if (!def) return '';
    const optHtml = Object.entries(def.options).map(([optKey, opt]) => {
      const active = (tactics[key] || '') === optKey;
      return `<button class="tp-option ${active ? 'tp-option-active' : ''}"
        onclick="onSetTactic('${key}','${optKey}')"
        onmouseenter="document.getElementById('tp-desc-bar').textContent='${opt.desc.replace(/'/g,"\\'")}'"
        onmouseleave="document.getElementById('tp-desc-bar').textContent='Hover a tactic option to see its description.'"
      >${opt.label}</button>`;
    }).join('');
    return `<div class="tp-section">
      <div class="tp-section-label">${def.label}</div>
      <div class="tp-options">${optHtml}</div>
    </div>`;
  }

  // Left column: lane + jungle directives
  const leftHtml = ['laneFocus', 'jungleStyle', 'wardenCall', 'topJoinWarden'].map(tacticBlock).join('');

  // Middle column: objective + fight directives
  const midHtml = ['objectiveSetup', 'combatStrategy', 'wardenBuff'].map(tacticBlock).join('');

  // Right column: ancient siege, defensive + matchup panel
  const rightTactics = ['ancientSiege', 'defensiveTactics'].map(tacticBlock).join('');

  // Matchup panel (if draft available)
  let matchupHtml = '';
  if (draft && draft.blue && draft.red) {
    const roleMap = { top:'Top', jungle:'JG', mid:'Mid', adc:'ADC', support:'Sup' };
    const rolePosCss = { top:'pos-top', jungle:'pos-jungle', mid:'pos-mid', adc:'pos-adc', support:'pos-support' };
    const humanSide = (typeof _draftState !== 'undefined') ? _draftState?.humanSide : 'blue';
    const yourSide  = humanSide || 'blue';
    const cpuSide   = yourSide === 'blue' ? 'red' : 'blue';
    const yourPicks = draft[yourSide] || [];
    const cpuPicks  = draft[cpuSide]  || [];

    const matchupRows = POSITIONS.map((pos, i) => {
      const yourEntry = yourPicks.find(p => p.pos === pos) || yourPicks[i];
      const cpuEntry  = cpuPicks.find(p => p.pos === pos)  || cpuPicks[i];
      const yourChamp = typeof yourEntry === 'string' ? yourEntry : (yourEntry?.champion || '?');
      const cpuChamp  = typeof cpuEntry  === 'string' ? cpuEntry  : (cpuEntry?.champion  || '?');
      const rLabel = roleMap[pos] || pos;
      return `<div class="tp-matchup-row">
        <span class="tp-matchup-your">${yourChamp}</span>
        <span class="pos-badge ${rolePosCss[pos]||''}" style="font-size:10px">${rLabel}</span>
        <span class="tp-matchup-vs">vs</span>
        <span class="tp-matchup-cpu">${cpuChamp}</span>
      </div>`;
    }).join('');

    // Analyst opponent scouting indicator
    const analyst = (G.staff || []).find(s => s.role === 'analyst');
    const oppScout = analyst ? (analyst.attrs?.opponentScouting ?? analyst.stat ?? 10) : 0;
    const analystHint = analyst && oppScout >= 12
      ? `<div class="tp-analyst-hint">🔍 Asst. Coach ${analyst.name}: ${_generateAnalystHint(oppScout, draft, yourSide)}</div>`
      : '';

    matchupHtml = `<div class="tp-matchup-panel">
      <div class="tp-section-label">Matchup</div>
      <div class="tp-matchup-sides">
        <span style="color:#4fc3f7;font-size:11px">YOU</span>
        <span></span><span></span>
        <span style="color:#ff7b7b;font-size:11px">OPP</span>
      </div>
      ${matchupRows}
      ${analystHint}
    </div>`;
  }

  document.getElementById('tp-col-left').innerHTML  = `<div class="tp-col-header">Lane & Jungle</div>${leftHtml}`;
  document.getElementById('tp-col-mid').innerHTML   = `<div class="tp-col-header">Objectives & Fights</div>${midHtml}`;
  document.getElementById('tp-col-right').innerHTML = `<div class="tp-col-header">Siege & Defense</div>${rightTactics}${matchupHtml}`;
}

function _generateAnalystHint(oppScout, draft, yourSide) {
  // Simple hint based on analyst scouting level
  const hints = [
    'Opponent has strong early game — prepare for early skirmishes.',
    'Enemy comp has limited engage — poke them down before committing.',
    'Opponent relying on scaling — consider early aggression.',
    'Counter-pick advantage in Mid — assign your best mid player carefully.',
    'Enemy jungler is farm-heavy — consider counter-jungling.',
  ];
  const idx = Math.floor((oppScout / 20) * hints.length);
  return hints[Math.min(idx, hints.length - 1)];
}

function onSetTactic(key, value) {
  if (!G) return;
  G.teams[G.humanTeamId].tactics[key] = value;
  renderTacticsPhase();
}

function onDelegateToAnalyst() {
  if (!G) return;
  const draft = (typeof _matchContext !== 'undefined') ? _matchContext?.draft : null;
  const humanSide = (typeof _draftState !== 'undefined') ? _draftState?.humanSide : 'blue';
  let humanCompType = 'ENGAGE', enemyCompType = 'ENGAGE';
  if (draft) {
    const yourPicks = (draft[humanSide] || []).map(p => typeof p === 'string' ? p : p.champion);
    const cpuSide   = humanSide === 'blue' ? 'red' : 'blue';
    const cpuPicks  = (draft[cpuSide]  || []).map(p => typeof p === 'string' ? p : p.champion);
    if (typeof getDominantCompType === 'function') {
      humanCompType = getDominantCompType(yourPicks) || 'ENGAGE';
      enemyCompType = getDominantCompType(cpuPicks)  || 'ENGAGE';
    }
  }
  delegateToAnalyst(humanCompType, enemyCompType);
  renderTacticsPhase();
}

function onConfirmTactics() {
  document.getElementById('tactics-phase').style.display = 'none';
  document.getElementById('draft-actions').style.display = 'flex';
}

function onSkipTactics() {
  // Keep current tactics, just proceed
  document.getElementById('tactics-phase').style.display = 'none';
  document.getElementById('draft-actions').style.display = 'flex';
}

// ─── Manager Profile ──────────────────────────────────────────────────────────

function renderManagerProfile() {
  if (!G) return;
  const mgr   = G.manager || { xp: 0, lastLevel: 1, traits: [] };
  const level = getManagerLevel(mgr.xp);
  const maxLevel = MANAGER_XP_TABLE.length;
  const xpForNext = level < maxLevel ? MANAGER_XP_TABLE[level] : MANAGER_XP_TABLE[maxLevel - 1];
  const xpPrev    = MANAGER_XP_TABLE[level - 1] || 0;
  const xpPct     = level < maxLevel
    ? Math.round((mgr.xp - xpPrev) / (xpForNext - xpPrev) * 100)
    : 100;

  const totalPoints   = getManagerPoints(mgr.xp);
  const spentPoints   = (mgr.traits || []).reduce((s, id) => s + (MANAGER_TRAITS[id]?.cost || 0), 0);
  const freePoints    = totalPoints - spentPoints;

  // XP bar
  const xpBar = `
    <div class="mgr-xp-wrap">
      <div class="mgr-xp-label">Level ${level}${level < maxLevel ? ` — ${mgr.xp} / ${xpForNext} XP` : ' (MAX)'}</div>
      <div class="mgr-xp-bar-bg">
        <div class="mgr-xp-bar-fill" style="width:${xpPct}%"></div>
      </div>
      <div class="mgr-xp-sublabel">${freePoints} trait point${freePoints !== 1 ? 's' : ''} available</div>
    </div>`;

  // Trait trees
  const treeHtml = Object.entries(MANAGER_TREES).map(([treeKey, tree]) => {
    const traits = Object.entries(MANAGER_TRAITS).filter(([, t]) => t.tree === treeKey);
    const traitCards = traits.map(([id, t]) => {
      const owned    = hasManagerTrait(id);
      const canAfford = !owned && freePoints >= t.cost;
      return `<div class="mgr-trait-card ${owned ? 'mgr-trait-owned' : ''} ${!owned && !canAfford ? 'mgr-trait-locked' : ''}">
        <div class="mgr-trait-top">
          <span class="mgr-trait-icon">${t.icon}</span>
          <span class="mgr-trait-name">${t.name}</span>
          <span class="mgr-trait-cost">${t.cost}pt${t.cost > 1 ? 's' : ''}</span>
        </div>
        <div class="mgr-trait-desc">${t.desc}</div>
        ${!owned
          ? `<button class="btn-primary" style="font-size:11px;padding:4px 10px;margin-top:6px"
              onclick="onUnlockTrait('${id}')" ${canAfford ? '' : 'disabled'}>
              ${canAfford ? 'Unlock' : 'Not enough points'}
            </button>`
          : '<div class="mgr-trait-badge">✓ Unlocked</div>'}
      </div>`;
    }).join('');

    return `<div class="mgr-tree">
      <div class="mgr-tree-header" style="color:${tree.color}">
        ${tree.name}
        <span class="mgr-tree-desc">${tree.desc}</span>
      </div>
      <div class="mgr-trait-grid">${traitCards}</div>
    </div>`;
  }).join('');

  const team = G.teams[G.humanTeamId];
  setHtml('manager-content', `
    <div class="mgr-header-row">
      <div class="mgr-title">
        <div class="mgr-name">Head Manager</div>
        <div class="mgr-team">${_escHtml(team.name)}</div>
      </div>
      <div class="mgr-record-box">
        <div style="font-size:20px;font-weight:700;color:var(--gold)">${team.wins}W ${team.losses}L</div>
        <div style="font-size:11px;color:var(--text-dim)">Career Series Record</div>
      </div>
    </div>
    ${xpBar}
    <div class="mgr-trees">${treeHtml}</div>
  `);
}

function onUnlockTrait(traitId) {
  const result = unlockManagerTrait(traitId);
  if (result === 'no_points') { alert('Not enough trait points. Win more matches to level up.'); return; }
  if (result === 'already_unlocked') return;
  renderManagerProfile();
}

// ─── Statistics Panel ─────────────────────────────────────────────────────────

let _statsTab = 'team';

function showStatsTab(tab) {
  _statsTab = tab;
  document.querySelectorAll('#panel-statistics .ptab').forEach(b => b.classList.remove('active'));
  document.querySelector(`#panel-statistics .ptab[onclick="showStatsTab('${tab}')"]`)?.classList.add('active');
  renderStatistics(tab);
}

function renderStatistics(tab = 'team') {
  if (!G) return;
  _statsTab = tab;

  if (tab === 'team') {
    const team = G.teams[G.humanTeamId];
    const standings = getStandings();
    const rank = standings.findIndex(t => t.id === G.humanTeamId) + 1;
    // Aggregate career stats across all human team players
    const starters = POSITIONS.map(pos => team.roster[pos] ? G.players[team.roster[pos]] : null).filter(Boolean);
    const totalKills   = starters.reduce((s, p) => s + (p.career?.kills || 0), 0);
    const totalDeaths  = starters.reduce((s, p) => s + (p.career?.deaths || 0), 0);
    const totalAssists = starters.reduce((s, p) => s + (p.career?.assists || 0), 0);
    const totalGames   = starters.reduce((s, p) => s + (p.career?.gamesPlayed || 0), 0) / 5;

    setHtml('statistics-content', `
      <div class="stats-grid">
        <div class="stats-card">
          <div class="stats-card-title">Career Record</div>
          <div class="ti-stat-row"><span class="ti-label">Series W/L</span><span class="ti-val">${team.wins}W ${team.losses}L</span></div>
          <div class="ti-stat-row"><span class="ti-label">League Rank</span><span class="ti-val">#${rank}</span></div>
          <div class="ti-stat-row"><span class="ti-label">Points</span><span class="ti-val" style="color:var(--gold)">${team.points}</span></div>
        </div>
        <div class="stats-card">
          <div class="stats-card-title">Combat Totals (Career)</div>
          <div class="ti-stat-row"><span class="ti-label">Total Kills</span><span class="ti-val">${totalKills}</span></div>
          <div class="ti-stat-row"><span class="ti-label">Total Deaths</span><span class="ti-val">${totalDeaths}</span></div>
          <div class="ti-stat-row"><span class="ti-label">Total Assists</span><span class="ti-val">${totalAssists}</span></div>
          <div class="ti-stat-row"><span class="ti-label">Games Played</span><span class="ti-val">${Math.round(totalGames)}</span></div>
        </div>
        <div class="stats-card">
          <div class="stats-card-title">Economy</div>
          <div class="ti-stat-row"><span class="ti-label">Budget</span><span class="ti-val">${fmtMoney(team.budget)}</span></div>
          <div class="ti-stat-row"><span class="ti-label">Fans</span><span class="ti-val">${(team.fans/1000).toFixed(0)}K</span></div>
          <div class="ti-stat-row"><span class="ti-label">Prestige</span><span class="ti-val">${team.prestige}/10</span></div>
        </div>
      </div>
    `);

  } else if (tab === 'players') {
    const team = G.teams[G.humanTeamId];
    const players = Object.values(G.players).filter(p =>
      p.teamId === G.humanTeamId && p.career?.gamesPlayed > 0
    ).sort((a, b) => {
      const kdaA = a.career.deaths ? (a.career.kills + a.career.assists) / a.career.deaths : (a.career.kills + a.career.assists);
      const kdaB = b.career.deaths ? (b.career.kills + b.career.assists) / b.career.deaths : (b.career.kills + b.career.assists);
      return kdaB - kdaA;
    });

    const rows = players.map(p => {
      const g = p.career.gamesPlayed || 1;
      const kda = p.career.deaths
        ? `${(p.career.kills/g).toFixed(1)}/${(p.career.deaths/g).toFixed(1)}/${(p.career.assists/g).toFixed(1)}`
        : `${(p.career.kills/g).toFixed(1)}/0/${(p.career.assists/g).toFixed(1)}`;
      const wr = Math.round(p.career.wins / g * 100);
      return `<tr>
        <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
        <td style="font-weight:600;color:var(--text-hi)">${_escHtml(p.name)}</td>
        <td style="color:var(--text-dim)">${p.career.gamesPlayed}</td>
        <td>${kda}</td>
        <td style="color:${wr>=50?'var(--win)':'var(--loss)'}">${wr}%</td>
        <td style="color:var(--text-dim)">${Math.round((p.career.cs||0)/g)}</td>
      </tr>`;
    }).join('');

    setHtml('statistics-content', `
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:12px">Players with at least 1 game played, sorted by KDA.</p>
      <table class="standings">
        <thead><tr><th>Pos</th><th>Player</th><th>GP</th><th>KDA/g</th><th>WR</th><th>CS/g</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px">No matches played yet.</td></tr>'}</tbody>
      </table>
    `);

  } else if (tab === 'champions') {
    // Aggregate champion stats from all players in G.players
    const champStats = {};
    Object.values(G.players).forEach(p => {
      Object.entries(p.career?.championStats || {}).forEach(([champ, cs]) => {
        if (!champStats[champ]) champStats[champ] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
        champStats[champ].games   += cs.games || 0;
        champStats[champ].wins    += cs.wins  || 0;
        champStats[champ].kills   += cs.kills || 0;
        champStats[champ].deaths  += cs.deaths || 0;
        champStats[champ].assists += cs.assists || 0;
      });
    });

    const rows = Object.entries(champStats)
      .filter(([, cs]) => cs.games >= 1)
      .sort((a, b) => b[1].games - a[1].games)
      .map(([name, cs]) => {
        const cd  = CHAMPIONS[name] || {};
        const b   = CLASS_BADGE[cd.class] || {};
        const wr  = cs.games ? Math.round(cs.wins / cs.games * 100) : 0;
        const kda = cs.deaths ? ((cs.kills + cs.assists) / cs.deaths).toFixed(2) : (cs.kills + cs.assists).toFixed(2);
        return `<tr>
          <td>${name ? `<span class="class-badge" style="color:${b.color||'#888'};border-color:${b.color||'#888'}">${b.label||'?'}</span>` : ''} ${_escHtml(name)}</td>
          <td style="color:var(--text-dim)">${cs.games}</td>
          <td style="color:${wr>=50?'var(--win)':'var(--loss)'}">${wr}%</td>
          <td>${kda}</td>
        </tr>`;
      }).join('');

    setHtml('statistics-content', `
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:12px">All-time champion performance across all players and teams.</p>
      <table class="standings">
        <thead><tr><th>Champion</th><th>Games</th><th>Win Rate</th><th>KDA</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:20px">No matches played yet.</td></tr>'}</tbody>
      </table>
    `);
  }
}

// ─── Item Browser ─────────────────────────────────────────────────────────────

let _itemFilter = 'all';
let _itemSelected = null;

function renderItemBrowser() {
  const statKeyLabel = {
    physDmg:'AD', abilityPower:'AP', maxHp:'HP', physResist:'Armor', magicResist:'MR',
    vamp:'Vamp', spellVamp:'SpVamp', moveSpeed:'Move', magicPen:'MagPen',
    physPen:'ArmPen', critChance:'Crit', cooldownReduction:'CDR', hpRegen:'HPRegen',
    attackRange:'Range',
  };

  // Gather all unique role categories
  const allRoles = [...new Set(ITEMS.flatMap(i => i.forRoles || []))].sort();
  const filterRoles = ['all', ...allRoles];

  const filtered = _itemFilter === 'all'
    ? ITEMS
    : ITEMS.filter(i => (i.forRoles || []).includes(_itemFilter));

  const filterBtns = filterRoles.map(r =>
    `<button class="news-filter-btn ${_itemFilter===r?'active':''}"
      onclick="_itemFilter='${r}';renderItemBrowser()">${r === 'all' ? 'All' : r.charAt(0).toUpperCase()+r.slice(1)}</button>`
  ).join('');

  const cards = filtered.map(item => {
    const statsText = Object.entries(item.stats || {}).map(([k, v]) => {
      const label = statKeyLabel[k] || k;
      const val   = typeof v === 'number' && v < 1 ? `+${(v*100).toFixed(0)}%` : `+${v}`;
      return `${val} ${label}`;
    }).join(' · ');

    const roleTags = (item.forRoles || []).map(r =>
      `<span class="ib-role-tag">${r}</span>`).join('');

    return `<div class="ib-card ${_itemSelected===item.id?'ib-selected':''}"
        onclick="_itemSelected='${item.id}';renderItemBrowser()">
      <div class="ib-name">${_escHtml(item.name)}</div>
      <div class="ib-cost">${fmtMoney(item.cost)}</div>
      ${statsText ? `<div class="ib-stats">${statsText}</div>` : ''}
      ${roleTags ? `<div class="ib-roles">${roleTags}</div>` : ''}
    </div>`;
  }).join('');

  // Detail for selected item
  let detailHtml = '';
  if (_itemSelected) {
    const item = ITEMS.find(i => i.id === _itemSelected);
    if (item) {
      const statsRows = Object.entries(item.stats || {}).map(([k, v]) => {
        const label = statKeyLabel[k] || k;
        const val   = typeof v === 'number' && v < 1 ? `+${(v*100).toFixed(0)}%` : `+${v}`;
        return `<div class="ti-stat-row" style="font-size:13px">
          <span class="ti-label">${label}</span>
          <span class="ti-val" style="color:var(--win)">${val}</span>
        </div>`;
      }).join('');
      const roleTags = (item.forRoles || []).map(r =>
        `<span class="ib-role-tag">${r.charAt(0).toUpperCase()+r.slice(1)}</span>`).join('');

      detailHtml = `
        <div class="dci-header" style="margin-bottom:10px">
          <span class="dci-name">${_escHtml(item.name)}</span>
          <span style="color:var(--gold);font-size:16px;margin-left:8px">${fmtMoney(item.cost)}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${roleTags}</div>
        <div style="margin-bottom:12px">${statsRows}</div>
        ${item.description ? `<div class="ib-desc">${_escHtml(item.description)}</div>` : ''}
      `;
    }
  }

  setHtml('items-content', `
    <div class="cb-filters">${filterBtns}</div>
    <div style="display:flex;gap:14px;margin-top:12px;min-height:0;height:calc(100vh - 220px)">
      <div style="flex:1;overflow-y:auto">
        <div class="ib-grid">${cards || '<div style="color:var(--text-dim);padding:20px">No items match this filter.</div>'}</div>
      </div>
      ${_itemSelected ? `<div class="cb-detail" style="width:260px;flex-shrink:0">${detailHtml}</div>` : ''}
    </div>
  `);
}

// ─── Champion Browser ─────────────────────────────────────────────────────────

let _champFilter = { cls: 'all', role: 'all' };
let _champSelected = null;

function renderChampionBrowser() {
  const allChamps = Object.entries(CHAMPIONS);
  const classes   = ['all', ...new Set(allChamps.map(([,c]) => c.class).filter(Boolean))];
  const roles     = ['all', 'Top', 'Jungle', 'Mid', 'ADC', 'Support'];
  const roleMap   = { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support',
                      arcanist:'Mid', vanguard:'Top', ranger:'Jungle', hunter:'ADC', warden:'Support' };

  const filtered = allChamps.filter(([name, cd]) => {
    if (_champFilter.cls !== 'all' && cd.class !== _champFilter.cls) return false;
    if (_champFilter.role !== 'all') {
      const champRoles = (cd.roles || [cd.role]).map(r => roleMap[r] || r);
      if (!champRoles.includes(_champFilter.role)) return false;
    }
    return true;
  });

  const classFilters = classes.map(c =>
    `<button class="news-filter-btn ${_champFilter.cls===c?'active':''}"
      onclick="_champFilter.cls='${c}';renderChampionBrowser()">${c === 'all' ? 'All Classes' : c}</button>`
  ).join('');

  const roleFilters = roles.map(r =>
    `<button class="news-filter-btn ${_champFilter.role===r?'active':''}"
      onclick="_champFilter.role='${r}';renderChampionBrowser()">${r === 'all' ? 'All Roles' : r}</button>`
  ).join('');

  const grid = filtered.map(([name, cd]) => {
    const b = CLASS_BADGE[cd.class] || CLASS_BADGE[(cd.class||'').toLowerCase()];
    const COMP_COLORS = { ENGAGE:'#e67e22', POKE:'#3498db', PICK:'#9b59b6', PROTECT:'#27ae60', SCALING:'#c89b3c' };
    const compColor = cd.compType ? (COMP_COLORS[cd.compType] || '#888') : null;
    const champRolesRaw = cd.roles || (cd.role ? [cd.role] : []);
    const champRoleDisplays = champRolesRaw.map(r => roleMap[r] || r);
    const roleCssMap = { Top:'pos-top', Jungle:'pos-jungle', Mid:'pos-mid', ADC:'pos-adc', Support:'pos-support' };
    const roleBadges = champRoleDisplays.map((r, i) =>
      `<span class="pos-badge ${roleCssMap[r]||''}">${r}${i>0?' (flex)':''}</span>`
    ).join('');
    const isSelected = _champSelected === name;

    // Career stats from all players
    let gamesTotal = 0, winsTotal = 0;
    Object.values(G?.players || {}).forEach(p => {
      const cs = p.career?.championStats?.[name];
      if (cs) { gamesTotal += cs.games || 0; winsTotal += cs.wins || 0; }
    });
    const wr = gamesTotal >= 3 ? `${Math.round(winsTotal/gamesTotal*100)}% WR (${gamesTotal}g)` : '';

    return `<div class="cb-card ${isSelected ? 'cb-selected' : ''}" onclick="_champSelected='${name.replace(/'/g,"\\'")}';renderChampionBrowser()">
      <div class="cb-card-name">${_escHtml(name)}</div>
      <div class="cb-card-badges">
        ${b ? `<span class="class-badge" style="color:${b.color};border-color:${b.color}">${b.label}</span>` : ''}
        ${compColor ? `<span class="dci-comp" style="color:${compColor};border-color:${compColor}">${cd.compType}</span>` : ''}
        ${roleBadges}
      </div>
      ${wr ? `<div class="cb-wr">${wr}</div>` : ''}
    </div>`;
  }).join('');

  // Detail panel for selected champion
  let detailHtml = '<div class="cb-detail-empty">Select a champion to view details</div>';
  if (_champSelected && CHAMPIONS[_champSelected]) {
    const cd = CHAMPIONS[_champSelected];
    const b  = CLASS_BADGE[cd.class] || CLASS_BADGE[(cd.class||'').toLowerCase()];
    const COMP_COLORS = { ENGAGE:'#e67e22', POKE:'#3498db', PICK:'#9b59b6', PROTECT:'#27ae60', SCALING:'#c89b3c' };
    const compColor = cd.compType ? (COMP_COLORS[cd.compType] || '#888') : null;
    const detailRolesRaw = cd.roles || (cd.role ? [cd.role] : []);
    const detailRoleMap = { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support',
                            arcanist:'Mid', vanguard:'Top', ranger:'Jungle', hunter:'ADC', warden:'Support' };
    const detailRoleCssMap = { Top:'pos-top', Jungle:'pos-jungle', Mid:'pos-mid', ADC:'pos-adc', Support:'pos-support' };
    const detailRoleBadges = detailRolesRaw.map((r, i) => {
      const d = detailRoleMap[r] || r;
      return `<span class="pos-badge ${detailRoleCssMap[d]||''}">${d}${i>0?' (flex)':''}</span>`;
    }).join('');

    const stat = (label, val) => `<div class="dci-stat"><span class="dci-stat-label">${label}</span><span class="dci-stat-val">${val}</span></div>`;
    const abilityHtml = (key, icon) => {
      const ab = cd.abilities?.[key];
      if (!ab || key === 'aa') return '';
      const dmgStr = ab.dmg ? `${ab.dmg}${ab.apRatio ? ` (+${ab.apRatio} AP)` : ''}` : '';
      const typeStr = ab.dmgType === 'magic' ? '✦' : '⚔';
      const ccStr = ab.effects?.find(e => e.type === 'cc')?.ccType || '';
      return `<div class="dci-ability">
        <div class="dci-ability-header">
          <span class="dci-ability-icon">${icon}</span>
          <span class="dci-ability-name">${_escHtml(ab.name || key.toUpperCase())}</span>
          <span class="dci-ability-cd">cd: ${ab.cd}s</span>
          ${dmgStr ? `<span class="dci-ability-dmg">${typeStr} ${dmgStr}</span>` : ''}
          ${ccStr ? `<span class="dci-ability-cc">${ccStr}</span>` : ''}
        </div>
      </div>`;
    };

    detailHtml = `<div class="dci-wrap">
      <div class="dci-left">
        <div class="dci-header">
          <span class="dci-name">${_escHtml(_champSelected)}</span>
          ${b ? `<span class="class-badge" style="color:${b.color};border-color:${b.color}">${b.label}</span>` : ''}
          ${compColor ? `<span class="dci-comp" style="color:${compColor};border-color:${compColor}">${cd.compType}</span>` : ''}
          ${detailRoleBadges}
        </div>
        ${cd.lore ? `<div class="dci-lore">${_escHtml(cd.lore)}</div>` : ''}
        <div class="dci-stats">
          ${stat('HP', cd.baseHp)} ${stat('ATK', cd.baseDmg)} ${stat('Range', cd.attackRange)}
          ${stat('Move', cd.moveSpeed)} ${stat('Armor', cd.physResist)} ${stat('MR', cd.magicResist)}
        </div>
      </div>
      <div class="dci-right">
        <div class="dci-abilities-title">Abilities</div>
        ${abilityHtml('q','Q')}${abilityHtml('e','E')}${abilityHtml('ult','R')}
        ${cd.passive ? `<div class="dci-passive"><span class="dci-ability-icon">P</span> <span class="dci-passive-text">${_escHtml(cd.passive.desc||'')}</span></div>` : ''}
      </div>
    </div>`;
  }

  setHtml('champions-content', `
    <div class="cb-filters">${classFilters}</div>
    <div class="cb-filters" style="margin-top:6px">${roleFilters}</div>
    <div class="cb-layout">
      <div class="cb-grid">${grid || '<div style="color:var(--text-dim);padding:20px">No champions match this filter.</div>'}</div>
      <div class="cb-detail">${detailHtml}</div>
    </div>
  `);
}

// ─── Team Info / Club Overview ────────────────────────────────────────────────

function renderTeamInfo() {
  if (!G) return;
  const team     = G.teams[G.humanTeamId];
  const standings = getStandings();
  const rank     = standings.findIndex(t => t.id === G.humanTeamId) + 1;
  const net      = team.sponsorIncome - team.weeklyWages;
  const weeksLeft = Math.max(0, G.season.totalWeeks - G.season.week + 1);

  // Recent results (last 5 matches involving human team)
  const played = G.season.schedule.filter(m =>
    m.played && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
  ).slice(-5).reverse();
  const recentHtml = played.length
    ? played.map(m => {
        const won = m.result?.winnerId === G.humanTeamId;
        const opp = G.teams[won ? (m.homeId === G.humanTeamId ? m.awayId : m.homeId)
                                : (m.homeId === G.humanTeamId ? m.awayId : m.homeId)];
        return `<div class="ti-result-row">
          <span class="ti-result-badge ${won ? 'ti-win' : 'ti-loss'}">${won ? 'W' : 'L'}</span>
          <span class="ti-result-opp">${opp?.name || '—'}</span>
          <span class="ti-result-score" style="color:var(--text-dim)">${m.result?.score || ''}</span>
        </div>`;
      }).join('')
    : '<div style="color:var(--text-dim);font-size:12px">No matches played yet.</div>';

  // Next fixture
  let nextMatch = G.season.schedule.find(m =>
    !m.played && (m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)
  );
  const nextOppId = nextMatch
    ? (nextMatch.homeId === G.humanTeamId ? nextMatch.awayId : nextMatch.homeId)
    : null;
  const nextOpp = nextOppId ? G.teams[nextOppId] : null;

  // Starters summary
  const startersHtml = POSITIONS.map(pos => {
    const p = team.roster[pos] ? G.players[team.roster[pos]] : null;
    if (!p) return `<div class="ti-starter-row"><span class="pos-badge pos-${pos}">${posLabel(pos)}</span><span style="color:var(--text-dim)">Empty</span></div>`;
    const ovr = calcOverall(p);
    return `<div class="ti-starter-row">
      <span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span>
      <span class="ti-starter-name">${_escHtml(p.name)}</span>
      <span class="overall-badge ${overallColor(ovr)}" style="margin-left:auto">${ovr}</span>
    </div>`;
  }).join('');

  // Prestige stars
  const prestige = team.prestige || 5;
  const stars = '★'.repeat(Math.min(prestige, 10)) + '☆'.repeat(Math.max(0, 10 - prestige));

  // Facilities summary
  const facilHtml = team.facilities ? Object.entries(FACILITY_DEFS).map(([k, def]) => {
    const lvl = (team.facilities[k] || 1);
    const pips = Array.from({ length: def.maxLevel }, (_, i) =>
      `<span class="fac-pip ${i < lvl ? 'fac-pip-on' : ''}"></span>`).join('');
    return `<div class="ti-facil-row">
      <span class="ti-facil-icon">${def.icon}</span>
      <span class="ti-facil-name">${def.name}</span>
      <div class="fac-pips">${pips}</div>
    </div>`;
  }).join('') : '';

  setHtml('teaminfo-content', `
    <div class="ti-grid">

      <div class="ti-card ti-identity">
        <div class="ti-team-color-bar" style="background:${team.color}"></div>
        <div class="ti-team-name" style="color:${team.color}">${_escHtml(team.name)}</div>
        <div class="ti-meta">
          <span>${team.shortName}</span> · <span>${team.homeArena || 'The Grove'}</span>
        </div>
        <div class="ti-prestige" title="Prestige ${prestige}/10">${stars}</div>
        <div class="ti-playstyle">
          Style: <strong style="text-transform:capitalize;color:var(--gold)">${team.tactics?.playstyle || '—'}</strong>
        </div>
      </div>

      <div class="ti-card">
        <div class="ti-card-title">Season Record</div>
        <div class="ti-stat-row"><span class="ti-label">Standing</span><span class="ti-val">#${rank} of ${standings.length}</span></div>
        <div class="ti-stat-row"><span class="ti-label">Record</span><span class="ti-val">${team.wins}W – ${team.losses}L</span></div>
        <div class="ti-stat-row"><span class="ti-label">Points</span><span class="ti-val" style="color:var(--gold)">${team.points}</span></div>
        <div class="ti-stat-row"><span class="ti-label">Playoffs?</span><span class="ti-val" style="color:${rank<=4?'var(--win)':'var(--loss)'}">${rank<=4?'On track ✓':'Not qualified'}</span></div>
      </div>

      <div class="ti-card">
        <div class="ti-card-title">Finances</div>
        <div class="ti-stat-row"><span class="ti-label">Budget</span><span class="ti-val" style="color:var(--gold)">${fmtMoney(team.budget)}</span></div>
        <div class="ti-stat-row"><span class="ti-label">Weekly net</span><span class="ti-val" style="color:${net>=0?'var(--win)':'var(--loss)'}">${net>=0?'+':''}${fmtMoney(net)}</span></div>
        <div class="ti-stat-row"><span class="ti-label">Projected EOSplit</span><span class="ti-val">${fmtMoney(team.budget + net * weeksLeft)}</span></div>
        <div class="ti-stat-row"><span class="ti-label">Fans</span><span class="ti-val">${(team.fans/1000).toFixed(0)}K</span></div>
      </div>

      <div class="ti-card">
        <div class="ti-card-title">Starting Roster</div>
        ${startersHtml}
      </div>

      <div class="ti-card">
        <div class="ti-card-title">Recent Results</div>
        ${recentHtml}
        ${nextOpp ? `<div class="ti-next-match">
          Next: <strong style="color:${nextOpp.color}">${_escHtml(nextOpp.name)}</strong>
          <span style="color:var(--text-dim);font-size:11px"> Wk${nextMatch.week}</span>
        </div>` : ''}
      </div>

      <div class="ti-card">
        <div class="ti-card-title">Facilities</div>
        <div class="ti-facil-list">${facilHtml}</div>
        <button class="btn-secondary" style="margin-top:10px;font-size:12px"
          onclick="showMain('facilities')">Manage Facilities →</button>
      </div>

    </div>
  `);
}

// ─── Facilities ───────────────────────────────────────────────────────────────

function renderFacilities() {
  if (!G) return;
  const team = G.teams[G.humanTeamId];
  if (!team.facilities) team.facilities = defaultFacilities();

  const totalMaint = getFacilityMaintenanceCost(G.humanTeamId);

  const cards = Object.entries(FACILITY_DEFS).map(([key, def]) => {
    const raw       = team.facilities[key];
    const fac       = typeof raw === 'number'
      ? { level: raw, upgrading: false, upgradeToLevel: null, weeksRemaining: 0 }
      : (raw || { level: 1, upgrading: false, upgradeToLevel: null, weeksRemaining: 0 });
    const level    = fac.level;
    const isMax    = level >= def.maxLevel;
    const isBuilding = fac.upgrading;
    const upgCost  = isMax ? 0 : def.costs[level];
    const canAfford = !isMax && !isBuilding && team.budget >= upgCost;
    const pips     = Array.from({ length: def.maxLevel }, (_, i) =>
      `<span class="fac-pip ${i < level ? 'fac-pip-on' : i < (fac.upgradeToLevel || 0) ? 'fac-pip-building' : ''}"></span>`
    ).join('');

    let footerHtml;
    if (isMax) {
      footerHtml = '<span class="fac-maxed">MAX LEVEL</span>';
    } else if (isBuilding) {
      footerHtml = `
        <div class="fac-build-progress">
          <span class="fac-building-label">Building L${fac.upgradeToLevel}…</span>
          <div class="fac-build-bar-bg">
            <div class="fac-build-bar-fill" style="width:${Math.max(5,(1 - fac.weeksRemaining / (FACILITY_BUILD_WEEKS[level-1]||2))*100)}%"></div>
          </div>
          <span class="fac-build-eta">${fac.weeksRemaining}wk remaining</span>
        </div>
        <button class="btn-sm btn-danger" style="margin-top:6px" onclick="onCancelFacilityUpgrade('${key}')">Cancel (50% refund)</button>`;
    } else {
      footerHtml = `
        <span class="fac-maint">${fmtMoney(def.weekly[level-1] || 0)}/wk upkeep</span>
        <button class="btn-primary" style="font-size:12px;padding:5px 12px"
          onclick="onUpgradeFacility('${key}')" ${canAfford ? '' : 'disabled'}>
          Upgrade — ${fmtMoney(upgCost)} · ${FACILITY_BUILD_WEEKS[level-1]||2}wk
        </button>`;
    }

    return `
      <div class="fac-card${isBuilding ? ' fac-card-building' : ''}">
        <div class="fac-card-top">
          <span class="fac-icon">${def.icon}</span>
          <div class="fac-info">
            <div class="fac-name">${def.name}${def.levelNames ? ` <span class="fac-level-name">— ${def.levelNames[level-1]}</span>` : ''}</div>
            <div class="fac-desc">${def.desc}</div>
          </div>
        </div>
        <div class="fac-level-row">
          <div class="fac-pips">${pips}</div>
          <span class="fac-level-label">Level ${level} / ${def.maxLevel}</span>
        </div>
        <div class="fac-bonus">${def.bonusLabel(level)}</div>
        <div class="fac-footer" style="flex-direction:column;align-items:flex-start;gap:6px">
          ${footerHtml}
        </div>
      </div>`;
  }).join('');

  setHtml('facilities-content', `
    <div class="fac-summary">
      Total facility upkeep: <strong style="color:var(--loss)">${fmtMoney(totalMaint)}/wk</strong>
      &nbsp;·&nbsp; Budget: <strong style="color:var(--gold)">${fmtMoney(team.budget)}</strong>
    </div>
    <div class="fac-grid">${cards}</div>
  `);
}

function onUpgradeFacility(key) {
  const result = upgradeFacility(key);
  if (result === 'no_budget')        { alert('Insufficient budget for this upgrade.'); return; }
  if (result === 'max_level')        { alert('Already at maximum level.'); return; }
  if (result === 'already_upgrading'){ alert('This facility is already under construction.'); return; }
  renderFacilities();
  renderTopBar();
}

function onCancelFacilityUpgrade(key) {
  cancelFacilityUpgrade(key);
  renderFacilities();
  renderTopBar();
}

// ─── Streaming ────────────────────────────────────────────────────────────────

function setPlayerStreaming(playerId, active) {
  if (!G) return;
  const p = G.players[playerId];
  if (!p) return;
  if (!p.streaming) p.streaming = { active: false, schedule: 'casual' };
  p.streaming.active = active;
  renderSquad('starters');
}

function setPlayerStreamSchedule(playerId, schedule) {
  if (!G) return;
  const p = G.players[playerId];
  if (!p) return;
  if (!p.streaming) p.streaming = { active: true, schedule: 'casual' };
  p.streaming.schedule = schedule;
}

// ─── Fan Engagement ───────────────────────────────────────────────────────────

function _fesColor(fes) {
  if (fes >= 7) return '#4caf50';
  if (fes >= 4) return '#c89b3c';
  return '#f44336';
}

function renderFans() {
  if (!G) return;
  const team = G.teams[G.humanTeamId];
  const fans = team.fans || 0;
  const fes  = team.fes ?? 5;
  const fesColor = _fesColor(fes);

  // Fan history sparkline
  const hist = team.fanHistory || [];
  const sparkMax = Math.max(...hist, fans, 1);
  const sparkMin = Math.min(...hist, fans, 0);
  const sparkRange = sparkMax - sparkMin || 1;
  const sparkPoints = [...hist, fans].map((v, i, arr) => {
    const x = (i / Math.max(arr.length - 1, 1)) * 180;
    const y = 30 - ((v - sparkMin) / sparkRange) * 28;
    return `${x},${y}`;
  }).join(' ');

  // Week fan trend
  const prevFans = hist.length >= 1 ? hist[hist.length - 1] : fans;
  const fanDelta = fans - prevFans;
  const fanDeltaStr = fanDelta >= 0 ? `+${fmtFans(fanDelta)}` : fmtFans(fanDelta);
  const fanDeltaColor = fanDelta >= 0 ? '#4caf50' : '#f44336';

  // FES breakdown contributors
  const marketing = (G.staff || []).find(s => s.role === 'marketing');
  const contProd = marketing ? (marketing.attrs?.contentProduction ?? marketing.stat ?? 10) : 0;
  const mktContrib = marketing ? Math.round((contProd / 20) * 20) / 10 : 0;

  const streamers = Object.values(team.roster || {})
    .map(id => G.players[id])
    .filter(p => p && p.streaming?.active);
  const streamContrib = streamers.reduce((s, p) => s + (p.streaming.schedule === 'heavy' ? 0.8 : 0.3), 0);

  const dealContrib = (G.coStreamDeals?.active || []).reduce((s, d) => s + d.fesPerWeek, 0);
  const matchBonus  = team._fesMatchBonus || 0;
  const eventBonus  = (team.fanEventWeek?.week === G.season.week) ? (team.fanEventWeek?.bonus || 0) : 0;

  const fesRows = [
    { label: 'Base (passive decay)',   val: -0.5 },
    { label: `Streaming (${streamers.length} active)`, val: streamContrib },
    { label: 'Marketing staff',        val: mktContrib },
    { label: `Co-streaming deals (${(G.coStreamDeals?.active||[]).length})`, val: dealContrib },
    { label: 'Match result',           val: matchBonus },
    { label: 'Fan events this week',   val: eventBonus },
  ].filter(r => r.val !== 0 || r.label.includes('Base'));

  const fesBreakdown = fesRows.map(r => {
    const c = r.val > 0 ? '#4caf50' : r.val < 0 ? '#f44336' : 'var(--text-dim)';
    const sign = r.val > 0 ? '+' : '';
    return `<div class="fes-row"><span class="fes-label">${r.label}</span><span class="fes-val" style="color:${c}">${sign}${r.val.toFixed(1)}</span></div>`;
  }).join('');

  // Player streaming list
  const playerRows = Object.values(team.roster || {}).map(id => {
    const p = G.players[id];
    if (!p) return '';
    if (!p.streaming) p.streaming = { active: false, schedule: 'casual' };
    const active = p.streaming.active;
    const sched  = p.streaming.schedule || 'casual';
    const contrib = active ? (sched === 'heavy' ? '+0.8 FES/wk' : '+0.3 FES/wk') : '—';
    return `<tr>
      <td style="font-weight:600;color:var(--text-hi)">${p.name}</td>
      <td><span class="pos-badge pos-${p.position}">${posLabel(p.position)}</span></td>
      <td onclick="event.stopPropagation()">
        <label class="stream-toggle" title="${active ? 'ON' : 'OFF'}">
          <input type="checkbox" ${active ? 'checked' : ''} onchange="setPlayerStreaming('${p.id}',this.checked)">
          <span class="stream-slider"></span>
        </label>
      </td>
      <td>${active ? `<select class="stream-sched-select" onchange="setPlayerStreamSchedule('${p.id}',this.value)">
          <option value="casual" ${sched==='casual'?'selected':''}>Casual</option>
          <option value="heavy"  ${sched==='heavy' ?'selected':''}>Heavy</option>
        </select>` : '<span style="color:var(--text-dim);font-size:11px">inactive</span>'}</td>
      <td style="color:${active?'#4caf50':'var(--text-dim)'};font-size:11px">${contrib}</td>
    </tr>`;
  }).join('');

  // Co-streaming active deals
  const activeDeals = (G.coStreamDeals?.active || []).map(d => `
    <div class="deal-card deal-active">
      <div class="deal-name">${d.partner}</div>
      <div class="deal-stats">
        <span style="color:#4caf50">+${d.fesPerWeek} FES/wk</span>
        ${d.costPerWeek > 0 ? `<span style="color:#f44336">−${fmtMoney(d.costPerWeek)}/wk</span>` : '<span style="color:var(--text-dim)">Free</span>'}
        <span style="color:var(--text-dim)">${d.weeksRemaining}wk left</span>
      </div>
      <button class="btn-sm btn-danger" onclick="onCancelDeal('${d.id}')">Cancel</button>
    </div>`).join('') || '<div style="color:var(--text-dim);font-size:12px">No active deals</div>';

  // Co-streaming available deals
  const availDeals = (G.coStreamDeals?.available || []).map(d => `
    <div class="deal-card">
      <div class="deal-name">${d.partner}</div>
      <div class="deal-stats">
        <span style="color:#4caf50">+${d.fesPerWeek} FES/wk</span>
        ${d.costPerWeek > 0 ? `<span style="color:#f44336">−${fmtMoney(d.costPerWeek)}/wk</span>` : '<span style="color:var(--text-dim)">Free</span>'}
        <span style="color:var(--text-dim)">${d.durationWeeks}wk</span>
      </div>
      <button class="btn-sm" onclick="onAcceptDeal('${d.id}')">Accept</button>
    </div>`).join('') || '<div style="color:var(--text-dim);font-size:12px">No deals available — check back next week</div>';

  // Fan events
  const week = G.season.week;
  const totalWeeks = G.season.totalWeeks || 9;
  const eventDefs = FAN_EVENT_DEFS || {};
  const eventKeys = Object.keys(eventDefs);

  const eventCards = eventKeys.map(key => {
    const def = eventDefs[key];
    const lastWeek = team.fanEvents?.[key] || 0;
    const cdLeft = def.cooldownWeeks - (week - lastWeek);
    const onCooldown = cdLeft > 0;
    const canAfford = team.budget >= def.cost;
    const disabled  = onCooldown || !canAfford;
    const reason    = onCooldown ? `Cooldown: ${cdLeft}wk` : !canAfford ? 'Insufficient budget' : '';
    const availBadge = (!onCooldown && canAfford)
      ? `<span class="event-available-badge">Available now!</span>` : '';
    return `<div class="event-card" id="event-card-${key}">
      <div class="event-name">${def.label} ${availBadge}</div>
      <div class="event-stats">
        <span style="color:#f44336">−${fmtMoney(def.cost)}</span>
        <span style="color:#4caf50">+${def.fesBonus} FES</span>
        ${def.trainingBlock > 0 ? `<span style="color:var(--text-dim)">No training ${def.trainingBlock}wk</span>` : ''}
      </div>
      ${reason ? `<div style="font-size:11px;color:var(--text-dim)">${reason}</div>` : ''}
      <button class="btn-sm" onclick="onHostFanEvent('${key}')" ${disabled ? 'disabled' : ''}>Host</button>
    </div>`;
  }).join('');

  // Event calendar — next 8 weeks (or remaining season weeks)
  const calWeeks = Math.min(8, totalWeeks - week + 1);
  const calHeaders = Array.from({length: calWeeks}, (_, i) => {
    const w = week + i;
    return `<div class="ec-week-col"><div class="ec-week-label">Wk ${w}</div></div>`;
  }).join('');

  const calRows = eventKeys.map(key => {
    const def = eventDefs[key];
    const lastWeek = team.fanEvents?.[key] || 0;
    const dots = Array.from({length: calWeeks}, (_, i) => {
      const w = week + i;
      const cdAtW = def.cooldownWeeks - (w - lastWeek);
      const justDone = (lastWeek === w - 1) || (lastWeek === w);
      if (justDone && lastWeek > 0) {
        return `<div class="ec-dot ec-recent" title="${def.label} was recently held">🟡</div>`;
      } else if (cdAtW > 0) {
        return `<div class="ec-dot ec-cooldown" title="Cooldown: ${Math.max(0,cdAtW)} week(s)">🔴</div>`;
      } else {
        return `<div class="ec-dot ec-available" title="${def.label} available week ${w}">🟢</div>`;
      }
    }).join('');
    return `<div class="ec-row">
      <div class="ec-row-label">${def.label}</div>
      <div class="ec-dots">${dots}</div>
    </div>`;
  }).join('');

  setHtml('fans-content', `
    <div class="fans-layout">

      <!-- Fan Overview -->
      <div class="fans-overview-card">
        <div class="fans-overview-top">
          <div class="fans-count-block">
            <div class="fans-count-num">${fmtFans(fans)}</div>
            <div class="fans-count-label">Total Fans</div>
            <div style="font-size:13px;color:${fanDeltaColor}">${fanDeltaStr} this week</div>
          </div>
          <div class="fans-fes-block">
            <div class="fes-gauge-wrap">
              <svg width="100" height="60" viewBox="0 0 100 60">
                <path d="M10,50 A40,40 0 0,1 90,50" stroke="#2a2a3a" stroke-width="10" fill="none"/>
                <path d="M10,50 A40,40 0 0,1 90,50" stroke="${fesColor}" stroke-width="10" fill="none"
                  stroke-dasharray="${fes * 12.57} 125.7" stroke-linecap="round"/>
              </svg>
              <div class="fes-gauge-val" style="color:${fesColor}">${fes.toFixed(1)}</div>
            </div>
            <div style="text-align:center;font-size:11px;color:var(--text-dim)">Fan Engagement Score</div>
          </div>
          <div class="fans-spark-block">
            <svg width="190" height="36" viewBox="0 0 190 36">
              <polyline points="${sparkPoints}" fill="none" stroke="#4fc3f7" stroke-width="2"/>
            </svg>
            <div style="font-size:10px;color:var(--text-dim);text-align:center">Last ${[...hist, fans].length} weeks</div>
          </div>
        </div>
        <div class="fes-breakdown">
          <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">FES Breakdown (this week)</div>
          ${fesBreakdown}
        </div>
      </div>

      <!-- Content & Streaming -->
      <div class="fans-section">
        <div class="fans-section-title">Content & Streaming</div>
        ${marketing ? `<div class="fans-mkt-bar">
          <span>Marketing Manager (${marketing.name}):</span>
          <span style="color:#4caf50">+${mktContrib.toFixed(1)} FES/wk</span>
          <div class="mkt-stat-bar-bg"><div class="mkt-stat-bar-fill" style="width:${(contProd/20)*100}%"></div></div>
          <span style="font-size:11px;color:var(--text-dim)">Content Production ${contProd}/20</span>
        </div>` : `<div style="font-size:12px;color:var(--text-dim)">No Marketing Manager hired — hire one to boost FES significantly. <a href="#" onclick="showMain('staff')">Go to Staff →</a></div>`}
        <table class="fans-player-table" style="margin-top:12px">
          <thead><tr><th>Player</th><th>Pos</th><th>Streaming</th><th>Schedule</th><th>FES/wk</th></tr></thead>
          <tbody>${playerRows}</tbody>
        </table>
      </div>

      <!-- Co-streaming Deals -->
      <div class="fans-section">
        <div class="fans-section-title">Co-streaming Deals</div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">Active partnerships provide weekly FES boosts and may cost weekly fees.</div>
        <div class="deals-group-label">Active</div>
        <div class="deals-row">${activeDeals}</div>
        <div class="deals-group-label" style="margin-top:12px">Available Offers</div>
        <div class="deals-row">${availDeals}</div>
      </div>

      <!-- Fan Events -->
      <div class="fans-section">
        <div class="fans-section-title">Fan Events</div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">One-time events deliver big FES spikes but cost budget and may block training.</div>
        <div class="events-row">${eventCards}</div>
        ${calWeeks > 0 ? `
        <div class="event-calendar">
          <div class="ec-title">Event Calendar</div>
          <div class="ec-grid">
            <div class="ec-header-row">
              <div class="ec-row-label"></div>
              <div class="ec-dots">${calHeaders}</div>
            </div>
            ${calRows}
          </div>
        </div>` : ''}
      </div>

    </div>
  `);
}

function onAcceptDeal(dealId) {
  if (!G) return;
  acceptCoStreamDeal(dealId);
  renderFans();
}

function onCancelDeal(dealId) {
  if (!G) return;
  cancelCoStreamDeal(dealId);
  renderFans();
}

function onHostFanEvent(eventKey) {
  if (!G) return;
  const result = hostFanEvent(eventKey);
  if (!result.ok) { alert(result.msg); return; }
  renderFans();
  renderAll();
}

function fmtFans(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ─── Coaching Staff ───────────────────────────────────────────────────────────

function _staffAttrBars(s) {
  const attrKeys = (STAFF_ROLE_ATTRS && STAFF_ROLE_ATTRS[s.role]) || [];
  return attrKeys.map(key => {
    const val = s.attrs?.[key] ?? 10;
    const pct = (val / 20) * 100;
    const color = val >= 15 ? '#4caf50' : val >= 10 ? '#c89b3c' : '#888';
    const label = (STAFF_ROLE_ATTR_LABELS && STAFF_ROLE_ATTR_LABELS[key]) || key;
    return `<div class="staff-attr-row">
      <span class="staff-attr-label">${label}</span>
      <div class="staff-attr-bar-bg"><div class="staff-attr-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="staff-attr-val" style="color:${color}">${val}</span>
    </div>`;
  }).join('');
}

function _staffCardHtml(s, mode) {
  // mode: 'hired' | 'available'
  const ovr = _staffOverall(s.attrs || {});
  const ovrColor = ovr >= 14 ? '#4caf50' : ovr >= 10 ? '#c89b3c' : '#888';
  const attrBars = _staffAttrBars(s);
  const bonus = (STAFF_ROLE_BONUS && STAFF_ROLE_BONUS[s.role]) || '';
  if (mode === 'hired') {
    return `<div class="staff-card staff-hired">
      <div class="staff-card-top">
        <div class="staff-card-info">
          <span class="staff-role-badge">${STAFF_ROLE_LABEL[s.role] || s.role}</span>
          <span class="staff-name">${_escHtml(s.name)}</span>
          <span class="staff-nat" style="color:var(--text-dim)">${s.nationality || ''}</span>
        </div>
        <div class="staff-ovr-box" style="color:${ovrColor}">${ovr}</div>
      </div>
      <div class="staff-attr-block">${attrBars}</div>
      <div class="staff-bonus-line">${bonus}</div>
      <div class="staff-card-footer">
        <span class="staff-wage">${fmtMoney(s.wage)}/wk</span>
        <button class="btn-secondary" onclick="onFireStaff('${s.id}')">Release</button>
      </div>
    </div>`;
  } else {
    // available — check hire eligibility
    const team = G.teams[G.humanTeamId];
    const roleBlocked = (G.staff || []).some(x => x.role === s.role);
    const canAfford   = team.budget >= s.wage * 4;
    const disabled    = roleBlocked || !canAfford;
    const reason      = roleBlocked ? 'Role filled' : (!canAfford ? 'Insufficient budget' : '');
    return `<div class="staff-card ${disabled ? 'staff-card-dim' : ''}">
      <div class="staff-card-top">
        <div class="staff-card-info">
          <span class="staff-role-badge">${STAFF_ROLE_LABEL[s.role] || s.role}</span>
          <span class="staff-name">${_escHtml(s.name)}</span>
          <span class="staff-nat" style="color:var(--text-dim)">${s.nationality || ''}</span>
        </div>
        <div class="staff-ovr-box" style="color:${ovrColor}">${ovr}</div>
      </div>
      <div class="staff-attr-block">${attrBars}</div>
      <div class="staff-bonus-line">${bonus}</div>
      <div class="staff-card-footer">
        <span class="staff-wage">${fmtMoney(s.wage)}/wk</span>
        ${reason ? `<span class="staff-reason">${reason}</span>` : ''}
        <button class="btn-primary" onclick="onHireStaff('${s.id}')"
          ${disabled ? 'disabled' : ''} style="font-size:12px;padding:5px 14px">Hire</button>
      </div>
    </div>`;
  }
}

function renderStaff() {
  if (!G) return;
  const team    = G.teams[G.humanTeamId];
  const hired   = G.staff || [];
  const hiredByRole = {};
  hired.forEach(s => { hiredByRole[s.role] = s; });

  // Roster slots — one per role in order
  const rolesOrder = (typeof STAFF_ROLES_ORDER !== 'undefined') ? STAFF_ROLES_ORDER : ['headcoach','analyst','marketing','mental','scout'];
  const rosterSlots = rolesOrder.map(role => {
    const member = hiredByRole[role];
    if (member) {
      return `<div class="staff-slot staff-slot-filled">${_staffCardHtml(member, 'hired')}</div>`;
    }
    const roleLabel = (STAFF_ROLE_LABEL && STAFF_ROLE_LABEL[role]) || role;
    const bonus     = (STAFF_ROLE_BONUS  && STAFF_ROLE_BONUS[role])  || '';
    return `<div class="staff-slot staff-slot-vacant">
      <div class="staff-vacant-role">${roleLabel}</div>
      <div class="staff-vacant-bonus">${bonus}</div>
      <div class="staff-vacant-label">— Vacant —</div>
    </div>`;
  }).join('');

  // Available pool (not hired)
  const hiredIds = new Set(hired.map(s => s.id));
  const available = STAFF_POOL.filter(s => !hiredIds.has(s.id));
  const availHtml = available.length
    ? available.map(s => _staffCardHtml(s, 'available')).join('')
    : '<div class="staff-empty" style="grid-column:1/-1">No staff available.</div>';

  const totalStaffWage = hired.reduce((s, m) => s + m.wage, 0);
  setHtml('staff-content', `
    <div class="staff-budget-bar">
      Staff wages: <strong style="color:var(--gold)">${fmtMoney(totalStaffWage)}/wk</strong>
      &nbsp;·&nbsp; Budget: <strong style="color:var(--gold)">${fmtMoney(team.budget)}</strong>
    </div>
    <h3 class="staff-section-title">Staff Roster</h3>
    <div class="staff-roster">${rosterSlots}</div>
    <h3 class="staff-section-title" style="margin-top:20px">Available Staff</h3>
    <div class="staff-grid">${availHtml}</div>
  `);
}

function onHireStaff(staffId) {
  const result = hireStaff(staffId);
  if (result === 'role_filled') { alert('You already have a staff member in that role.'); return; }
  if (result === 'no_budget')   { alert('Insufficient budget (need 4 weeks of wages as buffer).'); return; }
  renderStaff();
  renderTopBar();
}

function onFireStaff(staffId) {
  fireStaff(staffId);
  renderStaff();
  renderTopBar();
}

// ─── News ─────────────────────────────────────────────────────────────────────

let _newsFilter = 'all';

function _updateNewsBadge() {
  if (!G) return;
  const unread = G.news.filter(n => n.timestamp > (G.newsReadUntil || 0)).length;
  const badge = document.getElementById('news-badge');
  if (!badge) return;
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function renderNews() {
  if (!G) return;
  // Mark all items as read when panel opens
  G.newsReadUntil = Date.now();
  _updateNewsBadge();

  const TYPE_LABEL = { info: 'Info', match: 'Match', alert: 'Alert' };
  const TYPE_COLOR = { info: 'var(--text-dim)', match: 'var(--gold)', alert: 'var(--loss)' };

  const filterBtns = ['all', 'info', 'match', 'alert'].map(f =>
    `<button class="news-filter-btn ${f === _newsFilter ? 'active' : ''}"
       onclick="_newsFilter='${f}';renderNews()">${f === 'all' ? 'All' : TYPE_LABEL[f]}</button>`
  ).join('');

  const filtered = _newsFilter === 'all' ? G.news : G.news.filter(n => n.type === _newsFilter);

  const items = filtered.length
    ? filtered.map(n => `
        <div class="news-panel-item news-${n.type}">
          <div class="npi-meta">
            <span class="npi-week">Wk${n.week}</span>
            <span class="npi-type" style="color:${TYPE_COLOR[n.type] || 'var(--text-dim)'}">
              ${TYPE_LABEL[n.type] || n.type}
            </span>
          </div>
          <div class="npi-text">${_escHtml(n.text)}</div>
        </div>`)
      .join('')
    : '<div class="news-empty">No news in this category.</div>';

  setHtml('news-content', `
    <div class="news-filters">${filterBtns}</div>
    <div class="news-panel-list">${items}</div>
  `);
}

// ─── renderAll ────────────────────────────────────────────────────────────────

function renderAll() {
  renderTopBar();
  renderDashboard();
  _updateNewsBadge();
}
