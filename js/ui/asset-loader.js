// asset-loader.js — Preloads all PNG assets before the game starts
// Access via global ASSETS object: ASSETS.tileset, ASSETS['knight-idle'], etc.

var ASSETS = {};

(function() {
  'use strict';

  var ASSET_MANIFEST = {
    // Terrain
    'tileset':            'assets/terrain/tileset.png',
    'decorations':        'assets/terrain/decorations.png',
    // Character idle sheets (128x32 = 4 frames x 32x32)
    'knight-idle':        'assets/sprites/knight-idle.png',
    'rogue-idle':         'assets/sprites/rogue-idle.png',
    'wizard-idle':        'assets/sprites/wizard-idle.png',
    'orc-idle':           'assets/sprites/orc-idle.png',
    'orc-warrior-idle':   'assets/sprites/orc-warrior-idle.png',
    'orc-shaman-idle':    'assets/sprites/orc-shaman-idle.png',
    'orc-rogue-idle':     'assets/sprites/orc-rogue-idle.png',
    'skeleton-idle':      'assets/sprites/skeleton-idle.png',
    'skeleton-mage-idle': 'assets/sprites/skeleton-mage-idle.png',
    'skeleton-war-idle':  'assets/sprites/skeleton-warrior-idle.png',
    // Character run sheets (384x64 = 12 cols x 2 rows x 32x32)
    'knight-run':         'assets/sprites/knight-run.png',
    'rogue-run':          'assets/sprites/rogue-run.png',
    'wizard-run':         'assets/sprites/wizard-run.png',
    'orc-run':            'assets/sprites/orc-run.png',
    'orc-warrior-run':    'assets/sprites/orc-warrior-run.png',
    'orc-shaman-run':     'assets/sprites/orc-shaman-run.png',
    // Death sheets
    'knight-death':       'assets/sprites/knight-death.png',
    'rogue-death':        'assets/sprites/rogue-death.png',
    'wizard-death':       'assets/sprites/wizard-death.png',
    // Trees (Pixel Crawler)
    'tree1':              'assets/trees/tree1.png',
    'tree2':              'assets/trees/tree2.png',
    'tree3':              'assets/trees/tree3.png',
  };

  var _pending = 0;
  var _callbacks = [];

  window.onAssetsReady = function(cb) {
    if (_pending === 0 && Object.keys(ASSETS).length > 0) { cb(); return; }
    _callbacks.push(cb);
  };

  function _done() {
    _pending--;
    if (_pending <= 0) {
      _pending = 0;
      _callbacks.forEach(function(cb) { try { cb(); } catch(e) { console.error(e); } });
      _callbacks = [];
    }
  }

  // Start loading
  var keys = Object.keys(ASSET_MANIFEST);
  _pending = keys.length;
  keys.forEach(function(key) {
    var img = new Image();
    img.onload  = function() { ASSETS[key] = img; _done(); };
    img.onerror = function() {
      console.warn('[assets] Failed to load:', ASSET_MANIFEST[key]);
      _done(); // don't block on missing assets
    };
    img.src = ASSET_MANIFEST[key];
  });

})();
