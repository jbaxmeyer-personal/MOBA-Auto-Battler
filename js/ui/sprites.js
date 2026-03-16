// sprites.js - Pixel art sprite system for The Ancient Grove

function makePen(ctx, ox, oy, s) {
  return function(ax, ay, aw, ah) {
    ctx.fillRect(Math.round(ox + ax*s), Math.round(oy + ay*s), Math.round(aw*s), Math.round(ah*s));
  };
}

function drawSkull(ctx, cx, cy, s, col) {
  var c = col || '#e0e0e0';
  ctx.fillStyle = c;
  // cranium
  ctx.fillRect(Math.round(cx - 3*s), Math.round(cy - 4*s), Math.round(6*s), Math.round(5*s));
  // jaw
  ctx.fillRect(Math.round(cx - 2*s), Math.round(cy + 1*s), Math.round(5*s), Math.round(2*s));
  // eye sockets (dark)
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(Math.round(cx - 2*s), Math.round(cy - 3*s), Math.round(2*s), Math.round(2*s));
  ctx.fillRect(Math.round(cx + 1*s), Math.round(cy - 3*s), Math.round(2*s), Math.round(2*s));
  // nose
  ctx.fillRect(Math.round(cx - 1*s), Math.round(cy - 1*s), Math.round(1*s), Math.round(1*s));
  // teeth
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(cx - 2*s), Math.round(cy + 1*s), Math.round(1*s), Math.round(2*s));
  ctx.fillRect(Math.round(cx),       Math.round(cy + 1*s), Math.round(1*s), Math.round(2*s));
  ctx.fillRect(Math.round(cx + 2*s), Math.round(cy + 1*s), Math.round(1*s), Math.round(2*s));
}

// ── Terrain ──────────────────────────────────────────────────────────────────

var TILE = { WALL:0, BASE_BLUE:1, BASE_RED:2, LANE:3, JUNGLE:4, DEEP_FOREST:5, CLEARING:6 };

function getTileType(mx, my) {
  if (mx < 10 || mx > 290 || my < 10 || my > 290) return TILE.WALL;
  if (mx < 68 && my > 232) return TILE.BASE_BLUE;
  if (mx > 232 && my < 68) return TILE.BASE_RED;
  // lane checks
  if (my > 242 && mx > 28 && mx < 215) return TILE.LANE;
  if (mx < 52 && my > 28 && my < 242) return TILE.LANE;
  if (Math.abs(mx + my - 300) < 22 && mx > 10 && mx < 290) return TILE.LANE;
  if (mx < 68 && my > 175) return TILE.LANE;
  if (mx < 175 && my > 232) return TILE.LANE;
  if (mx > 232 && my < 125) return TILE.LANE;
  if (mx > 125 && my < 68) return TILE.LANE;
  // clearings
  var dx65 = mx - 65, dy65 = my - 65;
  if (dx65*dx65 + dy65*dy65 < 400) return TILE.CLEARING;
  var dx235 = mx - 235, dy235 = my - 235;
  if (dx235*dx235 + dy235*dy235 < 400) return TILE.CLEARING;
  // deep forest: far from all lanes
  var distToLane = Math.min(
    Math.abs(my - 265),           // bot lane
    Math.abs(mx - 35),            // top lane
    Math.abs(mx + my - 300) / 1.414 // mid diagonal
  );
  if (distToLane > 55) return TILE.DEEP_FOREST;
  return TILE.JUNGLE;
}

function drawTile(ctx, tileType, cx, cy, tileSize, seed) {
  var s1 = seed % 7;
  var s2 = (seed * 3 + 13) % 11;
  var s3 = (seed * 7 + 5) % 5;

  switch (tileType) {
    case TILE.WALL:
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(cx, cy, tileSize, tileSize);
      ctx.fillStyle = '#3a3a3a';
      // brick mortar lines
      if ((Math.floor(cy / tileSize) % 2) === 0) {
        ctx.fillRect(cx, cy + Math.floor(tileSize * 0.5), tileSize, 1);
        ctx.fillRect(cx + Math.floor(tileSize * 0.5), cy, 1, Math.floor(tileSize * 0.5));
      } else {
        ctx.fillRect(cx, cy + Math.floor(tileSize * 0.5), tileSize, 1);
        ctx.fillRect(cx + Math.floor(tileSize * 0.25), cy, 1, Math.floor(tileSize * 0.5));
        ctx.fillRect(cx + Math.floor(tileSize * 0.75), cy, 1, Math.floor(tileSize * 0.5));
      }
      break;

    case TILE.BASE_BLUE:
      ctx.fillStyle = '#585858';
      ctx.fillRect(cx, cy, tileSize, tileSize);
      // stone block lines
      ctx.fillStyle = '#484848';
      ctx.fillRect(cx, cy + Math.floor(tileSize * 0.5), tileSize, 1);
      if (s1 > 3) ctx.fillRect(cx + Math.floor(tileSize * 0.5), cy, 1, Math.floor(tileSize * 0.5));
      // blue splash
      ctx.fillStyle = 'rgba(42,58,90,0.6)';
      ctx.fillRect(cx + s1, cy + s2 % 3, tileSize - s1 - s3, tileSize - s2 % 4 - s3);
      break;

    case TILE.BASE_RED:
      ctx.fillStyle = '#585858';
      ctx.fillRect(cx, cy, tileSize, tileSize);
      ctx.fillStyle = '#484848';
      ctx.fillRect(cx, cy + Math.floor(tileSize * 0.5), tileSize, 1);
      if (s1 > 3) ctx.fillRect(cx + Math.floor(tileSize * 0.5), cy, 1, Math.floor(tileSize * 0.5));
      ctx.fillStyle = 'rgba(90,42,42,0.6)';
      ctx.fillRect(cx + s1, cy + s2 % 3, tileSize - s1 - s3, tileSize - s2 % 4 - s3);
      break;

    case TILE.LANE:
      ctx.fillStyle = '#7a6040';
      ctx.fillRect(cx, cy, tileSize, tileSize);
      ctx.fillStyle = '#9a8060';
      if (s1 > 4) ctx.fillRect(cx + s2, cy + s3, Math.floor(tileSize * 0.4), Math.floor(tileSize * 0.3));
      if (s2 > 6) ctx.fillRect(cx + s1 + 2, cy + s2 - 4, Math.floor(tileSize * 0.25), Math.floor(tileSize * 0.2));
      ctx.fillStyle = '#6a5030';
      if (s3 > 2) ctx.fillRect(cx + s3, cy + s1 + 1, Math.floor(tileSize * 0.2), Math.floor(tileSize * 0.15));
      break;

    case TILE.JUNGLE:
      ctx.fillStyle = '#1a3010';
      ctx.fillRect(cx, cy, tileSize, tileSize);
      ctx.fillStyle = '#0d1f08';
      if (s1 > 2) ctx.fillRect(cx + s2, cy + s3 + 1, Math.floor(tileSize * 0.45), Math.floor(tileSize * 0.4));
      if (s2 > 5) ctx.fillRect(cx + s1 + 1, cy + s2 % 4, Math.floor(tileSize * 0.3), Math.floor(tileSize * 0.35));
      ctx.fillStyle = '#253818';
      if (s3 > 1) ctx.fillRect(cx + s3 + 2, cy + s3, Math.floor(tileSize * 0.2), Math.floor(tileSize * 0.2));
      break;

    case TILE.DEEP_FOREST:
      ctx.fillStyle = '#0d1a08';
      ctx.fillRect(cx, cy, tileSize, tileSize);
      ctx.fillStyle = '#060e04';
      if (s1 > 1) ctx.fillRect(cx + s2 % 5, cy + s3, Math.floor(tileSize * 0.5), Math.floor(tileSize * 0.45));
      if (s2 > 4) ctx.fillRect(cx + s1, cy + s2 % 5 + 1, Math.floor(tileSize * 0.35), Math.floor(tileSize * 0.3));
      ctx.fillStyle = '#111f0a';
      if (s3 > 2) ctx.fillRect(cx + s3 + 1, cy + s1 % 4, Math.floor(tileSize * 0.25), Math.floor(tileSize * 0.2));
      break;

    case TILE.CLEARING:
      ctx.fillStyle = '#2a4518';
      ctx.fillRect(cx, cy, tileSize, tileSize);
      ctx.fillStyle = '#355820';
      if (s1 > 3) ctx.fillRect(cx + s2, cy + s3, Math.floor(tileSize * 0.4), Math.floor(tileSize * 0.35));
      ctx.fillStyle = '#1e3210';
      if (s2 > 5) ctx.fillRect(cx + s1, cy + s2 % 4 + 1, Math.floor(tileSize * 0.3), Math.floor(tileSize * 0.25));
      break;

    default:
      ctx.fillStyle = '#1a3010';
      ctx.fillRect(cx, cy, tileSize, tileSize);
  }
}

