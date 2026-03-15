// js/data/champions.js — The Ancient Grove champion database
// Phase 6 rewrite: full ability data, phys/magic split, effects system
//
// Ability effects types:
//   { type:'cc',       ccType:'stun'|'root'|'fear'|'slow'|'knockup'|'knockback'|'charm'|'silence'|'cage', duration }
//   { type:'aoe',      radius }
//   { type:'vamp',     pct }          — heals caster for pct of damage dealt
//   { type:'spellVamp',pct }          — vamp on ability damage only
//   { type:'heal',     amount, apRatio }
//   { type:'shield',   amount, apRatio }
//   { type:'channel',  ticks }        — ability deals dmg per tick over ticks×tickInterval
//   { type:'bounce',   count, falloff }  — damage bounces to nearby enemies
//   { type:'execute',  bonusPerMissingHpPct } — bonus dmg per 1% missing HP
//   { type:'stack',    stat, perStack } — Vaulthorn passive-like stacking
//   { type:'mobilityCharge', charges } — Spiritfox 3-charge dash ult
//   { type:'terrain',  duration }     — creates impassable wall/cage
//   { type:'disableStructure', duration } — temporarily disables Root damage
//   { type:'invuln',   duration }     — caster becomes invulnerable
//   { type:'killReset' }              — Wildshot passive: speed burst on kill
//   { type:'globalProjectile' }       — ult travels entire map
//   { type:'reflect',  pct, duration } — reflects % of damage taken
//   { type:'trap',     count }        — places mines/traps on ground
//   { type:'pull' }                   — pulls enemy toward caster
//   { type:'allyDash' }               — ally can dash to caster's location
//   { type:'pierce' }                 — projectile passes through targets
//   { type:'selfMagicImmune', duration } — caster gains magic immunity
//   { type:'buffAlly', stat, pct, duration } — buffs an ally's stat
//
// Class base stats (before level scaling):
//   Tank:     baseHp:720  baseDmg:18  attackRange:45  moveSpeed:295  physResist:80  magicResist:55
//   Fighter:  baseHp:600  baseDmg:28  attackRange:50  moveSpeed:330  physResist:60  magicResist:35
//   Assassin: baseHp:380  baseDmg:38  attackRange:65  moveSpeed:352  physResist:30  magicResist:28
//   Mage:     baseHp:420  baseDmg:30  attackRange:550 moveSpeed:298  physResist:25  magicResist:45
//   Marksman: baseHp:450  baseDmg:32  attackRange:580 moveSpeed:312  physResist:28  magicResist:28
//   Sentinel: baseHp:490  baseDmg:20  attackRange:520 moveSpeed:308  physResist:38  magicResist:48

'use strict';

