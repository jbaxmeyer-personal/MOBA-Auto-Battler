// js/game/state.js — Core game state for Grove Manager FM-style career mode

// ─── Constants ────────────────────────────────────────────────────────────────

const POSITIONS = ['top', 'jungle', 'mid', 'adc', 'support'];

const PLAYSTYLES = {
  engage:    { name: 'Engage',     desc: 'Frontload team fights, contest Ley Shrines aggressively' },
  poke:      { name: 'Poke',       desc: 'Chip enemies before committing; pressure Ancient Roots safely' },
  pick:      { name: 'Pick',       desc: 'Isolate and eliminate single targets near shrines' },
  protect:   { name: 'Protect',   desc: 'Shield the Hunter, peel and survive the boss fight' },
  splitpush: { name: 'Splitpush', desc: 'Apply side-lane Root pressure while contesting shrines' },
  scaling:   { name: 'Scaling',   desc: 'Survive early, stack Verdant Blessings, dominate late' },
};

// ─── Manager Traits ───────────────────────────────────────────────────────────

const MANAGER_TRAITS = {
  // ── Tactician tree ──────────────────────────────────────
  counter_specialist: {
    tree: 'tactician', name: 'Counter Specialist', cost: 2,
    desc: 'Your draft AI has +15% better counter-pick weighting against opponent picks.',
    icon: '🎯',
  },
  adaptive_coach: {
    tree: 'tactician', name: 'Adaptive Coach', cost: 3,
    desc: 'AI opponent teams adapt slower between games of a series vs your team.',
    icon: '🔄',
  },
  formation_mastery: {
    tree: 'tactician', name: 'Formation Mastery', cost: 3,
    desc: 'Between-game tactic screen shows suggested adjustments based on last game result.',
    icon: '🗺️',
  },

  // ── Developer tree ──────────────────────────────────────
  talent_spotter: {
    tree: 'developer', name: 'Talent Spotter', cost: 2,
    desc: 'Scout reports reveal one additional hidden stat. Scouting cost -10%.',
    icon: '🔍',
  },
  youth_mentor: {
    tree: 'developer', name: 'Youth Mentor', cost: 3,
    desc: 'Players under 22 have +50% weekly attribute gain chance.',
    icon: '🌱',
  },
  veteran_handler: {
    tree: 'developer', name: 'Veteran Handler', cost: 3,
    desc: 'Veteran decline chance halved. Veterans over 28 stay sharper longer.',
    icon: '🏆',
  },

  // ── Business Mind tree ───────────────────────────────────
  sponsor_negotiator: {
    tree: 'business', name: 'Sponsor Negotiator', cost: 2,
    desc: '+10% bonus to all weekly sponsor income.',
    icon: '💼',
  },
  media_presence: {
    tree: 'business', name: 'Media Presence', cost: 2,
    desc: 'Streaming fan gains +20% for all active streamers.',
    icon: '📡',
  },
  budget_wizard: {
    tree: 'business', name: 'Budget Wizard', cost: 3,
    desc: 'All facility upgrade costs reduced by 15%.',
    icon: '💰',
  },

  // ── Motivator tree ──────────────────────────────────────
  locker_room_leader: {
    tree: 'motivator', name: 'Locker Room Leader', cost: 2,
    desc: 'Team morale floor raised to 5. Players never fall below morale 5.',
    icon: '🤝',
  },
  winning_culture: {
    tree: 'motivator', name: 'Winning Culture', cost: 2,
    desc: 'Post-win morale boost doubled (+4 instead of +2).',
    icon: '🌟',
  },
  clutch_factor: {
    tree: 'motivator', name: 'Clutch Factor', cost: 4,
    desc: 'In Game 3 (BO3) or Game 5 (BO5), your team gets a small stat edge from manager aura.',
    icon: '⚡',
  },
};

const MANAGER_TREES = {
  tactician: { name: 'Tactician', color: '#3498db', desc: 'Draft and in-game decision making' },
  developer: { name: 'Developer', color: '#27ae60', desc: 'Player growth and scouting' },
  business:  { name: 'Business Mind', color: '#c89b3c', desc: 'Finances, sponsors, and fans' },
  motivator: { name: 'Motivator', color: '#e74c3c', desc: 'Morale and clutch performance' },
};

const MANAGER_XP_TABLE = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250];

function getManagerLevel(xp) {
  let lvl = 1;
  for (let i = 1; i < MANAGER_XP_TABLE.length; i++) {
    if (xp >= MANAGER_XP_TABLE[i]) lvl = i + 1;
    else break;
  }
  return Math.min(lvl, MANAGER_XP_TABLE.length);
}

function getManagerPoints(xp) {
  // Total trait points = manager level - 1 (1 free point per level gained)
  return getManagerLevel(xp) - 1;
}

function grantManagerXP(amount, reason) {
  if (!G || !G.manager) return;
  G.manager.xp += amount;
  const newLevel = getManagerLevel(G.manager.xp);
  if (newLevel > G.manager.lastLevel) {
    G.manager.lastLevel = newLevel;
    addNews(`Manager level up! You are now Level ${newLevel}. Trait point earned.`, 'info');
  }
  if (reason) addNews(`+${amount} Manager XP: ${reason}`, 'info');
}

function hasManagerTrait(traitId) {
  return G?.manager?.traits?.includes(traitId);
}

function unlockManagerTrait(traitId) {
  if (!G || !G.manager) return 'error';
  const trait = MANAGER_TRAITS[traitId];
  if (!trait) return 'error';
  if (hasManagerTrait(traitId)) return 'already_unlocked';
  const spent = (G.manager.traits || []).reduce((s, id) => s + (MANAGER_TRAITS[id]?.cost || 0), 0);
  const available = getManagerPoints(G.manager.xp);
  if (spent + trait.cost > available) return 'no_points';
  G.manager.traits = G.manager.traits || [];
  G.manager.traits.push(traitId);
  addNews(`Manager trait unlocked: ${trait.name}. ${trait.desc}`, 'info');
  return 'unlocked';
}

// ─── Facilities ───────────────────────────────────────────────────────────────

const FACILITY_DEFS = {
  training: {
    name: 'Training Facility',
    icon: '🏋️',
    desc: 'Better equipment and drills accelerate attribute gains.',
    maxLevel: 5,
    costs:  [0, 200000, 500000, 1000000, 2000000], // cost to upgrade to levels 2–5
    weekly: [0,   2000,   5000,   10000,   20000], // maintenance per level
    bonus(level) { return 1 + (level - 1) * 0.1; }, // training gain multiplier
    bonusLabel(level) { return `Training gains ×${(1 + (level-1)*0.1).toFixed(1)}`; },
  },
  analysis: {
    name: 'Analysis Suite',
    icon: '📊',
    desc: 'Cutting-edge VOD tools for film study and opponent scouting.',
    maxLevel: 3,
    costs:  [0, 150000, 400000],
    weekly: [0,   3000,   8000],
    bonus(level) { return (level - 1) * 0.1; }, // film study bonus chance additive
    bonusLabel(level) { return level > 1 ? `Film Study +${((level-1)*10)}% gain chance` : 'No bonus'; },
  },
  medical: {
    name: 'Medical Bay',
    icon: '⚕️',
    desc: 'Faster condition recovery between weeks.',
    maxLevel: 3,
    costs:  [0, 100000, 300000],
    weekly: [0,   2000,   5000],
    bonus(level) { return (level - 1) * 0.5; }, // extra morale recovery per rest week
    bonusLabel(level) { return level > 1 ? `Rest morale +${((level-1)*0.5).toFixed(1)} extra` : 'No bonus'; },
  },
  streaming: {
    name: 'Streaming Studio',
    icon: '🎙️',
    desc: 'Professional setup multiplies fan gains from streaming activity.',
    maxLevel: 3,
    costs:  [0, 80000, 200000],
    weekly: [0,  1500,   4000],
    bonus(level) { return 1 + (level - 1) * 0.5; }, // streaming fan gain multiplier
    bonusLabel(level) { return `Streaming fans ×${(1 + (level-1)*0.5).toFixed(1)}`; },
  },
  recruitment: {
    name: 'Recruitment Office',
    icon: '🔎',
    desc: 'More scouts, lower scouting costs.',
    maxLevel: 3,
    costs:  [0, 60000, 150000],
    weekly: [0,  1000,   2500],
    bonus(level) { return (level - 1) * 0.25; }, // scouting cost reduction fraction
    bonusLabel(level) { return level > 1 ? `Scout cost -${((level-1)*25)}%` : 'No bonus'; },
  },
};

