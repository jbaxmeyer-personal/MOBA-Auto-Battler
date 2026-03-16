// pixel-map.js - Canvas-based map visualization for The Ancient Grove
(function() {
  var CANVAS_W = 900, CANVAS_H = 600;
  var MM_W = 200, MM_H = 200;
  var MAP_SIZE = 300;
  var SPRITE_S = 2;
  var TILE_UNITS = 15;
  var TICK_MS_BASE = 2000;

  var _canvas = null, _ctx = null;
  var _mmCanvas = null, _mmCtx = null;
  var _rafId = null;
  var _running = false;
  var _skipMode = false;
  var _tickMs = TICK_MS_BASE;

  // Camera
  var cam = { x: 0, y: 100, w: 150, h: 100 };
  var camTargetX = 75, camTargetY = 150;

  function m2c(mx, my) {
    return {
      x: (mx - cam.x) / cam.w * CANVAS_W,
      y: (my - cam.y) / cam.h * CANVAS_H
    };
  }

  // Agent state
  var _agents = {};
  var ANIM_MS = { idle: 500, walk: 130, attack: 90, hit: 80, death: 200, dead: 999999 };

  // Structure state
  var _structures = {};

  var STRUCT_DEFS = [
    { id:'b_bot1',    side:'blue',    type:'root',    mx:185, my:265 },
    { id:'b_bot2',    side:'blue',    type:'root',    mx:115, my:265 },
    { id:'b_mid1',    side:'blue',    type:'root',    mx:110, my:190 },
    { id:'b_mid2',    side:'blue',    type:'root',    mx:80,  my:220 },
    { id:'b_top1',    side:'blue',    type:'root',    mx:35,  my:185 },
    { id:'b_top2',    side:'blue',    type:'root',    mx:35,  my:115 },
    { id:'b_heart',   side:'blue',    type:'heart',   mx:55,  my:240 },
    { id:'b_ancient', side:'blue',    type:'ancient', mx:22,  my:278 },
    { id:'r_top1',    side:'red',     type:'root',    mx:115, my:35  },
    { id:'r_top2',    side:'red',     type:'root',    mx:185, my:35  },
    { id:'r_mid1',    side:'red',     type:'root',    mx:190, my:110 },
    { id:'r_mid2',    side:'red',     type:'root',    mx:220, my:80  },
    { id:'r_bot1',    side:'red',     type:'root',    mx:265, my:115 },
    { id:'r_bot2',    side:'red',     type:'root',    mx:265, my:185 },
    { id:'r_heart',   side:'red',     type:'heart',   mx:245, my:60  },
    { id:'r_ancient', side:'red',     type:'ancient', mx:278, my:22  },
    { id:'shrine',    side:'neutral', type:'shrine',  mx:65,  my:65  },
    { id:'warden',    side:'neutral', type:'warden',  mx:235, my:235 },
  ];

  function initStructures() {
    _structures = {};
    for (var i = 0; i < STRUCT_DEFS.length; i++) {
      var d = STRUCT_DEFS[i];
      _structures[d.id] = {
        id: d.id, side: d.side, type: d.type,
        mx: d.mx, my: d.my,
        hp: 1, maxHp: 1,
        destroyed: false,
        tempDown: false
      };
    }
  }

  // Event rings
  var _rings = [];

  function addRing(mx, my, color) {
    _rings.push({ mx: mx, my: my, r: 0, maxR: 24, alpha: 1.0, color: color || '#ffffff', born: performance.now() });
  }

  // Terrain tile cache
  var _tileCache = {};

  function getTileSeed(tx, ty) {
    return (tx * 1619 + ty * 31337) & 0xFFFF;
  }

  // Spawn positions
  var SPAWN_BLUE = { x: 22, y: 278 };
  var SPAWN_RED  = { x: 278, y: 22 };

  var ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];

  function initAgents() {
    _agents = {};
    var sides = ['blue', 'red'];
    for (var si = 0; si < sides.length; si++) {
      var side = sides[si];
      var spawn = side === 'blue' ? SPAWN_BLUE : SPAWN_RED;
      for (var ri = 0; ri < ROLES.length; ri++) {
        var role = ROLES[ri];
        var key = side + '-' + role;
        var jitter = ri * 3;
        _agents[key] = {
          side: side,
          pos: role,
          champName: '',
          mx: spawn.x + (side === 'blue' ? ri*2 : -ri*2),
          my: spawn.y + (side === 'blue' ? -ri*2 : ri*2),
          prevX: spawn.x,
          prevY: spawn.y,
          targetX: spawn.x + (side === 'blue' ? ri*2 : -ri*2),
          targetY: spawn.y + (side === 'blue' ? -ri*2 : ri*2),
          moveStart: 0,
          moveDuration: _tickMs,
          dir: 0,
          animState: 'idle',
          animFrame: 0,
          animTimer: 0,
          isDead: false,
          hp: 1, maxHp: 1,
          sideColor: side === 'blue' ? '#4fc3f7' : '#ff7b7b'
        };
      }
    }
  }

  // RAF loop
  var _lastTime = 0;

  function loop(now) {
    if (!_running) return;
    var dt = now - _lastTime;
    _lastTime = now;
    if (dt > 200) dt = 200;

    update(now, dt);
    render(now);

    _rafId = requestAnimationFrame(loop);
  }

  function update(now, dt) {
    // Update agent interpolation and animation
    for (var key in _agents) {
      var ag = _agents[key];
      if (!ag) continue;

      // Interpolate position
      var elapsed = now - ag.moveStart;
      var t = ag.moveDuration > 0 ? Math.min(1, elapsed / ag.moveDuration) : 1;
      // ease in-out
      t = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      ag.mx = ag.prevX + (ag.targetX - ag.prevX) * t;
      ag.my = ag.prevY + (ag.targetY - ag.prevY) * t;

      // Advance animation frame
      if (ag.animState !== 'dead') {
        var ms = ANIM_MS[ag.animState] || 500;
        ag.animTimer += dt;
        if (ag.animTimer >= ms) {
          ag.animTimer = 0;
          ag.animFrame++;
          // death -> dead after 5 frames
          if (ag.animState === 'death' && ag.animFrame >= 5) {
            ag.animState = 'dead';
            ag.isDead = true;
          }
          // hit -> return to idle/walk
          if (ag.animState === 'hit' && ag.animFrame >= 2) {
            ag.animState = ag.isDead ? 'dead' : (ag.moving ? 'walk' : 'idle');
            ag.animFrame = 0;
          }
          // attack -> return to idle
          if (ag.animState === 'attack' && ag.animFrame >= 4) {
            ag.animState = 'idle';
            ag.animFrame = 0;
          }
        }
      }
    }

    // Update event rings
    var aliveRings = [];
    for (var ri = 0; ri < _rings.length; ri++) {
      var ring = _rings[ri];
      ring.r += dt * 0.05;
      ring.alpha = Math.max(0, 1 - ring.r / ring.maxR);
      if (ring.alpha > 0) aliveRings.push(ring);
    }
    _rings = aliveRings;

    // Camera smoothing
    cam.x += (camTargetX - cam.x) * 0.08;
    cam.y += (camTargetY - cam.y) * 0.08;
    // Clamp camera
    cam.x = Math.max(0, Math.min(MAP_SIZE - cam.w, cam.x));
    cam.y = Math.max(0, Math.min(MAP_SIZE - cam.h, cam.y));
  }

  function render(now) {
    if (!_ctx) return;
    var ctx = _ctx;
    ctx.fillStyle = '#060e06';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    renderTerrain(ctx);
    renderStructures(ctx);
    renderAgents(ctx, now);
    renderRings(ctx);
    renderMinimap(now);
  }

  function renderTerrain(ctx) {
    // How many canvas pixels per map unit
    var scaleX = CANVAS_W / cam.w;
    var scaleY = CANVAS_H / cam.h;
    // Tile size in canvas pixels
    var tileSizeX = TILE_UNITS * scaleX;
    var tileSizeY = TILE_UNITS * scaleY;
    var tileSize = Math.ceil(Math.max(tileSizeX, tileSizeY));

    // First tile index visible
    var startTX = Math.floor(cam.x / TILE_UNITS);
    var startTY = Math.floor(cam.y / TILE_UNITS);
    var endTX = Math.ceil((cam.x + cam.w) / TILE_UNITS);
    var endTY = Math.ceil((cam.y + cam.h) / TILE_UNITS);

    for (var ty = startTY; ty <= endTY; ty++) {
      for (var tx = startTX; tx <= endTX; tx++) {
        var mx = tx * TILE_UNITS + TILE_UNITS * 0.5;
        var my = ty * TILE_UNITS + TILE_UNITS * 0.5;
        var ttype = getTileType(mx, my);
        var cPos = m2c(tx * TILE_UNITS, ty * TILE_UNITS);
        var seed = getTileSeed(tx, ty);
        drawTile(ctx, ttype, Math.round(cPos.x), Math.round(cPos.y), Math.ceil(tileSizeX) + 1, seed);
      }
    }
  }

  function renderStructures(ctx) {
    // Sort structures by my for painter's algo
    var structs = [];
    for (var id in _structures) {
      structs.push(_structures[id]);
    }
    structs.sort(function(a, b) { return a.my - b.my; });

    for (var i = 0; i < structs.length; i++) {
      var st = structs[i];
      var cp = m2c(st.mx, st.my);
      var cx = Math.round(cp.x);
      var cy = Math.round(cp.y);
      // Cull off-screen
      if (cx < -40 || cx > CANVAS_W + 40 || cy < -40 || cy > CANVAS_H + 40) continue;

      if (st.type === 'root') {
        drawRootTower(ctx, cx, cy, SPRITE_S, st.side, st.hp, st.destroyed);
      } else if (st.type === 'heart') {
        drawHeartTree(ctx, cx, cy, SPRITE_S, st.side, st.hp, st.destroyed);
      } else if (st.type === 'ancient') {
        drawAncientTree(ctx, cx, cy, SPRITE_S, st.side, st.hp);
      } else if (st.type === 'shrine') {
        drawShrine(ctx, cx, cy, SPRITE_S, st.hp, st.tempDown);
      } else if (st.type === 'warden') {
        drawWarden(ctx, cx, cy, SPRITE_S, st.hp, st.tempDown);
      }

      // Structure label
      ctx.font = '8px monospace';
      ctx.fillStyle = st.side === 'blue' ? '#4fc3f7' : st.side === 'red' ? '#ff7b7b' : '#c89b3c';
      ctx.textAlign = 'center';
      ctx.fillText(st.id.replace('b_','B-').replace('r_','R-'), cx, cy + 22);
    }
    ctx.textAlign = 'left';
  }

  function renderAgents(ctx, now) {
    // Sort by my
    var agList = [];
    for (var key in _agents) {
      agList.push(_agents[key]);
    }
    agList.sort(function(a, b) { return a.my - b.my; });

    for (var i = 0; i < agList.length; i++) {
      var ag = agList[i];
      var cp = m2c(ag.mx, ag.my);
      var cx = Math.round(cp.x);
      var cy = Math.round(cp.y);
      // Cull
      if (cx < -40 || cx > CANVAS_W + 40 || cy < -60 || cy > CANVAS_H + 20) continue;

      var ox = cx - 8 * SPRITE_S;
      var oy = cy - 16 * SPRITE_S;

      // Flip for left-facing
      if (ag.dir === 1) {
        ctx.save();
        ctx.translate(cx * 2, 0);
        ctx.scale(-1, 1);
      }

      // Draw champion
      var drawFn = (typeof CHAMPION_DRAW !== 'undefined') ? (CHAMPION_DRAW[ag.champName] || CHAMPION_DRAW._default) : null;
      if (drawFn) {
        drawFn(ctx, ox, oy, SPRITE_S, ag.animState, ag.animFrame, ag.isDead);
      } else {
        // fallback circle
        ctx.fillStyle = ag.isDead ? '#555555' : ag.sideColor;
        ctx.beginPath();
        ctx.arc(cx, cy - 6 * SPRITE_S, 6 * SPRITE_S, 0, Math.PI * 2);
        ctx.fill();
      }

      if (ag.dir === 1) {
        ctx.restore();
      }

      // HP bar (centered above sprite)
      var barW = 16 * SPRITE_S;
      var barH = 3;
      var barX = cx - barW / 2;
      var barY = oy - 6;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(barX, barY, barW, barH);
      if (!ag.isDead && ag.hp > 0) {
        var pct = Math.max(0, Math.min(1, ag.hp));
        ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(barX, barY, Math.round(barW * pct), barH);
      }

      // Name label
      if (ag.champName) {
        ctx.font = '9px monospace';
        ctx.fillStyle = ag.isDead ? '#555555' : ag.sideColor;
        ctx.textAlign = 'center';
        var label = ag.champName.length > 9 ? ag.champName.slice(0, 8) + '.' : ag.champName;
        ctx.fillText(label, cx, barY - 2);
      }
    }
    ctx.textAlign = 'left';
  }

  function renderRings(ctx) {
    for (var i = 0; i < _rings.length; i++) {
      var ring = _rings[i];
      var cp = m2c(ring.mx, ring.my);
      var scaleX = CANVAS_W / cam.w;
      var r = ring.r * scaleX;
      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderMinimap(now) {
    if (!_mmCtx) return;
    var ctx = _mmCtx;
    var scale = MM_W / MAP_SIZE;

    ctx.fillStyle = '#060e06';
    ctx.fillRect(0, 0, MM_W, MM_H);

    // Terrain blocks (10x10 map unit blocks)
    var blockUnits = 10;
    for (var by = 0; by < MAP_SIZE; by += blockUnits) {
      for (var bx = 0; bx < MAP_SIZE; bx += blockUnits) {
        var ttype = getTileType(bx + blockUnits * 0.5, by + blockUnits * 0.5);
        var px = Math.round(bx * scale);
        var py = Math.round(by * scale);
        var pw = Math.ceil(blockUnits * scale) + 1;
        ctx.fillStyle = mmTileColor(ttype);
        ctx.fillRect(px, py, pw, pw);
      }
    }

    // Structures
    for (var id in _structures) {
      var st = _structures[id];
      if (st.destroyed) continue;
      var sx = Math.round(st.mx * scale) - 2;
      var sy = Math.round(st.my * scale) - 2;
      ctx.fillStyle = st.side === 'blue' ? '#4fc3f7' : st.side === 'red' ? '#ff7b7b' : '#c89b3c';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(sx, sy, 4, 4);
      ctx.globalAlpha = 1;
    }

    // Agents
    for (var key in _agents) {
      var ag = _agents[key];
      var ax = Math.round(ag.mx * scale) - 2;
      var ay = Math.round(ag.my * scale) - 2;
      ctx.fillStyle = ag.isDead ? '#444444' : ag.sideColor;
      ctx.globalAlpha = ag.isDead ? 0.4 : 0.9;
      ctx.fillRect(ax, ay, 4, 4);
      ctx.globalAlpha = 1;
    }

    // Camera rect
    var crX = Math.round(cam.x * scale);
    var crY = Math.round(cam.y * scale);
    var crW = Math.round(cam.w * scale);
    var crH = Math.round(cam.h * scale);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(crX, crY, crW, crH);
    ctx.restore();
  }

  function mmTileColor(ttype) {
    switch (ttype) {
      case 0: return '#2a2a2a'; // WALL
      case 1: return '#2a3a5a'; // BASE_BLUE
      case 2: return '#5a2a2a'; // BASE_RED
      case 3: return '#7a6040'; // LANE
      case 4: return '#1a3010'; // JUNGLE
      case 5: return '#0d1a08'; // DEEP_FOREST
      case 6: return '#2a4518'; // CLEARING
      default: return '#1a3010';
    }
  }

  // Update camera target to centroid of alive agents
  function updateCameraTarget() {
    var sumX = 0, sumY = 0, cnt = 0;
    for (var key in _agents) {
      var ag = _agents[key];
      if (!ag.isDead) {
        sumX += ag.mx;
        sumY += ag.my;
        cnt++;
      }
    }
    if (cnt > 0) {
      camTargetX = sumX / cnt - cam.w / 2;
      camTargetY = sumY / cnt - cam.h / 2;
    }
    camTargetX = Math.max(0, Math.min(MAP_SIZE - cam.w, camTargetX));
    camTargetY = Math.max(0, Math.min(MAP_SIZE - cam.h, camTargetY));
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.initMapVisualization = function() {
    _canvas = document.getElementById('pbp-map-canvas');
    _mmCanvas = document.getElementById('pbp-minimap-canvas');

    if (!_canvas) { console.warn('pbp-map-canvas not found'); return; }
    _ctx = _canvas.getContext('2d');

    if (_mmCanvas) {
      _mmCtx = _mmCanvas.getContext('2d');
    }

    // Pixel-perfect rendering
    _ctx.imageSmoothingEnabled = false;
    if (_mmCtx) _mmCtx.imageSmoothingEnabled = false;

    initAgents();
    initStructures();

    cam.x = SPAWN_BLUE.x - cam.w / 2;
    cam.y = SPAWN_BLUE.y - cam.h / 2;
    cam.x = Math.max(0, Math.min(MAP_SIZE - cam.w, cam.x));
    cam.y = Math.max(0, Math.min(MAP_SIZE - cam.h, cam.y));
    camTargetX = cam.x;
    camTargetY = cam.y;

    if (!_running) {
      _running = true;
      _lastTime = performance.now();
      _rafId = requestAnimationFrame(loop);
    }
  };

  window.updateMap = function(ev) {
    if (!ev) return;

    var now = performance.now();

    // Update champion names from roster
    if (ev.roster) {
      var sides = ['blue', 'red'];
      for (var si = 0; si < sides.length; si++) {
        var side = sides[si];
        if (!ev.roster[side]) continue;
        var r = ev.roster[side];
        for (var role in r) {
          var key = side + '-' + role;
          if (_agents[key]) {
            _agents[key].champName = r[role] || '';
          }
        }
      }
    }

    // Update positions
    if (ev.positions) {
      for (var side in ev.positions) {
        for (var role in ev.positions[side]) {
          var key = side + '-' + role;
          var ag = _agents[key];
          if (!ag) continue;
          var pos = ev.positions[side][role];
          if (!pos) continue;

          var nx = typeof pos.x === 'number' ? pos.x : ag.mx;
          var ny = typeof pos.y === 'number' ? pos.y : ag.my;

          var moved = (Math.abs(nx - ag.mx) > 0.5 || Math.abs(ny - ag.my) > 0.5);

          // Direction
          var dx = nx - ag.mx;
          var dy = ny - ag.my;
          if (Math.abs(dx) > Math.abs(dy)) {
            ag.dir = dx < 0 ? 1 : 3; // left or right
          } else {
            ag.dir = dy < 0 ? 2 : 0; // up or down
          }

          ag.prevX = ag.mx;
          ag.prevY = ag.my;
          ag.targetX = nx;
          ag.targetY = ny;
          ag.moveStart = now;
          ag.moveDuration = _skipMode ? 50 : _tickMs;

          if (moved && ag.animState !== 'death' && ag.animState !== 'dead') {
            ag.animState = 'walk';
            ag.moving = true;
          }

          // HP
          if (typeof pos.hp === 'number') ag.hp = pos.hp;
          if (typeof pos.maxHp === 'number') ag.maxHp = pos.maxHp;

          // Dead status
          if (pos.isDead === true) {
            if (ag.animState !== 'death' && ag.animState !== 'dead') {
              ag.animState = 'death';
              ag.animFrame = 0;
            }
            ag.isDead = true;
          } else if (pos.isDead === false && ag.isDead) {
            ag.isDead = false;
            ag.animState = 'idle';
            ag.animFrame = 0;
          }
        }
      }
      updateCameraTarget();
    }

    // Update objectives
    if (ev.objectives) {
      for (var id in ev.objectives) {
        var st = _structures[id];
        if (!st) continue;
        var obj = ev.objectives[id];
        if (typeof obj.hp === 'number') st.hp = Math.max(0, obj.hp);
        if (typeof obj.maxHp === 'number') st.maxHp = obj.maxHp;
        if (typeof obj.destroyed === 'boolean') st.destroyed = obj.destroyed;
        if (typeof obj.tempDown === 'boolean') st.tempDown = obj.tempDown;
      }
    }

    // Event flashes
    if (ev.type === 'kill' && ev.mx != null) {
      addRing(ev.mx, ev.my, '#ff4444');
    } else if (ev.type === 'objective' && ev.mx != null) {
      addRing(ev.mx, ev.my, '#c89b3c');
    } else if (ev.type === 'teamfight' && ev.mx != null) {
      addRing(ev.mx, ev.my, '#ff8800');
      addRing(ev.mx, ev.my, '#ff4444');
    } else if (ev.type === 'shrine' && ev.mx != null) {
      addRing(ev.mx, ev.my, '#c89b3c');
    } else if (ev.type === 'warden' && ev.mx != null) {
      addRing(ev.mx, ev.my, '#9b59b6');
    }

    // Attack/hit animation triggers
    if (ev.type === 'attack' && ev.attacker) {
      var ak = ev.attacker.side + '-' + ev.attacker.role;
      var atAg = _agents[ak];
      if (atAg && atAg.animState !== 'death' && atAg.animState !== 'dead') {
        atAg.animState = 'attack';
        atAg.animFrame = 0;
      }
    }
    if (ev.type === 'hit' && ev.target) {
      var hk = ev.target.side + '-' + ev.target.role;
      var htAg = _agents[hk];
      if (htAg && htAg.animState !== 'death' && htAg.animState !== 'dead') {
        htAg.animState = 'hit';
        htAg.animFrame = 0;
      }
    }

    // Champion name updates (if sent in ev.champNames)
    if (ev.champNames) {
      for (var ck in ev.champNames) {
        if (_agents[ck]) _agents[ck].champName = ev.champNames[ck];
      }
    }

    // Reset moving flag if not walk
    for (var akey in _agents) {
      var aag = _agents[akey];
      if (aag.animState !== 'walk') aag.moving = false;
    }
  };

  window.setMapSkipMode = function(skip) {
    _skipMode = skip;
    if (skip) {
      for (var key in _agents) {
        _agents[key].moveDuration = 50;
      }
    }
  };

  window.setMapTickMs = function(ms) {
    _tickMs = ms;
  };

  // Stop loop (called if match screen is hidden)
  window.stopMapVisualization = function() {
    _running = false;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  };

})();
