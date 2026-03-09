// Physarum polycephalum (slime mold) simulation
// Agents sense trail pheromone ahead and steer toward it.
// Produces organic vein/network patterns.
// Exposes window.Physarum for integration with script.js.

window.Physarum = (function () {
  'use strict';

  var GW = 256, GH = 256, GN = GW * GH;

  // ── params ────────────────────────────────────────────────────
  var N_AGENTS     = 3000;
  var SENSOR_DIST  = 9;
  var SENSOR_ANG   = Math.PI / 4;   // 45°  sense offset
  var TURN_SPEED   = Math.PI / 4;   // 45°  max turn per step
  var MOVE_SPEED   = 1.5;
  var DECAY        = 0.95;
  var DEPOSIT      = 0.04;
  var OPACITY      = 0.9;
  var GLOW         = 0;

  // ── buffers ───────────────────────────────────────────────────
  var trail  = new Float32Array(GN);
  var trailB = new Float32Array(GN);  // diffusion double-buffer
  var agX    = new Float32Array(N_AGENTS);
  var agY    = new Float32Array(N_AGENTS);
  var agA    = new Float32Array(N_AGENTS);  // angle (radians)

  // ── offscreen canvas ──────────────────────────────────────────
  var offscreen = document.createElement('canvas');
  offscreen.width = GW; offscreen.height = GH;
  var offCtx  = offscreen.getContext('2d');
  var imgData = offCtx.createImageData(GW, GH);
  var px      = imgData.data;

  var initialized = false;

  // ── seed ──────────────────────────────────────────────────────
  function seed() {
    for (var i = 0; i < GN; i++) trail[i] = 0;
    // Agents start in a ring, all pointing inward → forms converging filaments
    var cx = GW * 0.5, cy = GH * 0.5;
    var r  = Math.min(GW, GH) * 0.35;
    for (var i = 0; i < N_AGENTS; i++) {
      var a     = (i / N_AGENTS) * Math.PI * 2;
      agX[i]    = cx + Math.cos(a) * r * (0.7 + Math.random() * 0.3);
      agY[i]    = cy + Math.sin(a) * r * (0.7 + Math.random() * 0.3);
      agA[i]    = a + Math.PI + (Math.random() - 0.5) * 0.8;  // inward + noise
    }
  }

  // ── sense trail at offset angle ───────────────────────────────
  function sense(x, y, angle) {
    var sx = x + Math.cos(angle) * SENSOR_DIST;
    var sy = y + Math.sin(angle) * SENSOR_DIST;
    var gx = ((sx | 0) % GW + GW) % GW;
    var gy = ((sy | 0) % GH + GH) % GH;
    return trail[gy * GW + gx];
  }

  // ── one simulation step ───────────────────────────────────────
  function step() {
    var i, x, y, a, fwd, l, r, gx, gy, gi, xm, xp, ym, yp;

    // diffuse: 3×3 box blur into trailB, then decay
    for (y = 0; y < GH; y++) {
      ym = ((y - 1 + GH) % GH) * GW;
      var yc = y * GW;
      yp = ((y + 1) % GH) * GW;
      for (x = 0; x < GW; x++) {
        xm = (x - 1 + GW) % GW;
        xp = (x + 1) % GW;
        trailB[yc + x] = (
          trail[ym+xm] + trail[ym+x] + trail[ym+xp] +
          trail[yc+xm] + trail[yc+x] + trail[yc+xp] +
          trail[yp+xm] + trail[yp+x] + trail[yp+xp]
        ) * 0.1111 * DECAY;
      }
    }
    // swap buffers (pointer swap, no alloc)
    var tmp = trail; trail = trailB; trailB = tmp;

    // update agents
    for (i = 0; i < N_AGENTS; i++) {
      x = agX[i]; y = agY[i]; a = agA[i];
      fwd = sense(x, y, a);
      l   = sense(x, y, a - SENSOR_ANG);
      r   = sense(x, y, a + SENSOR_ANG);

      if (fwd >= l && fwd >= r) {
        // keep going straight
      } else if (l > r) {
        agA[i] -= TURN_SPEED * Math.random();
      } else if (r > l) {
        agA[i] += TURN_SPEED * Math.random();
      } else {
        agA[i] += (Math.random() > 0.5 ? 1 : -1) * TURN_SPEED;
      }

      agX[i] = ((x + Math.cos(agA[i]) * MOVE_SPEED) % GW + GW) % GW;
      agY[i] = ((y + Math.sin(agA[i]) * MOVE_SPEED) % GH + GH) % GH;

      gi = ((agY[i] | 0) * GW + (agX[i] | 0)) | 0;
      trail[gi] = trail[gi] + DEPOSIT > 1 ? 1 : trail[gi] + DEPOSIT;
    }
  }

  // ── render ────────────────────────────────────────────────────
  function draw(ctx, W, H) {
    var hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    var R = parseInt(hex.slice(1, 3), 16);
    var G = parseInt(hex.slice(3, 5), 16);
    var B = parseInt(hex.slice(5, 7), 16);
    for (var i = 0; i < GN; i++) {
      var j = i << 2;
      px[j] = R; px[j+1] = G; px[j+2] = B;
      px[j+3] = (trail[i] * OPACITY * 255) | 0;
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (GLOW > 0) { ctx.shadowColor = 'rgba('+R+','+G+','+B+',1)'; ctx.shadowBlur = GLOW; }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  // ── public API ────────────────────────────────────────────────
  function init() {
    if (!initialized) { seed(); initialized = true; }
  }

  function reset() { seed(); }

  function setParam(key, val) {
    switch (key) {
      case 'phy.opacity': OPACITY    = Math.max(0.01, Math.min(1,     parseFloat(val) || OPACITY));    return true;
      case 'phy.glow':    GLOW       = Math.max(0,    Math.min(20,    parseFloat(val) || 0));           return true;
      case 'phy.decay':   DECAY      = Math.max(0.80, Math.min(0.999, parseFloat(val) || DECAY));      return true;
      case 'phy.speed':   MOVE_SPEED = Math.max(0.3,  Math.min(5,     parseFloat(val) || MOVE_SPEED)); return true;
    }
    return false;
  }

  function getParams() {
    return { 'phy.opacity': OPACITY, 'phy.glow': GLOW, 'phy.decay': DECAY, 'phy.speed': MOVE_SPEED };
  }

  return { init: init, reset: reset, step: step, draw: draw, setParam: setParam, getParams: getParams };
}());