function defaultFacilities() {
  const f = {};
  Object.keys(FACILITY_DEFS).forEach(k => { f[k] = 1; });
  return f;
}

function getFacilityMaintenanceCost(teamId) {
  const team = G.teams[teamId];
  if (!team || !team.facilities) return 0;
  return Object.entries(team.facilities).reduce((sum, [k, lvl]) => {
    const def = FACILITY_DEFS[k];
    return sum + (def ? (def.weekly[lvl - 1] || 0) : 0);
  }, 0);
}

function upgradeFacility(facilityKey) {
  if (!G) return 'error';
  const team = G.teams[G.humanTeamId];
  const def  = FACILITY_DEFS[facilityKey];
  if (!team || !def) return 'error';
  if (!team.facilities) team.facilities = defaultFacilities();
  const curLevel = team.facilities[facilityKey] || 1;
  if (curLevel >= def.maxLevel) return 'max_level';
  const cost = def.costs[curLevel]; // costs array: index 0=L1→L2, 1=L2→L3, etc.
  if (team.budget < cost) return 'no_budget';
  team.budget -= cost;
  team.facilities[facilityKey] = curLevel + 1;
  addNews(`${def.name} upgraded to Level ${curLevel + 1}. ${def.bonusLabel(curLevel + 1)}.`, 'info');
  return 'upgraded';
}

// ─── Staff Pool ───────────────────────────────────────────────────────────────
// Roles: headcoach | analyst | conditioning | mental | scout

const STAFF_POOL = [
  { id:'st01', name:'Aldric Vale',    role:'headcoach',     stat:15, wage:25000, nationality:'EU',
    desc:'Former pro with championship experience. Accelerates player development.' },
  { id:'st02', name:'Brynn Ashford',  role:'headcoach',     stat:12, wage:18000, nationality:'NA',
    desc:'Methodical coach known for structured practice routines.' },
  { id:'st03', name:'Oryn Marsh',     role:'headcoach',     stat:10, wage:12000, nationality:'KOR',
    desc:'Up-and-coming coach. Affordable and hungry to prove himself.' },
  { id:'st04', name:'Selene Croft',   role:'analyst',       stat:16, wage:20000, nationality:'EU',
    desc:'Data-driven analyst. Dramatically improves draft counter-pick success.' },
  { id:'st05', name:'Gael Winters',   role:'analyst',       stat:11, wage:10000, nationality:'NA',
    desc:'Self-taught analyst with sharp reads on opposing team tendencies.' },
  { id:'st06', name:'Toma Ironsong',  role:'conditioning',  stat:14, wage:15000, nationality:'KOR',
    desc:'Elite physical trainer. Players recover faster and stay fresh longer.' },
  { id:'st07', name:'Fira Moss',      role:'conditioning',  stat:10, wage:9000,  nationality:'EU',
    desc:'Former athlete who transitioned into esports conditioning.' },
  { id:'st08', name:'Declan Holt',    role:'mental',        stat:13, wage:16000, nationality:'NA',
    desc:'Sports psychologist specialising in high-pressure performance.' },
  { id:'st09', name:'Vesper Gray',    role:'mental',        stat:11, wage:11000, nationality:'EU',
    desc:'Calm presence in the team room. Keeps volatile personalities in check.' },
  { id:'st10', name:'Riven Blackwell',role:'scout',         stat:15, wage:14000, nationality:'KOR',
    desc:'World-class scout. Finds hidden talent faster and cheaper than anyone.' },
  { id:'st11', name:'Calder Fenn',    role:'scout',         stat:11, wage:8000,  nationality:'NA',
    desc:'Reliable regional scout with a good eye for young ADC talent.' },
  { id:'st12', name:'Mira Ashgrove',  role:'conditioning',  stat:12, wage:12000, nationality:'NA',
    desc:'Known for preventing burnout in gruelling split schedules.' },
];

const STAFF_ROLE_LABEL = {
  headcoach:    'Head Coach',
  analyst:      'Analyst',
  conditioning: 'S&C Coach',
  mental:       'Mental Coach',
  scout:        'Scout',
};

const STAFF_ROLE_BONUS = {
  headcoach:    'Training gains ×+stat%',
  analyst:      'Film Study ×+stat% · Draft edge',
  conditioning: 'Condition recovery +stat/wk',
  mental:       'Morale recovery +stat · Clash reduction',
  scout:        'Scout cost -stat% · Report speed +1wk',
};

// ─── Scout Pool ───────────────────────────────────────────────────────────────

