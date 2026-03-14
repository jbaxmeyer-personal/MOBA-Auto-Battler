# MOBA Manager — Master Plan
> The Ancient Grove esports management sim. FM meets a custom MOBA.
> Updated: March 2026

---

## Project Status Snapshot

| Layer | Status | Notes |
|---|---|---|
| FM Shell (HTML/CSS/UI) | ✅ Done | Full TAG shell — Phase 2 complete |
| Sim Engine | ✅ Done | Stat-driven FM engine complete — Phase 4 done |
| Data Layer | ✅ Done | 30 TAG champs, 8 VL teams, 45 players — Phase 1 complete |
| Map Visualization | ⚠️ Placeholder | Current LoL-style SVG; hex map rewrite is Phase 3 |
| Draft System | ✅ Done | Smart ban/pick + class counters + UI — Phase 5 done |
| Series Format | ❌ Not started | Currently single-game; BO3/BO5 is Phase 7 |
| Management Depth | ❌ Not started | Training, personality, transfers, finances, fans — Phase 6 |
| Career Structure | ⚠️ Partial | 1 region, 7-week Spring split, no playoffs — Phase 7 |
| Save / Load | ❌ Not started | localStorage — Phase 7 |

**TAG = The Ancient Grove** (our custom MOBA)

---

## Roadmap Overview

```
Phase 1 → Data Layer Pivot       (replace all LoL data with TAG data)           ✅ DONE
Phase 2 → FM Shell Completion    (finish the UI using TAG data)                  ✅ DONE
Phase 3 → Hex Map                (replace LoL map with TAG hex map)
Phase 4 → Sim Engine Rewrite     (rebuild around TAG mechanics)          ✅ DONE
Phase 5 → Draft System           (TAG champion select + synergies)        ✅ DONE
Phase 6 → Management Depth       (training, personality, transfers, finances, fans)
Phase 7 → Career Structure       (BO3/BO5 series, full playoffs, multi-season, save/load)
Phase 8 → Balance & Polish       (meta system, UI polish, playtesting)
```

Each phase is designed to be completable in 1–2 sessions. Earlier phases are prerequisites for later ones.

---

## Phase 1 — Data Layer Pivot ✅ DONE
**Goal:** Replace all LoL-specific data with The Ancient Grove equivalents.
**Files:** `js/data/champions.js`, `js/data/teams.js`, `js/data/players.js`
**Status:** [x] Complete — commit cf34ab1

**Status: COMPLETE ✓** — committed cf34ab1

### 1A — Champions (champions.js)
Replace the LoL champion pool with ~30 original TAG champions.

Each champion needs:
- `id`, `name`, `class` (Fighter/Tank/Assassin/Mage/Marksman/Sentinel)
- `preferredRoles[]` — which positions they fit (vanguard/ranger/arcanist/hunter/warden)
- `abilities[]` — 2 base abilities + 1 ultimate (name + short description)
- `difficulty` — 1/2/3 (affects AI decision quality at low stats)
- `tags[]` — e.g. ['engage','poke','burst','peel','split'] for draft logic

Target champion count: 30 at launch (can grow)
Aim for: 6 Fighters, 4 Tanks, 5 Assassins, 6 Mages, 5 Marksmen, 4 Sentinels

### 1B — Teams (teams.js)
Replace 10 LCS teams with 8 fictional TAG esports orgs. One region: **The Verdant League**.

Each team needs:
- `id`, `name`, `shortName`, `color`, `region: 'VL'`
- `prestige` (1-10), `budget` ($)
- `playstyle` — default tactic
- `homeArena` — flavor name

### 1C — Players (players.js)
Replace real LoL player names with ~40 fictional players.

Keep FM 12-attribute schema. Update:
- `position` field: `'vanguard'|'ranger'|'arcanist'|'hunter'|'warden'` (replacing top/jungle/mid/adc/support)
- `championPool[]` — TAG champion IDs they can play

### 1D — Update Constants
- Replace `POSITIONS = ['top','jungle','mid','adc','support']` with `['vanguard','ranger','arcanist','hunter','warden']`
- Update all references to position strings across state.js, simulation.js, ui.js

---

## Phase 2 — FM Shell Completion ✅ DONE
**Goal:** Get a working, playable FM shell using TAG data (no LoL references anywhere).
**Files:** `css/style.css`, `js/ui.js`, `js/main.js`, `js/game/simulation.js`, `js/ui/map.js`, `index.html`
**Status:** [x] Complete

