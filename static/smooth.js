// static/smooth.js
// SmoothLife — continuous cellular automaton (Rafler 2011)
// A generalisation of Conway's Life to continuous-valued cells [0,1].
// Uses FFT-based convolution for O(N² log N) performance.
//
// Exposes window.SmoothLife for integration with the main bg system.
// Loaded after script.js; adds 'smooth' as a fourth bg mode.

window.SmoothLife = (function () {
  'use strict';

  // ── grid config ──────────────────────────────────────────────────
  var N    = 128;   // grid size — must stay power of 2
  var NN   = N * N;
  var LOG2 = 7;     // log2(128)

  // ── SmoothLife parameters (Rafler 2011 defaults) ─────────────────
  var RI   = 7;     // inner disk radius (M neighbourhood)
  var RO   = 21;    // outer ring radius (N neighbourhood = 3×RI)
  var B1   = 0.278, B2 = 0.365;   // birth interval
  var S1   = 0.267, S2 = 0.445;   // survival interval
  var AN   = 0.028, AM = 0.147;   // sigmoid steepness
  var DT   = 0.1;   // dt for smooth state update

  // ── visual params ────────────────────────────────────────────────
  var OPACITY = 0.75;
  var GLOW    = 0;

  // ── pre-allocated typed-array buffers (zero GC per frame) ────────
  var grid = new Float32Array(NN);

  // FFT work buffers
  var gRe  = new Float64Array(NN);
  var gIm  = new Float64Array(NN);
  var mRe  = new Float64Array(NN);  // inner (M) convolution
  var mIm  = new Float64Array(NN);
  var nRe  = new Float64Array(NN);  // outer (N) convolution
  var nIm  = new Float64Array(NN);
  var kMRe = new Float64Array(NN);  // inner kernel (FFT'd at init)
  var kMIm = new Float64Array(NN);
  var kNRe = new Float64Array(NN);  // outer kernel (FFT'd at init)
  var kNIm = new Float64Array(NN);

  // ── twiddle-factor table: exp(-2πi·k/N), k = 0..N-1 ─────────────
  var twCos = new Float64Array(N);
  var twSin = new Float64Array(N);
  (function () {
    var f = -2.0 * Math.PI / N;
    for (var k = 0; k < N; k++) { twCos[k] = Math.cos(f * k); twSin[k] = Math.sin(f * k); }
  }());

  // ── bit-reversal permutation table ───────────────────────────────
  var BITREV = new Uint8Array(N);
  (function () {
    for (var i = 0; i < N; i++) {
      var rev = 0, x = i;
      for (var b = 0; b < LOG2; b++) { rev = (rev << 1) | (x & 1); x >>= 1; }
      BITREV[i] = rev;
    }
  }());

  // ── 1-D in-place Cooley-Tukey FFT ────────────────────────────────
  // re, im : flat Float64Array; off : row offset; inv : boolean
  function fft1d(re, im, off, inv) {
    var i, j, t, a, b, wr, wi, eR, eI, oR, oI, tw, len, half, step;
    // bit-reversal permutation
    for (i = 0; i < N; i++) {
      j = BITREV[i];
      if (i < j) {
        t = re[off+i]; re[off+i] = re[off+j]; re[off+j] = t;
        t = im[off+i]; im[off+i] = im[off+j]; im[off+j] = t;
      }
    }
    // butterfly stages
    for (len = 2; len <= N; len <<= 1) {
      step = (N / len) | 0; half = len >> 1;
      for (i = 0; i < N; i += len) {
        tw = 0;
        for (j = 0; j < half; j++) {
          a  = off + i + j;  b  = a + half;
          wr = twCos[tw]; wi = inv ? -twSin[tw] : twSin[tw];
          eR = re[a]; eI = im[a];
          oR = re[b]*wr - im[b]*wi;
          oI = re[b]*wi + im[b]*wr;
          re[a] = eR + oR;  im[a] = eI + oI;
          re[b] = eR - oR;  im[b] = eI - oI;
          tw = (tw + step) & (N - 1);
        }
      }
    }
    if (inv) {
      var invN = 1.0 / N;
      for (i = 0; i < N; i++) { re[off+i] *= invN; im[off+i] *= invN; }
    }
  }

  // ── in-place square-matrix transpose ─────────────────────────────
  // Avoids strided column access in fft2d (cache-friendly).
  function transpose(a) {
    var x, y, i, j, t;
    for (y = 0; y < N; y++) {
      for (x = y + 1; x < N; x++) {
        i = y*N+x; j = x*N+y; t = a[i]; a[i] = a[j]; a[j] = t;
      }
    }
  }

  // ── 2-D FFT via row-FFT → transpose → row-FFT → transpose ────────
  function fft2d(re, im, inv) {
    var y;
    for (y = 0; y < N; y++) fft1d(re, im, y * N, inv);
    transpose(re); transpose(im);
    for (y = 0; y < N; y++) fft1d(re, im, y * N, inv);
    transpose(re); transpose(im);
  }

  // ── build + FFT both convolution kernels ─────────────────────────
  // Inner disk K_M (radius RI), outer annulus K_N (RI < r < RO).
  // Centered at origin using wrap-around (toroidal).
  function buildKernels() {
    var x, y, dx, dy, d, i, sumM = 0, sumN = 0;
    for (i = 0; i < NN; i++) { kMRe[i] = kMIm[i] = kNRe[i] = kNIm[i] = 0; }
    for (y = 0; y < N; y++) {
      dy = y > (N >> 1) ? y - N : y;
      for (x = 0; x < N; x++) {
        dx = x > (N >> 1) ? x - N : x;
        d  = Math.sqrt(dx*dx + dy*dy);
        i  = y * N + x;
        if      (d <= RI)  { kMRe[i] = 1; sumM++; }
        else if (d <  RO)  { kNRe[i] = 1; sumN++; }
      }
    }
    // normalise so each kernel sums to 1
    var invM = 1.0 / sumM, invN = 1.0 / sumN;
    for (i = 0; i < NN; i++) { kMRe[i] *= invM; kNRe[i] *= invN; }
    // forward-FFT the kernels once — reused every frame
    fft2d(kMRe, kMIm, false);
    fft2d(kNRe, kNIm, false);
  }

  // ── SmoothLife sigmoid & transition function ─────────────────────
  function sig(x, a, alpha) {
    return 1.0 / (1.0 + Math.exp(-(x - a) * 4.0 / alpha));
  }
  function sigM(lo, hi, m) {
    var s = sig(m, 0.5, AM);
    return lo * (1.0 - s) + hi * s;
  }
  function transition(n, m) {
    // born: n in [b1,b2], survive: n in [s1,s2], modulated by m
    return sig(n, sigM(B1, S1, m), AN) * (1.0 - sig(n, sigM(B2, S2, m), AN));
  }

  // ── one simulation step (FFT convolution + transition) ───────────
  function step() {
    var i, m, n, f, v;
    // load grid into real part of complex FFT buffer
    for (i = 0; i < NN; i++) { gRe[i] = grid[i]; gIm[i] = 0; }
    // single forward FFT of the grid — reused for both kernels
    fft2d(gRe, gIm, false);
    // complex multiply: grid_FFT × kernel_FFT
    for (i = 0; i < NN; i++) {
      mRe[i] = gRe[i]*kMRe[i] - gIm[i]*kMIm[i];
      mIm[i] = gRe[i]*kMIm[i] + gIm[i]*kMRe[i];
      nRe[i] = gRe[i]*kNRe[i] - gIm[i]*kNIm[i];
      nIm[i] = gRe[i]*kNIm[i] + gIm[i]*kNRe[i];
    }
    // inverse FFT → real-space M and N averages
    fft2d(mRe, mIm, true);
    fft2d(nRe, nIm, true);
    // apply dt-based smooth update: creates flowing wave-like motion
    for (i = 0; i < NN; i++) {
      m = mRe[i]; if (m < 0) m = 0; else if (m > 1) m = 1;
      n = nRe[i]; if (n < 0) n = 0; else if (n > 1) n = 1;
      f = transition(n, m);
      v = grid[i] + DT * (2.0 * f - 1.0);
      grid[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  }

  // ── offscreen canvas for rendering ───────────────────────────────
  var offscreen = null, offCtx = null, imgData = null;

  function initCanvas() {
    offscreen        = document.createElement('canvas');
    offscreen.width  = N;
    offscreen.height = N;
    offCtx   = offscreen.getContext('2d');
    imgData  = offCtx.createImageData(N, N);
  }

  // Draw the N×N grid upscaled to W×H with bilinear smoothing.
  // Color = CSS --accent, alpha = cell value × OPACITY.
  function draw(ctx, W, H) {
    var hex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    var R = parseInt(hex.slice(1, 3), 16);
    var G = parseInt(hex.slice(3, 5), 16);
    var B = parseInt(hex.slice(5, 7), 16);
    var d = imgData.data;
    for (var i = 0; i < NN; i++) {
      var j = i << 2;
      d[j] = R; d[j+1] = G; d[j+2] = B;
      d[j+3] = (grid[i] * OPACITY * 255) | 0;
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (GLOW > 0) ctx.filter = 'blur(' + GLOW + 'px)';
    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.restore();
  }

  // ── initial seeding ───────────────────────────────────────────────
  function seed() {
    var i, b, cx, cy, r, r2, x, y, dx, dy;
    for (i = 0; i < NN; i++) grid[i] = 0;
    // scatter random filled discs of random sizes
    for (b = 0; b < 40; b++) {
      cx = (Math.random() * N) | 0;
      cy = (Math.random() * N) | 0;
      r  = 4 + Math.random() * (RO * 0.9);
      r2 = r * r;
      for (y = 0; y < N; y++) {
        dy = y - cy;
        for (x = 0; x < N; x++) {
          dx = x - cx;
          if (dx*dx + dy*dy < r2) {
            grid[y*N + x] = Math.random() > 0.4 ? 1.0 : 0.0;
          }
        }
      }
    }
  }

  // ── public API ────────────────────────────────────────────────────
  var initialized = false;

  function init() {
    if (!offscreen) initCanvas();
    buildKernels();
    if (!initialized) { seed(); initialized = true; }
  }

  function reset() {
    buildKernels();
    seed();
  }

  function setParam(key, val) {
    switch (key) {
      case 'smooth.opacity':
        OPACITY = Math.max(0.01, Math.min(1, parseFloat(val) || OPACITY));
        return true;
      case 'smooth.glow':
        GLOW = Math.max(0, Math.min(20, parseFloat(val) || 0));
        return true;
      case 'smooth.ri':
        RI = Math.max(1, Math.min(N >> 2, Math.round(parseFloat(val)) || RI));
        RO = RI * 3;
        buildKernels();
        return true;
      case 'smooth.dt':
        DT = Math.max(0.01, Math.min(1, parseFloat(val) || DT));
        return true;
    }
    return false;
  }

  function getParams() {
    return {
      'smooth.opacity': OPACITY,
      'smooth.glow':    GLOW,
      'smooth.ri':      RI,
      'smooth.dt':      DT,
    };
  }

  return {
    init:      init,
    reset:     reset,
    step:      step,
    draw:      draw,
    seed:      seed,
    setParam:  setParam,
    getParams: getParams,
  };
}());
