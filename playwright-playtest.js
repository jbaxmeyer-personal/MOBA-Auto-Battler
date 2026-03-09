// playwright-playtest.js — Real browser-driven balance playtest
// Drives Chrome against local index.html and collects actual game outcomes.

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:9090';
const ROUND_ROBIN_ROUNDS = 14;

// ─── Utility: wait for one of several selectors to become visible ─────────────

async function waitForAny(page, selectors, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    for (const sel of selectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        const vis = await el.isVisible().catch(() => false);
        if (vis) return sel;
      }
    }
    await page.waitForTimeout(300);
  }
  return null;
}

// ─── Single Game Playthrough ──────────────────────────────────────────────────

async function playOneGame(browser, gameNum) {
  const page = await browser.newPage();

  // Dismiss beforeunload dialogs
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  // Suppress console spam
  page.on('console', () => {});

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });

    // ── Start game ──
    await page.fill('#team-name-input', `Bot${gameNum}`);
    await page.click('#btn-start-game');
    await page.waitForSelector('#screen-game.active', { timeout: 8000 });

    const roundResults = [];

    // ── Round-robin loop ──
    for (let round = 1; round <= ROUND_ROBIN_ROUNDS; round++) {
      // Wait for shop phase — btn-ready visible
      const readyVisible = await page.waitForSelector('#btn-ready', {
        state: 'visible', timeout: 12000
      }).then(() => true).catch(() => false);

      if (!readyVisible) break;

      await doShopPhase(page, round);
      await page.click('#btn-ready');

      // Wait for draft screen
      const startMatchVisible = await page.waitForSelector('#btn-start-match', {
        state: 'visible', timeout: 12000
      }).then(() => true).catch(() => false);

      if (!startMatchVisible) break;

      await page.click('#btn-start-match');

      // Skip play-by-play once the skip button appears
      const skipVisible = await page.waitForSelector('#btn-skip-pbp', {
        state: 'visible', timeout: 12000
      }).then(() => true).catch(() => false);

      if (skipVisible) {
        await page.click('#btn-skip-pbp');
      }

      // Wait for inline results panel
      await page.waitForFunction(() => {
        const el = document.getElementById('pbp-results');
        return el && el.style.display !== 'none';
      }, { timeout: 15000 });

      // Read win/loss
      const won = await page.$eval('#pbp-results-content .pbp-result-banner', el =>
        el.classList.contains('win')
      ).catch(() => false);

      // Read match stats table
      const stats = await page.$$eval('.match-stats-table tbody tr', rows =>
        rows.map(r => {
          const cells = r.querySelectorAll('td');
          return {
            label: cells[1]?.textContent?.trim() || '',
            blue:  parseInt(cells[0]?.textContent || '0') || 0,
            red:   parseInt(cells[2]?.textContent || '0') || 0,
          };
        })
      ).catch(() => []);

      roundResults.push({ round, won, stats });

      // Click Continue
      await page.click('#btn-continue');

      // Detect next state: shop (next round), bracket screen, or gameover
      const nextState = await waitForAny(page, [
        '#btn-ready',            // next shop phase (screen-game active)
        '#screen-bracket.active',
        '#screen-gameover.active',
      ], 14000);

      if (nextState === '#screen-bracket.active' || nextState === '#screen-gameover.active') {
        break;
      }

      if (!nextState) break; // timeout
    }

    // ── Bracket handling ──
    let bracketWins = 0;
    let bracketLosses = 0;
    let inBracket = false;
    let madePlayoffs = false;

    // Check current state after round-robin
    const onBracketScreen = await page.$('#screen-bracket.active').then(el => !!el).catch(() => false);
    const onGameoverScreen = await page.$('#screen-gameover.active').then(el => !!el).catch(() => false);

    if (onBracketScreen) {
      // Did we make playoffs? btn-bracket-continue will be visible if yes.
      // If no, startBracket() fires setTimeout(renderGameOver, 3000) instead.
      const bracketContinueVisible = await page.waitForSelector('#btn-bracket-continue', {
        state: 'visible', timeout: 4500
      }).then(() => true).catch(() => false);

      if (!bracketContinueVisible) {
        // Didn't make playoffs — wait for gameover timer
        madePlayoffs = false;
        await waitForAny(page, ['#screen-gameover.active'], 6000);
      } else {
        madePlayoffs = true;
        inBracket = true;

        // Handle up to 2 bracket rounds (semis + final)
        for (let bRound = 0; bRound < 2; bRound++) {
          // Click continue → enterBracketShop() → shows shop
          await page.click('#btn-bracket-continue').catch(() => {});

          // Wait for bracket shop (btn-ready visible on game screen)
          const bState = await waitForAny(page, [
            '#btn-ready',
            '#screen-gameover.active',
          ], 12000);

          if (bState === '#screen-gameover.active' || !bState) break;

          // Do shop + match
          await doShopPhase(page, 100 + bRound);
          await page.click('#btn-ready');

          const startOk = await page.waitForSelector('#btn-start-match', {
            state: 'visible', timeout: 12000
          }).then(() => true).catch(() => false);
          if (!startOk) break;

          await page.click('#btn-start-match');

          const skipOk = await page.waitForSelector('#btn-skip-pbp', {
            state: 'visible', timeout: 12000
          }).then(() => true).catch(() => false);
          if (skipOk) await page.click('#btn-skip-pbp');

          await page.waitForFunction(() => {
            const el = document.getElementById('pbp-results');
            return el && el.style.display !== 'none';
          }, { timeout: 15000 });

          const bWon = await page.$eval('#pbp-results-content .pbp-result-banner', el =>
            el.classList.contains('win')
          ).catch(() => false);

          if (bWon) bracketWins++; else bracketLosses++;

          await page.click('#btn-continue');

          // handleBracketContinue() ALWAYS shows screen-bracket first, then either:
          //   - showBracketContinueBtn() for more rounds (semis winner → final)
          //   - setTimeout(showScreen('gameover'), 2500) for eliminated or champion
          const postBracket = await waitForAny(page, ['#screen-bracket.active'], 8000);
          if (!postBracket) break;

          // Check if more rounds remain
          const moreBracket = await page.waitForSelector('#btn-bracket-continue', {
            state: 'visible', timeout: 3500
          }).then(() => true).catch(() => false);

          if (!moreBracket) {
            // Eliminated or champion — wait for gameover
            await waitForAny(page, ['#screen-gameover.active'], 6000);
            break;
          }
          // else: loop again to click btn-bracket-continue for the final
        }
      }
    }

    // ── Check champion ──
    let isChampion = false;
    try {
      const goText = await page.$eval('#gameover-content', el => el.textContent || '').catch(() => '');
      isChampion = goText.includes('WORLD CHAMPIONS') || goText.includes('Champions!');
    } catch (_) {}

    // ── Compute results ──
    const wins   = roundResults.filter(r => r.won).length;
    const losses = roundResults.filter(r => !r.won).length;

    // ── Aggregate match stats ──
    const allStats = roundResults.flatMap(r => r.stats);

    function avgStat(label) {
      const matching = allStats.filter(s => s.label.toLowerCase().includes(label.toLowerCase()));
      if (!matching.length) return 0;
      return matching.reduce((a, r) => a + r.blue + r.red, 0) / matching.length;
    }

    return {
      gameNum,
      wins,
      losses,
      madePlayoffs,
      inBracket,
      isChampion,
      roundsPlayed: roundResults.length,
      bracketWins,
      bracketLosses,
      avgKills:   +avgStat('Kill').toFixed(2),
      avgTowers:  +avgStat('Tower').toFixed(2),
      avgDragons: +avgStat('Dragon').toFixed(2),
      avgBarons:  +avgStat('Baron').toFixed(2),
    };

  } catch (err) {
    return {
      gameNum,
      error: err.message,
      wins: 0, losses: 0,
      madePlayoffs: false, inBracket: false, isChampion: false,
      roundsPlayed: 0, bracketWins: 0, bracketLosses: 0,
      avgKills: 0, avgTowers: 0, avgDragons: 0, avgBarons: 0,
    };
  } finally {
    await page.close();
  }
}

