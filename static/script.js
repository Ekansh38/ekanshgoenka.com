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
    ctx.clearRect(0, 0, W, H);
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
  // Three classic steering rules. Fewer boids (120) for cleaner
  // flocking shapes. Soft trail via partial-fade instead of clearRect.
  // Each boid is a concave arrow pointing in its velocity direction.

  var N          = 120;
  var MAX_SPEED  = 1.8,  MIN_SPEED  = 0.6;
  var PERCEPTION = 85,   SEP_DIST   = 40;
  var SEP_W      = 0.15, ALI_W      = 0.06, COH_W = 0.015;
  var MAX_FORCE  = 0.12;
  var MARGIN     = 100,  TURN       = 0.22;
  var SPREAD_R   = 200,  SPREAD_W   = 0.03;
  var BOID_LEN   = 14;
  var BOID_HALF  = 5.5;

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

      var sp = 0.5 + (lifeCurrentSpeed - 1) * (1.5 / 9);
      b.x += b.vx * sp; b.y += b.vy * sp;
      if (b.x < -20) b.x = W+20; else if (b.x > W+20) b.x = -20;
      if (b.y < -20) b.y = H+20; else if (b.y > H+20) b.y = -20;
    }
  }

  function isHome() { return window.location.pathname === '/'; }

  function drawBoids() {
    var dark = isDark();
    var sub  = isHome();
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = dark
      ? (sub ? 'rgba(169,177,214,0.18)' : 'rgba(169,177,214,0.04)')
      : (sub ? 'rgba(52,59,88,0.15)'    : 'rgba(52,59,88,0.03)');
    for (var i = 0; i < N; i++) {
      var b   = boids[i];
      var spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (spd < 1e-4) continue;
      var nx = b.vx/spd, ny = b.vy/spd;  // forward unit vector
      var px = -ny,      py = nx;          // perpendicular unit vector
      // Concave arrow shape (tip → left wing → notch → right wing)
      ctx.beginPath();
      ctx.moveTo(b.x + nx*BOID_LEN*0.65,                  b.y + ny*BOID_LEN*0.65);
      ctx.lineTo(b.x - nx*BOID_LEN*0.35 + px*BOID_HALF,   b.y - ny*BOID_LEN*0.35 + py*BOID_HALF);
      ctx.lineTo(b.x - nx*BOID_LEN*0.10,                  b.y - ny*BOID_LEN*0.10);
      ctx.lineTo(b.x - nx*BOID_LEN*0.35 - px*BOID_HALF,   b.y - ny*BOID_LEN*0.35 - py*BOID_HALF);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ===== CONWAY'S GAME OF LIFE ==============================
  // Toroidal wrapping grid. Seeded with known long-lived patterns
  // (R-pentomino, Acorn, gliders, oscillators) plus a sparse random
  // base. Auto-fertilises by dropping structured patterns, not blobs.

  var CELL = 7;
  var GW, GH;
  var grid, next;
  var lifeFrame = 0;
  var liveCount = 0;
  var lifeCurrentSpeed = 5;

  // Known patterns as [dx, dy] offsets from placement origin
  var PAT_GLIDER_SE = [[1,0],[2,1],[0,2],[1,2],[2,2]];            // moves SE
  var PAT_GLIDER_SW = [[1,0],[0,1],[2,1],[0,2],[1,2]];            // moves SW
  var PAT_GLIDER_NE = [[0,0],[1,0],[2,0],[2,1],[1,2]];            // moves NE
  var PAT_GLIDER_NW = [[0,0],[1,0],[2,0],[0,1],[1,2]];            // moves NW
  var PAT_RPENTO    = [[1,0],[2,0],[0,1],[1,1],[1,2]];            // ~1103 gen chaos
  var PAT_ACORN     = [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]];// ~5206 gen chaos
  var PAT_DIEHARD   = [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]];// 130 gens
  var PAT_BLINKER   = [[0,0],[1,0],[2,0]];                        // period-2
  var PAT_TOAD      = [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]];      // period-2
  var PAT_BEACON    = [[0,0],[1,0],[0,1],[3,2],[2,3],[3,3]];      // period-2

  function placePattern(cx, cy, cells) {
    for (var i = 0; i < cells.length; i++) {
      var x = ((cx + cells[i][0]) % GW + GW) % GW;
      var y = ((cy + cells[i][1]) % GH + GH) % GH;
      if (!grid[y * GW + x]) { grid[y * GW + x] = 1; liveCount++; }
    }
  }

  function initLife() {
    GW        = Math.ceil(W / CELL);
    GH        = Math.ceil(H / CELL);
    grid      = new Uint8Array(GW * GH);
    next      = new Uint8Array(GW * GH);
    liveCount = 0;
    lifeFrame = 0;

    // Sparse random base (~12%) — enough for organic interaction without dying
    for (var i = 0; i < GW * GH; i++) {
      if (Math.random() < 0.12) { grid[i] = 1; liveCount++; }
    }

    // Scatter gliders in all four directions
    var gliders = [PAT_GLIDER_SE, PAT_GLIDER_SW, PAT_GLIDER_NE, PAT_GLIDER_NW];
    for (var k = 0; k < 16; k++) {
      placePattern(Math.floor(Math.random() * GW), Math.floor(Math.random() * GH), gliders[k % 4]);
    }
    // Long-lived chaos seeds that produce gliders and complex structures
    for (var k = 0; k < 10; k++) {
      placePattern(Math.floor(Math.random() * GW), Math.floor(Math.random() * GH), PAT_RPENTO);
    }
    for (var k = 0; k < 5; k++) {
      placePattern(Math.floor(Math.random() * GW), Math.floor(Math.random() * GH), PAT_ACORN);
    }
    for (var k = 0; k < 4; k++) {
      placePattern(Math.floor(Math.random() * GW), Math.floor(Math.random() * GH), PAT_DIEHARD);
    }
    // Quick oscillators for immediate visual interest
    var oscs = [PAT_BLINKER, PAT_TOAD, PAT_BEACON];
    for (var k = 0; k < 24; k++) {
      placePattern(Math.floor(Math.random() * GW), Math.floor(Math.random() * GH), oscs[k % 3]);
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
    // Auto-fertilise: drop a structured pattern (not a random blob)
    if (liveCount < GW * GH * 0.015) {
      var cx = Math.floor(Math.random() * GW);
      var cy = Math.floor(Math.random() * GH);
      placePattern(cx, cy, Math.random() < 0.5 ? PAT_RPENTO : PAT_ACORN);
    }
  }

  function drawLife() {
    var dark = isDark();
    var sub  = isHome();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dark
      ? (sub ? 'rgba(169,177,214,0.10)' : 'rgba(169,177,214,0.025)')
      : (sub ? 'rgba(52,59,88,0.09)'    : 'rgba(52,59,88,0.02)');
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
      // speedLevel 1→slowest (every 4 frames = 25% of max), 10→fast (every 1 frame)
      var lifeSpeed = Math.max(1, Math.round(4 * Math.pow(1/4, (lifeCurrentSpeed - 1) / 9)));
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
