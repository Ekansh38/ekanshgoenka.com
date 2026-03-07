var THEMES = ['tokyo-night', 'gruvbox', 'rose-pine', 'solarized-light'];
var LIGHT_THEMES = ['rose-pine', 'solarized-light'];

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('theme', name);
  var isLight = LIGHT_THEMES.indexOf(name) >= 0;
  var t = document.getElementById('t');
  if (t) t.textContent = isLight ? '[light]' : '[dark]';
  var items = document.querySelectorAll('.tp-item');
  for (var i = 0; i < items.length; i++)
    items[i].classList.toggle('active', items[i].getAttribute('data-t') === name);
}

function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme');
  var idx = THEMES.indexOf(cur);
  applyTheme(THEMES[(idx + 1) % THEMES.length]);
}

(function () {
  var saved = localStorage.getItem('theme') || 'tokyo-night';
  if (saved === 'dark') saved = 'tokyo-night';
  if (saved === 'light') saved = 'rose-pine';
  if (THEMES.indexOf(saved) < 0) saved = 'tokyo-night';
  applyTheme(saved);

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(document.documentElement.getAttribute('data-theme'));

    // Theme picker (nerdy :colorscheme style)
    var pickerBtn  = document.getElementById('theme-picker-btn');
    var pickerMenu = document.getElementById('theme-picker-menu');
    if (pickerBtn && pickerMenu) {
      pickerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        pickerMenu.classList.toggle('open');
      });
      document.addEventListener('click', function () {
        pickerMenu.classList.remove('open');
      });
      pickerMenu.addEventListener('click', function (e) { e.stopPropagation(); });
      var items = document.querySelectorAll('.tp-item');
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', (function (item) {
          return function () {
            applyTheme(item.getAttribute('data-t'));
            pickerMenu.classList.remove('open');
          };
        })(items[i]));
      }
    }
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
    var t = document.documentElement.getAttribute('data-theme');
    return t !== 'rose-pine' && t !== 'solarized-light';
  }

  function updateBtn() {
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
  var PERCEPTION = 85,   SEP_DIST   = 50;
  var SEP_W      = 0.15, ALI_W      = 0.06, COH_W = 0.009;
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
            var w = 1.0 - d / SEP_DIST;  // stronger when closer
            sx -= (dx/d) * w; sy -= (dy/d) * w; sc++;
          }
        }
      }

      if (sc  > 0) { tmp = clamp2(sx*SEP_W,  sy*SEP_W,  MAX_FORCE); fx += tmp[0]; fy += tmp[1]; }
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

    // Hard separation: directly push apart any boids still overlapping
    var MIN_D = BOID_LEN * 1.2;
    var MIN_D2 = MIN_D * MIN_D;
    for (i = 0; i < N; i++) {
      for (j = i + 1; j < N; j++) {
        dx = boids[j].x - boids[i].x; dy = boids[j].y - boids[i].y;
        d2 = dx*dx + dy*dy;
        if (d2 < MIN_D2 && d2 > 0) {
          d = Math.sqrt(d2);
          var push = (MIN_D - d) * 0.5;
          var nx = dx/d, ny = dy/d;
          boids[i].x -= nx*push; boids[i].y -= ny*push;
          boids[j].x += nx*push; boids[j].y += ny*push;
        }
      }
    }
  }

  function isHome() { return window.location.pathname === '/'; }

  function drawBoids() {
    var dark = isDark();
    var sub  = isHome();
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = dark
      ? (sub ? 'rgba(169,177,214,0.18)' : 'rgba(169,177,214,0.07)')
      : (sub ? 'rgba(52,59,88,0.15)'    : 'rgba(52,59,88,0.055)');
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
    // Auto-fertilise: keep activity up so the sim never looks like it stalled
    if (liveCount < GW * GH * 0.05) {
      var seeds = [PAT_RPENTO, PAT_ACORN, PAT_DIEHARD, PAT_GLIDER_SE, PAT_GLIDER_NW];
      for (var k = 0; k < 5; k++) {
        placePattern(
          Math.floor(Math.random() * GW),
          Math.floor(Math.random() * GH),
          seeds[k % seeds.length]
        );
      }
    }
  }

  function drawLife() {
    var dark = isDark();
    var sub  = isHome();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dark
      ? (sub ? 'rgba(169,177,214,0.10)' : 'rgba(169,177,214,0.05)')
      : (sub ? 'rgba(52,59,88,0.09)'    : 'rgba(52,59,88,0.04)');
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

  // expose controls for terminal commands
  window.setBgMode = function (m) {
    var idx = MODES.indexOf(m);
    if (idx < 0) return false;
    modeIdx = idx;
    localStorage.setItem('bgMode', m);
    updateBtn();
    initMode(m);
    return true;
  };
  window.getBgMode  = function () { return MODES[modeIdx]; };
  window.setBgSpeed = function (n) {
    speedLevel = Math.max(1, Math.min(10, n));
    localStorage.setItem('bgSpeed', speedLevel);
  };
  window.getBgSpeed = function () { return speedLevel; };
  window.resetBg    = function () { initMode(MODES[modeIdx]); };

  window.getBgParams = function () {
    return {
      'life.cell':         CELL,
      'boids.n':           N,
      'boids.size':        BOID_LEN,
      'boids.speed':       MAX_SPEED,
      'boids.perception':  PERCEPTION,
      'boids.separation':  SEP_DIST,
    };
  };

  window.setParam = function (key, val) {
    switch (key) {
      case 'life.cell':
        CELL = Math.max(1, Math.min(80, Math.round(val)));
        if (MODES[modeIdx] === 'life') initLife();
        return true;
      case 'boids.n':
        N = Math.max(1, Math.min(1000, Math.round(val)));
        if (MODES[modeIdx] === 'boids') initBoids();
        return true;
      case 'boids.size':
        BOID_LEN  = Math.max(1, Math.min(200, val));
        BOID_HALF = BOID_LEN * 0.393;
        return true;
      case 'boids.speed':
        MAX_SPEED = Math.max(0, Math.min(30, val));
        MIN_SPEED = Math.min(MIN_SPEED, Math.max(0, MAX_SPEED * 0.33));
        return true;
      case 'boids.perception':
        PERCEPTION = Math.max(1, Math.min(2000, val));
        return true;
      case 'boids.separation':
        SEP_DIST = Math.max(0, Math.min(1000, val));
        return true;
      default:
        return false;
    }
  };
})();
// ================================================================
// END BG EFFECT
// ================================================================

