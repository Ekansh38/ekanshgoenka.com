// ── ANSI ──────────────────────────────────────────────────────────────────────
const RAIN  = '\x1b[34m'      // blue rain
const RAIND = '\x1b[2;34m'    // dim blue trail
const BG    = '\x1b[1;97m'    // bold bright white — background text
const RESET = '\x1b[0m'
const CLEAR = '\x1b[2J\x1b[H'
const HOME  = '\x1b[H'
const HIDE  = '\x1b[?25l'
const SHOW  = '\x1b[?25h'

const COLS = 80, ROWS = 24
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Background text ────────────────────────────────────────────────────────
const BG_TEXT = 'USE  A  BROWSER,  YOU  NERD'
const BG_ROW  = Math.floor(ROWS / 2)
const BG_COL  = Math.floor((COLS - BG_TEXT.length) / 2)

function makeBg() {
  const g = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
  for (let i = 0; i < BG_TEXT.length; i++) g[BG_ROW][BG_COL + i] = BG_TEXT[i]
  return g
}

// ── Rain drops ─────────────────────────────────────────────────────────────
// Real rain: sparse columns, short streaks of |, tip is .
function initRain() {
  return Array.from({ length: COLS }, () => ({
    y:    -Math.floor(Math.random() * ROWS * 2),
    spd:   0.6 + Math.random() * 0.7,
    len:   2 + Math.floor(Math.random() * 4),
    on:    Math.random() > 0.45,    // ~55% of columns have rain
  }))
}

function stepRain(cols) {
  for (const c of cols) {
    if (!c.on) continue
    c.y += c.spd
    if (c.y - c.len > ROWS) {
      c.y   = -Math.floor(Math.random() * 6)
      c.len =  2 + Math.floor(Math.random() * 4)
      c.spd =  0.6 + Math.random() * 0.7
      c.on  =  Math.random() > 0.2   // occasionally turn a column off/on
    }
  }
}

function renderFrame(cols, bg, fadeRatio = 0) {
  let out = HOME
  for (let y = 0; y < ROWS; y++) {
    let row = ''
    for (let x = 0; x < COLS; x++) {
      const col  = cols[x]
      const hy   = Math.floor(col.y)
      const dist = hy - y

      let ch = null, color = ''

      if (col.on) {
        if (dist === 0) {
          ch = '.'; color = RAIN          // tip of drop
        } else if (dist > 0 && dist <= col.len) {
          ch = '|'; color = dist < 2 ? RAIN : RAIND
        }
      }

      if (ch && fadeRatio > 0 && Math.random() < fadeRatio) ch = null

      if (ch)            row += color + ch + RESET
      else if (bg[y][x]) row += BG + bg[y][x] + RESET
      else               row += ' '
    }
    out += row + '\n'
  }
  return out
}

// ── Final message ─────────────────────────────────────────────────────────
const PAD = ' '.repeat(16)
const END  = `${RESET}\n\n\n\n\n\n\n\n\n${PAD}\x1b[1;97mJUST USE A REGULAR BROWSER!!!\x1b[0m\n\n\n\n\n\n\n\n\n`

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const ua = req.headers['user-agent'] || ''
  if (!ua.toLowerCase().startsWith('curl')) { res.status(404).end(); return }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache')

  res.write(CLEAR + HIDE)

  const bg   = makeBg()
  const cols = initRain()

  // main rain — 8s at 80ms = 100 frames
  for (let f = 0; f < 100; f++) {
    stepRain(cols)
    res.write(renderFrame(cols, bg))
    await sleep(80)
  }

  // fade out — ~1s = 12 frames
  for (let f = 0; f < 12; f++) {
    stepRain(cols)
    res.write(renderFrame(cols, bg, (f + 1) / 12))
    await sleep(80)
  }

  res.write(CLEAR + END + SHOW + RESET)
  res.end()
}
