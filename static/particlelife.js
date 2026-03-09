// ================================================================
// Particle Life simulation (Jeffery Ventrella style)
// Public API: window.ParticleLife = { init, reset, step, draw, setParam, getParams }
// ================================================================
(function () {
  var SPECIES  = 6;
  var N        = 300;
  var FRICTION = 0.85;
  var OPACITY  = 0.5;
  var GLOW     = 0;
  var rMin     = 40;
  var rMax     = 200;
  var RADIUS   = 3;
  var HUE_OFFSETS = [0, 60, 120, 180, 240, 300];

  var attraction = [];
  var px  = new Float32Array(N);
  var py  = new Float32Array(N);
  var pvx = new Float32Array(N);
  var pvy = new Float32Array(N);
  var sp  = new Uint8Array(N);  // species per particle
  var Wc  = 800, Hc = 600;     // cached canvas size

  function randomMatrix() {
    attraction = [];
    for (var i = 0; i < SPECIES; i++) {
      attraction[i] = [];
      for (var j = 0; j < SPECIES; j++) attraction[i][j] = Math.random() * 2 - 1;
    }
  }

  function place() {
    for (var i = 0; i < N; i++) { px[i] = Math.random()*Wc; py[i] = Math.random()*Hc; pvx[i] = 0; pvy[i] = 0; sp[i] = i % SPECIES; }
  }

  function init()  { randomMatrix(); place(); }
  function reset() { randomMatrix(); place(); }

  function step(W, H) {
    if (W) { Wc = W; Hc = H; }
    var i, j, dx, dy, d, force, fx, fy, t, rRange = rMax - rMin;
    for (i = 0; i < N; i++) {
      fx = 0; fy = 0;
      for (j = 0; j < N; j++) {
        if (i === j) continue;
        dx = px[j] - px[i];  dy = py[j] - py[i];
        if (dx >  Wc*0.5) dx -= Wc;  if (dx < -Wc*0.5) dx += Wc;
        if (dy >  Hc*0.5) dy -= Hc;  if (dy < -Hc*0.5) dy += Hc;
        d = Math.sqrt(dx*dx + dy*dy);
        if (d < 1 || d > rMax) continue;
        if (d < rMin) {
          force = (d / rMin - 1) * 2;  // repulsion
        } else {
          t = (d - rMin) / rRange;
          force = attraction[sp[i]][sp[j]] * (1 - Math.abs(2*t - 1));
        }
        fx += force * dx / d;
        fy += force * dy / d;
      }
      pvx[i] = pvx[i] * FRICTION + fx * 0.01;
      pvy[i] = pvy[i] * FRICTION + fy * 0.01;
    }
    for (i = 0; i < N; i++) {
      px[i] += pvx[i];  py[i] += pvy[i];
      if (px[i] < 0) px[i] += Wc;  if (px[i] >= Wc) px[i] -= Wc;
      if (py[i] < 0) py[i] += Hc;  if (py[i] >= Hc) py[i] -= Hc;
    }
  }

  function accentRgb() {
    var hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (hex.charAt(0) === '#') return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    return [122, 162, 247];
  }

  function speciesColor(rgb, si, alpha) {
    var r = rgb[0]/255, g = rgb[1]/255, b = rgb[2]/255;
    var mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2, s = 0, h = 0;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d/(2-mx-mn) : d/(mx+mn);
      if (mx === r) h = (g-b)/d + (g < b ? 6 : 0);
      else if (mx === g) h = (b-r)/d + 2;
      else h = (r-g)/d + 4;
      h /= 6;
    }
    h = (h*360 + HUE_OFFSETS[si % SPECIES]) % 360;
    return 'hsla('+h.toFixed(0)+','+((s*100).toFixed(0))+'%,'+((l*100).toFixed(0))+'%,'+alpha+')';
  }

  function draw(ctx, W, H) {
    Wc = W; Hc = H;
    var rgb = accentRgb();
    ctx.shadowBlur = GLOW > 0 ? GLOW : 0;
    for (var s = 0; s < SPECIES; s++) {
      var col = speciesColor(rgb, s, OPACITY);
      ctx.fillStyle = col;
      if (GLOW > 0) ctx.shadowColor = col;
      ctx.beginPath();
      for (var i = 0; i < N; i++) {
        if (sp[i] !== s) continue;
        ctx.moveTo(px[i]+RADIUS, py[i]);
        ctx.arc(px[i], py[i], RADIUS, 0, Math.PI*2);
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function reinitN(newN) {
    N = newN; px = new Float32Array(N); py = new Float32Array(N);
    pvx = new Float32Array(N); pvy = new Float32Array(N); sp = new Uint8Array(N);
    place();
  }

  function setParam(key, val) {
    var n = parseFloat(val);
    if (key === 'pl.opacity')  { OPACITY  = Math.max(0.01, Math.min(1, n || OPACITY));       return true; }
    if (key === 'pl.glow')     { GLOW     = Math.max(0, Math.min(40, n || 0));               return true; }
    if (key === 'pl.friction') { FRICTION = Math.max(0.1, Math.min(0.99, n || FRICTION));    return true; }
    if (key === 'pl.n')        { var nN = Math.max(10, Math.min(2000, Math.floor(n) || N)); if (nN !== N) reinitN(nN); return true; }
    return false;
  }

  function getParams() { return { 'pl.opacity': OPACITY, 'pl.glow': GLOW, 'pl.n': N, 'pl.friction': FRICTION }; }

  window.ParticleLife = { init: init, reset: reset, step: step, draw: draw, setParam: setParam, getParams: getParams };
})();
