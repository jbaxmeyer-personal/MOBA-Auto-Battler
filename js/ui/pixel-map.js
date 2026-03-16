// pixel-map.js — Real-asset canvas renderer for The Ancient Grove
(function() {
  'use strict';

  var CANVAS_W = 900, CANVAS_H = 600;
  var MM_W = 200, MM_H = 200;
  var MAP_SIZE = 300;
  var TICK_MS_BASE = 2000;

  // ── Tile config (Tileset.png: 128x240, 8x15 grid of 16x16 tiles) ──────────
  // Adjust these pixel coords if tiles look wrong
  var TC = {
    grass:   { sx:  0, sy:   0 },  // bright green grass (row 0, col 0)
    grass2:  { sx: 16, sy:   0 },  // grass variant
    dirt:    { sx: 64, sy: 128 },  // brown dirt path
    dirt2:   { sx: 80, sy: 128 },  // dirt variant
    forest:  { sx:  0, sy:  16 },  // dark forest fill
    dforest: { sx:  0, sy:  32 },  // deep forest
    stone:   { sx: 96, sy: 128 },  // stone (base areas)
    water:   { sx:  0, sy: 192 },  // water
  };

  // Tile units: how many map units each 16px tileset tile covers in the terrain texture
  var TILE_MAP_UNITS = 8;

  // ── Decoration tree config (Decorations.png: 256x256, 16x16 grid) ──────────
  // 4 large trees in the bottom half — approximate pixel positions
  var DECO_TREES = [
    { sx:  0, sy: 128, sw: 56, sh: 112 },  // dark round tree
    { sx: 64, sy: 128, sw: 56, sh: 112 },  // medium tree
    { sx:128, sy: 128, sw: 56, sh: 112 },  // lighter tree
    { sx:192, sy: 128, sw: 48, sh: 112 },  // slim tree
  ];

  // Pixel Crawler tree config (tree1.png: 368x256)
  // Model 01 has 4 columns of tree variants (green x2, autumn x2), 2 rows
  // Each tree sprite is roughly 92x128
  var PC_TREES = [
    { img:'tree1', sx:  0, sy:  0, sw: 92, sh:128 },  // green tree A
    { img:'tree1', sx: 92, sy:  0, sw: 92, sh:128 },  // green tree B
    { img:'tree2', sx:  0, sy:  0, sw: 64, sh:112 },  // model 2 tree
  ];

  // ── Champion → sprite mapping ─────────────────────────────────────────────
  var CHAMPION_SPRITE = {
    // Tanks / Warriors
    'Stoneguard':'knight',    'Ironbark':'orc-warrior',  'Thornwall':'knight',
    'Stonewall':'knight',     'Irongrasp':'orc-warrior', 'Ironsong':'knight',
    'Deeproot':'orc-warrior', 'Thornback':'orc',
    // Assassins / Rogues
    'Shade':'rogue',          'Driftblade':'rogue',      'Spiritfox':'rogue',
    'Fangwhisper':'orc-rogue','Briarvex':'orc-rogue',
    // Mages
    'Emberpyre':'wizard',     'Hexwing':'wizard',        'Bombspore':'orc-shaman',
    'Sylvara':'wizard',       'Wraithfern':'skeleton-mage', 'Embervane':'orc-shaman',
    'Darkblossom':'wizard',
    // Marksmen
    'Wildshot':'skeleton',    'Swiftarrow':'skeleton',   'Starshot':'skeleton',
    'Vaulthorn':'skeleton',   'Duskwarden':'orc',
    // Supports / Misc
    'Bogveil':'orc-shaman',   'Iceveil':'wizard',        'Tidecaller':'orc-shaman',
    'Stormhide':'orc',        'Gravewarden':'skeleton-war',
  };

  // Role fallback if champion not found
  var ROLE_SPRITE = { top:'knight', jungle:'orc', mid:'wizard', adc:'skeleton', support:'orc-shaman' };

  // ── Runtime state ─────────────────────────────────────────────────────────
  var _canvas = null, _ctx = null;
  var _mmCanvas = null, _mmCtx = null;
  var _rafId = null, _running = false;
  var _skipMode = false, _tickMs = TICK_MS_BASE;
  var _terrainTex = null;
  var _forestTrees = [];
  var _lastTime = 0;

  // Camera (map units)
  var cam = { x: 75, y: 150, w: 150, h: 100 };
  var camTargetX = 75, camTargetY = 150;

  function m2c(mx, my) {
    return {
      x: (mx - cam.x) / cam.w * CANVAS_W,
      y: (my - cam.y) / cam.h * CANVAS_H
    };
  }

  // Scale: canvas pixels per map unit
  function scaleX() { return CANVAS_W / cam.w; }
  function scaleY() { return CANVAS_H / cam.h; }

  // ── Agents ────────────────────────────────────────────────────────────────
  var _agents = {};
  var ANIM_FPS = { idle:8, walk:12, run:12, death:8 };
  var SPRITE_FRAME_W = 32, SPRITE_FRAME_H = 32;
  // Idle: 4 frames in row 0
  // Run: 12 cols x 2 rows — row 0 = down(6)+up(6), row 1 = left(6)+right(6)
  var RUN_FRAMES = 6;

  var ROLES = ['top','jungle','mid','adc','support'];
  var SPAWN_BLUE = {x:22,y:278}, SPAWN_RED = {x:278,y:22};

  function initAgents() {
    _agents = {};
    ['blue','red'].forEach(function(side) {
      var spawn = side === 'blue' ? SPAWN_BLUE : SPAWN_RED;
      ROLES.forEach(function(role, ri) {
        var key = side + '-' + role;
        var offX = side === 'blue' ? ri*2 : -ri*2;
        var offY = side === 'blue' ? -ri*2 : ri*2;
        _agents[key] = {
          side: side, pos: role, champName: '',
          spriteKey: ROLE_SPRITE[role],
          mx: spawn.x + offX, my: spawn.y + offY,
          prevX: spawn.x, prevY: spawn.y,
          targetX: spawn.x + offX, targetY: spawn.y + offY,
          moveStart: 0, moveDuration: _tickMs,
          dir: 'down',  // 'down','up','left','right'
          animState: 'idle', animFrame: 0, animTimer: 0,
          moving: false, isDead: false,
          hp: 1, maxHp: 1,
          teamColor: side === 'blue' ? '#4fc3f7' : '#ff7b7b'
        };
      });
    });
  }

  // ── Structures ────────────────────────────────────────────────────────────
  var _structures = {};
  var STRUCT_DEFS = [
    {id:'b_bot1',  side:'blue',    type:'root',    mx:185,my:265},
    {id:'b_bot2',  side:'blue',    type:'root',    mx:115,my:265},
    {id:'b_mid1',  side:'blue',    type:'root',    mx:110,my:190},
    {id:'b_mid2',  side:'blue',    type:'root',    mx:80, my:220},
    {id:'b_top1',  side:'blue',    type:'root',    mx:35, my:185},
    {id:'b_top2',  side:'blue',    type:'root',    mx:35, my:115},
    {id:'b_heart', side:'blue',    type:'heart',   mx:55, my:240},
    {id:'b_ancient',side:'blue',   type:'ancient', mx:22, my:278},
    {id:'r_top1',  side:'red',     type:'root',    mx:115,my:35 },
    {id:'r_top2',  side:'red',     type:'root',    mx:185,my:35 },
    {id:'r_mid1',  side:'red',     type:'root',    mx:190,my:110},
    {id:'r_mid2',  side:'red',     type:'root',    mx:220,my:80 },
    {id:'r_bot1',  side:'red',     type:'root',    mx:265,my:115},
    {id:'r_bot2',  side:'red',     type:'root',    mx:265,my:185},
    {id:'r_heart', side:'red',     type:'heart',   mx:245,my:60 },
    {id:'r_ancient',side:'red',    type:'ancient', mx:278,my:22 },
    {id:'shrine',  side:'neutral', type:'shrine',  mx:65, my:65 },
    {id:'warden',  side:'neutral', type:'warden',  mx:235,my:235},
  ];

  function initStructures() {
    _structures = {};
    STRUCT_DEFS.forEach(function(d) {
      _structures[d.id] = {
        id:d.id, side:d.side, type:d.type, mx:d.mx, my:d.my,
        hp:1, maxHp:1, destroyed:false, tempDown:false
      };
    });
  }

  // ── Event rings ───────────────────────────────────────────────────────────
  var _rings = [];
  function addRing(mx, my, color) {
    _rings.push({mx:mx,my:my,r:0,maxR:28,alpha:1,color:color||'#fff',born:performance.now()});
  }

  // ── Terrain ───────────────────────────────────────────────────────────────
  function _hash(x, y) {
    var n = ((x*1619)+(y*31337))|0;
    n = (n^(n>>>13))|0;
    n = (n*1274126177)|0;
    return (n^(n>>>11))&0xFF;
  }

  function _buildTerrainTexture() {
    var ts = ASSETS['tileset'];
    if (!ts) return null;
    var size = MAP_SIZE;
    var tpu  = TILE_MAP_UNITS;
    var oc   = document.createElement('canvas');
    oc.width = size; oc.height = size;
    var ctx  = oc.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (var ty = 0; ty < size; ty += tpu) {
      for (var tx = 0; tx < size; tx += tpu) {
        var ttype = (typeof getTileType === 'function') ? getTileType(tx + tpu*0.5, ty + tpu*0.5) : 4;
        var tc = _tileCoord(ttype, tx, ty);
        ctx.drawImage(ts, tc.sx, tc.sy, 16, 16, tx, ty, tpu, tpu);
      }
    }
    return oc;
  }

  function _tileCoord(ttype, tx, ty) {
    var v = _hash(tx, ty) & 1; // slight variation
    switch (ttype) {
      case 0: return TC.dforest;           // WALL
      case 1: return TC.stone;             // BASE_BLUE
      case 2: return TC.stone;             // BASE_RED
      case 3: return v ? TC.dirt : TC.dirt2; // LANE
      case 4: return v ? TC.grass : TC.grass2; // JUNGLE
      case 5: return TC.dforest;           // DEEP_FOREST
      case 6: return TC.grass;             // CLEARING
      default: return TC.grass;
    }
  }

  function _buildForestTrees() {
    _forestTrees = [];
    var spacing = 12;
    for (var my = 20; my < 280; my += spacing) {
      for (var mx = 20; mx < 280; mx += spacing) {
        var ttype = (typeof getTileType === 'function') ? getTileType(mx, my) : 4;
        if (ttype !== 4 && ttype !== 5) continue;
        var jx = (_hash(mx, my)       / 255 - 0.5) * spacing * 0.75;
        var jy = (_hash(mx+200,my+200) / 255 - 0.5) * spacing * 0.75;
        var tx = mx + jx, ty = my + jy;
        var tt2 = (typeof getTileType === 'function') ? getTileType(Math.round(tx),Math.round(ty)) : 4;
        if (tt2 === 0||tt2===1||tt2===2||tt2===3) continue;
        var variant = _hash(mx*3, my*7) % 3;         // which PC tree
        var sz      = 0.7 + (_hash(mx+50, my+50)/255)*0.5;
        _forestTrees.push({mx:tx, my:ty, variant:variant, sz:sz});
      }
    }
    _forestTrees.sort(function(a,b){return a.my - b.my;});
  }

  // ── RAF loop ──────────────────────────────────────────────────────────────
  function loop(now) {
    if (!_running) return;
    var dt = Math.min(now - _lastTime, 150);
    _lastTime = now;
    _update(now, dt);
    _render(now);
    _rafId = requestAnimationFrame(loop);
  }

  function _update(now, dt) {
    for (var key in _agents) {
      var ag = _agents[key];
      // Interpolate position
      var elapsed = now - ag.moveStart;
      var t = ag.moveDuration > 0 ? Math.min(1, elapsed / ag.moveDuration) : 1;
      t = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      ag.mx = ag.prevX + (ag.targetX - ag.prevX) * t;
      ag.my = ag.prevY + (ag.targetY - ag.prevY) * t;

      // Animation
      if (ag.animState !== 'dead') {
        var fps = ANIM_FPS[ag.animState] || 8;
        ag.animTimer += dt;
        if (ag.animTimer >= 1000/fps) {
          ag.animTimer = 0;
          ag.animFrame++;
          if (ag.animState === 'death' && ag.animFrame >= 9) {
            ag.animState = 'dead'; ag.isDead = true;
          }
        }
      }
    }

    // Rings
    var live = [];
    _rings.forEach(function(r) {
      r.r += dt * 0.06;
      r.alpha = Math.max(0, 1 - r.r/r.maxR);
      if (r.alpha > 0) live.push(r);
    });
    _rings = live;

    // Camera lerp
    cam.x += (camTargetX - cam.x) * 0.08;
    cam.y += (camTargetY - cam.y) * 0.08;
    cam.x = Math.max(0, Math.min(MAP_SIZE - cam.w, cam.x));
    cam.y = Math.max(0, Math.min(MAP_SIZE - cam.h, cam.y));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function _render(now) {
    if (!_ctx) return;
    var ctx = _ctx;
    ctx.fillStyle = '#0a150a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    _renderTerrain(ctx);
    _renderForestTrees(ctx);
    _renderStructures(ctx);
    _renderAgents(ctx, now);
    _renderRings(ctx);
    _renderMinimap();
  }

  function _renderTerrain(ctx) {
    if (!_terrainTex) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_terrainTex, cam.x, cam.y, cam.w, cam.h, 0, 0, CANVAS_W, CANVAS_H);
  }

  function _renderForestTrees(ctx) {
    for (var i = 0; i < _forestTrees.length; i++) {
      var t = _forestTrees[i];
      var cp = m2c(t.mx, t.my);
      var cx = Math.round(cp.x), cy = Math.round(cp.y);
      if (cx < -60 || cx > CANVAS_W+60 || cy < -80 || cy > CANVAS_H+20) continue;

      var pc = PC_TREES[t.variant % PC_TREES.length];
      var img = ASSETS[pc.img];
      if (!img) continue;

      var dispH = Math.round(pc.sh * scaleX() * t.sz * 0.55);
      var dispW = Math.round(pc.sw * scaleX() * t.sz * 0.55);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, pc.sx, pc.sy, pc.sw, pc.sh,
        cx - dispW/2, cy - dispH, dispW, dispH);
    }
  }

  function _renderStructures(ctx) {
    var structs = Object.values(_structures);
    structs.sort(function(a,b){return a.my - b.my;});
    structs.forEach(function(st) {
      var cp = m2c(st.mx, st.my);
      var cx = Math.round(cp.x), cy = Math.round(cp.y);
      if (cx < -40||cx>CANVAS_W+40||cy < -40||cy>CANVAS_H+40) return;
      // Still use code-drawn sprites for now (structures are custom)
      if (typeof drawRootTower === 'function') {
        if      (st.type==='root')    drawRootTower(ctx,cx,cy,2,st.side,st.hp,st.destroyed);
        else if (st.type==='heart')   drawHeartTree(ctx,cx,cy,2,st.side,st.hp,st.destroyed);
        else if (st.type==='ancient') drawAncientTree(ctx,cx,cy,2,st.side,st.hp);
        else if (st.type==='shrine')  drawShrine(ctx,cx,cy,2,st.hp,st.tempDown);
        else if (st.type==='warden')  drawWarden(ctx,cx,cy,2,st.hp,st.tempDown);
      }
    });
  }

  function _renderAgents(ctx, now) {
    var agList = Object.values(_agents);
    agList.sort(function(a,b){return a.my - b.my;});

    agList.forEach(function(ag) {
      var cp = m2c(ag.mx, ag.my);
      var cx = Math.round(cp.x), cy = Math.round(cp.y);
      if (cx < -40||cx>CANVAS_W+40||cy < -60||cy>CANVAS_H+20) return;

      _drawAgent(ctx, ag, cx, cy, now);

      // HP bar
      var barW = 28, barH = 3;
      var barX = cx - barW/2, barY = cy - 26;
      ctx.fillStyle = '#111';
      ctx.fillRect(barX, barY, barW, barH);
      if (!ag.isDead && ag.hp > 0) {
        var pct = Math.max(0, Math.min(1, ag.hp));
        ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(barX, barY, Math.round(barW*pct), barH);
      }
      // Team color dot
      ctx.fillStyle = ag.teamColor;
      ctx.fillRect(cx-2, barY-4, 4, 4);

      // Name label
      if (ag.champName) {
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = ag.isDead ? '#555' : ag.teamColor;
        ctx.textAlign = 'center';
        ctx.fillText(ag.champName.length > 9 ? ag.champName.slice(0,8)+'.' : ag.champName, cx, barY - 5);
      }
    });
    ctx.textAlign = 'left';
  }

  function _drawAgent(ctx, ag, cx, cy, now) {
    var spriteKey = ag.isDead ? null : (CHAMPION_SPRITE[ag.champName] || ag.spriteKey || ROLE_SPRITE[ag.pos] || 'knight');
    var anim = ag.isDead ? 'dead' : ag.animState;

    // Pick sheet + frame coords
    var sheet = null, sx = 0, sy = 0, sw = SPRITE_FRAME_W, sh = SPRITE_FRAME_H;
    var frame = ag.animFrame;

    if (anim === 'dead' || anim === 'death') {
      sheet = ASSETS[spriteKey + '-death'] || ASSETS['knight-death'];
      if (sheet) {
        var deathFrames = Math.floor(sheet.width / SPRITE_FRAME_W);
        sx = Math.min(frame, deathFrames-1) * SPRITE_FRAME_W;
        sy = 0;
      }
    } else if (anim === 'walk' || anim === 'run') {
      sheet = ASSETS[spriteKey + '-run'] || ASSETS['knight-run'];
      if (sheet) {
        // Row 0: down(0-5) + up(6-11), Row 1: left(0-5) + right(6-11)
        var f = frame % RUN_FRAMES;
        if (ag.dir === 'down')       { sx = f*SPRITE_FRAME_W;           sy = 0; }
        else if (ag.dir === 'up')    { sx = (f+RUN_FRAMES)*SPRITE_FRAME_W; sy = 0; }
        else if (ag.dir === 'left')  { sx = f*SPRITE_FRAME_W;           sy = SPRITE_FRAME_H; }
        else                         { sx = (f+RUN_FRAMES)*SPRITE_FRAME_W; sy = SPRITE_FRAME_H; }
      }
    } else {
      // idle
      sheet = ASSETS[spriteKey + '-idle'] || ASSETS['knight-idle'];
      if (sheet) {
        sx = (frame % 4) * SPRITE_FRAME_W;
        sy = 0;
      }
    }

    if (!sheet) {
      // Fallback circle
      ctx.fillStyle = ag.isDead ? '#555' : ag.teamColor;
      ctx.beginPath(); ctx.arc(cx, cy-8, 8, 0, Math.PI*2); ctx.fill();
      return;
    }

    ctx.imageSmoothingEnabled = false;

    // Display size (scale from 32x32 to canvas pixels)
    var dispW = 32, dispH = 32; // canvas pixels
    var drawX = cx - dispW/2;
    var drawY = cy - dispH;

    // Horizontal flip for left direction
    if (ag.dir === 'left') {
      ctx.save();
      ctx.translate(cx*2, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(sheet, sx, sy, sw, sh, drawX, drawY, dispW, dispH);

    // Team color overlay tint (10% opacity colored rect)
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = ag.teamColor;
    ctx.fillRect(drawX, drawY, dispW, dispH);
    ctx.globalAlpha = 1;

    if (ag.dir === 'left') ctx.restore();
  }

  function _renderRings(ctx) {
    _rings.forEach(function(ring) {
      var cp = m2c(ring.mx, ring.my);
      var r  = ring.r * scaleX();
      ctx.save();
      ctx.globalAlpha  = ring.alpha;
      ctx.strokeStyle  = ring.color;
      ctx.lineWidth    = 2.5;
      ctx.beginPath(); ctx.arc(cp.x, cp.y, r, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    });
  }

  function _renderMinimap() {
    if (!_mmCtx) return;
    var ctx = _mmCtx;
    var scale = MM_W / MAP_SIZE;

    // Terrain
    if (_terrainTex) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(_terrainTex, 0, 0, MAP_SIZE, MAP_SIZE, 0, 0, MM_W, MM_H);
    } else {
      ctx.fillStyle = '#0a150a';
      ctx.fillRect(0,0,MM_W,MM_H);
    }

    // Structures
    for (var id in _structures) {
      var st = _structures[id];
      if (st.destroyed) continue;
      var sx = Math.round(st.mx*scale)-2, sy = Math.round(st.my*scale)-2;
      ctx.fillStyle = st.side==='blue'?'#4fc3f7':st.side==='red'?'#ff7b7b':'#c89b3c';
      ctx.globalAlpha = 0.9;
      ctx.fillRect(sx, sy, 4, 4);
    }

    // Agents
    for (var key in _agents) {
      var ag = _agents[key];
      var ax = Math.round(ag.mx*scale)-2, ay = Math.round(ag.my*scale)-2;
      ctx.fillStyle  = ag.isDead ? '#444' : ag.teamColor;
      ctx.globalAlpha = ag.isDead ? 0.35 : 0.95;
      ctx.fillRect(ax, ay, 4, 4);
    }
    ctx.globalAlpha = 1;

    // Camera rect
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.strokeRect(
      Math.round(cam.x*scale), Math.round(cam.y*scale),
      Math.round(cam.w*scale), Math.round(cam.h*scale)
    );
    ctx.restore();
  }

  // ── Camera target ─────────────────────────────────────────────────────────
  function _updateCamTarget() {
    var sx=0, sy=0, cnt=0;
    for (var key in _agents) {
      var ag = _agents[key];
      if (!ag.isDead) { sx+=ag.mx; sy+=ag.my; cnt++; }
    }
    if (cnt > 0) {
      camTargetX = sx/cnt - cam.w/2;
      camTargetY = sy/cnt - cam.h/2;
    }
    camTargetX = Math.max(0, Math.min(MAP_SIZE-cam.w, camTargetX));
    camTargetY = Math.max(0, Math.min(MAP_SIZE-cam.h, camTargetY));
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.initMapVisualization = function() {
    _canvas   = document.getElementById('pbp-map-canvas');
    _mmCanvas = document.getElementById('pbp-minimap-canvas');
    if (!_canvas) { console.warn('pbp-map-canvas not found'); return; }
    _ctx = _canvas.getContext('2d');
    if (_mmCanvas) _mmCtx = _mmCanvas.getContext('2d');
    _ctx.imageSmoothingEnabled = false;
    if (_mmCtx) _mmCtx.imageSmoothingEnabled = false;

    initAgents();
    initStructures();

    // Build assets once loaded
    function _init() {
      _terrainTex = _buildTerrainTexture();
      _buildForestTrees();
      cam.x = Math.max(0, Math.min(MAP_SIZE-cam.w, SPAWN_BLUE.x - cam.w/2));
      cam.y = Math.max(0, Math.min(MAP_SIZE-cam.h, SPAWN_BLUE.y - cam.h/2));
      camTargetX = cam.x; camTargetY = cam.y;
      if (!_running) {
        _running = true;
        _lastTime = performance.now();
        _rafId = requestAnimationFrame(loop);
      }
    }

    if (typeof onAssetsReady === 'function') {
      onAssetsReady(_init);
    } else {
      _init();
    }
  };

  window.updateMap = function(ev) {
    if (!ev) return;
    var now = performance.now();

    if (ev.positions) {
      for (var side in ev.positions) {
        for (var role in ev.positions[side]) {
          var key = side + '-' + role;
          var ag  = _agents[key];
          if (!ag) continue;
          var pos = ev.positions[side][role];
          if (!pos) continue;

          var nx = typeof pos.x === 'number' ? pos.x : ag.mx;
          var ny = typeof pos.y === 'number' ? pos.y : ag.my;
          var moved = Math.abs(nx-ag.mx)>0.5 || Math.abs(ny-ag.my)>0.5;

          // Direction
          var dx = nx-ag.mx, dy = ny-ag.my;
          if (Math.abs(dx)>Math.abs(dy)) {
            ag.dir = dx < 0 ? 'left' : 'right';
          } else {
            ag.dir = dy < 0 ? 'up' : 'down';
          }

          ag.prevX = ag.mx; ag.prevY = ag.my;
          ag.targetX = nx;  ag.targetY = ny;
          ag.moveStart = now;
          ag.moveDuration = _skipMode ? 50 : _tickMs;

          if (moved && ag.animState!=='death' && ag.animState!=='dead') {
            ag.animState = 'walk'; ag.moving = true;
          } else if (!moved && ag.animState==='walk') {
            ag.animState = 'idle'; ag.animFrame = 0;
          }

          if (typeof pos.hp     === 'number') ag.hp     = pos.hp / (pos.maxHp||1);
          if (typeof pos.maxHp  === 'number') ag.maxHp  = pos.maxHp;
          if (pos.champName) {
            ag.champName  = pos.champName;
            ag.spriteKey  = CHAMPION_SPRITE[pos.champName] || ROLE_SPRITE[ag.pos] || 'knight';
          }

          if (pos.isDead === true) {
            if (ag.animState!=='death'&&ag.animState!=='dead') {
              ag.animState='death'; ag.animFrame=0;
            }
            ag.isDead = true;
          } else if (pos.isDead === false && ag.isDead) {
            ag.isDead=false; ag.animState='idle'; ag.animFrame=0;
          }
        }
      }
      _updateCamTarget();
    }

    // Objectives
    if (ev.objectives && ev.objectives.length) {
      ev.objectives.forEach(function(obj) {
        var st = _structures[obj.id];
        if (!st) return;
        if (typeof obj.maxHp==='number'&&obj.maxHp>0) st.maxHp = obj.maxHp;
        if (typeof obj.hp==='number') st.hp = Math.max(0,obj.hp)/(st.maxHp||1);
        if (typeof obj.destroyed==='boolean') st.destroyed = obj.destroyed;
        if (typeof obj.tempDown==='boolean')  st.tempDown  = obj.tempDown;
      });
    }

    // Event flashes
    if (ev.type==='kill'&&ev.mx!=null)       addRing(ev.mx,ev.my,'#ff4444');
    else if (ev.type==='objective'&&ev.mx!=null) addRing(ev.mx,ev.my,'#c89b3c');
    else if (ev.type==='teamfight'&&ev.mx!=null) { addRing(ev.mx,ev.my,'#ff8800'); addRing(ev.mx,ev.my,'#ff4444'); }

    // Reset moving flag
    for (var akey in _agents) {
      if (_agents[akey].animState!=='walk') _agents[akey].moving=false;
    }
  };

  window.setMapSkipMode = function(skip) {
    _skipMode = skip;
    if (skip) for (var k in _agents) _agents[k].moveDuration=50;
  };

  window.setMapTickMs = function(ms) { _tickMs = ms; };

  window.stopMapVisualization = function() {
    _running = false;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId=null; }
  };

})();
