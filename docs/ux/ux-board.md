# UX Micro Doc — Board Surface
GameX · 2026-07-28 · Status: draft

> **Scope:** Structured UX artifact only. No visual style (colours, typography, spacing) — those belong in DESIGN.md, not yet created.

---

## 1. Surface Overview

The Board is a login-free, display-only browser view (`/room/{code}/board`) intended to run on a TV (HDMI), projector, or a laptop being screenshared into a video call. It receives only public game state via Socket.IO and must never render any Player's secret Assignment — not even transiently. Any Player or observer can open the Board URL; it has no authentication. The Board is the shared reference point for the room: it is what everyone is looking at when they debate, vote, and react.

---

## 2. Screen Inventory

| Screen | Entry trigger | Primary content | Exit trigger |
|---|---|---|---|
| Lobby | Board URL opened, Room exists | Room code (large), connected Player list with colours | Host starts session (Pool generation begins) |
| Pool Generation | Host triggers LLM generation | Progress indicator, topic name | Pool generation complete |
| Pool Curation | Generation complete | Full Pool of items as cards (read-only on Board) | Host locks pool |
| ~~Pool Reveal~~ | ~~removed~~ | ~~Pool is not disclosed to players; game proceeds directly to Round 1~~ | ~~n/a~~ |
| Inter-Round Assignment | Round N begins | "Round N of M — Players checking assignments" + Player readiness indicators | Host triggers "Start Round" [ASSUMPTION: Host-triggered, not auto] |
| Match View — Debate | Host advances to match | Item A card vs Item B card + Player status row | Host calls Vote |
| Match View — Voting | Host calls Vote | Item cards + live vote tally accumulating + Player status row | All Players voted OR Host intervenes |
| Match Result | All Players voted | Winning Item highlighted, losing Item dimmed | Host advances to next Match or Round |
| Tied Result | All voted, 2-2 | Both Items equal, tie indicator | Coin Flip result received |
| Coin Flip | Host triggers flip | Animated coin flip → result | Result auto-advances to Match Result |
| Round Complete | Last Match in Round resolved | Round summary [ASSUMPTION: brief interstitial] | Host triggers next Round → Inter-Round Assignment |
| Champion Screen | Final Match resolved | Winning Item (large), path through rounds | Host triggers Post-Game Reveal |
| Post-Game Reveal | Host triggers reveal | Assignment history table (Player × Round × Item) | Session ends; [ASSUMPTION: no auto-reset] |
| Error / Reconnect | Socket disconnect | "Reconnecting…" overlay | Socket reconnects; state resumes from server |

---

## 3. User Flow

```
Board URL opened
    │
    ▼
LOBBY
  [Players join, colours appear]
    │
    ▼
POOL GENERATION  ← Host enters Topic on their phone
  [Progress state, topic shown]
    │
    ▼
POOL CURATION  ← Read-only on Board; Host selects on phone
  [Items shown as cards in Pool; selected/unselected states visible]
    │  Host approves pool (no public reveal — pool contents not disclosed to players)
    ▼
INTER-ROUND ASSIGNMENT  ← Repeated for each Round (starts immediately after pool approval for Round 1)
  [Round N of M displayed; Player readiness indicators fill in]
    │  (all Players confirmed — Host cannot advance until every Player has revealed their card)
    ▼
MATCH REVEAL  ← Host advances
  [Item A vs Item B cards]
    │
    ▼
MATCH DEBATE
  [Cards remain; Player status row: all connected]
    │  (Host calls Vote)
    ▼
MATCH VOTING
  [Vote tally accumulates live by Player colour]
    │
    ├── All voted, clear winner ──► MATCH RESULT → [Host: Next Match or Next Round]
    │                                     │
    │                               ┌─────┴──────┐
    │                          Next Match    Round Complete
    │                               │              │
    │                        (loop back to    INTER-ROUND ASSIGNMENT
    │                         MATCH REVEAL)        │
    │                                        (loop: all Rounds)
    │
    └── All voted, tied ──────────► TIED STATE
                                        │  (Host triggers Coin Flip)
                                        ▼
                                   COIN FLIP ANIMATION
                                        │
                                        ▼
                                   MATCH RESULT (coin winner)
                                        │
                                  [continue as above]

Final Match resolved
    │
    ▼
CHAMPION SCREEN
  [Wild label if applicable]
    │  (Host triggers reveal)
    ▼
POST-GAME REVEAL
  [Assignment history table]
```

