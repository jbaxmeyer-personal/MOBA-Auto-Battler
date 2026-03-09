// js/data/players.js — Pro players with traits
// Balance pass: Phantom nerfed (no more 774-stat outlier), IronKing T5→T4,
// Specter (Korea mid) moved to SEA as "Prism", Legend promoted T4→T5 (NA),
// Anchor reduced to T4, Sage promoted T3→T4, all T2–T3 players slightly buffed,
// region distribution: Korea max 3 T5s (jg/mid/adc), NA gets first T5 (top/adc)
// SA renamed to LATAM; T0 Rookie Starter Pack added; T1–T3 new players added.

// ─── T0 STARTER PACK (not in pool, given at game start) ──────────────────────
const STARTER_PACK = [
  { id:'s-top', name:'Rookie Top',     position:'top',     tier:0, region:null, traits:[], champions:['Garen','Malphite'],       bio:'A fresh prospect just starting their pro career.', stars:1,
    stats:{mechanics:28,laning:30,gameSense:26,teamfighting:28,communication:25,clutch:26,consistency:30,draftIQ:24} },
  { id:'s-jg',  name:'Rookie Jungler', position:'jungle',  tier:0, region:null, traits:[], champions:['Warwick','Amumu'],         bio:'Learning the art of objective control.', stars:1,
    stats:{mechanics:26,laning:24,gameSense:28,teamfighting:30,communication:26,clutch:28,consistency:28,draftIQ:24} },
  { id:'s-mid', name:'Rookie Mid',     position:'mid',     tier:0, region:null, traits:[], champions:['Annie','Lux'],             bio:'Building fundamentals in the mid lane.', stars:1,
    stats:{mechanics:30,laning:30,gameSense:26,teamfighting:26,communication:24,clutch:26,consistency:28,draftIQ:26} },
  { id:'s-adc', name:'Rookie ADC',     position:'adc',     tier:0, region:null, traits:[], champions:['Ashe','Caitlyn'],          bio:'Learning to farm and position safely.', stars:1,
    stats:{mechanics:28,laning:28,gameSense:26,teamfighting:28,communication:28,clutch:26,consistency:30,draftIQ:24} },
  { id:'s-sup', name:'Rookie Support', position:'support', tier:0, region:null, traits:[], champions:['Soraka','Blitzcrank'],     bio:'Keeping the team alive from the bottom lane.', stars:1,
    stats:{mechanics:24,laning:26,gameSense:28,teamfighting:28,communication:32,clutch:24,consistency:28,draftIQ:26} },
];

