# MOBA Manager — Master Plan
> The Ancient Grove esports management sim. FM meets a custom MOBA.
> Updated: March 2026

---

## Project Status Snapshot

**TAG = The Ancient Grove** (our custom MOBA) · Phases 1–9 + 11 complete.

### What's left to do

| Area | Notes |
|---|---|
| Balance & Polish (Phase 8) | Meta system, UI polish, playtesting — not started |
| Visual Identity (Phase 10) | Pixel-art sprites on map; long-term: isometric PixiJS view |
| ~~Phase 12A — Scouting Depth~~ | ✅ DONE |
| ~~Phase 12B — AI Manager Behaviour~~ | ✅ DONE |
| Phase 12C — Contract Negotiations | Counter-offers, player rejection, bidding wars |
| Phase 12D — Transfer Market | Transfer fees, CPU team transactions, transfer listing, loans |
| Phase 12E — Fan Events Cooldown UX | 8-week event calendar timeline in Fans panel |
| Phase 12F — Team Housing | New facility tier (Apartment → Gaming House) with morale/chemistry/FES bonuses |
| Balance & Polish (Phase 8) | Meta system, UI polish, playtesting — not started |
| Visual Identity (Phase 10) | Pixel-art sprites on map; long-term: isometric PixiJS view |

---

## Roadmap Overview