const SCOUT_POOL = [
  { id:'sc001', name:'Fernwick',  position:'top',       age:19, nationality:'EU', potential:'high',
    champions:['Bogveil','Thornwall','Stoneguard'],
    contract:{ salary:45000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:9,teamfightPositioning:12,mapMovement:10,objectiveExecution:10,championPoolDepth:8,
            decisionMaking:10,gameSense:11,communication:9,leadership:8,adaptability:12,composure:9 },
    personality:'grinder', playStyle:'utility', teamId:null, discovered:false },
  { id:'sc002', name:'Ashblaze',  position:'mid',        age:20, nationality:'NA', potential:'medium',
    champions:['Wraithfern','Bombspore','Vaulthorn'],
    contract:{ salary:40000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:13,teamfightPositioning:10,mapMovement:9,objectiveExecution:9,championPoolDepth:10,
            decisionMaking:12,gameSense:11,communication:8,leadership:7,adaptability:11,composure:10 },
    personality:'volatile', playStyle:'carry', teamId:null, discovered:false },
  { id:'sc003', name:'Coldpath',  position:'jungle',    age:18, nationality:'KOR', potential:'high',
    champions:['Shade','Hexwing','Fangwhisper'],
    contract:{ salary:35000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:10,teamfightPositioning:10,mapMovement:14,objectiveExecution:11,championPoolDepth:9,
            decisionMaking:11,gameSense:12,communication:7,leadership:6,adaptability:13,composure:10 },
    personality:'maverick', playStyle:'aggressive', teamId:null, discovered:false },
  { id:'sc004', name:'Driftmere', position:'adc',       age:21, nationality:'NA', potential:'medium',
    champions:['Wildshot','Swiftarrow','Starshot'],
    contract:{ salary:50000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:13,teamfightPositioning:11,mapMovement:9,objectiveExecution:10,championPoolDepth:10,
            decisionMaking:10,gameSense:10,communication:9,leadership:8,adaptability:10,composure:11 },
    personality:'pro', playStyle:'carry', teamId:null, discovered:false },
  { id:'sc005', name:'Groveborn', position:'support',   age:22, nationality:'EU', potential:'medium',
    champions:['Darkblossom','Irongrasp','Stonewall'],
    contract:{ salary:42000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:9,csAccuracy:7,teamfightPositioning:13,mapMovement:8,objectiveExecution:11,championPoolDepth:9,
            decisionMaking:12,gameSense:13,communication:14,leadership:12,adaptability:10,composure:11 },
    personality:'leader', playStyle:'utility', teamId:null, discovered:false },
  { id:'sc006', name:'Thistlerun',position:'top',       age:20, nationality:'NA', potential:'medium',
    champions:['Deeproot','Ironsong','Stormhide'],
    contract:{ salary:38000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:10,csAccuracy:8,teamfightPositioning:11,mapMovement:9,objectiveExecution:9,championPoolDepth:8,
            decisionMaking:9,gameSense:10,communication:10,leadership:9,adaptability:11,composure:10 },
    personality:'grinder', playStyle:'utility', teamId:null, discovered:false },
  { id:'sc007', name:'Ravenmoss', position:'mid',       age:19, nationality:'KOR', potential:'high',
    champions:['Emberpyre','Spiritfox','Iceveil'],
    contract:{ salary:32000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:14,csAccuracy:12,teamfightPositioning:9,mapMovement:10,objectiveExecution:8,championPoolDepth:11,
            decisionMaking:13,gameSense:12,communication:7,leadership:6,adaptability:14,composure:9 },
    personality:'maverick', playStyle:'carry', teamId:null, discovered:false },
  { id:'sc008', name:'Stormcroft',position:'adc',       age:18, nationality:'EU', potential:'high',
    champions:['Duskwarden','Embervane','Wildshot'],
    contract:{ salary:30000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:14,teamfightPositioning:10,mapMovement:8,objectiveExecution:9,championPoolDepth:8,
            decisionMaking:10,gameSense:11,communication:8,leadership:7,adaptability:12,composure:10 },
    personality:'grinder', playStyle:'carry', teamId:null, discovered:false },
  { id:'sc009', name:'Willowfen', position:'support',   age:23, nationality:'NA', potential:'medium',
    champions:['Tidecaller','Gravewarden','Darkblossom'],
    contract:{ salary:48000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:8,csAccuracy:7,teamfightPositioning:12,mapMovement:9,objectiveExecution:11,championPoolDepth:10,
            decisionMaking:13,gameSense:14,communication:15,leadership:13,adaptability:9,composure:12 },
    personality:'leader', playStyle:'shotcaller', teamId:null, discovered:false },
  { id:'sc010', name:'Ironveil',  position:'jungle',    age:21, nationality:'KOR', potential:'medium',
    champions:['Driftblade','Shade','Hexwing'],
    contract:{ salary:44000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:9,teamfightPositioning:11,mapMovement:13,objectiveExecution:10,championPoolDepth:9,
            decisionMaking:11,gameSense:12,communication:8,leadership:7,adaptability:11,composure:10 },
    personality:'pro', playStyle:'aggressive', teamId:null, discovered:false },
  { id:'sc011', name:'Briarcoil', position:'top',       age:17, nationality:'EU', potential:'high',
    champions:['Thornback','Sylvara','Briarvex'],
    contract:{ salary:28000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:10,csAccuracy:7,teamfightPositioning:10,mapMovement:8,objectiveExecution:8,championPoolDepth:7,
            decisionMaking:9,gameSense:9,communication:8,leadership:7,adaptability:13,composure:8 },
    personality:'grinder', playStyle:'utility', teamId:null, discovered:false },
  { id:'sc012', name:'Cinderfall',position:'mid',       age:24, nationality:'NA', potential:'medium',
    champions:['Vaulthorn','Bombspore','Wraithfern'],
    contract:{ salary:55000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:12,teamfightPositioning:10,mapMovement:8,objectiveExecution:9,championPoolDepth:11,
            decisionMaking:12,gameSense:11,communication:10,leadership:9,adaptability:10,composure:12 },
    personality:'pro', playStyle:'utility', teamId:null, discovered:false },
];

// ─── Game State ───────────────────────────────────────────────────────────────

let G = null; // global game state — set by initGame()

function initGame(humanTeamId) {
  const season = buildSeason(2025, 'spring');

  // Build team objects from TEAMS_DATA
  const teams = {};
  TEAMS_DATA.forEach(td => {
    const roster  = PLAYER_DB.filter(p => p.teamId === td.id && !isAcademy(p, td.id));
    const academy = PLAYER_DB.filter(p => p.teamId === td.id &&  isAcademy(p, td.id));

    teams[td.id] = {
      ...td,
      isHuman: td.id === humanTeamId,
      wins: 0, losses: 0, points: 0,
      // Starting roster: best player at each position
      roster:  buildStartingLineup(td.id),
      academy: academy.map(p => p.id),
      tactics: {
        playstyle: td.id === humanTeamId ? 'engage' : randomPlaystyle(),
      },
      facilities: defaultFacilities(),
      weeklyWages: calcWagesBill(td.id),
      sponsorIncome: (td.sponsors || []).reduce((s, sp) => s + sp.weeklyIncome, 0),
      sponsors: td.sponsors ? td.sponsors.map(s => ({ ...s, bonuses: s.bonuses.map(b => ({ ...b })) })) : [],
      news: [],
    };
  });

  // Build player instance map (id → player with live morale/form/career)
  const players = {};
  PLAYER_DB.forEach(p => {
    players[p.id] = {
      ...p,
      stats:     { ...p.stats },
      champions: [...p.champions],
      contract:  { ...p.contract },
      morale: 7,
      form:   [6, 6, 6],
      injured: false,
      onTransferList: false,
      streaming: { active: false, schedule: 'casual' },
      // Career stats — accumulated across all matches this player appears in
      career: {
        gamesPlayed: 0,
        wins:        0,
        losses:      0,
        kills:       0,
        deaths:      0,
        assists:     0,
        cs:          0,
        damageDealt: 0,
        // Per-champion breakdown: { [champName]: { games, kills, deaths, assists } }
        championStats: {},
      },
    };
  });

  // World stats — aggregate tracking across every simulated match (AI vs AI + human)
  const stats = {
    totalMatches: 0,
    // All-time leaderboards (sorted arrays rebuilt on demand)
    leaderboards: {
      kills:       [],   // { playerId, name, value }
      assists:     [],
      cs:          [],
      kda:         [],   // (kills+assists)/deaths
      damageDealt: [],
      winRate:     [],   // wins / gamesPlayed (min 5 games)
    },
  };

  G = {
    humanTeamId,
    teams,
    players,
    freeAgents: PLAYER_DB.filter(p => !p.teamId).map(p => p.id),
    season,
    stats,
    news:           [],
    newsReadUntil:  0,
    selectedPlayerId: null,
    weeklyTraining: 'rest',    // human's training choice for the current week
    trainingLog:    [],        // [{ week, teamId, choice }]
    financeLog:     [],        // [{ week, wages, income, net, balance }]
    fanMilestones:  { m100k: false, m250k: false, m500k: false, m1m: false, m2m: false },
    coStreamDeals:  { available: [], active: [] },
    scouting:       { weeklyBudget: 50000, activeScout: null, reports: [], discovered: [] },
    staff:          [],   // array of hired staff objects { ...STAFF_POOL entry, hiredWeek }
    manager:        { xp: 0, lastLevel: 1, traits: [] },
  };

  addNews(`Welcome to Grove Manager! You are now the manager of ${teams[humanTeamId].name}. Good luck!`, 'info');
  addNews(`The ${G.season.split === 'spring' ? 'Spring' : 'Summer'} Split ${G.season.year} is about to begin. Your first match is in Week 1.`, 'info');

  return G;
}

// ─── Roster helpers ───────────────────────────────────────────────────────────

function isAcademy(player, teamId) {
  // Academy players are the 2nd player at any position for a team
  const teamPlayers = PLAYER_DB.filter(p => p.teamId === teamId);
  const pos = player.position;
  const samePos = teamPlayers.filter(p => p.position === pos);
  // Sort by overall: first is starter, rest are academy
  samePos.sort((a, b) => calcOverall(b) - calcOverall(a));
  return samePos.indexOf(player) > 0;
}