// ── Structures ────────────────────────────────────────────────────────────────

function drawRootTower(ctx, cx, cy, s, side, hpPct, destroyed) {
  var p = makePen(ctx, cx - 8*s, cy - 16*s, s);
  if (destroyed) {
    // rubble
    ctx.fillStyle = '#3a2a10';
    p(3, 12, 3, 2); p(5, 13, 2, 2); p(7, 11, 3, 3);
    ctx.fillStyle = '#5a4a28';
    p(4, 14, 2, 1); p(6, 12, 2, 1);
    return;
  }
  // roots at base
  ctx.fillStyle = '#2a1a08';
  p(3, 13, 1, 3); p(9, 13, 1, 3); p(5, 14, 1, 2); p(7, 14, 1, 2);
  // trunk
  ctx.fillStyle = '#5a3a18';
  p(5, 7, 6, 9);
  // trunk highlights
  ctx.fillStyle = '#7a5a28';
  p(6, 8, 1, 7); p(9, 9, 1, 5);
  // bark lines
  ctx.fillStyle = '#3a2510';
  p(5, 10, 1, 2); p(10, 8, 1, 3);
  // crystal top
  var crystalCol = side === 'blue' ? '#4fc3f7' : '#ff7b7b';
  var crystalDark = side === 'blue' ? '#1a5a8a' : '#8a1a1a';
  ctx.fillStyle = crystalDark;
  p(6, 4, 4, 4);
  ctx.fillStyle = crystalCol;
  p(7, 2, 2, 2); p(6, 4, 4, 2);
  // crystal shine
  ctx.fillStyle = '#ffffff';
  p(7, 2, 1, 1);
  // HP bar
  if (hpPct < 1) {
    var barW = 12;
    var filled = Math.max(1, Math.round(barW * hpPct));
    ctx.fillStyle = '#1a1a1a';
    p(2, 1, barW, 1);
    ctx.fillStyle = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(Math.round(cx - 8*s + 2*s), Math.round(cy - 16*s + 1*s), Math.round(filled*s), Math.round(1*s));
  }
}

function drawHeartTree(ctx, cx, cy, s, side, hpPct, destroyed) {
  var p = makePen(ctx, cx - 8*s, cy - 16*s, s);
  if (destroyed) {
    ctx.fillStyle = '#2a1a08';
    p(2, 10, 5, 5); p(7, 11, 4, 4); p(4, 13, 5, 3);
    ctx.fillStyle = '#4a3a18';
    p(3, 12, 2, 2); p(8, 13, 2, 1);
    return;
  }
  // wide roots
  ctx.fillStyle = '#1e1008';
  p(1, 13, 2, 3); p(4, 14, 2, 2); p(8, 14, 2, 2); p(11, 13, 2, 3);
  // gnarled trunk
  ctx.fillStyle = '#4a3218';
  p(4, 6, 8, 9);
  ctx.fillStyle = '#6a4a28';
  p(5, 7, 2, 7); p(9, 8, 2, 5);
  ctx.fillStyle = '#3a2010';
  p(4, 9, 1, 3); p(11, 7, 1, 4); p(7, 11, 1, 2);
  // branch extensions
  ctx.fillStyle = '#3a2510';
  p(1, 7, 3, 2); p(12, 6, 3, 2);
  ctx.fillStyle = '#4a3218';
  p(2, 6, 2, 1); p(13, 5, 2, 1);
  // canopy
  ctx.fillStyle = '#1a3a10';
  p(3, 2, 10, 5);
  ctx.fillStyle = '#2a5018';
  p(4, 1, 8, 4); p(5, 0, 6, 2);
  ctx.fillStyle = '#3a6020';
  p(5, 2, 6, 3); p(6, 1, 4, 2);
  // heart crystal
  var hCol = side === 'blue' ? '#4fc3f7' : '#ff7b7b';
  var hDark = side === 'blue' ? '#1a3a6a' : '#6a1a1a';
  ctx.fillStyle = hDark;
  p(6, 4, 4, 4);
  ctx.fillStyle = hCol;
  p(7, 3, 2, 1); p(6, 4, 4, 2); p(7, 6, 2, 1);
  ctx.fillStyle = '#ffffff';
  p(7, 3, 1, 1);
  // glow
  ctx.fillStyle = side === 'blue' ? 'rgba(79,195,247,0.15)' : 'rgba(255,123,123,0.15)';
  p(5, 3, 6, 5);
  if (hpPct < 1) {
    var barW = 13;
    var filled = Math.max(1, Math.round(barW * hpPct));
    ctx.fillStyle = '#1a1a1a';
    p(1, 0, barW, 1);
    ctx.fillStyle = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(Math.round(cx - 8*s + 1*s), Math.round(cy - 16*s + 0*s), Math.round(filled*s), Math.round(1*s));
  }
}

function drawAncientTree(ctx, cx, cy, s, side, hpPct) {
  var p = makePen(ctx, cx - 8*s, cy - 16*s, s);
  // massive roots
  ctx.fillStyle = '#181008';
  p(0, 13, 2, 3); p(3, 14, 2, 2); p(9, 14, 2, 2); p(13, 13, 2, 3);
  ctx.fillStyle = '#0e0804';
  p(1, 15, 14, 1);
  // thick trunk
  ctx.fillStyle = '#3a2810';
  p(3, 6, 10, 9);
  ctx.fillStyle = '#5a4020';
  p(4, 7, 3, 7); p(9, 8, 3, 6);
  ctx.fillStyle = '#2a1c0a';
  p(3, 9, 1, 4); p(12, 8, 1, 5); p(7, 12, 1, 2);
  // bark ridges
  ctx.fillStyle = '#4a3418';
  p(6, 7, 1, 8); p(8, 6, 1, 9);
  // big canopy layers
  ctx.fillStyle = '#122808';
  p(1, 4, 14, 6);
  ctx.fillStyle = '#1e4010';
  p(2, 3, 12, 5); p(3, 2, 10, 4);
  ctx.fillStyle = '#2a5818';
  p(3, 2, 10, 4); p(4, 1, 8, 3); p(5, 0, 6, 2);
  ctx.fillStyle = '#3a7022';
  p(5, 1, 6, 3); p(6, 0, 4, 2);
  // inner glow
  var gCol = side === 'blue' ? '#4fc3f7' : '#ff7b7b';
  var gMid = side === 'blue' ? '#1a5a8a' : '#8a1a1a';
  var gDark = side === 'blue' ? '#0a2a4a' : '#4a0a0a';
  ctx.fillStyle = gDark;
  p(5, 7, 6, 7);
  ctx.fillStyle = gMid;
  p(6, 8, 4, 5);
  ctx.fillStyle = gCol;
  p(7, 9, 2, 3); p(6, 10, 4, 1);
  ctx.fillStyle = '#ffffff';
  p(7, 9, 1, 1);
  // outer glow halo
  ctx.fillStyle = side === 'blue' ? 'rgba(79,195,247,0.12)' : 'rgba(255,123,123,0.12)';
  p(4, 6, 8, 9);
  // HP bar
  if (hpPct < 1) {
    var barW = 15;
    var filled = Math.max(1, Math.round(barW * hpPct));
    ctx.fillStyle = '#0a0a0a';
    p(0, 0, barW, 2);
    ctx.fillStyle = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(Math.round(cx - 8*s), Math.round(cy - 16*s), Math.round(filled*s), Math.round(2*s));
  }
}

