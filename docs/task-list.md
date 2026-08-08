# GameX — Dev Task List

Generated: 2026-07-27 | Last updated: 2026-08-08 (M8 Railway deployment live — full game run-through verified)
Tech stack: Next.js 16 + Socket.IO 4 + TypeScript 6 + Tailwind 4
Default config: 4 players, 16 items | Hosting: Railway (custom server)

Read `docs/trd.md` for all architecture decisions before starting any task.

---

## Milestone 0 — Project Foundation

_One-time setup. Must be complete before any feature work._

- [x] Create `package.json` with name `gamex`, scripts (dev/build/start/lint/type-check/format/prepare)
- [x] Install dependencies: Next.js 16, React 19, TypeScript 6, Tailwind 4, Socket.IO 4, Socket.IO client
- [x] Install dev dependencies: Husky, lint-staged, Prettier, ESLint, postcss, @tailwindcss/postcss
- [x] Configure Husky pre-commit hook → `npx lint-staged`
- [x] Configure lint-staged: ESLint + Prettier on `.ts/.tsx`; Prettier on `.js/.json/.md/.css`
- [x] Configure `.prettierrc`: no semi, single quotes, 2-space, trailing commas, 100-char width
- [x] Configure `.prettierignore`: `.next/`, `out/`, `node_modules/`, `public/`, `mockups/`
- [x] Update `.gitignore`: Next.js artifacts, env files, Python, logs, Vercel
- [x] Create `CLAUDE.md` with session start protocol and naming conventions
- [x] Write `tsconfig.json` — strict mode, path aliases (`@/` → project root)
- [x] Write `next.config.ts` — custom server compatible config
- [x] Write `postcss.config.mjs` — Tailwind 4 via `@tailwindcss/postcss` (no tailwind.config.ts needed in v4)
- [x] Write `eslint.config.mjs` — Next.js flat config + Prettier (native v16 export, no FlatCompat)
- [x] Write `server.ts` — custom HTTP server that mounts Socket.IO then hands off to Next.js
- [x] Update `package.json` dev + start scripts: `tsx server.ts`

---

## Milestone 1 — Shared Foundation (Types + Socket Infrastructure)

_Cross-cutting. Everything else imports from here._

- [x] Create `types/room.types.ts` — `RoomStatus`, `BracketSize`, `RoomConfig`
- [x] Create `types/player.types.ts` — `PlayerState`, `PlayerStatus`, `DisconnectedPlayer`
- [x] Create `types/item.types.ts` — `Item`, `ItemSource`
- [x] Create `types/match.types.ts` — `Match`, `MatchRecord`
- [x] Create `types/assignment.types.ts` — `AssignmentRecord`, `AssignmentPayload`
- [x] Create `lib/socket-events.ts` — `EVENTS` constants object, `EventName` type
- [x] Create `lib/room-store.ts` — `Map<roomId, RoomState>` + CRUD interface (`createRoom`, `getRoom`, `updateRoom`, `deleteRoom`)
- [x] Create `lib/socket-server.ts` — `initSocketServer(httpServer)`: mounts Socket.IO, sets up `/board` and `/player` namespaces, registers connection handlers (stub — game logic in Milestone 2+)
- [x] Create `lib/bracket-engine.ts` — `drawRound(survivingItems)` → `Match[]`, `runAssignment(room, roundIndex)` → `AssignmentRecord[]`
- [x] Add design tokens to `app/globals.css` — `@theme` (Tailwind 4 utility generation) + `:root` vars (for inline `var()` in LED effect CSS) + body base styles
- [x] Add Space Grotesk via `next/font/google` in `app/layout.tsx` — weights 400/500/700, variable `--font-sans`

---

## Milestone 2 — Room & Lobby

_Players can create and join a room. Board and Player Views show the lobby._