This is largely the same as TASKS.md Task #3 but with TAG data. Key difference: all position labels, champion names, team names must reference TAG, not LoL.

### 2A — css/style.css
Full FM-style stylesheet. Keep existing match/PBP/map/draft styles. Add:
- Intro screen, top bar, sidebar, panels
- Dashboard, squad, player profile, tactics
- Transfers, finances, schedule, league

### 2B — js/ui.js (rewrite)
All render functions. See TASKS.md Task #3 Step 2 for full spec.
TAG-specific changes:
- Position labels use vanguard/ranger/arcanist/hunter/warden
- No LoL champion names anywhere

### 2C — js/main.js (rewrite)
Full game loop event handlers. See TASKS.md Task #3 Step 3 for full spec.

### 2D — Smoke Test
Intro → pick team → advance weeks → play match (even with old sim) → no console errors.

---

## Phase 3 — Hex Map Visualization
**Goal:** Replace the LoL map (map.js) with a TAG hexagonal map.
**Files:** `js/ui/map.js` (full rewrite)
**Status:** [ ] Not started

### Map Design
Hexagon oriented point-to-point (like a diamond). Blue base at bottom-left point, Red base at top-right point.

Key positions to draw:
- Hex boundary (6 sides)
- Blue base, Red base
- 3 lanes: Top (left edge), Mid (center diagonal), Bot (right edge)
- Jungle zones: North (between Top and Mid), South (between Mid and Bot)
- Ancient Roots positions: Outer (×3), Inner (×3), Heart Root (×3)
- Ley Shrine positions: North Shrine, South Shrine, Crossing Shrine (center)
- Grove Warden spawn (center)

### Animation
Keep the same event-driven API as current map.js:
- `initMapVisualization()` — draw static map, place 10 player dots
- `updateMap(ev)` — move dots based on ev.type and ev.positions
- `setMapSkipMode(bool)` — for instant sim

TAG-specific map events to visualize:
- Players fighting near shrines
- Warden contest (all 5 players converge on center)
- Pushing roots (players cluster near root positions)
- Boss fight (all players at enemy base)

---

## Phase 4 — Sim Engine Rewrite
**Goal:** Rebuild simulation.js from scratch around TAG mechanics. This is the highest-priority quality work.
**Files:** `js/game/simulation.js` (full rewrite)
**Status:** ✅ Complete (4A–4E implemented)

This is the core of the game. The engine must make **stat impact legible** — the community's #1 complaint about TFM2.

### 4A — Match State Model
Track per-match state:
```js
matchState = {
  phase: 'seedling'|'growth'|'bloom',  // 0-10min, 10-20min, 20+min
  time: 0,                              // in minutes
  blue: {
    kills: 0, gold: 0,
    shrineStacks: 0,                    // Verdant Blessings count (0-3)
    rootsDestroyed: 0,                  // Heart Roots cleared (0-3), reduces boss armor
    wardenKills: 0,
    hasWardenBuff: false,
    outerRootsDown: [false,false,false], // per lane
    innerRootsDown: [false,false,false],
    heartRootsDown: [false,false,false],
  },
  red: { ...same... },
  shrines: [
    { id:'north', controller:null, respawnAt:null },
    { id:'south', controller:null, respawnAt:null },
    { id:'crossing', controller:null, respawnAt:null },
  ],
  wardenSpawnTime: 12,
  wardenAlive: false,
}
```

### 4B — Player Power Calculation
Each player's contribution derived from their stats + role context.
```
playerPower = weighted average of relevant attributes (1-20 scale)
  → mapped to action success probability
  → stat 20 = elite performance, stat 1 = near-random decisions
```

Make the link explicit: high Communication = better shrine coordination; high Game Sense = better Warden timing; high TF Positioning = survives Corrupted Ancient abilities.

### 4C — Phase Logic

**Seedling (0-10 min):**
- Players farm; Ranger clears jungle camps
- First shrine contests (North, South)
- Outer Roots take early poke damage
- Events: First Blood, early skirmishes, shrine captures

**Growth (10-20 min):**
- Grove Warden spawns at 12:00 — teams contest
- Team fights over shrines and Inner Roots
- Warden's Grasp buff impacts minion waves
- Verdant Blessings stacks start to matter
- Events: Warden kill, shrine steals, Inner Root falls, team fights

