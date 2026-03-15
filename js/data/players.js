// js/data/players.js — Verdant League player database
// FM-style attributes 1-20: Technical + Mental
//
// position: 'top' | 'jungle' | 'mid' | 'adc' | 'support'
// playStyle: 'carry' | 'utility' | 'aggressive' | 'passive' | 'playmaker' | 'shotcaller' | 'flex'
//
// Stat guide by position:
//   top     — high mechanics, teamfightPositioning; lower csAccuracy
//   jungle  — high mapMovement, objectiveExecution; moderate all-round
//   mid     — high mechanics, csAccuracy, decisionMaking
//   adc     — high csAccuracy, mechanics, teamfightPositioning
//   support — high communication, gameSense, teamfightPositioning; low csAccuracy
//
// Champion pools reference names from champions.js (Phase 6).
//   top     : tanks/fighters — Bogveil, Ironsong, Thornwall, Deeproot, Ironbark,
//                              Stoneguard, Stormhide, Thornback, Sylvara, Briarvex
//   jungle  : assassins      — Shade, Hexwing, Fangwhisper, Driftblade
//   mid     : mages          — Wraithfern, Bombspore, Vaulthorn, Emberpyre, Spiritfox, Iceveil
//   adc     : marksmen       — Wildshot, Swiftarrow, Starshot, Duskwarden, Embervane
//   support : sentinels      — Darkblossom, Irongrasp, Stonewall, Tidecaller, Gravewarden
//
// career stats are initialised dynamically in state.js initGame().

function makeForm(avg, spread = 1) {
  return [1,2,3].map(() => Math.min(10, Math.max(1, Math.round(avg + (Math.random()-0.5)*spread*2))));
}