// ================================================================
// HIDDEN TERMINAL — press ':' or click [:] to open
// ================================================================
(function () {
  var overlay = document.getElementById('term-overlay');
  var output  = document.getElementById('term-output');
  var inp     = document.getElementById('term-input');
  if (!overlay || !output || !inp) return;

  var hist = [], histIdx = -1, isOpen = false;
  var PAGE_START = Date.now();

  var QUOTES = [
    '"the best code is no code at all."  — jeff atwood',
    '"walking on water and developing software from a spec are easy if both are frozen."  — e.v. berard',
    '"first, solve the problem. then, write the code."  — john johnson',
    '"make it work, make it right, make it fast."  — kent beck',
    '"any fool can write code a computer understands. good programmers write code humans understand."  — fowler',
    '"debugging is twice as hard as writing the code in the first place."  — brian kernighan',
    '"the most dangerous phrase: \'we\'ve always done it this way\'."  — grace hopper',
    '"talk is cheap. show me the code."  — linus torvalds',
    '"programs must be written for people to read, and only incidentally for machines to execute."  — abelson',
    '"simplicity is the soul of efficiency."  — austin freeman',
    '"it works on my machine."  — every developer',
    '"weeks of coding can save you hours of planning."  — unknown',
    '"a language that doesn\'t affect the way you think about programming is not worth knowing."  — alan perlis',
    '"the computer was born to solve problems that did not exist before."  — bill gates',
    '"software is like entropy: it is difficult to grasp, weighs nothing, and obeys the second law of thermodynamics."  — norman augustine',
  ];

  // DATA comes from /terminal-data.js — edit that file to update terminal content
  var DATA = (typeof TERMINAL_DATA !== 'undefined') ? TERMINAL_DATA : { projects:{}, music:{}, games:{}, writing:{}, now:'' };
  // patch game URLs from site params (itch.io link lives in hugo.toml, not terminal-data.js)
  if (DATA.games) {
    Object.keys(DATA.games).forEach(function (k) {
      if (!DATA.games[k].url) DATA.games[k].url = (typeof SITE_LINKS !== 'undefined' ? SITE_LINKS.itchio : '#');
    });
  }

  var NEOFETCH = [
    '  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄   ekansh@home',
    '  █                 █   ────────────────────────────────────────',
    '  █  ┌───────────┐  █',
    '  █  │           │  █   age      12',
    '  █  │   > _     │  █   editor   vim',
    '  █  │           │  █',
    '  █  └───────────┘  █',
    '  █                 █',
    '  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
    '        █████',
    '  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
    '  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
    '',
    '                        projects  byte-space · geno',
    '                        music     btop',
    '                        hobbies   bjj · cs · music · reading',
  ].join('\n');

  // ── help system ─────────────────────────────────────────────
  var HELP_INDEX = [
    'help [topic|command]',
    '',
    'topics:',
    '  nav     navigating site content',
    '  bg      background simulation & tuning',
    '  sys     system information',
    '  look    themes & appearance',
    '  fun     the fun stuff',
    '',
    'type  help <topic>     to list commands in a topic',
    'type  help <command>   for detailed help on a command',
    'type  help help        to learn about this help system',
  ].join('\n');

  var HELP_TOPICS = {
    help: [
      'help [topic|command]',
      '─────────────────────────────────────────────',
      'with no args:         show topic list',
      'help <topic>:         list commands in that topic',
      'help <command>:       detailed usage for a command',
      'help help:            you\'re looking at it',
      '',
      'topics: nav  bg  sys  look  fun',
    ].join('\n'),

    nav: [
      'nav — navigating site content',
      '─────────────────────────────────────────────',
      '  ls [path]         list directory contents',
      '  cat <path>        read a file',
      '  open <path>       navigate to a page',
      '',
      'paths: projects  projects/byte-space  projects/geno',
      '       music  music/btop  games  writing  now',
    ].join('\n'),

    bg: [
      'bg — background simulation',
      '─────────────────────────────────────────────',
      '  bg [life|boids|off]    get or set mode',
      '  speed [1-10]           get or set speed',
      '  reset                  reinit simulation',
      '  params                 show all tunable params',
      '  set <param> <val>      change a parameter',
      '',
      'life params:',
      '  life.cell         cell size px       (1–80,    default 7)',
      '',
      'boids params:',
      '  boids.n           boid count         (1–1000,  default 120)',
      '  boids.size        boid length px     (1–200,   default 14)',
      '  boids.speed       max speed          (0–30,    default 1.8)',
      '  boids.perception  sight radius px    (1–2000,  default 85)',
      '  boids.separation  separation px      (0–1000,  default 50)',
    ].join('\n'),

    look: [
      'look — appearance',
      '─────────────────────────────────────────────',
      '  colorscheme [name]    list or apply a colorscheme',
      '  color                 print current palette',
      '',
      'colorschemes:',
      '  tokyo-night    dark   (default)',
      '  gruvbox        dark',
      '  rose-pine      light',
      '  solarized-light light',
    ].join('\n'),

    sys: [
      'sys — system',
      '─────────────────────────────────────────────',
      '  neofetch          system overview',
      '  uname [-a]        kernel / browser info',
      '  uptime            time since page load',
      '  top               live process view',
      '  ps                process list',
      '  df                disk usage',
      '  du [path]         directory sizes',
      '  env               environment variables',
      '  history           command history',
      '  color             current theme palette',
      '  whoami            identity',
      '  date              current date',
      '  pwd               working directory',
    ].join('\n'),

    fun: [
      'fun',
      '─────────────────────────────────────────────',
      '  cowsay [text]       cow',
      '  fortune             random quote',
      '  ping <host>         ping',
      '  find . -name <pat>  find files',
      '  grep <pat> <path>   search',
      '  wc [-l] <path>      word/line count',
      '  which <cmd>         locate a command',
      '  make [target]       build',
      '  tar                 archive',
      '  yes [text]          infinite output',

      '  curl -L <url>        try it',
      '  sudo <cmd>          nope',
      '  rm -rf /            nice try',
      '  vim                 spiritual',
    ].join('\n'),
  };

  var HELP_CMDS = {
    ls:      'ls [path]\n  list directory contents.\n\n  ls              → top-level dirs\n  ls projects     → list projects\n  ls music        → list albums',
    cat:     'cat <path>\n  print a file.\n\n  cat now                → current status\n  cat projects/geno      → project info\n  cat music/btop         → album info',
    open:    'open <path>\n  navigate to a page.\n\n  open projects          → /projects/\n  open projects/geno     → project page',
    bg:      'bg [life|boids|off]\n  get or set background mode.\n\n  bg             → show current mode\n  bg life        → Conway\'s Game of Life\n  bg boids       → flocking simulation\n  bg off         → disable',
    speed:   'speed [1-10]\n  get or set simulation speed (syncs with the slider).\n\n  speed          → show current\n  speed 1        → slowest\n  speed 10       → fastest',
    reset:   'reset\n  reinitialize the current simulation from scratch.',
    params:  'params\n  show all tunable simulation parameters with current values.',
    set:     'set <param> <value>\n  tune a simulation parameter live. ranges are intentionally wide.\n\n  set life.cell 1           → single pixel cells\n  set life.cell 40          → chunky blocks\n  set boids.n 1000          → chaos\n  set boids.n 5             → lonely\n  set boids.size 100        → massive\n  set boids.speed 20        → unhinged\n  set boids.speed 0         → frozen\n  set boids.perception 2000 → hive mind\n  set boids.perception 1    → blind\n  set boids.separation 0    → merge\n\n  see: help bg  for all params and defaults',
    colorscheme: 'colorscheme [name]\n  list or apply a colorscheme.\n\n  colorscheme              → list (active marked *)\n  colorscheme gruvbox      → apply\n\n  available: tokyo-night  gruvbox  rose-pine  solarized-light',
    cowsay:  'cowsay [text]\n  a cow says something.\n\n  cowsay hello world',
    fortune: 'fortune\n  print a random programming quote.',
    ping:    'ping <host>\n  send 3 ICMP echo requests.\n\n  ping ekanshgoenka.com',
    find:    'find . -name <pattern>\n  find files matching a pattern.\n\n  find . -name "*.go"\n  find . -name "*.md"',
    grep:    'grep <pattern> <path>\n  search file contents.',
    wc:      'wc [-l] <path>\n  count lines, words, and bytes.',
    which:   'which <command>\n  show path of a command.',
    top:     'top\n  show live process monitor.',
    ps:      'ps\n  show process list.',
    df:      'df\n  show disk usage.',
    du:      'du [path]\n  show directory sizes.',
    env:     'env\n  print environment variables.',
    uname:   'uname [-a]\n  print kernel info.\n  -a    all info',
    uptime:  'uptime\n  time since page load, with load averages.',
    history: 'history\n  show command history for this session.',
    color:   'color\n  print current theme CSS variables.',
    whoami:  'whoami\n  print user identity.',
    make:    'make [target]\n  build target.\n\n  make\n  make clean',
    tar:     'tar [flags] [file]\n  archive utility.\n\n  tar -xzf archive.tar.gz',
    curl:    'curl -L <url>\n  transfer data.\n\n  curl -L ekanshgoenka.com\n\n  (run that from a real terminal, not here)',
  };

  // ── output helpers ──────────────────────────────────────────
  function line(text, cls) {
    var el = cls === 'term-line-pre'
      ? document.createElement('pre')
      : document.createElement('div');
    if (cls) el.className = cls;
    el.textContent = text;
    output.appendChild(el);
    output.scrollTop = output.scrollHeight;
  }
  function echoCmd(raw) { line('$ ' + raw, 'term-line-cmd'); }

  // ── rm -rf / degradation ─────────────────────────────────────
  function startDegradation() {
    var GLITCH = '░▒▓▄▀█■□10!@#%&*[]{}|;:.<>/\\~`';

    // ── audio ── create immediately (needs user gesture context) ─
    var audioCtx = null;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}

    function startAudio() {
      if (!audioCtx) return function(){};
      var now = audioCtx.currentTime;

      // low sawtooth drone — pitch drops as system dies
      var drone = audioCtx.createOscillator();
      var droneGain = audioCtx.createGain();
      drone.type = 'sawtooth';
      drone.frequency.setValueAtTime(110, now);
      drone.frequency.exponentialRampToValueAtTime(28, now + 9);
      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(0.18, now + 0.6);
      droneGain.gain.linearRampToValueAtTime(0, now + 9);
      drone.connect(droneGain);
      droneGain.connect(audioCtx.destination);
      drone.start(now);
      drone.stop(now + 9);

      // glitch beeps — short random square/sine chirps, accelerating
      var beepRate = 350;
      var beepTimer;
      function scheduleBeep() {
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        var t = audioCtx.currentTime;
        o.type = Math.random() > 0.4 ? 'square' : 'sine';
        o.frequency.setValueAtTime(Math.random() * 2400 + 120, t);
        o.frequency.exponentialRampToValueAtTime(Math.random() * 800 + 80, t + 0.06);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.07 + Math.random() * 0.08);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + 0.18);
        beepRate = Math.max(60, beepRate - 12);
        beepTimer = setTimeout(scheduleBeep, beepRate * (0.5 + Math.random()));
      }
      scheduleBeep();

      // bandpass-filtered noise bursts — crackle / static
      var noiseTimer;
      function scheduleNoise() {
        var dur    = 0.08 + Math.random() * 0.12;
        var size   = Math.ceil(audioCtx.sampleRate * dur);
        var buf    = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
        var data   = buf.getChannelData(0);
        for (var i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        var src    = audioCtx.createBufferSource();
        src.buffer = buf;
        var bp     = audioCtx.createBiquadFilter();
        bp.type    = 'bandpass';
        bp.frequency.value = 400 + Math.random() * 3600;
        bp.Q.value = 1.5 + Math.random() * 4;
        var ng     = audioCtx.createGain();
        var t      = audioCtx.currentTime;
        ng.gain.setValueAtTime(0.06, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(bp); bp.connect(ng); ng.connect(audioCtx.destination);
        src.start(t);
        noiseTimer = setTimeout(scheduleNoise, 80 + Math.random() * 220);
      }
      scheduleNoise();

      return function stopAudio() {
        clearTimeout(beepTimer);
        clearTimeout(noiseTimer);
        try { audioCtx.close(); } catch(e) {}
      };
    }

    var deletions = [
      ['removing /usr/bin...', 'term-line-ok'],
      ['removing /etc...', 'term-line-ok'],
      ['removing /home/ekansh...', 'term-line-ok'],
      ['removing /var/log...', 'term-line-ok'],
      ['removing /sys/kernel...', 'term-line-ok'],
      ['removing /proc...', 'term-line-ok'],
      ['i/o error on sector 0x00FF', 'term-line-err'],
      ['i/o error on sector 0x0100', 'term-line-err'],
      ['segmentation fault (core dumped)', 'term-line-err'],
    ];

    deletions.forEach(function (d, i) {
      setTimeout(function () { line(d[0], d[1]); }, i * 190);
    });

    setTimeout(function () {
      close();
      if (window.setBgSpeed) window.setBgSpeed(10);

      var stopAudio = startAudio();

      // blank ALL whitespace-only text nodes upfront so no phantom newlines remain
      (function stripWhitespace(node) {
        if (node.nodeType === 3 && !node.textContent.trim()) { node.textContent = ''; return; }
        for (var i = 0; i < node.childNodes.length; i++) stripWhitespace(node.childNodes[i]);
      })(document.body);

      // ── phase 1: text corruption ────────────────────────────
      var textNodes = [];
      (function collectText(node) {
        if (node.nodeType === 3 && node.textContent.length > 0) textNodes.push(node);
        for (var i = 0; i < node.childNodes.length; i++) collectText(node.childNodes[i]);
      })(document.body);

      var corruptRate = 1;
      var corruptTick = setInterval(function () {
        for (var i = 0; i < Math.ceil(corruptRate); i++) {
          if (!textNodes.length) break;
          var idx = Math.floor(Math.random() * textNodes.length);
          var tn  = textNodes[idx];
          if (!tn.parentNode) { textNodes.splice(idx, 1); continue; }
          var chars = tn.textContent.split('');
          if (!chars.length) { textNodes.splice(idx, 1); continue; }
          chars[Math.floor(Math.random() * chars.length)] =
            GLITCH[Math.floor(Math.random() * GLITCH.length)];
          tn.textContent = chars.join('');
        }
        corruptRate = Math.min(corruptRate + 0.4, 25);
      }, 70);

      // ── phase 2: element deletion ───────────────────────────
      setTimeout(function () {
        var sel = 'nav, .social, .tagline, li, p, h3, h2, footer, ' +
                  '.nav, h1, header, section, article, #theme-picker, main';
        var nodeList = document.querySelectorAll(sel);
        var els = [];
        for (var i = 0; i < nodeList.length; i++) els.push(nodeList[i]);
        for (var i = els.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = els[i]; els[i] = els[j]; els[j] = t;
        }

        var ri = 0;
        var removeTick = setInterval(function () {
          var batch = Math.min(Math.ceil(ri / 8) + 1, 4);
          for (var b = 0; b < batch; b++) {
            if (ri >= els.length) {
              clearInterval(removeTick);
              // sweep any remaining body children (script tags, term-overlay, stray nodes, etc.)
              var remaining = [];
              for (var k = 0; k < document.body.childNodes.length; k++)
                remaining.push(document.body.childNodes[k]);
              remaining.forEach(function (n) {
                if (n.id !== 'bg-canvas' && n.parentNode) n.parentNode.removeChild(n);
              });
              break;
            }
            var el = els[ri++];
            if (!el || !el.parentNode) continue;
            el.style.transition = 'opacity 0.12s, transform 0.12s';
            el.style.opacity    = '0';
            el.style.transform  = 'translateX(' + (Math.random() * 14 - 7) + 'px)';
            (function (e) {
              setTimeout(function () {
                if (e.parentNode) e.parentNode.removeChild(e);
              }, 130);
            })(el);
          }
        }, 100);
      }, 3000);

      // ── phase 3: color corruption ───────────────────────────
      setTimeout(function () {
        clearInterval(corruptTick);
        var hue = 0;
        var colorTick = setInterval(function () {
          hue = (hue + 31) % 360;
          document.documentElement.style.setProperty('--fg',     'hsl(' + hue + ',100%,55%)');
          document.documentElement.style.setProperty('--bg',     'hsl(' + ((hue + 137) % 360) + ',60%,6%)');
          document.documentElement.style.setProperty('--accent', 'hsl(' + ((hue + 251) % 360) + ',100%,50%)');
        }, 55);

        // ── phase 4: blackout ─────────────────────────────────
        setTimeout(function () {
          clearInterval(colorTick);
          stopAudio();
          var canvas = document.getElementById('bg-canvas');
          if (canvas) { canvas.style.transition = 'opacity 1.2s'; canvas.style.opacity = '0'; }
          document.body.style.transition = 'background 1.2s, color 1.2s';
          document.body.style.background = '#000';
          document.body.style.color      = '#000';
          document.documentElement.style.background = '#000';

          setTimeout(function () {
            localStorage.setItem('bgSpeed', '2');
            document.body.innerHTML = '';
            document.body.style.cssText = 'background:#000;margin:0;padding:0;height:100vh;';
          }, 1300);
        }, 1600);
      }, 6500);

    }, deletions.length * 190 + 250);
  }

  // ── commands ────────────────────────────────────────────────
  var CMDS = {
    help: function (args) {
      var t = (args[0] || '').toLowerCase();
      if (!t)                    { line(HELP_INDEX,        'term-line-pre'); return; }
      if (HELP_TOPICS[t])        { line(HELP_TOPICS[t],    'term-line-pre'); return; }
      if (HELP_CMDS[t])          { line(HELP_CMDS[t],      'term-line-pre'); return; }
      line('no help for "' + t + '"  —  try: help', 'term-line-err');
    },

    ls: function (args) {
      var p = args[0] || '';
      if (!p) {
        line('projects  writing  music  games  now');
      } else if (DATA[p] && typeof DATA[p] === 'object' && p !== 'now') {
        var keys = Object.keys(DATA[p]);
        line(keys.length ? keys.join('  ') : '(empty)');
      } else if (p === 'now') {
        line('now');
      } else {
        line('ls: ' + p + ': no such directory', 'term-line-err');
      }
    },

    cat: function (args) {
      var path  = (args[0] || '').replace(/^\//, '');
      var parts = path.split('/');
      if (path === 'now') {
        line(DATA.now);
      } else if (parts.length === 2 && DATA[parts[0]] && DATA[parts[0]][parts[1]]) {
        var item = DATA[parts[0]][parts[1]];
        var out  = parts[1] + '\n' + '─'.repeat(parts[1].length) + '\n' + item.desc;
        if (item.stack)  out += '\n\nstack : ' + item.stack;
        if (item.status) out += '\nstatus: ' + item.status;
        line(out, 'term-line-pre');
      } else {
        line('cat: ' + (path || '?') + ': no such file', 'term-line-err');
      }
    },

    open: function (args) {
      var path  = (args[0] || '').replace(/^\//, '');
      var parts = path.split('/');
      var url   = null;
      var top   = ['projects','writing','music','games','now'];
      if (top.indexOf(path) >= 0) {
        url = '/' + path + '/';
      } else if (parts.length === 2 && DATA[parts[0]] && DATA[parts[0]][parts[1]]) {
        url = DATA[parts[0]][parts[1]].url;
      }
      if (url) {
        line('→ ' + url, 'term-line-ok');
        setTimeout(function () { window.location.href = url; }, 280);
      } else {
        line('open: ' + (path || '?') + ': not found', 'term-line-err');
      }
    },

    whoami: function () {
      line('ekansh goenka. 12. building things. bjj. music.');
    },

    neofetch: function () { line(NEOFETCH, 'term-line-pre'); },

    colorscheme: function (args) {
      var ALL = ['tokyo-night', 'gruvbox', 'rose-pine', 'solarized-light'];
      var cur  = document.documentElement.getAttribute('data-theme');
      var name = args[0];
      if (!name) {
        var out = ALL.map(function (t) {
          return (t === cur ? '* ' : '  ') + t;
        }).join('\n');
        line(out, 'term-line-pre');
      } else if (ALL.indexOf(name) >= 0) {
        applyTheme(name);
        line('colorscheme → ' + name, 'term-line-ok');
      } else {
        line('unknown colorscheme. try: ' + ALL.join(', '), 'term-line-err');
      }
    },
    theme: function (args) { CMDS.colorscheme(args); },

    github: function () {
      line('opening github...', 'term-line-ok');
      setTimeout(function () { window.open((SITE_LINKS||{}).github||'#', '_blank'); }, 200);
    },
    youtube: function () {
      line('opening bytecolony...', 'term-line-ok');
      setTimeout(function () { window.open((SITE_LINKS||{}).youtube||'#', '_blank'); }, 200);
    },
    itch: function () {
      line('opening itch.io...', 'term-line-ok');
      setTimeout(function () { window.open((SITE_LINKS||{}).itchio||'#', '_blank'); }, 200);
    },

    // ── background control ──────────────────────────────────────
    bg: function (args) {
      var m = args[0];
      if (!m) { line('bg: ' + (window.getBgMode ? window.getBgMode() : '?'), 'term-line-ok'); return; }
      if (!window.setBgMode || !window.setBgMode(m))
        line('bg: unknown mode. try: life  boids  off', 'term-line-err');
      else
        line('bg → ' + m, 'term-line-ok');
    },

    speed: function (args) {
      if (!args[0]) { line('speed: ' + (window.getBgSpeed ? window.getBgSpeed() : '?') + ' / 10', 'term-line-ok'); return; }
      var n = parseInt(args[0]);
      if (isNaN(n) || n < 1 || n > 10) { line('speed: value must be 1–10', 'term-line-err'); return; }
      if (window.setBgSpeed) window.setBgSpeed(n);
      line('speed → ' + n, 'term-line-ok');
    },

    reset: function () {
      if (window.resetBg) window.resetBg();
      line('simulation reinitialized.', 'term-line-ok');
    },

    params: function () {
      var p = window.getBgParams ? window.getBgParams() : {};
      line([
        'simulation parameters  (set <param> <val> to change)',
        '',
        'life:',
        '  life.cell         ' + (p['life.cell']        || '?') + '    cell size px  (1–80)',
        '',
        'boids:',
        '  boids.n           ' + (p['boids.n']          || '?') + '   count         (1–1000)',
        '  boids.size        ' + (p['boids.size']        || '?') + '   length px     (1–200)',
        '  boids.speed       ' + (p['boids.speed']       || '?') + '  max speed      (0–30)',
        '  boids.perception  ' + (p['boids.perception']  || '?') + '   sight radius  (1–2000)',
        '  boids.separation  ' + (p['boids.separation']  || '?') + '   separation px (0–1000)',
      ].join('\n'), 'term-line-pre');
    },

    set: function (args) {
      var key = args[0] || '';
      var val = parseFloat(args[1]);
      if (!key || isNaN(val)) { line('usage: set <param> <value>   (see: params)', 'term-line-err'); return; }
      if (!window.setParam || !window.setParam(key, val))
        line('unknown param "' + key + '"  —  see: params', 'term-line-err');
      else
        line(key + ' = ' + val, 'term-line-ok');
    },

    // ── system ──────────────────────────────────────────────────
    uname: function (args) {
      if (args.indexOf('-a') >= 0)
        line('Browser 1.0.0 ekansh-site #1 SMP ' + new Date().toDateString() + ' x86_64 WebKit');
      else
        line('Browser');
    },

    uptime: function () {
      var s = Math.floor((Date.now() - PAGE_START) / 1000);
      var m = Math.floor(s / 60); s %= 60;
      var h = Math.floor(m / 60); m %= 60;
      var t = (h ? h + 'h ' : '') + (m ? m + 'm ' : '') + s + 's';
      line('up ' + t + '   load avg: 0.42 0.13 0.07');
    },

    ps: function () {
      line([
        '  PID  COMMAND              CPU%   MEM%',
        '─────────────────────────────────────────',
        '    1  kernel               0.0    0.1',
        '   88  boids.wasm           2.1    1.4',
        '   89  life.sim             1.7    0.9',
        '  102  terminal.js          0.3    0.2',
        '  256  music-brain          0.1    ?.?',
        ' 1337  ekansh               99.9   ∞',
      ].join('\n'), 'term-line-pre');
    },

    top: function () {
      var p = window.getBgParams ? window.getBgParams() : {};
      line([
        'top - ' + new Date().toTimeString().slice(0,8) + '  up ' + (function(){
          var s=Math.floor((Date.now()-PAGE_START)/1000),m=Math.floor(s/60)%60,h=Math.floor(s/3600);
          return (h?h+'h ':'')+m+'m';
        })() + ',  tasks: 6 total',
        'cpu: usr 14.2%  sys 3.1%  idle 82.7%',
        'mem: 512M total  341M used  171M free',
        '',
        '  PID  USER     %CPU  %MEM  COMMAND',
        ' 1337  ekansh   99.9  ∞     ekansh',
        '   88  www      ' + (p['boids.n']||120)/6|0 + '.1   1.4   boids (n=' + (p['boids.n']||120) + ')',
        '   89  www       1.7   0.9   life (cell=' + (p['life.cell']||7) + 'px)',
        '  102  www       0.3   0.2   terminal.js',
        '    1  root      0.0   0.1   kernel',
      ].join('\n'), 'term-line-pre');
    },

    history: function () {
      if (!hist.length) { line('(no history)', 'term-line-err'); return; }
      var out = hist.slice().reverse().map(function (cmd, i) {
        var n = String(i + 1); while (n.length < 4) n = ' ' + n;
        return n + '  ' + cmd;
      }).join('\n');
      line(out, 'term-line-pre');
    },

    color: function () {
      var theme = document.documentElement.getAttribute('data-theme');
      var vars  = ['--bg', '--fg', '--accent', '--muted', '--border'];
      var cs    = getComputedStyle(document.documentElement);
      var out   = 'colorscheme: ' + theme + '\n';
      vars.forEach(function (v) {
        var val = cs.getPropertyValue(v).trim();
        var pad = v; while (pad.length < 10) pad += ' ';
        out += '\n  ' + pad + '  ' + val;
      });
      line(out, 'term-line-pre');
    },

    df: function () {
      line([
        'Filesystem        Size    Used   Avail  Use%  Mounted on',
        '/dev/brain        256G    201G    55G    79%   /home/ekansh',
        '/dev/internet      ∞       ∞      ∞     ??%   /www',
        'tmpfs             16G     0.2G   15.8G   1%   /tmp',
      ].join('\n'), 'term-line-pre');
    },

    du: function (args) {
      var target = args.join(' ') || '.';
      line([
        '4.0K    ' + target + '/now',
        '12K     ' + target + '/projects/byte-space',
        '8.0K    ' + target + '/projects/geno',
        '4.0K    ' + target + '/music/btop',
        '28K     ' + target + '/',
      ].join('\n'), 'term-line-pre');
    },

    ping: function (args) {
      var host = args[0] || 'ekanshgoenka.com';
      var steps = [
        'PING ' + host + ': 56 data bytes',
        '64 bytes from ' + host + ': icmp_seq=0 ttl=64 time=' + (Math.random()*8+1).toFixed(3) + ' ms',
        '64 bytes from ' + host + ': icmp_seq=1 ttl=64 time=' + (Math.random()*8+1).toFixed(3) + ' ms',
        '64 bytes from ' + host + ': icmp_seq=2 ttl=64 time=' + (Math.random()*8+1).toFixed(3) + ' ms',
        '',
        '--- ' + host + ' ping statistics ---',
        '3 packets transmitted, 3 received, 0% packet loss',
      ];
      steps.forEach(function (s, i) { setTimeout(function () { line(s); }, i * 300); });
    },

    grep: function (args) {
      if (args.length < 2) { line('usage: grep <pattern> <path>', 'term-line-err'); return; }
      var pat = args[0], path = args[1];
      line('grep: ' + path + ': permission denied', 'term-line-err');
      line('(hint: try  cat <path>  instead)');
    },

    find: function (args) {
      var name = '';
      var ni = args.indexOf('-name');
      if (ni >= 0) name = args[ni + 1] || '';
      if (!name) { line('usage: find . -name <pattern>', 'term-line-err'); return; }
      var files = [
        './projects/byte-space/ipc.md',
        './projects/byte-space/dns.md',
        './projects/geno/overview.md',
        './music/btop/tracklist.md',
        './now/index.md',
        './writing/index.md',
      ].filter(function (f) {
        return !name || name === '*' || name.replace(/\*/g,'') === '' ||
               f.indexOf(name.replace(/\*/g,'')) >= 0;
      });
      line(files.length ? files.join('\n') : '(no matches)', files.length ? 'term-line-pre' : 'term-line-err');
    },

    wc: function (args) {
      var path = args[args.length - 1] || '';
      var lines = Math.floor(Math.random()*80+20);
      var words = Math.floor(lines * (Math.random()*8+4));
      var bytes = Math.floor(words * 5.2);
      line('  ' + lines + '  ' + words + '  ' + bytes + '  ' + (path || '-'));
    },

    which: function (args) {
      var cmd = args[0];
      if (!cmd) { line('usage: which <command>', 'term-line-err'); return; }
      if (CMDS[cmd]) line('/usr/local/bin/' + cmd);
      else line('which: ' + cmd + ': not found', 'term-line-err');
    },

    env: function () {
      var theme = document.documentElement.getAttribute('data-theme');
      line([
        'TERM=xterm-256color',
        'SHELL=/bin/zsh',
        'USER=ekansh',
        'HOME=/home/ekansh',
        'EDITOR=vim',
        'COLORSCHEME=' + theme,
        'BG_MODE=' + (window.getBgMode ? window.getBgMode() : 'life'),
        'LANG=en_US.UTF-8',
        'PATH=/usr/local/bin:/usr/bin:/bin',
      ].join('\n'), 'term-line-pre');
    },

    make: function (args) {
      var target = args[0] || 'all';
      var steps = [
        'cc -O2 -Wall -o ' + target + ' main.c util.c',
        'ld -o ' + target + ' main.o util.o',
        'make: \'' + target + '\' is up to date.',
      ];
      steps.forEach(function (s, i) { setTimeout(function () { line(s); }, i * 180); });
    },

    tar: function (args) {
      if (args.join('').indexOf('x') >= 0)
        line('tar: checksum error\ntar: error exit delayed from previous errors.', 'term-line-err');
      else
        line('tar: refusing to create empty archive', 'term-line-err');
    },

    // ── fun ─────────────────────────────────────────────────────
    cowsay: function (args) {
      var text = args.join(' ') || 'moo';
      var bar  = '-'.repeat(text.length + 2);
      line([
        ' ' + bar,
        '< ' + text + ' >',
        ' ' + bar,
        '        \\   ^__^',
        '         \\  (oo)\\_______',
        '            (__)\\       )',
        '                ||----w |',
        '                ||     ||',
      ].join('\n'), 'term-line-pre');
    },

    fortune: function () {
      line(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    },

    // ── misc ────────────────────────────────────────────────────
    man: function (a) {
      if (!a[0]) { line('what manual page do you want?', 'term-line-err'); return; }
      var entry = HELP_CMDS[a[0]] || HELP_TOPICS[a[0]];
      if (entry) line(entry, 'term-line-pre');
      else line('no manual entry for ' + a[0], 'term-line-err');
    },
    clear:  function () { output.innerHTML = ''; },
    exit:   function () { close(); },
    q:      function () { close(); },
    echo:   function (args) { line(args.join(' ')); },
    curl:   function (args) {
      var isSite = args.some(function (a) { return a.indexOf('ekanshgoenka') >= 0; });
      if (!isSite) { line('try: curl -L ekanshgoenka.com', 'term-line-ok'); return; }

      var CW = 66, CH = 13;
      var BG_TEXT = 'USE  A  BROWSER,  YOU  NERD';
      var BG_ROW  = Math.floor(CH / 2);
      var BG_COL  = Math.floor((CW - BG_TEXT.length) / 2);

      // build background text grid
      var bg = [];
      for (var y = 0; y < CH; y++) { bg[y] = []; for (var x = 0; x < CW; x++) bg[y][x] = null; }
      for (var i = 0; i < BG_TEXT.length; i++) if (BG_COL + i < CW) bg[BG_ROW][BG_COL + i] = BG_TEXT[i];

      // rain columns
      var cols = [];
      for (var x = 0; x < CW; x++) {
        cols.push({ y: -Math.floor(Math.random() * CH * 2), spd: 0.4 + Math.random() * 0.6,
                    len: 2 + Math.floor(Math.random() * 4), on: Math.random() > 0.45 });
      }

      function stepRain() {
        for (var i = 0; i < cols.length; i++) {
          var c = cols[i]; if (!c.on) continue;
          c.y += c.spd;
          if (c.y - c.len > CH) {
            c.y = -Math.floor(Math.random() * 6); c.len = 2 + Math.floor(Math.random() * 4);
            c.spd = 0.4 + Math.random() * 0.6;   c.on  = Math.random() > 0.2;
          }
        }
      }

      function renderFrame(fadeRatio) {
        var html = '';
        for (var y = 0; y < CH; y++) {
          for (var x = 0; x < CW; x++) {
            var col = cols[x], hy = Math.floor(col.y), dist = hy - y;
            var ch = null, style = '';
            if (col.on) {
              if (dist === 0)                         { ch = '.'; style = 'color:var(--accent)'; }
              else if (dist > 0 && dist <= col.len)   { ch = '|'; style = dist < 2 ? 'color:var(--accent)' : 'color:var(--muted)'; }
            }
            if (ch && fadeRatio > 0 && Math.random() < fadeRatio) ch = null;
            if (ch)            html += '<span style="' + style + '">' + ch + '</span>';
            else if (bg[y][x]) html += '<span style="color:var(--fg);font-weight:bold">' + bg[y][x] + '</span>';
            else               html += ' ';
          }
          if (y < CH - 1) html += '\n';
        }
        return html;
      }

      var pre = document.createElement('pre');
      pre.className = 'term-line-pre';
      output.appendChild(pre);
      output.scrollTop = output.scrollHeight;

      var frame = 0, MAIN = 75, FADE = 10;
      var timer = setInterval(function () {
        stepRain();
        if (frame < MAIN) {
          pre.innerHTML = renderFrame(0);
        } else if (frame < MAIN + FADE) {
          pre.innerHTML = renderFrame((frame - MAIN + 1) / FADE);
        } else {
          clearInterval(timer);
          pre.innerHTML = '';
          line('JUST USE A REGULAR BROWSER!!!', 'term-line-ok');
          output.scrollTop = output.scrollHeight;
          return;
        }
        frame++;
        output.scrollTop = output.scrollHeight;
      }, 80);
    },
    sudo:   function ()  { line('ekansh is not in the sudoers file. this incident will be reported.', 'term-line-err'); },
    vim:    function ()  { line('you\'re already in vim (spiritually).', 'term-line-ok'); },
    pwd:    function ()  { line('/home/ekansh'); },
    date:   function ()  { line(new Date().toString().toLowerCase()); },
    rm: function (a) {
      var flags = a.filter(function (x) { return x[0] === '-'; }).join('');
      var paths = a.filter(function (x) { return x[0] !== '-'; });
      var isRF  = flags.indexOf('r') >= 0 && flags.indexOf('f') >= 0;
      var isRoot = paths.indexOf('/') >= 0;
      if (isRF && isRoot) { startDegradation(); return; }
      if (isRF) { line('rm: ' + (paths[0] || '/') + ': permission denied', 'term-line-err'); return; }
      line('rm: ' + (a[0] || '?') + ': permission denied', 'term-line-err');
    },
    yes:    function (a) { line(a.join(' ') || 'y'); line('(use ctrl+c to stop — kidding, you can\'t)'); },
    true:   function ()  { /* exits 0, outputs nothing, as god intended */ },
    false:  function ()  { line('false: exited with status 1', 'term-line-err'); },
    ':':    function ()  { /* the shell builtin : always succeeds */ },
  };

  // ── tab completion ──────────────────────────────────────────
  var ALL_PATHS = ['projects','projects/byte-space','projects/geno',
                   'music','music/btop','games','games/untitled-game',
                   'writing','now'];
  var CMD_NAMES = Object.keys(CMDS);

  function complete(val) {
    var parts = val.trimStart().split(/\s+/);
    var prefix = parts[parts.length - 1];
    var pool = parts.length === 1 ? CMD_NAMES : ALL_PATHS;
    var hits = pool.filter(function (c) { return c.indexOf(prefix) === 0; });
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0];
      return parts.join(' ');
    }
    if (hits.length > 1) { echoCmd(val); line(hits.join('  ')); }
    return val;
  }

  // ── open / close ────────────────────────────────────────────
  function open() {
    overlay.classList.add('open');
    inp.focus();
    isOpen = true;
  }
  function close() {
    overlay.classList.remove('open');
    isOpen = false;
  }

  // ── run a command ───────────────────────────────────────────
  function run(raw) {
    var cmd = raw.trim();
    if (!cmd) return;
    hist.unshift(cmd); histIdx = -1;
    echoCmd(cmd);
    var tokens = cmd.split(/\s+/);
    var fn = CMDS[tokens[0].toLowerCase()];
    if (fn) fn(tokens.slice(1));
    else line('command not found: ' + tokens[0], 'term-line-err');
  }

  // ── event wiring ────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === ':' && !e.ctrlKey && !e.metaKey && !e.altKey &&
        e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault(); open();
    }
    if (e.key === 'Escape' && isOpen) close();
  });

  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var v = inp.value; inp.value = ''; run(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx < hist.length - 1) inp.value = hist[++histIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) inp.value = hist[--histIdx] || '';
      else { histIdx = -1; inp.value = ''; }
    } else if (e.key === 'Tab') {
      e.preventDefault(); inp.value = complete(inp.value);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  var btn = document.getElementById('term-btn');
  if (btn) btn.addEventListener('click', open);
  var cls = document.getElementById('term-close');
  if (cls) cls.addEventListener('click', close);
})();
// ================================================================
// END HIDDEN TERMINAL
// ================================================================

