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
// BG EFFECT — Boids flocking simulation (Craig Reynolds, 1986)
// Three steering rules applied each frame per boid:
//   Separation — avoid crowding local neighbours
//   Alignment  — match average heading of local neighbours
//   Cohesion   — steer toward average position of local neighbours
// Rendered as tiny direction-oriented dashes (distant birds).
// To remove: delete this entire section from script.js,
//            delete the BG EFFECT block in style.css,
//            remove <canvas id="bg-canvas"> from baseof.html
// ================================================================
(function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var N          = 110;   // number of boids
  var MAX_SPEED  = 1.6;   // px / frame
  var MIN_SPEED  = 0.55;
  var PERCEPTION = 75;    // neighbour sensing radius (px)
  var SEP_DIST   = 22;    // personal-space radius (px)
  var SEP_W      = 0.09;  // separation steering weight
  var ALI_W      = 0.05;  // alignment steering weight
  var COH_W      = 0.028; // cohesion steering weight
  var MAX_FORCE  = 0.13;  // max steering force per frame
  var MARGIN     = 100;   // soft boundary margin (px)
  var TURN       = 0.20;  // boundary avoidance strength
  var DASH_LEN   = 3.2;   // half-length of each bird dash (px)

  var W, H, boids = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    if (!boids.length) init();
  }

  function init() {
    boids = [];
    for (var i = 0; i < N; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      boids.push({ x: Math.random()*W, y: Math.random()*H,
                   vx: Math.cos(a)*s,  vy: Math.sin(a)*s });
    }
  }

  // clamp vector magnitude to max
  function clamp2(vx, vy, max) {
    var m2 = vx*vx + vy*vy;
    if (m2 > max*max) { var sc = max / Math.sqrt(m2); return [vx*sc, vy*sc]; }
    return [vx, vy];
  }

  function update() {
    var P2 = PERCEPTION * PERCEPTION;
    var S2 = SEP_DIST   * SEP_DIST;
    var i, j, b, o, dx, dy, d2, d, spd, tmp;
    var fx, fy, sx, sy, ax, ay, cx, cy, sc, ac, cc;

    for (i = 0; i < N; i++) {
      b = boids[i];
      fx=0; fy=0; sx=0; sy=0; ax=0; ay=0; cx=0; cy=0; sc=0; ac=0; cc=0;

      for (j = 0; j < N; j++) {
        if (i === j) continue;
        o  = boids[j];
        dx = o.x - b.x; dy = o.y - b.y;
        d2 = dx*dx + dy*dy;
        if (d2 < P2) {
          cx += o.x; cy += o.y; cc++;
          ax += o.vx; ay += o.vy; ac++;
          if (d2 < S2 && d2 > 0) {
            d = Math.sqrt(d2);
            sx -= dx/d; sy -= dy/d; sc++;
          }
        }
      }

      // separation
      if (sc > 0) {
        tmp = clamp2(sx/sc * SEP_W, sy/sc * SEP_W, MAX_FORCE);
        fx += tmp[0]; fy += tmp[1];
      }
      // alignment — steer toward average neighbour velocity
      if (ac > 0) {
        tmp = clamp2(ax/ac, ay/ac, MAX_SPEED);
        tmp = clamp2((tmp[0]-b.vx)*ALI_W, (tmp[1]-b.vy)*ALI_W, MAX_FORCE);
        fx += tmp[0]; fy += tmp[1];
      }
      // cohesion — steer toward average neighbour position
      if (cc > 0) {
        tmp = clamp2((cx/cc - b.x)*COH_W, (cy/cc - b.y)*COH_W, MAX_FORCE);
        fx += tmp[0]; fy += tmp[1];
      }

      // soft boundary avoidance — push inward near edges
      if (b.x < MARGIN)   fx += TURN * (1 - b.x          / MARGIN);
      if (b.x > W-MARGIN) fx -= TURN * (1 - (W - b.x)    / MARGIN);
      if (b.y < MARGIN)   fy += TURN * (1 - b.y          / MARGIN);
      if (b.y > H-MARGIN) fy -= TURN * (1 - (H - b.y)    / MARGIN);

      b.vx += fx; b.vy += fy;

      // clamp to speed band
      spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (spd > MAX_SPEED) {
        b.vx = b.vx/spd*MAX_SPEED; b.vy = b.vy/spd*MAX_SPEED;
      } else if (spd < MIN_SPEED && spd > 1e-4) {
        b.vx = b.vx/spd*MIN_SPEED; b.vy = b.vy/spd*MIN_SPEED;
      }

      b.x += b.vx; b.y += b.vy;

      // hard-wrap safety (normally boundary avoidance prevents this)
      if (b.x < -20) b.x = W+20; else if (b.x > W+20) b.x = -20;
      if (b.y < -20) b.y = H+20; else if (b.y > H+20) b.y = -20;
    }
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function loop() {
    update();

    var dark = isDark();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = dark ? 'rgba(169,177,214,0.07)' : 'rgba(52,59,88,0.09)';
    ctx.lineWidth = 1.1;
    ctx.lineCap   = 'round';

    // batch all boid dashes into one path for efficiency
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var b   = boids[i];
      var spd = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
      if (spd < 1e-4) continue;
      var nx  = b.vx/spd * DASH_LEN;
      var ny  = b.vy/spd * DASH_LEN;
      ctx.moveTo(b.x + nx, b.y + ny);
      ctx.lineTo(b.x - nx, b.y - ny);
    }
    ctx.stroke();

    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
})();
// ================================================================
// END BG EFFECT
// ================================================================
