# ARCADE OVERHAUL v3 — THE DEFINITIVE PLAN
# Execute this file. No Co-Authored-By in any commit. Ever.

---

## PHILOSOPHY

Every page in the arcade should make the visitor say "holy shit" at least once.
Every screen in the tutorial should have an interactive element the user touches.
Nothing is passive. Nothing is a wall of text. Everything responds to you.

---

## BUGS FROM SCREENSHOTS (fix these FIRST)

### 1. Arcade ✦ coins (Image 2+3)
Remove `.arc-hero-coins` div from `layouts/_default/arcade.html`.
Remove `.arc-coin` and `@keyframes arc-coin-bob` from `static/style.css`.

### 2. Terminal backgrounds transparent (Image 4)
All `.tut-mini-term`, `.tut-var-term`, `.tut-preview-term`, `.tut-game-term`
and their child output areas MUST have `background: var(--code-bg, #1a1b26)`.
Currently some have `var(--bg)` or nothing, making them blend into the page.

CSS fix — add to tutorial `<style>`:
```css
.tut-mini-term, .tut-var-term, .tut-game-term, .tut-preview-term {
  background: var(--code-bg, #1a1b26) !important;
}
.tut-term-out, .tut-var-out, .tut-preview-term-out, .tut-loop-out {
  background: var(--code-bg, #1a1b26) !important;
}
```

### 3. Back button invisible (Image 4)
Current: ghost text, `opacity: 0.5`, `font-size: 0.75rem`, no border.
Fix:
```css
#tut-back {
  position: absolute; bottom: 24px; left: 22px;
  background: color-mix(in srgb, var(--border) 30%, transparent);
  border: 1px solid var(--border);
  color: var(--fg); font-family: inherit; font-size: 0.78rem;
  cursor: pointer; opacity: 0; z-index: 10;
  padding: 6px 16px;
  transition: opacity 0.25s, border-color 0.15s;
  pointer-events: none;
}
#tut-back.tut-back-visible { opacity: 0.8; pointer-events: all; }
#tut-back:hover { border-color: var(--accent); }
```

### 4. Loop output colors wrong (Image 5)
Numbers 5,4,3,2,1 should be YELLOW (`#e0af68`), GO! should be GREEN (`#9ece6a`).
Currently using `var(--accent)` which is blue in tokyo-night.
Fix: in the loop step-through JS, hard-code the colors:
```js
line.style.color = '#e0af68'; // yellow for countdown numbers
// and for GO!:
goLine.style.color = '#9ece6a'; // green
```

Also missing: **syntax explanation**. Add above the code block:
```html
<div class="tut-syntax-breakdown">
  <span class="tut-syn-kw">for</span>
  <span class="tut-syn-var">i</span>
  <span class="tut-syn-op">=</span>
  <span class="tut-syn-val" data-label="start">5</span>
  <span class="tut-syn-sep">,</span>
  <span class="tut-syn-val" data-label="stop">1</span>
  <span class="tut-syn-sep">,</span>
  <span class="tut-syn-val" data-label="step">-1</span>
  <span class="tut-syn-kw">do</span>
</div>
```
Each value has a small label underneath (start/stop/step) in muted color.
The labels appear with a staggered fade-in when the screen enters.

Also: tighten code line spacing. Currently lines have too much gap.
Set `.tut-loop-hl-line` to `display: block; line-height: 1.5; padding: 1px 8px;`
instead of the current large spacing.

### 5. Powers io.read overflow (Image 6)
The input box gets cut off on the right edge.
Fix: `.tut-power-demo` needs `overflow: visible` and the io.read demo should
use a simulated cursor instead of a real input element, OR make the input
100% width within the demo area with proper padding.

Simpler fix: change the io demo to not use an `<input>`. Instead, show a 
typewriter animation: "your name: ekansh" appearing letter by letter, then
"hello, ekansh!" below it. The user just watches, doesn't type. This avoids
the overflow entirely and is consistent with the other power demos.

