// js/ui/map.js — Grove Manager map visualization
// Champion positions come ONLY from real simulation events (ev.positions).
// No wander, no jitter. CSS transitions handle smooth movement.

(function () {
  'use strict';

  const POSITIONS = ['top', 'jungle', 'mid', 'adc', 'support'];

  let _skipMode = false;
  let _ringRaf  = null;
  let _cameraW = 90; // viewport width in map units, computed from display aspect
  let _cameraH = 90; // viewport height

  // Spawn positions matching SPAWN constants in simulation.js
  const _SPAWN_POS = {
    blue: { top:{x:22,y:278}, jungle:{x:27,y:273}, mid:{x:24,y:276},
            adc:{x:19,y:274},  support:{x:16,y:270} },
    red:  { top:{x:278,y:22}, jungle:{x:273,y:27}, mid:{x:276,y:24},
            adc:{x:281,y:26},  support:{x:284,y:30} },
  };

  // Dead status per champion
  const _dead = {
    blue: { top:false, jungle:false, mid:false, adc:false, support:false },
    red:  { top:false, jungle:false, mid:false, adc:false, support:false },
  };

  // ── Public API ───────────────────────────────────────────────────────────────

  window.initMapVisualization = function () {
    _skipMode = false;
    POSITIONS.forEach(pos => {
      _dead.blue[pos] = false;
      _dead.red[pos]  = false;
      reviveDot('blue', pos);
      reviveDot('red',  pos);
    });
    // Place all dots at spawn positions
    const initPos = { blue:{}, red:{} };
    POSITIONS.forEach(pos => {
      initPos.blue[pos] = { ..._SPAWN_POS.blue[pos], alive: true, hp: 1, maxHp: 1 };
      initPos.red[pos]  = { ..._SPAWN_POS.red[pos],  alive: true, hp: 1, maxHp: 1 };
    });
    // Suppress transitions during init
    const allGroups = document.querySelectorAll('.map-agent-group');
    allGroups.forEach(g => g.classList.add('no-transition'));
    applyPositions(initPos);
    requestAnimationFrame(() => {
      allGroups.forEach(g => g.classList.remove('no-transition'));
    });
  };

  window.updateMap = function (ev) {
    if (!ev || ev.type === 'header') return;
    if (ev.positions) applyPositions(ev.positions);
    if (!_skipMode)   flashForEvent(ev);
    // Update objective HP bars if snapshot includes objectives
    if (ev.objectives) updateObjectiveHP(ev.objectives);
  };

  window.setMapSkipMode = function (skip) {
    _skipMode = skip;
    const svg = document.getElementById('pbp-map-svg');
    if (svg) svg.classList.toggle('map-skip', skip);
  };

  // ── Position Application ─────────────────────────────────────────────────────

  function applyPositions(positions) {
    ['blue', 'red'].forEach(side => {
      if (!positions[side]) return;
      POSITIONS.forEach(pos => {
        const data = positions[side][pos];
        if (!data) return;
        const x = Math.round(data.x);
        const y = Math.round(data.y);
        moveGroup(side, pos, x, y);
        if (data.alive === false) {
          _dead[side][pos] = true;
          markDead(side, pos);
        } else {
          _dead[side][pos] = false;
          reviveDot(side, pos);
        }
        // Update HP ring
        if (data.hp !== undefined && data.maxHp !== undefined && data.maxHp > 0) {
          updateHpRing(side, pos, data.hp / data.maxHp);
        }
      });
    });
    // Update camera viewBox to follow action
    _updateCamera(positions);
  }

  // ── Objective HP ─────────────────────────────────────────────────────────────

  function updateObjectiveHP(objectives) {
    objectives.forEach(o => {
      const bar = document.getElementById(`obj-hp-${o.id}`);
      if (!bar) return;
      if (o.destroyed || o.tempDown) {
        bar.style.opacity = '0.2';
        bar.setAttribute('width', '0');
      } else {
        const pct = Math.max(0, o.hp / o.maxHp);
        const fullW = parseFloat(bar.dataset.maxw || '20');
        bar.setAttribute('width', (pct * fullW).toFixed(1));
        bar.style.opacity = '1';
      }
      // Grey out destroyed structures
      const struct = document.getElementById(`obj-${o.id}`);
      if (struct) struct.classList.toggle('map-obj-dead', !!(o.destroyed || o.tempDown));
      // Sync minimap tower visibility
      const mmObj = document.getElementById(`mm-obj-${o.id}`);
      if (mmObj) mmObj.setAttribute('opacity', (o.destroyed || o.tempDown) ? '0.1' : '0.8');
    });
  }

  // ── Flash Ring ───────────────────────────────────────────────────────────────

  function flashForEvent(ev) {
    let cx, cy, color;
    if (ev.wardenBlue !== undefined || ev.wardenRed !== undefined) {
      cx = 235; cy = 235; color = '#9b59b6';
    } else if (ev.shrineBlue !== undefined || ev.shrineRed !== undefined) {
      cx = 65; cy = 65; color = '#c89b3c';
    } else if (ev.type === 'result') {
      const blueWon = (ev.advAfter || 50) >= 50;
      cx = blueWon ? 35  : 265;
      cy = blueWon ? 265 : 35;
      color = blueWon ? '#4fc3f7' : '#ff7b7b';
    } else if (ev.type === 'teamfight' || ev.type === 'kill' || ev.type === 'objective') {
      const c = getCentroid(ev.positions);
      cx = c.x; cy = c.y;
      color = (ev.killBlue === true || ev.towerBlue === true || ev.tfBlueKills > (ev.tfRedKills || 0))
        ? '#4fc3f7' : '#ff7b7b';
    } else {
      return;
    }
    flashRing(cx, cy, color);
  }

  function getCentroid(positions) {
    if (!positions) return { x:150, y:150 };
    let tx = 0, ty = 0, n = 0;
    ['blue', 'red'].forEach(side => {
      POSITIONS.forEach(pos => {
        const p = positions[side]?.[pos];
        if (p && p.alive !== false) { tx += p.x; ty += p.y; n++; }
      });
    });
    return n > 0 ? { x: Math.round(tx / n), y: Math.round(ty / n) } : { x:150, y:150 };
  }

  function flashRing(cx, cy, color) {
    if (_skipMode) return;
    const ring = document.getElementById('map-event-ring');
    if (!ring) return;
    if (_ringRaf) cancelAnimationFrame(_ringRaf);
    ring.setAttribute('cx', cx);
    ring.setAttribute('cy', cy);
    ring.setAttribute('stroke', color);
    const start = Date.now();
    function step() {
      const t = Math.min(1, (Date.now() - start) / 700);
      ring.setAttribute('r',       (8 + t * 38).toFixed(1));
      ring.setAttribute('opacity', ((1 - t) * 0.85).toFixed(2));
      if (t < 1) _ringRaf = requestAnimationFrame(step);
      else        ring.setAttribute('opacity', '0');
    }
    _ringRaf = requestAnimationFrame(step);
  }

  // ── Group / Dot Helpers ───────────────────────────────────────────────────────

  function moveGroup(side, pos, x, y) {
    const pfx = side[0];
    const grp = document.getElementById(`map-g-${pfx}-${pos}`);
    if (grp) grp.setAttribute('transform', `translate(${x},${y})`);
    // Sync minimap dot
    const mm = document.getElementById(`mm-${pfx}-${pos}`);
    if (mm) { mm.setAttribute('cx', x); mm.setAttribute('cy', y); }
  }

  function updateHpRing(side, pos, hpPct) {
    const pfx = side[0];
    const ring = document.getElementById(`map-hp-${pfx}-${pos}`);
    if (!ring) return;
    const circ = 56.5; // 2π × 9
    const dash = Math.max(0, Math.min(circ, hpPct * circ));
    ring.setAttribute('stroke-dasharray', `${dash.toFixed(1)} ${circ}`);
    // Color: green > 60%, yellow 30-60%, red < 30%
    ring.setAttribute('stroke', hpPct > 0.6 ? '#4caf50' : hpPct > 0.3 ? '#ffeb3b' : '#f44336');
  }

  function markDead(side, pos) {
    const pfx = side[0];
    const grp = document.getElementById(`map-g-${pfx}-${pos}`);
    if (grp) grp.classList.add('map-dot-dead');
    const mm = document.getElementById(`mm-${pfx}-${pos}`);
    if (mm) mm.setAttribute('opacity', '0.2');
  }

  function reviveDot(side, pos) {
    const pfx = side[0];
    const grp = document.getElementById(`map-g-${pfx}-${pos}`);
    if (grp) grp.classList.remove('map-dot-dead');
    const mm = document.getElementById(`mm-${pfx}-${pos}`);
    if (mm) mm.setAttribute('opacity', '0.9');
  }

  function _updateCamera(positions) {
    const svg = document.getElementById('pbp-map-svg');
    if (!svg || _skipMode) return;
    const c = getCentroid(positions);
    // Compute display aspect ratio
    const rect = svg.getBoundingClientRect();
    const aspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 1;
    const zoomH = 90;
    const zoomW = zoomH * aspect;
    const vx = Math.max(0, Math.min(300 - zoomW, c.x - zoomW / 2));
    const vy = Math.max(0, Math.min(300 - zoomH, c.y - zoomH / 2));
    svg.setAttribute('viewBox', `${vx.toFixed(1)} ${vy.toFixed(1)} ${zoomW.toFixed(1)} ${zoomH.toFixed(1)}`);
    // Update minimap camera rect
    const camRect = document.getElementById('mm-camera-rect');
    if (camRect) {
      camRect.setAttribute('x', vx.toFixed(1));
      camRect.setAttribute('y', vy.toFixed(1));
      camRect.setAttribute('width', zoomW.toFixed(1));
      camRect.setAttribute('height', zoomH.toFixed(1));
    }
  }

})();
