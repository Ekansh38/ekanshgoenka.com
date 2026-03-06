import fs from 'fs'
import nodePath from 'path'

// ANSI escape codes
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const STEEL  = '\x1b[38;5;111m'  // #87afff — Tokyo Night blue
const WHITE  = '\x1b[97m'
const GRAY   = '\x1b[90m'

const b      = (s) => `${BOLD}${s}${RESET}`
const dim    = (s) => `${DIM}${GRAY}${s}${RESET}`
const accent = (s) => `${STEEL}${s}${RESET}`
const label  = (s) => `${BOLD}${STEEL}${s}${RESET}`
const muted  = (s) => `${GRAY}${s}${RESET}`
const hi     = (s) => `${BOLD}${WHITE}${s}${RESET}`

const W     = 56
const rule  = dim('─'.repeat(W))
const thick = dim('━'.repeat(W))
const back  = `  ${muted('←')} ${dim('curl -L ekanshgoenka.com | less -R')}`

// ─── content helpers ──────────────────────────────────────────────────────────

function readMd(rel) {
  try {
    const raw = fs.readFileSync(nodePath.join(process.cwd(), rel), 'utf8')
    const parts = raw.split(/^---\s*$/m)
    if (parts.length < 3) return { fm: {}, body: raw.trim() }
    const body = parts.slice(2).join('---').trim()
    const fm = {}
    for (const line of parts[1].trim().split('\n')) {
      const i = line.indexOf(':')
      if (i > 0) {
        const key = line.slice(0, i).trim()
        const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
        fm[key] = val
      }
    }
    return { fm, body }
  } catch {
    return { fm: {}, body: '' }
  }
}

function bodyLines(body) {
  return body.split('\n').filter(l => l.trim())
}

// ─── read content ─────────────────────────────────────────────────────────────

const nowMd    = readMd('content/now/_index.md')
const bspaceMd = readMd('content/projects/byte-space/_index.md')
const genoMd   = readMd('content/projects/geno/_index.md')
const musicMd  = readMd('content/music/_index.md')
const gamesMd  = readMd('content/games/_index.md')

const nowLines    = bodyLines(nowMd.body)
const nowUpdated  = nowMd.fm.updated || ''
const bspaceLines = bodyLines(bspaceMd.body)
const genoLines   = bodyLines(genoMd.body)

// ─── pages ────────────────────────────────────────────────────────────────────

const MAIN = `
${thick}
  ${hi('Ekansh Goenka')}  ${muted('/ bytecolony')}
  ${muted('systems · protocols · Singapore')}
${thick}

  ${muted('tip:')} ${dim('curl -L ekanshgoenka.com | less -R')}

  ${muted('github')}    github.com/ekanshgoenka
  ${muted('youtube')}   youtube.com/@bytecolony
  ${muted('itch.io')}   ekanshgoenka.itch.io
  ${muted('web')}       ekanshgoenka.com

${rule}
  ${label('PROJECTS')}
${rule}

  ${b('byte-space')}  ${muted(`${bspaceMd.fm.stack || 'Go'} · ${bspaceMd.fm.status || 'active'}`)}
  ${muted('│')}  ${bspaceMd.fm.summary || ''}
  ${muted('└─')} ${accent('curl -L ekanshgoenka.com/byte-space | less -R')}

  ${b('GENO')}        ${muted(`${genoMd.fm.stack || 'Go'} · ${genoMd.fm.status || 'in progress'}`)}
  ${muted('│')}  ${genoMd.fm.summary || ''}
  ${muted('└─')} ${accent('curl -L ekanshgoenka.com/geno | less -R')}

${rule}
  ${label('GAMES')}
${rule}

  ${b('Untitled Game')}  ${muted('Godot')}
  ${muted('└─')} ${accent('ekanshgoenka.itch.io/untitled-game')}

${rule}
  ${label('MUSIC')}
${rule}

  ${b('btop')}        ${muted('experimental · in production · 2025')}
  ${muted('│')}  Bitcrushed percussion, degraded jazz samples,
  ${muted('│')}  terminal textures. Five tracks. Near-monochrome art.
  ${muted('└─')} ${dim('unreleased')}

${rule}
  ${label('NOW')}
${rule}

${nowLines.map(l => `  ${muted(l)}`).join('\n')}${nowUpdated ? `\n  ${muted('— ' + nowUpdated)}` : ''}
  ${muted('└─')} ${accent('curl -L ekanshgoenka.com/now | less -R')}

${rule}
  ${label('PAGES')}  ${muted('(short paths)')}
${rule}

  ${accent('/byte-space')}    ${accent('/geno')}    ${accent('/now')}    ${accent('/music')}    ${accent('/games')}

${thick}
  ${muted('Ekansh Goenka · 2026 · ekanshgoenka.com')}
${thick}

`