function buildStartingLineup(teamId) {
  const lineup = {};
  POSITIONS.forEach(pos => {
    const candidates = PLAYER_DB.filter(p => p.teamId === teamId && p.position === pos);
    candidates.sort((a, b) => calcOverall(b) - calcOverall(a));
    lineup[pos] = candidates.length ? candidates[0].id : null;
  });
  return lineup;
}

function calcWagesBill(teamId) {
  return Math.round(PLAYER_DB
    .filter(p => p.teamId === teamId)
    .reduce((sum, p) => sum + (p.contract.salary || 0), 0) / 52);
}

// ─── Season builder ───────────────────────────────────────────────────────────

function buildSeason(year, split) {
  const teamIds = TEAMS_DATA.map(t => t.id);
  const schedule = generateRoundRobin(teamIds, year, split);
  return {
    year,
    split,           // 'spring' | 'summer'
    week:  1,
    phase: 'regular',  // 'regular' | 'playoffs' | 'offseason'
    schedule,         // array of { week, matchday, homeId, awayId, played, result }
    totalWeeks: 7,    // 7-week regular season (8 teams, each plays every other once)
  };
}

// Generate a round-robin schedule (each team plays every other team once)
function generateRoundRobin(teamIds, year, split) {
  const n    = teamIds.length;         // 10 teams
  const matches = [];
  // Standard round-robin rotation algorithm
  const teams = [...teamIds];
  const fixed = teams.shift();          // fix first team, rotate the rest
  const weeks = teams.length;           // 9 weeks
  for (let w = 0; w < weeks; w++) {
    const pairs = [[fixed, teams[w]]];
    for (let i = 1; i < Math.floor(n / 2); i++) {
      const a = (w + i)     % teams.length;
      const b = (w + teams.length - i) % teams.length;
      pairs.push([teams[a], teams[b]]);
    }
    pairs.forEach(([a, b]) => {
      matches.push({
        week:    w + 1,
        homeId:  a,
        awayId:  b,
        played:  false,
        format:  'bo3',
        homeWins: 0,
        awayWins: 0,
        games:   [],
        result:  null,   // { winnerId, score }
      });
    });
  }
  return matches;
}

// ─── Week advancement ─────────────────────────────────────────────────────────

function advanceWeek() {
  const { season } = G;
  if (season.phase === 'offseason') return { type: 'offseason' };

  const week      = season.week;
  const matchWeek = getWeekMatches(week);
  const humanMatch = matchWeek.find(m => m.homeId === G.humanTeamId || m.awayId === G.humanTeamId);

  // Simulate all AI vs AI matches
  matchWeek.forEach(m => {
    if (!m.played && !(m.homeId === G.humanTeamId || m.awayId === G.humanTeamId)) {
      simulateAIMatch(m);
    }
  });

  // Weekly finances: wages out, sponsor income in (all teams)
  Object.values(G.teams).forEach(t => {
    t.weeklyWages = calcWagesBill(t.id);
    const wages  = t.weeklyWages;
    const income = t.sponsorIncome;
    const staffCost    = t.id === G.humanTeamId ? getStaffWages() : 0;
    const facilCost    = t.id === G.humanTeamId ? getFacilityMaintenanceCost(t.id) : 0;
    t.budget = (t.budget || 0) - wages - staffCost - facilCost + income;
    if (t.id === G.humanTeamId) {
      G.financeLog.push({
        week, wages: wages + staffCost + facilCost, income,
        net: income - wages - staffCost - facilCost, balance: t.budget,
      });
      if (t.budget < 0)
        addNews(`Financial warning: budget is ${fmtMoneySafe(t.budget)}. Consider releasing high earners.`, 'alert');
    }
  });

  // Check sponsor bonuses and fan milestones for human team
  _checkSponsorBonuses(G.humanTeamId);
  _checkFanMilestones(G.humanTeamId);
  _generateWeeklyNews(week);

  // Apply manager trait: locker_room_leader — morale floor
  if (hasManagerTrait('locker_room_leader')) {
    const team = G.teams[G.humanTeamId];
    POSITIONS.forEach(pos => {
      const p = team.roster[pos] ? G.players[team.roster[pos]] : null;
      if (p && p.morale < 5) p.morale = 5;
    });
  }

  // Apply manager trait: sponsor_negotiator — +10% sponsor income per week
  if (hasManagerTrait('sponsor_negotiator')) {
    const team = G.teams[G.humanTeamId];
    const bonus = Math.round(team.sponsorIncome * 0.10);
    team.budget += bonus;
  }

  // Process training for human team
  processTraining(G.humanTeamId, G.weeklyTraining || 'rest');

  // Process fan engagement (FES, streaming, deals, events) for human team
  processFanEngagement(G.humanTeamId);

  // Process scouting
  if (G.scouting && G.scouting.activeScout) {
    G.scouting.activeScout.weeksLeft--;
    if (G.scouting.activeScout.weeksLeft <= 0) {
      const found = SCOUT_POOL.find(p => p.id === G.scouting.activeScout.targetId);
      if (found) {
        found.discovered = true;
        G.scouting.discovered.push(found.id);
        G.scouting.reports.push({ ...found, discoveredWeek: G.season.week });
        // Add to free agents
        if (!G.players[found.id]) {
          G.players[found.id] = { ...found, morale: 6, form: makeForm(6), career: { gamesPlayed:0,wins:0,losses:0,kills:0,deaths:0,assists:0,cs:0,damageDealt:0,championStats:{} } };
          G.freeAgents.push(found.id);
        }
        addNews(`Scout report: ${found.name} (${posLabel(found.position)}, Age ${found.age}, ${found.potential} potential) is available as a free agent.`, 'info');
      }
      G.scouting.activeScout = null;
    }
  }

  // Player development tick (every week, minor)
  processPlayerDevelopment();

  // Advance week counter
  season.week++;

  // Check for end of regular season
  if (season.week > season.totalWeeks && season.phase === 'regular') {
    buildPlayoffs();
    // Reset weekly training choice
    G.weeklyTraining = 'rest';
    saveGame();
    return { type: 'playoffs_start', humanMatch };
  }

  // Check for playoffs advancement
  if (season.phase === 'playoffs') {
    _advancePlayoffs();
    // Reset weekly training choice
    G.weeklyTraining = 'rest';
    saveGame();
    return { type: 'playoffs', humanMatch };
  }

  // Reset weekly training choice
  G.weeklyTraining = 'rest';

  saveGame();
  return { type: 'week_advanced', week, humanMatch };
}

// ─── Fan change from match result ────────────────────────────────────────────

function _applyFanChange(teamId, won) {
  const t = G.teams[teamId];
  if (!t) return;
  // For AI teams: direct fan change
  if (teamId !== G.humanTeamId) {
    const pct = won
      ? 0.02 + Math.random() * 0.02
      : -(0.005 + Math.random() * 0.005);
    t.fans = Math.round(t.fans * (1 + pct));
    return;
  }
  // For human team: store as FES bonus consumed in processFanEngagement
  t._fesMatchBonus = (t._fesMatchBonus || 0) + (won ? 0.5 : -0.3);
}

// ─── Personality multiplier ───────────────────────────────────────────────────

function getPersonalityMultiplier(player, trainingType) {
  const p = player.personality || 'pro';
  if (p === 'grinder') return 1.5;
  if (p === 'volatile') return Math.random() < 0.5 ? 1.8 : 0.3;
  if (p === 'maverick') return ['soloqueue','scrimmage'].includes(trainingType) ? 1.3 : 0.8;
  if (p === 'leader')   return 1.1;
  return 1.0; // pro
}

// ─── Training system ──────────────────────────────────────────────────────────
// Choices: rest | scrimmage | soloqueue | filmstudy | streaming