function drawShrine(ctx, cx, cy, s, hpPct, tempDown) {
  var p = makePen(ctx, cx - 8*s, cy - 12*s, s);
  var active = !tempDown && hpPct > 0;
  // stone base
  ctx.fillStyle = '#3a3828';
  p(3, 8, 10, 4);
  ctx.fillStyle = '#4a4838';
  p(4, 7, 8, 5); p(5, 6, 6, 6);
  ctx.fillStyle = '#2a2818';
  p(3, 11, 10, 1); p(4, 9, 1, 2); p(11, 9, 1, 2);
  // altar top
  ctx.fillStyle = '#585640';
  p(4, 5, 8, 3);
  ctx.fillStyle = '#686650';
  p(5, 4, 6, 2);
  // rune triangle
  if (active) {
    ctx.fillStyle = '#c89b3c';
    p(7, 1, 2, 1); p(6, 2, 1, 1); p(9, 2, 1, 1); p(5, 3, 1, 1); p(10, 3, 1, 1); p(5, 4, 6, 1);
    // glow
    ctx.fillStyle = 'rgba(200,155,60,0.2)';
    p(4, 0, 8, 5);
    ctx.fillStyle = '#ffe080';
    p(7, 2, 2, 1);
  } else {
    ctx.fillStyle = '#5a5848';
    p(7, 1, 2, 1); p(6, 2, 1, 1); p(9, 2, 1, 1); p(5, 3, 1, 1); p(10, 3, 1, 1); p(5, 4, 6, 1);
  }
  // HP bar
  if (hpPct < 1 && hpPct > 0) {
    var barW = 12;
    var filled = Math.max(1, Math.round(barW * hpPct));
    ctx.fillStyle = '#1a1a1a';
    p(2, 0, barW, 1);
    ctx.fillStyle = '#c89b3c';
    ctx.fillRect(Math.round(cx - 8*s + 2*s), Math.round(cy - 12*s), Math.round(filled*s), Math.round(1*s));
  }
}

function drawWarden(ctx, cx, cy, s, hpPct, tempDown) {
  var p = makePen(ctx, cx - 8*s, cy - 12*s, s);
  var active = !tempDown && hpPct > 0;
  // body mass
  ctx.fillStyle = '#1a0a2a';
  p(3, 6, 10, 8);
  ctx.fillStyle = '#2a1040';
  p(4, 5, 8, 7); p(5, 4, 6, 8);
  ctx.fillStyle = '#120820';
  p(3, 12, 10, 1); p(4, 11, 1, 1); p(11, 11, 1, 1);
  // tentacle/limb hints
  ctx.fillStyle = '#3a1858';
  p(1, 8, 2, 3); p(13, 8, 2, 3);
  p(2, 10, 1, 2); p(14, 10, 1, 2);
  // eye area
  ctx.fillStyle = '#0a0614';
  p(5, 6, 6, 4);
  if (active) {
    // large glowing eye
    ctx.fillStyle = '#6a1a9a';
    p(5, 7, 6, 3);
    ctx.fillStyle = '#9a2ad0';
    p(6, 7, 4, 3);
    ctx.fillStyle = '#cc44ff';
    p(7, 8, 2, 1);
    ctx.fillStyle = '#ffffff';
    p(7, 7, 1, 1);
    // pupil slit
    ctx.fillStyle = '#0a0614';
    p(7, 8, 2, 1);
    ctx.fillStyle = '#cc44ff';
    p(8, 8, 1, 1);
  } else {
    // drooping closed eye
    ctx.fillStyle = '#2a1040';
    p(5, 7, 6, 3);
    ctx.fillStyle = '#4a2060';
    p(6, 8, 4, 1);
    // droop lines
    ctx.fillStyle = '#3a1858';
    p(6, 9, 1, 2); p(9, 9, 1, 2);
  }
  // horns/crown
  ctx.fillStyle = '#4a1a6a';
  if (active) {
    p(5, 2, 1, 4); p(6, 1, 1, 4); p(9, 1, 1, 4); p(10, 2, 1, 4);
    p(7, 0, 2, 3);
    ctx.fillStyle = '#7a2aaa';
    p(7, 0, 2, 2);
  } else {
    p(5, 4, 1, 2); p(6, 3, 1, 3); p(9, 3, 1, 3); p(10, 4, 1, 2);
    p(7, 3, 2, 2);
  }
  // HP bar
  if (hpPct < 1 && hpPct > 0) {
    var barW = 12;
    var filled = Math.max(1, Math.round(barW * hpPct));
    ctx.fillStyle = '#0a0614';
    p(2, 0, barW, 1);
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(Math.round(cx - 8*s + 2*s), Math.round(cy - 12*s), Math.round(filled*s), Math.round(1*s));
  }
}

// ── Champion Draw Functions ───────────────────────────────────────────────────

var CHAMPION_DRAW = {};

// Helper: draw legs based on animState/frame
// lx=left leg art-x, rx=right leg art-x, lw/rw=widths, ly=leg top y (art)
function drawLegs(p, animState, frame, lx, rx, lw, rw, ly, col, col2) {
  ly = ly || 12;
  col = col || '#5a3a18';
  col2 = col2 || null;
  var f = frame % 4;
  if (animState === 'walk') {
    if (f === 0) { p.ctx.fillStyle = col; p.pen(lx, ly, lw, 3); p.ctx.fillStyle = col2||col; p.pen(rx, ly+1, rw, 2); }
    else if (f === 2) { p.ctx.fillStyle = col; p.pen(lx, ly+1, lw, 2); p.ctx.fillStyle = col2||col; p.pen(rx, ly, rw, 3); }
    else { p.ctx.fillStyle = col; p.pen(lx, ly, lw, 3); p.ctx.fillStyle = col2||col; p.pen(rx, ly, rw, 3); }
  } else {
    p.ctx.fillStyle = col;
    p.pen(lx, ly, lw, 3);
    p.ctx.fillStyle = col2||col;
    p.pen(rx, ly, rw, 3);
  }
}

// Stoneguard
CHAMPION_DRAW['Stoneguard'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#909090'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(1, 3, 14, 13); return; }
  // wide torso
  ctx.fillStyle = '#707070'; p(1, 4, 14, 9);
  // armor highlights
  ctx.fillStyle = '#909090'; p(2, 4, 3, 2); p(10, 4, 3, 2); p(2, 7, 12, 1);
  // darker armor lines
  ctx.fillStyle = '#505050'; p(1, 8, 14, 1); p(7, 4, 1, 9);
  // shoulder guards
  ctx.fillStyle = '#888888'; p(1, 3, 4, 3); p(11, 3, 4, 3);
  ctx.fillStyle = '#aaaaaa'; p(1, 3, 2, 1); p(13, 3, 2, 1);
  // head
  ctx.fillStyle = '#808080'; p(4, 1, 8, 4);
  ctx.fillStyle = '#606060'; p(4, 1, 8, 1); p(4, 4, 8, 1);
  // eye slits
  ctx.fillStyle = '#e8f8ff'; p(5, 2, 2, 1); p(9, 2, 2, 1);
  // blue shield left arm
  ctx.fillStyle = '#1a3a6a'; p(1, 5, 4, 5);
  ctx.fillStyle = '#2a5aaa'; p(1, 5, 3, 4);
  ctx.fillStyle = '#4fc3f7'; p(2, 6, 1, 2); p(1, 5, 1, 1);
  // right arm
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#707070'; p(13, 5, 2 + armExt, 4);
  ctx.fillStyle = '#909090'; p(13, 5, 1, 2);
  // legs
  ctx.fillStyle = '#606060'; p(4, 13, 3, 3); p(9, 13, 3, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(4, 13, 3, 4); p(9, 12, 3, 3); }
    else if (f === 2) { p(4, 12, 3, 3); p(9, 13, 3, 4); }
  }
};

// Stormhide
CHAMPION_DRAW['Stormhide'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#4fc3f7'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(2, 3, 12, 13); return; }
  // dark body
  ctx.fillStyle = '#1a2540'; p(2, 4, 12, 9);
  ctx.fillStyle = '#243060'; p(3, 4, 10, 8);
  // lightning bolt
  ctx.fillStyle = '#e8c020'; p(7, 5, 2, 3); p(6, 7, 4, 1); p(7, 8, 2, 2);
  ctx.fillStyle = '#fff080'; p(7, 5, 1, 2); p(8, 8, 1, 1);
  // wide shoulders
  ctx.fillStyle = '#2a3a5a'; p(1, 4, 14, 3); p(1, 3, 4, 2); p(11, 3, 4, 2);
  // head
  ctx.fillStyle = '#1a2540'; p(4, 1, 8, 4);
  // yellow eyes
  ctx.fillStyle = '#e8c020'; p(5, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#fff080'; p(5, 2, 1, 1); p(9, 2, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#1a2540'; p(0, 5, 2, 5); p(14 - armExt, 5, 2 + armExt, 5);
  // legs
  ctx.fillStyle = '#151e30'; p(4, 13, 3, 3); p(9, 13, 3, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(4, 13, 3, 4); p(9, 12, 3, 3); }
    else if (f === 2) { p(4, 12, 3, 3); p(9, 13, 3, 4); }
  }
};