const PLAYER_TEMPLATES = [

  // ─── TOP LANERS ───────────────────────────────────────────────
  {
    id: 'p01', name: 'IronKing', position: 'top', tier: 4, region: 'Korea',
    champions: ['Renekton', 'Camille', 'Gnar'],
    traits: ['Carry', 'Mechanical'],
    bio: 'Dominant lane bully, world-class mechanics and laning.',
    stats: { mechanics:84, laning:88, gameSense:78, teamfighting:76, communication:72, clutch:84, consistency:86, draftIQ:78 }
  },
  {
    id: 'p02', name: 'Fortress', position: 'top', tier: 4, region: 'EU',
    champions: ['Jayce', 'Gnar', 'Fiora'],
    traits: ['Macro', 'Veteran'],
    bio: 'Smart, versatile top laner with elite game sense.',
    stats: { mechanics:78, laning:80, gameSense:86, teamfighting:74, communication:80, clutch:72, consistency:84, draftIQ:90 }
  },
  {
    id: 'p03', name: 'Summit', position: 'top', tier: 5, region: 'NA',
    champions: ['Irelia', 'Riven', 'Fiora'],
    traits: ['Mechanical', 'Playmaker'],
    bio: 'Mechanical god — the best top laner NA has ever produced.',
    stats: { mechanics:90, laning:86, gameSense:70, teamfighting:72, communication:62, clutch:94, consistency:68, draftIQ:70 }
  },
  {
    id: 'p04', name: 'DragonFist', position: 'top', tier: 4, region: 'China',
    champions: ['Renekton', 'Wukong', 'Darius'],
    traits: ['Fragger', 'Carry'],
    bio: 'Aggressive teamfighter who loves to initiate.',
    stats: { mechanics:75, laning:80, gameSense:75, teamfighting:90, communication:80, clutch:72, consistency:78, draftIQ:72 }
  },
  {
    id: 'p05', name: 'Colossus', position: 'top', tier: 2, region: 'SEA',
    champions: ['Malphite', 'Ornn', 'Garen'],
    traits: ['Utility', 'Veteran'],
    bio: 'Reliable tank specialist, great for engage comps.',
    stats: { mechanics:46, laning:50, gameSense:58, teamfighting:60, communication:68, clutch:46, consistency:62, draftIQ:54 }
  },
  {
    id: 'p06', name: 'Vanguard', position: 'top', tier: 2, region: 'LATAM',
    champions: ['Garen', 'Nasus', 'Mordekaiser'],
    traits: ['Veteran', 'Utility'],
    bio: 'Consistent player with improving game sense.',
    stats: { mechanics:42, laning:52, gameSense:54, teamfighting:57, communication:58, clutch:44, consistency:66, draftIQ:50 }
  },

  // ─── JUNGLERS ─────────────────────────────────────────────────
  {
    id: 'p07', name: 'PhantomStep', position: 'jungle', tier: 5, region: 'Korea',
    champions: ['Lee Sin', "Rek'Sai", 'Nidalee'],
    traits: ['Mechanical', 'Playmaker'],
    bio: 'The most mechanically gifted jungler in the world.',
    stats: { mechanics:92, laning:80, gameSense:90, teamfighting:84, communication:80, clutch:90, consistency:84, draftIQ:88 }
  },
  {
    id: 'p08', name: 'WildCard', position: 'jungle', tier: 4, region: 'EU',
    champions: ['Elise', 'Evelynn', 'Hecarim'],
    traits: ['Playmaker', 'Fragger'],
    bio: 'Unpredictable, high-impact carry jungler.',
    stats: { mechanics:84, laning:70, gameSense:80, teamfighting:78, communication:68, clutch:86, consistency:64, draftIQ:76 }
  },
  {
    id: 'p09', name: 'Cyclone', position: 'jungle', tier: 4, region: 'China',
    champions: ['Jarvan IV', 'Vi', 'Xin Zhao'],
    traits: ['Fragger', 'Utility'],
    bio: 'Teamfight-focused jungler who excels at five-man engages.',
    stats: { mechanics:74, laning:68, gameSense:80, teamfighting:92, communication:84, clutch:72, consistency:78, draftIQ:74 }
  },
  {
    id: 'p10', name: 'Volt', position: 'jungle', tier: 3, region: 'NA',
    champions: ['Olaf', 'Vi', 'Jarvan IV'],
    traits: ['Fragger', 'Playmaker'],
    bio: 'Aggressive win-condition jungler with high clutch.',
    stats: { mechanics:68, laning:62, gameSense:70, teamfighting:74, communication:64, clutch:82, consistency:62, draftIQ:62 }
  },
  {
    id: 'p11', name: 'Raptor', position: 'jungle', tier: 3, region: 'SEA',
    champions: ['Lee Sin', "Kha'Zix", 'Rengar'],
    traits: ['Mechanical', 'Fragger'],
    bio: 'High-mechanical assassin jungler, feast or famine.',
    stats: { mechanics:78, laning:62, gameSense:62, teamfighting:64, communication:54, clutch:76, consistency:52, draftIQ:58 }
  },
  {
    id: 'p12', name: 'AncientOne', position: 'jungle', tier: 2, region: 'LATAM',
    champions: ['Amumu', 'Sejuani', 'Zac'],
    traits: ['Utility', 'Macro'],
    bio: 'Reliable engage jungler, brings the team together.',
    stats: { mechanics:42, laning:40, gameSense:58, teamfighting:62, communication:66, clutch:42, consistency:60, draftIQ:52 }
  },

  // ─── MID LANERS ───────────────────────────────────────────────
  {
    id: 'p13', name: 'Phantom', position: 'mid', tier: 5, region: 'Korea',
    champions: ['Azir', 'Orianna', 'Viktor'],
    traits: ['Carry', 'Shotcaller'],
    bio: 'Widely considered the greatest LoL player alive — vision, mechanics, leadership.',
    stats: { mechanics:92, laning:88, gameSense:94, teamfighting:88, communication:84, clutch:90, consistency:90, draftIQ:90 }
  },
  {
    id: 'p14', name: 'Apex', position: 'mid', tier: 5, region: 'EU',
    champions: ['Syndra', 'Azir', 'Cassiopeia'],
    traits: ['Carry', 'Macro'],
    bio: 'World-class mid laner with unrivaled game sense.',
    stats: { mechanics:86, laning:83, gameSense:92, teamfighting:86, communication:84, clutch:80, consistency:88, draftIQ:92 }
  },
  {
    id: 'p15', name: 'Viper', position: 'mid', tier: 4, region: 'China',
    champions: ['Zoe', 'LeBlanc', 'Akali'],
    traits: ['Mechanical', 'Carry'],
    bio: 'Flashy mechanical outplay machine.',
    stats: { mechanics:90, laning:80, gameSense:74, teamfighting:72, communication:64, clutch:86, consistency:68, draftIQ:74 }
  },
  {
    id: 'p16', name: 'Nova', position: 'mid', tier: 3, region: 'NA',
    champions: ['Viktor', 'Orianna', 'Syndra'],
    traits: ['Macro', 'Carry'],
    bio: 'Solid mid laner with good fundamentals.',
    stats: { mechanics:70, laning:68, gameSense:76, teamfighting:70, communication:67, clutch:64, consistency:74, draftIQ:76 }
  },
  {
    id: 'p17', name: 'Prism', position: 'mid', tier: 3, region: 'SEA',
    champions: ['Zed', 'Yasuo', 'Akali'],
    traits: ['Mechanical', 'Fragger'],
    bio: 'High-ceiling assassin mid, inconsistent but explosive.',
    stats: { mechanics:80, laning:70, gameSense:60, teamfighting:62, communication:52, clutch:80, consistency:52, draftIQ:58 }
  },
  {
    id: 'p18', name: 'Blitz', position: 'mid', tier: 2, region: 'LATAM',
    champions: ['Lux', 'Vex', 'Annie'],
    traits: ['Carry', 'Utility'],
    bio: 'Up-and-coming talent with room to grow.',
    stats: { mechanics:50, laning:54, gameSense:52, teamfighting:50, communication:52, clutch:46, consistency:58, draftIQ:50 }
  },

  // ─── ADC ──────────────────────────────────────────────────────
  {
    id: 'p19', name: 'Blaze', position: 'adc', tier: 5, region: 'Korea',
    champions: ['Jinx', 'Jhin', 'Aphelios'],
    traits: ['Carry', 'Mechanical'],
    bio: 'Perfect mechanics and positioning — a god-tier ADC.',
    stats: { mechanics:92, laning:86, gameSense:84, teamfighting:90, communication:78, clutch:88, consistency:90, draftIQ:84 }
  },
  {
    id: 'p20', name: 'Dragon', position: 'adc', tier: 5, region: 'China',
    champions: ['Jinx', 'Kalista', 'Aphelios'],
    traits: ['Carry', 'Fragger'],
    bio: 'The most mechanically gifted ADC in China.',
    stats: { mechanics:92, laning:90, gameSense:80, teamfighting:90, communication:72, clutch:86, consistency:88, draftIQ:80 }
  },
  {
    id: 'p21', name: 'Valor', position: 'adc', tier: 4, region: 'EU',
    champions: ['Jhin', 'Miss Fortune', "Kai'Sa"],
    traits: ['Carry', 'Veteran'],
    bio: 'Stylish ADC with great laning and experience.',
    stats: { mechanics:80, laning:86, gameSense:78, teamfighting:78, communication:76, clutch:78, consistency:86, draftIQ:80 }
  },
  {
    id: 'p22', name: 'Legend', position: 'adc', tier: 5, region: 'NA',
    champions: ['Tristana', 'Ezreal', 'Xayah'],
    traits: ['Carry', 'Playmaker'],
    bio: 'Veteran ADC with legendary clutch factor and NA pride.',
    stats: { mechanics:86, laning:84, gameSense:80, teamfighting:80, communication:80, clutch:92, consistency:84, draftIQ:82 }
  },
  {
    id: 'p23', name: 'Crest', position: 'adc', tier: 3, region: 'LATAM',
    champions: ['Draven', 'Lucian', 'Jinx'],
    traits: ['Fragger', 'Carry'],
    bio: 'Aggressive lane bully who dominates early game.',
    stats: { mechanics:76, laning:82, gameSense:62, teamfighting:64, communication:56, clutch:74, consistency:56, draftIQ:60 }
  },
  {
    id: 'p24', name: 'Flash', position: 'adc', tier: 2, region: 'SEA',
    champions: ['Caitlyn', 'Sivir', 'Ashe'],
    traits: ['Carry', 'Utility'],
    bio: 'Safe, scaling ADC who relies on his support.',
    stats: { mechanics:50, laning:58, gameSense:54, teamfighting:52, communication:58, clutch:46, consistency:64, draftIQ:52 }
  },

  // ─── SUPPORT ──────────────────────────────────────────────────
  {
    id: 'p25', name: 'Anchor', position: 'support', tier: 4, region: 'Korea',
    champions: ['Thresh', 'Nautilus', 'Blitzcrank'],
    traits: ['Utility', 'Playmaker'],
    bio: 'World-class playmaker with incredible hook accuracy.',
    stats: { mechanics:80, laning:72, gameSense:82, teamfighting:84, communication:90, clutch:80, consistency:82, draftIQ:82 }
  },
  {
    id: 'p26', name: 'Oracle', position: 'support', tier: 4, region: 'EU',
    champions: ['Thresh', 'Soraka', 'Lulu'],
    traits: ['Macro', 'Utility'],
    bio: 'Vision control master with elite game sense.',
    stats: { mechanics:72, laning:78, gameSense:92, teamfighting:80, communication:88, clutch:70, consistency:86, draftIQ:90 }
  },
  {
    id: 'p27', name: 'Monk', position: 'support', tier: 4, region: 'China',
    champions: ['Karma', 'Lulu', 'Yuumi'],
    traits: ['Utility', 'Macro'],
    bio: 'Enchanter specialist who amplifies his ADC.',
    stats: { mechanics:70, laning:76, gameSense:82, teamfighting:84, communication:92, clutch:68, consistency:86, draftIQ:84 }
  },
  {
    id: 'p28', name: 'Sage', position: 'support', tier: 4, region: 'NA',
    champions: ['Thresh', 'Blitzcrank', 'Pyke'],
    traits: ['Playmaker', 'Shotcaller'],
    bio: 'Veteran hook-support who calls the shots and enables his ADC.',
    stats: { mechanics:72, laning:66, gameSense:72, teamfighting:72, communication:76, clutch:80, consistency:62, draftIQ:68 }
  },
  {
    id: 'p29', name: 'Guardian', position: 'support', tier: 2, region: 'SEA',
    champions: ['Soraka', 'Janna', 'Nami'],
    traits: ['Utility', 'Veteran'],
    bio: 'Passive healer who keeps his team alive.',
    stats: { mechanics:42, laning:50, gameSense:58, teamfighting:54, communication:68, clutch:42, consistency:64, draftIQ:54 }
  },
  {
    id: 'p30', name: 'Shield', position: 'support', tier: 2, region: 'LATAM',
    champions: ['Lulu', 'Soraka', 'Braum'],
    traits: ['Utility', 'Veteran'],
    bio: 'Developing enchanter with potential to grow.',
    stats: { mechanics:38, laning:46, gameSense:52, teamfighting:52, communication:64, clutch:40, consistency:62, draftIQ:50 }
  },

  // ─── T1 PLAYERS ───────────────────────────────────────────────
  { id:'p31', name:'Gravel',  position:'top',     tier:1, region:'LATAM', traits:['Veteran','Utility'],   champions:['Garen','Mordekaiser','Nasus'],    bio:'Gritty LATAM top laner with raw determination.', stars:1,
    stats:{mechanics:42,laning:44,gameSense:40,teamfighting:44,communication:42,clutch:38,consistency:46,draftIQ:38} },
  { id:'p32', name:'Wisp',    position:'jungle',  tier:1, region:'SEA',   traits:['Fragger','Mechanical'],champions:['Warwick','Xin Zhao','Udyr'],      bio:'SEA jungle prodigy with aggressive instincts.', stars:1,
    stats:{mechanics:46,laning:38,gameSense:40,teamfighting:42,communication:36,clutch:48,consistency:38,draftIQ:36} },
  { id:'p33', name:'Static',  position:'mid',     tier:1, region:'LATAM', traits:['Carry','Utility'],     champions:['Lux','Annie','Brand'],            bio:'LATAM mid laner with solid lane fundamentals.', stars:1,
    stats:{mechanics:44,laning:46,gameSense:40,teamfighting:40,communication:40,clutch:40,consistency:44,draftIQ:40} },
  { id:'p34', name:'Pebble',  position:'adc',     tier:1, region:'SEA',   traits:['Carry','Veteran'],     champions:['Ashe','Sivir','Miss Fortune'],    bio:'Reliable SEA ADC who plays safe and scales.', stars:1,
    stats:{mechanics:42,laning:46,gameSense:40,teamfighting:42,communication:40,clutch:38,consistency:48,draftIQ:38} },
  { id:'p35', name:'Tide',    position:'support', tier:1, region:'LATAM', traits:['Utility','Macro'],     champions:['Soraka','Nami','Sona'],           bio:'Soft-spoken LATAM support with great fundamentals.', stars:1,
    stats:{mechanics:36,laning:40,gameSense:44,teamfighting:42,communication:48,clutch:34,consistency:44,draftIQ:40} },
  { id:'p36', name:'Flicker', position:'jungle',  tier:1, region:'NA',    traits:['Playmaker','Fragger'], champions:['Vi','Olaf','Hecarim'],            bio:'NA jungle talent with high-energy playstyle.', stars:1,
    stats:{mechanics:44,laning:38,gameSense:42,teamfighting:46,communication:38,clutch:46,consistency:36,draftIQ:38} },

  // ─── T2 NEW PLAYERS ───────────────────────────────────────────
  { id:'p37', name:'Ironside', position:'top',     tier:2, region:'NA',    traits:['Mechanical','Veteran'], champions:['Malphite','Ornn','Gnar'],      bio:'Steady NA top laner with a knack for teamfights.', stars:1,
    stats:{mechanics:50,laning:52,gameSense:50,teamfighting:56,communication:48,clutch:48,consistency:54,draftIQ:46} },
  { id:'p38', name:'Ember',    position:'jungle',  tier:2, region:'China', traits:['Fragger','Utility'],    champions:['Jarvan IV','Hecarim','Zac'],   bio:'Scrappy Chinese jungler developing his macro.', stars:1,
    stats:{mechanics:48,laning:44,gameSense:52,teamfighting:58,communication:54,clutch:46,consistency:52,draftIQ:48} },
  { id:'p39', name:'Aria',     position:'support', tier:2, region:'EU',    traits:['Utility','Shotcaller'], champions:['Lulu','Karma','Janna'],        bio:'EU support with strong voice and vision control.', stars:1,
    stats:{mechanics:44,laning:48,gameSense:54,teamfighting:50,communication:60,clutch:42,consistency:54,draftIQ:52} },

  // ─── T3 NEW PLAYERS ───────────────────────────────────────────
  { id:'p40', name:'Titan',   position:'top',     tier:3, region:'China', traits:['Fragger','Veteran'],    champions:['Renekton','Darius','Wukong'],   bio:'Explosive Chinese top laner who thrives in extended fights.', stars:1,
    stats:{mechanics:68,laning:72,gameSense:62,teamfighting:78,communication:64,clutch:70,consistency:60,draftIQ:60} },
  { id:'p41', name:'Ghost',   position:'mid',     tier:3, region:'EU',    traits:['Macro','Shotcaller'],   champions:['Galio','Twisted Fate','Ryze'],  bio:'EU mid laner who dominates with vision and rotations.', stars:1,
    stats:{mechanics:62,laning:66,gameSense:80,teamfighting:70,communication:74,clutch:60,consistency:70,draftIQ:78} },
  { id:'p42', name:'Arrow',   position:'adc',     tier:3, region:'NA',    traits:['Carry','Mechanical'],   champions:['Ezreal','Lucian','Tristana'],   bio:'NA ADC with silky mechanics and big game moments.', stars:1,
    stats:{mechanics:74,laning:72,gameSense:62,teamfighting:66,communication:60,clutch:76,consistency:56,draftIQ:60} },
  { id:'p43', name:'Echo',    position:'support', tier:3, region:'Korea', traits:['Utility','Playmaker'],  champions:['Thresh','Rakan','Blitzcrank'],  bio:'Up-and-coming Korean support with elite engagement.', stars:1,
    stats:{mechanics:66,laning:60,gameSense:68,teamfighting:72,communication:76,clutch:74,consistency:58,draftIQ:64} },
  { id:'p44', name:'Rex',     position:'jungle',  tier:3, region:'LATAM', traits:['Fragger','Playmaker'],  champions:['Lee Sin','Rengar',"Kha'Zix"], bio:'LATAM jungle breakthrough — aggressive and creative.', stars:1,
    stats:{mechanics:70,laning:58,gameSense:62,teamfighting:68,communication:58,clutch:76,consistency:52,draftIQ:56} },
];