```
Phase 1 → Data Layer Pivot       (replace all LoL data with TAG data)                    ✅ DONE
Phase 2 → FM Shell Completion    (finish the UI using TAG data)                           ✅ DONE
Phase 3 → Hex Map                (replace LoL map with TAG hex map)                  ✅ DONE
Phase 4 → Sim Engine Rewrite     (rebuild around TAG mechanics)                   ✅ DONE
Phase 5 → Draft System           (TAG champion select + synergies)                ✅ DONE
Phase 6E → Engine Rewrite v2     (REAL agent simulation — positions, HP, items)  ✅ DONE
Phase 6 → Management Depth       (training, development, finances, fans)          ✅ DONE
Phase 7 → Career Structure       (BO3/BO5 series, full playoffs, multi-season, save/load)   ✅ DONE
Phase 8 → Balance & Polish       (meta system, UI polish, playtesting)
Phase 9 → Management Hub         (News, Coaching Staff, Streaming, Facilities, Team Info, Champ Info, Item Info, Statistics, Manager Traits)  ✅ DONE
Phase 11 → Management Depth v2   (Fans/FES, Staff overhaul, Facilities queue, Multi-role champs, Tactics phase)  ✅ DONE
Phase 12 → Depth & Realism       (Scouting, AI managers, Contracts, Transfers, Fan calendar, Team Housing)
Phase 10 → Visual Identity       (pixel-art 2D sprites → long-term: isometric view with PixiJS)
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

## Phase 3 — Hex Map Visualization ✅ DONE
**Goal:** Replace the LoL map (map.js) with a TAG hexagonal map.
**Files:** `index.html` (SVG artwork rewrite)
**Status:** [x] Complete

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
**Status:** ✅ Fully Complete

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

### 6C — Personality System ✅ DONE
Each player has a personality type affecting team dynamics:
- **Leader** — boosts Communication of nearby players; leadership bonuses
- **Maverick** — high individual skill ceiling but clashes with team tactics
- **Grinder** — improves faster through training; never declines
- **Volatile** — bigger performance swings; great highs, bad lows under pressure
- **Pro** — consistent, never tilts; costs more in transfers

Personality affects: training gains, morale events, locker room chemistry, performance under pressure.

### 6D — Morale & Chemistry ✅ DONE
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

### 6F — Scouting ✅ DONE
- Scout reports reveal hidden players (obscure/young talent)
- Scouting takes 1-2 weeks, costs budget
- Reports show: position, overall range (not exact), age, personality hint
- Unlock full profile after scouting

### 6G — Financials ✅ DONE
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

### 6H — Fans ✅ DONE
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

## Phase 9 — Management Hub Expansion
**Goal:** Add the missing FM-style management sections visible in TFM2 screenshots.
**Status:** ✅ COMPLETE (9A–9I all implemented)

### 9A — News Feed (Enhanced) ✅ DONE
Current news feed only shows basic events. Expand it to feel like an FM inbox.

**New event types to generate:**
- Player morale events: "X is unhappy about being benched", "X is delighted after win streak"
- Injury/condition events: "X is fatigued after heavy training week"
- Transfer rumors: "Scouts report Y is available for $XXK"
- League news: patch notes, rival team signings, standings updates
- Milestone news: fan threshold crossed, sponsor bonus triggered
- Manager reputation events: board comments on win/loss streaks

**UI:** Dedicated News panel accessible from sidebar. Items sorted by date, unread count badge on the sidebar icon. Click to expand full text.

---

### 9B — Coaching Staff ✅ DONE
Hire and manage a coaching staff separate from players. Each staff member has a role and stat that passively boosts the team.

**Staff roles:**
- **Head Coach** — boosts all player Development speed (training gains ×multiplier based on stat)
- **Analyst** — boosts Film Study training effectiveness; improves AI scouting accuracy in draft
- **Strength & Conditioning Coach** — reduces fatigue accumulation; speeds up condition recovery
- **Mental Coach** — improves morale recovery after losses; reduces personality clash penalties
- **Scout** — reduces scout report cost and time; reveals more detail in scouting reports

**Each staff member has:**
- `name`, `role`, `stat` (1–20, overall quality), `wage` (weekly cost), `contract` (years remaining)

**Hiring:** Pool of available staff (like free agent players). Can replace staff in offseason or mid-season with termination fee.

**UI:** Staff panel under Management sidebar. Shows each staff member as a card with their role, stat bar, wage, and contract length. "Hire Staff" button opens available pool modal.

---

### 9C — Streaming (Separate Activity) ✅ DONE
Currently streaming is one of 5 training choices. Make it a standalone parallel activity for individual players.

**New model:**
- Each player can be set to "Active Streamer" status (toggle per player)
- Active streamers gain +fans/week but have a small fatigue penalty
- Streaming schedule: Casual (1 day/wk, +0.3% fans, -2 condition/wk) vs Heavy (3 days/wk, +1% fans, -6 condition/wk)
- Star players streaming = bigger fan gain (scales with their individual fame/morale)
- Remove "Streaming" from the 5-choice training menu; replace with something more useful

**UI:** In Squad panel, each player row gets a small streaming toggle icon. Dedicated "Media & Streaming" section in the sidebar shows total fan projection from streaming and lets you set schedule per player.

---

### 9D — Facilities ✅ DONE
Team infrastructure that provides passive bonuses. Upgrade with budget.

**Facility types:**
- **Training Facility** (levels 1–5) — multiplies training stat gains (L1: ×1.0 → L5: ×1.5)
- **Analysis Suite** (levels 1–3) — improves draft AI accuracy and film study effectiveness
- **Medical Bay** (levels 1–3) — faster condition recovery; reduces injury risk
- **Streaming Studio** (levels 1–3) — multiplies fan gain from streaming activity
- **Recruitment Office** (levels 1–3) — more scouts available, lower scouting costs

**Upgrade cost:** Scales geometrically (e.g., Training Facility: L2=$200K, L3=$500K, L4=$1M, L5=$2M).
**Maintenance:** Higher-level facilities have higher weekly maintenance costs (add to weekly wages deduction).

**UI:** Facilities panel with each facility shown as a card with current level, bonus description, upgrade cost, and an "Upgrade" button (grayed out if budget insufficient).

---

### 9E — Team Info ✅ DONE
FM-style "Club Overview" screen — the first thing you see when you enter management of your team.

**Content:**
- Team name, logo placeholder, region, home arena
- Prestige rating (1–10 stars visual)
- Current season record (W-L series, W-L games)
- Squad overview: 5 starters listed with position + overall rating
- Financial snapshot: budget, weekly burn rate, projected end-of-split balance
- Fan count with recent trend arrow
- Active sponsors (names only, click to go to Finances)
- Facilities summary (each facility at a glance)
- Recent results (last 3 matches with score)
- Upcoming fixture (next scheduled match)

**UI:** A dashboard-style overview card grid, not a table. This replaces or augments the current Dashboard panel.

---

### 9F — Champion Info Browser ✅ DONE
A standalone "encyclopedia" panel for browsing all TAG champions, separate from the draft info panel.

**Features:**
- Full champion roster in a searchable/filterable grid (filter by class, role, comp type)
- Click champion → full profile: portrait placeholder, lore, stats grid, all 3 abilities with full descriptions, role tags, comp type badge (colored)
- **Role Priority Settings:** For each champion, set which roles they are prioritized for in your AI draft logic. Toggle per role. This gives the manager a way to influence how the AI values champions in auto-draft.
- Win rate display (running stat from all simulated matches in your career)
- "Owned" vs "Banned" status (if champion pool restrictions added later)

**UI:** Sidebar icon "Champions" → full-page browser panel. Same champion card style as draft info panel but expanded.

---

### 9G — Item Info Browser ✅ DONE
Encyclopedia for all 23 TAG items. Helps managers understand item priorities and set preferences.

**Features:**
- Item grid with name, cost, stats, passive description
- Filter by stat type (AD, AP, HP, etc.), cost range
- **Role Priority Settings:** For each item, set which roles should prioritize it. This feeds into the sim engine's item purchasing logic — high-priority items for a role get purchased earlier.
- Synergy tags: items that combo well with each other
- Usage stats: how often this item appears in winning vs losing builds in your career

**UI:** Sidebar icon "Items" → full-page grid browser. Clicking an item opens a detail modal.

---

### 9H — Statistics Panel ✅ DONE
Career and season statistics dashboard. FM-style "Records" screen.

**Sections:**
- **Team Stats:** all-time record (W-L), series W-L, game W-L, kill/death totals, average game duration
- **Season Stats:** current split stats, standings position, points
- **Player Stats:** sortable leaderboard — KDA, avg kills, avg deaths, avg assists, gold per game, CS per game, per player across career
- **Champion Stats:** which champions you've drafted most, win rate per champion, ban rate
- **Historical Seasons:** table of each completed season — split, final standing, champion player, notable events

**UI:** A tabbed panel (Team / Players / Champions / History). Tables with sortable columns.

---

### 9I — Manager Traits ✅ DONE
The manager (you) has a progression system. Earn XP from matches and management actions, unlock traits that provide passive bonuses.

**Trait trees:**
- **Tactician** — bonuses to draft AI, tactical adjustments between games
  - "Counter Specialist" — +15% counter-pick effectiveness in draft
  - "Adaptive Coach" — AI opponent adaptation between games is weaker vs your team
  - "Formation Mastery" — tactical adjustment screen shows better suggestions
- **Developer** — bonuses to player training and growth
  - "Talent Spotter" — scouting reports reveal more attributes for free
  - "Youth Mentor" — young players (U22) gain +1 extra attribute per week when training
  - "Veteran Handler" — veteran decline chance halved
- **Business Mind** — bonuses to finances and fans
  - "Sponsor Negotiator" — 10% bonus to all sponsor weekly income
  - "Media Presence" — streaming fan gains +20% across all players
  - "Budget Wizard" — transfer fees 10% cheaper
- **Motivator** — bonuses to morale and chemistry
  - "Locker Room Leader" — team chemistry minimum raised to 5
  - "Winning Culture" — morale boost from wins is doubled
  - "Clutch Factor" — in BO5 game 5, your team gets a small stat boost

**XP Sources:** Win a series (+50 XP), win playoffs (+200 XP), develop a young player to 75+ overall (+100 XP), complete a season (+150 XP), reach a fan milestone (+75 XP)

**UI:** Manager Profile panel (accessible from top bar user icon or sidebar). Shows: manager name, age, XP bar toward next level, total career record, trait grid with locked/unlocked states and unlock cost.

---

### 9J — Gaming House (Deferred)
Not implementing yet. Future concept: team housing that affects chemistry, condition recovery, and streaming capacity. Placeholder in PLAN.md only.

---

## Phase 11 — Management Depth v2 ✅ DONE
**Goal:** Deep overhaul of Fans, Staff, Facilities, Champions, and Tactics based on user feedback.
**Status:** ✅ Complete (March 2026)

---

### 11A — Fans Screen & Fan Engagement System ✅ DONE

**Core concept:** Fans are not just a number that goes up when you win. They are an *audience* that must be actively maintained. If you stop producing content and hosting events, fans disengage and leave — even if you're winning. This is the media/celebrity layer of esports management.

#### Fan Engagement Score (FES) — new weekly metric

Calculated each week (0–10 scale):

```
FES = base(-0.5)
    + streaming_contribution   (per active player streamer: casual=+0.3, heavy=+0.8)
    + marketing_staff_contrib  (0 if no marketing staff, up to +2.0 at stat=20)
    + active_deals_contrib     (each ongoing co-streaming deal: +0.3–0.8/wk)
    + events_this_week         (Fan Meet & Greet: +1.5, Road Show: +3.0, one-time spike)
    + match_result             (win: +0.5, loss: -0.3)
