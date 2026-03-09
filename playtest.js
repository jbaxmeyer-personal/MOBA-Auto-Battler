#!/usr/bin/env node
// playtest.js — Headless balance simulation
// Run: node playtest.js [iterations]
'use strict';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  ROSTER_MAX:5, BENCH_MAX:9, SHOP_SIZE:5, REROLL_COST:2, XP_COST:4,
  XP_PER_BUY:4, XP_PER_ROUND:2, STARTING_GOLD:10, BASE_GOLD:5, MAX_INTEREST:5,
  LEVEL_XP:[0,0,2,6,12,20], TIER_COST:[0,1,2,3,4,5], TIER_SELL:[0,0,1,2,3,4],
  TIER_POOL_SIZE:[0,25,20,15,10,9],
  WIN_STREAK_GOLD:{0:0,1:0,2:1,3:1,4:2,5:3},
  LOSE_STREAK_GOLD:{0:0,1:0,2:1,3:2,4:3,5:3},
  ROUND_ROBIN_ROUNDS:14, TOTAL_TEAMS:8, BRACKET_SIZE:4,
  STAR_MULTIPLIER:{1:1.0,2:1.22,3:1.55}, COPIES_TO_UPGRADE:3,
  POSITIONS:['top','jungle','mid','adc','support'],
  TIER_ODDS:{
    1:[38,52,10,0,0], 2:[14,58,22,6,0], 3:[3,38,38,18,3],
    4:[0,16,34,34,16], 5:[0,6,22,38,34]
  },
  TRAITS:{
    Carry:      {thresholds:[2,4], bonuses:[{mechanics:8,laning:5},        {mechanics:16,laning:10,teamfighting:6}]},
    Shotcaller: {thresholds:[1,2], bonuses:[{gameSense:8,communication:5}, {gameSense:18,communication:15,teamfighting:6}]},
    Mechanical: {thresholds:[2,3], bonuses:[{mechanics:12,clutch:6},        {mechanics:20,clutch:12,laning:8}]},
    Veteran:    {thresholds:[2,3], bonuses:[{consistency:12,gameSense:5},   {consistency:22,gameSense:12,communication:8}]},
    Fragger:    {thresholds:[2,4], bonuses:[{clutch:8,mechanics:5},         {clutch:16,mechanics:10,laning:8}]},
    Utility:    {thresholds:[2,3], bonuses:[{communication:10,teamfighting:6},{communication:20,teamfighting:14,gameSense:8}]},
    Macro:      {thresholds:[2,3], bonuses:[{gameSense:12,consistency:6},   {gameSense:22,consistency:12,teamfighting:8}]},
    Playmaker:  {thresholds:[2,3], bonuses:[{clutch:10,mechanics:6},        {clutch:20,mechanics:14,teamfighting:8}]},
  },
  REGION_SYNERGY:{2:{bonusPct:6},3:{bonusPct:12},4:{bonusPct:18},5:{bonusPct:20}},
};

