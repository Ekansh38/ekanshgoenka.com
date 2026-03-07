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
  var speedLevel = parseInt(localStorage.getItem('bgSpeed') || '1');
  var W, H;

  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    return t !== 'rose-pine' && t !== 'solarized-light';
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
    var s = document.getElementById('speed-slider');
    if (s) s.value = speedLevel;
  };
  window.getBgSpeed = function () { return speedLevel; };
  window.resetBg    = function () { initMode(MODES[modeIdx]); };
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

  var HELP = [
    'navigation',
    '  ls [path]         list contents',
    '  cat <path>        read a section or project',
    '  open <path>       navigate to a page',
    '',
    'system',
    '  neofetch          system info',
    '  uname             kernel info',
    '  uptime            time since page load',
    '  ps                running processes',
    '  history           command history',
    '  color             current theme palette',
    '  whoami            who is this',
    '',
    'background',
    '  bg [life|boids|off]   get or set background mode',
    '  speed [1-10]          get or set simulation speed',
    '  reset                 reset current simulation',
    '',
    'appearance',
    '  colorscheme [name]    list or switch colorscheme',
    '',
    'fun',
    '  matrix            wake up',
    '  hack              breach',
    '  fortune           random quote',
    '  cowsay [text]     a cow says something',
    '  echo <text>       echo',
    '  github / youtube / itch   open links',
    '  clear             clear output',
    '  exit / q          close',
  ].join('\n');

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

  // ── commands ────────────────────────────────────────────────
  var CMDS = {
    help: function ()    { line(HELP, 'term-line-pre'); },

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
      if (!m) {
        line('bg: ' + (window.getBgMode ? window.getBgMode() : '?'), 'term-line-ok');
        return;
      }
      if (!window.setBgMode || !window.setBgMode(m))
        line('bg: unknown mode. try: life  boids  off', 'term-line-err');
      else
        line('bg → ' + m, 'term-line-ok');
    },

    speed: function (args) {
      if (!args[0]) {
        line('speed: ' + (window.getBgSpeed ? window.getBgSpeed() : '?') + ' / 10', 'term-line-ok');
        return;
      }
      var n = parseInt(args[0]);
      if (isNaN(n) || n < 1 || n > 10) { line('speed: enter a value 1–10', 'term-line-err'); return; }
      if (window.setBgSpeed) window.setBgSpeed(n);
      line('speed → ' + n, 'term-line-ok');
    },

    reset: function () {
      if (window.resetBg) window.resetBg();
      line('simulation reset.', 'term-line-ok');
    },

    // ── system ──────────────────────────────────────────────────
    uname: function (args) {
      var full = args.indexOf('-a') >= 0;
      if (full)
        line('Browser 1.0.0 ekansh-site #1 SMP ' + new Date().toDateString() + ' x86_64 WebKit', 'term-line-pre');
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
        '  512  bjj-scheduler        0.0    0.0',
        ' 1337  ekansh               99.9   ∞',
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

    echo: function (args) { line(args.join(' ')); },

    // ── fun ─────────────────────────────────────────────────────
    matrix: function () {
      var chars = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';
      var W = 42, rows = 14, count = 0;
      var iv = setInterval(function () {
        var s = '';
        for (var i = 0; i < W; i++) s += chars[Math.floor(Math.random() * chars.length)];
        line(s, 'term-line-ok');
        if (++count >= rows) {
          clearInterval(iv);
          setTimeout(function () { line(''); line('wake up, neo.', 'term-line-ok'); }, 120);
        }
      }, 55);
    },

    hack: function () {
      var steps = [
        [0,    '> initiating breach sequence...'],
        [450,  '> scanning target: ekanshgoenka.com'],
        [900,  '> open ports: 80, 443, 1337'],
        [1350, '> attempting sql injection... failed.'],
        [1800, '> trying xss... failed.'],
        [2250, '> trying social engineering...'],
        [2700, '> ...'],
        [3100, '> ...wait.'],
        [3500, '> you ARE ekansh.'],
        [3900, '> nevermind. aborting.'],
      ];
      steps.forEach(function (s) {
        setTimeout(function () { line(s[1], 'term-line-ok'); }, s[0]);
      });
    },

    fortune: function () {
      line(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    },

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

    // ── misc ────────────────────────────────────────────────────
    clear: function () { output.innerHTML = ''; },
    exit:  function () { close(); },
    q:     function () { close(); },

    curl: function (args) {
      if (args[0] && args[0].indexOf('ekanshgoenka') >= 0)
        line('nice try. you\'re already in the terminal.', 'term-line-ok');
      else
        line('curl: not available here', 'term-line-err');
    },
    sudo: function ()  { line('lol no.', 'term-line-err'); },
    vim:  function ()  { line('you\'re already in vim (spiritually).', 'term-line-ok'); },
    pwd:  function ()  { line('/home/ekansh'); },
    date: function ()  { line(new Date().toDateString().toLowerCase()); },
    rm:   function (a) {
      if (a.join('').indexOf('rf') >= 0) line('nice try.', 'term-line-err');
      else line('rm: ' + (a[0] || '?') + ': permission denied', 'term-line-err');
    },
    sl:   function ()  { line('        🚂 choo choo'); },
    man:  function (a) {
      if (!a[0]) { line('what manual page do you want?', 'term-line-err'); return; }
      if (!CMDS[a[0]]) { line('no manual entry for ' + a[0], 'term-line-err'); return; }
      line('RTFS.', 'term-line-ok');
    }
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