const BYTE_SPACE = `
${thick}
  ${hi('byte-space')}  ${muted(`${bspaceMd.fm.stack || 'Go'} · ${bspaceMd.fm.status || 'active'}`)}
  ${muted('1980s internet simulator')}
${thick}

  ${muted('github')}    ${bspaceMd.fm.github?.replace('https://', '') || 'github.com/ekanshgoenka/byte-space'}
  ${muted('youtube')}   youtube.com/@bytecolony
  ${muted('web')}       ekanshgoenka.com/projects/byte-space

${rule}
  ${label('ABOUT')}
${rule}

  ${bspaceLines.join('\n  ')}

${rule}
  ${label('ARTICLES')}
${rule}

  ${b('Protocol Implementations')}
  ${muted('└─')} ${accent('ekanshgoenka.com/projects/byte-space/protocols')}

  ${b('ByteShell Design')}
  ${muted('└─')} ${accent('ekanshgoenka.com/projects/byte-space/shell')}

  ${b('The IPC System')}
  ${muted('└─')} ${accent('ekanshgoenka.com/projects/byte-space/ipc')}

${thick}
${back}
${thick}

`

const GENO = `
${thick}
  ${hi('GENO')}  ${muted(`${genoMd.fm.stack || 'Go'} · ${genoMd.fm.status || 'in progress'}`)}
  ${muted('Genetic evolution simulator')}
${thick}

  ${muted('github')}    ${genoMd.fm.github?.replace('https://', '') || 'github.com/ekanshgoenka/geno'}
  ${muted('youtube')}   youtube.com/@bytecolony
  ${muted('web')}       ekanshgoenka.com/projects/geno

${rule}
  ${label('ABOUT')}
${rule}

  ${genoLines.join('\n  ')}

${thick}
${back}
${thick}

`

const NOW = `
${thick}
  ${hi('now')}${nowUpdated ? `  ${muted('— ' + nowUpdated)}` : ''}
${thick}

${nowLines.map(l => `  ${l}`).join('\n')}

${thick}
${back}
${thick}

`

const MUSIC = `
${thick}
  ${hi('music')}
${thick}

  ${b('btop')}        ${muted('experimental · in production · 2025')}
  ${muted('│')}  Bitcrushed percussion, degraded jazz samples,
  ${muted('│')}  terminal textures. Five tracks. Near-monochrome art.
  ${muted('│')}  Sounds like a computer trying to remember
  ${muted('│')}  what music sounded like.
  ${muted('└─')} ${dim('unreleased — no release date set')}

${thick}
${back}
${thick}

`

const GAMES = `
${thick}
  ${hi('games')}
${thick}

  ${b('Untitled Game')}  ${muted('Godot')}
  ${muted('└─')} ${accent('ekanshgoenka.itch.io/untitled-game')}

${thick}
${back}
${thick}

`

const notFound = (urlPath) => `
${thick}
  ${hi('not found')}  ${muted(urlPath)}
${thick}

${rule}
  ${label('available pages')}
${rule}

  ${accent('/')}              main
  ${accent('/byte-space')}    1980s internet simulator
  ${accent('/geno')}          genetic evolution simulator
  ${accent('/now')}           what I'm up to
  ${accent('/music')}         music
  ${accent('/games')}         games

${thick}
  ${muted('curl -L ekanshgoenka.com | less -R')}
${thick}

`

// ─── routing ──────────────────────────────────────────────────────────────────

const routes = {
  '/':                      MAIN,
  '/byte-space':            BYTE_SPACE,
  '/projects/byte-space':   BYTE_SPACE,
  '/geno':                  GENO,
  '/projects/geno':         GENO,
  '/now':                   NOW,
  '/music':                 MUSIC,
  '/btop':                  MUSIC,
  '/games':                 GAMES,
  '/untitled-game':         GAMES,
}

export default function handler(req, res) {
  const ua = req.headers['user-agent'] || ''
  if (!ua.toLowerCase().startsWith('curl')) {
    res.status(404).end()
    return
  }

  const urlPath = (req.url || '/').split('?')[0].replace(/\/$/, '') || '/'

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(routes[urlPath] ?? notFound(urlPath))
}