const TRAINING_DEFS = {
  rest: {
    label: 'Rest',
    icon: '😴',
    desc: 'Players recover. Morale +1 for all. No attribute gains.',
    effect(players) {
      let hasLeader = false;
      players.forEach(p => {
        if (p && (p.personality || 'pro') === 'leader') hasLeader = true;
      });
      const mentalBonus = getStaffBonus('mental');
      players.forEach(p => {
        if (!p) return;
        const leaderBonus = hasLeader && (p.personality || 'pro') !== 'leader' ? 0.5 : 0;
        p.morale = Math.min(10, p.morale + 1 + leaderBonus + mentalBonus);
      });
    },
  },
  scrimmage: {
    label: 'Scrimmage',
    icon: '⚔️',
    desc: 'Internal practice match. Small chance to improve a combat stat for each player.',
    effect(players) {
      const combatStats = ['mechanics','teamfightPositioning','mapMovement'];
      players.forEach(p => {
        if (!p) return;
        const moraleBonus = p.morale > 7 ? 1.5 : p.morale < 4 ? 0.5 : 1;
        const mult = getPersonalityMultiplier(p, 'scrimmage') * (p._facilMult || 1);
        if (Math.random() < 0.18 * moraleBonus * mult) {
          const stat = combatStats[Math.floor(Math.random()*combatStats.length)];
          p.stats[stat] = Math.min(20, p.stats[stat] + 1);
        }
      });
    },
  },
  soloqueue: {
    label: 'Solo Queue',
    icon: '🎮',
    desc: 'Individual ranked grind. One player gains +1 to Mechanics or Decision Making.',
    effect(players) {
      const eligible = players.filter(p => p && p.age < 27);
      if (!eligible.length) return;
      const p = eligible[Math.floor(Math.random()*eligible.length)];
      const stat = Math.random() < 0.6 ? 'mechanics' : 'decisionMaking';
      const moraleBonus = p.morale > 7 ? 1.5 : 1;
      const mult = getPersonalityMultiplier(p, 'soloqueue') * (p._facilMult || 1);
      if (Math.random() < 0.35 * moraleBonus * mult)
        p.stats[stat] = Math.min(20, p.stats[stat] + 1);
    },
  },
  filmstudy: {
    label: 'Film Study',
    icon: '📹',
    desc: 'Review opponent footage. Small boost to Game Sense and Adaptability for all.',
    effect(players) {
      players.forEach(p => {
        if (!p) return;
        const mult = getPersonalityMultiplier(p, 'filmstudy') * (p._facilMult || 1) * (1 + (p._analystBoost || 0));
        if ((p.personality || 'pro') === 'maverick') {
          p.morale = Math.max(1, p.morale - 0.5);
        }
        if (Math.random() < 0.15 * mult) p.stats.gameSense    = Math.min(20, p.stats.gameSense + 1);
        if (Math.random() < 0.12 * mult) p.stats.adaptability = Math.min(20, p.stats.adaptability + 1);
      });
    },
  },
  tactical_review: {
    label: 'Tactical Review',
    icon: '🗺️',
    desc: 'Analyse team coordination. Small boost to Communication and Composure for all.',
    effect(players) {
      players.forEach(p => {
        if (!p) return;
        const mult = getPersonalityMultiplier(p, 'tactical_review');
        if (Math.random() < 0.15 * mult) p.stats.communication = Math.min(20, p.stats.communication + 1);
        if (Math.random() < 0.12 * mult) p.stats.composure     = Math.min(20, p.stats.composure + 1);
      });
    },
  },
};

function getFacilityBonus(teamId, facilityKey) {
  const team = G.teams[teamId];
  if (!team || !team.facilities) return 1;
  const level = team.facilities[facilityKey] || 1;
  const def = FACILITY_DEFS[facilityKey];
  return def ? def.bonus(level) : 1;
}

function processTraining(teamId, choice) {
  let def = TRAINING_DEFS[choice] || TRAINING_DEFS.rest;
  // Apply training facility multiplier to stat-gaining activities
  if (choice !== 'rest') {
    const facilMult = getFacilityBonus(teamId, 'training');
    if (facilMult > 1) {
      const origEffect = def.effect;
      def = { ...def, effect(players, tid) {
        players.forEach(p => { if (p) p._facilMult = facilMult; });
        origEffect(players, tid);
        players.forEach(p => { if (p) delete p._facilMult; });
      }};
    }
  }
  // Analyst boost is applied directly in filmstudy effect via p._analystBoost flag
  if (choice === 'filmstudy') {
    const analystBonus = getStaffBonus('analyst');
    if (analystBonus > 0) {
      const team = G.teams[teamId];
      POSITIONS.forEach(pos => {
        const p = team?.roster[pos] ? G.players[team.roster[pos]] : null;
        if (p) p._analystBoost = analystBonus;
      });
    }
  }
  const team = G.teams[teamId];
  if (!team) return;
  const players = POSITIONS.map(pos => {
    const pid = team.roster[pos];
    return pid ? G.players[pid] : null;
  });
  def.effect(players, teamId);

  // Clean up temp flags
  players.forEach(p => { if (p) { delete p._analystBoost; delete p._facilMult; } });

  // Record in finance log
  if (!G.trainingLog) G.trainingLog = [];
  G.trainingLog.push({ week: G.season.week, teamId, choice });
}

// ─── Staff helpers ────────────────────────────────────────────────────────────

function getStaffBonus(role) {
  // Returns a 0–1 multiplier bonus from hired staff of given role
  if (!G || !G.staff) return 0;
  const member = G.staff.find(s => s.role === role);
  return member ? member.stat / 100 : 0;
}

function hireStaff(staffId) {
  if (!G) return 'error';
  const def = STAFF_POOL.find(s => s.id === staffId);
  if (!def) return 'error';
  if (G.staff.find(s => s.id === staffId)) return 'already_hired';
  // Can only have one per role
  if (G.staff.find(s => s.role === def.role)) return 'role_filled';
  const team = G.teams[G.humanTeamId];
  if (team.budget < def.wage * 4) return 'no_budget';  // require 4 weeks buffer
  G.staff.push({ ...def, hiredWeek: G.season.week });
  addNews(`Hired ${def.name} as ${STAFF_ROLE_LABEL[def.role]}. ${def.desc}`, 'info');
  return 'hired';
}

function fireStaff(staffId) {
  if (!G) return;
  const member = G.staff.find(s => s.id === staffId);
  if (!member) return;
  G.staff = G.staff.filter(s => s.id !== staffId);
  addNews(`${member.name} has left the coaching staff.`, 'info');
}

function getStaffWages() {
  if (!G || !G.staff) return 0;
  return G.staff.reduce((sum, s) => sum + s.wage, 0);
}

// ─── Fan Engagement System ────────────────────────────────────────────────────

const CO_STREAM_DEAL_POOL = [
  { id: 'deal_arenacast',  partner: 'ArenaCast Network',  fesPerWeek: 0.6, costPerWeek: 0,      durationWeeks: 6 },
  { id: 'deal_grovetv',    partner: 'GroveTV',            fesPerWeek: 0.8, costPerWeek: 5000,   durationWeeks: 4 },
  { id: 'deal_clutchcast', partner: 'ClutchCast',         fesPerWeek: 0.4, costPerWeek: 0,      durationWeeks: 8 },
  { id: 'deal_esportz',    partner: 'Esportz Live',       fesPerWeek: 1.0, costPerWeek: 10000,  durationWeeks: 3 },
  { id: 'deal_novamedia',  partner: 'Nova Media',         fesPerWeek: 0.5, costPerWeek: 0,      durationWeeks: 5 },
  { id: 'deal_limelight',  partner: 'Limelight Studios',  fesPerWeek: 0.7, costPerWeek: 7500,   durationWeeks: 4 },
  { id: 'deal_wildstream', partner: 'WildStream',         fesPerWeek: 0.3, costPerWeek: 0,      durationWeeks: 10 },
  { id: 'deal_primetime',  partner: 'PrimeTime Gaming',   fesPerWeek: 1.2, costPerWeek: 15000,  durationWeeks: 3 },
];