**Bloom (20+ min):**
- Heart Roots contested — each one reduces boss armor
- Corrupted Ancient becomes targetable once team reaches base
- Boss fight sequence: tank absorbs Root Slam, healer counters Poison Breath DoT, DPS races against Enrage
- Events: Heart Root falls, boss engage, Enrage trigger, game end

### 4D — Corrupted Ancient Boss Fight
Model the final fight as a mini-sequence:
```
bossHP = 100
bossArmor = 30 - (10 * heartRootsCleared)   // 0 to 30% damage reduction

// Each tick: team DPS vs boss HP
teamDPS = sum(player damage outputs) * (1 - bossArmor/100)

// Boss attacks back:
// - Root Slam: requires tank to absorb; if no tank → AoE damage kills low-HP players
// - Poison Breath: requires healer; if no healer → DoT stacks kill players over time
// - Vine Lash: targets lowest-HP player; if no peel → that player dies
// At 50% HP: Enrage — boss DPS doubles, spawns 2 Wraiths (adds extra damage)
```

The composition requirement makes **draft decisions visible**: a team with no tank risks wipeout at Root Slam. Log these as play-by-play events.

### 4E — Tactical Directives
6 playstyles must have visible, distinct sim effects:
- **Engage** — prioritizes Warden early, aggressive shrine contests; higher kill upside/downside
- **Poke** — chip Roots before fighting; higher structure damage, lower kill count
- **Pick** — targets isolated enemies at shrines; high single picks, lower team fights
- **Protect** — stacks Warden/support near carry; resilient in boss fight, slower objective pace
- **Split** — side-lane Root pressure while others contest shrines; requires high Vanguard stats
- **Scaling** — avoids early Warden, stacks Verdant Blessings; dominant in Bloom phase if survived

### 4F — PBP Events
Rich event types for play-by-play display. Each event has:
- `type`, `time`, `description` (narrative text), `positions` (for map)

Event types:
```
kill, firstBlood, teamFight, shrineCapture, shrineStolen,
wardenSpawn, wardenContest, wardenKilled, wardenStolen,
outerRootFall, innerRootFall, heartRootFall,
bossEngage, rootSlam, poisonBreath, vineLash, enrage,
bossKill (game end)
```

---

## Phase 5 — Draft System
**Goal:** TAG-accurate champion select with ban/pick, synergies, and counters.
**Files:** `js/game/simulation.js` (draftChampions function), `js/ui.js` (renderMatchDraft)
**Status:** ✅ Complete (5A–5D implemented)

### 5A — Draft Logic
- 5 bans per side (10 total), then 10 picks alternating
- Champion pool filtered by player's `championPool[]` and position compatibility
- Draft AI considers: team playstyle, counter-picking opponent's picks, synergies

### 5B — Synergy System
Team compositions get bonuses:
- **Full Engage**: 2+ Tank/Fighter → bonus initiation success rate
- **Poke Comp**: 3+ ranged → bonus Root damage
- **Dive Assassin**: 2+ Assassins → bonus pick success on isolated targets
- **Protect the Carry**: 2+ Sentinel → boss fight survivability bonus
- **Balanced**: 1 of each class → no bonus but no penalty

### 5C — Counter System
Some champion classes hard-counter others (affects fight outcome modifier):
- Tank counters Assassin (can absorb burst)
- Mage counters Fighter (kite)
- Marksman counters Tank (outranges)
- Assassin counters Mage/Marksman (burst before they act)

---

## Phase 6 — Management Depth
**Goal:** The FM layer — what you actually do between matches.
**Status:** [ ] Not started

### 6A — Training System
Weekly training choices (pick one per week):
- **Scrimmage** — play internal practice match → team attributes improve slightly for all 5
- **Solo Queue** → individual player's Mechanics/Decision Making improve
- **Film Study** → Game Sense and Adaptability improve for all
- **Rest** → morale +, fatigue -
- **Streaming** → fans increase, minor morale boost

### 6B — Player Development
- Players under 22: attributes can improve weekly (especially with training)
- Players over 28: attributes can decline (1-in-4 chance per season end)
- Potential stat (hidden, 1-20): caps how high a young player can grow
- Form stat (visible): recent performance modifier (rises/falls with results)

### 6C — Personality System
Each player has a personality type affecting team dynamics:
- **Leader** — boosts Communication of nearby players; leadership bonuses
- **Maverick** — high individual skill ceiling but clashes with team tactics
- **Grinder** — improves faster through training; never declines
- **Volatile** — bigger performance swings; great highs, bad lows under pressure
- **Pro** — consistent, never tilts; costs more in transfers