// Build the player pool: each player repeated by tier pool size (T0 excluded — only in STARTER_PACK)
function buildPlayerPool() {
  const pool = [];
  PLAYER_TEMPLATES.forEach(p => {
    if (p.tier === 0) return; // T0 only lives in STARTER_PACK
    const copies = CONFIG.TIER_POOL_SIZE[p.tier] || 0;
    for (let i = 0; i < copies; i++) {
      pool.push({ ...p, stats: { ...p.stats }, champions: [...p.champions], traits: [...p.traits] });
    }
  });
  return pool;
}

function getPlayerTemplate(id) {
  return PLAYER_TEMPLATES.find(p => p.id === id);
}

function createPlayerInstance(template) {
  return {
    ...template,
    stats:    { ...template.stats },
    champions: [...template.champions],
    traits:   [...(template.traits || [])],
    stars:    1,
    instanceId: Math.random().toString(36).substr(2, 9),
    champion: null,
  };
}

// Return fresh copies of the starter pack players with instance IDs
function getStarterPack() {
  return STARTER_PACK.map(p => ({
    ...p,
    stats: { ...p.stats },
    champions: [...p.champions],
    traits: [...p.traits],
    instanceId: Math.random().toString(36).substr(2, 9),
    champion: null,
  }));
}

// Get effective stats accounting for star level (no cap — 2★/3★ should be noticeably better)
function getEffectiveStats(player) {
  const mult = CONFIG.STAR_MULTIPLIER[player.stars] || 1;
  const s = {};
  for (const [k, v] of Object.entries(player.stats)) {
    s[k] = Math.round(v * mult);
  }
  return s;
}

function statTotal(player) {
  return Object.values(player.stats || {}).reduce((a, b) => a + b, 0);
}
