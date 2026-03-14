# MOBA Manager — Master Plan
> The Ancient Grove esports management sim. FM meets a custom MOBA.
> Updated: March 2026

---

## Project Status Snapshot

| Layer | Status | Notes |
|---|---|---|
| FM Shell (HTML/CSS/UI) | Partially done | LoL-themed, Task #3 in progress |
| Sim Engine | Done (LoL) | simulation.js v4, 1737 lines — needs full rewrite for TAG |
| Data Layer | Done (LoL) | teams.js, players.js, champions.js — all need replacing |
| Map Visualization | Done (LoL) | map.js draws LoL map — needs hex map rewrite |
| Draft System | Done (LoL) | champion pool logic — needs updating for TAG |
| Management Depth | Not started | Training, personality, transfers, scouting |
| Career Structure | Partial | 1 region, 9-week Spring split only |
| Save / Load | Not started | localStorage |

**TAG = The Ancient Grove** (our custom MOBA)

---

## Roadmap Overview

```
Phase 1 → Data Layer Pivot       (replace all LoL data with TAG data)
Phase 2 → FM Shell Completion    (finish the UI using TAG data)
Phase 3 → Hex Map                (replace LoL map with TAG hex map)
Phase 4 → Sim Engine Rewrite     (rebuild around TAG mechanics)
Phase 5 → Draft System           (TAG champion select + synergies)
Phase 6 → Management Depth       (training, personality, transfers)
Phase 7 → Career Structure       (full season, playoffs, save/load)
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

## Phase 2 — FM Shell Completion
**Goal:** Get a working, playable FM shell using TAG data (no LoL references anywhere).
**Files:** `css/style.css`, `js/ui.js`, `js/main.js`
**Status:** [ ] Not started (Task #3 from TASKS.md, reframed for TAG)

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
**Status:** [ ] Not started

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
**Status:** [ ] Not started

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

---

## Phase 7 — Career Structure
**Goal:** Full multi-season career loop.
**Status:** [ ] Partial (1 region, Spring split only)

### 7A — Verdant League (full structure)
- 8 teams, 7-week round-robin (each plays every other team once)
- Top 4 → playoffs (semi-finals + final)
- Spring split + Summer split per year
- Season 1 only for prototype; expand later

### 7B — International Event
- **Grove Championship** (like Worlds): top 2 from Spring + top 2 from Summer
- Short tournament, high prestige
- Opponent teams are stronger overall (from other regions — can be blank stat blocks for now)

### 7C — Multi-Season Progression
- After Season 1 ends: offseason phase
- Contract expiry, transfers, training recap
- Player aging (birthday ticks)
- New season starts

### 7D — Save / Load
- `localStorage.setItem('moba-manager-save', JSON.stringify(G))`
- Auto-save on every advanceWeek
- Load on page open if save exists
- Manual save button in settings panel

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

### What to Build First
Order of priority given the goal of a **killer lean prototype**:
1. Phase 1 (data) — can't do anything without TAG data
2. Phase 2 (FM shell) — need a working game to validate the fun loop
3. Phase 4 (sim engine) — the heart of the game; this is the differentiator
4. Phase 3 (hex map) — visual; can have placeholder until Phase 4 is done
5. Phase 5 (draft) — makes Phase 4 decisions matter
6. Phase 6 (management) — the FM layer; adds depth
7. Phase 7 (career) — replay value
8. Phase 8 (polish) — final quality pass

### Key Design Principles
- **Stat impact must be legible**: every player stat should have a named, visible effect in the sim
- **Draft decisions matter**: wrong class composition should visibly struggle at boss fight
- **Tactical directives work**: each playstyle should produce a noticeably different match narrative
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