Personality affects: training gains, morale events, locker room chemistry, performance under pressure.

### 6D — Morale & Chemistry
- Individual morale (1-10): affected by results, play time, salary vs market value
- Team chemistry (1-10): average morale + personality compatibility bonus
- Low chemistry → Communication stat debuff in sim
- News feed events: "Player X is unhappy about reduced role"

### 6E — Transfer Market
- Pre-season and mid-season transfer windows
- Free agents: pool of uncontracted players
- Contract negotiation: salary ask, years, bonus clauses
- Budget check before signing
- Release players: pay termination fee

### 6F — Scouting
- Scout reports reveal hidden players (obscure/young talent)
- Scouting takes 1-2 weeks, costs budget
- Reports show: position, overall range (not exact), age, personality hint
- Unlock full profile after scouting

### 6G — Financials
The finances panel is the economic backbone of the career. It should feel like FM's boardroom — legible, consequential, and slightly stressful.

**Budget model:**
- Each team starts with a fixed budget (set in teams.js, e.g. $4.2M for top-tier teams)
- Budget is a running balance, not a per-week allowance — every transaction hits it directly
- Weekly expenses deducted automatically on each `advanceWeek`: player wages + staff costs
- Weekly income added automatically: base sponsor income + any earned bonuses

**Sponsor system:**
- Each team has 1–3 active sponsors, each with:
  - `name` — flavor (e.g. "Sylvane Energy Drinks", "GroveTech Gaming Peripherals")
  - `weeklyIncome` — base payout every week (e.g. $50K–$200K/wk depending on team prestige)
  - `bonuses[]` — milestone rewards, paid once when the condition is met:
    - Reach X fans (e.g. 500K fans → +$250K)
    - Win X matches in a split (e.g. 5 wins → +$150K)
    - Reach the playoffs → +$300K
    - Win the championship → +$500K
- Sponsor quality scales with team prestige — higher-prestige teams attract better sponsors
- New sponsors can be negotiated during the offseason (Phase 7)

**Finance panel UI (FM-style):**
- Top summary: current budget, projected end-of-split balance (budget + expected income - expected wages for remaining weeks)
- Weekly breakdown table: Week | Wages Out | Sponsor In | Bonuses | Net | Running Balance
- Color-coded net column: green (positive), red (negative)
- Sponsor card list: each sponsor's name, weekly rate, and bonus milestones with progress bars

**Financial risk:**
- If budget drops below $0: "Financial Crisis" news event fires, transfer signings locked until positive
- If budget drops below -$500K: "Board Warning" event — manager reputation takes a hit (Phase 7)
- Smart budget management is a core skill, especially early career on low-prestige teams

### 6H — Fans
Fans are the second major resource, alongside budget. They represent your team's cultural footprint in the Verdant League and directly gate the quality of sponsors you can attract.

**Fan model:**
- Each team starts with a base fancount (set in teams.js, e.g. 1.05M for Verdant Spire)
- Updated every week based on results and activities
- Displayed in the top bar alongside budget

**Passive weekly changes (automatic):**
- Win a series: +1–3% fan growth (scales with opponent prestige — beating a top team is worth more)
- Lose a series: -0.5–1% fan loss (smaller than win gain — fans are slow to leave)
- Split win / draw in BO3 (1–1): +0.2% (partial credit)
- Streaming activity (set in training menu): +0.5–1% flat per week

**Active fan-growth actions (player-chosen, costs time and/or money):**
These compete with training time — choosing one means not choosing rest or a training focus.

| Action | Fan Gain | Budget Cost | Training Impact |
|---|---|---|---|
| **Streaming Session** | +0.5–1% | Free | Uses "Training" slot for 1 player |
| **Fan Meet & Greet** | +2–4% | $20–50K | No training for whole squad that week |
| **Arena Fan Event** | +4–8% | $75–150K | No training for whole squad that week |
| **Regional Road Show** | +10–18% | $200–400K | No training for 2 weeks (recovery week follows) |

- Fan events and road shows must be confirmed before the week advances — they are a weekly decision
- The road show's 2-week training freeze makes it risky mid-season; best used in offseason

