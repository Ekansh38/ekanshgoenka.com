// ================================================================
// Gray-Scott reaction-diffusion simulation
// Public API: window.GrayScott = { init, reset, step, draw, setParam, getParams }
// ================================================================
(function () {
  var N       = 256;
  var NN      = N * N;
  var Du      = 0.2097;
  var Dv      = 0.105;
  var F       = 0.055;
  var k       = 0.062;
  var OPACITY = 0.85;
  var GLOW    = 0;

  var U    = new Float32Array(NN);
  var V    = new Float32Array(NN);
  var nU   = new Float32Array(NN);
  var nV   = new Float32Array(NN);

  var offscreen    = document.createElement('canvas');
  offscreen.width  = N;
  offscreen.height = N;
  var offCtx = offscreen.getContext('2d');
  var imgData = offCtx.createImageData(N, N);
  var px      = imgData.data;  // Uint8ClampedArray, 4 bytes per pixel

  var initialized = false;

  function idx(x, y) {
    return ((y + N) % N) * N + ((x + N) % N);
  }

  function seed() {
    for (var i = 0; i < NN; i++) { U[i] = 1.0; V[i] = 0.0; }
    var numBlobs = 12 + Math.floor(Math.random() * 8);
    for (var b = 0; b < numBlobs; b++) {
      var cx = Math.floor(N * 0.2 + Math.random() * N * 0.6);
      var cy = Math.floor(N * 0.2 + Math.random() * N * 0.6);
      var r  = 4 + Math.floor(Math.random() * 6);
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (dx*dx + dy*dy <= r*r) {
            var ii = idx(cx + dx, cy + dy);
            U[ii] = 0.5 + (Math.random() * 0.1 - 0.05);
            V[ii] = 0.25 + (Math.random() * 0.1 - 0.05);
          }
        }
      }
    }
  }

  function init() {
    if (!initialized) { seed(); initialized = true; }
  }

  function reset() {
    seed();
    initialized = true;
  }

  function step() {
    var i, x, y, u, v, lap_u, lap_v, uvv;
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        i     = y * N + x;
        u     = U[i];
        v     = V[i];
        lap_u = U[idx(x+1,y)] + U[idx(x-1,y)] + U[idx(x,y+1)] + U[idx(x,y-1)] - 4*u;
        lap_v = V[idx(x+1,y)] + V[idx(x-1,y)] + V[idx(x,y+1)] + V[idx(x,y-1)] - 4*v;
        uvv   = u * v * v;
        nU[i] = u + Du * lap_u - uvv + F * (1 - u);
        nV[i] = v + Dv * lap_v + uvv - (F + k) * v;
        if (nU[i] < 0) nU[i] = 0; else if (nU[i] > 1) nU[i] = 1;
        if (nV[i] < 0) nV[i] = 0; else if (nV[i] > 1) nV[i] = 1;
      }
    }
    var tmp = U; U = nU; nU = tmp;
    tmp = V; V = nV; nV = tmp;
  }

  function accentRgb() {
    var hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (hex.charAt(0) === '#') {
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }
    return [122, 162, 247];
  }

  function draw(ctx, W, H) {
    var rgb = accentRgb();
    var r = rgb[0], g = rgb[1], b = rgb[2];
    for (var i = 0; i < NN; i++) {
      var v   = V[i];
      var p   = i * 4;
      px[p]   = r;
      px[p+1] = g;
      px[p+2] = b;
      px[p+3] = (v * OPACITY * 255) | 0;
    }
    offCtx.putImageData(imgData, 0, 0);

    if (GLOW > 0) {
      ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',1)';
      ctx.shadowBlur  = GLOW;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.shadowBlur = 0;
  }

  function setParam(key, val) {
    var n = parseFloat(val);
    if (key === 'gs.opacity') { OPACITY = Math.max(0.01, Math.min(1, n || OPACITY)); return true; }
    if (key === 'gs.glow')    { GLOW    = Math.max(0, Math.min(40, n || 0));          return true; }
    if (key === 'gs.f')       { F       = Math.max(0.001, Math.min(0.1, n || F));     return true; }
    if (key === 'gs.k')       { k       = Math.max(0.001, Math.min(0.1, n || k));     return true; }
    return false;
  }

  function getParams() {
    return { 'gs.opacity': OPACITY, 'gs.glow': GLOW, 'gs.f': F, 'gs.k': k };
  }

  window.GrayScott = { init: init, reset: reset, step: step, draw: draw, setParam: setParam, getParams: getParams };
})();
