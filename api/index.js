// ── ANSI ──────────────────────────────────────────────────────────────────────
const BLUE  = '\x1b[34m'
const GHOST = '\x1b[90m'
const CYAN  = '\x1b[36m'
const RESET = '\x1b[0m'
const CLEAR = '\x1b[2J\x1b[H'
const HOME  = '\x1b[H'
const HIDE  = '\x1b[?25l'
const SHOW  = '\x1b[?25h'

// ── Site info (shown after animation) ─────────────────────────────────────────
const COW = `${CYAN}
 ____________________
< still not vim.     >
 --------------------
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||
${RESET}`

// ── Boids ─────────────────────────────────────────────────────────────────────
const GW = 80, GH = 24, N = 30

const sleep = ms => new Promise(r => setTimeout(r, ms))

function dirChar(vx, vy) {
  const a = Math.atan2(vy, vx) * 180 / Math.PI
  if (a >  -22.5 && a <=  22.5) return '>'
  if (a >   22.5 && a <=  67.5) return '╲'
  if (a >   67.5 && a <= 112.5) return 'v'
  if (a >  112.5 && a <= 157.5) return '╱'
  if (a >  157.5 || a <= -157.5) return '<'
  if (a > -157.5 && a <= -112.5) return '╲'
  if (a > -112.5 && a <=  -67.5) return '^'
  return '╱'
}

function initBoids() {
  return Array.from({ length: N }, () => {
    const a = Math.random() * Math.PI * 2
    const s = 0.25 + Math.random() * 0.35
    return { x: Math.random() * GW, y: Math.random() * GH, vx: Math.cos(a) * s, vy: Math.sin(a) * s }
  })
}

function stepBoids(boids, speedScale = 1) {
  const P2 = 15 * 15, S2 = 5 * 5, MAX = 0.6 * speedScale, MIN = 0.15 * speedScale
  for (let i = 0; i < N; i++) {
    const b = boids[i]
    let sx = 0, sy = 0, sc = 0, ax = 0, ay = 0, ac = 0, cx = 0, cy = 0, cc = 0
    for (let j = 0; j < N; j++) {
      if (i === j) continue
      const o = boids[j], dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy
      if (d2 < P2) {
        cx += o.x; cy += o.y; cc++
        ax += o.vx; ay += o.vy; ac++
        if (d2 < S2 && d2 > 0) { const d = Math.sqrt(d2); sx -= dx/d; sy -= dy/d; sc++ }
      }
    }
    if (sc > 0) { b.vx += sx / sc * 0.08; b.vy += sy / sc * 0.08 }
    if (ac > 0) { b.vx += (ax / ac - b.vx) * 0.04; b.vy += (ay / ac - b.vy) * 0.04 }
    if (cc > 0) { b.vx += (cx / cc - b.x) * 0.003; b.vy += (cy / cc - b.y) * 0.003 }
    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
    if (spd > MAX) { b.vx = b.vx / spd * MAX; b.vy = b.vy / spd * MAX }
    else if (spd > 0 && spd < MIN) { b.vx = b.vx / spd * MIN; b.vy = b.vy / spd * MIN }
    b.x = ((b.x + b.vx) % GW + GW) % GW
    b.y = ((b.y + b.vy) % GH + GH) % GH
  }
}

function renderFrame(boids, prev, fadeRatio = 0) {
  const grid = Array.from({ length: GH }, () => new Array(GW).fill(null))

  // ghost trail — one frame behind, darker
  for (const p of prev) {
    const gx = Math.floor(p.x), gy = Math.floor(p.y)
    if (gx >= 0 && gx < GW && gy >= 0 && gy < GH && !grid[gy][gx])
      grid[gy][gx] = { ch: dirChar(p.vx, p.vy), ghost: true }
  }

  // current boids — degrade char to · in second half of fade, random disappear throughout
  for (const b of boids) {
    const gx = Math.floor(b.x), gy = Math.floor(b.y)
    if (gx >= 0 && gx < GW && gy >= 0 && gy < GH)
      if (fadeRatio === 0 || Math.random() > fadeRatio)
        grid[gy][gx] = { ch: fadeRatio > 0.5 ? '·' : dirChar(b.vx, b.vy), ghost: false }
  }

  let out = HOME
  for (let y = 0; y < GH; y++) {
    let row = ''
    for (let x = 0; x < GW; x++) {
      const c = grid[y][x]
      if (!c) row += ' '
      else row += (c.ghost ? GHOST : BLUE) + c.ch + RESET
    }
    out += row + '\n'
  }
  return out
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ua = req.headers['user-agent'] || ''
  if (!ua.toLowerCase().startsWith('curl')) { res.status(404).end(); return }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache')

  res.write(CLEAR + HIDE)

  const boids = initBoids()

  // main simulation — 8 seconds at 80ms = 100 frames
  for (let f = 0; f < 100; f++) {
    const prev = boids.map(b => ({ ...b }))
    stepBoids(boids)
    res.write(renderFrame(boids, prev))
    await sleep(80)
  }

  // fade out — ~1 second = 12 frames
  for (let f = 0; f < 12; f++) {
    const prev = boids.map(b => ({ ...b }))
    stepBoids(boids, 1 - (f / 12) * 0.5)
    res.write(renderFrame(boids, prev, f / 12))
    await sleep(80)
  }

  // clear and show site info
  res.write(CLEAR + COW + SHOW + RESET)
  res.end()
}