- [x] `app/api/room/create/route.ts` — POST: validate bracketSize, create room in store, return `{ roomCode, hostToken, reclaimCode }`
- [x] `app/api/room/join/route.ts` — POST: validate roomCode + displayName (unique check) + colour, add player to room, return `{ playerId, playerToken }`, emit `PLAYER_JOINED` to room channels
- [x] `app/api/room/reclaim/route.ts` — POST: validate reclaimCode, issue new hostToken, emit `HOST_RECONNECTED`
- [x] `app/api/room/[code]/route.ts` — GET: return public room info (roomId, bracketSize, status, hostName, takenColours)
- [x] `lib/colours.ts` — HOST_COLOUR, PLAYER_COLOURS (7), toRgba()
- [x] `lib/auth.ts` — generateToken, validateHostToken, validatePlayerToken, findPlayerByToken, toPublicState
- [x] `lib/socket-server.ts` — expanded /board and /player handlers; getIO() singleton export
- [x] `app/globals.css` — .led-orange, .led-teal, .scroll-thin, animation keyframes
- [x] `app/page.tsx` — home screen: create room form (bracketSize picker) + join room form (code input)
- [x] `app/room/[code]/join/page.tsx` — join form (name + colour picker) + host reclaim mode toggle
- [x] `app/room/[code]/page.tsx` — Player View shell: reads sessionStorage, connects /player socket, shows HostLobbyScreen or PlayerLobbyScreen
- [x] `app/room/[code]/board/page.tsx` — Board View shell: connects /board socket with roomCode only; login-free
- [x] `components/shared/led-background.tsx` — LED dot grid reusable component
- [x] `components/player/join-form.tsx` — name input + 7-colour picker + preview
- [x] `components/player/lobby-screen.tsx` — identity card, topic info, player list, waiting footer
- [x] `components/host/lobby-screen.tsx` — room code digits, reclaim code display, player list, start button
- [x] `components/board/lobby-screen.tsx` — large room code digits, 8 player slots, status badge
- [x] `/player` namespace handler — validate playerToken, join roomId channel, sync state, emit PLAYER_LEFT on disconnect

---

## Milestone 3 — LLM Pool Generation

_Host enters topic; pool generates with live progress; host curates and locks._

- [x] `tools/pool_generator.py` — orchestrator: spawns source tools in parallel, enforces 15 s per-source timeout, streams JSON progress events to stdout, deduplicates and ranks results, trims to `ceil(bracketSize × 1.5)`
- [x] `tools/sources/tmdb_search.py` — TMDB API search; returns `Item[]`
- [x] `tools/sources/reddit_search.py` — Reddit API search for popularity signals
- [x] `tools/sources/wikipedia_search.py` — Wikipedia thumbnail + first paragraph
- [x] `tools/sources/web_search.py` — general web search fallback (Brave Search API; skipped if no key)
- [x] `tools/requirements.txt`
- [x] `app/api/pool/generate/route.ts` — POST: validate hostToken + roomCode, create job, spawn `pool_generator.py` subprocess, pipe stdout to `/board` + `/player` namespaces as `POOL_PROGRESS` events, emit `POOL_READY` on exit
- [x] `app/api/pool/boost/route.ts` — POST: partial regen with boost keyword; same job pattern; does not replace already-selected items
- [x] `app/api/pool/lock/route.ts` — POST: validate `selectedItemIds.length === bracketSize`, store `lockedItems` + `survivingItems`, set `status = 'active'`
- [x] `components/host/pool-curation.tsx` — pool grid (image cards), select/deselect, boost keyword field, lock button; live progress overlay during generation
- [x] `components/board/pool-progress.tsx` — source-by-source progress indicators during generation; pool reveal grid after POOL_READY
- [x] `lib/job-store.ts` — in-memory job tracking (global singleton, same pattern as socket-server)
- [x] `hooks/use-player-socket.ts` — extended with POOL_PROGRESS + POOL_READY event handlers
- [x] `hooks/use-board-socket.ts` — extended with POOL_PROGRESS + POOL_READY + topic
- [x] `app/host/setup/page.tsx` — integrated pool generation phases (config → generating → curating)
- [x] `app/room/[code]/board/page.tsx` — shows BoardPoolProgress during poolgen/poolreview, BoardLobbyScreen otherwise
- [x] `types/room.types.ts` — added `topic: string` to RoomState
- [x] `lib/room-store.ts` — initialises `topic: ''`
- [x] `lib/socket-server.ts` — includes `topic` in PLAYER_JOINED emit