// Thornback
CHAMPION_DRAW['Thornback'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#cc4400'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(2, 3, 12, 13); return; }
  // shell body (round)
  ctx.fillStyle = '#4a3010'; p(3, 4, 10, 10);
  ctx.fillStyle = '#3a2008'; p(2, 5, 12, 8); p(3, 4, 10, 10);
  ctx.fillStyle = '#5a4020'; p(4, 5, 8, 7);
  // shell pattern
  ctx.fillStyle = '#3a2808'; p(4, 7, 8, 1); p(6, 5, 1, 6); p(10, 5, 1, 6);
  // spikes on shoulders
  ctx.fillStyle = '#cc7700'; p(2, 4, 1, 2); p(7, 2, 1, 3); p(13, 4, 1, 2);
  ctx.fillStyle = '#ff9900'; p(7, 2, 1, 1);
  // head (small, turtle)
  ctx.fillStyle = '#5a4020'; p(5, 1, 6, 4);
  ctx.fillStyle = '#4a3010'; p(5, 1, 6, 1); p(5, 4, 6, 1);
  // orange eyes
  ctx.fillStyle = '#cc4400'; p(6, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#ff6600'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // stubby arms
  var armExt = animState === 'attack' ? 1 : 0;
  ctx.fillStyle = '#4a3010'; p(1, 6, 2 + armExt, 3); p(13 - armExt, 6, 2 + armExt, 3);
  // legs
  ctx.fillStyle = '#3a2008'; p(4, 13, 3, 3); p(9, 13, 3, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(4, 13, 3, 4); p(9, 12, 3, 3); }
    else if (f === 2) { p(4, 12, 3, 3); p(9, 13, 3, 4); }
  }
};