### 6. Final screen cutoff (Image 7)
The starter cards get clipped at the bottom.
Fix: increase `.tut-screen` bottom padding to 160px:
```css
.tut-screen { padding: 60px 24px 160px; }
```
Also ensure `overflow-y: auto` is working (it is, but the padding is insufficient).

### 7. io.read prompt duplication
When a game calls `io.read("your name? ")`, the prompt text appears BOTH:
- In the terminal output (via `_iowrite(prompt)`)
- In the bottom input bar (via `iobuf`)

The user sees the prompt duplicated and the cursor isn't at the prompt.

Fix in `static/script.js`: in the io.read Lua sandbox registration, remove
the `_iowrite(prompt)` call. The prompt should ONLY appear in the bottom bar.

Find the Lua code that registers io.read (search for `_iowrite` near io.read):
Change from:
```lua
if type(prompt)=="string" then _iowrite(prompt) end
```
To:
```lua
if type(prompt)=="string" then iobuf=prompt end
```

So the prompt goes to `iobuf` (picked up by JS for the bottom bar) but does NOT
get printed to the output area.

### 8. Cave game ending unclear
After "a bat swoops! you flee." the game just ends with no indication.
Update CAVE_GAME_CODE everywhere to add clear endings:
```lua
  -- after treasure:
  sound.win()
  print("")
  print(colored("YOU WIN!", color.green))
  -- after bat:
  sound.lose()
  print("")
  print(colored("GAME OVER", color.red))
  -- after leaving:
  sound.click()
  print("")
  print("THE END.")
```

---

## NEW LUA APIs (add to static/script.js sandbox)

### io.getkey() — single keypress, no Enter
Returns the key name as a string: "a", "i", "up", "down", "left", "right",
"space", "enter", "escape", etc.

**Lua registration** (alongside existing io.read):
```lua
io.getkey = function()
  iobuf = "__getkey__"
  return coroutine.yield()
end
```

**JS handling** (in the step function, before the regular io.read path):
When the coroutine yields and `iobuf === '__getkey__'`:
1. Clear iobuf
2. Show `[press any key]` in bottom bar (italic, muted)
3. Hide the text input field
4. Add a one-time keydown listener on `#term-box`
5. On keypress: normalize key name, resume coroutine with it
6. Restore normal input bar

Key name mapping:
- ArrowUp → "up", ArrowDown → "down", ArrowLeft → "left", ArrowRight → "right"
- " " → "space"
- Single characters → lowercase
- Other special keys → lowercase key name

### io.choice(prompt, options) — numbered menu
```lua
io.choice = function(prompt, options)
  if type(options) ~= "table" then return "" end
  if type(prompt) == "string" then print(prompt) end
  for i, opt in ipairs(options) do
    print(colored("[" .. i .. "]", color.cyan) .. " " .. tostring(opt))
  end
  while true do
    local r = io.read("choice (1-" .. #options .. "): ")
    local n = tonumber(r)
    if n and n >= 1 and n <= #options then return options[n] end
    print("pick 1-" .. #options)
  end
end
```

### io.confirm(prompt) — y/n
```lua
io.confirm = function(prompt)
  while true do
    local r = io.read((prompt or "") .. " (y/n) ")
    r = string.lower(r)
    if r == "y" or r == "yes" then return true end
    if r == "n" or r == "no" then return false end
  end
end
```

---

## TUTORIAL REDESIGN — 13 TEACHING SCREENS

The narrative: you're building THE CAVE game. Every screen adds one concept
and one piece of the game. By the end, you run the complete game yourself.

### allScreens array (16 total):
```
 0 = tut-s0        experience check
 1 = tut-s1        PLAY the cave game (interactive)
 2 = tut-s2        print() — the title
 3 = tut-svars     variables — ask for name
 4 = tut-s3        strings — combine text
 5 = tut-s4        if/else — the cave choice
 6 = tut-sloops    for loops — the countdown
 7 = tut-s5        random — treasure or trap
 8 = tut-snet      special powers — sleep/clear/colored/sound
 9 = tut-s6        input controls — io.getkey + mini game
10 = tut-s7        tables & functions — inventory
11 = tut-s8        networking — leaderboard sandbox
12 = tut-s9        edit code & docs
13 = tut-s10       THE COMPLETE GAME — run it
14 = tut-s11       pick a starter
15 = tut-sexpert   expert path
```