---

## Milestone 4 — Bracket Draw & Assignment

_Server draws Round 1 pairings and delivers secret assignments to each player._

- [x] Pool lock handler → call `bracketEngine.drawRound(lockedItems)` for Round 1 → store matches → emit `ROUND_START` (public match list, no assignments) to `/board:roomCode`
- [x] Assignment handler → call `bracketEngine.runAssignment(room, roundIndex)` → store `AssignmentRecord[]` → emit `ASSIGNMENT` payload to each `/player` socket individually (never to room channel)
- [x] `components/player/assignment-card.tsx` — face-down card with hold-to-reveal (650 ms), 3D CSS flip, image fill, "I'm Ready" button, `ASSIGNMENT_CONFIRMED` socket event
- [x] Board receives `ROUND_START` — shows `RoundStartScreen` with round number, player confirmation circles, real-time `confirmedPlayerIds` tracking
- [x] Board and player restore full state on page refresh (PLAYER_JOINED payload enriched with active-game data; server re-sends ASSIGNMENT on reconnect)

---

## Milestone 5 — Match Loop

_Core runtime: reveal → debate → vote → advance. Paced entirely by host._

- [x] `components/board/match-view.tsx` — two item cards side by side; live vote tally by player colour; player status row (connected / voted / waiting dot per player)
- [x] `components/player/match-view.tsx` — same two item cards; vote buttons (A / B) appear on `VOTE_OPEN`; vote locked after cast
- [x] `components/host/match-controls.tsx` — "Call Vote" button; live cast-count vs pending; "Coin Flip" button (visible only on tie); "Next Match" button after result
- [x] `/player` namespace — `HOST_CALL_VOTE`: validate hostToken, emit `VOTE_OPEN` to room channels; `PLAYER_VOTE`: record vote, emit `PLAYER_VOTE` (colour only, no name) to room channels; detect all-voted → emit `VOTE_RESULT`; `HOST_COIN_FLIP`: random heads/tails, emit `COIN_FLIP`; `HOST_NEXT_MATCH`: advance match index, emit `MATCH_START` or `ROUND_END`
- [x] `app/api/game/coin-flip/route.ts` — POST: validate hostToken, flip, return result; emit `COIN_FLIP` to room channels
- [x] Round advance: on `ROUND_END` → run new draw + reassignment → emit `ROUND_START` + individual `ASSIGNMENT` events → host sees "Next Round" on Host Panel

---

## Milestone 6 — Disconnection & Reconnection

_Grace timer, state sync on rejoin, permanent removal. Required before any real session._