// Sylvara
CHAMPION_DRAW['Sylvara'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#4a8030'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(2, 3, 12, 13); return; }
  // leaf armor layers
  ctx.fillStyle = '#2d6020'; p(3, 5, 10, 8);
  ctx.fillStyle = '#4a8030'; p(4, 4, 8, 7);
  // leaf detail
  ctx.fillStyle = '#3a7028'; p(4, 6, 2, 3); p(10, 6, 2, 3); p(7, 5, 2, 5);
  ctx.fillStyle = '#5a9040'; p(5, 5, 1, 2); p(10, 5, 1, 2);
  // shoulder guards (rounded leaves)
  ctx.fillStyle = '#2d6020'; p(1, 4, 4, 4); p(11, 4, 4, 4);
  ctx.fillStyle = '#4a8030'; p(2, 3, 3, 3); p(11, 3, 3, 3);
  // head
  ctx.fillStyle = '#3a5028'; p(5, 1, 6, 4);
  // flower crown
  ctx.fillStyle = '#cc6688'; p(5, 0, 2, 1); p(7, 1, 2, 1); p(9, 0, 2, 1); p(6, 0, 1, 1); p(8, 0, 1, 1);
  ctx.fillStyle = '#ffaacc'; p(6, 1, 1, 1); p(8, 1, 1, 1);
  ctx.fillStyle = '#ffe0ee'; p(7, 0, 2, 1);
  // white eyes
  ctx.fillStyle = '#ffffff'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#2d6020'; p(0, 5, 3, 5); p(13 - armExt, 5, 3 + armExt, 5);
  // legs
  ctx.fillStyle = '#2a5018'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Bogveil
CHAMPION_DRAW['Bogveil'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#5a6a30'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(3, 3, 10, 13); return; }
  // body
  ctx.fillStyle = '#3a4a20'; p(4, 5, 8, 8);
  // vine swirls
  ctx.fillStyle = '#5a6a30'; p(5, 6, 1, 3); p(8, 7, 1, 4); p(6, 9, 3, 1);
  ctx.fillStyle = '#6a7a38'; p(6, 6, 1, 2); p(9, 8, 1, 2);
  // head
  ctx.fillStyle = '#1a2a0a'; p(5, 2, 6, 4);
  ctx.fillStyle = '#2a3a12'; p(5, 2, 6, 1); p(5, 5, 6, 1);
  // green eyes
  ctx.fillStyle = '#44cc44'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#88ff44'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // left arm + axe
  ctx.fillStyle = '#3a4a20'; p(2, 6, 2, 4);
  var armExt = animState === 'attack' ? 2 : 0;
  // right arm axe
  ctx.fillStyle = '#5a3a10'; p(12, 5, 2, 5 + armExt);
  ctx.fillStyle = '#8a6a30'; p(12, 4, 2, 2); p(11, 5, 3, 1);
  ctx.fillStyle = '#c0a040'; p(12, 4, 1, 1);
  // legs
  ctx.fillStyle = '#2a3a18'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Ironsong
CHAMPION_DRAW['Ironsong'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#4a5a7a'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(3, 3, 10, 13); return; }
  // body
  ctx.fillStyle = '#4a5a7a'; p(4, 5, 8, 8);
  // silver shoulders
  ctx.fillStyle = '#7a8aaa'; p(3, 4, 3, 3); p(10, 4, 3, 3);
  ctx.fillStyle = '#9aaac8'; p(3, 4, 2, 2); p(11, 4, 2, 2);
  // head
  ctx.fillStyle = '#5a6a8a'; p(5, 2, 6, 4);
  // red war paint
  ctx.fillStyle = '#cc2200'; p(5, 3, 6, 1);
  ctx.fillStyle = '#ff3300'; p(6, 3, 4, 1);
  // twin arm extensions
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#4a5a7a'; p(1, 6, 3 + armExt, 3); p(12 - armExt, 6, 3 + armExt, 3);
  ctx.fillStyle = '#7a8aaa'; p(1, 6, 1, 2); p(14, 6, 1, 2);
  // legs
  ctx.fillStyle = '#3a4a6a'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Thornwall
CHAMPION_DRAW['Thornwall'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#6a4a2a'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(3, 3, 10, 13); return; }
  ctx.fillStyle = '#3a3a3a'; p(4, 5, 8, 8);
  ctx.fillStyle = '#4a4a4a'; p(5, 5, 6, 7);
  // thorn spikes on shoulders
  ctx.fillStyle = '#6a4a2a'; p(3, 4, 10, 2);
  ctx.fillStyle = '#8a6a3a'; p(4, 3, 1, 2); p(6, 2, 1, 3); p(8, 2, 1, 3); p(10, 2, 1, 3); p(12, 3, 1, 2);
  // head
  ctx.fillStyle = '#3a3a3a'; p(5, 1, 6, 4);
  ctx.fillStyle = '#4a4a4a'; p(6, 1, 4, 3);
  // dark red eyes
  ctx.fillStyle = '#881100'; p(6, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#cc2200'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#3a3a3a'; p(2, 6, 2, 4); p(12 - armExt, 6, 2 + armExt, 4);
  // legs
  ctx.fillStyle = '#2a2a2a'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Deeproot
CHAMPION_DRAW['Deeproot'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#7a5a3a'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(3, 3, 10, 13); return; }
  ctx.fillStyle = '#5a3a1a'; p(4, 5, 8, 8);
  // bark patches
  ctx.fillStyle = '#7a5a3a'; p(5, 5, 2, 2); p(9, 6, 2, 3); p(5, 9, 3, 2);
  ctx.fillStyle = '#3a2010'; p(4, 7, 1, 3); p(11, 6, 1, 4);
  // head
  ctx.fillStyle = '#5a3a1a'; p(5, 2, 6, 4);
  ctx.fillStyle = '#7a5a3a'; p(6, 2, 2, 2);
  // orange eyes
  ctx.fillStyle = '#cc7700'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#ffaa00'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // root tendrils on arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#5a3a1a'; p(2, 6, 2, 3); p(12 - armExt, 6, 2 + armExt, 3);
  ctx.fillStyle = '#3a2010'; p(1, 7, 2, 3); p(13, 8, 2, 3);
  ctx.fillStyle = '#5a3a1a'; p(0, 8, 2, 2); p(14, 9, 2, 2);
  // legs
  ctx.fillStyle = '#4a2a10'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Ironbark
CHAMPION_DRAW['Ironbark'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#6a5040'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(3, 4, 10, 12); return; }
  // stocky bark body
  ctx.fillStyle = '#4a3220'; p(3, 5, 10, 9);
  ctx.fillStyle = '#6a5040'; p(4, 5, 4, 3); p(9, 6, 3, 4);
  ctx.fillStyle = '#3a2818'; p(3, 8, 1, 4); p(12, 7, 1, 5);
  // moss patches
  ctx.fillStyle = '#2d5a1b'; p(4, 4, 3, 2); p(10, 4, 3, 2);
  // head
  ctx.fillStyle = '#4a3220'; p(5, 2, 6, 4);
  ctx.fillStyle = '#6a5040'; p(6, 2, 3, 2);
  // red eyes
  ctx.fillStyle = '#ff2200'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#ff6644'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#4a3220'; p(1, 6, 2, 5); p(13 - armExt, 6, 2 + armExt, 5);
  ctx.fillStyle = '#6a5040'; p(1, 6, 1, 3);
  // legs (stocky)
  ctx.fillStyle = '#3a2818'; p(4, 13, 3, 3); p(9, 13, 3, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(4, 13, 3, 4); p(9, 12, 3, 3); }
    else if (f === 2) { p(4, 12, 3, 3); p(9, 13, 3, 4); }
  }
};

// Wraithfern
CHAMPION_DRAW['Wraithfern'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#9a60cc'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 1, 8, 15); return; }
  // tall thin robe
  ctx.fillStyle = '#2a1040'; p(5, 4, 6, 12);
  ctx.fillStyle = '#3a1858'; p(6, 3, 4, 12);
  // vine stitching
  ctx.fillStyle = '#1a3010'; p(5, 6, 1, 3); p(10, 7, 1, 4); p(6, 10, 4, 1);
  // ghost wisps (sides)
  ctx.fillStyle = '#5a4a6a'; p(3, 8, 2, 3); p(11, 7, 2, 4);
  ctx.fillStyle = '#7a6a8a'; p(3, 9, 1, 1); p(12, 8, 1, 2);
  // head
  ctx.fillStyle = '#1e0c30'; p(5, 1, 6, 4);
  ctx.fillStyle = '#2a1040'; p(5, 1, 6, 1);
  // golden eyes
  ctx.fillStyle = '#e8cc00'; p(6, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#fff080'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // arms (extended magic)
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#2a1040'; p(3, 7, 2, 3); p(11 - armExt, 7, 2 + armExt, 3);
  // robe hem
  ctx.fillStyle = '#3a1858'; p(5, 14, 6, 2);
  ctx.fillStyle = '#2a1040'; p(4, 15, 2, 1); p(10, 15, 2, 1);
};

// Bombspore
CHAMPION_DRAW['Bombspore'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#6a7a20'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(3, 7, 10, 9); return; }
  // short wide body
  ctx.fillStyle = '#6a7a20'; p(3, 8, 10, 7);
  ctx.fillStyle = '#7a8a30'; p(4, 8, 8, 5);
  ctx.fillStyle = '#5a6a18'; p(3, 10, 10, 1);
  // alchemist pouch belt
  ctx.fillStyle = '#8a6a40'; p(3, 12, 10, 2);
  ctx.fillStyle = '#aa8a50'; p(4, 12, 2, 1); p(8, 12, 2, 1); p(12, 12, 1, 1);
  // head
  ctx.fillStyle = '#7a8a30'; p(4, 4, 8, 5);
  ctx.fillStyle = '#6a7a20'; p(4, 4, 8, 1); p(4, 8, 8, 1);
  // orange goggles
  ctx.fillStyle = '#cc6600'; p(4, 5, 4, 2); p(9, 5, 3, 2);
  ctx.fillStyle = '#ff8800'; p(5, 5, 2, 2); p(9, 5, 2, 2);
  ctx.fillStyle = '#ffcc00'; p(5, 5, 1, 1); p(9, 5, 1, 1);
  ctx.fillStyle = '#2a1800'; p(8, 5, 1, 2);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#6a7a20'; p(1, 9, 2, 4); p(13 - armExt, 9, 2 + armExt, 4);
  // legs
  ctx.fillStyle = '#5a6a18'; p(5, 14, 2, 2); p(9, 14, 2, 2);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 14, 2, 3); p(9, 13, 2, 2); }
    else if (f === 2) { p(5, 13, 2, 2); p(9, 14, 2, 3); }
  }
};

// Vaulthorn
CHAMPION_DRAW['Vaulthorn'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#8a3ab8'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 2, 8, 14); return; }
  // robe
  ctx.fillStyle = '#4a1a6a'; p(5, 5, 6, 11);
  ctx.fillStyle = '#5a2a7a'; p(6, 4, 4, 10);
  // arcane cage chest pattern
  ctx.fillStyle = '#7a3a9a'; p(6, 6, 4, 1); p(6, 9, 4, 1); p(6, 6, 1, 4); p(9, 6, 1, 4);
  // head
  ctx.fillStyle = '#4a1a6a'; p(5, 2, 6, 4);
  ctx.fillStyle = '#5a2a7a'; p(6, 2, 4, 3);
  // two curved horns
  ctx.fillStyle = '#8a5aaa'; p(5, 0, 1, 3); p(4, 1, 1, 2); p(3, 2, 1, 1);
  ctx.fillStyle = '#8a5aaa'; p(10, 0, 1, 3); p(11, 1, 1, 2); p(12, 2, 1, 1);
  ctx.fillStyle = '#aа7acc'; p(5, 0, 1, 1); p(10, 0, 1, 1);
  // eyes
  ctx.fillStyle = '#cc88ff'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#eeccff'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#4a1a6a'; p(3, 7, 2, 4); p(11 - armExt, 7, 2 + armExt, 4);
  // robe base
  ctx.fillStyle = '#3a1055'; p(5, 14, 6, 2);
};

// Emberpyre
CHAMPION_DRAW['Emberpyre'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#ff6600'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 2, 8, 14); return; }
  // body
  ctx.fillStyle = '#cc4400'; p(5, 5, 6, 10);
  ctx.fillStyle = '#dd5500'; p(6, 4, 4, 9);
  // ember glow dots
  ctx.fillStyle = '#ff6600'; p(6, 7, 1, 1); p(9, 8, 1, 1); p(7, 10, 1, 1); p(8, 6, 1, 1);
  ctx.fillStyle = '#ffaa00'; p(7, 8, 1, 1);
  // head
  ctx.fillStyle = '#cc4400'; p(5, 2, 6, 4);
  ctx.fillStyle = '#dd5500'; p(6, 2, 4, 3);
  // flaming crown (3 spikes)
  ctx.fillStyle = '#ff8800'; p(6, 0, 1, 3); p(8, 0, 1, 3); p(7, 1, 2, 2);
  ctx.fillStyle = '#ffcc00'; p(6, 0, 1, 2); p(8, 0, 1, 2); p(7, 0, 2, 1);
  ctx.fillStyle = '#ffffff'; p(7, 0, 1, 1);
  // eyes
  ctx.fillStyle = '#ff6600'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#ffcc00'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#cc4400'; p(3, 7, 2, 4); p(11 - armExt, 7, 2 + armExt, 4);
  ctx.fillStyle = '#ff6600'; p(3, 7, 1, 2);
};

// Spiritfox
CHAMPION_DRAW['Spiritfox'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#44aaaa'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(5, 2, 6, 14); return; }
  // slim teal robe
  ctx.fillStyle = '#1a7a6a'; p(5, 4, 6, 11);
  ctx.fillStyle = '#e8f8f0'; p(7, 5, 2, 2); p(6, 7, 4, 1);
  ctx.fillStyle = '#2a8a7a'; p(6, 4, 4, 10);
  // fox tail hint (bottom right)
  ctx.fillStyle = '#cc8844'; p(11, 12, 2, 3); p(12, 11, 1, 3);
  ctx.fillStyle = '#ffaa66'; p(12, 13, 1, 1);
  ctx.fillStyle = '#ffffff'; p(12, 14, 1, 1);
  // head
  ctx.fillStyle = '#1a7a6a'; p(5, 1, 6, 4);
  ctx.fillStyle = '#2a8a7a'; p(6, 1, 4, 3);
  // fox ears
  ctx.fillStyle = '#cc8844'; p(5, 0, 2, 2); p(9, 0, 2, 2);
  ctx.fillStyle = '#ffaa66'; p(5, 0, 1, 1); p(10, 0, 1, 1);
  // teal eyes
  ctx.fillStyle = '#44ccaa'; p(6, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#88ffdd'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#1a7a6a'; p(3, 6, 2, 4); p(11 - armExt, 6, 2 + armExt, 4);
};

// Iceveil
CHAMPION_DRAW['Iceveil'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#88ccff'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 2, 8, 14); return; }
  // pale ice robe
  ctx.fillStyle = '#b0d0f0'; p(5, 4, 6, 12);
  ctx.fillStyle = '#d8eeff'; p(6, 4, 4, 11);
  // frost crystal chest pattern
  ctx.fillStyle = '#88ccff'; p(7, 7, 2, 1); p(6, 8, 4, 1); p(7, 9, 2, 1); p(6, 7, 1, 3); p(9, 7, 1, 3);
  ctx.fillStyle = '#c8eaff'; p(7, 8, 2, 1);
  // head
  ctx.fillStyle = '#b0d0f0'; p(5, 2, 6, 4);
  ctx.fillStyle = '#d8eeff'; p(6, 2, 4, 3);
  // ice crown (5 crystal spikes, alternating heights)
  ctx.fillStyle = '#d8f0ff'; p(5, 1, 1, 3); p(6, 0, 1, 4); p(7, 1, 1, 3); p(8, 0, 1, 4); p(9, 1, 1, 3);
  ctx.fillStyle = '#f0ffff'; p(6, 0, 1, 2); p(8, 0, 1, 2);
  ctx.fillStyle = '#ffffff'; p(6, 0, 1, 1); p(8, 0, 1, 1);
  // icy blue eyes
  ctx.fillStyle = '#88ccff'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#aaddff'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#b0d0f0'; p(3, 6, 2, 5); p(11 - armExt, 6, 2 + armExt, 5);
};

// Wildshot
CHAMPION_DRAW['Wildshot'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#4fc3f7'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 3, 8, 13); return; }
  // light blue armor (shorter body)
  ctx.fillStyle = '#4a8ab0'; p(5, 6, 6, 8);
  ctx.fillStyle = '#6aaad0'; p(6, 6, 4, 7);
  ctx.fillStyle = '#3a7a9a'; p(5, 9, 6, 1);
  // head
  ctx.fillStyle = '#4a8ab0'; p(5, 3, 6, 4);
  // green hair
  ctx.fillStyle = '#3a7a20'; p(5, 2, 6, 2); p(5, 3, 2, 2);
  ctx.fillStyle = '#5a9a30'; p(6, 2, 4, 1);
  // cheerful eyes
  ctx.fillStyle = '#ffffff'; p(6, 4, 2, 1); p(9, 4, 2, 1);
  ctx.fillStyle = '#2a6a90'; p(6, 4, 1, 1); p(9, 4, 1, 1);
  // LARGE CANNON right arm
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#3a3a3a'; p(11 - armExt, 7, 4 + armExt, 3);
  ctx.fillStyle = '#5a5a5a'; p(12 - armExt, 7, 3 + armExt, 2);
  ctx.fillStyle = '#2a2a2a'; p(14, 8, 1, 1);
  // left arm
  ctx.fillStyle = '#4a8ab0'; p(3, 7, 2, 3);
  // legs
  ctx.fillStyle = '#3a7a9a'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Swiftarrow
CHAMPION_DRAW['Swiftarrow'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#3a7a20'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(5, 2, 6, 14); return; }
  // slim green cloak
  ctx.fillStyle = '#2a5a1a'; p(5, 4, 6, 12);
  ctx.fillStyle = '#3a7028'; p(6, 4, 4, 11);
  ctx.fillStyle = '#1a4010'; p(5, 10, 6, 1);
  // hood
  ctx.fillStyle = '#1a3a0a'; p(4, 1, 8, 5);
  ctx.fillStyle = '#2a5018'; p(5, 1, 6, 4); p(5, 0, 6, 2);
  // forest green eyes
  ctx.fillStyle = '#44aa22'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#66dd33'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // bow (left side, curved)
  ctx.fillStyle = '#6a4a1a'; p(3, 4, 1, 8);
  ctx.fillStyle = '#8a6a2a'; p(3, 4, 1, 1); p(3, 11, 1, 1);
  // bow string
  ctx.fillStyle = '#c8c0a0'; p(4, 5, 1, 6);
  // arrow nocked
  ctx.fillStyle = '#c8c0a0'; p(4, 7, 4, 1);
  ctx.fillStyle = '#885500'; p(7, 7, 1, 1);
  // right arm
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#2a5a1a'; p(11 - armExt, 6, 2 + armExt, 3);
  // legs
  ctx.fillStyle = '#2a4a18'; p(6, 14, 2, 2); p(9, 14, 2, 2);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(6, 14, 2, 3); p(9, 13, 2, 2); }
    else if (f === 2) { p(6, 13, 2, 2); p(9, 14, 2, 3); }
  }
};

// Starshot
CHAMPION_DRAW['Starshot'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#c89b3c'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(5, 2, 6, 14); return; }
  // cosmic robe
  ctx.fillStyle = '#3a1a5a'; p(5, 4, 6, 12);
  ctx.fillStyle = '#4a2a6a'; p(6, 4, 4, 11);
  // gold trim sleeves
  ctx.fillStyle = '#c89b3c'; p(5, 6, 1, 5); p(10, 6, 1, 5);
  ctx.fillStyle = '#e8bb5c'; p(5, 6, 1, 2); p(10, 6, 1, 2);
  // head
  ctx.fillStyle = '#3a1a5a'; p(5, 2, 6, 4);
  ctx.fillStyle = '#4a2a6a'; p(6, 2, 4, 3);
  // star marking forehead
  ctx.fillStyle = '#ffee00'; p(7, 2, 2, 1); p(8, 1, 1, 3); p(7, 3, 1, 1); p(9, 3, 1, 1);
  ctx.fillStyle = '#ffffff'; p(8, 2, 1, 1);
  // cosmic eyes
  ctx.fillStyle = '#cc88ff'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#3a1a5a'; p(3, 6, 2, 5); p(11 - armExt, 6, 2 + armExt, 5);
  // gold dots cosmic
  ctx.fillStyle = '#c89b3c'; p(7, 7, 1, 1); p(9, 9, 1, 1); p(6, 9, 1, 1);
};

// Duskwarden
CHAMPION_DRAW['Duskwarden'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#888888'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 1, 8, 15); return; }
  // near-black body
  ctx.fillStyle = '#2a2a2a'; p(4, 5, 8, 11);
  ctx.fillStyle = '#1a1a1a'; p(5, 4, 6, 10);
  // crossbow on torso
  ctx.fillStyle = '#4a3a2a'; p(4, 8, 5, 2);
  ctx.fillStyle = '#5a4a3a'; p(4, 8, 4, 1);
  ctx.fillStyle = '#3a2a1a'; p(6, 7, 1, 4);
  ctx.fillStyle = '#c8b88a'; p(8, 8, 1, 1);
  // hood
  ctx.fillStyle = '#1a1a1a'; p(4, 1, 8, 5);
  ctx.fillStyle = '#0a0a0a'; p(5, 1, 6, 4); p(5, 0, 6, 2);
  // barely visible grey eyes
  ctx.fillStyle = '#666666'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#888888'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#2a2a2a'; p(2, 7, 2, 4); p(12 - armExt, 7, 2 + armExt, 4);
  // legs
  ctx.fillStyle = '#1a1a1a'; p(5, 14, 2, 2); p(9, 14, 2, 2);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 14, 2, 3); p(9, 13, 2, 2); }
    else if (f === 2) { p(5, 13, 2, 2); p(9, 14, 2, 3); }
  }
};

