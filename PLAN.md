# MOBA Manager — Master Plan
> The Ancient Grove esports management sim. FM meets a custom MOBA.
> Updated: March 2026

---

## Project Vision

Build a Football Manager-style career sim set in the world of competitive esports for a custom MOBA called **The Ancient Grove (TAG)**. The player manages a team through seasons, handles contracts, scouting, draft, staff, finances, and watches matches play out via a real agent-based simulation engine on a 2D map with pixel art visuals.

---

## Completed Phases

- ✅ **Phase 1** — Data Layer Pivot: replaced all LoL data with TAG-specific champions, items, roles, and lore
- ✅ **Phase 2** — FM Shell Completion: full UI built on TAG data (roster, schedule, inbox, finances, staff)
- ✅ **Phase 3** — Hex Map: replaced placeholder map with TAG hex-grid map structure
- ✅ **Phase 4** — Sim Engine v1: tick-based agent loop, real HP, lane assignments, basic combat
- ✅ **Phase 5** — Objectives: Dragon, Baron, Towers — all with real HP damaged to 0, no scripted outcomes
- ✅ **Phase 6** — Play-by-Play HUD: live event feed, gold graph, KDA display, map visualization
- ✅ **Phase 7** — FM Core Loop: contracts, transfers, scouting, morale, fatigue, training
- ✅ **Phase 8** — Draft Screen: pick/ban UI with CPU draft logic, role priorities, meta awareness
- ✅ **Phase 9** — Season Structure: group stage, playoffs, promotion/relegation, standings
- ✅ **Phase 10** — 2D LoL-style Map: live agent positions rendered on canvas, tower/objective markers
- ✅ **Phase 11** — FM Depth Pass: scouting reports, AI manager behavior, contract negotiations, transfer market, fan events cooldown UX, team housing
- ✅ **Phase 12A** — Scouting Depth
- ✅ **Phase 12B** — AI Manager Behaviour
- ✅ **Phase 12C** — Contract Negotiations
- ✅ **Phase 12D** — Transfer Market
- ✅ **Phase 12E** — Fan Events Cooldown UX
- ✅ **Phase 12F** — Team Housing
- ✅ **Phase 13A** — Draft Screen Overhaul
- ✅ **Phase 13B** — Between-Games UX + AC Rename + Delegate Fix
- ✅ **Phase 13C** — Map Structure Fix
- ✅ **Phase 13D** — Kill Attribution + Gold Lead + Timer
- ✅ **Phase 13E** — Tower + Objective HP Display
- ✅ **Phase 13F** — Lane Movement
- ✅ **Phase 14A** — Fullscreen Layout + PBP HUD Overhaul

---

## Active Phase

### Phase 14B — Pixel Art Canvas System *(current session)*
- Replace plain colored circles on the match map with pixel art sprites
- Canvas rendering pipeline: load sprite sheets, draw per-agent per-tick
- Sprite state machine: idle / walk / attack / death stubs
- Asset placeholders for all 5 roles (top, jungle, mid, bot, support)
- Towers, inhibitors, Nexus drawn as pixel art structures
- Dragon and Baron pit sprites
- Minimap overlay with pixel art icons

---

## Upcoming Phases

### Phase 15 — Pixel Art Assets
- Item icons (consumables, boots, components, legendaries, mythics)
- Team logos for all 8 franchises
- Sponsor logos (jersey sponsors, broadcast sponsors)
- Co-stream / talent logos
- Player headshots (pixel art portrait style, ~40×40)
- Staff headshots (coaches, analysts, scouts)
- UI polish: asset-driven header banners, card borders, badge frames

### Phase 16 — Isometric View Upgrade *(long-term)*
- Migrate map renderer from 2D top-down canvas to isometric PixiJS scene
- Isometric tile grid replacing hex/flat map
- Depth sorting for agents, structures, terrain
- Camera pan and zoom controls
- Particle effects: spells, tower shots, death bursts
- Retain existing sim engine untouched — view layer only

### Phase 17 — FM-Parity Gameplay
- Fix the Advance/Continue button flow so the calendar always progresses correctly
- Real calendar: pre-season, regular season weeks, playoffs, off-season, draft day
- CPU AI performs all manager tasks autonomously (sign players, set lineups, spend budget)
- Salary cap enforcement and finances balance (revenue streams, wage bill, prize money)
- Transfer window opens/closes on calendar dates
- Full Playwright playtesting suite: run a 3-season career, assert no broken states
- Regression tests for sim engine: objective outcomes, gold deltas, kill counts

### Phase 18 — Animation Pass
- Walking animation (4-directional or 8-directional sprite sheets)
- Attack animation per champion archetype (melee swing, ranged projectile)
- Ability cast animation (channel, burst, dash)
- Death animation + corpse fade
- Celebrate animation on objective kill or ace
- Recall animation (base recall channel)
- Respawn flash + run-out-of-base animation
- All animations driven by sim engine state, no scripting

---

## Future Milestones

| Milestone | Notes |
|---|---|
| Animated sprites per champion | Full ability animations for every TAG champion; unique VFX per skill |
| Co-streaming mode | Spectator/analyst overlay; talent can comment on live match feed |
| Tournament mode | Create custom invitational brackets, international events, world championship |
| Mobile port | Touch-friendly UI, portrait layout, condensed match view for iOS/Android |