- [x] Grace timer logic in socket-server: module-level `graceTimers` Map; server-side 60 s `setTimeout` per disconnected player
- [x] On grace expiry: update `PlayerState.status = 'timedout'`; emit `PLAYER_TIMEOUT` to host socket only → Host Panel shows "Kick Out" prompt per timed-out player
- [x] Host kick-out handler (`HOST_PROCEED_ANYWAY`): marks player `removed`, emits `PLAYER_REMOVED` to room channels; re-checks all-voted if voting in progress
- [x] `REMOVED_FROM_GAME` event: server emits to removed player's socket on reconnect attempt, then drops the connection — prevents kicked players rejoining
- [x] Reconnect within grace (or timedout): validate playerToken on socket handshake; clear timer; emit `PLAYER_RECONNECT` to room channels; re-send assignment + match state
- [x] Host disconnect: emit `HOST_DISCONNECTED` to `/board` and `/player`; Board shows full-screen overlay; vote buttons disabled on Player Views; 60 s grace timer
- [x] Host grace expiry: emit `HOST_ABANDONED` to board + players — advisory "Go Home" offer; host can still rejoin if players remain (reversible)
- [x] Host reconnect via socket: if players remain → emit `HOST_RECONNECTED` (resets `hostAbandoned` + `gamePaused`); if all players gone → emit `ALL_PLAYERS_LEFT` to host only
- [x] Host reconnect via `/api/room/reclaim`: clears grace timer, emits `HOST_RECONNECTED` to board + player channels
- [x] `ROOM_RESET` event: host deliberately ends game → broadcasts to board + players; board navigates home immediately; non-host players see "Game ended" screen
- [x] `PLAYER_LEFT` carries `status` field so board dots go grey (grace) or dashed ring (timedout) instead of disappearing
- [x] All host controls (`Start Match`, `Call Vote`, `Next Match`, `Coin Flip`) disabled when `playerCount < 2`; "Not enough players" warning card with End Game button
- [x] `PLAYER_TIMEOUT`, `PLAYER_REMOVED`, `HOST_RECONNECTED`, `HOST_PROCEED_ANYWAY`, `REMOVED_FROM_GAME`, `HOST_ABANDONED`, `ALL_PLAYERS_LEFT`, `ROOM_RESET` added to `lib/socket-events.ts`
- [x] `gamePaused` + `timedOutPlayers` + `hostAbandoned` + `allPlayersLeft` + `gameEnded` state in hooks; wired to overlays and screens
- [x] sessionStorage → localStorage so tokens survive tab close
- [x] Safari backface-visibility fix on assignment card flip via JS state (`backVisible`)

---

## Milestone 7 — Champion Screen & Post-Game Reveal ✅

_Final match → champion → assignment history table._

- [x] Final match detection: after `MATCH_END` when `survivingItems.length === 1`; emit `GAME_OVER` with winner `Item` + champion's path (beaten opponents) to room channels; store `room.champion`
- [x] `components/board/champion-screen.tsx` — champion card (260×360, pulsing champ-pulse glow), "THE CHAMPION" heading, "Path to the Top" beaten-item strip; board LED background with stronger orange atmosphere
- [x] `components/player/champion-screen.tsx` — same display (200×285 card); "Reveal Assignments" button on host's view; "Waiting for host" on players; phone LED background
- [x] `HOST_REVEAL_START` event added (`lib/socket-events.ts`); handler in `lib/socket-server.ts` builds enriched `rows` + emits `REVEAL_START` to both namespaces
- [x] `components/board/reveal-table.tsx` — "Who Defended What" grid: Player (coloured dot + name) × Round columns (R1/R2/Semi/Final); champion cells orange-highlighted; staggered row entrance
- [x] `components/player/reveal-table.tsx` — same grid; own row stronger tint + "You" badge; horizontally scrollable on mobile
- [x] `RevealRow` interface exported from `hooks/use-player-socket.ts`; `revealVisible`, `revealRows`, `revealPath` state in both hooks; `triggerReveal` exported from player hook
- [x] `app/room/[code]/page.tsx` and `board/page.tsx` stubs replaced with full champion → reveal flow
- [x] `champion: Item | null` added to `RoomState` type and initialized in `room-store.ts`
- [x] `champ-pulse` + `spotlight-breathe` keyframes added to `globals.css`
- [x] "New Game" / `ROOM_RESET` flow already in place from M6 (host `handleEndGame` → `emitRoomReset` → navigate home)

---

## Milestone 8 — Production Deployment (Railway)

_Note: Vercel is not compatible with this stack — Socket.IO requires a persistent server and the Python pool generator runs as a subprocess. Railway is the correct target (custom server support, Python runtime available)._

### Pre-flight fixes