// Embervane
CHAMPION_DRAW['Embervane'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#cc4400'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 3, 8, 13); return; }
  // red-orange armor
  ctx.fillStyle = '#8a2a00'; p(5, 5, 6, 10);
  ctx.fillStyle = '#aa3a00'; p(6, 5, 4, 9);
  ctx.fillStyle = '#cc4400'; p(7, 6, 2, 3);
  // head
  ctx.fillStyle = '#8a2a00'; p(5, 2, 6, 4);
  ctx.fillStyle = '#aa3a00'; p(6, 2, 4, 3);
  // red eyes
  ctx.fillStyle = '#ff4400'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#ff8800'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // flaming arrow quiver (right side, 3 orange sticks)
  ctx.fillStyle = '#5a3a1a'; p(11, 5, 2, 7);
  ctx.fillStyle = '#ff6600'; p(11, 4, 1, 3); p(12, 3, 1, 3); p(13, 4, 1, 3);
  ctx.fillStyle = '#ffaa00'; p(11, 4, 1, 1); p(12, 3, 1, 1); p(13, 4, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#8a2a00'; p(3, 7, 2, 4); p(11 - armExt, 7, 2 + armExt, 4);
  // legs
  ctx.fillStyle = '#6a1e00'; p(5, 14, 2, 2); p(9, 14, 2, 2);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 14, 2, 3); p(9, 13, 2, 2); }
    else if (f === 2) { p(5, 13, 2, 2); p(9, 14, 2, 3); }
  }
};

