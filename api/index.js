const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'

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

export default function handler(req, res) {
  const ua = req.headers['user-agent'] || ''
  if (!ua.toLowerCase().startsWith('curl')) {
    res.status(404).end()
    return
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(COW)
}