const FAN_EVENT_DEFS = {
  meetGreet:  { label: 'Fan Meet & Greet',  cost: 35000,  fesBonus: 1.5, cooldownWeeks: 3,  trainingBlock: 0 },
  arenaEvent: { label: 'Arena Fan Event',   cost: 100000, fesBonus: 2.5, cooldownWeeks: 6,  trainingBlock: 1 },
  roadShow:   { label: 'Road Show',         cost: 300000, fesBonus: 3.0, cooldownWeeks: 8,  trainingBlock: 2 },
};

function _initFanState(team) {
  if (!team.fanHistory)   team.fanHistory   = [];
  if (!team.fesHistory)   team.fesHistory   = [];
  if (!team.fes)          team.fes          = 5;
  if (!team.fesLowStreak) team.fesLowStreak = 0;
  if (!team.fanEvents)    team.fanEvents    = { meetGreet: 0, arenaEvent: 0, roadShow: 0 }; // lastWeek
  if (!team.fanEventWeek) team.fanEventWeek = null; // event triggered this week bonus
}

function _initCoStreamDeals() {
  if (!G.coStreamDeals) G.coStreamDeals = { available: [], active: [] };
  // Regenerate available deals if pool is empty
  if (G.coStreamDeals.available.length === 0) {
    const activeIds = G.coStreamDeals.active.map(d => d.id);
    const pool = CO_STREAM_DEAL_POOL.filter(d => !activeIds.includes(d.id));
    // Offer 2-3 random deals
    const count = Math.min(3, pool.length);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    G.coStreamDeals.available = shuffled.slice(0, count).map(d => ({ ...d, expiresWeek: G.season.week + 4 }));
  }
}

function acceptCoStreamDeal(dealId) {
  if (!G.coStreamDeals) return false;
  const idx = G.coStreamDeals.available.findIndex(d => d.id === dealId);
  if (idx === -1) return false;
  const deal = G.coStreamDeals.available.splice(idx, 1)[0];
  G.coStreamDeals.active.push({ ...deal, weeksRemaining: deal.durationWeeks });
  addNews(`Co-streaming deal signed: ${deal.partner} — +${deal.fesPerWeek} FES/wk for ${deal.durationWeeks} weeks.`, 'info');
  return true;
}

function cancelCoStreamDeal(dealId) {
  if (!G.coStreamDeals) return;
  G.coStreamDeals.active = G.coStreamDeals.active.filter(d => d.id !== dealId);
}

function hostFanEvent(eventKey) {
  const def = FAN_EVENT_DEFS[eventKey];
  if (!def) return { ok: false, msg: 'Unknown event type' };
  const team = G.teams[G.humanTeamId];
  _initFanState(team);
  const week = G.season.week;
  const lastWeek = team.fanEvents[eventKey] || 0;
  if (week - lastWeek < def.cooldownWeeks) {
    const remaining = def.cooldownWeeks - (week - lastWeek);
    return { ok: false, msg: `On cooldown for ${remaining} more week(s)` };
  }
  if (team.budget < def.cost) {
    return { ok: false, msg: 'Insufficient budget' };
  }
  team.budget -= def.cost;
  team.fanEvents[eventKey] = week;
  team.fanEventWeek = { key: eventKey, bonus: def.fesBonus, week };
  if (def.trainingBlock > 0) {
    G.weeklyTraining = 'rest'; // override training — team is busy with event
    addNews(`${def.label} scheduled this week — training replaced with recovery.`, 'info');
  }
  addNews(`${def.label} hosted! Fan engagement boost incoming. Cost: ${fmtMoneySafe(def.cost)}.`, 'info');
  return { ok: true };
}

function calcFES(teamId) {
  const team = G.teams[teamId];
  if (!team) return 5;
  _initFanState(team);
  let fes = -0.5; // base negative (must work to keep fans)

  // Streaming contributions
  POSITIONS.forEach(pos => {
    const p = team.roster[pos] ? G.players[team.roster[pos]] : null;
    if (!p || !p.streaming?.active) return;
    const schedule = p.streaming.schedule || 'casual';
    fes += schedule === 'heavy' ? 0.8 : 0.3;
    // Morale effect of streaming
    const condition = schedule === 'heavy' ? -0.6 : -0.1;
    p.morale = Math.max(1, p.morale + condition + 0.5);
  });

  // Marketing staff contribution
  const marketing = (G.staff || []).find(s => s.role === 'marketing');
  if (marketing) {
    const contProd = marketing.attrs?.contentProduction ?? marketing.stat ?? 10;
    fes += (contProd / 20) * 2.0; // 0–2.0 range based on stat
  }

  // Active co-streaming deals
  if (G.coStreamDeals) {
    G.coStreamDeals.active.forEach(d => { fes += d.fesPerWeek; });
  }

  // Fan event this week
  if (team.fanEventWeek && team.fanEventWeek.week === G.season.week) {
    fes += team.fanEventWeek.bonus;
  }

  // Match result bonus (applied separately in advanceWeek via _applyMatchFESBonus)
  const matchBonus = team._fesMatchBonus || 0;
  fes += matchBonus;
  team._fesMatchBonus = 0; // consume

  return Math.max(0, Math.min(10, Math.round(fes * 10) / 10));
}

function processFanEngagement(teamId) {
  const team = G.teams[teamId];
  if (!team) return;
  _initFanState(team);
  _initCoStreamDeals();

  // Compute FES
  const fes = calcFES(teamId);
  team.fes = fes;

  // Track history (keep 8 weeks)
  team.fanHistory.push(team.fans);
  team.fesHistory.push(fes);
  if (team.fanHistory.length > 8) team.fanHistory.shift();
  if (team.fesHistory.length > 8) team.fesHistory.shift();

  // Fan change based on FES
  let pct;
  if      (fes >= 8) pct = 0.03 + Math.random() * 0.03;
  else if (fes >= 5) pct = 0.005 + Math.random() * 0.015;
  else if (fes >= 3) pct = -(0.002 + Math.random() * 0.003);
  else               pct = -(0.01  + Math.random() * 0.02);

  team.fans = Math.max(1000, Math.round(team.fans * (1 + pct)));

  // Crisis alert tracking
  if (fes < 2) {
    team.fesLowStreak = (team.fesLowStreak || 0) + 1;
    if (team.fesLowStreak >= 3) {
      addNews('Fan engagement crisis: Your audience is disengaged. Stream more, host events, or hire a Marketing Manager.', 'alert');
      team.fesLowStreak = 0; // reset so it doesn't spam every week
    }
  } else {
    team.fesLowStreak = 0;
  }

  // Advance active co-streaming deals
  if (G.coStreamDeals) {
    G.coStreamDeals.active = G.coStreamDeals.active.filter(d => {
      d.weeksRemaining--;
      if (d.weeksRemaining <= 0) {
        addNews(`Co-streaming deal with ${d.partner} has ended.`, 'info');
        return false;
      }
      // Deduct weekly cost
      if (d.costPerWeek > 0) team.budget -= d.costPerWeek;
      return true;
    });

    // Expire available deals that weren't accepted
    G.coStreamDeals.available = G.coStreamDeals.available.filter(d => d.expiresWeek > G.season.week);

    // Occasionally refresh available deals (every 3 weeks or when empty)
    if (G.coStreamDeals.available.length === 0 || G.season.week % 3 === 0) {
      const activeIds = G.coStreamDeals.active.map(d => d.id);
      const usedIds   = [...activeIds];
      const pool = CO_STREAM_DEAL_POOL.filter(d => !usedIds.includes(d.id));
      if (pool.length > 0) {
        const count = Math.min(2, pool.length);
        const shuffled = pool.sort(() => Math.random() - 0.5);
        const newDeals = shuffled.slice(0, count).map(d => ({ ...d, expiresWeek: G.season.week + 4 }));
        // Only add deals not already available
        const existIds = G.coStreamDeals.available.map(d => d.id);
        newDeals.forEach(d => { if (!existIds.includes(d.id)) G.coStreamDeals.available.push(d); });
      }
    }
  }
}