```

**FES effects on weekly fan change:**
- FES 8–10: +3–6% fans/wk (viral growth, audience loves you)
- FES 5–7:  +0.5–2% fans/wk (healthy, steady growth)
- FES 3–4:  -0.2–0.5% fans/wk (stagnating, slow decline)
- FES 0–2:  -1–3% fans/wk (fan exodus — your audience is abandoning you)
- FES < 2 for 3 consecutive weeks → Alert news: "Grove fans are leaving — engagement crisis"

**Why this matters:** You can win every game but have disengaged fans if you do nothing outside matches. Conversely, a heavy-streaming roster with active events can grow fans even through a loss streak.

#### Fans Panel UI (dedicated sidebar section replacing Streaming column in squad)

**Layout — 3 sections:**

1. **Fan Overview card (top)**
   - Total fans with trend (±K this week, ±K this split)
   - Fan Engagement Score gauge (0–10, color-coded red/amber/green)
   - Sparkline chart of last 8 weeks fan count
   - Weekly FES breakdown showing each contributor and its +/− value

2. **Content & Streaming section**
   - Per-player streaming toggle + schedule (same as current squad toggle, moved here)
   - Marketing staff contribution bar (if hired: shows weekly FES contribution)
   - Total projected weekly FES from streaming

3. **Fan Activities section**
   - **Co-streaming Deals** — negotiable ongoing partnerships
     - Available deals offered periodically (random pool, expires if not accepted)
     - Each deal: partner name, FES/wk contribution, weekly cost (sometimes free), duration in weeks
     - Active deals list with remaining weeks and cancel button
     - Example: "ArenaCast Network — +0.6 FES/wk, free, 4 weeks remaining"
   - **Fan Events** — one-time spikes (cost budget, time)
     - Fan Meet & Greet: $20–50K, +1.5 FES that week, no training impact
     - Arena Fan Event: $75–150K, +2.5 FES, no training that week
     - Road Show: $200–400K, +3.0 FES, no training for 2 weeks, region-wide reach
     - Button disabled if recently did same event (cooldown 3 weeks for M&G, 6 for Arena, 8 for Road Show)

#### Remove streaming from squad panel
- Move all streaming controls to the Fans panel
- Squad panel reverts to 9 columns (remove the Stream column added in 9C)

#### Fan milestone (updated with engagement context)
- Add news context for milestones: "Your active fanbase is engaged" vs "You hit 500K but engagement is low — this may not last"

---

### 11B — Staff Overhaul: Roster Format + Multi-Attribute Ratings ✅ DONE

**Core concept:** Staff should feel like FM players — a roster of filled/empty slots, each staff member has a full attribute card (not just one stat), and the Marketing role replaces S&C Coach.

#### Staff Roster Positions (slots)

Display as a vertical roster of 5 fixed slots, just like the player squad:

| Slot | Role | Effect |
|---|---|---|
| Head Coach | headcoach | Training gains, player development |
| Analyst | analyst | Film Study, draft quality |
| Marketing Manager | marketing | Fan Engagement Score contribution, co-streaming |
| Mental Coach | mental | Morale recovery, personality clash reduction |
| Scout | scout | Scouting cost/speed, report quality |

- S&C Coach slot **removed**, replaced by **Marketing Manager**
- Each slot: shows "— Vacant —" if not filled, or the hired staff member's card
- "Hire" button on each vacant slot opens a filtered pool of that role

#### Staff attribute cards (FM-style multi-stat)

Each staff member has **5 attributes** instead of 1 overall stat:

**Head Coach attributes:**
- `tactics` (1–20) — draft advice quality, tactical preset suggestions
- `development` (1–20) — player attribute growth rate multiplier
- `motivation` (1–20) — morale management effectiveness
- `communication` (1–20) — clarity of instructions, reduces misplay variance in sim
- `experience` (1–20) — bonus in high-pressure matches (playoffs)

**Analyst attributes:**
- `filmStudy` (1–20) — Film Study training effectiveness multiplier
- `draftReading` (1–20) — counter-pick quality in AI draft
- `dataAnalysis` (1–20) — improves between-game adaptation
- `opponentScouting` (1–20) — shows opponent weaknesses on tactics screen
- `adaptability` (1–20) — how fast they update analysis during a split

**Marketing Manager attributes (new role replacing S&C Coach):**
- `contentProduction` (1–20) — FES contribution per week (primary stat)
- `socialMedia` (1–20) — multiplies streaming fan gains
- `eventManagement` (1–20) — reduces fan event costs, improves their FES gain
- `brandDeals` (1–20) — improves co-streaming deal quality/frequency
- `fanEngagement` (1–20) — improves speed of fan recovery after bad results

**Mental Coach attributes:**
- `motivation` (1–20) — morale recovery from rest/wins
- `pressureHandling` (1–20) — composure stat bonus in high-stakes matches
- `conflictResolution` (1–20) — reduces personality clash effects
- `playerTrust` (1–20) — players more likely to follow tactical changes
- `teamBuilding` (1–20) — overall chemistry bonus

**Scout attributes:**
- `networkReach` (1–20) — broader prospect pool, more discoveries
- `judgement` (1–20) — report accuracy (higher = more accurate overall range reveal)
- `speed` (1–20) — weeks to produce a report
- `costEfficiency` (1–20) — reduces scouting cost
- `specialisation` (1–20) — bonus on finding specific role type prospects

**Staff overall = average of all 5 attributes**

**UI: Staff panel redesign**
- Top: 5 roster slot cards (one per role), each showing name, role badge, overall, wage
- Vacant slots show "— Hire [Role] —" button
- Click a filled slot → staff detail panel (all 5 attributes with bars, just like player profile)
- "Available Pool" section below: filtered to un-hired staff for all roles
- Each available staff card shows all 5 attribute bars before hiring

**State.js:** Update STAFF_POOL to give each staff member 5 stats. Derive `stat` (used in bonuses) from the relevant primary attribute per role.

---

### 11C — Facilities Build Queue ✅ DONE

**Core concept:** Upgrading a facility is not instant. It takes weeks to build, just like a real esports org renovating their practice room. You cannot start another upgrade on the same facility while one is in progress.

#### Build queue model

```js
// Each facility in team.facilities:
{
  level: 1,         // current active level (bonus applies at this level)
  upgrading: false, // is an upgrade in progress?
  upgradeToLevel: null,  // what level is being built
  weeksRemaining: 0,     // weeks until complete
}
```

**Build times per facility and level:**

| Facility | L1→2 | L2→3 | L3→4 | L4→5 |
|---|---|---|---|---|
| Training Facility | 2 wks | 3 wks | 4 wks | 5 wks |
| Analysis Suite | 1 wk | 2 wks | 3 wks | — |
| Medical Bay | 1 wk | 2 wks | 3 wks | — |
| Streaming Studio | 1 wk | 2 wks | 3 wks | — |
| Recruitment Office | 1 wk | 1 wk | 2 wks | — |

- While upgrading: level stays at current (no bonus from new level yet)
- Cost is paid immediately on clicking Upgrade (locks in the budget spend)
- Progress bar shown on facility card: "Building L2… 2 weeks remaining"
- `advanceWeek()` decrements `weeksRemaining` for all active upgrades; when it hits 0 → `level++`, clear upgrade state, fire news event

**UI:** Upgrade button becomes "Cancel" during construction (refunds 50% of cost). Progress bar with weeks remaining. Cannot upgrade a different level while one is in progress (but different facilities can build simultaneously).

---

### 11D — Champion Multi-Role Support ✅ DONE

**Core concept:** Most champions are designed for 1–2 roles. We add a `roles` array to each champion in champions.js replacing the single `role` field. The browser and draft AI use this for filtering and recommendations.

#### Logical role assignments (LoL-analogue reasoning)

| Champion | Class | Primary | Secondary | Reasoning |
|---|---|---|---|---|
| Wraithfern | Mage/SCALING | Mid | Support | Scaling mage with utility, like Orianna — can act as a utility support |
| Bombspore | Mage/POKE | Mid | Support | Poke mages flex to support in LoL constantly (Zyra, Lux, Xerath) |
| Vaulthorn | Mage/SCALING | Mid | — | Pure scaling mage, dedicated mid role |
| Emberpyre | Mage/POKE | Mid | — | High-range pure poke, needs farm — mid only |
| Spiritfox | Mage/ASSASSIN | Mid | Jungle | Assassin-mage flips to jungle well (Taliyah, Ahri sometimes jg) |
| Iceveil | Mage/ENGAGE | Support | Mid | Engage mage with lockdown = utility support (Lissandra, Annie support) |
| Wildshot | Marksman/SCALING | ADC | — | Pure hyper-carry, needs farm, ADC only |
| Swiftarrow | Marksman/POKE | ADC | Mid | Poke marksman can go mid (Corki, Caitlyn mid) |
| Starshot | Marksman/SCALING | ADC | — | Scaling carry, ADC only |
| Duskwarden | Marksman/SCALING | ADC | — | Scaling carry, ADC only |
| Embervane | Marksman/ENGAGE | ADC | Support | Engage marksman flexes to utility support (Ashe support) |
| Bogveil | Tank/ENGAGE | Top | Support | Engage tanks flex to support constantly (Malphite, Nautilus) |
| Ironsong | Tank/SCALING | Top | Jungle | Scaling tanks can jungle (Nunu-like, Zac) |
| Thornwall | Tank/ENGAGE | Top | Jungle | Engage tank jungle (Maokai, Zac jungle) |
| Deeproot | Tank/ENGAGE | Top | Support | Engage frontline support (Leona, Alistar) |
| Ironbark | Tank/ENGAGE | Top | — | Pure frontline bruiser tank, top only |
| Stoneguard | Fighter/ENGAGE | Top | — | Standard brawler fighter, dedicated top |
| Stormhide | Fighter/ENGAGE | Top | Jungle | Mobile fighter with engage can jungle (Vi, Hecarim) |
| Thornback | Fighter/ENGAGE | Top | Jungle | Versatile fighter with gap-close can jungle (Jarvan, Camille) |
| Sylvara | Fighter/SPLITPUSH | Top | Mid | Splitpush fighter can mid (Camille mid, Fiora mid occasionally) |
| Briarvex | Fighter/ENGAGE | Top | — | Heavy frontline fighter, top only |
| Shade | Assassin/ASSASSIN | Mid | Jungle | Mid assassin flexes to jungle (Katarina, Akali jg) |
| Hexwing | Assassin/ASSASSIN | Jungle | Mid | Jungle assassin can mid (Kha'Zix mid, Rengar mid) |
| Fangwhisper | Assassin/ASSASSIN | Jungle | — | Dedicated jungle assassin (Kha'Zix — nearly jungle-exclusive) |
| Driftblade | Assassin/SPLITPUSH | Top | Mid | Splitpush assassin plays both (Talon top/mid, Fiora) |
| Darkblossom | Sentinel/PROTECT | Support | — | Pure enchanter, support only (Soraka, Janna) |
| Irongrasp | Sentinel/ENGAGE | Support | Jungle | Hook/engage support tries jungle (Thresh, Blitzcrank jg) |
| Stonewall | Sentinel/PROTECT | Support | Mid | Peel/utility sentinel can mid (Karma, Lulu mid) |
| Tidecaller | Sentinel/PROTECT | Support | — | Pure protect/heal support (Soraka-like, support only) |
| Gravewarden | Sentinel/ENGAGE | Support | Jungle | Hard CC engage support can jungle (Zyra jg, Morgana jg) |

#### Implementation

1. **champions.js:** Change `role: 'mid'` → `roles: ['mid']` or `roles: ['mid', 'support']` per table above
2. **Champion browser (11D-2):** Filter by role now matches if role is in the `roles` array. Display all roles as badges (primary role highlighted).
3. **Draft AI:** When evaluating a champion for a role, check `roles.includes(targetRole)`. Primary role (index 0) is preferred; secondary is a lower-priority option.
4. **Role assignment phase:** When a player drags a champion to a role slot, if it's not in their `roles` array, show a warning badge ("Off-role — slight performance penalty") but still allow it.
5. **Draft info panel:** Show all roles (e.g. "Top / Jungle") as role badges.
6. **`players.js` compatibility:** Player `position` stays a single role (their mains). Champion `roles` is about champion flexibility, not player position.

---

### 11E — Tactics Screen Overhaul: Post-Draft In-Game Only ✅ DONE

**Core concept:** Tactics are set after the draft (you know what champions both teams picked) and before starting the match. They are shown in a full-screen TFM2-style layout with the matchup visible on the right. The main menu Tactics nav item is removed — this is purely a pre-game decision informed by your comp.

#### Remove from main menu
- Delete "⚔️ Tactics" from sidebar nav
- Delete `panel-tactics` from the game shell (no longer needed as a standing panel)
- The current "between games" tactic panel survives — it's a simplified version of the same screen shown mid-series

#### New flow
```
Draft Phase → Role Assignment → [NEW] Tactics Phase → Watch Match / Skip to Result
```

#### Tactics Phase — full-screen layout (3-column TFM2-inspired)

**Left column — Lane & Jungle Directives:**

1. **Core Lane Focus** (3 options)
   - Focus Top/Mid (jungler supports top and mid, early objectives through top side)
   - Focus Mid/Bot (jungler supports mid and bot, early objectives through bot side)
   - All Lanes (flexible, reactive to opportunities)

2. **Jungle Style** (3 options)
   - Farm & Cover (jungler prioritizes camps and defensive vision, stay safe early)
   - Shrine Ganking (jungler focuses on contesting Ley Shrines and tower dives)
   - Counter-Jungling (jungler invades enemy camps, denies their resources)

3. **Early Warden Call** (3 options)
   - Always Attempt (as soon as Warden spawns at 12:00, contest regardless of state)
   - Flexible (only attempt if winning and in position)
   - Concede (prioritize Root structures over Warden in early game)

4. **Top Laner Warden Join** (3 options)
   - Always Join (top laner rotates from their lane to Warden fight)
   - Flexible (join only if lane is stable)
   - Do Not Join (keep split pressure on top Root)

**Middle column — Objective & Fight Directives:**

5. **Objective Setup** (3 options)
   - Split Push (1-3-1 or 2-1-2 structure, apply multi-lane Root pressure)
   - Flexible (read the situation, adapt between lanes)
   - Group Up (5-man on every objective, no splitting)

6. **Objective Combat Strategy** (3 options)
   - Poke / Maintain Distance (chip enemies before committing, use range advantage)
   - Hard Engage (initiate immediately, all-in teamfight)
   - Bait & Disengage (fake engages, punish overextensions)

7. **Warden Buff Usage** (3 options)
   - Group as 5 (all players group after Warden for a coordinated push)
   - 1-4 Split (one player continues split pressure while 4 group)
   - 1-3-1 Split (two sidelanes keep pressure while 3 group mid)

**Right column — Matchup & Defensive:**

8. **Ancient Siege** (2 options — equivalent of Tower Siege)
   - Poke / Siege (use range to whittle Ancient's HP from distance)
   - Dive / All-In (commit all resources for hard engage on objective)

9. **Defensive Tactics** (2 options)
   - Defend Pressured Lane (reinforce the lane being pressured, play for defense)
   - Force Fight (proactively engage to reset defensive pressure)

10. **Matchup panel** (display only, right side)
    - Shows both teams' drafted champion assignments side by side
    - Champion name + role badge per slot
    - Highlights direct lane matchups (e.g. your Top vs their Top)
    - Opponent advantage indicators (if analyst staff is hired → shows "⚠ Opponent has counter-pick advantage in Mid")

**Bottom bar:**
- Description of currently hovered/selected option (same as TFM2)
- Two buttons: "Delegate to Analyst" (auto-fills tactics based on your comp and analyst stat) | "Start Match ▶"
- "Skip Tactics" small link (keeps previous tactics settings)

#### Sim engine impact — how each choice affects simulation

Each tactic dimension maps to a sim modifier applied during the match:

| Tactic | Sim Effect |
|---|---|
| Core Lane Focus: Top/Mid | Jungler early event weighting shifts to top side; top shrine captured earlier |
| Core Lane Focus: Mid/Bot | Jungler supports bot lane; ADC gets more early gold advantage |
| Jungle: Farm & Cover | Jungler higher CS, lower kill participation early |
| Jungle: Shrine Ganking | Jungler more likely to appear at shrine events; higher early shrine rate |
| Jungle: Counter-Jungling | Enemy jungler loses camps; jungler gets more early gold but skips own camps |
| Early Warden: Always | Warden fight happens earlier and more reliably; higher risk of 4v5 |
| Warden Join Top: Always | Top laner appears in Warden event; higher 5v5 rate |
| Objective Setup: Group Up | All 5 on every fight; higher teamfight kill events, slower root progress |
| Objective Setup: Split Push | More root events early; fewer full teamfights |
| Combat: Hard Engage | Higher kill rate, higher death rate, faster game resolution |
| Combat: Poke | Lower kill rate, higher siege events, longer games |
| Warden Buff: Group as 5 | Post-Warden push is stronger; higher root-fall chance after Warden |
| Ancient Siege: Dive | Higher risk burst at boss; more likely to win fast or wipe |
| Defensive: Defend Lane | Opponent's root damage reduced when you're ahead defensively |

#### State model
```js
G.teams[humanTeamId].tactics = {
  playstyle: 'engage',          // kept for backward compat / simple AI teams
  // New per-game tactical settings (set on tactics screen):
  laneFocus:        'all',        // 'top_mid' | 'mid_bot' | 'all'
  jungleStyle:      'farm',       // 'farm' | 'shrines' | 'counter'
  wardenCall:       'flexible',   // 'always' | 'flexible' | 'concede'
  topJoinWarden:    'flexible',   // 'always' | 'flexible' | 'never'
  objectiveSetup:   'flexible',   // 'split' | 'flexible' | 'group'
  combatStrategy:   'engage',     // 'poke' | 'engage' | 'bait'
  wardenBuff:       'group5',     // 'group5' | '1-4' | '1-3-1'
  ancientSiege:     'poke',       // 'poke' | 'dive'
  defensiveTactics: 'defend',     // 'defend' | 'fight'
}
```

#### "Delegate to Analyst" auto-fill logic
- If no analyst: fills in defaults matching the comp type (ENGAGE comp → hard engage, POKE → poke/maintain, etc.)
- With analyst hired: uses analyst's `draftReading` stat to suggest better-matched options vs opponent's comp
- Quality of suggestion scales with analyst stat (low stat = random; high stat = close to optimal)

#### Between-games simplified tactics
- The existing `_showBetweenGames()` panel already lets you change playstyle — expand it to show a condensed version of the tactics screen (same 9 dimensions, but in a single column, no matchup panel since we're mid-series)
- Remove the playstyle grid from between-games, replace with the full tactic dimensions as small toggle rows

---

## Phase 12 — Depth & Realism (Next Major Session)
**Goal:** Make the management sim feel alive and reactive — players push back on contracts, CPU orgs behave like real teams, scouting feels like discovery, and your housing actually matters.
**Status:** [ ] Planned

---

### 12A — Scouting Depth ✅ DONE

**Problem:** The scout pool has 5 prospects and scouting is a one-click wait. It feels like a timer, not a discovery.

#### Expanded scout pool
- Grow `SCOUT_POOL` from 5 to 20 prospects across all positions and nationalities
- Each prospect has a `region` field (`'EU'` | `'NA'` | `'KOR'` | `'SEA'`) that affects base scouting cost (closer = cheaper)
- Prospects have a `visibility` field (`'unknown'` | `'rumoured'` | `'scouted'`) — you can only see full stats once scouted
- Before scouting: show only Age, Region, Position, and a blurred potential indicator
- After scouting: full stat reveal + contract ask

#### Multi-scout capability
- If your Scout staff member has `networkReach >= 14`, you can run **2 concurrent scouting assignments** instead of 1
- Shows two scout slots in the Scouting panel

#### Scouting panel UX overhaul
- **Available Prospects** section: list of all undiscovered prospects (Age, Region, Pos, "???" for stats) with a Scout button
- **Active Assignments** section: shows in-progress scouts with a progress bar (weeks remaining / total)
- **Reports Archive** section: all completed reports, sorted by date — with a "Sign" shortcut button to jump to transfers
- Scout cost scales with `Scout.costEfficiency` attribute (higher = cheaper)
- Scout speed scales with `Scout.speed` attribute (higher = fewer weeks)

#### Region weighting
- Your Scout's `specialisation` attribute biases discovered prospects toward certain roles (e.g. high specialisation + Scout hired as "ADC specialist" finds more ADC prospects)
- Add a `specialisation` label to Scout staff cards: `'all roles'` | `'carries'` | `'frontline'` | `'jungle'`

---

### 12B — AI Manager Behaviour ✅ DONE

**Problem:** CPU teams are just stat bags. They never upgrade facilities, hire staff, adjust tactics, or react to their roster situation.

#### What CPU managers will now do each week (for all non-human teams, lighter simulation)

1. **Facility upgrades** (once per season, if budget > threshold)
   - Each CPU team has a hidden `aiPersonality`: `'aggressive'` | `'balanced'` | `'conservative'`
   - Aggressive teams spend more on facilities; conservative teams hoard budget
   - CPU picks a random facility to upgrade if `budget > upgrade_cost * 2` and facility isn't maxing

2. **Virtual staff bonuses** (no hiring UI, just stat modifiers)
   - Each CPU team gets a hidden `staffQuality` (1–10) assigned at game start, scaled to their `prestige`
   - This directly modifies their training gain rates and draft quality, simulating having good/bad staff
   - High-prestige teams get staffQuality 7–10; low-prestige 3–6

3. **Tactical adaptation between series games**
   - CPU teams have a `adaptability` rating (derived from `staffQuality`)
   - After losing a game in a series, they have a chance to switch tactics (change `playstyle` and `combatStrategy`)
   - High adaptability = more likely to counter your comp in game 2/3

4. **Roster management (offseason)**
   - CPU teams release players whose contracts expire and `morale < 5` or `overall < 60`
   - CPU teams sign from free agents pool to fill empty roster spots
   - This keeps the league feeling dynamic season-over-season

#### `aiPersonality` constants
```js
const AI_PERSONALITIES = {
  aggressive:   { facilitySpendMult: 1.4, rosterTurnover: 0.3, tacticsAdapt: 0.7 },
  balanced:     { facilitySpendMult: 1.0, rosterTurnover: 0.2, tacticsAdapt: 0.5 },
  conservative: { facilitySpendMult: 0.6, rosterTurnover: 0.1, tacticsAdapt: 0.3 },
};
```

---

### 12C — Contract Negotiations

**Problem:** Offering a contract is a one-click "accept or leave." Players have no voice.

#### New negotiation flow

When you offer a contract (renewal or new signing), the player responds:

1. **Accept** — player signs immediately (happy with terms)
2. **Counter-offer** — player proposes different salary/years:
   - Salary counter: +10–30% above your offer (based on `morale`, `overall`, and market demand)
   - Years counter: wants shorter deal if morale is low; longer if morale is high
   - You can **Accept Counter**, **Negotiate** (split the difference), or **Walk Away**
3. **Reject** — player declines entirely (happens if offer is far below market value)
   - Player goes on transfer list if it's a renewal; stays but morale drops
   - News item: `"[Player] has rejected a contract renewal — he wants to explore his options."`

#### Market value formula
```
marketValue = (overall * 2000) + (age < 22 ? potential_bonus : 0) - (age > 28 ? decline_penalty : 0)
weeklyMarketRate = marketValue / 52
```

#### Bidding wars (for free agents)
- When you make an offer to a free agent, there's a chance (based on their overall) that an AI team also bids
- You get a news item: `"[Team] has also made an offer to [Player] — they want [salary]/wk."`
- You can match, beat, or concede
- Player picks highest offer, with a slight bias toward human team if salary is within 10%

#### UI changes
- Contract offer modal gains a response panel below: shows player's reaction with avatar/mood badge
- Counter-offer shows as a separate card with Accept/Negotiate/Decline buttons
- Bidding war alert shown as an orange banner in the transfer panel

---

### 12D — Transfer Market

**Problem:** Between seasons, rosters feel static. CPU teams don't move players around.

#### Transfer window (offseason only)
- Transfer window opens at season end, closes when new season starts
- Human player can buy/sell players during window (existing flow)
- **CPU teams now also transact:**
  - Release players (contract expired or morale < 4)
  - Sign free agents from the pool
  - Occasionally trade players between themselves (rare, ≤1 per offseason)

#### Transfer fees
- When poaching a contracted player from a CPU team, you now pay a **transfer fee**:
  ```
  fee = overall * 3000 + (yearsLeft * salary * 26)
  ```
- CPU teams can reject a bid if fee offered is too low (fee < 80% of calculated fee)
- News item generated: `"[Team] has accepted a bid for [Player]. Transfer fee: [X]."`

#### Transfer listing
- CPU teams put players on transfer list if morale < 4 or contract expires in < 1 year
- Human team can see transfer-listed players in a dedicated "Transfer Listed" filter tab in Transfers panel
- Transfer-listed players from CPU teams show their asking fee

#### Loan system (simple)
- Human can loan a player out to a CPU team for 1 season:
  - CPU team pays 50% of weekly wages
  - Player gains `+0.5 morale/week` from playing time (if benched on your team)
- Can also loan a prospect from the free agent pool to your academy for development

---

### 12E — Fan Events Cooldown UX

**Problem:** You have to mentally track when fan events are available. No visual timeline.

#### Event availability timeline
- In the Fans panel, below the Fan Events section, add a **"Event Calendar"** row
- Shows the next 8 weeks as a row of week boxes (Week N, Week N+1, …)
- Each event type has a colored dot under each week box:
  - 🟢 Available
  - 🔴 On cooldown (shows weeks remaining as a number)
  - 🟡 Recently completed (the week it was done)
- Hovering a week box shows a tooltip: `"Meet & Greet available in 2 weeks"`

#### Quick-schedule button
- When an event becomes available, a subtle "Available now!" badge appears on the Fan Events section header
- Clicking it scrolls to that event's card

---

### 12F — Team Housing (replaces Gaming House, merged into Facilities)

**Core concept:** Your team needs somewhere to live and practice together. This starts basic and grows into a proper gaming house — a real org investment that affects morale, team chemistry, and (at top tier) streaming quality.

#### New facility: Team Housing

Add to `FACILITY_DEFS` as `'housing'`:

| Level | Name | Build Time | Cost | Weekly Upkeep | Bonuses |
|---|---|---|---|---|---|
| 1 | Studio Apartment | — (default) | — | $500/wk | No bonus (baseline) |
| 2 | Shared Apartment | 2 wks | $80,000 | $1,500/wk | Morale floor +0.5 (players don't drop below 4.5) |
| 3 | Team House | 3 wks | $200,000 | $3,500/wk | Morale floor +1.0 · Chemistry +0.3 |
| 4 | Premium Team House | 4 wks | $500,000 | $7,000/wk | Morale floor +1.5 · Chemistry +0.5 · Training gains +5% |
| 5 | Gaming House | 6 wks | $1,200,000 | $15,000/wk | Morale floor +2.0 · Chemistry +1.0 · Training +10% · FES +0.5/wk |

**How bonuses apply:**
- **Morale floor**: players' morale never falls below `(4 + floor_bonus)` — housing keeps them comfortable
- **Chemistry**: added to `calcChemistry()` as a passive bonus
- **Training gains**: multiplier stacked with Training Facility bonus
- **FES +0.5**: Gaming House has streaming setup built-in — adds directly to weekly FES calculation

**UI:** Housing facility card in the Facilities panel shows a small "home" illustration level description (the name of each tier). The upgrade tooltip explains what the next level adds in plain language.

---

## Phase 10 — Visual Identity: Sprites & Map Animation
**Goal:** Replace colored dots on the map with pixel-art champion sprites. Long-term target: isometric view with animated champions battling.
**Status:** [ ] Planned — phased approach

### 10A — Phase 1: 2D Sprite Overlay (Nearer-term)
Replace the current SVG circle dots with small pixel-art sprite images on the existing LoL-style 2D top-down map.

**Approach:**
- Each champion gets a `32×32` (or `48×48`) pixel art sprite PNG (top-down view)
- SVG `<image>` elements replace `<circle>` dots within the existing `<g>` groups
- HP ring stays as SVG circle overlay on top of sprite
- Role letter removed once sprites are recognizable enough
- Sprite set priority: one sprite per class first (Fighter/Tank/Assassin/Mage/Marksman/Sentinel) as placeholders, then individual champion sprites later

**Tooling:**
- Use a pixel art tool (Aseprite or Libresprite) to create sprites
- Export as transparent PNG, place in `assets/sprites/champions/`
- Map CSS: `image-rendering: pixelated` to preserve crisp pixels at any scale

**Animation frames (Phase 1):**
- Idle: 2-frame breathing animation (can loop via CSS or requestAnimationFrame)
- Walk: 4-frame walk cycle (triggered when champion is moving between positions)
- Attack: 2-frame attack flash (triggered on kill events)
- Death: fade-out (existing CSS opacity transition)

**SVG approach for animation:**
```js
// In map.js: swap sprite src based on champion state
// use <image href="assets/sprites/champions/fighter_walk_1.png">
// swap href on tick for walk frames
```

---

### 10B — Phase 2: Isometric View (Long-term vision)
Full isometric battlefield replacing the 2D SVG map. Champions run around, clash, and interact in real-time.

**Renderer options (evaluate when ready):**
- **PixiJS** — fast 2D WebGL renderer, excellent sprite sheet support, easy to integrate into existing HTML page
- **Phaser 3** — full game framework, heavier but has built-in tilemap, physics, animation systems
- **Canvas 2D** — manual implementation, most control, no dependencies
- Recommendation: **PixiJS** — lightest lift, best performance, good isometric support via manual tile math

**Isometric map design:**
- Diamond-grid isometric tilemap (standard 2:1 ratio tiles, e.g. 64×32 px per tile)
- Map tiles: grass (base), forest (jungle zones), stone path (lanes), shrine platform, base structure
- Tiles stored as sprite sheets: `assets/tiles/tilemap.png`
- Render order: back-to-front (painter's algorithm) by Y coordinate for correct depth sorting

**Champion sprites (isometric):**
- Each champion: 8-direction walk (N/NE/E/SE/S/SW/W/NW) × 4 walk frames = 32 frames per champion
- Attack animation: 4 frames per direction = 32 more frames per champion
- Isometric sprites: ~64×96 px per frame (taller than wide for depth illusion)
- Start with 1 representative sprite per class, apply color tint per team side (blue tint / red tint)

**Sim integration:**
- The sim engine already outputs `x,y` positions per tick — these map directly to isometric screen coordinates
- `isoX = (x - y) * TILE_W / 2 + ORIGIN_X`
- `isoY = (x + y) * TILE_H / 2 + ORIGIN_Y`
- Combat events (kill, fight) trigger attack animations
- Death events trigger death animation + fade

**Milestones for Phase 10B:**
1. Integrate PixiJS, render static isometric tilemap
2. Place champion sprites (color-coded by class)
3. Animate movement from sim positions
4. Add attack animations on kill events
5. Add ability VFX (simple flash/particle on ability use)
6. Replace SVG map entirely with PixiJS canvas

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
| 2026-03-14 | #4 | **Phases 4E+5+6E complete** — Phase 4D–4E (per-player KDA, morale modifier), Phase 5A–5D (smart draft, bans UI, counter flags, double-draft fix), Phase 6E1 (champions.js full rewrite 30 champs + abilities, items.js 23 items, players.js updated pools, state.js career+G.stats), Phase 6E2 (simulation.js full agent-based rewrite — live positions, real HP, XP/leveling, items purchasing, phys/magic damage, vamp, ranger AI, game phases), Phase 6E3 (playback speed controls ⏸/1×/2×/4×/8×), Phase 6E4 (map.js reads real simulation positions). |
| 2026-03-14 | #5 | **Phase 6 Management Depth complete** — Training panel (5 choices: rest/scrimmage/soloqueue/filmstudy/streaming, squad condition table, setTraining wired), player development (young gain/veteran decline weekly), weekly finances (wages out + sponsor income, G.financeLog history table), fan changes on match result (_applyFanChange called in _applyMatchResult), fix renderFinances typo, training CSS. |
| 2026-03-14 | #6 | **Phase 7 complete** — BO3/BO5 series format, between-game tactic adjustment, playoffs (top 4 BO5 semis+final), multi-season (offseason → new season), save/load via localStorage |
| 2026-03-14 | #7 | **Phase 3 complete** — TAG hex map SVG: diamond hexagon boundary, 3 lanes (top/mid/bot), forest jungle zones, Ley Shrine markers, Grove Warden spawn, Ancient Root markers, themed Blue/Red bases. map.js JS unchanged (same coordinate system). |
| 2026-03-14 | #8 | **Phase 6 remaining complete** — 6C Personality system (5 types: leader/maverick/grinder/volatile/pro, training multipliers, personality badges in squad + player profile), 6D team chemistry (morale average + personality compatibility bar in squad view), 6F Scouting panel (12 prospects in SCOUT_POOL, send scout for $50K, report after 1 week, free agent pipeline), 6G Sponsors (per-team sponsors with milestone bonuses and weekly income replacing flat fan/8 formula), 6H Fan milestones (5 thresholds 100K/250K/500K/1M/2M with news events). |
| 2026-03-15 | #9 | **Visual polish sprint** — Removed all wander/jitter from map (CSS transitions on SVG groups), fixed LANE_POS for LoL-style geometry, objectives with real HP bars, PBP redesigned to TFM2 3-column layout (blue panel | map | red panel + bottom feed), results screen overlay fix, champion info panel on draft hover with stats/abilities/lore, role names renamed (vanguard→Top etc.) across all files, comp type + role badge colors in champion info panel. Planned Phase 9 (Management Hub) and Phase 10 (Sprites + ISO view) in PLAN.md. |