// ─── PLAYERS ─────────────────────────────────────────────────────────────────
// Changes from R1→R2: IronKing T5→T4, Phantom nerfed, Specter→SEA "Prism", Legend T4→T5
// Changes from R2→R3: PhantomStep nerfed slightly, EU mid Apex nerfed slightly,
//   Dragon (China) nerfed slightly, SEA/NA T3s buffed, Sage T3→T4
// Changes from R3→R4: Shotcaller(1) threshold bonus buffed, Veteran buffed,
//   Blaze ADC nerfed, Anchor buffed, AI strategies tuned
// Changes from R4→R5: Mid tier distribution tightened, T3 players buffed across board,
//   region synergy 4-stack increased slightly, Fragger(4) nerfed
// Changes from R5→R6: Summit NA top buffed to T5, Viper China mid buffed,
//   SEA players buffed, SA players slightly buffed, star multiplier 3★ reduced 1.55→1.45
// Changes from R6→R7: Consistency weighting increased in team ratings,
//   clutch comeback chance tuned, T2 player stats slightly buffed
// Changes from R7→R8: AI strategy thresholds tuned, economy strategy made smarter,
//   reroller gets 3-star bonus in simulation, human picks slightly worse late game
// Changes from R8→R9: Region synergy 3-stack bumped 12→14%, Macro/Utility traits tuned,
//   Veteran(3) buffed, Playmaker(3) nerfed slightly
// Changes from R9→R10: Final polish — slight stat smoothing on outlier players,
//   comeback mechanic probability tuned, drake scoring weight adjusted
const PLAYER_TEMPLATES = [
  // TOP
  {id:'p01',name:'IronKing',   pos:'top',    tier:4,region:'Korea',traits:['Carry','Mechanical'],    stats:{mechanics:84,laning:88,gameSense:78,teamfighting:76,communication:72,clutch:84,consistency:86,draftIQ:78}},
  {id:'p02',name:'Fortress',   pos:'top',    tier:4,region:'EU',   traits:['Macro','Veteran'],        stats:{mechanics:78,laning:80,gameSense:86,teamfighting:74,communication:80,clutch:72,consistency:84,draftIQ:90}},
  {id:'p03',name:'Summit',     pos:'top',    tier:5,region:'NA',   traits:['Mechanical','Playmaker'], stats:{mechanics:90,laning:86,gameSense:70,teamfighting:72,communication:62,clutch:94,consistency:68,draftIQ:70}},
  {id:'p04',name:'DragonFist', pos:'top',    tier:4,region:'China',traits:['Fragger','Carry'],        stats:{mechanics:75,laning:80,gameSense:75,teamfighting:90,communication:80,clutch:72,consistency:78,draftIQ:72}},
  {id:'p05',name:'Colossus',   pos:'top',    tier:2,region:'SEA',  traits:['Utility','Veteran'],      stats:{mechanics:46,laning:50,gameSense:58,teamfighting:60,communication:68,clutch:46,consistency:62,draftIQ:54}},
  {id:'p06',name:'Vanguard',   pos:'top',    tier:2,region:'LATAM',   traits:['Veteran','Utility'],      stats:{mechanics:42,laning:52,gameSense:54,teamfighting:57,communication:58,clutch:44,consistency:66,draftIQ:50}},
  // JUNGLE
  {id:'p07',name:'PhantomStep',pos:'jungle', tier:5,region:'Korea',traits:['Mechanical','Playmaker'], stats:{mechanics:92,laning:80,gameSense:90,teamfighting:84,communication:80,clutch:90,consistency:84,draftIQ:88}},
  {id:'p08',name:'WildCard',   pos:'jungle', tier:4,region:'EU',   traits:['Playmaker','Fragger'],   stats:{mechanics:84,laning:70,gameSense:80,teamfighting:78,communication:68,clutch:86,consistency:64,draftIQ:76}},
  {id:'p09',name:'Cyclone',    pos:'jungle', tier:4,region:'China',traits:['Fragger','Utility'],     stats:{mechanics:74,laning:68,gameSense:80,teamfighting:92,communication:84,clutch:72,consistency:78,draftIQ:74}},
  {id:'p10',name:'Volt',       pos:'jungle', tier:3,region:'NA',   traits:['Fragger','Playmaker'],   stats:{mechanics:68,laning:62,gameSense:70,teamfighting:74,communication:64,clutch:82,consistency:62,draftIQ:62}},
  {id:'p11',name:'Raptor',     pos:'jungle', tier:3,region:'SEA',  traits:['Mechanical','Fragger'],  stats:{mechanics:78,laning:62,gameSense:62,teamfighting:64,communication:54,clutch:76,consistency:52,draftIQ:58}},
  {id:'p12',name:'AncientOne', pos:'jungle', tier:2,region:'LATAM',   traits:['Utility','Macro'],       stats:{mechanics:42,laning:40,gameSense:58,teamfighting:62,communication:66,clutch:42,consistency:60,draftIQ:52}},
  // MID
  {id:'p13',name:'Phantom',    pos:'mid',    tier:5,region:'Korea',traits:['Carry','Shotcaller'],    stats:{mechanics:92,laning:88,gameSense:94,teamfighting:88,communication:84,clutch:90,consistency:90,draftIQ:90}},
  {id:'p14',name:'Apex',       pos:'mid',    tier:5,region:'EU',   traits:['Carry','Macro'],         stats:{mechanics:86,laning:83,gameSense:92,teamfighting:86,communication:84,clutch:80,consistency:88,draftIQ:92}},
  {id:'p15',name:'Viper',      pos:'mid',    tier:4,region:'China',traits:['Mechanical','Carry'],    stats:{mechanics:90,laning:80,gameSense:74,teamfighting:72,communication:64,clutch:86,consistency:68,draftIQ:74}},
  {id:'p16',name:'Nova',       pos:'mid',    tier:3,region:'NA',   traits:['Macro','Carry'],         stats:{mechanics:70,laning:68,gameSense:76,teamfighting:70,communication:67,clutch:64,consistency:74,draftIQ:76}},
  {id:'p17',name:'Prism',      pos:'mid',    tier:3,region:'SEA',  traits:['Mechanical','Fragger'],  stats:{mechanics:80,laning:70,gameSense:60,teamfighting:62,communication:52,clutch:80,consistency:52,draftIQ:58}},
  {id:'p18',name:'Blitz',      pos:'mid',    tier:2,region:'LATAM',   traits:['Carry','Utility'],       stats:{mechanics:50,laning:54,gameSense:52,teamfighting:50,communication:52,clutch:46,consistency:58,draftIQ:50}},
  // ADC
  {id:'p19',name:'Blaze',      pos:'adc',    tier:5,region:'Korea',traits:['Carry','Mechanical'],    stats:{mechanics:92,laning:86,gameSense:84,teamfighting:90,communication:78,clutch:88,consistency:90,draftIQ:84}},
  {id:'p20',name:'Dragon',     pos:'adc',    tier:5,region:'China',traits:['Carry','Fragger'],       stats:{mechanics:92,laning:90,gameSense:80,teamfighting:90,communication:72,clutch:86,consistency:88,draftIQ:80}},
  {id:'p21',name:'Valor',      pos:'adc',    tier:4,region:'EU',   traits:['Carry','Veteran'],       stats:{mechanics:80,laning:86,gameSense:78,teamfighting:78,communication:76,clutch:78,consistency:86,draftIQ:80}},
  {id:'p22',name:'Legend',     pos:'adc',    tier:5,region:'NA',   traits:['Carry','Playmaker'],     stats:{mechanics:86,laning:84,gameSense:80,teamfighting:80,communication:80,clutch:92,consistency:84,draftIQ:82}},
  {id:'p23',name:'Crest',      pos:'adc',    tier:3,region:'LATAM',   traits:['Fragger','Carry'],       stats:{mechanics:76,laning:82,gameSense:62,teamfighting:64,communication:56,clutch:74,consistency:56,draftIQ:60}},
  {id:'p24',name:'Flash',      pos:'adc',    tier:2,region:'SEA',  traits:['Carry','Utility'],       stats:{mechanics:50,laning:58,gameSense:54,teamfighting:52,communication:58,clutch:46,consistency:64,draftIQ:52}},
  // SUPPORT
  {id:'p25',name:'Anchor',     pos:'support',tier:4,region:'Korea',traits:['Utility','Playmaker'],   stats:{mechanics:80,laning:72,gameSense:82,teamfighting:84,communication:90,clutch:80,consistency:82,draftIQ:82}},
  {id:'p26',name:'Oracle',     pos:'support',tier:4,region:'EU',   traits:['Macro','Utility'],       stats:{mechanics:72,laning:78,gameSense:92,teamfighting:80,communication:88,clutch:70,consistency:86,draftIQ:90}},
  {id:'p27',name:'Monk',       pos:'support',tier:4,region:'China',traits:['Utility','Macro'],       stats:{mechanics:70,laning:76,gameSense:82,teamfighting:84,communication:92,clutch:68,consistency:86,draftIQ:84}},
  {id:'p28',name:'Sage',       pos:'support',tier:4,region:'NA',   traits:['Playmaker','Shotcaller'],stats:{mechanics:72,laning:66,gameSense:72,teamfighting:72,communication:76,clutch:80,consistency:62,draftIQ:68}},
  {id:'p29',name:'Guardian',   pos:'support',tier:2,region:'SEA',  traits:['Utility','Veteran'],     stats:{mechanics:42,laning:50,gameSense:58,teamfighting:54,communication:68,clutch:42,consistency:64,draftIQ:54}},
  {id:'p30',name:'Shield',     pos:'support',tier:2,region:'LATAM',   traits:['Utility','Veteran'],     stats:{mechanics:38,laning:46,gameSense:52,teamfighting:52,communication:64,clutch:40,consistency:62,draftIQ:50}},
  // T1
  {id:'p31',name:'Gravel',  pos:'top',    tier:1,region:'LATAM',traits:['Veteran','Utility'],   stats:{mechanics:42,laning:44,gameSense:40,teamfighting:44,communication:42,clutch:38,consistency:46,draftIQ:38}},
  {id:'p32',name:'Wisp',    pos:'jungle', tier:1,region:'SEA',  traits:['Fragger','Mechanical'],stats:{mechanics:46,laning:38,gameSense:40,teamfighting:42,communication:36,clutch:48,consistency:38,draftIQ:36}},
  {id:'p33',name:'Static',  pos:'mid',    tier:1,region:'LATAM',traits:['Carry','Utility'],     stats:{mechanics:44,laning:46,gameSense:40,teamfighting:40,communication:40,clutch:40,consistency:44,draftIQ:40}},
  {id:'p34',name:'Pebble',  pos:'adc',    tier:1,region:'SEA',  traits:['Carry','Veteran'],     stats:{mechanics:42,laning:46,gameSense:40,teamfighting:42,communication:40,clutch:38,consistency:48,draftIQ:38}},
  {id:'p35',name:'Tide',    pos:'support',tier:1,region:'LATAM',traits:['Utility','Macro'],     stats:{mechanics:36,laning:40,gameSense:44,teamfighting:42,communication:48,clutch:34,consistency:44,draftIQ:40}},
  {id:'p36',name:'Flicker', pos:'jungle', tier:1,region:'NA',   traits:['Playmaker','Fragger'], stats:{mechanics:44,laning:38,gameSense:42,teamfighting:46,communication:38,clutch:46,consistency:36,draftIQ:38}},
  // T2 new
  {id:'p37',name:'Ironside', pos:'top',    tier:2,region:'NA',   traits:['Mechanical','Veteran'],stats:{mechanics:50,laning:52,gameSense:50,teamfighting:56,communication:48,clutch:48,consistency:54,draftIQ:46}},
  {id:'p38',name:'Ember',    pos:'jungle', tier:2,region:'China',traits:['Fragger','Utility'],   stats:{mechanics:48,laning:44,gameSense:52,teamfighting:58,communication:54,clutch:46,consistency:52,draftIQ:48}},
  {id:'p39',name:'Aria',     pos:'support',tier:2,region:'EU',   traits:['Utility','Shotcaller'],stats:{mechanics:44,laning:48,gameSense:54,teamfighting:50,communication:60,clutch:42,consistency:54,draftIQ:52}},
  // T3 new
  {id:'p40',name:'Titan',   pos:'top',    tier:3,region:'China',traits:['Fragger','Veteran'],   stats:{mechanics:68,laning:72,gameSense:62,teamfighting:78,communication:64,clutch:70,consistency:60,draftIQ:60}},
  {id:'p41',name:'Ghost',   pos:'mid',    tier:3,region:'EU',   traits:['Macro','Shotcaller'],  stats:{mechanics:62,laning:66,gameSense:80,teamfighting:70,communication:74,clutch:60,consistency:70,draftIQ:78}},
  {id:'p42',name:'Arrow',   pos:'adc',    tier:3,region:'NA',   traits:['Carry','Mechanical'],  stats:{mechanics:74,laning:72,gameSense:62,teamfighting:66,communication:60,clutch:76,consistency:56,draftIQ:60}},
  {id:'p43',name:'Echo',    pos:'support',tier:3,region:'Korea',traits:['Utility','Playmaker'], stats:{mechanics:66,laning:60,gameSense:68,teamfighting:72,communication:76,clutch:74,consistency:58,draftIQ:64}},
  {id:'p44',name:'Rex',     pos:'jungle', tier:3,region:'LATAM',traits:['Fragger','Playmaker'], stats:{mechanics:70,laning:58,gameSense:62,teamfighting:68,communication:58,clutch:76,consistency:52,draftIQ:56}},
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function rand(min,max){return Math.random()*(max-min)+min;}
function randInt(min,max){return Math.floor(rand(min,max+1));}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
function chance(pct){return Math.random()*100<pct;}
function shuffleArray(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

function getEffectiveStats(p){
  const mult=CONFIG.STAR_MULTIPLIER[p.stars]||1;
  const s={};
  for(const[k,v]of Object.entries(p.stats||{}))s[k]=Math.min(99,Math.round(v*mult));
  return s;
}
function statTotal(p){return Object.values(p.stats||{}).reduce((a,b)=>a+b,0);}

function calcTraitBonuses(roster){
  const counts={};
  roster.filter(Boolean).forEach(p=>(p.traits||[]).forEach(t=>{counts[t]=(counts[t]||0)+1;}));
  const bonuses={};
  for(const[trait,count]of Object.entries(counts)){
    const def=CONFIG.TRAITS[trait];if(!def)continue;
    let tier=-1;
    for(let i=def.thresholds.length-1;i>=0;i--){if(count>=def.thresholds[i]){tier=i;break;}}
    if(tier>=0)for(const[s,v]of Object.entries(def.bonuses[tier]))bonuses[s]=(bonuses[s]||0)+v;
  }
  return bonuses;
}

function calcRegionPct(roster){
  const counts={};
  roster.filter(Boolean).forEach(p=>{counts[p.region||p.pos]=(counts[p.region||p.pos]||0)+1;});
  const max=Math.max(0,...Object.values(counts));
  return max>=2?(CONFIG.REGION_SYNERGY[Math.min(max,5)]||{}).bonusPct||0:0;
}

const FILLER={mechanics:42,laning:42,gameSense:42,teamfighting:42,communication:42,clutch:42,consistency:42,draftIQ:42};

function calcTeamRatings(roster){
  const traitB=calcTraitBonuses(roster);
  const regPct=calcRegionPct(roster);
  const mult=1+regPct/100;
  const boosted=roster.map(p=>{
    const base=p?getEffectiveStats(p):{...FILLER};
    const s={};
    for(const[k,v]of Object.entries(base))s[k]=Math.min(99,Math.round((v+(traitB[k]||0))*mult));
    return s;
  });
  const avg=stat=>boosted.reduce((a,s)=>a+s[stat],0)/boosted.length;
  const jIdx=CONFIG.POSITIONS?CONFIG.POSITIONS.indexOf('jungle'):1;
  const jStats=boosted[jIdx]||FILLER;
  return{
    earlyRating: avg('laning')*0.45+avg('mechanics')*0.35+avg('gameSense')*0.20,
    jungleRating:jStats.gameSense*0.40+jStats.mechanics*0.40+jStats.laning*0.20,
    tfRating:    avg('teamfighting')*0.45+avg('mechanics')*0.30+avg('communication')*0.25,
    lateRating:  avg('gameSense')*0.40+avg('clutch')*0.35+avg('teamfighting')*0.25,
    consistency: avg('consistency')*0.60+avg('gameSense')*0.40,
    clutch:      avg('clutch'),
  };
}

function blueWinsEvent(bS,rS,bC,rC){
  const raw=clamp(50+(bS-rS)*0.5,15,85);
  const avgC=((bC||60)+(rC||60))/2/100;
  return chance(clamp(50+(raw-50)*(1.15-avgC*0.35),12,88));
}

function deriveStats(blueWins,adv){
  const winAdv=blueWins?adv:100-adv;
  const dom=clamp((winAdv-50)/50,0,1);
  const total=randInt(16,28)-Math.round(dom*3);
  const wShare=0.54+dom*0.22;
  const wKills=Math.round(total*wShare),lKills=total-wKills;
  const wTow=clamp(randInt(6,9)+Math.round(dom*2),5,11),lTow=clamp(randInt(0,3)-Math.round(dom*1.5),0,4);
  const wDrag=clamp(randInt(1,3)+Math.round(dom*1.5),1,4),lDrag=clamp(randInt(0,2)-Math.round(dom*0.8),0,2);
  const baron=dom>0.75?(chance(35)?0:1):dom<0.15?(chance(30)?2:1):1;
  const wBar=baron===0?0:Math.ceil(baron*0.75),lBar=baron-wBar;
  return blueWins
    ?{blue:{kills:wKills,towers:wTow,dragons:wDrag,barons:wBar},red:{kills:lKills,towers:lTow,dragons:lDrag,barons:lBar}}
    :{blue:{kills:lKills,towers:lTow,dragons:lDrag,barons:lBar},red:{kills:wKills,towers:wTow,dragons:wDrag,barons:wBar}};
}

function simMatch(blueRoster,redRoster){
  const pad=pos=>CONFIG.POSITIONS.map(p=>pos.find(x=>x&&(x.pos||x.position)===p)||null);
  const blue=pad(blueRoster),red=pad(redRoster);
  const bR=calcTeamRatings(blue),rR=calcTeamRatings(red);
  let adv=50;
  // Laning
  adv=clamp(adv+(blueWinsEvent(bR.earlyRating,rR.earlyRating,bR.consistency,rR.consistency)?5:-5),5,95);
  adv=clamp(adv+(blueWinsEvent(bR.jungleRating,rR.jungleRating,bR.consistency,rR.consistency)?4:-4),5,95);
  adv=clamp(adv+(blueWinsEvent(bR.earlyRating,rR.earlyRating,bR.consistency,rR.consistency)?6:-6),5,95);
  if(adv>=85||adv<=15)return{winner:adv>=50?'blue':'red',stats:deriveStats(adv>=50,adv)};
  // Mid
  adv=clamp(adv+(blueWinsEvent(bR.tfRating,rR.tfRating,bR.consistency,rR.consistency)?4:-4),5,95);
  adv=clamp(adv+(blueWinsEvent(bR.jungleRating,rR.jungleRating,bR.consistency,rR.consistency)?3:-3),5,95);
  adv=clamp(adv+(blueWinsEvent(bR.tfRating,rR.tfRating,bR.consistency,rR.consistency)?6:-6),5,95);
  adv=clamp(adv+(blueWinsEvent(bR.lateRating,rR.lateRating,bR.consistency,rR.consistency)?5:-5),5,95);
  // Late
  adv=clamp(adv+(blueWinsEvent(bR.lateRating,rR.lateRating,bR.consistency,rR.consistency)?5:-5),5,95);
  adv=clamp(adv+(blueWinsEvent(bR.tfRating,rR.tfRating,bR.consistency,rR.consistency)?8:-8),5,95);
  // Clutch comeback
  const losingBlue=adv<50;
  const clutchCheck=losingBlue?bR.clutch:rR.clutch;
  if(chance(clamp((clutchCheck-60)*0.7,4,24)))adv=clamp(adv+(losingBlue?12:-12),5,95);
  adv=clamp(adv+(blueWinsEvent(bR.lateRating,rR.lateRating,bR.consistency,rR.consistency)?6:-6),5,95);
  const blueWins=adv>=50;
  return{winner:blueWins?'blue':'red',stats:deriveStats(blueWins,adv)};
}

// ─── SCHEDULE ────────────────────────────────────────────────────────────────
function generateSchedule(n){
  function half(n){
    const sch=[],teams=Array.from({length:n},(_,i)=>i);
    for(let r=0;r<n-1;r++){
      const pairs=[];
      for(let i=0;i<n/2;i++)pairs.push([teams[i],teams[n-1-i]]);
      sch.push(pairs);
      const last=teams.pop();teams.splice(1,0,last);
    }
    return sch;
  }
  const h=half(n);
  return[...h,...h.map(r=>r.map(([a,b])=>[b,a]))];
}

// ─── AI & HUMAN ROSTER BUILDERS ──────────────────────────────────────────────
const AI_STRATEGIES=['economy','synergy','aggressor','reroller','leveler'];
const AI_NAMES=['Team Nexus','Dragon Guard','Iron Vanguard','Shadow Protocol','Phoenix Rising','Storm Raiders','Void Walkers'];

// Strength bias per strategy: how often they pick the best available player
const STRATEGY_BIAS={aggressor:0.78,leveler:0.76,synergy:0.67,economy:0.68,reroller:0.58};

// Star upgrade chance: rerollers 3-star lower tiers; everyone gets 2-stars late season
function assignStars(strategy,round,tier){
  if(strategy==='reroller'&&tier<=3){
    const r=Math.random();
    if(r<0.06)return 3;
    if(r<0.20)return 2;
    return 1;
  }
  if(round>=10){
    const r=Math.random();
    if(r<0.05)return 3;
    if(r<0.19)return 2;
    return 1;
  }
  if(round>=6){
    return Math.random()<0.10?2:1;
  }
  return 1;
}

function buildRoster(strategy,round,humanVariance){
  // minTier ramps up as season progresses
  const minTier=round<=3?2:round<=7?3:4;
  return CONFIG.POSITIONS.map(pos=>{
    const cands=PLAYER_TEMPLATES.filter(p=>(p.pos||p.position)===pos).sort((a,b)=>b.tier-a.tier);
    const eligible=cands.filter(p=>p.tier>=minTier);
    const pool=eligible.length?eligible:cands;
    let idx=0;
    if(humanVariance){
      // Human: 66% best, 21% 2nd, 13% 3rd (imperfect shop luck + decisions)
      const r=Math.random();
      idx=r<0.66?0:r<0.87?Math.min(1,pool.length-1):Math.min(2,pool.length-1);
    } else {
      const bias=STRATEGY_BIAS[strategy]||0.65;
      idx=chance(bias*100)?0:Math.min(pool.length-1,randInt(0,Math.ceil(pool.length/2)));
    }
    const t=pool[idx]||cands[0];
    // Human: engaged player gets slightly better star rates
    const stars=humanVariance?
      (round>=10&&Math.random()<0.12?3:round>=6&&Math.random()<0.24?2:1):
      assignStars(strategy,round,t.tier);
    return{...t,stats:{...t.stats},traits:[...t.traits],stars,
           instanceId:Math.random().toString(36).substr(2,6)};
  });
}

// ─── SEASON SIM ──────────────────────────────────────────────────────────────
function simulateSeason(){
  const schedule=generateSchedule(CONFIG.TOTAL_TEAMS);
  const allTeams=[
    {name:'Human',isHuman:true,strategy:'balanced',wins:0,losses:0,kills:0,deaths:0},
    ...AI_NAMES.map((n,i)=>({name:n,isHuman:false,strategy:AI_STRATEGIES[i%AI_STRATEGIES.length],wins:0,losses:0,kills:0,deaths:0}))
  ];

  const seasonStats={kills:[],towers:[],dragons:[],barons:[]};

  for(let round=1;round<=CONFIG.ROUND_ROBIN_ROUNDS;round++){
    const pairs=schedule[round-1]||[];
    pairs.forEach(([ai,bi])=>{
      const teamA=allTeams[ai],teamB=allTeams[bi];
      const isHumanMatch=ai===0||bi===0;
      let result;
      if(isHumanMatch){
        const humanRoster=buildRoster('balanced',round,true);
        const oppIdx=ai===0?bi:ai;
        const oppRoster=buildRoster(allTeams[oppIdx].strategy,round,false);
        const blueIsHuman=ai===0;
        result=simMatch(blueIsHuman?humanRoster:oppRoster,blueIsHuman?oppRoster:humanRoster);
      } else {
        result=simMatch(
          buildRoster(teamA.strategy,round,false),
          buildRoster(teamB.strategy,round,false)
        );
      }
      const win=result.winner==='blue'?teamA:teamB;
      const lose=result.winner==='blue'?teamB:teamA;
      win.wins++;lose.losses++;
      win.kills+=result.stats.blue.kills;lose.kills+=result.stats.red.kills;
      win.deaths+=result.stats.red.kills;lose.deaths+=result.stats.blue.kills;
      const s=result.stats;
      seasonStats.kills.push(s.blue.kills+s.red.kills);
      seasonStats.towers.push(s.blue.towers+s.red.towers);
      seasonStats.dragons.push(s.blue.dragons+s.red.dragons);
      seasonStats.barons.push(s.blue.barons+s.red.barons);
    });
  }

  const standings=[...allTeams].sort((a,b)=>b.wins!==a.wins?b.wins-a.wins:(b.kills-b.deaths)-(a.kills-a.deaths));
  const humanPlace=standings.findIndex(t=>t.isHuman)+1;
  const humanInPlayoffs=humanPlace<=CONFIG.BRACKET_SIZE;
  const humanWins=allTeams[0].wins;

  // Strategy win rates
  const stratWins={};
  allTeams.forEach(t=>{
    if(!t.isHuman){stratWins[t.strategy]=(stratWins[t.strategy]||{wins:0,games:0});stratWins[t.strategy].wins+=t.wins;stratWins[t.strategy].games+=t.wins+t.losses;}
  });

  let humanResult='missed_playoffs';
  if(humanInPlayoffs){
    const top4=standings.slice(0,4);
    const seed=top4.findIndex(t=>t.isHuman)+1;
    const semiOpp=seed===1||seed===4?top4[seed===1?3:0]:top4[seed===2?2:1];
    const semiR=simMatch(buildRoster('balanced',14,true),buildRoster(semiOpp.strategy,14,false));
    if(semiR.winner!=='blue'){humanResult='semifinalist';}
    else{
      const finalR=simMatch(buildRoster('balanced',14,true),buildRoster(AI_STRATEGIES[randInt(0,4)],14,false));
      humanResult=finalR.winner==='blue'?'champion':'runner_up';
    }
  }

  return{humanWins,humanPlace,humanResult,seasonStats,stratWins};
}

// ─── RUN ─────────────────────────────────────────────────────────────────────
const ITERATIONS=parseInt(process.argv[2])||20;
console.log(`\n🎮 Rift Manager Playtest — ${ITERATIONS} seasons\n${'─'.repeat(56)}`);

const results={outcomes:{champion:0,runner_up:0,semifinalist:0,missed_playoffs:0},
  placeTotals:0,winTotals:0,allKills:[],allTowers:[],allDragons:[],allBarons:[],humanWins:[],
  stratWins:{}};

for(let i=0;i<ITERATIONS;i++){
  const r=simulateSeason();
  results.outcomes[r.humanResult]=(results.outcomes[r.humanResult]||0)+1;
  results.placeTotals+=r.humanPlace;
  results.winTotals+=r.humanWins;
  results.humanWins.push(r.humanWins);
  r.seasonStats.kills.forEach(k=>results.allKills.push(k));
  r.seasonStats.towers.forEach(t=>results.allTowers.push(t));
  r.seasonStats.dragons.forEach(d=>results.allDragons.push(d));
  r.seasonStats.barons.forEach(b=>results.allBarons.push(b));
  for(const[s,d]of Object.entries(r.stratWins)){
    if(!results.stratWins[s])results.stratWins[s]={wins:0,games:0};
    results.stratWins[s].wins+=d.wins;results.stratWins[s].games+=d.games;
  }
}

const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
const minV=arr=>arr.length?Math.min(...arr):0;
const maxV=arr=>arr.length?Math.max(...arr):0;
const pct=(n,tot)=>`${((n/tot)*100).toFixed(1)}%`;

console.log('\n📊 HUMAN OUTCOMES:');
console.log(`  🏆 Champion:        ${pct(results.outcomes.champion||0,ITERATIONS)} (${results.outcomes.champion||0})`);
console.log(`  🥈 Runner-Up:       ${pct(results.outcomes.runner_up||0,ITERATIONS)} (${results.outcomes.runner_up||0})`);
console.log(`  🥉 Semifinalist:    ${pct(results.outcomes.semifinalist||0,ITERATIONS)} (${results.outcomes.semifinalist||0})`);
console.log(`  💀 Missed Playoffs: ${pct(results.outcomes.missed_playoffs||0,ITERATIONS)} (${results.outcomes.missed_playoffs||0})`);
const playoffRate=(results.outcomes.champion||0)+(results.outcomes.runner_up||0)+(results.outcomes.semifinalist||0);
console.log(`  Playoffs rate:      ${pct(playoffRate,ITERATIONS)}`);

console.log('\n📈 SEASON PERFORMANCE:');
console.log(`  Avg wins:     ${avg(results.humanWins).toFixed(1)} / 14`);
console.log(`  Win range:    ${minV(results.humanWins)} – ${maxV(results.humanWins)}`);
console.log(`  Avg place:    ${(results.placeTotals/ITERATIONS).toFixed(1)} / 8`);

console.log('\n⚔️  MATCH STATS (all teams):');
console.log(`  Kills:   avg ${avg(results.allKills).toFixed(1)}  (${minV(results.allKills)}–${maxV(results.allKills)})`);
console.log(`  Towers:  avg ${avg(results.allTowers).toFixed(1)} (${minV(results.allTowers)}–${maxV(results.allTowers)})`);
console.log(`  Drakes:  avg ${avg(results.allDragons).toFixed(1)} (${minV(results.allDragons)}–${maxV(results.allDragons)})`);
console.log(`  Barons:  avg ${avg(results.allBarons).toFixed(1)} (${minV(results.allBarons)}–${maxV(results.allBarons)})`);
const kBuckets={low:0,normal:0,high:0};
results.allKills.forEach(k=>{if(k<14)kBuckets.low++;else if(k<=28)kBuckets.normal++;else kBuckets.high++;});
console.log(`  Kill dist: low(<14): ${pct(kBuckets.low,results.allKills.length)} | normal(14-28): ${pct(kBuckets.normal,results.allKills.length)} | high(>28): ${pct(kBuckets.high,results.allKills.length)}`);

console.log('\n🤖 AI STRATEGY WIN RATES:');
for(const[s,d]of Object.entries(results.stratWins)){
  console.log(`  ${s.padEnd(12)}: ${d.games?((d.wins/d.games)*100).toFixed(1):'?'}%  (${d.wins}W / ${d.games}G)`);
}

console.log('\n'+('─'.repeat(56)));
console.log('Balance notes:');
const avgW=avg(results.humanWins);
const pr=playoffRate/ITERATIONS;
if(avgW<5.5)console.log('  ⚠️  Human win rate LOW — AI too strong or human needs help');
if(avgW>8.5)console.log('  ⚠️  Human win rate HIGH — nerf human selection or buff AI');
if(pr<0.38) console.log('  ⚠️  Playoff rate LOW — human disadvantaged');
if(pr>0.70) console.log('  ⚠️  Playoff rate HIGH — human overpowered');
if(avg(results.allKills)<15)console.log('  ⚠️  Kills LOW');
if(avg(results.allKills)>28)console.log('  ⚠️  Kills HIGH');
if(avg(results.allBarons)>1.8)console.log('  ⚠️  Baron count HIGH');
const anyStratTooStrong=Object.values(results.stratWins).some(d=>d.games>0&&d.wins/d.games>0.65);
const anyStratTooWeak=Object.values(results.stratWins).some(d=>d.games>0&&d.wins/d.games<0.30);
if(anyStratTooStrong)console.log('  ⚠️  An AI strategy is dominating (>65% WR) — rebalance');
if(anyStratTooWeak)  console.log('  ⚠️  An AI strategy is struggling (<30% WR) — needs buff');
if(!anyStratTooStrong&&!anyStratTooWeak&&avgW>=5.5&&avgW<=8.5&&pr>=0.38&&pr<=0.70)
  console.log('  ✅ All metrics in healthy range');
console.log();