// ─── Shop AI ─────────────────────────────────────────────────────────────────

async function doShopPhase(page, roundNum) {
  try {
    await page.waitForTimeout(300);

    const gold  = await getGold(page);
    const level = await getLevel(page);

    // Buy XP early in the season to unlock higher tiers
    if (gold >= 8 && level < 9 && roundNum <= 8) {
      await page.click('#btn-buy-xp').catch(() => {});
      await page.waitForTimeout(150);
    }

    // Buy all affordable shop players
    await buyAffordablePlayers(page);

    // Reroll once if we have 5+ gold
    const goldAfter = await getGold(page);
    if (goldAfter >= 5) {
      await page.click('#btn-reroll').catch(() => {});
      await page.waitForTimeout(200);
      await buyAffordablePlayers(page);
    }

    // Second reroll if very flush (late-game gold sink)
    const goldAfter2 = await getGold(page);
    if (goldAfter2 >= 8) {
      await page.click('#btn-reroll').catch(() => {});
      await page.waitForTimeout(200);
      await buyAffordablePlayers(page);
    }
  } catch (_) {
    // Non-fatal
  }
}

async function buyAffordablePlayers(page) {
  const buyBtns = await page.$$('#shop-slots .player-card:not(.empty) .btn-buy');
  for (const btn of buyBtns) {
    try {
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) continue;

      const btnText = await btn.textContent().catch(() => '99');
      const cost = parseInt(btnText.replace(/\D/g, '')) || 99;
      const currentGold = await getGold(page);

      if (currentGold >= cost && cost > 0 && cost < 50) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(200);
      }
    } catch (_) {}
  }
}