// Briarvex
CHAMPION_DRAW['Briarvex'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#8a3a2a'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(5, 3, 6, 13); return; }
  // dark red-brown body
  ctx.fillStyle = '#4a1a1a'; p(5, 4, 6, 11);
  ctx.fillStyle = '#5a2a2a'; p(6, 4, 4, 10);
  // thorn patches
  ctx.fillStyle = '#6a3a2a'; p(6, 6, 1, 1); p(9, 7, 1, 1); p(7, 9, 1, 1);
  ctx.fillStyle = '#8a5a3a'; p(6, 6, 1, 1);
  // head
  ctx.fillStyle = '#4a1a1a'; p(5, 1, 6, 4);
  ctx.fillStyle = '#5a2a2a'; p(6, 1, 4, 3);
  // red-orange eyes
  ctx.fillStyle = '#dd3300'; p(6, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#ff5500'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // briar whip right arm (sinuous)
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#4a1a1a'; p(11 - armExt, 6, 2 + armExt, 3);
  ctx.fillStyle = '#8a3a2a'; p(13, 7, 1, 1); p(14, 8, 1, 1); p(14, 9, 1, 1); p(13, 10, 1, 1); p(14, 11, 1, 1);
  ctx.fillStyle = '#aa5a3a'; p(13, 7, 1, 1);
  // left arm
  ctx.fillStyle = '#4a1a1a'; p(3, 6, 2, 3);
  // legs
  ctx.fillStyle = '#3a1010'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Shade
CHAMPION_DRAW['Shade'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#aa44ff'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#aa44ff'; p(4, 1, 8, 15); return; }
  // purple shadow glow border
  ctx.fillStyle = '#6a2a9a'; p(4, 1, 8, 1); p(3, 2, 1, 12); p(12, 2, 1, 12); p(4, 14, 8, 1);
  ctx.fillStyle = '#4a1a7a'; p(4, 2, 1, 12); p(11, 2, 1, 12); p(5, 1, 6, 1); p(5, 14, 6, 1);
  // near-black body
  ctx.fillStyle = '#0d0d14'; p(5, 2, 6, 12);
  ctx.fillStyle = '#141420'; p(6, 3, 4, 10);
  // bright purple eyes
  ctx.fillStyle = '#aa44ff'; p(6, 5, 2, 1); p(9, 5, 2, 1);
  ctx.fillStyle = '#cc66ff'; p(6, 5, 1, 1); p(9, 5, 1, 1);
  ctx.fillStyle = '#eeccff'; p(7, 5, 1, 1);
  // shadow wisps
  ctx.fillStyle = '#6a2a9a'; p(4, 7, 1, 3); p(11, 8, 1, 3);
  ctx.fillStyle = '#3a0a5a'; p(3, 9, 1, 2); p(12, 9, 1, 2);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#0d0d14'; p(3, 7, 2, 4); p(11 - armExt, 7, 2 + armExt, 4);
};

// Hexwing
CHAMPION_DRAW['Hexwing'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#22cc44'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 2, 8, 14); return; }
  // dark green body (low stance)
  ctx.fillStyle = '#1a3a1a'; p(5, 6, 6, 9);
  ctx.fillStyle = '#2a4a2a'; p(6, 6, 4, 8);
  ctx.fillStyle = '#142a14'; p(5, 10, 6, 1);
  // feather wing hints
  ctx.fillStyle = '#1a4a3a'; p(1, 6, 4, 5); p(11, 6, 4, 5);
  ctx.fillStyle = '#2a5a4a'; p(1, 7, 3, 3); p(12, 7, 3, 3);
  ctx.fillStyle = '#1a3a2a'; p(0, 8, 2, 2); p(14, 8, 2, 2);
  // head (forward lean)
  ctx.fillStyle = '#1a3a1a'; p(5, 3, 6, 4);
  ctx.fillStyle = '#2a4a2a'; p(6, 3, 4, 3);
  // sharp green eyes
  ctx.fillStyle = '#22cc44'; p(6, 4, 2, 1); p(9, 4, 2, 1);
  ctx.fillStyle = '#44ee66'; p(6, 4, 1, 1); p(9, 4, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#1a3a1a'; p(3, 7, 2, 3); p(11 - armExt, 7, 2 + armExt, 3);
  // legs
  ctx.fillStyle = '#142a14'; p(6, 14, 2, 2); p(9, 14, 2, 2);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(6, 14, 2, 3); p(9, 13, 2, 2); }
    else if (f === 2) { p(6, 13, 2, 2); p(9, 14, 2, 3); }
  }
};

// Fangwhisper
CHAMPION_DRAW['Fangwhisper'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#8acc20'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(5, 2, 6, 14); return; }
  // serpentine body
  ctx.fillStyle = '#4a7a20'; p(5, 4, 6, 12);
  ctx.fillStyle = '#6a9a30'; p(6, 5, 4, 10);
  // scale highlights
  ctx.fillStyle = '#8acc20'; p(6, 5, 1, 2); p(9, 6, 1, 2); p(7, 9, 1, 2); p(8, 7, 1, 2);
  ctx.fillStyle = '#5a8a18'; p(5, 7, 1, 3); p(10, 8, 1, 3);
  // head (slightly elongated)
  ctx.fillStyle = '#4a7a20'; p(5, 1, 6, 5);
  ctx.fillStyle = '#6a9a30'; p(6, 1, 4, 4);
  // yellow slit eyes
  ctx.fillStyle = '#ddcc00'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#ffee00'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // snake fang at chin
  ctx.fillStyle = '#ffffff'; p(7, 5, 1, 2); p(9, 5, 1, 2);
  // forked tongue
  ctx.fillStyle = '#dd2222'; p(7, 6, 1, 1); p(9, 6, 1, 1); p(8, 5, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#4a7a20'; p(3, 7, 2, 4); p(11 - armExt, 7, 2 + armExt, 4);
  ctx.fillStyle = '#6a9a30'; p(3, 7, 1, 3);
};

// Driftblade
CHAMPION_DRAW['Driftblade'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#44ccff'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 2, 8, 14); return; }
  // wind body
  ctx.fillStyle = '#2a3a6a'; p(5, 4, 6, 12);
  ctx.fillStyle = '#3a4a7a'; p(6, 4, 4, 11);
  // blade trail streaks (diagonal cyan)
  ctx.fillStyle = '#44ccff'; p(2, 5, 1, 3); p(3, 7, 1, 2); p(12, 6, 1, 3); p(13, 4, 1, 3);
  ctx.fillStyle = '#88ddff'; p(2, 5, 1, 1); p(13, 4, 1, 1);
  ctx.fillStyle = '#8ab0f0'; p(3, 8, 1, 2); p(12, 9, 1, 2);
  // head
  ctx.fillStyle = '#2a3a6a'; p(5, 1, 6, 4);
  ctx.fillStyle = '#3a4a7a'; p(6, 1, 4, 3);
  // cyan eyes
  ctx.fillStyle = '#44ccff'; p(6, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#88eeff'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#2a3a6a'; p(3, 6, 2, 4); p(11 - armExt, 6, 2 + armExt, 4);
  // wind-swept hair
  ctx.fillStyle = '#8ab0f0'; p(5, 1, 4, 1); p(4, 2, 2, 1);
  // legs
  ctx.fillStyle = '#1a2a5a'; p(5, 14, 2, 2); p(9, 14, 2, 2);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 14, 2, 3); p(9, 13, 2, 2); }
    else if (f === 2) { p(5, 13, 2, 2); p(9, 14, 2, 3); }
  }
};