const PLAYER_DB = [

  // ══════════════════════════════════════════════════════════════════════════════
  // VERDANT SPIRE (vs) — Prestige 10 | The dominant org, back-to-back champions
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p001', name:'Ironclad',  teamId:'vs', position:'top',  age:25, nationality:'KOR',
    playStyle:'utility', personality:'pro',
    champions:['Deeproot','Ironbark','Ironsong','Briarvex'],
    contract:{ salary:230000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:16,csAccuracy:14,teamfightPositioning:17,mapMovement:15,objectiveExecution:16,championPoolDepth:15,
            decisionMaking:16,gameSense:17,communication:15,leadership:14,adaptability:16,composure:16 } },

  { id:'p002', name:'Phantom',   teamId:'vs', position:'jungle',    age:23, nationality:'KOR',
    playStyle:'aggressive', personality:'maverick',
    champions:['Hexwing','Fangwhisper','Driftblade','Shade'],
    contract:{ salary:210000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:16,csAccuracy:14,teamfightPositioning:15,mapMovement:17,objectiveExecution:16,championPoolDepth:15,
            decisionMaking:15,gameSense:16,communication:13,leadership:12,adaptability:15,composure:14 } },

  { id:'p003', name:'Solaris',   teamId:'vs', position:'mid',  age:21, nationality:'KOR',
    playStyle:'carry', personality:'volatile',
    champions:['Wraithfern','Vaulthorn','Spiritfox','Emberpyre','Iceveil'],
    contract:{ salary:320000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:18,csAccuracy:17,teamfightPositioning:15,mapMovement:16,objectiveExecution:13,championPoolDepth:16,
            decisionMaking:16,gameSense:17,communication:12,leadership:11,adaptability:17,composure:16 } },

  { id:'p004', name:'Wraith',    teamId:'vs', position:'adc',    age:22, nationality:'KOR',
    playStyle:'carry', personality:'grinder',
    champions:['Duskwarden','Starshot','Swiftarrow','Embervane'],
    contract:{ salary:290000, yearsLeft:3, expiryYear:2029 },
    stats:{ mechanics:17,csAccuracy:18,teamfightPositioning:16,mapMovement:14,objectiveExecution:14,championPoolDepth:15,
            decisionMaking:15,gameSense:16,communication:11,leadership:10,adaptability:15,composure:16 } },

  { id:'p005', name:'Oracle',    teamId:'vs', position:'support',    age:28, nationality:'KOR',
    playStyle:'shotcaller', personality:'leader',
    champions:['Tidecaller','Stonewall','Darkblossom','Gravewarden'],
    contract:{ salary:380000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:15,csAccuracy:11,teamfightPositioning:18,mapMovement:17,objectiveExecution:18,championPoolDepth:16,
            decisionMaking:19,gameSense:19,communication:19,leadership:18,adaptability:17,composure:18 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // IRON CANOPY (ic) — Prestige 9 | Strategic and methodical; VS's greatest rival
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p011', name:'Boulder',   teamId:'ic', position:'top',  age:26, nationality:'USA',
    playStyle:'utility', personality:'leader',
    champions:['Ironsong','Deeproot','Thornback','Bogveil'],
    contract:{ salary:200000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:15,csAccuracy:14,teamfightPositioning:16,mapMovement:14,objectiveExecution:14,championPoolDepth:14,
            decisionMaking:15,gameSense:16,communication:14,leadership:13,adaptability:15,composure:15 } },

  { id:'p012', name:'Flicker',   teamId:'ic', position:'jungle',    age:24, nationality:'BRA',
    playStyle:'aggressive', personality:'maverick',
    champions:['Hexwing','Fangwhisper','Driftblade','Shade'],
    contract:{ salary:180000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:15,csAccuracy:13,teamfightPositioning:14,mapMovement:16,objectiveExecution:15,championPoolDepth:14,
            decisionMaking:14,gameSense:15,communication:12,leadership:11,adaptability:15,composure:13 } },

  { id:'p013', name:'Noctis',    teamId:'ic', position:'mid',  age:24, nationality:'FRA',
    playStyle:'carry', personality:'pro',
    champions:['Emberpyre','Vaulthorn','Spiritfox','Iceveil','Bombspore'],
    contract:{ salary:190000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:16,csAccuracy:15,teamfightPositioning:14,mapMovement:14,objectiveExecution:12,championPoolDepth:15,
            decisionMaking:14,gameSense:15,communication:12,leadership:10,adaptability:15,composure:14 } },

  { id:'p014', name:'Vortex',    teamId:'ic', position:'adc',    age:22, nationality:'KOR',
    playStyle:'carry', personality:'grinder',
    champions:['Starshot','Wildshot','Swiftarrow','Embervane'],
    contract:{ salary:200000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:16,csAccuracy:16,teamfightPositioning:15,mapMovement:13,objectiveExecution:13,championPoolDepth:14,
            decisionMaking:14,gameSense:15,communication:11,leadership:9,adaptability:14,composure:15 } },

  { id:'p015', name:'Shelter',   teamId:'ic', position:'support',    age:27, nationality:'CAN',
    playStyle:'utility', personality:'leader',
    champions:['Stonewall','Tidecaller','Gravewarden','Darkblossom'],
    contract:{ salary:190000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:13,csAccuracy:10,teamfightPositioning:16,mapMovement:15,objectiveExecution:15,championPoolDepth:14,
            decisionMaking:16,gameSense:16,communication:16,leadership:14,adaptability:15,composure:15 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // PALE ASCENT (pa) — Prestige 7 | Rising challenger, patient scaling style
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p021', name:'Sledge',    teamId:'pa', position:'top',  age:25, nationality:'GER',
    playStyle:'aggressive', personality:'maverick',
    champions:['Thornback','Briarvex','Ironsong','Bogveil'],
    contract:{ salary:145000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:14,csAccuracy:13,teamfightPositioning:14,mapMovement:13,objectiveExecution:13,championPoolDepth:13,
            decisionMaking:13,gameSense:14,communication:12,leadership:11,adaptability:13,composure:13 } },

  { id:'p022', name:'Drift',     teamId:'pa', position:'jungle',    age:23, nationality:'USA',
    playStyle:'aggressive', personality:'maverick',
    champions:['Fangwhisper','Hexwing','Shade','Driftblade'],
    contract:{ salary:130000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:13,mapMovement:15,objectiveExecution:14,championPoolDepth:13,
            decisionMaking:13,gameSense:14,communication:11,leadership:10,adaptability:14,composure:13 } },

  { id:'p023', name:'Prism',     teamId:'pa', position:'mid',  age:22, nationality:'POL',
    playStyle:'carry', personality:'grinder',
    champions:['Emberpyre','Vaulthorn','Spiritfox','Wraithfern'],
    contract:{ salary:140000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:14,csAccuracy:14,teamfightPositioning:13,mapMovement:13,objectiveExecution:12,championPoolDepth:14,
            decisionMaking:14,gameSense:14,communication:11,leadership:10,adaptability:14,composure:13 } },

  { id:'p024', name:'Ricochet',  teamId:'pa', position:'adc',    age:24, nationality:'USA',
    playStyle:'carry', personality:'pro',
    champions:['Swiftarrow','Wildshot','Embervane','Duskwarden'],
    contract:{ salary:140000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:14,csAccuracy:14,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:12,leadership:10,adaptability:13,composure:14 } },

  { id:'p025', name:'Aegis',     teamId:'pa', position:'support',    age:26, nationality:'KOR',
    playStyle:'playmaker', personality:'leader',
    champions:['Stonewall','Tidecaller','Gravewarden','Darkblossom'],
    contract:{ salary:155000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:13,csAccuracy:9,teamfightPositioning:15,mapMovement:14,objectiveExecution:13,championPoolDepth:13,
            decisionMaking:14,gameSense:15,communication:15,leadership:13,adaptability:13,composure:14 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // THORNWALL (tw) — Prestige 6 | Unconventional splitpush specialists
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p031', name:'Bulwark',   teamId:'tw', position:'top',  age:23, nationality:'USA',
    playStyle:'utility', personality:'grinder',
    champions:['Deeproot','Ironbark','Thornwall','Stoneguard'],
    contract:{ salary:100000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:12,leadership:10,adaptability:12,composure:12 } },

  { id:'p032', name:'Cipher',    teamId:'tw', position:'jungle',    age:21, nationality:'KOR',
    playStyle:'aggressive', personality:'maverick',
    champions:['Hexwing','Shade','Fangwhisper','Driftblade'],
    contract:{ salary:105000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:12,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:10,leadership:9,adaptability:13,composure:12 } },

  { id:'p033', name:'Ember',     teamId:'tw', position:'mid',  age:24, nationality:'ITA',
    playStyle:'carry', personality:'volatile',
    champions:['Bombspore','Spiritfox','Iceveil','Emberpyre'],
    contract:{ salary:120000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:14,csAccuracy:13,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:13,
            decisionMaking:13,gameSense:13,communication:11,leadership:9,adaptability:13,composure:12 } },

  { id:'p034', name:'Shatter',   teamId:'tw', position:'adc',    age:23, nationality:'AUS',
    playStyle:'carry', personality:'pro',
    champions:['Duskwarden','Starshot','Wildshot','Swiftarrow'],
    contract:{ salary:110000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:13,csAccuracy:14,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:11,leadership:9,adaptability:13,composure:13 } },

  { id:'p035', name:'Valor',     teamId:'tw', position:'support',    age:25, nationality:'USA',
    playStyle:'playmaker', personality:'leader',
    champions:['Tidecaller','Darkblossom','Gravewarden','Stonewall'],
    contract:{ salary:110000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:9,teamfightPositioning:13,mapMovement:13,objectiveExecution:12,championPoolDepth:12,
            decisionMaking:13,gameSense:13,communication:14,leadership:12,adaptability:13,composure:13 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // DUSK PROTOCOL (dp) — Prestige 6 | Disciplined pick-style team
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p041', name:'Bastion',   teamId:'dp', position:'top',  age:27, nationality:'KOR',
    playStyle:'utility', personality:'pro',
    champions:['Bogveil','Ironsong','Ironbark','Thornwall'],
    contract:{ salary:105000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:12,teamfightPositioning:14,mapMovement:12,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:13,gameSense:13,communication:12,leadership:12,adaptability:12,composure:13 } },

  { id:'p042', name:'Feral',     teamId:'dp', position:'jungle',    age:22, nationality:'ROM',
    playStyle:'aggressive', personality:'volatile',
    champions:['Fangwhisper','Shade','Driftblade','Hexwing'],
    contract:{ salary:90000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:13,csAccuracy:11,teamfightPositioning:12,mapMovement:14,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:10,leadership:9,adaptability:13,composure:11 } },

  { id:'p043', name:'Hexis',     teamId:'dp', position:'mid',  age:21, nationality:'USA',
    playStyle:'carry', personality:'grinder',
    champions:['Vaulthorn','Emberpyre','Iceveil','Wraithfern'],
    contract:{ salary:95000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:14,csAccuracy:12,teamfightPositioning:12,mapMovement:12,objectiveExecution:10,championPoolDepth:13,
            decisionMaking:12,gameSense:13,communication:10,leadership:9,adaptability:12,composure:11 } },

  { id:'p044', name:'Cinder',    teamId:'dp', position:'adc',    age:23, nationality:'JPN',
    playStyle:'carry', personality:'pro',
    champions:['Embervane','Swiftarrow','Wildshot','Duskwarden'],
    contract:{ salary:90000, yearsLeft:2, expiryYear:2028 },
    stats:{ mechanics:13,csAccuracy:13,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:12,
            decisionMaking:11,gameSense:12,communication:11,leadership:9,adaptability:12,composure:12 } },

  { id:'p045', name:'Wick',      teamId:'dp', position:'support',    age:25, nationality:'USA',
    playStyle:'utility', personality:'grinder',
    champions:['Stonewall','Tidecaller','Darkblossom','Gravewarden'],
    contract:{ salary:90000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:8,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:11,
            decisionMaking:13,gameSense:13,communication:13,leadership:11,adaptability:12,composure:12 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // GROVE ENDERS (ge) — Prestige 4 | Scrappy, aggressive bottom-half side
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p051', name:'Rampart',   teamId:'ge', position:'top',  age:26, nationality:'USA',
    playStyle:'utility', personality:'leader',
    champions:['Thornback','Deeproot','Bogveil','Thornwall'],
    contract:{ salary:80000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:11,teamfightPositioning:12,mapMovement:12,objectiveExecution:12,championPoolDepth:11,
            decisionMaking:12,gameSense:12,communication:11,leadership:10,adaptability:11,composure:12 } },

  { id:'p052', name:'Skitter',   teamId:'ge', position:'jungle',    age:21, nationality:'CAN',
    playStyle:'aggressive', personality:'maverick',
    champions:['Hexwing','Fangwhisper','Driftblade'],
    contract:{ salary:70000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:10,teamfightPositioning:11,mapMovement:13,objectiveExecution:11,championPoolDepth:11,
            decisionMaking:11,gameSense:12,communication:10,leadership:8,adaptability:12,composure:10 } },

  { id:'p053', name:'Pulsar',    teamId:'ge', position:'mid',  age:20, nationality:'KOR',
    playStyle:'carry', personality:'volatile',
    champions:['Emberpyre','Vaulthorn','Spiritfox','Bombspore'],
    contract:{ salary:65000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:11,mapMovement:11,objectiveExecution:10,championPoolDepth:12,
            decisionMaking:11,gameSense:12,communication:10,leadership:8,adaptability:12,composure:11 } },

  { id:'p054', name:'Ash',       teamId:'ge', position:'adc',    age:24, nationality:'USA',
    playStyle:'carry', personality:'pro',
    champions:['Swiftarrow','Duskwarden','Embervane','Starshot'],
    contract:{ salary:65000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:12,teamfightPositioning:11,mapMovement:11,objectiveExecution:10,championPoolDepth:11,
            decisionMaking:10,gameSense:11,communication:11,leadership:8,adaptability:11,composure:12 } },

  { id:'p055', name:'Tangle',    teamId:'ge', position:'support',    age:22, nationality:'AUS',
    playStyle:'utility', personality:'grinder',
    champions:['Tidecaller','Gravewarden','Darkblossom','Stonewall'],
    contract:{ salary:65000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:10,csAccuracy:7,teamfightPositioning:12,mapMovement:12,objectiveExecution:11,championPoolDepth:11,
            decisionMaking:12,gameSense:12,communication:12,leadership:10,adaptability:11,composure:11 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // ASHFALL (af) — Prestige 3 | Struggling squad, a few promising youngsters
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p061', name:'Crumble',   teamId:'af', position:'top',  age:28, nationality:'USA',
    playStyle:'utility', personality:'pro',
    champions:['Ironsong','Ironbark','Thornwall'],
    contract:{ salary:60000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:10,teamfightPositioning:11,mapMovement:10,objectiveExecution:10,championPoolDepth:11,
            decisionMaking:11,gameSense:11,communication:11,leadership:10,adaptability:10,composure:11 } },

  { id:'p062', name:'Lurk',      teamId:'af', position:'jungle',    age:21, nationality:'USA',
    playStyle:'aggressive', personality:'volatile',
    champions:['Shade','Driftblade','Hexwing'],
    contract:{ salary:50000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:9,teamfightPositioning:10,mapMovement:12,objectiveExecution:10,championPoolDepth:10,
            decisionMaking:10,gameSense:11,communication:9,leadership:7,adaptability:11,composure:9 } },

  { id:'p063', name:'Flare',     teamId:'af', position:'mid',  age:20, nationality:'KOR',
    playStyle:'carry', personality:'grinder',
    champions:['Emberpyre','Bombspore','Vaulthorn'],
    contract:{ salary:50000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:12,csAccuracy:11,teamfightPositioning:10,mapMovement:10,objectiveExecution:9,championPoolDepth:11,
            decisionMaking:10,gameSense:11,communication:9,leadership:7,adaptability:11,composure:10 } },

  { id:'p064', name:'Tumble',    teamId:'af', position:'adc',    age:22, nationality:'USA',
    playStyle:'carry', personality:'pro',
    champions:['Wildshot','Swiftarrow','Duskwarden'],
    contract:{ salary:50000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:11,teamfightPositioning:10,mapMovement:10,objectiveExecution:9,championPoolDepth:10,
            decisionMaking:9,gameSense:10,communication:10,leadership:7,adaptability:10,composure:10 } },

  { id:'p065', name:'Petal',     teamId:'af', position:'support',    age:19, nationality:'USA',
    playStyle:'utility', personality:'grinder',
    champions:['Tidecaller','Darkblossom','Gravewarden'],
    contract:{ salary:40000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:9,csAccuracy:6,teamfightPositioning:11,mapMovement:10,objectiveExecution:9,championPoolDepth:9,
            decisionMaking:10,gameSense:10,communication:11,leadership:8,adaptability:10,composure:9 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // HOLLOW CROWN (hc) — Prestige 2 | Bottom of the table, inexperienced roster
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'p071', name:'Topple',    teamId:'hc', position:'top',  age:27, nationality:'USA',
    playStyle:'utility', personality:'pro',
    champions:['Deeproot','Bogveil','Thornback'],
    contract:{ salary:50000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:10,csAccuracy:9,teamfightPositioning:10,mapMovement:9,objectiveExecution:9,championPoolDepth:10,
            decisionMaking:10,gameSense:10,communication:10,leadership:9,adaptability:9,composure:10 } },

  { id:'p072', name:'Stumble',   teamId:'hc', position:'jungle',    age:20, nationality:'USA',
    playStyle:'aggressive', personality:'volatile',
    champions:['Hexwing','Shade','Fangwhisper'],
    contract:{ salary:40000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:10,csAccuracy:8,teamfightPositioning:9,mapMovement:11,objectiveExecution:9,championPoolDepth:9,
            decisionMaking:9,gameSense:10,communication:8,leadership:7,adaptability:10,composure:8 } },

  { id:'p073', name:'Glimmer',   teamId:'hc', position:'mid',  age:19, nationality:'CAN',
    playStyle:'carry', personality:'grinder',
    champions:['Emberpyre','Iceveil','Spiritfox'],
    contract:{ salary:40000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:11,csAccuracy:10,teamfightPositioning:9,mapMovement:9,objectiveExecution:8,championPoolDepth:10,
            decisionMaking:9,gameSense:10,communication:9,leadership:7,adaptability:10,composure:9 } },

  { id:'p074', name:'Splinter',  teamId:'hc', position:'adc',    age:22, nationality:'USA',
    playStyle:'carry', personality:'pro',
    champions:['Swiftarrow','Wildshot','Embervane'],
    contract:{ salary:38000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:10,csAccuracy:10,teamfightPositioning:9,mapMovement:9,objectiveExecution:8,championPoolDepth:9,
            decisionMaking:8,gameSense:9,communication:9,leadership:7,adaptability:9,composure:9 } },

  { id:'p075', name:'Wisp',      teamId:'hc', position:'support',    age:21, nationality:'USA',
    playStyle:'utility', personality:'grinder',
    champions:['Tidecaller','Stonewall','Darkblossom'],
    contract:{ salary:38000, yearsLeft:1, expiryYear:2027 },
    stats:{ mechanics:8,csAccuracy:6,teamfightPositioning:10,mapMovement:9,objectiveExecution:8,championPoolDepth:9,
            decisionMaking:9,gameSense:9,communication:10,leadership:8,adaptability:9,composure:9 } },

  // ══════════════════════════════════════════════════════════════════════════════
  // FREE AGENTS — Available for signing
  // ══════════════════════════════════════════════════════════════════════════════

  { id:'fa001', name:'Rampage',  teamId:null, position:'top',  age:30, nationality:'KOR',
    playStyle:'utility', personality:'leader',
    champions:['Ironsong','Thornback','Ironbark','Deeproot'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:12,teamfightPositioning:15,mapMovement:13,objectiveExecution:14,championPoolDepth:13,
            decisionMaking:15,gameSense:15,communication:14,leadership:14,adaptability:13,composure:15 } },

  { id:'fa002', name:'Mirage',   teamId:null, position:'mid',  age:26, nationality:'ESP',
    playStyle:'carry', personality:'pro',
    champions:['Vaulthorn','Iceveil','Spiritfox','Wraithfern'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2026 },
    stats:{ mechanics:14,csAccuracy:13,teamfightPositioning:13,mapMovement:12,objectiveExecution:11,championPoolDepth:14,
            decisionMaking:13,gameSense:14,communication:12,leadership:10,adaptability:14,composure:13 } },

  { id:'fa003', name:'Lancer',   teamId:null, position:'adc',    age:27, nationality:'USA',
    playStyle:'carry', personality:'pro',
    champions:['Duskwarden','Starshot','Swiftarrow','Embervane'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2026 },
    stats:{ mechanics:13,csAccuracy:14,teamfightPositioning:13,mapMovement:12,objectiveExecution:12,championPoolDepth:13,
            decisionMaking:13,gameSense:13,communication:12,leadership:10,adaptability:12,composure:13 } },

  { id:'fa004', name:'Weaver',   teamId:null, position:'support',    age:29, nationality:'KOR',
    playStyle:'shotcaller', personality:'leader',
    champions:['Stonewall','Tidecaller','Darkblossom','Gravewarden'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2026 },
    stats:{ mechanics:12,csAccuracy:9,teamfightPositioning:15,mapMovement:14,objectiveExecution:14,championPoolDepth:13,
            decisionMaking:15,gameSense:16,communication:16,leadership:15,adaptability:14,composure:15 } },

  { id:'fa005', name:'Striker',  teamId:null, position:'jungle',    age:25, nationality:'SWE',
    playStyle:'playmaker', personality:'maverick',
    champions:['Hexwing','Fangwhisper','Shade','Driftblade'],
    contract:{ salary:0, yearsLeft:0, expiryYear:2026 },
    stats:{ mechanics:14,csAccuracy:11,teamfightPositioning:12,mapMovement:15,objectiveExecution:13,championPoolDepth:12,
            decisionMaking:12,gameSense:13,communication:11,leadership:10,adaptability:13,composure:12 } },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

function getPlayer(id) {
  return PLAYER_DB.find(p => p.id === id) || null;
}

function getTeamRoster(teamId) {
  return PLAYER_DB.filter(p => p.teamId === teamId);
}

function getFreeAgents() {
  return PLAYER_DB.filter(p => !p.teamId);
}

// Current ability: average of all stats, scaled 1-200 (FM-style)
function calcCA(player) {
  const vals = Object.values(player.stats);
  const avg  = vals.reduce((a,b) => a+b, 0) / vals.length;
  return Math.round((avg / 20) * 200);
}

// Overall rating for display (1-99)
function calcOverall(player) {
  const vals = Object.values(player.stats);
  const avg  = vals.reduce((a,b) => a+b, 0) / vals.length;
  return Math.round((avg / 20) * 99);
}
