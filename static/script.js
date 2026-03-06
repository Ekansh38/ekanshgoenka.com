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
// BG EFFECT — Animated Lissajous dot field
// Math: sin(A·x_norm·2π − t) × sin(B·y_norm·2π − t·B/A)
//   produces a 2D wave interference pattern with A×B = 6 lobes
//   (3:2 Lissajous ratio) that slowly sweeps across the grid.
// To remove: delete this entire section from script.js,
//            delete the BG EFFECT block in style.css,
//            remove <canvas id="bg-canvas"> from baseof.html
// ================================================================
(function () {
  var canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var SPACING = 26;    // px between dots
  var BASE_R  = 1.4;   // base dot radius in px
  var A = 3, B = 2;    // Lissajous frequency ratio a:b  (change for different patterns)
  var SPEED = 0.00055; // radians per millisecond

  var W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function loop(ts) {
    var t    = ts * SPEED;
    var dark = isDark();
    var rgb  = dark ? '169,177,214' : '52,59,88';
    var lo   = dark ? 0.10 : 0.14;
    var hi   = dark ? 0.48 : 0.58;

    ctx.clearRect(0, 0, W, H);

    var cols = Math.ceil(W / SPACING) + 1;
    var rows = Math.ceil(H / SPACING) + 1;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = c * SPACING;
        var y = r * SPACING;

        // Lissajous-style 2-D standing wave interference:
        // sin(A · x̂ · τ − t)  ×  sin(B · ŷ · τ − t · B/A)
        var px = A * (x / W) * (2 * Math.PI) - t;
        var py = B * (y / H) * (2 * Math.PI) - t * (B / A);
        var v  = Math.sin(px) * Math.sin(py); // range [-1, 1]
        var intensity = (v + 1) * 0.5;        // range [0, 1]

        var opacity = lo + intensity * (hi - lo);
        var radius  = BASE_R * (0.5 + intensity);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + rgb + ',' + opacity + ')';
        ctx.fill();
      }
    }

    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);
})();
// ================================================================
// END BG EFFECT
// ================================================================