// Darkblossom
CHAMPION_DRAW['Darkblossom'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#cc4488'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(5, 2, 6, 14); return; }
  // dark robe
  ctx.fillStyle = '#4a1a4a'; p(5, 4, 6, 12);
  ctx.fillStyle = '#5a2a5a'; p(6, 4, 4, 11);
  // head
  ctx.fillStyle = '#4a1a4a'; p(5, 1, 6, 4);
  ctx.fillStyle = '#5a2a5a'; p(6, 1, 4, 3);
  // flower petal crown (4 petals)
  ctx.fillStyle = '#cc4488'; p(5, 0, 2, 2); p(9, 0, 2, 2); p(6, 1, 1, 1); p(9, 1, 1, 1);
  ctx.fillStyle = '#ee66aa'; p(7, 0, 2, 1);
  ctx.fillStyle = '#ff88cc'; p(5, 0, 1, 1); p(10, 0, 1, 1); p(7, 1, 2, 1);
  ctx.fillStyle = '#ffddee'; p(8, 0, 1, 1);
  // magenta eyes
  ctx.fillStyle = '#dd44aa'; p(6, 2, 2, 1); p(9, 2, 2, 1);
  ctx.fillStyle = '#ff66cc'; p(6, 2, 1, 1); p(9, 2, 1, 1);
  // staff right arm
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#4a1a4a'; p(3, 7, 2, 4);
  ctx.fillStyle = '#6a4a2a'; p(11 - armExt, 5, 1, 7 + armExt);
  ctx.fillStyle = '#cc4488'; p(11 - armExt, 4, 1, 2);
  // robe hem
  ctx.fillStyle = '#3a0a3a'; p(5, 14, 6, 2);
};

// Irongrasp
CHAMPION_DRAW['Irongrasp'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#888888'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(2, 3, 12, 13); return; }
  // grey metal body
  ctx.fillStyle = '#585858'; p(4, 5, 8, 9);
  ctx.fillStyle = '#686868'; p(5, 5, 6, 8);
  // mechanical joints
  ctx.fillStyle = '#484848'; p(4, 8, 8, 1); p(7, 5, 1, 9);
  // head
  ctx.fillStyle = '#585858'; p(5, 2, 6, 4);
  ctx.fillStyle = '#686868'; p(6, 2, 4, 3);
  // grey eyes
  ctx.fillStyle = '#aaaaaa'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#cccccc'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // left arm normal
  ctx.fillStyle = '#585858'; p(2, 6, 2, 5);
  // OVERSIZED right gauntlet
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#505050'; p(12 - armExt, 5, 5 + armExt, 6);
  ctx.fillStyle = '#707070'; p(12 - armExt, 5, 4 + armExt, 5);
  // finger details
  ctx.fillStyle = '#505050'; p(13, 10, 1, 1); p(14, 10, 1, 1); p(12, 10, 1, 1);
  ctx.fillStyle = '#606060'; p(13, 9, 1, 1);
  // legs
  ctx.fillStyle = '#484848'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Stonewall
CHAMPION_DRAW['Stonewall'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#aaaaaa'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(2, 3, 12, 13); return; }
  // light grey body
  ctx.fillStyle = '#888888'; p(5, 5, 7, 9);
  ctx.fillStyle = '#999999'; p(6, 5, 5, 8);
  // LARGE SHIELD WALL in front
  ctx.fillStyle = '#aaaaaa'; p(2, 7, 5, 7);
  ctx.fillStyle = '#cccccc'; p(2, 7, 4, 6);
  ctx.fillStyle = '#888888'; p(2, 7, 1, 7); p(2, 13, 5, 1);
  ctx.fillStyle = '#999999'; p(3, 8, 1, 4); p(2, 10, 5, 1);
  // cross emblem on shield
  ctx.fillStyle = '#dddddd'; p(3, 9, 3, 1); p(4, 8, 1, 3);
  // head
  ctx.fillStyle = '#888888'; p(5, 2, 6, 4);
  ctx.fillStyle = '#999999'; p(6, 2, 4, 3);
  // white eyes
  ctx.fillStyle = '#ffffff'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  // right arm
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#888888'; p(12 - armExt, 6, 2 + armExt, 4);
  // legs
  ctx.fillStyle = '#666666'; p(6, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(6, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(6, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Tidecaller
CHAMPION_DRAW['Tidecaller'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#44eeff'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(5, 2, 6, 14); return; }
  // cyan robe
  ctx.fillStyle = '#1a6a8a'; p(5, 4, 6, 12);
  ctx.fillStyle = '#44aac0'; p(6, 4, 4, 11);
  ctx.fillStyle = '#2a7a9a'; p(6, 8, 4, 1);
  // water droplet chest
  ctx.fillStyle = '#44eeff'; p(7, 7, 2, 1); p(8, 6, 1, 3); p(7, 8, 2, 1);
  ctx.fillStyle = '#aaffff'; p(8, 7, 1, 1);
  // head
  ctx.fillStyle = '#1a6a8a'; p(5, 2, 6, 4);
  ctx.fillStyle = '#44aac0'; p(6, 2, 4, 3);
  // wavy hair flowing upward
  ctx.fillStyle = '#88ddff'; p(5, 1, 2, 2); p(7, 0, 2, 3); p(10, 1, 2, 2);
  ctx.fillStyle = '#aaeeff'; p(7, 0, 2, 2);
  ctx.fillStyle = '#cafaff'; p(8, 0, 1, 1);
  // aqua eyes
  ctx.fillStyle = '#44eeff'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#88ffff'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#1a6a8a'; p(3, 6, 2, 5); p(11 - armExt, 6, 2 + armExt, 5);
};

// Gravewarden
CHAMPION_DRAW['Gravewarden'] = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#c0c0b0'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var p = makePen(ctx, ox, oy + idleOff*s, s);
  if (animState === 'hit') { ctx.fillStyle = '#ffffff'; p(4, 3, 8, 13); return; }
  // off-white body
  ctx.fillStyle = '#c0c0b0'; p(4, 5, 8, 9);
  ctx.fillStyle = '#d0d0c0'; p(5, 5, 6, 8);
  ctx.fillStyle = '#b0b0a0'; p(4, 9, 8, 1);
  // bone arm guards
  ctx.fillStyle = '#d8d8c8'; p(2, 7, 2, 4); p(12, 7, 2, 4);
  ctx.fillStyle = '#c8c8b8'; p(2, 8, 2, 1); p(12, 8, 2, 1);
  // skull decoration chest
  ctx.fillStyle = '#e0e0e0'; p(6, 6, 4, 4);
  ctx.fillStyle = '#0d0d0d'; p(7, 7, 1, 1); p(9, 7, 1, 1); p(7, 8, 3, 1);
  ctx.fillStyle = '#e0e0e0'; p(7, 8, 1, 1); p(9, 8, 1, 1);
  // head
  ctx.fillStyle = '#c0c0b0'; p(5, 2, 6, 4);
  ctx.fillStyle = '#d0d0c0'; p(6, 2, 4, 3);
  // hollow dark grey eye sockets
  ctx.fillStyle = '#444444'; p(6, 3, 2, 1); p(9, 3, 2, 1);
  ctx.fillStyle = '#222222'; p(6, 3, 1, 1); p(9, 3, 1, 1);
  // arms
  var armExt = animState === 'attack' ? 2 : 0;
  ctx.fillStyle = '#c0c0b0'; p(2, 7, 2, 4); p(12 - armExt, 7, 2 + armExt, 4);
  // legs
  ctx.fillStyle = '#a8a898'; p(5, 13, 2, 3); p(9, 13, 2, 3);
  if (animState === 'walk') {
    var f = frame % 4;
    if (f === 0) { p(5, 13, 2, 4); p(9, 12, 2, 3); }
    else if (f === 2) { p(5, 12, 2, 3); p(9, 13, 2, 4); }
  }
};

// Default fallback
CHAMPION_DRAW._default = function(ctx, ox, oy, s, animState, frame, isDead) {
  if (isDead || animState === 'dead') { drawSkull(ctx, ox + 8*s, oy + 8*s, s, '#aaaaaa'); return; }
  var idleOff = (animState === 'idle' && frame % 2 === 1) ? -1 : 0;
  var cx = ox + 8*s, cy = oy + 8*s;
  if (animState === 'hit') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy - idleOff*s, 6*s, 0, Math.PI*2); ctx.fill();
    return;
  }
  ctx.fillStyle = '#6a6a6a';
  ctx.beginPath(); ctx.arc(cx, cy + idleOff*s, 6*s, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath(); ctx.arc(cx, cy + idleOff*s, 4*s, 0, Math.PI*2); ctx.fill();
};
