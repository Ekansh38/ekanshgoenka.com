// ================================================================
// TERMINAL DATA — edit this file to update what the terminal
// shows for `cat`, `ls`, `neofetch`, and `whoami` commands.
//
// Structure:
//   projects/<name>  →  desc, stack, status, url
//   music/<name>     →  desc, status, url
//   games/<name>     →  desc, engine  (url comes from itch.io site param)
//   writing          →  (empty until you add writing entries)
//   now              →  plain string shown by `cat now`
// ================================================================

var TERMINAL_DATA = {

  projects: {
    'byte-space': {
      desc: 'terminal-based 1980s internet simulator.\nhttp, smtp, dns, telnet — built from scratch in go.\nmulti-process architecture over unix domain sockets.',
      stack: 'Go',
      status: 'active',
      url: '/projects/byte-space/'
    },
    'geno': {
      desc: 'genetic evolution simulator with a live multi-panel terminal ui.\nbubbletea + lipgloss. simulates trait evolution across generations.',
      stack: 'Go',
      status: 'in progress',
      url: '/projects/geno/'
    }
  },

  music: {
    'btop': {
      desc: 'experimental electronic album.\nbitcrushed percussion, degraded jazz samples, terminal textures.\nfive tracks. releases march 22, 2026.',
      status: 'in production',
      url: '/music/btop/'
    }
  },

  games: {
    'untitled-game': {
      desc: 'a game. made in godot.',
      engine: 'Godot'
      // url is auto-filled from site itch.io param — no need to set it here
    }
  },

  writing: {
    // add entries like:
    // 'my-post': { desc: 'a short description.', url: '/writing/my-post/' }
  },

  now: 'filling in the site. btop drops march 22.'

};
