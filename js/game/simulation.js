// js/game/simulation.js — Real tick-based agent simulation engine
// Phase 6: Every champion is a live agent with position, HP, state machine, target.
// Events and kills EMERGE from simulation — nothing is scripted or predetermined.

'use strict';

// ─── Engine constants ─────────────────────────────────────────────────────────

const TICK_S         = 3;     // in-game seconds per engine tick
const MAX_TICKS      = 240;   // 12 in-game minutes
const MOVE_SCALE     = 60;    // moveSpeed unit → px/tick = moveSpeed * TICK_S / MOVE_SCALE
const STR_DMG_REDUCE = 0.22;  // fraction of damage champions deal to structures

// Attack / aggro ranges in map pixels (map is 300×300)
const CLASS_RANGES = {
  tank:     { atk:  8, aggro: 28 },
  fighter:  { atk: 10, aggro: 30 },
  assassin: { atk: 12, aggro: 32 },
  mage:     { atk: 52, aggro: 58 },
  marksman: { atk: 58, aggro: 64 },
  sentinel: { atk: 46, aggro: 52 },
};

// XP thresholds (cumulative) for levels 1→10
const XP_THRESH  = [0, 150, 400, 750, 1200, 1750, 2400, 2650, 2950, 3300];
const XP_CS      = 32;
const XP_JG_SM   = 65;
const XP_JG_LG   = 125;
const XP_KILL    = 300;
const XP_ASSIST  = 150;
const XP_OBJ     = 120;
const XP_WARDEN  = 200;

// ─── Map layout (300×300 pixel space) ────────────────────────────────────────
// Blue = bottom-left corner, Red = top-right corner.

const SPAWN = {
  blue: { x: 22,  y: 278 },
  red:  { x: 278, y: 22  },
};

// Where each role walks during the laning phase
const LANE_POS = {
  blue: {
    vanguard: { x:140, y:160 },
    ranger:   { x: 90, y:195 },
    arcanist: { x:155, y:155 },
    hunter:   { x:150, y:200 },
    warden:   { x:145, y:205 },
  },
  red: {
    vanguard: { x:160, y:140 },
    ranger:   { x:210, y:105 },
    arcanist: { x:145, y:145 },
    hunter:   { x:150, y:100 },
    warden:   { x:155, y: 95 },
  },
};

// Objectives
const OBJ_DEFS = [
  { id:'b_outer',   side:'blue',    type:'root',    x: 95, y:205, maxHp: 4000, atkDmg: 8, atkRange:32 },
  { id:'b_inner',   side:'blue',    type:'root',    x: 65, y:235, maxHp: 5500, atkDmg:12, atkRange:32 },
  { id:'b_heart',   side:'blue',    type:'root',    x: 40, y:258, maxHp: 7000, atkDmg:18, atkRange:32 },
  { id:'b_ancient', side:'blue',    type:'ancient', x: 22, y:278, maxHp:12000, atkDmg:25, atkRange:36 },
  { id:'r_outer',   side:'red',     type:'root',    x:205, y: 95, maxHp: 4000, atkDmg: 8, atkRange:32 },
  { id:'r_inner',   side:'red',     type:'root',    x:235, y: 65, maxHp: 5500, atkDmg:12, atkRange:32 },
  { id:'r_heart',   side:'red',     type:'root',    x:258, y: 40, maxHp: 7000, atkDmg:18, atkRange:32 },
  { id:'r_ancient', side:'red',     type:'ancient', x:278, y: 22, maxHp:12000, atkDmg:25, atkRange:36 },
  { id:'shrine_a',  side:'neutral', type:'shrine',  x:120, y:130, maxHp: 2000, atkDmg: 0, atkRange: 0 },
  { id:'shrine_b',  side:'neutral', type:'shrine',  x:180, y:170, maxHp: 2000, atkDmg: 0, atkRange: 0 },
  { id:'warden_b',  side:'neutral', type:'warden',  x: 72, y:162, maxHp: 5000, atkDmg: 6, atkRange:28 },
  { id:'warden_r',  side:'neutral', type:'warden',  x:228, y:138, maxHp: 5000, atkDmg: 6, atkRange:28 },
];

// Jungle camps
const JUNGLE_DEF = [
  { id:'bjc1', side:'blue', large:false, x:102, y:218, maxHp:400, xp:XP_JG_SM, gold:30, respawn:20 },
  { id:'bjc2', side:'blue', large:false, x: 68, y:188, maxHp:400, xp:XP_JG_SM, gold:30, respawn:20 },
  { id:'bjcL', side:'blue', large:true,  x: 82, y:202, maxHp:700, xp:XP_JG_LG, gold:60, respawn:30 },
  { id:'rjc1', side:'red',  large:false, x:198, y: 82, maxHp:400, xp:XP_JG_SM, gold:30, respawn:20 },
  { id:'rjc2', side:'red',  large:false, x:232, y:112, maxHp:400, xp:XP_JG_SM, gold:30, respawn:20 },
  { id:'rjcL', side:'red',  large:true,  x:218, y: 98, maxHp:700, xp:XP_JG_LG, gold:60, respawn:30 },
];

// ─── Agent initialisation ─────────────────────────────────────────────────────

