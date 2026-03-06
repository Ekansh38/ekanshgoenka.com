function toggleTheme() {
  const h = document.documentElement;
  const t = document.getElementById('t');
  const dark = h.getAttribute('data-theme') === 'dark';
  const next = dark ? 'light' : 'dark';
  h.setAttribute('data-theme', next);
  t.textContent = dark ? '[light]' : '[dark]';
  localStorage.setItem('theme', next);
}

(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', function () {
    const t = document.getElementById('t');
    if (t) t.textContent = saved === 'dark' ? '[dark]' : '[light]';
  });
})();

// ================================================================
// BG EFFECT — switchable background simulation
// Modes: life → boids → off
// Click the mode button or press 'b' to cycle modes.
// To remove: delete this section, the BG EFFECT block in style.css,
//            <canvas id="bg-canvas"> and #bg-mode-btn from templates.
// ================================================================
(function () {
  // Disable sim entirely on touch-only devices (phones/tablets)
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var MODES = ['life', 'boids', 'off'];
  var modeIdx = Math.max(0, MODES.indexOf(localStorage.getItem('bgMode') || 'life'));
  var speedLevel = parseInt(localStorage.getItem('bgSpeed') || '2');
  var W, H;

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function updateBtn() {
    var btn = document.getElementById('bg-mode-btn');
    if (btn) btn.textContent = '[' + MODES[modeIdx] + ']';
    canvas.style.display = MODES[modeIdx] === 'off' ? 'none' : '';
  }

  function initMode(mode) {
    if (mode === 'boids') initBoids();
    if (mode === 'life')  initLife();
  }

  function cycleMode() {
    modeIdx = (modeIdx + 1) % MODES.length;
    localStorage.setItem('bgMode', MODES[modeIdx]);
    updateBtn();
    initMode(MODES[modeIdx]);
  }

  var modeBtn = document.getElementById('bg-mode-btn');
  if (modeBtn) modeBtn.addEventListener('click', cycleMode);

  var speedSlider = document.getElementById('speed-slider');
  if (speedSlider) {
    speedSlider.value = speedLevel;
    speedSlider.addEventListener('input', function () {
      speedLevel = parseInt(this.value);
      localStorage.setItem('bgSpeed', speedLevel);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      cycleMode();
    }
  });

  // ===== BOIDS ==============================================
  // Three classic steering rules + spread force.
  // Each boid is a filled triangle pointing in its velocity direction.

  var N          = 200;
  var MAX_SPEED  = 1.6,  MIN_SPEED  = 0.55;
  var PERCEPTION = 80,   SEP_DIST   = 44;
  var SEP_W      = 0.18, ALI_W      = 0.04, COH_W = 0.009;
  var MAX_FORCE  = 0.13;
  var MARGIN     = 100,  TURN       = 0.20;
  var SPREAD_R   = 230,  SPREAD_W   = 0.034;
  var BOID_LEN   = 11;   // tip-to-base length (px)
  var BOID_HALF  = 4.5;  // half-width at base (px)

  var boids = [];

  function clamp2(vx, vy, max) {
    var m2 = vx*vx + vy*vy;
    if (m2 > max*max) { var sc = max/Math.sqrt(m2); return [vx*sc, vy*sc]; }
    return [vx, vy];
  }

  function initBoids() {
    boids = [];
    for (var i = 0; i < N; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      boids.push({ x: Math.random()*W, y: Math.random()*H,
                   vx: Math.cos(a)*s,  vy: Math.sin(a)*s });
    }
  }

  function updateBoids() {
    var P2 = PERCEPTION*PERCEPTION, S2 = SEP_DIST*SEP_DIST, SP2 = SPREAD_R*SPREAD_R;
    var i, j, b, o, dx, dy, d2, d, spd, tmp;

    for (i = 0; i < N; i++) {
      b = boids[i];
      var fx=0, fy=0, sx=0, sy=0, ax=0, ay=0, cx=0, cy=0;
      var sc=0, ac=0, cc=0, rpx=0, rpy=0, rpc=0;

      for (j = 0; j < N; j++) {
        if (i === j) continue;
        o  = boids[j];
        dx = o.x - b.x; dy = o.y - b.y;
        d2 = dx*dx + dy*dy;

        if (d2 > S2 && d2 < SP2 && d2 > 0) {
          d = Math.sqrt(d2);
          rpx -= dx/d; rpy -= dy/d; rpc++;
        }

        if (d2 < P2) {
          cx += o.x; cy += o.y; cc++;
          ax += o.vx; ay += o.vy; ac++;
          if (d2 < S2 && d2 > 0) {
            d = Math.sqrt(d2);
            sx -= dx/d; sy -= dy/d; sc++;
          }
        }
      }

      if (sc  > 0) { tmp = clamp2(sx/sc*SEP_W,  sy/sc*SEP_W,  MAX_FORCE); fx += tmp[0]; fy += tmp[1]; }
      if (ac  > 0) {
        tmp = clamp2(ax/ac, ay/ac, MAX_SPEED);
        tmp = clamp2((tmp[0]-b.vx)*ALI_W, (tmp[1]-b.vy)*ALI_W, MAX_FORCE);
        fx += tmp[0]; fy += tmp[1];
      }
      if (cc  > 0) { tmp = clamp2((cx/cc-b.x)*COH_W, (cy/cc-b.y)*COH_W, MAX_FORCE); fx += tmp[0]; fy += tmp[1]; }
      if (rpc > 0) { tmp = clamp2(rpx/rpc*SPREAD_W, rpy/rpc*SPREAD_W, MAX_FORCE); fx += tmp[0]; fy += tmp[1]; }

      if (b.x < MARGIN)   fx += TURN*(1-b.x/MARGIN);
      if (b.x > W-MARGIN) fx -= TURN*(1-(W-b.x)/MARGIN);
      if (b.y < MARGIN)   fy += TURN*(1-b.y/MARGIN);
      if (b.y > H-MARGIN) fy -= TURN*(1-(H-b.y)/MARGIN);

      b.vx += fx; b.vy += fy;
      spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (spd > MAX_SPEED) { b.vx = b.vx/spd*MAX_SPEED; b.vy = b.vy/spd*MAX_SPEED; }
      else if (spd < MIN_SPEED && spd > 1e-4) { b.vx = b.vx/spd*MIN_SPEED; b.vy = b.vy/spd*MIN_SPEED; }

      var sp = lifeCurrentSpeed / 5;
      b.x += b.vx * sp; b.y += b.vy * sp;
      if (b.x < -20) b.x = W+20; else if (b.x > W+20) b.x = -20;
      if (b.y < -20) b.y = H+20; else if (b.y > H+20) b.y = -20;
    }
  }

  function drawBoids() {
    var dark = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dark ? 'rgba(169,177,214,0.10)' : 'rgba(52,59,88,0.11)';
    for (var i = 0; i < N; i++) {
      var b   = boids[i];
      var spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (spd < 1e-4) continue;
      var nx = b.vx/spd, ny = b.vy/spd;  // forward unit vector
      var px = -ny,      py = nx;          // perpendicular unit vector
      ctx.beginPath();
      ctx.moveTo(b.x + nx*BOID_LEN*0.65,                b.y + ny*BOID_LEN*0.65);
      ctx.lineTo(b.x - nx*BOID_LEN*0.35 + px*BOID_HALF, b.y - ny*BOID_LEN*0.35 + py*BOID_HALF);
      ctx.lineTo(b.x - nx*BOID_LEN*0.35 - px*BOID_HALF, b.y - ny*BOID_LEN*0.35 - py*BOID_HALF);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ===== CONWAY'S GAME OF LIFE ==============================
  // Toroidal wrapping grid. Seeded with 25% random density so
  // patterns fill the full screen naturally from the start.
  // Auto-fertilises with fresh random cells if population falls
  // too low, keeping the simulation continuously alive.

  var CELL = 9;
  var GW, GH;
  var grid, next;
  var lifeFrame = 0;
  var liveCount = 0;
  var lifeCurrentSpeed = 5; // smoothly lerped toward speedLevel

  function initLife() {
    GW        = Math.ceil(W / CELL);
    GH        = Math.ceil(H / CELL);
    grid      = new Uint8Array(GW * GH);
    next      = new Uint8Array(GW * GH);
    liveCount = 0;
    lifeFrame = 0;
    // Seed 5–8 clusters scattered around the screen
    var numClusters = 5 + Math.floor(Math.random() * 4);
    for (var i = 0; i < numClusters; i++) {
      var cx = Math.floor(Math.random() * GW);
      var cy = Math.floor(Math.random() * GH);
      var rx = Math.floor(GW * (0.10 + Math.random() * 0.13));
      var ry = Math.floor(GH * (0.10 + Math.random() * 0.13));
      var x0 = Math.max(0, cx - rx), x1 = Math.min(GW, cx + rx);
      var y0 = Math.max(0, cy - ry), y1 = Math.min(GH, cy + ry);
      for (var yy = y0; yy < y1; yy++)
        for (var xx = x0; xx < x1; xx++)
          if (Math.random() < 0.30) { grid[yy*GW + xx] = 1; liveCount++; }
    }
  }

  function stepLife() {
    liveCount = 0;
    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        var n = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            n += grid[((y+dy+GH)%GH)*GW + ((x+dx+GW)%GW)];
          }
        }
        var alive = grid[y*GW + x];
        next[y*GW + x] = alive ? (n===2||n===3 ? 1:0) : (n===3 ? 1:0);
        if (next[y*GW + x]) liveCount++;
      }
    }
    var tmp = grid; grid = next; next = tmp;
    // auto-fertilise: drop a small cluster if population falls too low
    if (liveCount < GW * GH * 0.008) {
      var fcx = Math.floor(Math.random() * GW);
      var fcy = Math.floor(Math.random() * GH);
      var frx = Math.floor(GW * 0.07), fry = Math.floor(GH * 0.07);
      var fx0 = Math.max(0, fcx - frx), fx1 = Math.min(GW, fcx + frx);
      var fy0 = Math.max(0, fcy - fry), fy1 = Math.min(GH, fcy + fry);
      for (var fy = fy0; fy < fy1; fy++)
        for (var fx = fx0; fx < fx1; fx++)
          if (Math.random() < 0.25) grid[fy*GW + fx] = 1;
    }
  }

  function drawLife() {
    var dark = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dark ? 'rgba(169,177,214,0.13)' : 'rgba(52,59,88,0.14)';
    for (var y = 0; y < GH; y++) {
      for (var x = 0; x < GW; x++) {
        if (grid[y*GW + x]) ctx.fillRect(x*CELL+1, y*CELL+1, CELL-2, CELL-2);
      }
    }
  }

  // ===== RESIZE / LOOP ======================================

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initMode(MODES[modeIdx]);
  }

  function loop() {
    // Smoothly lerp toward target speed for fluid slider feel
    lifeCurrentSpeed += (speedLevel - lifeCurrentSpeed) * 0.07;

    var mode = MODES[modeIdx];
    if (mode === 'life') {
      lifeFrame++;
      // speedLevel 1→slowest (every 18 frames), 10→fast (every 1)
      var lifeSpeed = Math.max(1, Math.round(18 * Math.pow(1/18, (lifeCurrentSpeed - 1) / 9)));
      if (lifeFrame % lifeSpeed === 0) stepLife();
      drawLife();
    } else if (mode === 'boids') {
      updateBoids();
      drawBoids();
    } else {
      ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(loop);
  }

  resize();
  updateBtn();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
})();
// ================================================================
// END BG EFFECT
// ================================================================
