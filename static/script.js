function toggleTheme() {
  const h = document.documentElement;
  const t = document.getElementById('t');
  const dark = h.getAttribute('data-theme') === 'dark';
  const next = dark ? 'light' : 'dark';
  h.setAttribute('data-theme', next);
  t.textContent = dark ? '[dark]' : '[light]';
  localStorage.setItem('theme', next);
}

(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', function () {
    const t = document.getElementById('t');
    if (t) t.textContent = saved === 'dark' ? '[light]' : '[dark]';
  });
})();

// ================================================================
// BG EFFECT — switchable background simulation
// Modes: boids (flocking) → life (Conway's Game of Life) → off
// Click [boids] button or press 'b' to cycle modes.
// To remove: delete this section, the BG EFFECT block in style.css,
//            <canvas id="bg-canvas"> and #bg-mode-btn from templates.
// ================================================================
(function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var MODES = ['boids', 'life', 'off'];
  var modeIdx = Math.max(0, MODES.indexOf(localStorage.getItem('bgMode') || 'boids'));
  var W, H;

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function updateBtn() {
    var btn = document.getElementById('bg-mode-btn');
    if (btn) btn.textContent = '[' + MODES[modeIdx] + ']';
    canvas.style.display = MODES[modeIdx] === 'off' ? 'none' : '';
  }

  function cycleMode() {
    modeIdx = (modeIdx + 1) % MODES.length;
    localStorage.setItem('bgMode', MODES[modeIdx]);
    updateBtn();
    if (MODES[modeIdx] === 'boids') initBoids();
    if (MODES[modeIdx] === 'life')  initLife();
  }

  var modeBtn = document.getElementById('bg-mode-btn');
  if (modeBtn) modeBtn.addEventListener('click', cycleMode);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      cycleMode();
    }
  });

  // ===== BOIDS ==============================================
  // Three classic steering rules + a medium-range spread force
  // that repels boids outside their personal-space zone,
  // pushing them to fill the canvas more evenly.

  var N          = 110;
  var MAX_SPEED  = 1.6,  MIN_SPEED  = 0.55;
  var PERCEPTION = 75,   SEP_DIST   = 22;
  var SEP_W      = 0.09, ALI_W      = 0.05, COH_W = 0.028;
  var MAX_FORCE  = 0.13;
  var MARGIN     = 100,  TURN       = 0.20;
  var DASH_LEN   = 3.2;
  var SPREAD_R   = 160,  SPREAD_W   = 0.016; // spread repulsion radius / weight

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

        // spread repulsion: medium range, outside personal space
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

      if (sc > 0) { tmp = clamp2(sx/sc*SEP_W,  sy/sc*SEP_W,  MAX_FORCE); fx += tmp[0]; fy += tmp[1]; }
      if (ac > 0) {
        tmp = clamp2(ax/ac, ay/ac, MAX_SPEED);
        tmp = clamp2((tmp[0]-b.vx)*ALI_W, (tmp[1]-b.vy)*ALI_W, MAX_FORCE);
        fx += tmp[0]; fy += tmp[1];
      }
      if (cc > 0) { tmp = clamp2((cx/cc-b.x)*COH_W, (cy/cc-b.y)*COH_W, MAX_FORCE); fx += tmp[0]; fy += tmp[1]; }
      if (rpc > 0) { tmp = clamp2(rpx/rpc*SPREAD_W, rpy/rpc*SPREAD_W, MAX_FORCE); fx += tmp[0]; fy += tmp[1]; }

      if (b.x < MARGIN)   fx += TURN*(1-b.x/MARGIN);
      if (b.x > W-MARGIN) fx -= TURN*(1-(W-b.x)/MARGIN);
      if (b.y < MARGIN)   fy += TURN*(1-b.y/MARGIN);
      if (b.y > H-MARGIN) fy -= TURN*(1-(H-b.y)/MARGIN);

      b.vx += fx; b.vy += fy;
      spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (spd > MAX_SPEED) { b.vx = b.vx/spd*MAX_SPEED; b.vy = b.vy/spd*MAX_SPEED; }
      else if (spd < MIN_SPEED && spd > 1e-4) { b.vx = b.vx/spd*MIN_SPEED; b.vy = b.vy/spd*MIN_SPEED; }

      b.x += b.vx; b.y += b.vy;
      if (b.x < -20) b.x = W+20; else if (b.x > W+20) b.x = -20;
      if (b.y < -20) b.y = H+20; else if (b.y > H+20) b.y = -20;
    }
  }

  function drawBoids() {
    var dark = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = dark ? 'rgba(169,177,214,0.07)' : 'rgba(52,59,88,0.09)';
    ctx.lineWidth = 1.1;
    ctx.lineCap   = 'round';
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var b   = boids[i];
      var spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (spd < 1e-4) continue;
      var nx  = b.vx/spd * DASH_LEN;
      var ny  = b.vy/spd * DASH_LEN;
      ctx.moveTo(b.x+nx, b.y+ny);
      ctx.lineTo(b.x-nx, b.y-ny);
    }
    ctx.stroke();
  }

  // ===== CONWAY'S GAME OF LIFE ==============================
  // Toroidal (wrapping) grid. Seeded with two Gosper Glider Guns
  // firing in opposite horizontal directions + sparse random noise.
  // The guns continuously emit gliders; on a wrapping grid the
  // streams collide and create complex, long-running patterns.

  var CELL = 7;              // px per cell
  var GW, GH;                // grid dimensions in cells
  var grid, next;
  var lifeFrame = 0, LIFE_SPEED = 4; // step every N animation frames

  // Gosper Glider Gun — [col, row] cell coordinates (0-indexed)
  var GOSPER = [
    [24,0],
    [22,1],[24,1],
    [12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
    [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],
    [0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
    [0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],
    [10,6],[16,6],[24,6],
    [11,7],[15,7],
    [12,8],[13,8]
  ];

  function placePattern(pat, ox, oy) {
    pat.forEach(function (c) {
      var gx = ((c[0]+ox) % GW + GW) % GW;
      var gy = ((c[1]+oy) % GH + GH) % GH;
      grid[gy*GW + gx] = 1;
    });
  }

  function initLife() {
    GW   = Math.ceil(W / CELL);
    GH   = Math.ceil(H / CELL);
    grid = new Uint8Array(GW * GH);
    next = new Uint8Array(GW * GH);

    // Gun 1: near top-left, fires gliders eastward
    placePattern(GOSPER, 4, 4);

    // Gun 2: near center-right, horizontally mirrored — fires westward
    var mirror = GOSPER.map(function (c) { return [35 - c[0], c[1]]; });
    placePattern(mirror, Math.floor(GW * 0.55), Math.floor(GH * 0.45));

    // Sparse random seed adds variety and ensures long-running activity
    for (var i = 0, total = Math.floor(GW * GH * 0.025); i < total; i++) {
      grid[Math.floor(Math.random() * GW * GH)] = 1;
    }

    lifeFrame = 0;
  }

  function stepLife() {
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
      }
    }
    var tmp = grid; grid = next; next = tmp;
  }

  function drawLife() {
    var dark = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dark ? 'rgba(169,177,214,0.10)' : 'rgba(52,59,88,0.12)';
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
    var mode = MODES[modeIdx];
    if (mode === 'boids') initBoids();
    if (mode === 'life')  initLife();
  }

  function loop() {
    var mode = MODES[modeIdx];
    if (mode === 'boids') {
      updateBoids();
      drawBoids();
    } else if (mode === 'life') {
      lifeFrame++;
      if (lifeFrame % LIFE_SPEED === 0) stepLife();
      drawLife();
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
