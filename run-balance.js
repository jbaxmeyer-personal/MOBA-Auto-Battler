// run-balance.js — Orchestrates 10 balance iterations of Playwright playtests.
//
// Each iteration:
//   1. Runs playwright-playtest.js (10 games)
//   2. Parses ADJUST: lines from stdout
//   3. Applies targeted adjustments to nudge toward targets
//   4. Repeats
//
// Targets (calibrated for current tally-based simulation):
//   - Human avg wins: 6.5–7.5 / 14 (most important)
//   - Avg kills per round (both sides): 18–24
//   - Avg dragons per round: 3.0–4.0 (tally-based, 3–4 events)
//   - Avg barons per round: 0.8–1.4 (tally-based, 1–2 events)
//
// Balance levers available in current codebase:
//   - blueWinsEvent() factor: "diff * X" in simulation.js (controls how much
//     rating difference matters; lower = more random/50-50)
//   - Dragon d4 threshold: "adv > 20 && adv < 80" — controls when 4th dragon fires
//   - Baron 2nd threshold: "adv > 38 && adv < 62" — controls 2nd baron occurrence
//   - Tower t2 threshold: "adv > 58 || adv < 42" — controls 3rd tower occurrence
//   - TIER_ODDS level 3 T3% — controls shop quality for the bot strategy

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT        = __dirname;
const CONFIG_PATH = path.join(ROOT, 'js', 'data', 'config.js');
const SIM_PATH    = path.join(ROOT, 'js', 'game', 'simulation.js');

// Calibrated targets based on real pro LoL match data (2024–2026).
// Reference: FURIA vs C9, Americas Cup 2026 Finals G3 — 35:24, 35 kills, 12 towers, 5 dragons, 2 barons, 140k gold.
// Typical pro averages: duration 30-35 min, kills 26-32 total, towers 10-13, dragons 4-5, barons 1-2.
const TARGETS = {
  avgWins:    { lo: 6.5, hi: 7.5 },
  avgKills:   { lo: 26,  hi: 32  },  // real pro avg ~28-30 total both sides
  avgDragons: { lo: 4.0, hi: 5.0 },  // real pro avg ~4-5 total both sides
  avgBarons:  { lo: 1.0, hi: 2.0 },  // real pro avg ~1-2 total both sides
};

const changeLog = [];

// ─── File helpers ─────────────────────────────────────────────────────────────

function readFile(p)       { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, src) { fs.writeFileSync(p, src, 'utf8'); }

// ─── Balance adjusters ────────────────────────────────────────────────────────

/**
 * Adjust the blueWinsEvent scaling factor.
 * Formula: const raw = clamp(50 + diff * X, 15, 85)
 * X controls how much rating difference affects win chance.
 * Lower X = more random = smaller teams can beat better ones = helps weaker bot win more.
 * Higher X = skill gap matters more.
 *
 * When wins are LOW (< 6.5): decrease X to flatten outcomes (bot catches up to AI)
 * When wins are HIGH (> 7.5): increase X to make skill matter more
 */
function adjustWinFactor(analysis) {
  const src   = readFile(SIM_PATH);
  const match = src.match(/clamp\(50 \+ diff \* ([\d.]+),\s*15,\s*85\)/);
  if (!match) { console.log('  [balance] WARN: win factor pattern not found'); return; }

  let factor = parseFloat(match[1]);
  const avgWins = analysis.avgWins;

  if (avgWins >= TARGETS.avgWins.lo && avgWins <= TARGETS.avgWins.hi) return;

  // Too few wins → lower factor (flatten outcomes → bot wins more from luck)
  // Too many wins → raise factor (skill matters more → bot wins fewer against strong AI)
  const delta = avgWins < TARGETS.avgWins.lo ? -0.05 : 0.05;
  const newFactor = Math.round(
    Math.min(1.0, Math.max(0.2, factor + delta)) * 100
  ) / 100;

  if (newFactor === factor) return;

  const newSrc = src.replace(
    /clamp\(50 \+ diff \* [\d.]+,\s*15,\s*85\)/,
    `clamp(50 + diff * ${newFactor}, 15, 85)`
  );
  writeFile(SIM_PATH, newSrc);
  const msg = `Win factor: ${factor} → ${newFactor} [avgWins ${avgWins} → target 6.5-7.5]`;
  changeLog.push(msg);
  console.log(`  [balance] ${msg}`);
}

/**
 * Adjust the 4th dragon threshold.
 * Pattern: if (adv > X && adv < Y) { // dragon 4
 * Wider window = more 4th dragon fires = higher dragon avg
 * Narrower = fewer
 * Target: keep dragons in 3.0-4.0 range
 */
