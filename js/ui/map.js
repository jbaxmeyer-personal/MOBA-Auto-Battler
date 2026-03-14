// js/ui/map.js — LoL map visualization v2
// Driven by real champion positions from simulation events (ev.positions).
// Exposes three globals: initMapVisualization(), updateMap(ev), setMapSkipMode(bool)

(function () {
  'use strict';

  const POSITIONS = ['vanguard', 'ranger', 'arcanist', 'hunter', 'warden'];

  // ── Module state ─────────────────────────────────────────────────────────────

  let _skipMode      = false;
  let _wanderInterval = null;
  let _ringRaf        = null;

  // Base anchor per dot — wander jitters around this
  const _base = {
    blue: { vanguard:{x:28,y:165}, ranger:{x:82,y:170}, arcanist:{x:92,y:208}, hunter:{x:72,y:268},  warden:{x:90,y:274}  },
    red:  { vanguard:{x:272,y:45}, ranger:{x:218,y:132},arcanist:{x:208,y:92}, hunter:{x:228,y:268}, warden:{x:210,y:274} },
  };

  // Wander radius per role
  const _wRadius = { vanguard:9, ranger:13, arcanist:9, hunter:7, warden:6 };

  // Dead status (used to suppress wander for dead dots)
  const _dead = {
    blue: { vanguard:false, ranger:false, arcanist:false, hunter:false, warden:false },
    red:  { vanguard:false, ranger:false, arcanist:false, hunter:false, warden:false },
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
    // Reset to laning positions
    applyPositions({
      blue: { vanguard:{x:28,y:165,alive:true}, ranger:{x:82,y:170,alive:true}, arcanist:{x:92,y:208,alive:true}, hunter:{x:72,y:268,alive:true},  warden:{x:90,y:274,alive:true}  },
      red:  { vanguard:{x:272,y:45,alive:true}, ranger:{x:218,y:132,alive:true},arcanist:{x:208,y:92,alive:true}, hunter:{x:228,y:268,alive:true}, warden:{x:210,y:274,alive:true} },
    });
    startWander();
  };

  window.updateMap = function (ev) {
    if (!ev || ev.type === 'header') return;

    // Apply real champion positions from simulation
    if (ev.positions) {
      applyPositions(ev.positions);
    }

    // Flash ring at the event's focal point
    if (!_skipMode) {
      flashForEvent(ev);
    }
  };

  window.setMapSkipMode = function (skip) {
    _skipMode = skip;
    const svg = document.getElementById('pbp-map-svg');
    if (svg) svg.classList.toggle('map-skip', skip);
    if (skip) stopWander();
    else      startWander();
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
        moveDot(side, pos, x, y);
        _base[side][pos] = { x, y };
        if (data.alive === false) {
          _dead[side][pos] = true;
          markDead(side, pos);
        } else {
          _dead[side][pos] = false;
          reviveDot(side, pos);
        }
      });
    });
  }

  // ── Flash Ring ───────────────────────────────────────────────────────────────

  function flashForEvent(ev) {
    let cx, cy, color;

    if (ev.wardenBlue !== undefined || ev.wardenRed !== undefined) {
      cx = 150; cy = 150; color = '#9b59b6';  // Grove Warden — center
    } else if (ev.shrineBlue !== undefined || ev.shrineRed !== undefined) {
      cx = 80; cy = 80; color = '#c89b3c';    // Ley Shrine — north area
    } else if (ev.type === 'result') {
      const blueWon = (ev.advAfter || 50) >= 50;
      cx = blueWon ? 278 : 22;
      cy = blueWon ? 22  : 278;
      color = blueWon ? '#4fc3f7' : '#ff7b7b';
    } else if (ev.type === 'teamfight' || ev.type === 'kill' || ev.type === 'objective') {
      // Flash at the centroid of all champion positions in this event
      const c = getCentroid(ev.positions);
      cx = c.x; cy = c.y;
      color = (ev.killBlue === true || ev.towerBlue === true || ev.tfBlueKills > (ev.tfRedKills || 0))
        ? '#4fc3f7' : '#ff7b7b';
    } else {
      return; // commentary — no flash
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

  // ── Dot Helpers ──────────────────────────────────────────────────────────────

  function moveDot(side, pos, x, y) {
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) { dot.setAttribute('cx', x); dot.setAttribute('cy', y); }
    if (lbl) { lbl.setAttribute('x', x); lbl.setAttribute('y', y + 4); }
  }

  function markDead(side, pos) {
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) dot.classList.add('map-dot-dead');
    if (lbl) lbl.classList.add('map-dot-dead');
  }

  function reviveDot(side, pos) {
    const pfx = side[0];
    const dot = document.getElementById(`map-${pfx}-${pos}`);
    const lbl = document.getElementById(`map-${pfx}-${pos}-lbl`);
    if (dot) dot.classList.remove('map-dot-dead');
    if (lbl) lbl.classList.remove('map-dot-dead');
  }

  // ── Wander Animation ─────────────────────────────────────────────────────────
  // Alive dots drift slightly around their last base position between events,
  // giving the FM-style "always moving" feel.

  function startWander() {
    stopWander();
    _wanderInterval = setInterval(wanderTick, 820);
  }

  function stopWander() {
    if (_wanderInterval) { clearInterval(_wanderInterval); _wanderInterval = null; }
  }

  function wanderTick() {
    if (_skipMode) return;
    ['blue', 'red'].forEach(side => {
      POSITIONS.forEach(pos => {
        if (_dead[side][pos]) return;
        const base = _base[side][pos];
        const r    = _wRadius[pos] || 8;
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * r;
        const nx = Math.round(base.x + Math.cos(angle) * dist);
        const ny = Math.round(base.y + Math.sin(angle) * dist);
        moveDot(side, pos, nx, ny);
      });
    });
  }

})();