---

## 4. States Per Screen

### Lobby
- **Waiting (no players)** — Room code shown large; Player list empty; "Waiting for players…" label.
- **Players joining** — Each Player appears in their colour as they connect; list grows.
- **Ready** — Min 3 Players connected; [ASSUMPTION: no explicit "ready" state on Board — Host decides when to start].
- **Player disconnected** — Player colour dot dims or shows disconnected indicator; name remains.

### Pool Generation
- **Generating** — Progress indicator (spinner or step labels: "Searching web… Checking Reddit… Fetching images…"). Topic name shown.
- **Generation error** — [ASSUMPTION: error state shown with retry instruction for Host].

### Pool Curation
- **Curation in progress** — Full Pool visible as Item cards. Selected Items highlighted (as Host selects on phone). Unselected Items visually subdued. [ASSUMPTION: Board shows curation progress read-only in real time.]
- **Partial regen pending** — New Items arriving: fade-in animation for newly generated cards.

### Pool Reveal
- **Removed.** Pool contents are not disclosed to players. After the Host approves the pool, the Board transitions directly to the Inter-Round Assignment screen for Round 1. Players discover items only through their own assignment card and by watching matches unfold.

### Inter-Round Assignment
- **Waiting** — "Round N of M — Players checking their assignments." Player status indicators: unrevealed state for all.
- **Revealing (per player)** — As each Player long-presses on their phone, their indicator updates to confirmed (checkmark or filled dot).
- **All confirmed** — All indicators filled; Host "Start Round →" control becomes available on their phone. Board does not advance automatically — Host triggers it. This is a hard gate: the control is locked until every Player has confirmed.

### Match View — Debate
- **Active** — Item A card and Item B card displayed side by side. Player status row: all connected dots visible. No vote UI shown.
- **Player disconnected during debate** — Disconnected Player dot dims; match continues.

### Match View — Voting
- **Voting open** — Vote tally area visible under each Item (initially empty). Player status row transitions to show voted/waiting per Player.
- **Votes accumulating** — Player colour dots appear under Items as each vote is cast. Count visible. [ASSUMPTION: numeric count shown alongside dots.]
- **Awaiting last voter** — One Player dot still in "waiting" state; subtle indicator of who hasn't voted.
- **All voted** — Winning Item highlighted immediately (border glow or overlay). Losing Item dimmed. Awaits Host "Next Match."

### Tied Result
- **Tied** — Both Items equal highlight. "TIE" label. Coin flip cue visible (e.g. coin icon). Awaits Host action on phone.

### Coin Flip
- **Animating** — Coin flip animation plays (heads/tails).
- **Result** — Result displayed: "HEADS — [Item A] advances" or "TAILS — [Item B] advances."

### Champion Screen
- **Champion displayed** — Winning Item large (image, title). Path shown: R1 → R2 → Semi → Final.
- **Wild champion** — Explicit label: "No one owned this. A wild won."

### Post-Game Reveal
- **Revealing** — Assignment history table shown all at once (no row-by-row animation).
- **Complete** — Full table shown; Wilds labelled. No further Board action.

### Error / Reconnect
- **Disconnected** — "Reconnecting…" overlay. Game state preserved on server.
- **Reconnected** — Overlay dismisses; Board resumes at correct phase and state.

---

## 5. Interaction Specs

The Board has no user input — it is receive-only. All state changes are driven by Socket.IO events from the server.

### Socket.IO Events → Board Transitions

