// ANSI escape codes
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const STEEL  = '\x1b[38;5;67m'   // #5f87af — steel blue
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

// ─── pages ────────────────────────────────────────────────────────────────────

const MAIN = `
${thick}
  ${hi('ekansh goenka')}  ${muted('/ bytecolony')}
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

  ${b('byte-space')}  ${muted('Go · active')}
  ${muted('│')}  1980s internet simulator. HTTP, SMTP, DNS, Telnet
  ${muted('│')}  from scratch — no libraries. Unix domain sockets.
  ${muted('└─')} ${accent('curl -L ekanshgoenka.com/byte-space | less -R')}

  ${b('GENO')}        ${muted('Go · in progress')}
  ${muted('│')}  Genetic evolution simulator. Real genomes encoding
  ${muted('│')}  speed, aggression, sight, fertility. Bubbletea TUI.
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

  ${muted('Living in Singapore.')}
  ${muted('Working on byte-space and GENO.')}
  ${muted('Writing occasionally. — March 2026')}
  ${muted('└─')} ${accent('curl -L ekanshgoenka.com/now | less -R')}

${rule}
  ${label('PAGES')}  ${muted('(short paths)')}
${rule}

  ${accent('/byte-space')}    ${accent('/geno')}    ${accent('/now')}    ${accent('/music')}    ${accent('/games')}

${thick}
  ${muted('ekansh goenka · 2026 · ekanshgoenka.com')}
${thick}

`

const BYTE_SPACE = `
${thick}
  ${hi('byte-space')}  ${muted('Go · active')}
  ${muted('1980s internet simulator')}
${thick}

  ${muted('github')}    github.com/ekanshgoenka/byte-space
  ${muted('youtube')}   youtube.com/@bytecolony
  ${muted('web')}       ekanshgoenka.com/projects/byte-space

${rule}
  ${label('ABOUT')}
${rule}

  HTTP, SMTP, DNS, and Telnet implemented from scratch in Go
  — no network libraries. All protocols built on raw TCP.
  Unix domain sockets for inter-process communication.
  ByteShell: a custom terminal emulator built on top.

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
  ${hi('GENO')}  ${muted('Go · in progress')}
  ${muted('Genetic evolution simulator')}
${thick}

  ${muted('github')}    github.com/ekanshgoenka/geno
  ${muted('youtube')}   youtube.com/@bytecolony
  ${muted('web')}       ekanshgoenka.com/projects/geno

${rule}
  ${label('ABOUT')}
${rule}

  Real genomes encoding speed, aggression, sight range,
  and fertility. Agents compete, reproduce, and evolve
  over generations. Terminal UI built with Bubbletea.

${thick}
${back}
${thick}

`

const NOW = `
${thick}
  ${hi('now')}  ${muted('— March 2026')}
${thick}

  Living in Singapore.
  Working on byte-space and GENO.
  Writing occasionally.

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

const notFound = (path) => `
${thick}
  ${hi('not found')}  ${muted(path)}
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

  const path = (req.url || '/').split('?')[0].replace(/\/$/, '') || '/'

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(routes[path] ?? notFound(path))
}
