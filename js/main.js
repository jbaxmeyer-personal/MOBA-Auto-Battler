// js/main.js — Game state and event loop

// ─── Global State ─────────────────────────────────────────────────────────────

const G = {
  phase:       'setup',
  teamName:    '',
  gold:        0,
  xp:          0,
  level:       1,
  round:       1,
  winStreak:   0,
  loseStreak:  0,
  roster:      [null, null, null, null, null],
  bench:       [],
  shopSlots:   [],
  shopLocked:  false,
  playerPool:  [],
  allTeams:    [],
  aiTeams:     [],
  schedule:    [],
  bracket:     null,
  selectedUnit: null,        // { instanceId } for click-to-move
  lastMatchResult: null,
  lastIncome:      null,
  _bracketOpponent: null,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

function startGame() {
  const nameInput = document.getElementById('team-name-input');
  G.teamName   = (nameInput?.value.trim()) || 'My Team';
  G.gold       = CONFIG.STARTING_GOLD;
  G.xp         = 0;
  G.level      = 1;
  G.winStreak  = 0;
  G.loseStreak = 0;
  G.roster     = [null, null, null, null, null];
  G.bench      = [];
  G.shopLocked = false;
  G.selectedUnit = null;

  initPool(G);
  initTournament(G);

  // Give human the T0 starter pack
  const pack = getStarterPack();
  pack.forEach(p => {
    const posIdx = CONFIG.POSITIONS.indexOf(p.position);
    if (posIdx !== -1) G.roster[posIdx] = p;
  });

  enterShopPhase();
}

// ─── Phase Transitions ────────────────────────────────────────────────────────

function enterShopPhase() {
  G.phase = 'shop';

  if (G.round > 1) {
    // AI teams run their shop phases
    runAIShopPhases(G);
    // Simulate all AI vs AI matches for this round
    simulateAIRoundMatches(G);
    // Human earns income
    G.lastIncome = applyGoldIncome(G);
    addXP(G, CONFIG.XP_PER_ROUND);
  } else {
    G.lastIncome = { base: G.gold, interest: 0, streakBonus: 0, total: G.gold };
  }

  drawShop(G);
  showScreen('screen-game');
  showTab('shop');
  renderShop(G);
  renderOpponentPreview(G);
  renderHeader(G);

  // Update header phase label
  const phaseEl = document.getElementById('header-phase');
  if (phaseEl) phaseEl.textContent = `Round ${G.round} of ${CONFIG.ROUND_ROBIN_ROUNDS}`;
}

function enterMatchPhase() {
  // Save bracket flag BEFORE changing phase
  const isBracket = G.phase === 'bracket_shop';
  G.phase = isBracket ? 'bracket_match' : 'match';

  const opp = isBracket ? G._bracketOpponent : getHumanOpponent(G);
  if (!opp) { showToast('No opponent found!'); return; }

  const blueTeam = G.roster.filter(Boolean);
  if (!blueTeam.length) {
    showToast('Buy at least 1 player before battling!');
    G.phase = isBracket ? 'bracket_shop' : 'shop';
    return;
  }

  const redTeam = (opp.roster || []).filter(Boolean);
  G.lastMatchResult = simulateMatch(blueTeam, redTeam, G.teamName, opp.name);
  G.lastMatchResult._opponent = opp;

  showScreen('screen-match');

  document.getElementById('draft-phase').style.display = 'block';
  const pbpContainerInit = document.getElementById('pbp-container');
  if (pbpContainerInit) pbpContainerInit.style.display = 'none';

  renderDraft(G.lastMatchResult, G.teamName, opp.name);
}

function onStartMatch() {
  document.getElementById('draft-phase').style.display = 'none';
  const pbpContainer = document.getElementById('pbp-container');
  if (pbpContainer) pbpContainer.style.display = 'block';
  startPlayByPlay(G.lastMatchResult, G.teamName, G.lastMatchResult._opponent?.name || 'Opponent');
}

function applyMatchResultAndShowInline() {
  const result  = G.lastMatchResult;
  const blueWin = result.winner === 'blue';
  applyHumanResult(G, blueWin, result.stats);
  G.lastIncome = calcGoldIncome(G);
  renderInlineResults(G, result, blueWin, G.lastIncome);
}

function continueAfterResults() {
  // Apply the earned gold now
  G.gold += G.lastIncome.total;

  const isBracketPhase = G.phase === 'bracket_match' || G.phase === 'bracket_results';

  if (isBracketPhase) {
    handleBracketContinue();
    return;
  }

  G.round++;

  if (G.round > CONFIG.ROUND_ROBIN_ROUNDS) {
    startBracket();
  } else {
    enterShopPhase();
  }
}

// ─── Bracket Flow ─────────────────────────────────────────────────────────────

function showBracketContinueBtn() {
  const btn = document.getElementById('btn-bracket-continue');
  if (btn) btn.style.display = '';
}

function hideBracketContinueBtn() {
  const btn = document.getElementById('btn-bracket-continue');
  if (btn) btn.style.display = 'none';
}

function startBracket() {
  initBracket(G);
  G.phase = 'bracket';

  showScreen('screen-bracket');
  renderBracket(G);

  if (!humanInBracket(G)) {
    // Human didn't make playoffs
    setTimeout(() => {
      renderGameOver(G, false);
      showScreen('screen-gameover');
    }, 3000);
    return;
  }

  showBracketContinueBtn();
}

function enterBracketShop() {
  G.phase = 'bracket_shop';
  G._bracketOpponent = null;

  // Find the human's bracket opponent
  const match = getHumanBracketMatch(G);
  if (match) {
    G._bracketOpponent = match.teamA?.isHuman ? match.teamB : match.teamA;
  }

  // Flat gold for bracket rounds
  G.gold += CONFIG.BASE_GOLD;

  drawShop(G);
  showScreen('screen-game');
  showTab('shop');
  renderShop(G);
  renderOpponentPreview(G);
  renderHeader(G);

  const phaseEl = document.getElementById('header-phase');
  if (phaseEl) {
    phaseEl.textContent = G.bracket?.bracketRound === 'finals' ? '🏆 Grand Final' : '🏆 Semi-Finals';
  }
}

function handleBracketContinue() {
  const result  = G.lastMatchResult;
  const blueWin = result.winner === 'blue';

  applyBracketResult(G, blueWin);

  const { bracket } = G;

  if (bracket.bracketRound === 'eliminated') {
    showScreen('screen-bracket');
    renderBracket(G);
    setTimeout(() => { renderGameOver(G, false); showScreen('screen-gameover'); }, 2500);
    return;
  }

  if (bracket.bracketRound === 'done') {
    showScreen('screen-bracket');
    renderBracket(G);
    setTimeout(() => {
      renderGameOver(G, bracket.champion?.isHuman);
      showScreen('screen-gameover');
    }, 2500);
    return;
  }

  // More bracket rounds remain — show bracket, wait for button click
  showScreen('screen-bracket');
  renderBracket(G);
  showBracketContinueBtn();
}

// ─── Shop Handlers ────────────────────────────────────────────────────────────

function onBuyPlayer(shopIndex) {
  const bought = G.shopSlots[shopIndex];
  if (!bought) return;
  if (!buyShopPlayer(G, shopIndex)) {
    showToast('Not enough gold or no space! (max 5 active + 9 bench)');
    return;
  }

  // Auto-replace T0 rookie starter of the same position with the just-bought player
  const posIdx = CONFIG.POSITIONS.indexOf(bought.position);
  if (posIdx !== -1) {
    const rookie = G.roster[posIdx];
    if (rookie && rookie.tier === 0) {
      // Find the newly bought player on bench (last added non-T0 at this position)
      let newBenchIdx = -1;
      for (let i = G.bench.length - 1; i >= 0; i--) {
        if (G.bench[i].position === bought.position && G.bench[i].tier > 0) {
          newBenchIdx = i; break;
        }
      }
      if (newBenchIdx !== -1) {
        const newPlayer = G.bench.splice(newBenchIdx, 1)[0];
        G.roster[posIdx] = newPlayer;
        showToast(`${newPlayer.name} replaces ${rookie.name}!`);
        // Rookie removed (T0 gives 0g and isn't from pool)
      }
    }
  }

  G.selectedUnit = null;
  renderShop(G);
  renderHeader(G);
}

function onSellPlayer(instanceId) {
  const result = sellPlayer(G, instanceId);
  if (result === 'need_bench') {
    showToast('Need a bench player in the same role to replace this starter!');
    return;
  }
  if (!result) return;
  G.selectedUnit = null;
  renderShop(G);
  renderHeader(G);
}

function onMoveToRoster(instanceId) {
  moveToRoster(G, instanceId);
  G.selectedUnit = null;
  renderShop(G);
}

function onMoveToBench(instanceId) {
  const result = moveToBench(G, instanceId);
  if (result === 'need_swap') {
    showToast('Need a bench player in the same role to swap with!');
    return;
  }
  G.selectedUnit = null;
  renderShop(G);
}

function onReroll() {
  if (!rerollShop(G)) { showToast('Need 2g to reroll!'); return; }
  renderShop(G);
  renderHeader(G);
}

function onLockShop() {
  toggleLockShop(G);
  renderShop(G);
}

function onBuyXP() {
  if (!buyXP(G)) {
    const maxLevel = CONFIG.LEVEL_XP.length - 1;
    showToast(G.level >= maxLevel ? 'Already max level!' : 'Need 4g to buy XP!');
    return;
  }
  renderShop(G);
  renderHeader(G);
}

function onReady() {
  if (!G.roster.filter(Boolean).length) {
    showToast('Add at least 1 player to your active roster!');
    return;
  }
  enterMatchPhase();
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

function playAgain() {
  Object.assign(G, {
    phase:'setup', teamName:'', gold:0, xp:0, level:1,
    round:1, winStreak:0, loseStreak:0,
    roster:[null,null,null,null,null], bench:[],
    shopSlots:[], shopLocked:false, selectedUnit:null,
    playerPool:[], allTeams:[], aiTeams:[],
    schedule:[], bracket:null,
    lastMatchResult:null, lastIncome:null, _bracketOpponent:null,
  });
  showScreen('screen-setup');
}

// ─── DOM Ready ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Warn before page refresh/close while a game is in progress
  window.addEventListener('beforeunload', e => {
    if (G.phase !== 'setup') { e.preventDefault(); e.returnValue = ''; }
  });

  // Setup
  document.getElementById('btn-start-game')
    ?.addEventListener('click', startGame);
  document.getElementById('team-name-input')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });

  // Shop controls
  document.getElementById('btn-reroll')   ?.addEventListener('click', onReroll);
  document.getElementById('btn-lock-shop')?.addEventListener('click', onLockShop);
  document.getElementById('btn-buy-xp')   ?.addEventListener('click', onBuyXP);
  document.getElementById('btn-ready')    ?.addEventListener('click', onReady);

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      showTab(tab);
      if (tab === 'standings') renderStandings(G);
      if (tab === 'shop')      renderShop(G);
    });
  });

  // Bracket continue button
  document.getElementById('btn-bracket-continue')?.addEventListener('click', () => {
    hideBracketContinueBtn();
    enterBracketShop();
  });

  // Match screen
  document.getElementById('btn-start-match')?.addEventListener('click', onStartMatch);

  // Results / Continue (now inside pbp-results inline)
  document.getElementById('btn-continue')?.addEventListener('click', continueAfterResults);

  // Game over
  document.getElementById('btn-play-again')?.addEventListener('click', playAgain);
});