| Event | Board action |
|---|---|
| `player-joined` | Add Player dot to Lobby list |
| `player-disconnected` | Dim Player dot; preserve position |
| `pool-generating` | Show generation progress screen |
| `pool-ready` | Render Pool curation screen with Item cards |
| `pool-item-selected` | Highlight/unhighlight Item card |
| `pool-locked` | Transition directly to Inter-Round Assignment screen (Round 1) — no pool reveal |
| `round-start` | Show Inter-Round Assignment screen with round number |
| `player-assignment-confirmed` | Mark Player indicator as confirmed |
| `match-start` | Show Match Debate screen with Item A and Item B cards |
| `vote-open` | Transition Match to Voting phase; show tally areas |
| `player-vote` | Add Player colour dot under voted Item; update status row |
| `match-result` | Highlight winner; dim loser |
| `coin-flip-result` | Play coin animation; show result text |
| `round-complete` | Show round interstitial [ASSUMPTION] |
| `game-over` | Show Champion screen |
| `postgame-reveal` | Show assignment history table |
| `reconnect` | Re-request current game state from server; resume at current screen |

### Live Vote Display
- Each `player-vote` event carries: `{ playerId, playerName, choice: 'A' | 'B', playerColour }`.
- Board renders a colour dot + player name under Item A or Item B immediately on receipt.
- A numeric count is shown alongside the labelled dots.
- Player status row updates the voting Player's dot from "waiting" to "voted" state simultaneously.
- The "waiting" Player dots are visually distinct (hollow or dimmed) to make it clear who hasn't voted.
- Once all votes are in, the winning Item receives a highlight state automatically — Host does not need to tap to reveal.

### Player Status Row
- Present on: Match Debate, Match Voting, Match Result screens.
- Three states per Player dot: **connected** (solid, coloured), **voted** (solid + check indicator), **waiting** (hollow or dimmed).
- Disconnected Player: dot greyed out, name retained. [ASSUMPTION: disconnected Player's absence triggers abstain logic per PRD.]

### Post-Game Reveal Rendering
- Table structure: rows = Players, columns = Round 1 … Round N + Starting Assignment.
- Wilds labelled inline (e.g. "Wild" or "—" in the Starting Assignment column for items with no owner).
- All rows revealed at once — no sequential animation.
- [ASSUMPTION: re-assigned items (when player's original item was eliminated) are not visually distinguished from starting assignments unless specified — flag for UX decision.]

---

## 6. Accessibility Concerns

### Viewing Distance (Critical)
- The Board is read from 2–4 metres on a TV. Minimum legible text size at this distance is significantly larger than web norms. Item titles, player names, vote counts, and phase labels must all be readable without the viewer moving closer.
- **Flag:** All text-size decisions must be validated against TV viewing distance, not desktop reading distance. This affects every screen.

### Contrast in Dark Mode
- PRD specifies dark mode preferred for TV display. All text-on-dark combinations must meet WCAG AA contrast (4.5:1 for body text, 3:1 for large text / UI components).
- Item card images may have dark regions — text overlays on images need a scrim or background.
- Player status dots must be distinguishable against dark backgrounds at TV viewing distance.

### Colour-Coded Voting
- Vote tally shows Player colour + Player name alongside each vote dot. Colour is not the sole differentiator.
- Each vote dot carries the Player name (or abbreviated name) — resolves colour-blindness gap without separate shape/pattern system.
- The Player status row (connected/voted/waiting) still needs a non-colour indicator (hollow vs. filled vs. check icon) since it does not carry name text inline.

### Screen Share Compression
- Video conferencing compression (Zoom, Meet, Teams) reduces detail in gradients, small text, and thin borders. The Board must function with coarse compression:
  - Avoid thin borders as the primary UI differentiator.
  - Vote tally numbers must be large enough to survive compression artifacts.
  - Item card images may degrade — title text must not rely on image legibility.

### Motion
- Live vote dot animations, coin flip, and champion reveal all involve motion.
- Must respect `prefers-reduced-motion`: provide a static alternative (instant state change) for all animated transitions.
- Coin flip is particularly at risk — the animation must resolve clearly even if skipped.

### No Interaction Required
- The Board requires no keyboard, pointer, or touch interaction. Keyboard and pointer accessibility are not applicable.
- However, the Board must not crash or render broken state if a keyboard or mouse event occurs (e.g. accidental click on TV remote).
