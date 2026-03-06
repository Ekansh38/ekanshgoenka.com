// ANSI escape codes
const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const BLUE   = '\x1b[34m'
const CYAN   = '\x1b[36m'
const WHITE  = '\x1b[97m'
const GRAY   = '\x1b[90m'

const b      = (s) => `${BOLD}${s}${RESET}`
const dim    = (s) => `${DIM}${GRAY}${s}${RESET}`
const accent = (s) => `${BLUE}${s}${RESET}`
const label  = (s) => `${BOLD}${CYAN}${s}${RESET}`
const muted  = (s) => `${GRAY}${s}${RESET}`
const hi     = (s) => `${BOLD}${WHITE}${s}${RESET}`

const divider = dim('─'.repeat(52))

const terminal = `
${dim('╔' + '═'.repeat(52) + '╗')}
${dim('║')}  ${hi('ekansh goenka')}  ${muted('/ bytecolony')}                  ${dim('║')}
${dim('║')}  ${muted('systems · protocols · Singapore')}              ${dim('║')}
${dim('╚' + '═'.repeat(52) + '╝')}

  ${muted('github')}    github.com/ekanshgoenka
  ${muted('youtube')}   youtube.com/@bytecolony
  ${muted('itch.io')}   ekanshgoenka.itch.io
  ${muted('web')}       ekanshgoenka.com

${divider}
  ${label('PROJECTS')}
${divider}

  ${b('byte-space')}   ${muted('Go · active')}
  ${muted('└')} 1980s internet simulator. HTTP, SMTP, DNS, Telnet
    from scratch — no libraries. Unix domain sockets.
    ${accent('→ ekanshgoenka.com/projects/byte-space')}

  ${b('GENO')}         ${muted('Go · in progress')}
  ${muted('└')} Genetic evolution simulator. Real genomes encoding
    speed, aggression, sight, fertility. Bubbletea TUI.
    ${accent('→ ekanshgoenka.com/projects/geno')}

${divider}
  ${label('GAMES')}
${divider}

  ${b('[game 1]')}     ${muted('Godot')}
  ${muted('└')} One line description.
    ${accent('→ ekanshgoenka.itch.io/game-1')}

  ${b('[game 2]')}     ${muted('Godot')}
  ${muted('└')} One line description.
    ${accent('→ ekanshgoenka.itch.io/game-2')}

${divider}
  ${label('MUSIC')}
${divider}

  ${b('btop')}         ${muted('experimental album · in production · 2025')}
  ${muted('└')} Bitcrushed percussion, degraded jazz samples,
    terminal textures. Five tracks. Near-monochrome art.

${divider}
  ${label('WRITING')}
${divider}

  ${b("I'm doing well in school, but will I do well in life?")}
    ${accent('→ ekanshgoenka.com/writing/school-vs-life')}

${divider}
  ${label('NOW')}
${divider}

  byte-space shell · GENO sprint · finishing btop · SASMO

${dim('─'.repeat(52))}
  ${muted('ekansh goenka · 2025 · ekanshgoenka.com')}

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
