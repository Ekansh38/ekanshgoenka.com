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

// Read all .md files in a directory (excluding _index.md), sorted by date desc
function readDir(rel) {
  try {
    const dir = nodePath.join(process.cwd(), rel)
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== '_index.md')
      .map(f => ({ slug: f.replace(/\.md$/, ''), ...readMd(nodePath.join(rel, f)) }))
      .sort((a, b) => (b.fm.date || '') > (a.fm.date || '') ? 1 : -1)
  } catch {
    return []
  }
}

// Parse [params] section from hugo.toml — no external deps needed
function readTomlParams(rel) {
  try {
    const raw = fs.readFileSync(nodePath.join(process.cwd(), rel), 'utf8')
    const params = {}
    let inParams = false
    for (const line of raw.split('\n')) {
      if (line.trim() === '[params]') { inParams = true; continue }
      if (inParams && line.trim().startsWith('[')) { inParams = false; continue }
      if (inParams) {
        const m = line.match(/^\s*(\w+)\s*=\s*"([^"]*)"/)
        if (m) params[m[1]] = m[2]
      }
    }
    return params
  } catch { return {} }
}

function bodyLines(body) {
  return body.split('\n').filter(l => l.trim())
}

// ─── read content ─────────────────────────────────────────────────────────────

const site     = readTomlParams('hugo.toml')
const nowMd    = readMd('content/now/_index.md')
const bspaceMd = readMd('content/projects/byte-space/_index.md')
const genoMd   = readMd('content/projects/geno/_index.md')
const games    = readDir('content/games')
const music    = readDir('content/music')
const bspaceArticles = readDir('content/projects/byte-space')

const nowLines   = bodyLines(nowMd.body)
const nowUpdated = nowMd.fm.updated || ''

// Social links — single source of truth: hugo.toml [params]
const githubUrl  = (site.github  || '').replace('https://', '')
const youtubeUrl = (site.youtube || '').replace('https://', '')
const itchUrl    = (site.itchio  || '').replace('https://', '')

// ─── pages ────────────────────────────────────────────────────────────────────

const MAIN = `
${thick}
  ${hi('Ekansh Goenka')}  ${muted('/ bytecolony')}
  ${muted('systems · protocols · Singapore')}
${thick}

  ${muted('tip:')} ${dim('curl -L ekanshgoenka.com | less -R')}

  ${muted('github')}    ${githubUrl}
  ${muted('youtube')}   ${youtubeUrl}
  ${muted('itch.io')}   ${itchUrl}
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

${games.map(g => `  ${b(g.fm.title || g.slug)}  ${muted(g.fm.engine || '')}
  ${muted('└─')} ${accent((g.fm.itchio || '').replace('https://', ''))}`).join('\n\n')}

${rule}
  ${label('MUSIC')}
${rule}

${music.map(m => {
  const meta = [m.fm.genre, m.fm.status, m.fm.year].filter(Boolean).join(' · ')
  const released = m.fm.status !== 'unreleased' && m.fm.status !== 'in production'
  return `  ${b(m.fm.title || m.slug)}  ${muted(meta)}
  ${muted('│')}  ${m.fm.summary || ''}
  ${muted('└─')} ${released ? accent(m.slug) : dim('unreleased')}`
}).join('\n\n')}

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
  ${muted(bspaceMd.fm.summary || '')}
${thick}

  ${muted('github')}    ${(bspaceMd.fm.github || '').replace('https://', '')}
  ${muted('youtube')}   ${youtubeUrl}
  ${muted('web')}       ekanshgoenka.com/projects/byte-space

${rule}
  ${label('ABOUT')}
${rule}

  ${bodyLines(bspaceMd.body).join('\n  ')}

${rule}
  ${label('ARTICLES')}
${rule}

${bspaceArticles.map(a => `  ${b(a.fm.title || a.slug)}
  ${muted('└─')} ${accent('ekanshgoenka.com/projects/byte-space/' + a.slug)}`).join('\n\n')}

${thick}
${back}
${thick}

`

const GENO = `
${thick}
  ${hi('GENO')}  ${muted(`${genoMd.fm.stack || 'Go'} · ${genoMd.fm.status || 'in progress'}`)}
  ${muted(genoMd.fm.summary || '')}
${thick}

  ${muted('github')}    ${(genoMd.fm.github || '').replace('https://', '')}
  ${muted('youtube')}   ${youtubeUrl}
  ${muted('web')}       ekanshgoenka.com/projects/geno

${rule}
  ${label('ABOUT')}
${rule}

  ${bodyLines(genoMd.body).join('\n  ')}

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

${music.map(m => {
  const lines = bodyLines(m.body)
  const meta = [m.fm.genre, m.fm.status, m.fm.year].filter(Boolean).join(' · ')
  const released = m.fm.status !== 'unreleased' && m.fm.status !== 'in production'
  return `  ${b(m.fm.title || m.slug)}  ${muted(meta)}
${lines.map(l => `  ${muted('│')}  ${l}`).join('\n')}
  ${muted('└─')} ${released ? accent(m.slug) : dim('unreleased — no release date set')}`
}).join('\n\n')}

${thick}
${back}
${thick}

`

const GAMES = `
${thick}
  ${hi('games')}
${thick}

${games.map(g => `  ${b(g.fm.title || g.slug)}  ${muted(g.fm.engine || '')}
  ${muted('└─')} ${accent((g.fm.itchio || '').replace('https://', ''))}`).join('\n\n')}

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