// ─── Chemistry ───────────────────────────────────────────────────────────────

function calcChemistry(teamId) {
  const team = G.teams[teamId];
  if (!team) return 5;
  const players = POSITIONS.map(pos => team.roster[pos] ? G.players[team.roster[pos]] : null).filter(Boolean);
  if (!players.length) return 5;
  const avgMorale = players.reduce((s, p) => s + (p.morale || 5), 0) / players.length;
  // Personality compatibility bonus
  const personalities = players.map(p => p.personality || 'pro');
  const leaders   = personalities.filter(p => p === 'leader').length;
  const mavericks = personalities.filter(p => p === 'maverick').length;
  const compatBonus = leaders * 0.3 - mavericks * 0.2;
  return Math.min(10, Math.max(1, Math.round((avgMorale + compatBonus) * 10) / 10));
}

// ─── Sponsor bonuses ─────────────────────────────────────────────────────────

function _checkSponsorBonuses(teamId) {
  const t = G.teams[teamId];
  if (!t || !t.sponsors) return;
  t.sponsors.forEach(sp => {
    sp.bonuses.forEach(b => {
      if (b.paid) return;
      let earned = false;
      if (b.condition === 'wins_3'   && t.wins >= 3) earned = true;
      if (b.condition === 'wins_5'   && t.wins >= 5) earned = true;
      if (b.condition === 'playoffs' && G.season.phase === 'playoffs') earned = true;
      if (b.condition === 'champion' && G.season.champion === teamId) earned = true;
      if (b.condition === 'fans_500k' && t.fans >= 500000) earned = true;
      if (b.condition === 'fans_1m'   && t.fans >= 1000000) earned = true;
      if (earned) {
        b.paid = true;
        t.budget += b.reward;
        addNews(`Sponsor bonus unlocked: ${sp.name} — "${b.label}" (+${fmtMoneySafe(b.reward)})`, 'info');
      }
    });
  });
}

// ─── Fan milestones ───────────────────────────────────────────────────────────

function _checkFanMilestones(teamId) {
  const t = G.teams[teamId];
  const fm = G.fanMilestones;
  if (!t || !fm) return;
  const fans = t.fans;
  if (!fm.m100k && fans >= 100000)  { fm.m100k = true; addNews('Milestone: 100K fans! Mid-tier sponsors now available.', 'info'); }
  if (!fm.m250k && fans >= 250000)  { fm.m250k = true; addNews('Milestone: 250K fans! Fan events unlocked.', 'info'); }
  if (!fm.m500k && fans >= 500000)  { fm.m500k = true; addNews('Milestone: 500K fans! Top sponsors are watching.', 'info'); t.morale = Math.min(10, (t.morale || 7) + 0.5); }
  if (!fm.m1m   && fans >= 1000000) { fm.m1m   = true; addNews('Milestone: 1 MILLION fans! Regional celebrity status.', 'info'); }
  if (!fm.m2m   && fans >= 2000000) { fm.m2m   = true; addNews('Milestone: 2 MILLION fans! National celebrity status!', 'info'); }
}

// ─── Scouting ────────────────────────────────────────────────────────────────

function startScouting() {
  if (!G || !G.scouting) return 'error';
  if (G.scouting.activeScout) return 'already_active';
  const undiscovered = SCOUT_POOL.filter(p => !p.discovered && !G.scouting.discovered.includes(p.id));
  if (!undiscovered.length) return 'none_left';
  const cost = 50000;
  if (G.teams[G.humanTeamId].budget < cost) return 'no_budget';
  G.teams[G.humanTeamId].budget -= cost;
  G.scouting.activeScout = { targetId: undiscovered[Math.floor(Math.random() * undiscovered.length)].id, weeksLeft: 1 };
  return 'started';
}

// ─── Player development ───────────────────────────────────────────────────────

function processPlayerDevelopment() {
  Object.values(G.players).forEach(p => {
    if (!p) return;
    const moraleBonus = p.morale > 7 ? 1.5 : p.morale < 4 ? 0.5 : 1;

    // Young players (<22): chance to improve (head coach + youth_mentor trait boosts rate)
    if (p.age < 22) {
      const coachBonus  = getStaffBonus('headcoach');
      const mentorBonus = hasManagerTrait('youth_mentor') ? 0.5 : 0;
      const allStats = Object.keys(p.stats);
      if (Math.random() < (0.08 + coachBonus * 0.5 + mentorBonus) * moraleBonus) {
        const stat = allStats[Math.floor(Math.random()*allStats.length)];
        const old = p.stats[stat];
        p.stats[stat] = Math.min(20, p.stats[stat] + 1);
        // Grant XP for developing a player
        if (p.stats[stat] > old && p.teamId === G.humanTeamId) grantManagerXP(5, null);
      }
    }

    // Veterans (>28): slight chance to decline (veteran_handler halves it)
    if (p.age > 28) {
      const declineChance = hasManagerTrait('veteran_handler') ? 0.02 : 0.04;
      const allStats = Object.keys(p.stats);
      if (Math.random() < declineChance) {
        const stat = allStats[Math.floor(Math.random()*allStats.length)];
        p.stats[stat] = Math.max(1, p.stats[stat] - 1);
      }
    }
  });
}

function getWeekMatches(week) {
  return G.season.schedule.filter(m => m.week === week);
}

function simulateAIMatch(match) {
  const home = G.teams[match.homeId];
  const away = G.teams[match.awayId];
  if (!home || !away) return;

  const homePlayers = getActiveRoster(match.homeId);
  const awayPlayers = getActiveRoster(match.awayId);
  const needed = match.format === 'bo5' ? 3 : 2;
  let homeWins = 0, awayWins = 0;

  while (homeWins < needed && awayWins < needed) {
    const r = quickSimulateMatch(homePlayers, awayPlayers);
    if (r === 'blue') homeWins++; else awayWins++;
    match.games.push({ winner: r === 'blue' ? match.homeId : match.awayId });
  }

  const homeWon = homeWins > awayWins;
  match.played  = true;
  match.homeWins = homeWins;
  match.awayWins = awayWins;
  match.result   = { winnerId: homeWon ? match.homeId : match.awayId, score: `${homeWins}-${awayWins}` };

  const winner = homeWon ? home : away;
  const loser  = homeWon ? away : home;
  winner.wins++;   winner.points += 3;
  loser.losses++;

  _applyFanChange(match.homeId, homeWon);
  _applyFanChange(match.awayId, !homeWon);
}

// ─── Playoffs ─────────────────────────────────────────────────────────────────

function buildPlayoffs() {
  const standings = getStandings();
  const top4 = standings.slice(0, 4);
  // Seeding: 1 vs 4, 2 vs 3 (then final)
  const sf1 = { week: G.season.totalWeeks + 1, homeId: top4[0].id, awayId: top4[3].id, played: false, format: 'bo5', homeWins: 0, awayWins: 0, games: [], result: null, isPlayoff: true, round: 'semi1' };
  const sf2 = { week: G.season.totalWeeks + 1, homeId: top4[1].id, awayId: top4[2].id, played: false, format: 'bo5', homeWins: 0, awayWins: 0, games: [], result: null, isPlayoff: true, round: 'semi2' };
  const gf  = { week: G.season.totalWeeks + 2, homeId: null,       awayId: null,        played: false, format: 'bo5', homeWins: 0, awayWins: 0, games: [], result: null, isPlayoff: true, round: 'final' };
  G.season.playoffMatches = [sf1, sf2, gf];
  G.season.phase = 'playoffs';
  G.season.playoffWeek = G.season.totalWeeks + 1;
  addNews(`The regular season is over! The top 4 teams advance to the playoffs: ${top4.map(t=>t.name).join(', ')}.`, 'info');
}