function adjustDragonThreshold(analysis) {
  const src   = readFile(SIM_PATH);
  // Match the d4 condition: if (adv > 20 && adv < 80) {
  const match = src.match(/if \(adv > (\d+) && adv < (\d+)\) \{ \/\/ only in non-stomp/);
  if (!match) {
    // Try alternate pattern
    const match2 = src.match(/if \(adv > (\d+) && adv < (\d+)\)/);
    if (!match2) { console.log('  [balance] WARN: d4 threshold pattern not found'); return; }
  }

  const m = src.match(/if \(adv > (\d+) && adv < (\d+)\)/);
  if (!m) return;

  let lo = parseInt(m[1]);
  let hi = parseInt(m[2]);
  const diff = analysis.avgDragons - 3.5; // aim for middle of range

  if (Math.abs(diff) < 0.3) return;

  // Too high → narrow window (raise lo or lower hi)
  // Too low → widen window
  if (diff > 0) {
    lo = Math.min(35, lo + 5);
    hi = Math.max(65, hi - 5);
  } else {
    lo = Math.max(10, lo - 5);
    hi = Math.min(90, hi + 5);
  }

  const newSrc = src.replace(
    /if \(adv > \d+ && adv < \d+\)/,
    `if (adv > ${lo} && adv < ${hi})`
  );
  writeFile(SIM_PATH, newSrc);
  const msg = `Dragon d4 threshold: >${m[1]}&&<${m[2]} → >${lo}&&<${hi} [avg drakes ${analysis.avgDragons} → target 3.0-4.0]`;
  changeLog.push(msg);
  console.log(`  [balance] ${msg}`);
}

/**
 * Adjust the 2nd baron threshold.
 * Pattern: if (adv > 38 && adv < 62) {  // second baron
 * Wider = more 2nd barons = higher baron avg
 */
function adjustBaronThreshold(analysis) {
  const src   = readFile(SIM_PATH);
  // Match: if (adv > 38 && adv < 62) — second baron
  // This is a different condition from d4 — need to find the second occurrence
  const matches = [...src.matchAll(/if \(adv > (\d+) && adv < (\d+)\)/g)];
  if (matches.length < 2) { console.log('  [balance] WARN: 2nd baron pattern not found'); return; }

  // The second one should be the baron threshold
  const m = matches[matches.length - 1];
  let lo = parseInt(m[1]);
  let hi = parseInt(m[2]);

  const diff = analysis.avgBarons - 1.1; // target center
  if (Math.abs(diff) < 0.2) return;

  if (diff > 0) {
    // Too many barons → narrow (less frequent 2nd baron)
    lo = Math.min(45, lo + 5);
    hi = Math.max(55, hi - 5);
  } else {
    // Too few → widen
    lo = Math.max(25, lo - 5);
    hi = Math.min(75, hi + 5);
  }

  // Replace only the last occurrence
  let newSrc = src;
  const lastIdx = src.lastIndexOf(m[0]);
  if (lastIdx === -1) return;

  newSrc = src.slice(0, lastIdx) +
    `if (adv > ${lo} && adv < ${hi})` +
    src.slice(lastIdx + m[0].length);

  writeFile(SIM_PATH, newSrc);
  const msg = `Baron 2nd threshold: >${m[1]}&&<${m[2]} → >${lo}&&<${hi} [avg barons ${analysis.avgBarons} → target 0.8-1.4]`;
  changeLog.push(msg);
  console.log(`  [balance] ${msg}`);
}

/**
 * Adjust shop tier odds at level 3.
 * This affects how good the human's shop is, but since our bot always buys
 * everything, we only use this as a secondary lever.
 * The primary target is avgWins — not adjusted here.
 */
function adjustTierOdds(analysis) {
  // Only apply when wins are very far off target AND win factor adjustment is maxed
  const src     = readFile(SIM_PATH);
  const match   = src.match(/clamp\(50 \+ diff \* ([\d.]+),\s*15,\s*85\)/);
  const factor  = match ? parseFloat(match[1]) : 0.5;

  const avgWins = analysis.avgWins;
  const isMaxed = factor <= 0.2 || factor >= 1.0;

  if (!isMaxed) return; // only adjust tier odds if win factor is at extremes

  const cfgSrc  = readFile(CONFIG_PATH);
  const m3      = cfgSrc.match(/(3:\s*\[)(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)(\])/);
  if (!m3) return;

  let [, prefix, t1, t2, t3, t4, t5, suffix] = m3;
  t1 = parseInt(t1); t2 = parseInt(t2); t3 = parseInt(t3); t4 = parseInt(t4); t5 = parseInt(t5);

  // Wins too low at max factor: improve shop (more T3 = better players)
  // Wins too high at min factor: weaken shop (more T1 = worse players)
  const delta = avgWins < TARGETS.avgWins.lo ? 3 : -3;
  t3 = Math.max(15, Math.min(55, t3 + delta));
  t1 = Math.max(5,  Math.min(50, t1 - delta));
  const total = t1 + t2 + t3 + t4 + t5;
  if (total !== 100) t2 = Math.max(0, t2 + (100 - total));

  const oldLine = m3[0];
  const newLine = `${prefix}${t1}, ${t2}, ${t3}, ${t4}, ${t5}${suffix}`;
  const newCfg  = cfgSrc.replace(oldLine, newLine);
  writeFile(CONFIG_PATH, newCfg);

  const msg = `Tier odds Lv3: T1:${m3[2]}→${t1}%, T3:${m3[4]}→${t3}% [avgWins ${avgWins} at maxed factor]`;
  changeLog.push(msg);
  console.log(`  [balance] ${msg}`);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

function runPlaytestIteration(iteration, totalIterations) {
  console.log(`\n=== RUNNING PLAYWRIGHT (iteration ${iteration}/${totalIterations}) ===`);
  const result = spawnSync(
    'node',
    ['playwright-playtest.js'],
    {
      cwd:     ROOT,
      timeout: 15 * 60 * 1000,
      env:     { ...process.env, ITERATIONS: '1', BATCH_SIZE: '10' },
      encoding: 'utf8',
    }
  );

  if (result.error) {
    console.error('Subprocess error:', result.error.message);
    return null;
  }

  const stdout = result.stdout || '';
  const lines  = stdout.split('\n');

  // Print all non-FINAL_LOG lines
  lines.filter(l => !l.startsWith('FINAL_LOG:')).forEach(l => {
    if (l.trim()) console.log(' |', l);
  });

  if (result.status !== 0) {
    console.error('stderr:', (result.stderr || '').slice(-1000));
  }

  const adjustLine = lines.find(l => l.startsWith('ADJUST:'));
  if (!adjustLine) { console.log('No ADJUST line found.'); return null; }

  try {
    return JSON.parse(adjustLine.slice('ADJUST:'.length));
  } catch (e) {
    console.error('Failed to parse ADJUST:', e.message);
    return null;
  }
}

function applyAdjustments(analysis, iteration) {
  console.log(`\n--- Balance adjustments after iteration ${iteration} ---`);
  console.log(`  Wins:${analysis.avgWins}/14, kills:${analysis.avgKills}, drakes:${analysis.avgDragons}, barons:${analysis.avgBarons}`);

  const prevLen = changeLog.length;

  adjustWinFactor(analysis);
  adjustDragonThreshold(analysis);
  adjustBaronThreshold(analysis);
  adjustTierOdds(analysis);

  if (changeLog.length === prevLen) {
    console.log('  All stats within targets — no adjustments needed.');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const TOTAL_ITERS = 10;
  console.log(`=== RUN-BALANCE.JS: ${TOTAL_ITERS} iterations × 10 games = ${TOTAL_ITERS * 10} total playtests ===`);
  console.log(`Config: ${CONFIG_PATH}`);
  console.log(`Sim:    ${SIM_PATH}`);
  console.log('Targets:', JSON.stringify(TARGETS));

  const iterationResults = [];

  for (let iter = 1; iter <= TOTAL_ITERS; iter++) {
    const analysis = runPlaytestIteration(iter, TOTAL_ITERS);
    if (!analysis) {
      console.log(`Iteration ${iter}: no data, skipping adjustments.`);
      iterationResults.push({ iteration: iter, analysis: null, error: true });
      continue;
    }

    iterationResults.push({ iteration: iter, analysis });

    if (iter < TOTAL_ITERS) {
      applyAdjustments(analysis, iter);
    }
    console.log('');
  }

  // ── Final report ──
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     BALANCE SESSION COMPLETE            ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('Iteration summaries:');
  iterationResults.forEach(({ iteration, analysis, error }) => {
    if (error || !analysis) {
      console.log(`  Iter ${iteration}: ERROR`);
    } else {
      console.log(
        `  Iter ${iteration}: ${analysis.avgWins}W/14, ` +
        `kills:${analysis.avgKills}, drakes:${analysis.avgDragons}, barons:${analysis.avgBarons}`
      );
    }
  });

  console.log('\nAll balance changes made:');
  changeLog.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  if (!changeLog.length) console.log('  (none — all stats within targets from start)');

  const lastValid = iterationResults.filter(r => r.analysis).pop();
  const summary = {
    completedAt: new Date().toISOString(),
    totalIterations: iterationResults.length,
    validIterations: iterationResults.filter(r => !r.error).length,
    totalGames: iterationResults.filter(r => !r.error).length * 10,
    targets: TARGETS,
    finalStats: lastValid?.analysis || null,
    changes: changeLog,
    iterations: iterationResults.map(r => ({
      iteration: r.iteration,
      analysis: r.analysis,
      error: r.error || false
    })),
  };

  fs.writeFileSync(path.join(ROOT, 'balance-results.json'), JSON.stringify(summary, null, 2));
  console.log('\nResults saved to balance-results.json');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