- [x] **Room cleanup / TTL** — `startRoomSweep()` in `room-store.ts`; 4h TTL, 30-min interval, stored on `process` to survive hot-reload; called once from `initSocketServer`
- [x] **ROOM_NOT_FOUND handling** — emitted before silent disconnect on both `/board` and `/player`; player hook clears localStorage + redirects; board hook redirects
- [x] **Pool generation failure UI** — already implemented: `POOL_PROGRESS{status:'failed'}` → `poolError` state → error card + "Try Again" in `HostPoolCuration`
- [x] **Return to Main Menu on champion screen** — `onLeave` prop + "Leave Game" button on non-host `PlayerChampionScreen`; wired to `handleReturnHome`
- [x] **Missing `child.on('error')` in boost route** — `app/api/pool/boost/route.ts` had no spawn error handler; `spawn python3 ENOENT` caused `uncaughtException` and crashed the server; fixed to match the guard already in `app/api/pool/generate/route.ts`
- [x] **Unhandled promise rejection in `server.ts`** — `app.prepare().then()` had no `.catch()`; Next.js init failure would silently crash the process in Node 15+; added `.catch()` with `process.exit(1)` and error log

### Environment & config

- [x] Create `.env.example` — `TMDB_API_KEY` (required), `GEMINI_API_KEY` (optional), `BRAVE_SEARCH_API_KEY` (optional); Reddit uses public API, no credentials needed
- [x] Verify `server.ts` reads `PORT` from `process.env.PORT` — already correct (`process.env.PORT ?? '3000'`), no change needed
- [x] Add `python3` availability check on server start — `spawnSync('python3', ['--version'])` logs version or WARNING on startup

### Railway setup

- [x] Create `railway.toml` — start command `npm run start`, restart on failure (max 5 retries)
- [x] Create `nixpacks.toml` — installs Python 3.12 + pip alongside Node; runs `pip install -r tools/requirements.txt` at build time
- [x] Add `Dockerfile` — explicit `node:20-slim` + `apt-get install python3 python3-pip` build; Railway prefers Dockerfile over nixpacks when both are present
- [x] Add `engines: { node: ">=20.0.0" }` to `package.json`
- [x] Configure Railway environment variables in dashboard (`TMDB_API_KEY`, `GEMINI_API_KEY`, `BRAVE_SEARCH_API_KEY`)
- [ ] Set Railway region closest to target audience
- [x] Verify custom domain + SSL termination works with Socket.IO upgrade headers (`websocket` transport)
- [x] **readline error handler** — added `rl.on('error')` to `app/api/pool/generate/route.ts` and `app/api/pool/boost/route.ts`; prevents uncaughtException if stdout closes unexpectedly mid-generation
- [x] **Socket.IO CORS lockdown** — `lib/socket-server.ts` now reads `NEXT_PUBLIC_APP_URL` env var; falls back to `*` in dev; set the var in Railway dashboard to lock to your domain

### Smoke test checklist (post-deploy)

- [x] Create room → join 4 players on mobile → board on desktop → full game run-through
- [ ] Kill one player tab mid-vote → grace timer fires → host proceeds anyway
- [ ] Close host tab → board shows paused → reclaim via reclaimCode → game resumes
- [ ] Host clicks "Return to Main Menu" on reveal table → board + all players navigate home

---

## Cross-Cutting / Infrastructure

- [x] Define Socket.IO event constants — `lib/socket-events.ts` (done in Milestone 1)
- [ ] Enforce `/board` namespace receives no assignment data — code review gate: no assignment field in any payload emitted to `/board`
- [ ] Bracket size UI — host can pick 8 / 16 / 32 in lobby before pool generation; stored in `room.bracketSize`; used by pool generator and bracket engine
- [ ] Token validation middleware — shared `validateHostToken(req, roomId)` and `validatePlayerToken(req, roomId)` helpers used by all API routes
- [ ] Error states — pool generation failure UI; socket disconnect UI; rejoin flow for players who close and reopen their tab