**Fan milestones:**
Crossing fan thresholds unlocks tangible benefits:
- 100K fans: eligible for first mid-tier sponsor
- 250K fans: unlock Arena Fan Event action
- 500K fans: bonus sponsor milestone threshold (common target)
- 1M fans: top-tier sponsor eligible; regional celebrity status (morale bonus)
- 2M fans: national celebrity; second top-tier sponsor slot unlocks
- 5M fans: legendary status; championship pressure increases (fans expect wins)

**Fan panel UI:**
- Top stat: total fans with weekly change indicator (e.g. "+48K this week")
- Weekly trend chart: sparkline of last 8 weeks' fan count
- Active actions panel: buttons for each fan-growth action with cost and projected gain shown
- Milestone tracker: progress bars toward next fan threshold with the reward labeled

---

## Phase 7 — Career Structure
**Goal:** Full multi-season career loop with proper esports series format.
**Status:** [ ] Not started (current code plays single games only)

### 7A — Series Format
The Verdant League uses the standard competitive esports format: every scheduled match is a series, not a single game. This is the single biggest structural change from Phase 2.

**Regular Season — Best of 3 (BO3):**
- Each week's matchup is a 3-game series. First to 2 wins takes the series.
- Series result (2-0 or 2-1) determines standings points: 3 points for a series win, 0 for a series loss.
- Game 2 is always played. Game 3 is only played if each team won one game (1-1 after Game 2).
- Between games, the manager may adjust tactics — opponent also adapts (AI scouting logic).

**Playoffs — Best of 5 (BO5):**
- Top 4 teams from regular season advance to single-elimination playoffs.
- Semi-finals: 1st vs 4th seed, 2nd vs 3rd seed — all BO5.
- Final: winners of both semi-finals — BO5.
- Same between-game tactic adjustment system, but opponent adaptation is stronger.

**How a series plays out (game flow):**
```
Series Start → Game 1 Draft → Watch/Skip Game 1 → [Tactic Adjust] →
  If 1-0: Game 2 Draft → Watch/Skip Game 2 → Series over (2-0)
  If 0-1: Game 2 Draft → Watch/Skip Game 2 → [Tactic Adjust] →
    If 1-1: Game 3 Draft → Watch/Skip Game 3 → Series over (2-1)
```
- Each game has its own draft — opponent bans and picks can shift between games
- After a loss, the manager sees a brief "halftime" screen showing what went wrong (e.g. "Opponent countered your comp in Game 1 — adjust tactics?")
- The tactic adjust screen shows: current playstyle, opponent's last-game playstyle, and a suggestion based on your roster's strengths

**Between-game adaptation (AI):**
- If AI lost a game, it has a 60% chance to switch playstyle to a counter
- If AI won, it keeps the same playstyle
- If AI won a game with a specific champion comp, it's more likely to repeat that draft

**State tracking per series:**
```js
series = {
  homeId, awayId,
  week, isPlayoffs, format: 'bo3' | 'bo5',
  games: [],           // array of { winner, blueKills, redKills, duration, events }
  blueWins: 0,
  redWins: 0,
  status: 'in_progress' | 'complete',
  winnerId: null,
}
```

### 7B — Verdant League (full structure)
- 8 teams, 7-week round-robin: each team plays every other team exactly once as a BO3 series
- Standings: series wins (W) and series losses (L), 3 points per series win
- Tiebreaker: head-to-head series result → game win differential → total kills
- Top 4 → playoffs: semi-finals (BO5) + final (BO5)
- Spring split + Summer split per year (same 7-week format each)
- Spring winner + Summer winner get automatic Grove Championship berths

### 7C — International Event — Grove Championship
- **Grove Championship** (like Worlds): 4 teams total — Spring winner, Summer winner, and 2 wildcard teams (best overall record not already qualified)
- Single-elimination format: semi-finals (BO5) + final (BO5)
- Opponent teams from "other regions" — stat-generated squads with higher overall ratings than Verdant League average (no named teams needed yet)
- Winning the Grove Championship is the ultimate career milestone

### 7D — Multi-Season Progression
- After Spring playoffs: short offseason (2 weeks) — transfers, contract renewals, training recap
- Summer split begins after offseason
- After Summer playoffs + Grove Championship: full offseason (4 weeks)
- Player aging: each full year adds 1 to age; attributes may decline for veterans
- Player growth: young players (under 22) who played regularly can gain attributes in offseason
- News recap at season end: top performers, team of the split, your record vs goals