const CHAMPIONS = {

  // ══════════════════════════════════════════════════════════════════════
  // MAGES (6) — primary role: arcanist
  // ══════════════════════════════════════════════════════════════════════

  // Fiddlesticks-inspired: vamp channel, fear, ult-bomb
  'Wraithfern': {
    class:'Mage', compType:'SCALING', role:'mid',
    baseHp:440, baseDmg:32, attackRange:550, moveSpeed:298, physResist:25, magicResist:46,
    lore:'A vine scarecrow stitched from stolen souls. Its presence drains the will to fight.',
    abilities:{
      aa:  { dmgType:'magic', dmg:32, range:550, cd:1.8 },
      q:   { name:'Soul Wither',   learnLevel:1, dmgType:'magic', dmg:58,  apRatio:0.65, range:600, cd:10,
             effects:[{type:'cc',ccType:'fear',duration:1.5}] },
      e:   { name:'Lifedrain',     learnLevel:3, dmgType:'magic', dmg:42,  apRatio:0.30, range:480, cd:16,
             effects:[{type:'channel',ticks:4},{type:'spellVamp',pct:0.35},{type:'cc',ccType:'stun',duration:1.0,onChannelComplete:true}] },
      ult: { name:'Spirit Swarm',  learnLevel:6, dmgType:'magic', dmg:300, apRatio:1.10, range:950, cd:120,
             effects:[{type:'aoe',radius:350},{type:'cc',ccType:'fear',duration:1.0}] },
    },
  },

  // Ziggs-inspired: longest range, poke bombs, global ult
  'Bombspore': {
    class:'Mage', compType:'POKE', role:'mid',
    baseHp:400, baseDmg:28, attackRange:625, moveSpeed:294, physResist:22, magicResist:42,
    lore:'A crazed alchemist who weaponised Grove spores into explosive shells with terrifying range.',
    abilities:{
      aa:  { dmgType:'magic', dmg:28, range:625, cd:1.7 },
      q:   { name:'Spore Shell',      learnLevel:1, dmgType:'magic', dmg:80,  apRatio:0.75, range:700, cd:8,
             effects:[{type:'bounce',count:1,falloff:0.60}] },
      e:   { name:'Spore Field',      learnLevel:3, dmgType:'magic', dmg:65,  apRatio:0.60, range:600, cd:14,
             effects:[{type:'trap',count:3},{type:'aoe',radius:120},{type:'cc',ccType:'slow',duration:1.5}] },
      ult: { name:'Megaspore Blast',  learnLevel:6, dmgType:'magic', dmg:350, apRatio:1.30, range:1400, cd:90,
             effects:[{type:'aoe',radius:280},{type:'globalProjectile'}] },
    },
  },

  // Veigar-inspired: CC cage, stacking power, execute ult
  'Vaulthorn': {
    class:'Mage', compType:'SCALING', role:'mid',
    baseHp:410, baseDmg:28, attackRange:520, moveSpeed:294, physResist:22, magicResist:44,
    lore:'An ancient imprisoned spirit whose power grows with each soul it consumes.',
    passive:{ type:'stack', stat:'abilityPower', perKillAssist:4, desc:'Gains +4 AP on every kill or assist permanently.' },
    abilities:{
      aa:  { dmgType:'magic', dmg:28, range:520, cd:1.9 },
      q:   { name:'Dark Pulse',      learnLevel:1, dmgType:'magic', dmg:60,  apRatio:0.60, range:580, cd:8,  effects:[] },
      e:   { name:'Arcane Prison',   learnLevel:3, dmgType:'magic', dmg:40,  apRatio:0.40, range:500, cd:18,
             effects:[{type:'cc',ccType:'cage',duration:2.5},{type:'aoe',radius:180}] },
      ult: { name:'Oblivion Blast',  learnLevel:6, dmgType:'magic', dmg:200, apRatio:1.00, range:550, cd:100,
             effects:[{type:'execute',bonusPerMissingHpPct:3}] },
    },
  },

  // Brand-inspired: bouncing ult wildfire
  'Emberpyre': {
    class:'Mage', compType:'POKE', role:'mid',
    baseHp:430, baseDmg:30, attackRange:540, moveSpeed:296, physResist:23, magicResist:42,
    lore:'A living flame that never stops burning. Its ultimate ricochets between enemies like wildfire.',
    abilities:{
      aa:  { dmgType:'magic', dmg:30, range:540, cd:1.8 },
      q:   { name:'Blazing Bolt',    learnLevel:1, dmgType:'magic', dmg:75,  apRatio:0.65, range:620, cd:9,  effects:[] },
      e:   { name:'Pyre Pool',       learnLevel:3, dmgType:'magic', dmg:50,  apRatio:0.50, range:550, cd:12,
             effects:[{type:'aoe',radius:200},{type:'channel',ticks:3}] },
      ult: { name:'Conflagration',   learnLevel:6, dmgType:'magic', dmg:120, apRatio:0.70, range:600, cd:80,
             effects:[{type:'bounce',count:4,falloff:0.85}] },
    },
  },

  // Ahri-inspired: charm CC, 3-charge mobility ult
  'Spiritfox': {
    class:'Mage', compType:'ASSASSIN', role:'mid',
    baseHp:400, baseDmg:35, attackRange:520, moveSpeed:335, physResist:28, magicResist:40,
    lore:'A nine-tailed fox spirit. Her charm stops enemies cold; her ult makes her uncatchable.',
    abilities:{
      aa:  { dmgType:'magic', dmg:35, range:520, cd:1.7 },
      q:   { name:'Spirit Orb',    learnLevel:1, dmgType:'magic', dmg:70,  apRatio:0.65, range:580, cd:8,
             effects:[{type:'pierce'}] },
      e:   { name:'Foxfire Kiss',  learnLevel:3, dmgType:'magic', dmg:60,  apRatio:0.55, range:450, cd:12,
             effects:[{type:'cc',ccType:'charm',duration:1.5}] },
      ult: { name:'Fox Dash',      learnLevel:6, dmgType:'magic', dmg:90,  apRatio:0.60, range:450, cd:90,
             effects:[{type:'mobilityCharge',charges:3}] },
    },
  },

  // Lissandra-inspired: glacial CC, ult freezes self or enemy
  'Iceveil': {
    class:'Mage', compType:'ENGAGE', role:'mid',
    baseHp:430, baseDmg:30, attackRange:480, moveSpeed:300, physResist:24, magicResist:45,
    lore:'An ice witch whose control over frost borders on divine. Nothing escapes her glacial grasp.',
    abilities:{
      aa:  { dmgType:'magic', dmg:30, range:480, cd:1.8 },
      q:   { name:'Ice Shard',      learnLevel:1, dmgType:'magic', dmg:65,  apRatio:0.65, range:520, cd:8,
             effects:[{type:'cc',ccType:'slow',duration:1.0}] },
      e:   { name:'Glacial Snare',  learnLevel:3, dmgType:'magic', dmg:40,  apRatio:0.40, range:400, cd:14,
             effects:[{type:'cc',ccType:'root',duration:1.5},{type:'aoe',radius:150}] },
      ult: { name:'Frozen Tomb',    learnLevel:6, dmgType:'magic', dmg:250, apRatio:0.90, range:600, cd:120,
             effects:[{type:'cc',ccType:'stun',duration:2.0},{type:'invuln',duration:2.5,selfCastMode:true}] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // MARKSMEN (5) — primary role: hunter
  // ══════════════════════════════════════════════════════════════════════

  // Jinx-inspired: slow early, explosive late, kill-reset passive
  'Wildshot': {
    class:'Marksman', compType:'SCALING', role:'adc',
    baseHp:450, baseDmg:30, attackRange:575, moveSpeed:305, physResist:28, magicResist:28,
    lore:'A chaos-addicted shooter who gets faster and deadlier with every kill. Three items and she deletes the world.',
    passive:{ type:'killReset', bonusAtkSpeedPct:0.35, bonusMoveSpeedPct:0.20, duration:3, desc:'Get Excited: kill or assist grants a speed burst for 3 ticks.' },
    abilities:{
      aa:  { dmgType:'physical', dmg:30, range:575, cd:1.8 },
      q:   { name:'Flame Chomper',       learnLevel:1, dmgType:'physical', dmg:55,  adRatio:0.0, range:450, cd:14,
             effects:[{type:'trap',count:1},{type:'cc',ccType:'root',duration:1.5}] },
      e:   { name:'Death Rocket Volley', learnLevel:3, dmgType:'physical', dmg:80,  adRatio:0.0, range:680, cd:10,
             effects:[{type:'pierce'}] },
      ult: { name:'Super Death Rocket',  learnLevel:6, dmgType:'physical', dmg:250, adRatio:1.50, range:1800, cd:90,
             effects:[{type:'globalProjectile'},{type:'execute',bonusPerMissingHpPct:4}] },
    },
  },

  'Swiftarrow': {
    class:'Marksman', compType:'POKE', role:'adc',
    baseHp:440, baseDmg:34, attackRange:575, moveSpeed:320, physResist:28, magicResist:27,
    lore:'Speed and precision. Always moving, always shooting.',
    abilities:{
      aa:  { dmgType:'physical', dmg:34, range:575, cd:1.6 },
      q:   { name:'Swift Shot',     learnLevel:1, dmgType:'physical', dmg:60, range:650, cd:9,
             effects:[{type:'cc',ccType:'slow',duration:1.0}] },
      e:   { name:'Tumble',         learnLevel:3, dmgType:'physical', dmg:45, range:300, cd:12,
             effects:[{type:'cc',ccType:'knockback',duration:0.0}] },
      ult: { name:'Rain of Arrows', learnLevel:6, dmgType:'physical', dmg:220, range:550, cd:90,
             effects:[{type:'aoe',radius:280},{type:'cc',ccType:'slow',duration:2.0}] },
    },
  },

  'Starshot': {
    class:'Marksman', compType:'SCALING', role:'adc',
    baseHp:440, baseDmg:32, attackRange:590, moveSpeed:310, physResist:27, magicResist:28,
    lore:'Patient and precise. The longer the game goes, the brighter the star burns.',
    abilities:{
      aa:  { dmgType:'physical', dmg:32, range:590, cd:1.7 },
      q:   { name:'Star Bolt',     learnLevel:1, dmgType:'physical', dmg:65, range:600, cd:9,
             effects:[{type:'cc',ccType:'slow',duration:0.5}] },
      e:   { name:'Stellar Drift', learnLevel:3, dmgType:'physical', dmg:45, range:500, cd:14,
             effects:[{type:'cc',ccType:'knockback',duration:0.3},{type:'aoe',radius:120}] },
      ult: { name:'Supernova',     learnLevel:6, dmgType:'magic',    dmg:320, apRatio:0.80, range:700, cd:110,
             effects:[{type:'aoe',radius:350},{type:'channel',ticks:1}] },
    },
  },

  'Duskwarden': {
    class:'Marksman', compType:'SCALING', role:'adc',
    baseHp:450, baseDmg:33, attackRange:560, moveSpeed:315, physResist:28, magicResist:28,
    lore:'A shadow archer who phases in and out of reality. Hard to pin down; harder to kill.',
    abilities:{
      aa:  { dmgType:'physical', dmg:33, range:560, cd:1.7 },
      q:   { name:'Shadow Arrow',  learnLevel:1, dmgType:'physical', dmg:70, range:600, cd:9,  effects:[] },
      e:   { name:'Dusk Shroud',   learnLevel:3, dmgType:'magic',    dmg:50, apRatio:0.3, range:400, cd:14,
             effects:[{type:'cc',ccType:'slow',duration:1.0},{type:'aoe',radius:180}] },
      ult: { name:'Twilight Barrage', learnLevel:6, dmgType:'physical', dmg:280, range:600, cd:110,
             effects:[{type:'invuln',duration:1.5},{type:'aoe',radius:200}] },
    },
  },

  'Embervane': {
    class:'Marksman', compType:'ENGAGE', role:'adc',
    baseHp:460, baseDmg:35, attackRange:540, moveSpeed:325, physResist:30, magicResist:28,
    lore:'A fire archer who leads with her feet. Dash in, burn everything, dash out.',
    abilities:{
      aa:  { dmgType:'physical', dmg:35, range:540, cd:1.7 },
      q:   { name:'Ember Arrow', learnLevel:1, dmgType:'physical', dmg:65, range:550, cd:9,  effects:[] },
      e:   { name:'Ignite',      learnLevel:3, dmgType:'magic',    dmg:80, apRatio:0.3, range:400, cd:13,
             effects:[{type:'aoe',radius:160},{type:'cc',ccType:'slow',duration:1.0}] },
      ult: { name:'Flame Rush',  learnLevel:6, dmgType:'physical', dmg:240, range:500, cd:100,
             effects:[{type:'cc',ccType:'knockback',duration:0.8},{type:'aoe',radius:120}] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // TANKS (5) — primary role: vanguard
  // ══════════════════════════════════════════════════════════════════════

  // Maokai-inspired: CC everywhere, sapling toss, lane-wide root ult
  'Bogveil': {
    class:'Tank', compType:'ENGAGE', role:'top',
    baseHp:720, baseDmg:20, attackRange:45, moveSpeed:295, physResist:80, magicResist:52,
    lore:'A twisted ancient tree warped by Grove corruption. Every branch is a weapon.',
    abilities:{
      aa:  { dmgType:'physical', dmg:20, range:45, cd:1.9 },
      q:   { name:'Twisted Lunge',   learnLevel:1, dmgType:'physical', dmg:80, range:250, cd:8,
             effects:[{type:'cc',ccType:'knockback',duration:0.8}] },
      e:   { name:'Sapling Toss',    learnLevel:3, dmgType:'magic',    dmg:100, apRatio:0.5, range:500, cd:14,
             effects:[{type:'aoe',radius:200}] },
      ult: { name:"Nature's Grasp",  learnLevel:6, dmgType:'magic',    dmg:150, apRatio:0.6, range:800, cd:120,
             effects:[{type:'aoe',radius:80},{type:'cc',ccType:'root',duration:2.0}] },
    },
  },

  // Ornn-inspired: forge terrain wall, unstoppable charge ult
  'Ironsong': {
    class:'Tank', compType:'SCALING', role:'top',
    baseHp:750, baseDmg:18, attackRange:45, moveSpeed:290, physResist:85, magicResist:58,
    lore:'An ancient forge-guardian. Slow to anger, impossible to stop once moving.',
    abilities:{
      aa:  { dmgType:'physical', dmg:18, range:45, cd:2.0 },
      q:   { name:'Forge Slam',   learnLevel:1, dmgType:'physical', dmg:90,  range:200, cd:9,
             effects:[{type:'aoe',radius:150},{type:'cc',ccType:'slow',duration:1.0}] },
      e:   { name:'Living Forge', learnLevel:3, dmgType:'physical', dmg:60,  range:300, cd:16,
             effects:[{type:'terrain',duration:4},{type:'cc',ccType:'knockback',duration:0.6}] },
      ult: { name:"Ram's Charge", learnLevel:6, dmgType:'physical', dmg:200, range:1000, cd:130,
             effects:[{type:'cc',ccType:'knockup',duration:1.5},{type:'aoe',radius:200}] },
    },
  },

  // Jarvan IV-inspired: combo knockdown, arena cage ult
  'Thornwall': {
    class:'Tank', compType:'ENGAGE', role:'top',
    baseHp:700, baseDmg:22, attackRange:45, moveSpeed:300, physResist:78, magicResist:50,
    lore:'The indomitable knight of the Grove. His ult creates an arena none can escape.',
    abilities:{
      aa:  { dmgType:'physical', dmg:22, range:45, cd:1.9 },
      q:   { name:'Spear of Justice', learnLevel:1, dmgType:'physical', dmg:90,  range:400, cd:8,
             effects:[{type:'cc',ccType:'knockup',duration:1.0}] },
      e:   { name:'Standard Bearer',  learnLevel:3, dmgType:'physical', dmg:50,  range:300, cd:12,
             effects:[{type:'aoe',radius:180},{type:'cc',ccType:'slow',duration:1.0}] },
      ult: { name:'Cataclysm',        learnLevel:6, dmgType:'physical', dmg:150, range:600, cd:120,
             effects:[{type:'terrain',duration:6},{type:'cc',ccType:'knockup',duration:1.0},{type:'aoe',radius:250}] },
    },
  },

  'Deeproot': {
    class:'Tank', compType:'ENGAGE', role:'top',
    baseHp:690, baseDmg:20, attackRange:45, moveSpeed:295, physResist:78, magicResist:52,
    lore:'A primordial root-guardian. The earth itself rises to protect the Grove.',
    abilities:{
      aa:  { dmgType:'physical', dmg:20, range:45, cd:2.0 },
      q:   { name:'Root Snare',       learnLevel:1, dmgType:'magic', dmg:60,  apRatio:0.40, range:400, cd:9,
             effects:[{type:'cc',ccType:'root',duration:1.5}] },
      e:   { name:'Bark Shield',      learnLevel:3, dmgType:'none',  dmg:0,   range:250, cd:14,
             effects:[{type:'shield',amount:180,apRatio:0.5}] },
      ult: { name:'Ancient Uprising', learnLevel:6, dmgType:'magic', dmg:220, apRatio:0.70, range:500, cd:120,
             effects:[{type:'aoe',radius:300},{type:'cc',ccType:'knockup',duration:1.5}] },
    },
  },

  'Ironbark': {
    class:'Tank', compType:'ENGAGE', role:'top',
    baseHp:710, baseDmg:18, attackRange:45, moveSpeed:295, physResist:82, magicResist:55,
    lore:'An iron-bark colossus. Stands immovable and reflects the fury of his attackers.',
    abilities:{
      aa:  { dmgType:'physical', dmg:18, range:45, cd:2.0 },
      q:   { name:'Ironwood Strike',   learnLevel:1, dmgType:'physical', dmg:70, range:100, cd:8,
             effects:[{type:'cc',ccType:'stun',duration:1.0}] },
      e:   { name:'Petrify',           learnLevel:3, dmgType:'physical', dmg:55, range:80,  cd:13,
             effects:[{type:'cc',ccType:'stun',duration:1.5}] },
      ult: { name:'Ironwall Fortress', learnLevel:6, dmgType:'none',     dmg:0,  range:0,   cd:120,
             effects:[{type:'invuln',duration:3.0},{type:'reflect',pct:0.40,duration:3.0}] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // FIGHTERS (5) — primary role: vanguard
  // ══════════════════════════════════════════════════════════════════════

  // Pantheon-inspired: poke, shield stun, drop-from-sky ult
  'Stoneguard': {
    class:'Fighter', compType:'ENGAGE', role:'top',
    baseHp:610, baseDmg:30, attackRange:125, moveSpeed:330, physResist:62, magicResist:35,
    lore:'A spear warrior chosen by the Grove itself. His ult falls from the heavens onto his enemies.',
    abilities:{
      aa:  { dmgType:'physical', dmg:30, range:125, cd:1.8 },
      q:   { name:'Spear Thrust',    learnLevel:1, dmgType:'physical', dmg:90,  range:400, cd:7,
             effects:[{type:'cc',ccType:'stun',duration:0.5}] },
      e:   { name:'Shield Slam',     learnLevel:3, dmgType:'physical', dmg:70,  range:80,  cd:12,
             effects:[{type:'cc',ccType:'stun',duration:1.2}] },
      ult: { name:'Grand Starfall',  learnLevel:6, dmgType:'physical', dmg:280, range:1200, cd:130,
             effects:[{type:'aoe',radius:350},{type:'cc',ccType:'stun',duration:1.0}] },
    },
  },

  // Volibear-inspired: lightning bear, mixed damage, disables structures
  'Stormhide': {
    class:'Fighter', compType:'ENGAGE', role:'top',
    baseHp:650, baseDmg:28, attackRange:55, moveSpeed:335, physResist:65, magicResist:40,
    lore:'A living storm given bear-form. When his ult activates, even the Roots go silent.',
    abilities:{
      aa:  { dmgType:'physical', dmg:28, range:55, cd:1.8 },
      q:   { name:'Thunderclap',    learnLevel:1, dmgType:'mixed',  dmg:80,  apRatio:0.2,  range:100, cd:8,
             effects:[{type:'aoe',radius:150},{type:'cc',ccType:'slow',duration:1.0}] },
      e:   { name:'Sky Splitter',   learnLevel:3, dmgType:'magic',  dmg:120, apRatio:0.40, range:500, cd:14,
             effects:[{type:'aoe',radius:180},{type:'cc',ccType:'slow',duration:2.0}] },
      ult: { name:'Stormbringer',   learnLevel:6, dmgType:'magic',  dmg:200, apRatio:0.60, range:700, cd:130,
             effects:[{type:'aoe',radius:400},{type:'disableStructure',duration:3.0},{type:'cc',ccType:'slow',duration:2.0}] },
    },
  },

  'Thornback': {
    class:'Fighter', compType:'ENGAGE', role:'top',
    baseHp:600, baseDmg:28, attackRange:45, moveSpeed:325, physResist:60, magicResist:35,
    lore:'A berserker who shrugs off CC and charges into the heart of every fight.',
    abilities:{
      aa:  { dmgType:'physical', dmg:28, range:45, cd:1.8 },
      q:   { name:'Shield Slam',   learnLevel:1, dmgType:'physical', dmg:60,  range:60,  cd:8,
             effects:[{type:'cc',ccType:'stun',duration:0.8}] },
      e:   { name:'Spine Throw',   learnLevel:3, dmgType:'physical', dmg:80,  range:300, cd:14, effects:[] },
      ult: { name:'Wild Rampage',  learnLevel:6, dmgType:'physical', dmg:200, range:500, cd:120,
             effects:[{type:'aoe',radius:180},{type:'cc',ccType:'knockback',duration:1.2},{type:'invuln',duration:1.0}] },
    },
  },

  'Sylvara': {
    class:'Fighter', compType:'SPLITPUSH', role:'top',
    baseHp:570, baseDmg:32, attackRange:50, moveSpeed:345, physResist:60, magicResist:32,
    lore:'A duelist who kills objectives and champions alike. Fastest split-pusher in the game.',
    abilities:{
      aa:  { dmgType:'physical', dmg:32, range:50, cd:1.7 },
      q:   { name:'Blade Dance',      learnLevel:1, dmgType:'physical', dmg:70,  range:150, cd:8,
             effects:[{type:'aoe',radius:120}] },
      e:   { name:'Swift Parry',      learnLevel:3, dmgType:'physical', dmg:0,   range:0,   cd:14,
             effects:[{type:'invuln',duration:1.5}] },
      ult: { name:'Thousand Cuts',    learnLevel:6, dmgType:'physical', dmg:280, range:100, cd:110,
             effects:[{type:'execute',bonusPerMissingHpPct:5}] },
    },
  },

  'Briarvex': {
    class:'Fighter', compType:'ENGAGE', role:'top',
    baseHp:590, baseDmg:30, attackRange:50, moveSpeed:330, physResist:58, magicResist:33,
    lore:'A briar-armoured brawler. His ult makes him untouchable for 4 seconds of pure carnage.',
    abilities:{
      aa:  { dmgType:'physical', dmg:30, range:50, cd:1.8 },
      q:   { name:'Briar Lash',   learnLevel:1, dmgType:'physical', dmg:65, range:80,  cd:8,
             effects:[{type:'cc',ccType:'slow',duration:1.0},{type:'vamp',pct:0.12}] },
      e:   { name:'Spine Burst',  learnLevel:3, dmgType:'physical', dmg:90, range:200, cd:13,
             effects:[{type:'aoe',radius:200}] },
      ult: { name:'Frenzy',       learnLevel:6, dmgType:'physical', dmg:0,  range:0,   cd:120,
             effects:[{type:'invuln',duration:4.0},{type:'buffAlly',stat:'dmgDealtPct',pct:0.35,duration:4.0}] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // ASSASSINS (4) — primary role: arcanist / ranger
  // ══════════════════════════════════════════════════════════════════════

  'Shade': {
    class:'Assassin', compType:'ASSASSIN', role:'mid',
    baseHp:380, baseDmg:38, attackRange:60, moveSpeed:355, physResist:30, magicResist:28,
    lore:'A shadow that moves between worlds. You only hear it when it has already won.',
    abilities:{
      aa:  { dmgType:'physical', dmg:38, range:60, cd:1.6 },
      q:   { name:'Shadow Step',    learnLevel:1, dmgType:'physical', dmg:80,  range:400, cd:8,
             effects:[{type:'cc',ccType:'silence',duration:0.5}] },
      e:   { name:'Umbral Strike',  learnLevel:3, dmgType:'magic',    dmg:120, apRatio:0.50, range:300, cd:14,
             effects:[{type:'cc',ccType:'silence',duration:1.2}] },
      ult: { name:'Void Execution', learnLevel:6, dmgType:'magic',    dmg:320, apRatio:1.00, range:350, cd:120,
             effects:[{type:'cc',ccType:'silence',duration:1.5},{type:'execute',bonusPerMissingHpPct:4}] },
    },
  },

  'Hexwing': {
    class:'Assassin', compType:'ASSASSIN', role:'jungle',
    baseHp:370, baseDmg:40, attackRange:80, moveSpeed:350, physResist:30, magicResist:27,
    lore:'An aerial assassin that dives from above. High-risk, high-reward jungle predator.',
    abilities:{
      aa:  { dmgType:'physical', dmg:40, range:80, cd:1.6 },
      q:   { name:'Dive Bomb',           learnLevel:1, dmgType:'physical', dmg:90,  range:400, cd:8,
             effects:[{type:'aoe',radius:120}] },
      e:   { name:'Wing Slash',          learnLevel:3, dmgType:'physical', dmg:100, range:200, cd:14,
             effects:[{type:'aoe',radius:160},{type:'cc',ccType:'slow',duration:0.8}] },
      ult: { name:'Murder of Crows',     learnLevel:6, dmgType:'magic',    dmg:280, apRatio:0.70, range:500, cd:110,
             effects:[{type:'aoe',radius:300},{type:'channel',ticks:4}] },
    },
  },

  'Fangwhisper': {
    class:'Assassin', compType:'ASSASSIN', role:'jungle',
    baseHp:385, baseDmg:37, attackRange:65, moveSpeed:350, physResist:30, magicResist:27,
    lore:'A venomous predator. Stack enough poison and the target cannot run.',
    abilities:{
      aa:  { dmgType:'physical', dmg:37, range:65, cd:1.6 },
      q:   { name:'Venom Strike',  learnLevel:1, dmgType:'physical', dmg:70,  range:200, cd:7,
             effects:[{type:'cc',ccType:'slow',duration:1.0},{type:'vamp',pct:0.10}] },
      e:   { name:'Death Mark',    learnLevel:3, dmgType:'magic',    dmg:50,  apRatio:0.30, range:400, cd:16,
             effects:[{type:'cc',ccType:'stun',duration:0.5},{type:'stack',stat:'poisonStacks',perStack:1}] },
      ult: { name:'Lethal Dose',   learnLevel:6, dmgType:'magic',    dmg:280, apRatio:0.80, range:500, cd:120,
             effects:[{type:'execute',bonusPerMissingHpPct:3},{type:'cc',ccType:'stun',duration:2.0}] },
    },
  },

  'Driftblade': {
    class:'Assassin', compType:'SPLITPUSH', role:'mid',
    baseHp:375, baseDmg:36, attackRange:70, moveSpeed:360, physResist:30, magicResist:28,
    lore:'A wind-dancer who never stops moving. Her ult shreds everything in her path.',
    abilities:{
      aa:  { dmgType:'physical', dmg:36, range:70, cd:1.6 },
      q:   { name:'Wind Dash',       learnLevel:1, dmgType:'physical', dmg:60, range:350, cd:7,
             effects:[] },
      e:   { name:'Blade Gust',      learnLevel:3, dmgType:'physical', dmg:90, range:300, cd:13,
             effects:[{type:'aoe',radius:200},{type:'cc',ccType:'knockback',duration:0.8}] },
      ult: { name:'Tempest Flurry',  learnLevel:6, dmgType:'physical', dmg:260, range:250, cd:110,
             effects:[{type:'aoe',radius:250}] },
    },
  },

  // ══════════════════════════════════════════════════════════════════════
  // SENTINELS (5) — primary role: warden
  // ══════════════════════════════════════════════════════════════════════

  // Morgana-inspired: long root, vamp pool, soul chain ult (MUST INCLUDE)
  'Darkblossom': {
    class:'Sentinel', compType:'PROTECT', role:'support',
    baseHp:490, baseDmg:22, attackRange:540, moveSpeed:305, physResist:38, magicResist:50,
    lore:'A corrupted sentinel warped by dark magic. Her root is the longest in the game. Her ult chains their souls.',
    abilities:{
      aa:  { dmgType:'magic', dmg:22, range:540, cd:1.9 },
      q:   { name:'Thornbind',    learnLevel:1, dmgType:'magic', dmg:70,  apRatio:0.65, range:650, cd:11,
             effects:[{type:'cc',ccType:'root',duration:2.2}] },
      e:   { name:'Cursed Grove', learnLevel:3, dmgType:'magic', dmg:45,  apRatio:0.40, range:500, cd:10,
             effects:[{type:'aoe',radius:220},{type:'channel',ticks:5},{type:'spellVamp',pct:0.20}] },
      ult: { name:'Soul Blossom', learnLevel:6, dmgType:'magic', dmg:200, apRatio:0.75, range:400, cd:120,
             effects:[{type:'aoe',radius:380},{type:'cc',ccType:'slow',duration:2.0},{type:'cc',ccType:'stun',duration:1.5},{type:'selfMagicImmune',duration:2.5}] },
    },
  },

  // Blitzcrank-inspired: long-range pull hook, power fist ult
  'Irongrasp': {
    class:'Sentinel', compType:'ENGAGE', role:'support',
    baseHp:500, baseDmg:22, attackRange:140, moveSpeed:315, physResist:42, magicResist:48,
    lore:'A steam-powered golem. One hook and the fight is over before it begins.',
    abilities:{
      aa:  { dmgType:'physical', dmg:22, range:140, cd:1.9 },
      q:   { name:'Iron Hook',     learnLevel:1, dmgType:'physical', dmg:100, range:700, cd:16,
             effects:[{type:'pull'},{type:'cc',ccType:'stun',duration:0.5}] },
      e:   { name:'Static Field',  learnLevel:3, dmgType:'magic',    dmg:130, apRatio:0.50, range:300, cd:15,
             effects:[{type:'aoe',radius:300},{type:'cc',ccType:'silence',duration:0.5}] },
      ult: { name:'Power Fist',    learnLevel:6, dmgType:'physical', dmg:180, range:80,  cd:90,
             effects:[{type:'cc',ccType:'knockup',duration:1.2}] },
    },
  },

  // Braum-inspired: projectile-blocking shield wall, knockup ult
  'Stonewall': {
    class:'Sentinel', compType:'PROTECT', role:'support',
    baseHp:510, baseDmg:20, attackRange:120, moveSpeed:310, physResist:44, magicResist:50,
    lore:'A mountain given form. His shield stops projectiles dead. His ult splits the earth.',
    abilities:{
      aa:  { dmgType:'physical', dmg:20, range:120, cd:2.0 },
      q:   { name:'Rock Throw',        learnLevel:1, dmgType:'physical', dmg:80,  range:500, cd:8,
             effects:[{type:'cc',ccType:'slow',duration:1.5}] },
      e:   { name:'Unbreakable',       learnLevel:3, dmgType:'none',     dmg:0,   range:200, cd:14,
             effects:[{type:'shield',amount:200,apRatio:0.0}] },
      ult: { name:'Glacial Fissure',   learnLevel:6, dmgType:'physical', dmg:180, range:600, cd:130,
             effects:[{type:'aoe',radius:80},{type:'cc',ccType:'knockup',duration:1.2},{type:'cc',ccType:'slow',duration:2.0}] },
    },
  },

  // Nami/Lulu-inspired: heal+buff ally, knockup ult
  'Tidecaller': {
    class:'Sentinel', compType:'PROTECT', role:'support',
    baseHp:470, baseDmg:20, attackRange:550, moveSpeed:305, physResist:36, magicResist:50,
    lore:'A tide-spirit who lifts allies and drowns enemies. The team plays better when she is near.',
    abilities:{
      aa:  { dmgType:'magic', dmg:20, range:550, cd:2.0 },
      q:   { name:'Tidal Wave',     learnLevel:1, dmgType:'magic', dmg:80,  apRatio:0.55, range:580, cd:10,
             effects:[{type:'cc',ccType:'slow',duration:2.0},{type:'aoe',radius:200}] },
      e:   { name:'Surge Blessing', learnLevel:3, dmgType:'none',  dmg:0,   range:500, cd:8,
             effects:[{type:'heal',amount:120,apRatio:0.50},{type:'buffAlly',stat:'nextAttackDmgPct',pct:0.15,duration:2.0}] },
      ult: { name:'Oceanic Surge',  learnLevel:6, dmgType:'magic', dmg:160, apRatio:0.70, range:700, cd:120,
             effects:[{type:'aoe',radius:450},{type:'cc',ccType:'knockup',duration:1.0},{type:'buffAlly',stat:'moveSpeedPct',pct:0.20,duration:3.0}] },
    },
  },

  // Thresh-inspired: lantern ally-dash, cage ult
  'Gravewarden': {
    class:'Sentinel', compType:'ENGAGE', role:'support',
    baseHp:495, baseDmg:22, attackRange:460, moveSpeed:310, physResist:40, magicResist:48,
    lore:'A soul-collector who offers salvation or damnation. His cage catches what his chain misses.',
    abilities:{
      aa:  { dmgType:'magic', dmg:22, range:460, cd:1.9 },
      q:   { name:'Soul Chain',     learnLevel:1, dmgType:'magic', dmg:80,  apRatio:0.50, range:680, cd:14,
             effects:[{type:'cc',ccType:'root',duration:1.5},{type:'pull'}] },
      e:   { name:'Death Lantern',  learnLevel:3, dmgType:'none',  dmg:0,   range:600, cd:14,
             effects:[{type:'allyDash'},{type:'shield',amount:150,apRatio:0.3}] },
      ult: { name:'The Box',        learnLevel:6, dmgType:'magic', dmg:120, apRatio:0.40, range:500, cd:120,
             effects:[{type:'terrain',duration:5},{type:'cc',ccType:'slow',duration:1.5},{type:'aoe',radius:280}] },
    },
  },

};

// ─── Comp synergy bonuses ─────────────────────────────────────────────────────
// 3+ champions of same compType on a team activates the synergy

const COMP_SYNERGIES = {
  ENGAGE:    { name:'Engage Comp',        compType:'ENGAGE',    desc:'+teamfight power, Warden contests' },
  POKE:      { name:'Poke Comp',          compType:'POKE',      desc:'+range pressure, Root sieging' },
  ASSASSIN:  { name:'Pick Comp',          compType:'ASSASSIN',  desc:'+burst on isolated targets' },
  PROTECT:   { name:'Protect the Carry',  compType:'PROTECT',   desc:'+boss fight survivability, carry effectiveness' },
  SPLITPUSH: { name:'Splitpush Comp',     compType:'SPLITPUSH', desc:'+Root pressure, side-lane dominance' },
  SCALING:   { name:'Scaling Comp',       compType:'SCALING',   desc:'+late-game power, Ancient fight damage' },
};

function getCompType(team) {
  const counts = {};
  team.forEach(player => {
    if (!player || !player.champion) return;
    const champ = CHAMPIONS[player.champion];
    if (!champ) return;
    counts[champ.compType] = (counts[champ.compType] || 0) + 1;
  });
  for (const [type, count] of Object.entries(counts)) {
    if (count >= 3) return type;
  }
  return null;
}