IDX_START = 14 (starter picker)
IDX_EXPERT = 15

Newbie flow: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14
Expert flow: 0 → 15 → 14
Skip button: goes to 14

Progress dots: 12 (for screens 2-13, the teaching screens)
Screen 1 (play the game) has no dot — it's the hook, not a lesson.
SCREEN_DOT: {2:0, 3:1, 4:2, 5:3, 6:4, 7:5, 8:6, 9:7, 10:8, 11:9, 12:10, 13:11}

---

### SCREEN 0: Experience check
Keep as-is. Two cards.

### SCREEN 1: PLAY THE CAVE GAME (interactive)
**NOT an auto-play animation. The user plays the actual game.**

A full-width terminal-styled div. The user experiences the cave game firsthand
through a JS-powered interactive sequence (not real Lua — simulated in JS).

**Flow:**
```
Phase 1: Title
  THE CAVE                              (accent color, bold, typed out)
  you stand at the entrance             (typed character by character, 40ms)
  of a dark cave.                       (typed)

Phase 2: Name input
  your name? [____________]             (real input, user types their name)
  → user types, presses Enter
  brave soul [name].                    (fades in, name in accent color)

Phase 3: Choice
  go [i]nside or [l]eave?
  ┌──────────────┐  ┌──────────────┐   (two big buttons appear)
  │   [i]nside   │  │   [l]eave    │
  └──────────────┘  └──────────────┘

  → user clicks one (or presses i/l on keyboard)

Phase 4a: Inside
  you venture inside...                 (cyan, pause 1.5s, screen wipe)
  [coin flip animation: ✦ spinning]     (0.8s spinner)
  you find a chest of gold!             (yellow, sound.win(), particles burst)
  YOU WIN!                              (green, big text)
  OR:
  a bat swoops! you flee.               (red, sound.lose(), screen shake)
  GAME OVER                             (red, big text)

Phase 4b: Leave
  smart choice. you go home safely.     (fade in, sound.click())
  THE END.
```

**After the game completes:**
A line appears: "you just played a game. about 20 lines of Lua."
Then a code snippet fades in showing the ACTUAL game code (highlighted, scrollable).
Then: "let's build it. line by line." + button "start building →"

**Implementation details:**
- Terminal div with `var(--code-bg)` background
- Title bar with dots + "terminal" label
- Typewriter effect: `setInterval` at 40ms per character
- Name input: inline `<input>` styled like terminal (transparent bg, no border,
  caret-color: var(--accent))
- Choice buttons: big, full-width, accent border on hover
- Screen wipe: the output div transitions opacity to 0, clears, transitions back
- Coin flip: a ✦ character that rotates via CSS transform (0.8s)
- Screen shake: `@keyframes shake` applied to the terminal div (0.3s)
- Sound: reuse `playWinSoundFn` / create `playLoseSoundFn`
- Particles: use the existing `burst()` function
- The code reveal at the end uses `highlightLua()` 

This screen should take 30-60 seconds and leave the user excited.

### SCREEN 2: print() — the title (01/12)
**They write their first line of code.**

Heading: "line 1. the title."
Body: "print() writes text to the screen."

TutCodeEditor pre-loaded with:
```lua
print("THE CAVE")
```

Mini terminal below with run button.
Run parses print() calls and displays output with typewriter effect.

After first run: success message + "try changing the text" hint.
Second run with different text: "nice. you renamed your game." + next button.

**Interactive twist:** after they run it, show the EXACT position this line
occupies in the final game — a mini code outline on the right:
```
  ┌ THE CAVE GAME ──────────┐
  │ ► print("THE CAVE")     │  ← you are here
  │   ...                   │
  │   io.read(...)          │
  │   ...                   │
  │   if choice == "i" ...  │
  │   ...                   │
  └─────────────────────────┘
```
This "progress outline" shows up on every screen, highlighting which line(s)
they just learned. It anchors every lesson to the final game.