function initAgent(side, posIdx, player, champName) {
  const pos    = POSITIONS[posIdx];
  const cd     = CHAMPIONS[champName] || {};
  const cls    = (cd.class || 'Mage').toLowerCase();
  const ranges = CLASS_RANGES[cls] || CLASS_RANGES.mage;
  const sp     = SPAWN[side];
  const off    = [-12, -6, 0, 6, 12];
  const ox     = off[posIdx] * (side === 'blue' ?  0.5 : -0.5);
  const oy     = off[posIdx] * (side === 'blue' ? -0.5 :  0.5);

  return {
    id: `${side[0]}${posIdx}`,
    side, pos,
    champName,
    champData:  cd,
    playerRef:  player,
    cls,

    x: sp.x + ox,
    y: sp.y + oy,

    level: 1, xp: 0,
    gold: 500,

    maxHp: cd.baseHp || 420,
    hp:    cd.baseHp || 420,

    physDmg:      cd.baseDmg    || 30,
    abilityPower: 0,
    physResist:   cd.physResist || 30,
    magicResist:  cd.magicResist|| 35,
    moveSpeed:    cd.moveSpeed  || 300,
    atkRange:     ranges.atk,
    aggroRange:   ranges.aggro,
    vamp: 0, spellVamp: 0, magicPen: 0, physPen: 0, cdr: 0,

    items: [],

    isDead:      false,
    respawnAt:   0,
    recallStart: -1,

    cdAA: 0, cdQ: 0, cdE: 0, cdUlt: 0,

    state:  'laning',
    target: null,

    kills: 0, deaths: 0, assists: 0, cs: 0, damageDealt: 0,
    recentDmgFrom: [],
  };
}

// ─── Level-up ─────────────────────────────────────────────────────────────────

function grantXP(agent, amount) {
  agent.xp += amount;
  while (agent.level < 10 && agent.xp >= XP_THRESH[agent.level]) {
    agent.level++;
    const L  = agent.level;
    const cd = agent.champData;
    const newMax = Math.round((cd.baseHp || 420) * (1 + (L - 1) * 0.07));
    agent.hp      = Math.min(newMax, agent.hp + (newMax - agent.maxHp));
    agent.maxHp   = newMax;
    agent.physDmg    = (cd.baseDmg    || 30) + (L-1)*3;
    agent.physResist = (cd.physResist || 30) + (L-1)*3;
    agent.magicResist= (cd.magicResist|| 35) + (L-1)*2;
    // Re-add item bonuses
    agent.items.forEach(id => {
      const s = ITEM_MAP[id]?.stats;
      if (!s) return;
      if (s.physDmg)    agent.physDmg     += s.physDmg;
      if (s.physResist) agent.physResist  += s.physResist;
      if (s.magicResist)agent.magicResist += s.magicResist;
    });
  }
}

// ─── Items ────────────────────────────────────────────────────────────────────

function buyItems(agent) {
  const role = (agent.champData?.class || 'mage').toLowerCase();
  const eligible = getItemsForRole(role)
    .filter(it => !agent.items.includes(it.id))
    .sort((a,b) => b.cost - a.cost);

  while (agent.items.length < 3) {
    const best = eligible.find(it => it.cost <= agent.gold);
    if (!best) break;
    agent.items.push(best.id);
    agent.gold -= best.cost;
    eligible.splice(eligible.indexOf(best), 1);
    const s = best.stats;
    if (s.maxHp)           { agent.maxHp += s.maxHp; agent.hp = Math.min(agent.maxHp, agent.hp + s.maxHp); }
    if (s.physResist)       agent.physResist    += s.physResist;
    if (s.magicResist)      agent.magicResist   += s.magicResist;
    if (s.abilityPower)     agent.abilityPower  += s.abilityPower;
    if (s.physDmg)          agent.physDmg       += s.physDmg;
    if (s.vamp)             agent.vamp          += s.vamp;
    if (s.spellVamp)        agent.spellVamp     += s.spellVamp;
    if (s.moveSpeed)        agent.moveSpeed     += s.moveSpeed;
    if (s.magicPen)         agent.magicPen      += s.magicPen;
    if (s.physPen)          agent.physPen       += s.physPen;
    if (s.cooldownReduction)agent.cdr           += s.cooldownReduction;
  }
}

// ─── Damage ───────────────────────────────────────────────────────────────────

function dealDamage(attacker, target, rawDmg, dmgType, tick) {
  const mechFactor = 0.85 + (attacker.playerRef?.stats?.mechanics || 10) / 20 * 0.30;
  const resist = dmgType === 'magic'
    ? Math.max(0, target.magicResist - attacker.magicPen)
    : Math.max(0, target.physResist  - attacker.physPen);
  const dmg = Math.max(1, Math.round(rawDmg * (100 / (100 + resist)) * mechFactor));

  target.hp          -= dmg;
  attacker.damageDealt += dmg;

  const vampRate = dmgType === 'magic' ? attacker.spellVamp : attacker.vamp;
  if (vampRate > 0)
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(dmg * vampRate));

  target.recentDmgFrom = target.recentDmgFrom.filter(e => tick - e.tick <= 20);
  if (!target.recentDmgFrom.find(e => e.id === attacker.id))
    target.recentDmgFrom.push({ id: attacker.id, tick });

  return dmg;
}

