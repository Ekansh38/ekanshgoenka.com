// ── ANSI ──────────────────────────────────────────────────────────────────────
const W    = '\x1b[97m'      // white  — rain head
const GB   = '\x1b[92m'      // bright green — top of trail
const G    = '\x1b[32m'      // green — mid trail
const GD   = '\x1b[2;32m'    // dim green — tail + bg text
const RESET = '\x1b[0m'
const CLEAR = '\x1b[2J\x1b[H'
const HOME  = '\x1b[H'
const HIDE  = '\x1b[?25l'
const SHOW  = '\x1b[?25h'

const COLS = 80, ROWS = 24
const RC = '0123456789abcdefghijklmnopqrstuvwxyz!@#$%&*<>{}|~'
const rch = () => RC[Math.floor(Math.random() * RC.length)]
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Background text (visible through rain gaps) ────────────────────────────
const BG_TEXT = 'USE A BROWSER, YOU NERD'
const BG_ROW  = Math.floor(ROWS / 2)
const BG_COL  = Math.floor((COLS - BG_TEXT.length) / 2)

function makeBg() {
  const g = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
  for (let i = 0; i < BG_TEXT.length; i++) g[BG_ROW][BG_COL + i] = BG_TEXT[i]
  return g
}

// ── Rain columns ───────────────────────────────────────────────────────────
function initRain() {
  return Array.from({ length: COLS }, () => ({
    y:   -Math.floor(Math.random() * ROWS),
    spd:  0.3 + Math.random() * 0.5,
    len:  4   + Math.floor(Math.random() * 9),
  }))
}

function stepRain(cols) {
  for (const c of cols) {
    c.y += c.spd
    if (c.y - c.len > ROWS) {          // entire stream below screen — reset
      c.y   = -Math.floor(Math.random() * 8)
      c.len =  4 + Math.floor(Math.random() * 9)
      c.spd =  0.3 + Math.random() * 0.5
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
      const dist = hy - y              // 0=head, 1..len=trail above head

      let ch = null, color = ''

      if (dist === 0) {
        ch = rch(); color = W          // bright white head
      } else if (dist > 0 && dist <= col.len) {
        ch = rch()
        const t = dist / col.len       // 0=near head, 1=tail
        color = t < 0.3 ? GB : t < 0.7 ? G : GD
      }

      if (ch && fadeRatio > 0 && Math.random() < fadeRatio) ch = null

      if (ch)       row += color + ch + RESET
      else if (bg[y][x]) row += GD + bg[y][x] + RESET
      else          row += ' '
    }
    out += row + '\n'
  }
  return out
}

// ── Final message ─────────────────────────────────────────────────────────
const END = `${RESET}




        ${GD}use a browser next time.${RESET}

        ${GB}cause i use arch, by the way.${RESET}




`

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