async function getGold(page) {
  return page.$eval('#header-gold', el => parseInt(el.textContent) || 0).catch(() => 0);
}

async function getLevel(page) {
  return page.$eval('#header-level', el => parseInt(el.textContent) || 1).catch(() => 1);
}

// ─── Batch Runner ─────────────────────────────────────────────────────────────

async function runBatch(browser, batchSize = 10) {
  const results = [];
  for (let i = 0; i < batchSize; i++) {
    process.stdout.write(`  Game ${i + 1}/${batchSize}... `);
    const result = await playOneGame(browser, i + 1);
    results.push(result);
    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else {
      console.log(
        `${result.wins}W/${result.losses}L, ` +
        `rounds:${result.roundsPlayed}, ` +
        `playoff:${result.madePlayoffs}, ` +
        `kills:${result.avgKills}, towers:${result.avgTowers}, ` +
        `drakes:${result.avgDragons}, barons:${result.avgBarons}`
      );
    }
  }
  return results;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeResults(results) {
  const valid = results.filter(r => !r.error && r.roundsPlayed >= 10);
  const n = valid.length;
  if (!n) return null;

  return {
    n,
    avgWins:      +(valid.reduce((a, r) => a + r.wins,        0) / n).toFixed(2),
    playoffRate:  +(valid.filter(r => r.madePlayoffs).length  / n * 100).toFixed(1),
    championRate: +(valid.filter(r => r.isChampion).length    / n * 100).toFixed(1),
    avgKills:     +(valid.reduce((a, r) => a + r.avgKills,    0) / n).toFixed(2),
    avgTowers:    +(valid.reduce((a, r) => a + r.avgTowers,   0) / n).toFixed(2),
    avgDragons:   +(valid.reduce((a, r) => a + r.avgDragons,  0) / n).toFixed(2),
    avgBarons:    +(valid.reduce((a, r) => a + r.avgBarons,   0) / n).toFixed(2),
  };
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const browser = await chromium.launch({ headless: true });
  const allLogs = [];

  const iterations = parseInt(process.env.ITERATIONS || '10');
  const batchSize  = parseInt(process.env.BATCH_SIZE  || '10');

  for (let iter = 1; iter <= iterations; iter++) {
    console.log(`\n=== ITERATION ${iter}/${iterations} ===`);
    const results  = await runBatch(browser, batchSize);
    const analysis = analyzeResults(results);

    if (!analysis) {
      console.log('No valid results this iteration, skipping.');
      continue;
    }

    console.log(
      `Summary: avgWins=${analysis.avgWins}/14, ` +
      `playoffs=${analysis.playoffRate}%, ` +
      `champion=${analysis.championRate}%, ` +
      `kills=${analysis.avgKills}, towers=${analysis.avgTowers}, ` +
      `drakes=${analysis.avgDragons}, barons=${analysis.avgBarons} ` +
      `(n=${analysis.n})`
    );

    allLogs.push({ iteration: iter, analysis, rawResults: results });
    console.log(`ADJUST:${JSON.stringify(analysis)}`);
  }

  await browser.close();

  console.log('\n=== DONE ===');
  console.log('FINAL_LOG:' + JSON.stringify(allLogs, null, 2));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