### 7E — Save / Load
- Auto-save to `localStorage` on every `advanceWeek` call
- On page load: if save exists, show "Continue Career" button alongside "New Career"
- Manual save slot in a Settings panel (accessible from sidebar)
- Export/import save as JSON (copy-paste) for backup
- `localStorage` key: `'grove-manager-save-v1'` (versioned to allow save format migrations)

---

## Phase 8 — Balance & Polish
**Goal:** Make it feel like a complete, fun game.
**Status:** [ ] Not started

### 8A — Meta System (Patches)
- Champion win rates tracked across all simulated matches
- Every 3-4 weeks: a "patch" fires
  - Overbuffed champions get nerfed (lower base win contribution)
  - Underplayed champions get buffed
  - Generates news item: "Patch 1.3 nerfs [Champion X]"
- Players with high Adaptability adjust faster to patches

### 8B — Rival System
- Each team has a designated rival (e.g., #1 vs #2 seed)
- Rival matches generate extra news, higher fan impact on result

### 8C — UI Polish
- Consistent color scheme (forest greens, stone greys, gold accents)
- Champion portrait placeholders (colored icons by class)
- Better match result screen (detailed scoreboard)
- News feed richness (more event variety)

### 8D — Playtest & Balance
- Run 50 simulated seasons, check: win rate distribution, shrine/Warden contest rate, boss kill timing
- Tune: boss armor values, shrine respawn timing, Warden buff duration
- Player stat impact test: max-stat team vs min-stat team → target 85-90% win rate (stat matters but not deterministic)

---

## Implementation Notes

### What to Build Next
Phases 1 and 2 are complete. Recommended order for remaining phases:
1. **Phase 4** (sim engine) — the heart of the game; this is the differentiator vs TFM2
2. **Phase 3** (hex map) — visual identity; can follow Phase 4 since the sim drives map events
3. **Phase 5** (draft system) — makes Phase 4 decisions matter; ban/pick adds strategy
4. **Phase 6** (management depth) — the FM layer; training, finances, fans, transfers
5. **Phase 7** (career structure) — BO3/BO5 series format is the biggest structural change; do after sim is solid
6. **Phase 8** (polish) — final quality pass before sharing/releasing

### Key Design Principles
- **Stat impact must be legible**: every player stat should have a named, visible effect in the sim
- **Draft decisions matter**: wrong class composition should visibly struggle at boss fight
- **Tactical directives work**: each playstyle should produce a noticeably different match narrative
- **Series format is the esports feel**: BO3/BO5 with between-game adaptation is what separates this from a random simulator
- **Fans and finances are interlinked**: fan growth unlocks better sponsors; better sponsors fund better players; budget mismanagement should feel painful
- **Lean first**: one region, one league, ~30 champions, ~40 players is enough for a prototype

### File Architecture (target state)
```
index.html
css/
  style.css
js/
  data/
    teams.js      — 8 Verdant League teams (no LoL)
    players.js    — 40 fictional players, TAG positions
    champions.js  — 30 TAG champions with classes + abilities
  game/
    state.js      — G state (update position strings to TAG)
    simulation.js — TAG sim engine (full rewrite, Phase 4)
  ui/
    map.js        — Hex map visualization (rewrite, Phase 3)
  ui.js           — FM render functions (TAG data)
  main.js         — Game loop
THE_ANCIENT_GROVE.md  — MOBA design doc (source of truth)
PLAN.md               — This file
GAME_DESIGN.md        — Management game design (update to remove LoL refs)
```

---

## Session Log

| Date | Session | Work Done |
|---|---|---|
| 2026-03-14 | #1 | Researched TFM2, designed TAG MOBA, wrote PLAN.md + THE_ANCIENT_GROVE.md |
| 2026-03-14 | #2 | **Phase 1 complete** — champions.js (30 TAG champs), teams.js (8 VL teams), players.js (45 players), state.js (POSITIONS/names/weeks updated). Validated: all positions covered, all champion refs valid, overall range 43–85. |
| 2026-03-14 | #3 | **Phase 2 complete** — Full FM shell. index.html (titles/SVG/score labels updated), css/style.css (FM layout appended), js/ui.js (all render fns: dashboard, squad, player profile, tactics, transfers, finances, league, schedule, draft), js/main.js (game loop: team select, advance week, play/skip match, PBP, return from match), js/game/simulation.js (TAG Phase 2 sim engine), js/ui/map.js (position names updated to TAG). Full game loop playable: intro → team select → dashboard → advance week → play match → PBP → result → back to dashboard. |