function dealObjDamage(attacker, obj, rawDmg) {
  const dmg = Math.max(1, Math.round(rawDmg * STR_DMG_REDUCE));
  obj.hp = Math.max(0, obj.hp - dmg);
  attacker.damageDealt += dmg;
  return dmg;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

function decideAction(agent, allies, enemies, objs, jungles, tick, phase) {
  if (agent.isDead || agent.state === 'dead') return;
  if (agent.state === 'recalling') return;

  const composure = agent.playerRef?.stats?.composure || 10;
  const gameSense = agent.playerRef?.stats?.gameSense  || 10;
  const fleeHP    = 0.12 + (1 - composure / 20) * 0.18;

  // 1. Critical HP → recall
  if (agent.hp / agent.maxHp < 0.08) {
    agent.state = 'recalling';
    agent.recallStart = tick;
    agent.target = { type:'position', x: SPAWN[agent.side].x, y: SPAWN[agent.side].y };
    return;
  }

  // 2. Low HP → retreat
  if (agent.hp / agent.maxHp < fleeHP && agent.state !== 'retreating') {
    agent.state  = 'retreating';
    agent.target = { type:'position', x: SPAWN[agent.side].x, y: SPAWN[agent.side].y };
    return;
  }

  // 3. Retreating but recovered
  if (agent.state === 'retreating' && agent.hp / agent.maxHp > 0.60) {
    agent.state  = 'laning';
    agent.target = null;
  }

  // 4. Enemy in aggro range → fight
  const nearEnemy = findNearest(agent, enemies.filter(e => !e.isDead), agent.aggroRange);
  if (nearEnemy) {
    agent.state  = 'fighting';
    agent.target = { type:'champion', ref: nearEnemy };
    return;
  }

  // Clear stale fight target
  if (agent.state === 'fighting' && (!agent.target?.ref || agent.target.ref.isDead)) {
    agent.state  = 'laning';
    agent.target = null;
  }

  const enemySide = agent.side === 'blue' ? 'red' : 'blue';

  // 5. Ranger: jungle or gank
  if (agent.pos === 'ranger') {
    if (gameSense > 12) {
      const gankTarget = enemies.find(e => !e.isDead && e.hp/e.maxHp < 0.55 && dist(agent,e) < 100);
      if (gankTarget) {
        agent.state  = 'fighting';
        agent.target = { type:'champion', ref: gankTarget };
        return;
      }
    }
    const camp = jungles.filter(j => j.alive && j.side === agent.side)
                        .sort((a,b) => dist(agent,a) - dist(agent,b))[0];
    if (camp) {
      agent.state  = 'jungling';
      agent.target = { type:'jungle', ref: camp };
      return;
    }
  }

  // 6. Late-game push toward enemy objectives
  if (phase >= 2 && gameSense > 7) {
    const seq = enemySide === 'red'
      ? ['r_outer','r_inner','r_heart','r_ancient']
      : ['b_outer','b_inner','b_heart','b_ancient'];
    const nextObj = objs.find(o => seq.includes(o.id) && !o.destroyed);
    if (nextObj && dist(agent, nextObj) < 140) {
      agent.state  = 'contesting';
      agent.target = { type:'objective', ref: nextObj };
      return;
    }
  }

  // 7. Shrine contestation (mid-game)
  if (phase >= 1 && gameSense > 9) {
    const shrine = objs.find(o => o.type === 'shrine' && !o.tempDown && dist(agent, o) < 80);
    if (shrine) {
      agent.state  = 'contesting';
      agent.target = { type:'objective', ref: shrine };
      return;
    }
  }

  // 8. Warden opportunity
  if (agent.hp / agent.maxHp > 0.50) {
    const myWarden = objs.find(o => o.type === 'warden' && !o.tempDown && dist(agent, o) < 45);
    if (myWarden) {
      agent.state  = 'contesting';
      agent.target = { type:'warden', ref: myWarden };
      return;
    }
  }

  // 9. Default: walk toward assigned position (shifts in late-game toward enemy)
  const lt = laneTarget(agent.side, agent.pos, phase, enemySide, objs);
  agent.state  = 'laning';
  agent.target = { type:'position', x: lt.x, y: lt.y };
}

function laneTarget(side, pos, phase, enemySide, objs) {
  if (phase >= 2) {
    const seq = enemySide === 'red'
      ? ['r_outer','r_inner','r_heart','r_ancient']
      : ['b_outer','b_inner','b_heart','b_ancient'];
    const next = objs.find(o => seq.includes(o.id) && !o.destroyed);
    if (next) return { x: next.x, y: next.y };
  }
  return LANE_POS[side][pos];
}

// ─── Movement ─────────────────────────────────────────────────────────────────

function moveAgent(agent) {
  if (agent.isDead || !agent.target) return;
  const t = agent.target;
  let tx, ty;
  if (t.ref) {
    if (t.type === 'champion' && t.ref.isDead) { agent.target = null; return; }
    tx = t.ref.x; ty = t.ref.y;
  } else { tx = t.x || 150; ty = t.y || 150; }

  const dx = tx - agent.x, dy = ty - agent.y;
  const d  = Math.sqrt(dx*dx + dy*dy);
  if (d < 2) return;

  const speed = agent.moveSpeed * TICK_S / MOVE_SCALE;
  const step  = Math.min(d, speed);
  agent.x += (dx/d) * step;
  agent.y += (dy/d) * step;
}

// ─── Combat ───────────────────────────────────────────────────────────────────

function doCombat(agent, enemies, objs, jungles, tick) {
  if (agent.isDead || agent.state === 'retreating' || agent.state === 'recalling') return;

  // ── vs Champion ────────────────────────────────────────────────────────
  if (agent.state === 'fighting' && agent.target?.type === 'champion') {
    const enemy = agent.target.ref;
    if (!enemy || enemy.isDead) { agent.state='laning'; agent.target=null; return; }
    if (dist(agent, enemy) > agent.atkRange) return;

    const aa = agent.champData?.abilities?.aa;
    if (agent.cdAA <= 0) {
      const dmg = aa ? aa.dmg : agent.physDmg;
      const tp  = aa?.dmgType || 'physical';
      dealDamage(agent, enemy, dmg, tp, tick);
      agent.cdAA = Math.ceil((aa?.cd || 2.0) * (1 - agent.cdr) / TICK_S);
    }
    if (agent.cdQ <= 0 && agent.level >= 1) {
      const q = agent.champData?.abilities?.q;
      if (q && dist(agent, enemy) <= (q.range/18 || agent.atkRange + 10)) {
        dealDamage(agent, enemy, q.dmg + (q.apRatio||0)*agent.abilityPower, q.dmgType||'magic', tick);
        agent.cdQ = Math.ceil(q.cd * (1-agent.cdr) / TICK_S);
      }
    }
    if (agent.cdE <= 0 && agent.level >= 3) {
      const e = agent.champData?.abilities?.e;
      if (e && dist(agent, enemy) <= (e.range/18 || agent.atkRange + 8)) {
        dealDamage(agent, enemy, e.dmg + (e.apRatio||0)*agent.abilityPower, e.dmgType||'magic', tick);
        agent.cdE = Math.ceil(e.cd * (1-agent.cdr) / TICK_S);
      }
    }
    if (agent.cdUlt <= 0 && agent.level >= 6) {
      const ult = agent.champData?.abilities?.ult;
      if (ult) {
        dealDamage(agent, enemy, ult.dmg + (ult.apRatio||0)*agent.abilityPower, ult.dmgType||'magic', tick);
        agent.cdUlt = Math.ceil(ult.cd * (1-agent.cdr) / TICK_S);
      }
    }
    return;
  }

  // ── vs Objective / Warden ──────────────────────────────────────────────
  if (agent.state === 'contesting' && agent.target?.type === 'objective') {
    const obj = agent.target.ref;
    if (!obj || obj.destroyed || obj.tempDown) { agent.target=null; agent.state='laning'; return; }
    if (dist(agent, obj) > agent.atkRange + 6) return;
    if (agent.cdAA <= 0) {
      const aa  = agent.champData?.abilities?.aa;
      dealObjDamage(agent, obj, aa ? aa.dmg : agent.physDmg);
      agent.cdAA = Math.ceil((aa?.cd||2.0)*(1-agent.cdr)/TICK_S);
    }
    if (agent.cdQ <= 0 && agent.level >= 1) {
      const q = agent.champData?.abilities?.q;
      if (q) {
        dealObjDamage(agent, obj, (q.dmg + (q.apRatio||0)*agent.abilityPower) * 0.5);
        agent.cdQ = Math.ceil(q.cd*(1-agent.cdr)/TICK_S);
      }
    }
    return;
  }

  if (agent.state === 'contesting' && agent.target?.type === 'warden') {
    const obj = agent.target.ref;
    if (!obj || obj.tempDown) { agent.target=null; agent.state='laning'; return; }
    if (dist(agent, obj) > agent.atkRange + 6) return;
    if (agent.cdAA <= 0) {
      dealObjDamage(agent, obj, agent.physDmg + agent.abilityPower * 0.5);
      agent.cdAA = Math.ceil(((agent.champData?.abilities?.aa?.cd)||2.0)*(1-agent.cdr)/TICK_S);
    }
    return;
  }

  // ── Jungling ───────────────────────────────────────────────────────────
  if (agent.state === 'jungling' && agent.target?.type === 'jungle') {
    const camp = agent.target.ref;
    if (!camp || !camp.alive) { agent.target=null; agent.state='laning'; return; }
    if (dist(agent, camp) > 22) return;
    if (agent.cdAA <= 0) {
      camp.hp -= (agent.physDmg + agent.abilityPower * 0.3);
      agent.cdAA = Math.ceil(((agent.champData?.abilities?.aa?.cd)||2.0)*(1-agent.cdr)/TICK_S);
      if (camp.hp <= 0) {
        camp.alive    = false;
        camp.respawnAt = tick + camp.respawn;
        camp.hp       = camp.maxHp;
        agent.cs++;
        agent.gold   += camp.gold;
        grantXP(agent, camp.xp);
      }
    }
  }
}

// ─── Objective counter-attack ─────────────────────────────────────────────────

function objCounterAttack(objs, agents) {
  objs.forEach(obj => {
    if (obj.destroyed || obj.tempDown || obj.atkDmg <= 0 || obj.side === 'neutral') return;
    agents.forEach(ag => {
      if (ag.isDead || ag.side === obj.side) return;
      if (dist(ag, obj) <= obj.atkRange) ag.hp -= obj.atkDmg;
    });
  });
}

// ─── Respawn & recall ─────────────────────────────────────────────────────────

function processRespawns(agents, tick) {
  agents.forEach(ag => {
    if (!ag.isDead) return;
    if (tick >= ag.respawnAt) {
      ag.isDead = false;
      ag.hp     = Math.round(ag.maxHp * 0.65);
      ag.x      = SPAWN[ag.side].x + (Math.random()-0.5)*8;
      ag.y      = SPAWN[ag.side].y + (Math.random()-0.5)*8;
      ag.state  = 'laning';
      ag.target = null;
      buyItems(ag);
    }
  });
}

function processRecalls(agents, tick) {
  agents.forEach(ag => {
    if (ag.state !== 'recalling') return;
    if (tick - ag.recallStart >= 5) {
      ag.hp          = ag.maxHp;
      ag.x           = SPAWN[ag.side].x + (Math.random()-0.5)*6;
      ag.y           = SPAWN[ag.side].y + (Math.random()-0.5)*6;
      ag.state       = 'laning';
      ag.target      = null;
      ag.recallStart = -1;
      buyItems(ag);
    }
  });
}

// ─── Kill resolution ──────────────────────────────────────────────────────────

function resolveDeaths(agents, events, score, tick) {
  agents.forEach(ag => {
    if (ag.isDead || ag.hp > 0) return;
    ag.isDead    = true;
    ag.hp        = 0;
    ag.deaths++;
    ag.respawnAt = tick + Math.min(28, 8 + Math.floor(ag.level * 1.4));
    ag.state     = 'dead';
    ag.target    = null;

    const killerPool = agents.filter(a => a.side !== ag.side && !a.isDead);
    const killer     = killerPool[0] || null;

    if (killer) {
      killer.kills++;
      killer.gold += 300;
      grantXP(killer, XP_KILL);
    }

    const assisters = agents.filter(a =>
      a.side !== ag.side && a !== killer && !a.isDead &&
      ag.recentDmgFrom.some(e => e.id === a.id)
    );
    assisters.forEach(a => { a.assists++; a.gold += 150; grantXP(a, XP_ASSIST); });
    ag.recentDmgFrom = [];

    const killSide = ag.side === 'blue' ? 'red' : 'blue';
    if (killSide === 'blue') score.blueKills++;
    else                     score.redKills++;

    events.push({
      tick, side: killSide, time: fmtTime(tick), type: 'kill',
      text: `${killer?.champName || '?'} eliminated ${ag.champName}!`,
      blueKills: score.blueKills, redKills: score.redKills,
      blueShrines: score.blueShrines, redShrines: score.redShrines,
      blueRoots: score.blueRoots, redRoots: score.redRoots,
      advAfter: advScore(score, agents),
      positions: posMap(agents),
      killBlue: killSide === 'blue',
    });
  });
}

// ─── Objective resolution ─────────────────────────────────────────────────────

function resolveObjectives(objs, agents, events, score, tick) {
  objs.forEach(obj => {
    if (obj.destroyed || obj.tempDown || obj.hp > 0) return;
    obj.hp = 0;

    const capSide = obj.side === 'blue' ? 'red' : obj.side === 'red' ? 'blue'
      : (agents.filter(a => !a.isDead && dist(a,obj) < 80).sort((a,b) => dist(a,obj)-dist(b,obj))[0]?.side || 'blue');

    const near = agents.filter(a => a.side === capSide && !a.isDead && dist(a,obj) < 80);
    const xpR  = obj.type === 'warden' ? XP_WARDEN : XP_OBJ;
    const gdR  = obj.type === 'shrine' ? 150 : obj.type === 'warden' ? 300 : 200;
    near.forEach(a => { grantXP(a, xpR); a.gold += gdR; });

    const baseEv = {
      tick, side: capSide, time: fmtTime(tick), type: 'objective',
      blueKills: score.blueKills, redKills: score.redKills,
      blueShrines: score.blueShrines, redShrines: score.redShrines,
      blueRoots: score.blueRoots, redRoots: score.redRoots,
      positions: posMap(agents),
    };

    if (obj.type === 'shrine') {
      if (capSide === 'blue') score.blueShrines++; else score.redShrines++;
      obj.hp = obj.maxHp; obj.tempDown = true; obj.respawnAt = tick + 90;
      events.push({ ...baseEv,
        text: `${capSide === 'blue' ? 'BLUE' : 'RED'} seized a Ley Shrine!`,
        advAfter: advScore(score, agents),
        blueShrines: score.blueShrines, redShrines: score.redShrines,
        shrineBlue: capSide==='blue', shrineRed: capSide==='red' });
    } else if (obj.type === 'warden') {
      score[capSide==='blue' ? 'blueWarden' : 'redWarden']++;
      obj.hp = obj.maxHp; obj.tempDown = true; obj.respawnAt = tick + 120;
      events.push({ ...baseEv,
        text: `${capSide === 'blue' ? 'BLUE' : 'RED'} slew the Grove Warden!`,
        advAfter: advScore(score, agents),
        wardenBlue: capSide==='blue', wardenRed: capSide==='red' });
    } else if (obj.type === 'root') {
      obj.destroyed = true;
      if (capSide === 'blue') score.blueRoots++; else score.redRoots++;
      events.push({ ...baseEv,
        text: `${capSide === 'blue' ? 'BLUE' : 'RED'} destroyed ${obj.side === 'blue' ? 'Blue' : 'Red'}'s Root tower!`,
        advAfter: advScore(score, agents),
        blueRoots: score.blueRoots, redRoots: score.redRoots,
        towerBlue: capSide==='blue' });
    } else if (obj.type === 'ancient') {
      obj.destroyed  = true;
      score.winner   = capSide;
    }
  });
}

// ─── Per-tick systems ─────────────────────────────────────────────────────────

function tickCDs(agents) {
  agents.forEach(ag => {
    if (ag.cdAA  > 0) ag.cdAA--;
    if (ag.cdQ   > 0) ag.cdQ--;
    if (ag.cdE   > 0) ag.cdE--;
    if (ag.cdUlt > 0) ag.cdUlt--;
  });
}

function tickJungles(jungles, tick) {
  jungles.forEach(c => {
    if (!c.alive && tick >= (c.respawnAt || 0)) { c.alive = true; c.hp = c.maxHp; }
  });
}

function tickObjRespawns(objs, tick) {
  objs.forEach(o => { if (o.tempDown && tick >= o.respawnAt) o.tempDown = false; });
}

function tickPassiveGold(agents) {
  agents.forEach(ag => {
    if (ag.isDead) return;
    ag.gold += ag.pos === 'ranger' ? 40 : 44;
    if (ag.state === 'laning' && ag.pos !== 'ranger') {
      const rate = 0.28 + (ag.playerRef?.stats?.csAccuracy || 10) / 20 * 0.52;
      if (Math.random() < rate) { ag.cs++; ag.gold += 21; grantXP(ag, XP_CS); }
    }
  });
}

function tickRegen(agents) {
  agents.forEach(ag => {
    if (ag.isDead || ag.state === 'fighting') return;
    const r = ag.items.reduce((s,id) => s + (ITEM_MAP[id]?.stats?.hpRegen||0), 0.5);
    if (r > 0) ag.hp = Math.min(ag.maxHp, ag.hp + r);
  });
}

// ─── Snapshot & helpers ───────────────────────────────────────────────────────

function buildSnapshot(tick, agents, objs, score) {
  return {
    tick,
    positions: posMap(agents),
    objectives: objs.map(o => ({
      id: o.id, hp: Math.max(0, o.hp), maxHp: o.maxHp,
      destroyed: !!o.destroyed, tempDown: !!o.tempDown,
    })),
    score: { ...score },
  };
}

function posMap(agents) {
  const m = { blue:{}, red:{} };
  agents.forEach(ag => {
    m[ag.side][ag.pos] = { x: Math.round(ag.x), y: Math.round(ag.y), alive: !ag.isDead };
  });
  return m;
}

function dist(a, b) {
  const dx = a.x-b.x, dy = a.y-b.y;
  return Math.sqrt(dx*dx+dy*dy);
}

function findNearest(agent, pool, range) {
  let best = null, bestD = range;
  pool.forEach(p => { const d = dist(agent,p); if (d < bestD) { bestD=d; best=p; } });
  return best;
}

function fmtTime(tick) {
  const s = tick * TICK_S;
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

function advScore(score, agents) {
  const bA = agents.filter(a=>a.side==='blue'&&!a.isDead).length;
  const rA = agents.filter(a=>a.side==='red' &&!a.isDead).length;
  const bs = score.blueKills*3 + score.blueShrines*4 + score.blueRoots*7 + bA;
  const rs = score.redKills *3 + score.redShrines *4 + score.redRoots *7 + rA;
  return Math.round(Math.min(84, Math.max(16, bs/(bs+rs||1)*100)));
}

function totalGold(agents, side) {
  return agents.filter(a=>a.side===side).reduce((s,a)=>s+a.gold,0);
}

// Commentary lines
const _COMMENTARY = [
  'Both teams trading blows in the mid-lane.',
  'The jungle is heating up — wards are down.',
  'Vision control is being contested near the shrines.',
  'Poke damage slowly whittles down the front-line.',
  'Teams jockeying for Ley Shrine priority.',
  'A beautiful engage caught them completely off guard.',
  'Split-push pressure is mounting on the flanks.',
  'Calculated positioning near the Ancient Roots.',
  'The Grove Warden looms large over this contested zone.',
  'The support is doing exceptional peel work.',
];
let _commIdx = 0;

// ─── Main simulation entry point ──────────────────────────────────────────────

function simulateMatch(blueTeamArr, redTeamArr, blueName, redName, preDraft) {
  _commIdx = 0;
  const draft = preDraft || draftChampions(blueTeamArr, redTeamArr);

  // Init agents
  const blueAgents = blueTeamArr.map((p, i) =>
    initAgent('blue', i, p, draft.blue[i] || 'Wraithfern'));
  const redAgents  = redTeamArr.map((p, i) =>
    initAgent('red',  i, p, draft.red[i]  || 'Bombspore'));
  const all = [...blueAgents, ...redAgents];

  all.forEach(ag => buyItems(ag));

  // Init objectives and jungles
  const objs    = OBJ_DEFS.map(d => ({ ...d, hp: d.maxHp, destroyed: false, tempDown: false, respawnAt: 0 }));
  const jungles = JUNGLE_DEF.map(d => ({ ...d, hp: d.maxHp, alive: true, respawnAt: 0 }));

  const score = {
    blueKills:0, redKills:0,
    blueShrines:0, redShrines:0,
    blueRoots:0, redRoots:0,
    blueWarden:0, redWarden:0,
    winner: null,
  };

  const events = [], snapshots = [], goldSnapshots = [];

  // ── Main game loop ────────────────────────────────────────────────────────
  for (let tick = 0; tick <= MAX_TICKS && !score.winner; tick++) {
    const phase = tick < 50 ? 0 : tick < 110 ? 1 : 2;

    tickCDs(all);
    processRespawns(all, tick);
    processRecalls(all, tick);
    tickJungles(jungles, tick);
    tickObjRespawns(objs, tick);
    tickPassiveGold(all);
    tickRegen(all);

    // AI decisions
    all.forEach(ag => {
      if (ag.isDead) return;
      decideAction(ag,
        all.filter(a => a.side === ag.side && a !== ag),
        all.filter(a => a.side !== ag.side),
        objs, jungles, tick, phase);
    });

    // Movement
    all.forEach(ag => { if (!ag.isDead) moveAgent(ag); });

    // Combat
    all.forEach(ag => {
      if (ag.isDead) return;
      doCombat(ag, all.filter(a => a.side !== ag.side), objs, jungles, tick);
    });

    // Objective counter-attacks
    objCounterAttack(objs, all);

    // Resolve deaths and captures
    resolveDeaths(all, events, score, tick);
    if (!score.winner) resolveObjectives(objs, all, events, score, tick);

    // Snapshots every 4 ticks
    if (tick % 4 === 0)
      snapshots.push(buildSnapshot(tick, all, objs, score));

    // Gold chart
    goldSnapshots.push({ lead: totalGold(all,'blue') - totalGold(all,'red'), time: tick });

    // Commentary every 18 ticks
    if (tick > 0 && tick % 18 === 0 && !score.winner) {
      events.push({
        tick, side: null, time: fmtTime(tick), type: 'commentary',
        text: _COMMENTARY[_commIdx++ % _COMMENTARY.length],
        blueKills:score.blueKills, redKills:score.redKills,
        blueShrines:score.blueShrines, redShrines:score.redShrines,
        blueRoots:score.blueRoots, redRoots:score.redRoots,
        advAfter: advScore(score, all),
        positions: posMap(all),
      });
    }

    // Force end at 180 ticks if no Ancient has fallen
    if (!score.winner && tick >= 180) {
      const bs = score.blueKills*3 + score.blueShrines*5 + score.blueRoots*8;
      const rs = score.redKills *3 + score.redShrines *5 + score.redRoots *8;
      if (bs !== rs) { score.winner = bs > rs ? 'blue' : 'red'; }
      else {
        const ba = all.filter(a=>a.side==='blue'&&!a.isDead).length;
        const ra = all.filter(a=>a.side==='red' &&!a.isDead).length;
        score.winner = ba >= ra ? 'blue' : 'red';
      }
    }
  }

  if (!score.winner) {
    const bs = score.blueKills + score.blueShrines + score.blueRoots;
    const rs = score.redKills  + score.redShrines  + score.redRoots;
    score.winner = bs >= rs ? 'blue' : 'red';
  }

  const endTick = goldSnapshots.length;
  events.push({
    tick: endTick, side: score.winner, time: fmtTime(endTick), type: 'result',
    text: `${score.winner === 'blue' ? blueName : redName} wins!`,
    blueKills:score.blueKills, redKills:score.redKills,
    blueShrines:score.blueShrines, redShrines:score.redShrines,
    blueRoots:score.blueRoots, redRoots:score.redRoots,
    advAfter: score.winner === 'blue' ? 80 : 20,
    positions: posMap(all),
  });

  // Build KDA table data
  const playerStats = {
    blue: blueAgents.map((ag, i) => ({
      name:    blueTeamArr[i]?.name || ag.champName,
      pos:     ag.pos,
      champion:ag.champName,
      kills:   ag.kills, deaths: ag.deaths, assists: ag.assists, cs: ag.cs,
    })),
    red: redAgents.map((ag, i) => ({
      name:    redTeamArr[i]?.name || ag.champName,
      pos:     ag.pos,
      champion:ag.champName,
      kills:   ag.kills, deaths: ag.deaths, assists: ag.assists, cs: ag.cs,
    })),
  };

  // Persist career stats to G if available
  if (typeof G !== 'undefined' && G?.players) {
    _persistCareer(blueAgents, blueTeamArr, score.winner === 'blue');
    _persistCareer(redAgents,  redTeamArr,  score.winner === 'red');
    if (G.stats) G.stats.totalMatches = (G.stats.totalMatches||0) + 1;
  }

  return {
    winner: score.winner,
    blueKills: score.blueKills, redKills: score.redKills,
    blueShrines: score.blueShrines, redShrines: score.redShrines,
    blueRoots: score.blueRoots, redRoots: score.redRoots,
    duration: Math.round(endTick * TICK_S / 60),
    goldSnapshots,
    playerStats,
    events,
    snapshots,
    draft,
  };
}

function _persistCareer(agents, players, won) {
  agents.forEach((ag, i) => {
    const p  = players[i];
    const cp = p?.id ? G.players[p.id] : null;
    if (!cp?.career) return;
    cp.career.gamesPlayed++;
    if (won) cp.career.wins++; else cp.career.losses++;
    cp.career.kills       += ag.kills;
    cp.career.deaths      += ag.deaths;
    cp.career.assists     += ag.assists;
    cp.career.cs          += ag.cs;
    cp.career.damageDealt += ag.damageDealt;
    const cs = cp.career.championStats;
    if (!cs[ag.champName])
      cs[ag.champName] = { games:0, kills:0, deaths:0, assists:0 };
    cs[ag.champName].games++;
    cs[ag.champName].kills   += ag.kills;
    cs[ag.champName].deaths  += ag.deaths;
    cs[ag.champName].assists += ag.assists;
  });
}

// ─── Quick sim (AI vs AI, no PBP) ────────────────────────────────────────────

function quickSimulateMatch(homePlayers, awayPlayers) {
  const homeScore = homePlayers.reduce((s,p) => s + (p ? calcOverall(p) : 50), 0);
  const awayScore = awayPlayers.reduce((s,p) => s + (p ? calcOverall(p) : 50), 0);
  const diff      = homeScore - awayScore;
  return Math.random() * 100 < Math.min(85, Math.max(15, 50 + diff * 0.5)) ? 'blue' : 'red';
}

// ─── Draft system ─────────────────────────────────────────────────────────────

const COMP_SYNERGIES = {
  ENGAGE:  ['tank','fighter'],
  POKE:    ['mage','marksman'],
  PICK:    ['assassin','sentinel'],
  PROTECT: ['sentinel','marksman'],
  SCALING: ['mage','marksman'],
};

const COMP_COUNTERS = {
  ENGAGE:  ['POKE','SCALING'],
  POKE:    ['ENGAGE','PICK'],
  PICK:    ['PROTECT','SCALING'],
  PROTECT: ['ENGAGE','POKE'],
  SCALING: ['PICK','ENGAGE'],
};

const COUNTERED_BY = {
  tank:     ['assassin','mage'],
  fighter:  ['mage','marksman'],
  assassin: ['sentinel','tank'],
  mage:     ['assassin','marksman'],
  marksman: ['assassin','fighter'],
  sentinel: ['mage','fighter'],
};

function getDominantCompType(picks) {
  const counts = {};
  picks.forEach(c => { const ct = CHAMPIONS[c]?.compType||'ENGAGE'; counts[ct]=(counts[ct]||0)+1; });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'ENGAGE';
}

function champBanValue(champName, player) {
  const cd = CHAMPIONS[champName];
  if (!cd) return 0;
  const roleClass = { vanguard:'tank', ranger:'assassin', arcanist:'mage', hunter:'marksman', warden:'sentinel' }[player.position] || 'mage';
  const classFit  = cd.class.toLowerCase() === roleClass ? 1.2 : 0.85;
  return ((player.stats?.mechanics||10)/20*15 + (player.stats?.csAccuracy||10)/2) * classFit;
}

function generateBans(targetPlayers, numBans) {
  const banned = [];
  targetPlayers.forEach(p => {
    if (!p) return;
    const top = [...(p.champions||[])].sort((a,b)=>champBanValue(b,p)-champBanValue(a,p))[0];
    if (top && !banned.includes(top)) banned.push(top);
  });
  return banned.slice(0, numBans);
}

function getCounterScore(bluePicks, redPicks) {
  let score = 0;
  bluePicks.forEach(bc => {
    const bClass = CHAMPIONS[bc]?.class?.toLowerCase()||'mage';
    redPicks.forEach(rc => {
      const rClass = CHAMPIONS[rc]?.class?.toLowerCase()||'mage';
      if (COUNTERED_BY[rClass]?.includes(bClass)) score += 1;
      if (COUNTERED_BY[bClass]?.includes(rClass)) score -= 1;
    });
  });
  return Math.round(score * 0.25 * 10) / 10;
}

function pickChampion(player, pos, banned, allPicked, enemyPicks) {
  if (!player) {
    const fb = Object.keys(CHAMPIONS).find(c => !banned.includes(c) && !allPicked.includes(c));
    return fb || 'Wraithfern';
  }
  const pool    = (player.champions||[]).filter(c => !banned.includes(c) && !allPicked.includes(c));
  const counter = pool.find(c => {
    const cl = CHAMPIONS[c]?.class?.toLowerCase();
    return enemyPicks.some(ec => COUNTERED_BY[CHAMPIONS[ec]?.class?.toLowerCase()]?.includes(cl));
  });
  return counter || pool[0]
    || Object.keys(CHAMPIONS).find(c => !banned.includes(c) && !allPicked.includes(c))
    || 'Wraithfern';
}

function draftChampions(blueTeamArr, redTeamArr) {
  const blueBans = generateBans(redTeamArr,  5);
  const redBans  = generateBans(blueTeamArr, 5);
  const allBans  = [...blueBans, ...redBans];
  const picked   = [];
  const bluePicks = [], redPicks = [];

  blueTeamArr.forEach((p, i) => {
    const c = pickChampion(p, POSITIONS[i], allBans, picked, redPicks);
    bluePicks.push(c); picked.push(c);
  });
  redTeamArr.forEach((p, i) => {
    const c = pickChampion(p, POSITIONS[i], allBans, picked, bluePicks);
    redPicks.push(c); picked.push(c);
  });

  return {
    blue: bluePicks, red: redPicks,
    bans: { blue: blueBans, red: redBans },
    blueSynergies: COMP_SYNERGIES[getDominantCompType(bluePicks)] || [],
    redSynergies:  COMP_SYNERGIES[getDominantCompType(redPicks)]  || [],
    counterScore:  getCounterScore(bluePicks, redPicks),
  };
}
