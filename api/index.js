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

const W = 56
const rule  = dim('─'.repeat(W))
const thick = dim('━'.repeat(W))

const terminal = `
${thick}
  ${hi('ekansh goenka')}  ${muted('/ bytecolony')}
  ${muted('systems · protocols · Singapore')}
${thick}

  ${muted('tip:')} ${dim('curl ekanshgoenka.com | less -R')}

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
  ${muted('└─')} ${accent('ekanshgoenka.com/projects/byte-space')}

  ${b('GENO')}        ${muted('Go · in progress')}
  ${muted('│')}  Genetic evolution simulator. Real genomes encoding
  ${muted('│')}  speed, aggression, sight, fertility. Bubbletea TUI.
  ${muted('└─')} ${accent('ekanshgoenka.com/projects/geno')}

${rule}
  ${label('GAMES')}
${rule}

  ${b('[game 1]')}    ${muted('Godot')}
  ${muted('└─')} ${accent('ekanshgoenka.itch.io/game-1')}

  ${b('[game 2]')}    ${muted('Godot')}
  ${muted('└─')} ${accent('ekanshgoenka.itch.io/game-2')}

${rule}
  ${label('MUSIC')}
${rule}

  ${b('btop')}        ${muted('experimental · in production · 2025')}
  ${muted('│')}  Bitcrushed percussion, degraded jazz samples,
  ${muted('│')}  terminal textures. Five tracks. Near-monochrome art.
  ${muted('└─')} ${dim('unreleased')}

${rule}
  ${label('WRITING')}
${rule}

  ${b("I'm doing well in school, but will I do well in life?")}
  ${muted('└─')} ${accent('ekanshgoenka.com/writing/school-vs-life')}

${rule}
  ${label('NOW')}
${rule}

  ${muted('Living in Singapore.')}
  ${muted('Working on byte-space and GENO.')}
  ${muted('Writing occasionally. — March 2026')}

${thick}
  ${muted('ekansh goenka · 2025 · ekanshgoenka.com')}
${thick}

`

export default function handler(req, res) {
  const ua = req.headers['user-agent'] || ''
  const isCurl = ua.toLowerCase().startsWith('curl')

  if (isCurl) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.send(terminal)
  } else {
    res.status(404).end()
  }
}