function _advancePlayoffs() {
  const pm = G.season.playoffMatches;
  if (!pm) return;

  // Resolve semi-finals first
  const sf1 = pm.find(m => m.round === 'semi1');
  const sf2 = pm.find(m => m.round === 'semi2');
  const gf  = pm.find(m => m.round === 'final');

  // Simulate unplayed semis that don't involve human
  [sf1, sf2].forEach(sf => {
    if (!sf.played && sf.homeId !== G.humanTeamId && sf.awayId !== G.humanTeamId) {
      simulateAIMatch(sf);
    }
  });

  // If both semis done, set up final
  if (sf1.played && sf2.played && !gf.homeId) {
    gf.homeId = sf1.result.winnerId;
    gf.awayId = sf2.result.winnerId;
    addNews(`${G.teams[gf.homeId].name} vs ${G.teams[gf.awayId].name} in the Grand Final!`, 'info');
  }

  // Simulate final if it doesn't involve human
  if (gf.homeId && !gf.played && gf.homeId !== G.humanTeamId && gf.awayId !== G.humanTeamId) {
    simulateAIMatch(gf);
  }

  // Check if all done
  if (gf.played) {
    const champ = G.teams[gf.result.winnerId];
    addNews(`${champ.name} are the ${G.season.split === 'spring' ? 'Spring' : 'Summer'} Split ${G.season.year} Champions!`, 'match');
    G.season.phase = 'offseason';
    G.season.champion = gf.result.winnerId;
  }
}

// ─── Multi-season ─────────────────────────────────────────────────────────────

function startNewSeason() {
  const { year, split } = G.season;
  const nextSplit = split === 'spring' ? 'summer' : 'spring';
  const nextYear  = split === 'summer' ? year + 1 : year;

  // Reset team records
  Object.values(G.teams).forEach(t => {
    t.wins = 0; t.losses = 0; t.points = 0;
  });

  // Age all players +1 if starting a new year
  if (nextSplit === 'spring') {
    Object.values(G.players).forEach(p => { p.age++; });
  }

  G.season = buildSeason(nextYear, nextSplit);
  addNews(`The ${nextSplit === 'spring' ? 'Spring' : 'Summer'} Split ${nextYear} begins!`, 'info');
  grantManagerXP(150, 'Season completed');
  G.weeklyTraining = 'rest';
  saveGame();
  renderAll();
}

function getActiveRoster(teamId) {
  const team = G.teams[teamId];
  if (!team) return [];
  return POSITIONS.map(pos => {
    const pid = team.roster[pos];
    return pid ? G.players[pid] : null;
  });
}

// Quick sim for AI matches (no PBP needed)
function quickSimulateMatch(homePlayers, awayPlayers) {
  const homeScore = homePlayers.reduce((s, p) => s + (p ? calcOverall(p) : 50), 0);
  const awayScore = awayPlayers.reduce((s, p) => s + (p ? calcOverall(p) : 50), 0);
  const diff      = homeScore - awayScore;
  const homeWinPct = Math.min(85, Math.max(15, 50 + diff * 0.5));
  return Math.random() * 100 < homeWinPct ? 'blue' : 'red';
}

// ─── Standings ────────────────────────────────────────────────────────────────

function getStandings() {
  return Object.values(G.teams)
    .map(t => ({ id: t.id, name: t.name, shortName: t.shortName, color: t.color,
                 isHuman: t.isHuman, wins: t.wins, losses: t.losses, points: t.points }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

// ─── Weekly news generation ──────────────────────────────────────────────────

function _generateWeeklyNews(week) {
  const team = G.teams[G.humanTeamId];
  if (!team) return;

  // Contract expiry warnings (once per player)
  POSITIONS.forEach(pos => {
    const p = team.roster[pos] ? G.players[team.roster[pos]] : null;
    if (!p) return;
    if (p.contract.yearsLeft <= 1 && !p._contractWarned) {
      p._contractWarned = true;
      addNews(`${p.name}'s contract expires at the end of this season. Consider renewal or finding a replacement.`, 'alert');
    }
  });

  // Morale warnings (fire once per dip below 4, reset when they recover)
  POSITIONS.forEach(pos => {
    const p = team.roster[pos] ? G.players[team.roster[pos]] : null;
    if (!p) return;
    if (p.morale < 4 && !p._moraleWarned) {
      p._moraleWarned = true;
      addNews(`${p.name} is deeply unhappy (morale ${p.morale.toFixed(1)}/10). This will hurt their performance.`, 'alert');
    } else if (p.morale >= 6) {
      p._moraleWarned = false;
    }
  });

  // High-morale team news
  const starters = POSITIONS.map(pos => team.roster[pos] ? G.players[team.roster[pos]] : null).filter(Boolean);
  const avgMorale = starters.length ? starters.reduce((s, p) => s + p.morale, 0) / starters.length : 0;
  if (avgMorale >= 8.5 && week % 2 === 0) {
    addNews(`Team spirit is excellent (avg morale ${avgMorale.toFixed(1)}/10). The squad is motivated and focused.`, 'info');
  }

  // Win streak milestones
  if (team.wins >= 3 && team.wins % 3 === 0 && team.losses === 0) {
    addNews(`${team.name} are on a perfect ${team.wins}-win run this split. The Verdant League is taking notice.`, 'info');
  }

  // Random league headline (rival results)
  const rivals = Object.values(G.teams).filter(t => t.id !== G.humanTeamId && t.wins > 0);
  if (rivals.length && week % 3 === 0) {
    rivals.sort((a, b) => b.wins - a.wins);
    const top = rivals[0];
    addNews(`League Watch: ${top.name} continue to impress with a ${top.wins}W–${top.losses}L record.`, 'info');
  }
}

// ─── News ─────────────────────────────────────────────────────────────────────

function addNews(text, type = 'info') {
  G.news.unshift({ text, type, week: G.season.week, timestamp: Date.now() });
  if (G.news.length > 50) G.news.pop();
}

// ─── Internal format helpers ──────────────────────────────────────────────────

function fmtMoneySafe(n) {
  const abs = Math.abs(n || 0), sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs/1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs/1e3)}K`;
  return `${sign}$${abs}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function posLabel(pos) {
  return { top:'Top', jungle:'Jungle', mid:'Mid', adc:'ADC', support:'Support' }[pos] || pos;
}

function randomPlaystyle() {
  const keys = Object.keys(PLAYSTYLES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function getHumanTeam()   { return G.teams[G.humanTeamId]; }
function getHumanRoster() { return getActiveRoster(G.humanTeamId); }

function getWeekLabel() {
  const { week, split, year, phase } = G.season;
  if (phase === 'playoffs')  return `Playoffs — ${year}`;
  if (phase === 'offseason') return `Offseason — ${year}`;
  return `Week ${week} — ${split === 'spring' ? 'Spring' : 'Summer'} Split ${year}`;
}

// ─── Save / Load ──────────────────────────────────────────────────────────────

function saveGame() {
  if (!G) return;
  try {
    localStorage.setItem('grove-manager-save-v1', JSON.stringify(G));
  } catch(e) { console.warn('Save failed:', e); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('grove-manager-save-v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(e) { return null; }
}

function hasSave() {
  return !!localStorage.getItem('grove-manager-save-v1');
}

function deleteSave() {
  localStorage.removeItem('grove-manager-save-v1');
}
