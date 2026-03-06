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
// Modes: boids → life → langton → slime → particles → rdiff → off
// Click the mode button or press 'b' to cycle modes.
// To remove: delete this section, the BG EFFECT block in style.css,
//            <canvas id="bg-canvas"> and #bg-mode-btn from templates.
// ================================================================
(function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var MODES = ['boids', 'life', 'langton', 'slime', 'particles', 'rdiff', 'off'];
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

  function initMode(mode) {
    if (mode === 'boids')     initBoids();
    if (mode === 'life')      initLife();
    if (mode === 'langton')   initLangton();
    if (mode === 'slime')     initSlime();
    if (mode === 'particles') initParticles();
    if (mode === 'rdiff')     initRD();
  }

  function cycleMode() {
    modeIdx = (modeIdx + 1) % MODES.length;
    localStorage.setItem('bgMode', MODES[modeIdx]);
    updateBtn();
    initMode(MODES[modeIdx]);
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

      b.x += b.vx; b.y += b.vy;
      if (b.x < -20) b.x = W+20; else if (b.x > W+20) b.x = -20;
      if (b.y < -20) b.y = H+20; else if (b.y > H+20) b.y = -20;
    }
  }

  function drawBoids() {
    var dark = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dark ? 'rgba(169,177,214,0.13)' : 'rgba(52,59,88,0.15)';
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
  // Toroidal (wrapping) grid. Seeded with two Gosper Glider Guns
  // firing in opposite horizontal directions + sparse random noise.
  // The guns continuously emit gliders; on a wrapping grid the
  // streams collide and create complex, long-running patterns.

  var CELL = 7;
  var GW, GH;
  var grid, next;
  var lifeFrame = 0, LIFE_SPEED = 4;
  var lifeStep = 0, INJECT_EVERY = 180;

  var CHAOS_PATS = [
    [[1,0],[2,0],[0,1],[1,1],[1,2]],
    [[0,0],[1,0],[1,2],[3,1],[4,0],[5,0],[6,0]],
    [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]],
    [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]],
    [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3],[1,4]],
  ];

  function injectChaos() {
    var pat = CHAOS_PATS[Math.floor(Math.random() * CHAOS_PATS.length)];
    var ox = 5 + Math.floor(Math.random() * (GW - 15));
    var oy = 5 + Math.floor(Math.random() * (GH - 15));
    pat.forEach(function (c) {
      var gx = (c[0] + ox + GW) % GW;
      var gy = (c[1] + oy + GH) % GH;
      grid[gy * GW + gx] = 1;
    });
  }

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
    placePattern(GOSPER, 4, 4);
    var mirror = GOSPER.map(function (c) { return [35 - c[0], c[1]]; });
    placePattern(mirror, Math.floor(GW * 0.55), Math.floor(GH * 0.45));
    for (var i = 0, total = Math.floor(GW * GH * 0.025); i < total; i++) {
      grid[Math.floor(Math.random() * GW * GH)] = 1;
    }
    lifeFrame = 0;
    lifeStep  = 0;
  }

  function stepLife() {
    lifeStep++;
    if (lifeStep % INJECT_EVERY === 0) injectChaos();
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

  // ===== LANGTON'S ANT ======================================
  // Multiple ants on a toroidal grid.
  // White cell → turn right, flip to black, move forward.
  // Black cell → turn left, flip to white, move forward.
  // Starts chaotic, then each ant spontaneously builds a highway.

  var ANT_CELL  = 4;    // px per grid cell
  var ANT_COUNT = 6;    // number of ants
  var ANT_STEPS = 90;   // ant steps per animation frame
  var antGW, antGH;
  var antGrid;
  var antAgents;
  // Directions: 0=N 1=E 2=S 3=W
  var ANT_DX = [0, 1, 0, -1];
  var ANT_DY = [-1, 0, 1, 0];
  var antOffscreen = null;

  function initLangton() {
    antGW     = Math.floor(W / ANT_CELL);
    antGH     = Math.floor(H / ANT_CELL);
    antGrid   = new Uint8Array(antGW * antGH);
    antAgents = [];
    for (var i = 0; i < ANT_COUNT; i++) {
      antAgents.push({
        x:   Math.floor(antGW/2 + (Math.random()-0.5) * antGW * 0.4),
        y:   Math.floor(antGH/2 + (Math.random()-0.5) * antGH * 0.4),
        dir: Math.floor(Math.random() * 4)
      });
    }
    antOffscreen = document.createElement('canvas');
    antOffscreen.width  = antGW;
    antOffscreen.height = antGH;
  }

  function stepLangton() {
    for (var i = 0; i < antAgents.length; i++) {
      var ant  = antAgents[i];
      var idx  = ant.y * antGW + ant.x;
      var cell = antGrid[idx];
      ant.dir      = cell === 0 ? (ant.dir + 1) % 4 : (ant.dir + 3) % 4;
      antGrid[idx] = 1 - cell;
      ant.x = (ant.x + ANT_DX[ant.dir] + antGW) % antGW;
      ant.y = (ant.y + ANT_DY[ant.dir] + antGH) % antGH;
    }
  }

  function drawLangton() {
    if (!antOffscreen) return;
    var dark   = isDark();
    var offCtx = antOffscreen.getContext('2d');
    var imgData = offCtx.createImageData(antGW, antGH);
    var data   = imgData.data;
    var r = dark ? 169 : 52,
        g = dark ? 177 : 59,
        b = dark ? 214 : 88,
        a = dark ?  26  : 31;  // ~10-12% opacity
    for (var i = 0; i < antGW * antGH; i++) {
      if (antGrid[i]) {
        data[i*4]   = r;
        data[i*4+1] = g;
        data[i*4+2] = b;
        data[i*4+3] = a;
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(antOffscreen, 0, 0, W, H);
  }

  // ===== SLIME MOLD (PHYSARUM POLYCEPHALUM) =================
  // Agents sense chemical trail at three forward angles and steer
  // toward the strongest signal. Trail diffuses and decays each step.
  // Self-organises into branching vein-like networks over ~5-10 s.

  var SLIME_SCALE   = 3;            // trail map downsample factor
  var SLIME_N       = 4000;         // agent count
  var SLIME_SPEED   = 1.0;
  var SLIME_SA      = Math.PI / 4;  // sensor angle offset (45°)
  var SLIME_SD      = 9;            // sensor distance (trail cells)
  var SLIME_RA      = Math.PI / 4;  // rotation step per decision (45°)
  var SLIME_DEPOSIT = 5;
  var SLIME_DECAY   = 0.97;
  var slimeW, slimeH;
  var slimeTrail, slimeTemp;
  var slimeAgents;
  var slimeOffscreen = null;

  function initSlime() {
    slimeW = Math.floor(W / SLIME_SCALE);
    slimeH = Math.floor(H / SLIME_SCALE);
    slimeTrail = new Float32Array(slimeW * slimeH);
    slimeTemp  = new Float32Array(slimeW * slimeH);
    slimeAgents = [];
    var cx = slimeW / 2, cy = slimeH / 2;
    var r  = Math.min(slimeW, slimeH) * 0.25;
    for (var i = 0; i < SLIME_N; i++) {
      var angle = Math.random() * Math.PI * 2;
      var rad   = r * Math.sqrt(Math.random());  // uniform in circle
      slimeAgents.push({
        x:     cx + Math.cos(angle) * rad,
        y:     cy + Math.sin(angle) * rad,
        angle: angle + Math.PI  // face inward initially
      });
    }
    slimeOffscreen = document.createElement('canvas');
    slimeOffscreen.width  = slimeW;
    slimeOffscreen.height = slimeH;
  }

  function slimeSense(ax, ay, angle) {
    var sx = ax + Math.cos(angle) * SLIME_SD;
    var sy = ay + Math.sin(angle) * SLIME_SD;
    var ix = (sx + 0.5) | 0, iy = (sy + 0.5) | 0;
    if (ix < 0 || ix >= slimeW || iy < 0 || iy >= slimeH) return 0;
    return slimeTrail[iy * slimeW + ix];
  }

  function stepSlime() {
    var i, a, fwd, left, right, nx, ny, ix, iy, ti;
    for (i = 0; i < SLIME_N; i++) {
      a     = slimeAgents[i];
      fwd   = slimeSense(a.x, a.y, a.angle);
      left  = slimeSense(a.x, a.y, a.angle - SLIME_SA);
      right = slimeSense(a.x, a.y, a.angle + SLIME_SA);

      if (fwd > left && fwd > right) {
        // keep heading
      } else if (fwd < left && fwd < right) {
        a.angle += Math.random() < 0.5 ? SLIME_RA : -SLIME_RA;
      } else if (left > right) {
        a.angle -= SLIME_RA;
      } else {
        a.angle += SLIME_RA;
      }

      nx = a.x + Math.cos(a.angle) * SLIME_SPEED;
      ny = a.y + Math.sin(a.angle) * SLIME_SPEED;
      if (nx < 0 || nx >= slimeW) { a.angle = Math.PI - a.angle; nx = nx < 0 ? 0 : slimeW - 1; }
      if (ny < 0 || ny >= slimeH) { a.angle = -a.angle;          ny = ny < 0 ? 0 : slimeH - 1; }
      a.x = nx; a.y = ny;

      ix = (nx + 0.5) | 0; iy = (ny + 0.5) | 0;
      if (ix >= 0 && ix < slimeW && iy >= 0 && iy < slimeH) {
        ti = iy * slimeW + ix;
        slimeTrail[ti] += SLIME_DEPOSIT;
        if (slimeTrail[ti] > 100) slimeTrail[ti] = 100;
      }
    }

    // 3×3 box-blur diffusion + decay
    var x, y, xm, xp, ym, yp, sum;
    for (y = 0; y < slimeH; y++) {
      ym = y > 0 ? y-1 : 0; yp = y < slimeH-1 ? y+1 : slimeH-1;
      for (x = 0; x < slimeW; x++) {
        xm = x > 0 ? x-1 : 0; xp = x < slimeW-1 ? x+1 : slimeW-1;
        sum  = slimeTrail[ym*slimeW+xm] + slimeTrail[ym*slimeW+x] + slimeTrail[ym*slimeW+xp];
        sum += slimeTrail[y *slimeW+xm] + slimeTrail[y *slimeW+x] + slimeTrail[y *slimeW+xp];
        sum += slimeTrail[yp*slimeW+xm] + slimeTrail[yp*slimeW+x] + slimeTrail[yp*slimeW+xp];
        slimeTemp[y * slimeW + x] = (sum / 9) * SLIME_DECAY;
      }
    }
    var tmp = slimeTrail; slimeTrail = slimeTemp; slimeTemp = tmp;
  }

  function drawSlime() {
    if (!slimeOffscreen) return;
    var dark   = isDark();
    var offCtx = slimeOffscreen.getContext('2d');
    var imgData = offCtx.createImageData(slimeW, slimeH);
    var data   = imgData.data;
    var r = dark ? 169 : 52,
        g = dark ? 177 : 59,
        b = dark ? 214 : 88;
    for (var i = 0; i < slimeW * slimeH; i++) {
      var val = slimeTrail[i];
      if (val > 0.5) {
        data[i*4]   = r;
        data[i*4+1] = g;
        data[i*4+2] = b;
        data[i*4+3] = (Math.min(val / 40, 1) * 38) | 0;  // max ~15% opacity
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(slimeOffscreen, 0, 0, W, H);
  }

  // ===== PARTICLE LIFE ======================================
  // Five species of particles with random inter-species
  // attraction/repulsion rules. Produces clusters, orbits,
  // and flowing organic structures.

  var PL_SPECIES = 5;
  var PL_PER     = 80;   // particles per species
  var PL_N       = PL_SPECIES * PL_PER;
  var PL_R       = 100;  // interaction radius (px)
  var PL_FRICT   = 0.87;
  var PL_FSCALE  = 0.40;
  var plParticles, plRules;

  // Tokyo Night species colours
  var PL_COLORS_DARK = [
    'rgba(247,118,142,0.18)',
    'rgba(224,175,104,0.18)',
    'rgba(158,206,106,0.18)',
    'rgba(122,162,247,0.18)',
    'rgba(187,154,247,0.18)',
  ];
  var PL_COLORS_LIGHT = [
    'rgba(180,40,70,0.18)',
    'rgba(150,100,20,0.18)',
    'rgba(60,120,30,0.18)',
    'rgba(52,59,143,0.18)',
    'rgba(120,60,180,0.18)',
  ];

  function initParticles() {
    plRules = [];
    for (var s = 0; s < PL_SPECIES; s++) {
      plRules.push([]);
      for (var t = 0; t < PL_SPECIES; t++) {
        plRules[s].push(Math.random() * 2 - 1);  // -1 (repel) .. +1 (attract)
      }
    }
    plParticles = [];
    for (var i = 0; i < PL_N; i++) {
      plParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: 0, vy: 0,
        s: Math.floor(i / PL_PER)
      });
    }
  }

  function updateParticles() {
    var R2 = PL_R * PL_R;
    for (var i = 0; i < PL_N; i++) {
      var p  = plParticles[i];
      var fx = 0, fy = 0;
      for (var j = 0; j < PL_N; j++) {
        if (i === j) continue;
        var q  = plParticles[j];
        var dx = q.x - p.x, dy = q.y - p.y;
        var d2 = dx*dx + dy*dy;
        if (d2 > 0 && d2 < R2) {
          var d = Math.sqrt(d2);
          var f = plRules[p.s][q.s] * PL_FSCALE / d;
          fx += dx * f;
          fy += dy * f;
        }
      }
      p.vx = (p.vx + fx) * PL_FRICT;
      p.vy = (p.vy + fy) * PL_FRICT;
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x += W; else if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H; else if (p.y > H) p.y -= H;
    }
  }

  function drawParticles() {
    var dark   = isDark();
    var colors = dark ? PL_COLORS_DARK : PL_COLORS_LIGHT;
    ctx.clearRect(0, 0, W, H);
    for (var s = 0; s < PL_SPECIES; s++) {
      ctx.fillStyle = colors[s];
      ctx.beginPath();
      var base = s * PL_PER;
      for (var i = base; i < base + PL_PER; i++) {
        var p = plParticles[i];
        ctx.moveTo(p.x + 3, p.y);  // moveTo before arc avoids connecting lines
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  // ===== REACTION-DIFFUSION (GRAY-SCOTT) ====================
  // Two chemicals U and V interact:
  //   dU/dt = Du∇²U − UV² + f(1−U)
  //   dV/dt = Dv∇²V + UV² − (f+k)V
  // Parameters: coral/fingerprint pattern (f=0.0545, k=0.0620).
  // Run multiple steps per frame so patterns emerge quickly.

  var RD_SCALE = 4;
  var RD_DU    = 0.2097, RD_DV = 0.1050;
  var RD_F     = 0.0545, RD_K  = 0.0620;
  var RD_STEPS = 5;  // simulation steps per animation frame
  var rdW, rdH;
  var rdU, rdV, rdUn, rdVn;
  var rdOffscreen = null;

  function initRD() {
    rdW  = Math.floor(W / RD_SCALE);
    rdH  = Math.floor(H / RD_SCALE);
    rdU  = new Float32Array(rdW * rdH);
    rdV  = new Float32Array(rdW * rdH);
    rdUn = new Float32Array(rdW * rdH);
    rdVn = new Float32Array(rdW * rdH);
    for (var i = 0; i < rdW * rdH; i++) rdU[i] = 1.0;
    // Seed random patches of V
    for (var s = 0; s < 30; s++) {
      var cx = 3 + Math.floor(Math.random() * (rdW - 6));
      var cy = 3 + Math.floor(Math.random() * (rdH - 6));
      for (var dy = -3; dy <= 3; dy++) {
        for (var dx = -3; dx <= 3; dx++) {
          var ix = cx+dx, iy = cy+dy;
          if (ix >= 0 && ix < rdW && iy >= 0 && iy < rdH) {
            rdU[iy*rdW+ix] = 0.50 + (Math.random()-0.5)*0.1;
            rdV[iy*rdW+ix] = 0.25 + (Math.random()-0.5)*0.1;
          }
        }
      }
    }
    rdOffscreen = document.createElement('canvas');
    rdOffscreen.width  = rdW;
    rdOffscreen.height = rdH;
  }

  function stepRD() {
    var f = RD_F, k = RD_K, du = RD_DU, dv = RD_DV;
    for (var y = 0; y < rdH; y++) {
      var ym = (y-1+rdH) % rdH, yp = (y+1) % rdH;
      for (var x = 0; x < rdW; x++) {
        var i   = y*rdW + x;
        var u   = rdU[i], v = rdV[i];
        var xm  = (x-1+rdW) % rdW, xp = (x+1) % rdW;
        var lapU = rdU[y*rdW+xp] + rdU[y*rdW+xm] + rdU[yp*rdW+x] + rdU[ym*rdW+x] - 4*u;
        var lapV = rdV[y*rdW+xp] + rdV[y*rdW+xm] + rdV[yp*rdW+x] + rdV[ym*rdW+x] - 4*v;
        var uvv  = u * v * v;
        var nu   = u + du*lapU - uvv + f*(1-u);
        var nv   = v + dv*lapV + uvv - (f+k)*v;
        rdUn[i]  = nu < 0 ? 0 : nu > 1 ? 1 : nu;
        rdVn[i]  = nv < 0 ? 0 : nv > 1 ? 1 : nv;
      }
    }
    var tu = rdU; rdU = rdUn; rdUn = tu;
    var tv = rdV; rdV = rdVn; rdVn = tv;
  }

  function drawRD() {
    if (!rdOffscreen) return;
    var dark   = isDark();
    var offCtx = rdOffscreen.getContext('2d');
    var imgData = offCtx.createImageData(rdW, rdH);
    var data   = imgData.data;
    var r = dark ? 169 : 52,
        g = dark ? 177 : 59,
        b = dark ? 214 : 88;
    for (var i = 0; i < rdW * rdH; i++) {
      var val = rdV[i];
      if (val > 0.01) {
        data[i*4]   = r;
        data[i*4+1] = g;
        data[i*4+2] = b;
        data[i*4+3] = (Math.min(val * 0.7, 0.18) * 255) | 0;  // max ~18% opacity
      }
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(rdOffscreen, 0, 0, W, H);
  }

  // ===== RESIZE / LOOP ======================================

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initMode(MODES[modeIdx]);
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
    } else if (mode === 'langton') {
      for (var ls = 0; ls < ANT_STEPS; ls++) stepLangton();
      drawLangton();
    } else if (mode === 'slime') {
      stepSlime();
      drawSlime();
    } else if (mode === 'particles') {
      updateParticles();
      drawParticles();
    } else if (mode === 'rdiff') {
      for (var rs = 0; rs < RD_STEPS; rs++) stepRD();
      drawRD();
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