### SCREEN 3: Variables — ask for name (02/12)
Heading: "variables. store things."
Body: "`local` creates a variable. the value is whatever comes after `=`."

Show code (static, highlighted):
```lua
local name = io.read("your name? ")
```

Terminal below: user types their name, sees it stored.

After Enter: show `name = "ekansh"` in a variable inspector panel:
```
  ┌ variables ──────┐
  │ name = "ekansh" │
  └─────────────────┘
```

This inspector is a new UI element. It shows current variables as they get
created across screens. It persists (the user's name carries forward).

### SCREEN 4: Strings — combine text (03/12)
Heading: "strings. `..` joins them together."
Body: "the `..` operator glues strings end to end."

Interactive element: a STRING BUILDER.
Three draggable/clickable blocks that snap together:
```
  ["brave soul "]  [..]  [name]  [..]  ["."]
```
Each block is a colored chip. The `..` operators connect them.
Below, a live preview shows the result: `brave soul ekansh.`

The user can click the blocks to rearrange or change the string content.
An input field lets them edit the first string.

Then show the actual code:
```lua
print("brave soul " .. name .. ".")
```

Run button: terminal shows the output with their actual name from screen 3.

### SCREEN 5: if/else — the choice (04/12)
Keep the two-panel layout but improve it:

Left panel: the choice buttons + a result area
Right panel: highlighted code with branch visualization

NEW: add a FLOW DIAGRAM between the code and the buttons:
```
         choice?
        /       \
    "i"          else
     |             |
  inside        go home
```
When [i] is clicked: the left branch lights up in accent.
When [l] is clicked: the right branch lights up.

The flow diagram is built with CSS (borders, circles at nodes).
Clicking a branch highlights both the diagram AND the code lines.

### SCREEN 6: for loops — countdown (05/12)
MAJOR IMPROVEMENT from current.

**Syntax breakdown** (new, animated):
```
for   i   =   5   ,   1   ,   -1   do
 ↑         ↑start  ↑stop   ↑step
keyword   "count from 5 down to 1"
```
Labels appear with staggered animation (0.2s delay each).

**Step-through** (improved):
- Output numbers in YELLOW (#e0af68), not accent blue
- GO! in GREEN (#9ece6a)
- Show `i = 5` updating live as user steps (big, prominent number)
- Highlight the active code line during each step
- After completion: the entire output area flashes once and shows
  "loop ran 5 times. try changing the numbers below."

**Mini exercise** (new):
TutCodeEditor with an editable loop:
```lua
for i = 1, 5 do
  print(i)
end
```
Run button: parse the for loop, simulate execution, display output.
Hint: "change 5 to 3 and run again."

### SCREEN 7: Random numbers — treasure or trap (06/12)
**NEW SCREEN.** Currently the cave game's random element isn't taught.

Heading: "randomness. flip the coin."
Body: "`math.random(1, 2)` picks 1 or 2. your game needs surprise."

Interactive element: a SLOT MACHINE.
```
┌─────────────────────────┐
│     ┌───┐               │
│     │ ? │  ← click to   │
│     └───┘    randomize   │
│                          │
│  math.random(1, 2) = ?   │
└─────────────────────────┘
```
Each click: the number spins through 1-6 rapidly (animation), then lands.
Show the code line highlighting alongside.

Then connect to the cave game:
```lua
if math.random(1, 2) == 1 then
  print("you find treasure!")    -- 50% chance
else
  print("a bat swoops!")         -- 50% chance
end
```

Two buttons: "flip" — runs the random check, shows which branch executed.
A counter shows: "treasure: 3 / bat: 2 (out of 5 flips)"
This teaches probability visually.

### SCREEN 8: Special powers (07/12)
Fix the io.read overflow. Keep the 5 power cards.

**Improvements:**
- Each card demo is self-contained and doesn't overflow
- io.read demo: typewriter simulation instead of real input
- After unlocking all 5, show a CODE TIMELINE:
  ```
  print("THE CAVE")              ← you learned this
  local name = io.read(...)      ← and this
  if choice == "i" then          ← and this
    sleep(1000)                  ← NEW: you just learned this
    clear()                      ← NEW
    colored("gold!", color.yellow) ← NEW
    sound.win()                  ← NEW
  end
  ```
  This timeline connects every power to its place in the cave game.

### SCREEN 9: Input controls (08/12)
**NEW SCREEN.** Teaches io.getkey and io.choice.

Heading: "faster controls."
Body: "io.read() waits for Enter. sometimes you need instant input."

**Demo 1: io.getkey()**
A focused terminal area that captures keypresses:
```
┌─── try it ─────────────────────┐
│  click here, then press keys   │
│                                │
│  you pressed: "a"              │
│  you pressed: "space"          │
│  you pressed: "up"             │
│  you pressed: "left"           │
└────────────────────────────────┘
```
Each keypress adds a line. Arrow keys, space, letters all work.
Show code: `local key = io.getkey()`

**Demo 2: GRID GAME (the wow moment)**
A 7x5 grid with a player `@` and a star `★`:
```
┌────────────────┐
│ . . . . . . .  │
│ . . . . . . .  │
│ . . @ . . . .  │
│ . . . . . . .  │
│ . . . . . ★ .  │
└────────────────┘
  use arrow keys to move
  steps: 0
```
The user moves `@` with arrow keys. Each move:
- Updates the grid display
- Increments step counter
- When `@` reaches `★`: burst particles, sound.win(), "you reached it in N steps!"

This is built entirely in JS within the tutorial (not real Lua).
But it demonstrates what io.getkey() enables: real-time movement games.

Below the grid, show the Lua code that would make this:
```lua
while true do
  draw_grid(player_x, player_y, star_x, star_y)
  local key = io.getkey()
  if key == "up" then player_y = player_y - 1
  elseif key == "down" then player_y = player_y + 1
  elseif key == "left" then player_x = player_x - 1
  elseif key == "right" then player_x = player_x + 1
  end
end
```

**Demo 3: io.choice()**
```
what weapon will you carry?
[1] sword
[2] bow
[3] magic staff
choice (1-3): [___]
```
User picks, sees: "you chose: sword" with a brief animation.

### SCREEN 10: Tables & functions (09/12)
**NEW SCREEN.** Teaches Lua tables (lists) and basic functions.

Heading: "tables. keep a list."
Body: "tables hold multiple values. think of them as a backpack."

**Interactive BACKPACK builder:**
```
┌─── your backpack ──────────────────┐
│  1. torch                          │
│  2. rope                           │
│  3. [type item + Enter to add]     │
│                                    │
│  items: 2                          │
└────────────────────────────────────┘
```
User types items to add to the list. Each addition:
- Animates into the list (slide in from right)
- Updates the count
- Shows the Lua code updating live:
  ```lua
  local backpack = {"torch", "rope"}
  table.insert(backpack, "sword")  -- ← just added!
  print("items: " .. #backpack)    -- 3
  ```

Then: a simple function example:
```lua
local function show_backpack(items)
  for i, item in ipairs(items) do
    print(i .. ". " .. item)
  end
end
```
Run button: shows the backpack contents in a mini terminal.

### SCREEN 11: Networking sandbox (10/12)
**MAJOR REWORK.** Two tabs: Leaderboard and Key-Value.

#### Leaderboard Tab

**Layout:** Two-column (code panel left, live result right)

Code panel (static, highlighted):
```lua
net.rank(name, score)
local top = net.top(5)
for i, e in ipairs(top) do
  print(i .. ". " .. e.name .. "  " .. e.score)
end
```

Live result panel:
```
┌─── leaderboard ─────────┐
│  1. alice       98      │ (pre-seeded)
│  2. bob         72      │
│  3. carol       55      │
└─────────────────────────┘
```

**Controls:**
```
┌─── add a score ──────────────────────────────────────┐
│  name: [__________]  score: [__________]  [ add ]    │
└──────────────────────────────────────────────────────┘
```

Both name and score are user-input. If score is blank, generate random 50-100.

**Score animation:** when adding, the score counts up over 1.5 seconds
(not 0.7s). Each digit "rolls" like a slot machine. The new entry slides into
the leaderboard at its sorted position. A highlight flash on the new row.

**net.top(N) query:**
```
net.top( [5 ▾ dropdown] )  [run query]
```
Dropdown with options: 1, 3, 5, 10. Clicking "run query":
1. The `net.top(5)` line in the code panel highlights
2. A "calling net.top(5)..." log line appears
3. The result panel rebuilds with staggered row animations
4. "returned N entries" log line appears

After 2+ entries: "that's a live leaderboard. works the same in real games."
Show next button.

#### Key-Value Tab

**Full set/get sandbox:**

```
┌─── stored data ──────────────────┐
│  lives     "3"                   │ (pre-seeded)
│  level     "1"                   │
└──────────────────────────────────┘

┌─── try it ───────────────────────────────────────────┐
│  net.set( [key____] , [value____] )    [ set ]       │
│  net.get( [key____] )                  [ get ]       │
│                                                      │
│  log:                                                │
│  > net.set("lives", "3")         ok                  │
│  > net.get("lives")             → "3"                │
│  > net.set("weapon", "sword")    ok  (new key!)      │
│  > net.get("weapon")            → "sword"            │
│  > net.set("lives", "5")        ok  (updated!)       │
└──────────────────────────────────────────────────────┘
```

Features:
- set: creates or updates key. Stored data panel updates live.
- get: retrieves value. Shows result inline.
- Activity log: each operation logged with code representation.
- Pre-seeded with `lives=3, level=1` so there's data to query.
- Explain: "this is persistent storage. it survives between game sessions."

### SCREEN 12: Edit code & docs (11/12)
Keep current content with minor polish.
- Remove any remaining em-dashes
- Make the edit code box pulse with a subtle glow

### SCREEN 13: THE COMPLETE GAME (12/12)
**THE PAYOFF MOMENT.**

Heading: "you built it."
Sub: "every line you learned. one game."

Show the COMPLETE cave game code in a `tut-built-cave` box with:
- Accent border + glow shadow
- Header: "the cave, complete"
- Syntax-highlighted code (all 25 lines)
- Each section has a comment showing which screen taught it:
  ```lua
  -- screen 2: print
  print(colored("THE CAVE", color.yellow))
  
  -- screen 3: variables
  local name = io.read("your name? ")
  
  -- screen 5: if/else
  if choice == "i" then
  ```
  (These comments are only in the display, not in the actual run code)

**"▶ RUN IT" button** — the big moment.
Calls `window.termRunLua(CAVE_GAME_CODE)`.
Opens the real terminal overlay. They play their game for real.
Burst particles. Sound effect.

After running (when they close the terminal), show:
"you just ran 25 lines of Lua in the browser terminal."
"now make your own."

### SCREEN 14: Pick a starter
Keep the starter cards with live previews.
Fix bottom padding so nothing gets cut off.

### EXPERT PATH (screen 15)
Keep APIs overview. Add edit code section before starter button.
Expert → screen 14 (starters).

---

## ARCADE PAGE IMPROVEMENTS (layouts/_default/arcade.html)

### 1. Remove ✦ coins
Delete the `.arc-hero-coins` div.

### 2. Interactive snippet runner
Currently snippets only have "copy" and "open in editor" buttons.
Add a third button: **"▶ run"**.

When clicked:
- A mini terminal expands below the snippet
- The snippet code runs via a simulated parser (parse print/sleep/colored)
- Output appears with typewriter effect
- Terminal auto-collapses after 5 seconds or on click

This lets visitors SEE what the code does without leaving the page.

Implementation: for each snippet, add a `.arc-snippet-runner` div below:
```html
<div class="arc-snippet-runner" id="runner-N" style="display:none">
  <div class="arc-runner-bar">output</div>
  <div class="arc-runner-out"></div>
</div>
```

The runner is NOT real Lua — it's a JS parser that handles:
- `print("text")` → display the text
- `colored("text", color.X)` → display with CSS color
- `sleep(N)` → wait N ms between outputs
- `clear()` → clear the runner output
- Everything else → skip

This gives a "good enough" preview for simple snippets.

### 3. Typing effect in stat line
The "3 games" stat animates counting up. Add a TYPING effect to the
subtitle: "visitor-submitted lua games · runs in the terminal"
Characters appear one by one at 30ms. Gives a hacker/terminal feel.

### 4. Game card hover preview
When hovering over a game card, show a tiny preview of its first few
lines of output (parsed from the source code). A 3-line preview:
```
┌─────────────────────────────────────────┐
│ THE CAVE                              │ → these are parsed from
│ you stand at the entrance...          │   the game's print() calls
│ ...                                   │
└─────────────────────────────────────────┘
```
This appears as a tooltip/popover on desktop hover.

Implementation: extract the first 3 `print("...")` calls from the game code
and display them. The data is already in memory from the API response.

---

## GAME PAGE IMPROVEMENTS (layouts/_default/arcade-game.html)

### 1. Source code with execution preview
Add a "▶ preview" button in the source header.
When clicked, the code gets an EXECUTION HIGHLIGHT:
- Parse print() calls
- Highlight line 1, pause 200ms, show output in a side panel
- Highlight line 2, pause 200ms, show output
- Continues through the code like a debugger stepping

The side panel shows accumulated output. The current line in the source
code has a bright accent background.

This is read-only (can't interact with io.read), but gives a visual
sense of how the code executes.

### 2. Play count
Show how many times the game has been played (if available from the API).
If not available, skip this.

---

## UPDATED CAVE GAME CODE

Used in: tutorial CAVE_GAME_CODE, story snippet in arcade.html, story snippet
in arcade-editor.html, and the tutorial's starter `story` template.

```lua
print(colored("THE CAVE", color.yellow))
print("you stand at the entrance of a dark cave.")
print("")
local name = io.read("your name? ")
print("brave soul " .. name .. ".")
print("")
local choice = io.read("go [i]nside or [l]eave? ")
if choice == "i" then
  print(colored("you venture inside...", color.cyan))
  sleep(1000)
  clear()
  if math.random(1, 2) == 1 then
    print(colored("you find a chest of gold!", color.yellow))
    sound.win()
    print("")
    print(colored("YOU WIN!", color.green))
  else
    print(colored("a bat swoops! you flee.", color.red))
    sound.lose()
    print("")
    print(colored("GAME OVER", color.red))
  end
else
  print("smart choice. you go home safely.")
  sound.click()
  print("")
  print("THE END.")
end
```

---

## HELP TEXT UPDATES (static/script.js)

Update the `arcade` help topic to document new APIs:
```
io.read("prompt")     - show prompt, wait for Enter, return text
io.getkey()           - wait for single keypress, return key name
                        arrow keys: "up" "down" "left" "right"
                        other: "space" "enter" "escape" or the character
io.choice(prompt, {}) - show numbered options, return chosen string
io.confirm("sure?")   - ask y/n, return true or false
```

Also update the Lua reference on the arcade page (DOCS array) and the
editor reference panel (REF_SECTIONS).

---

## AGENT BREAKDOWN

### Agent 1: Tutorial rebuild (THE BIG ONE)
File: `layouts/_default/arcade-tutorial.html`

Full rewrite with 16 screens:
- Add new HTML for all screens (0-15)
- Add CSS for all new elements
- Add JS for all interactions
- Screen 1: interactive cave game
- Screen 4: string builder with draggable blocks
- Screen 5: improved if/else with flow diagram
- Screen 6: loops with syntax breakdown
- Screen 7: random number slot machine
- Screen 8: powers (fix overflow)
- Screen 9: input APIs with grid game
- Screen 10: tables/backpack builder
- Screen 11: networking sandbox
- Screen 13: complete game with RUN IT
- All terminal backgrounds filled
- Back button visible
- 12 progress dots
- Fix final screen cutoff

### Agent 2: Script.js changes
File: `static/script.js`

1. Fix io.read prompt (don't echo to output)
2. Add io.getkey() to Lua sandbox
3. Add io.choice() to Lua sandbox
4. Add io.confirm() to Lua sandbox
5. Handle getkey yield in step function
6. Update arcade help text
7. Update Lua reference (DOCS array) if it's in this file

### Agent 3: Arcade page updates
File: `layouts/_default/arcade.html`, `static/style.css`

1. Remove ✦ coins
2. Add snippet runner ("▶ run" button + mini terminal)
3. Add typing effect to subtitle
4. Add game card hover preview
5. Update story snippet with improved ending
6. Update DOCS array with new API docs
7. Remove .arc-coin CSS

### Agent 4: Editor + game page updates
Files: `layouts/_default/arcade-editor.html`, `layouts/_default/arcade-game.html`

1. Update snippets in editor to match (including new io.getkey snippets)
2. Add io.getkey/io.choice snippets to editor
3. Add execution preview to game page source
4. Update REF_SECTIONS with new API docs

---

## ACCEPTANCE CHECKLIST

**Bugs:**
- [ ] ✦ coins gone from arcade hero
- [ ] All tutorial terminals have filled backgrounds
- [ ] Back button has border, clearly visible
- [ ] Loop output: yellow numbers, green GO!
- [ ] Loop syntax breakdown shows start/stop/step labels
- [ ] Powers: no io.read overflow
- [ ] Final screen: no cutoff, full scroll works
- [ ] io.read prompt only in bottom bar, not duplicated in output
- [ ] Cave game has clear YOU WIN/GAME OVER/THE END endings

**New features:**
- [ ] io.getkey() works: returns single keypress without Enter
- [ ] Arrow keys return "up"/"down"/"left"/"right"
- [ ] io.choice() renders numbered menu, returns selection
- [ ] io.confirm() returns true/false for y/n

**Tutorial screens:**
- [ ] Screen 1: user plays an interactive cave game (not auto-play)
- [ ] Screen 1: game has typewriter text, name input, choice buttons, sound
- [ ] Screen 2: code editor works, mini terminal shows output
- [ ] Screen 4: string builder with visual blocks
- [ ] Screen 5: flow diagram lights up with branch selection
- [ ] Screen 6: syntax breakdown with labeled parts
- [ ] Screen 6: output colors match code (yellow/green, not blue)
- [ ] Screen 7: slot machine random number animation
- [ ] Screen 9: io.getkey demo captures arrow keys
- [ ] Screen 9: grid game (@→★) works with arrow keys
- [ ] Screen 10: backpack builder adds items with animation
- [ ] Screen 11: leaderboard pre-seeded with 3 entries
- [ ] Screen 11: score animation lasts 1.5s with rolling digits
- [ ] Screen 11: net.top(N) dropdown changes query
- [ ] Screen 11: KV sandbox has full set/get with log
- [ ] Screen 13: RUN IT button opens real terminal, runs the game
- [ ] 12 progress dots, all positions correct

**Arcade page:**
- [ ] Snippet ▶ run button shows mini terminal output
- [ ] Game card hover shows first 3 print lines as preview

**Game page:**
- [ ] Execution preview steps through code with line highlighting

---

## NOTES

- No Co-Authored-By. Ever.
- Don't touch boids/life/theme code
- Tutorial is self-contained (no external deps beyond existing CDN)
- window.termRunLua works from tutorial context (tested in previous session)
- The grid game on screen 9 is pure JS (not real Lua), just demonstrating the concept
- The snippet runner on arcade page is also pure JS parsing (not real Lua)
- Keep tutorial redirect: if arcade_intro=done, redirect to editor
- Fengari loads lazily, only when actually playing a game
